// ==UserScript==
// @name         Easy Ticket Redirect
// @namespace    http://tampermonkey.net/
// @version      1.02
// @description  Konfigurowalne przyciski, wyrównanie układu, odporność na przeładowania AJAX (znikanie po wysłaniu wiadomości).
// @author       Bartłomiej Dąbrowski + GP
// @match        https://supportislove2.baselinker.com/tickets*
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/bdabrowski-lang/Easy-Ticket-Redirect-Base/main/Easy-ticket-redirect.user.js
// @downloadURL  https://raw.githubusercontent.com/bdabrowski-lang/Easy-Ticket-Redirect-Base/main/Easy-ticket-redirect.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=baselinker.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // === KONFIGURACJA ZESPOŁÓW ===
    const TARGET_TEAMS = [
        { label: 'Shops', searchName: 'Team Shops', color: '#2980b9', textColor: "#FFF" },
        { label: 'Catalog', searchName: 'Team Catalog', color: '#34495e', textColor: "#FFF" },
        { label: 'Couriers', searchName: 'Team Couriers', color: '#d35400', textColor: "#FFF" },
        { label: 'Marketplace', searchName: 'Team Marketplace', color: '#8e44ad', textColor: "#FFF" },
        { label: 'Invoices', searchName: 'Team Invoices', color: '#27ae60', textColor: "#FFF" },
        { label: 'Subs', searchName: 'Subscriptions', color: '#16a085', textColor: "#FFF" },
        { label: 'All/Ali/Temu', searchName: 'Team Allegro/Ali/Temu', color: '#FF5A00', textColor: "#FFF" },
        { label: 'Mirakl', searchName: 'Team Mirakl', color: '#c0392b', textColor: "#FFF" },
        { label: '🏢 Enterprise', searchName: 'Enterprise Support', color: '#ffaa00', textColor: "#000" }
    ];
    // ==============================

    function showNotification(message, isError = false) {
        const notif = document.createElement('div');
        notif.textContent = message;

        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.right = '20px';
        notif.style.padding = '15px 25px';
        notif.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
        notif.style.color = 'white';
        notif.style.borderRadius = '8px';
        notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notif.style.zIndex = '999999';
        notif.style.fontSize = '14px';
        notif.style.fontWeight = 'bold';
        notif.style.fontFamily = 'Arial, sans-serif';
        notif.style.transition = 'opacity 0.5s ease-in-out';

        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 500);
        }, 5000);
    }

    function redirectTicket(ticketHash, targetName, hideModal = false) {
        const ticketRow = document.querySelector(`tr[data-hash="${ticketHash}"]`);

        if (ticketRow) {
            const selectElement = ticketRow.querySelector('select.ticket_team');

            if (selectElement) {
                let foundOptionValue = null;

                for (let i = 0; i < selectElement.options.length; i++) {
                    const option = selectElement.options[i];
                    if (option.textContent.includes(targetName)) {
                        foundOptionValue = option.value;
                        break;
                    }
                }

                if (foundOptionValue !== null) {
                    selectElement.value = foundOptionValue;

                    if (typeof window.$ !== 'undefined') {
                        window.$(selectElement).trigger('change');
                    } else {
                        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    showNotification(`Sukces! Zgłoszenie ${ticketHash} przekierowane do: ${targetName}`);

                    if (hideModal) {
                        const closeBtn = document.querySelector('button.close[data-dismiss="modal"]') ||
                                         document.querySelector('[data-dismiss="modal"]');
                        if (closeBtn) {
                            closeBtn.click();
                        } else if (typeof window.$ !== 'undefined') {
                            window.$('.modal.in, .modal.show').modal('hide');
                        }
                    }
                } else {
                    showNotification(`Błąd: Nie znaleziono zespołu/osoby "${targetName}" na liście.`, true);
                }
            } else {
                showNotification(`Błąd: Brak listy z folderami dla zgłoszenia ${ticketHash}.`, true);
            }
        } else {
            showNotification(`Błąd: Nie znaleziono wiersza zgłoszenia o ID: ${ticketHash}.`, true);
        }
    }

    function processModal() {
        const modalBody = document.getElementById('ticket_modal_body');
        if (!modalBody || document.getElementById('kam-trigger')) return;

        const leftDiv = modalBody.querySelector('div[style="float:left"]');
        if (!leftDiv) return;

        const walker = document.createTreeWalker(leftDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;

        while (node = walker.nextNode()) {
            if (node.nodeValue.includes('KAM:')) {
                const matchText = node.nodeValue.match(/(KAM:\s*)(.*?)(?:\s*•|\s*$)/);

                if (matchText && matchText[2]) {
                    const kamName = matchText[2].trim();
                    const originalFullText = node.nodeValue;

                    const startIndex = originalFullText.indexOf('KAM:');
                    const nameIndex = originalFullText.indexOf(kamName, startIndex);

                    const beforeText = document.createTextNode(originalFullText.substring(0, nameIndex));
                    const afterText = document.createTextNode(originalFullText.substring(nameIndex + kamName.length));

                    const clickableSpan = document.createElement('span');
                    clickableSpan.id = 'kam-trigger';
                    clickableSpan.style.cursor = 'pointer';
                    clickableSpan.style.color = '#3bafda';
                    clickableSpan.style.fontWeight = 'bold';
                    clickableSpan.style.textDecoration = 'underline';
                    clickableSpan.title = `Kliknij, aby przekierować zgłoszenie do: ${kamName}`;
                    clickableSpan.textContent = kamName;

                    clickableSpan.addEventListener('click', function() {
                        const modalTitle = document.getElementById('myLargeModalLabel');
                        if (!modalTitle) return;

                        const titleMatch = modalTitle.innerText.match(/#([a-z0-9]+)/i);
                        if (!titleMatch) return;

                        redirectTicket(titleMatch[1], kamName, true);
                    });

                    const parent = node.parentNode;
                    parent.insertBefore(beforeText, node);
                    parent.insertBefore(clickableSpan, node);
                    parent.insertBefore(afterText, node);
                    parent.removeChild(node);

                    break;
                }
            }
        }
    }

    function processExpandedTickets() {
        // Sprawdzamy wszystkie aktualnie otwarte okna zgłoszeń
        const expandedInfos = document.querySelectorAll('td.ticket_info');

        expandedInfos.forEach(infoTd => {
            // KLUCZOWA ZMIANA: Szukamy fizycznej obecności panelu z przyciskami w kodzie.
            // Jeśli przyciski już są, ignorujemy. Jeśli BaseLinker je usunął AJAXem - kod wykona się ponownie.
            if (infoTd.querySelector('.kam-btn-container')) return;

            const rowContainer = infoTd.querySelector('.row');
            if (!rowContainer) return;

            const cols = rowContainer.querySelectorAll('.col-sm-4');
            if (cols.length < 3) return;

            const idMatch = infoTd.id.match(/ticket_([a-z0-9]+)_info/i);
            if (!idMatch) return;
            const ticketHash = idMatch[1];

            rowContainer.style.position = 'relative';

            const btnContainer = document.createElement('div');
            btnContainer.className = 'kam-btn-container'; // Dodajemy klasę identyfikacyjną
            btnContainer.style.position = 'absolute';
            btnContainer.style.top = '0';
            btnContainer.style.left = '0';
            btnContainer.style.width = '66.666667%';
            btnContainer.style.padding = '0 10px';
            btnContainer.style.boxSizing = 'border-box';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '4px';
            btnContainer.style.flexWrap = 'wrap';
            btnContainer.style.zIndex = '10';

            const createBtn = (teamConfig) => {
                const btn = document.createElement('button');
                btn.innerHTML = teamConfig.label;
                btn.className = 'btn';
                btn.style.backgroundColor = teamConfig.color;
                btn.style.color = teamConfig.textColor;
                btn.style.border = 'none';
                btn.style.fontSize = '11px';
                btn.style.padding = '3px 8px';
                btn.style.borderRadius = '3px';
                btn.style.cursor = 'pointer';
                btn.title = `Przekieruj zgłoszenie bezpośrednio do: ${teamConfig.searchName}`;

                btn.onmouseover = () => btn.style.opacity = '0.85';
                btn.onmouseout = () => btn.style.opacity = '1';

                btn.onclick = (e) => {
                    e.preventDefault();
                    redirectTicket(ticketHash, teamConfig.searchName, false);
                };
                return btn;
            };

            TARGET_TEAMS.forEach(team => {
                btnContainer.appendChild(createBtn(team));
            });

            rowContainer.insertBefore(btnContainer, rowContainer.firstChild);

            const adjustMargin = () => {
                // Zapobiegawczo sprawdzamy, czy kontener ma jakąś wysokość, zanim zepsujemy marginesy
                const h = btnContainer.offsetHeight;
                if (h > 0) {
                    cols[0].style.marginTop = (h + 10) + 'px';
                    cols[1].style.marginTop = (h + 10) + 'px';
                }
            };

            // Inicjalne ustawienie marginesu, potrzebujemy małego opóźnienia by przeglądarka zdążyła wyrenderować element i policzyć jego wysokość
            setTimeout(adjustMargin, 50);

            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => adjustMargin());
                ro.observe(btnContainer);
            }
        });
    }

    setInterval(() => {
        processModal();
        processExpandedTickets();
    }, 500);

})();
