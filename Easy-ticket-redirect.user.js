// ==UserScript==
// @name         Easy Ticket Redirect
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Konfigurowalne przyciski, odporność na AJAX, zarządzanie (GUI), drag & drop, auto-makro KAM, twarde zamykanie modala.
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

    // === WSTRZYKNIĘCIE CSS DLA NIEWIDZIALNEGO MAKRA I DRAG&DROP ===
    const style = document.createElement('style');
    style.textContent = `
        body.silent-macro-running #ticket_modal {
            opacity: 0 !important;
            visibility: hidden !important;
            transition: none !important;
        }
        body.silent-macro-running .modal-backdrop {
            opacity: 0 !important;
            visibility: hidden !important;
            transition: none !important;
        }
        .kam-drag-over {
            box-shadow: inset 0 2px 0 0 #3bafda !important;
            background-color: rgba(59, 175, 218, 0.05) !important;
        }
        .kam-draggable-row:active {
            cursor: grabbing !important;
        }
    `;
    document.head.appendChild(style);

    // === DOMYŚLNA KONFIGURACJA ZESPOŁÓW ===
    const DEFAULT_TEAMS = [
        { label: 'Priv', icon: 'fa-user', searchName: 'Bartlomiej Dabrowski', color: '#0097e6', textColor: "#FFF" },
        { label: 'Shops', icon: 'fa-shopping-cart', searchName: 'Team Shops', color: '#2980b9', textColor: "#FFF" },
        { label: 'Catalog', icon: 'fa-tags', searchName: 'Team Catalog', color: '#34495e', textColor: "#FFF" },
        { label: 'Couriers', icon: 'fa-truck', searchName: 'Team Couriers', color: '#d35400', textColor: "#FFF" },
        { label: 'Marketplace', icon: 'fa-globe', searchName: 'Team Marketplace', color: '#8e44ad', textColor: "#FFF" },
        { label: 'Invoices', icon: 'fa-file-text', searchName: 'Team Invoices', color: '#27ae60', textColor: "#FFF" },
        { label: 'Subs', icon: 'fa-credit-card', searchName: 'Subscriptions', color: '#16a085', textColor: "#FFF" },
        { label: 'All/Ali/Temu', icon: 'fa-cubes', searchName: 'Team Allegro/Ali/Temu', color: '#FF5A00', textColor: "#FFF" },
        { label: 'Mirakl', icon: 'fa-server', searchName: 'Team Mirakl', color: '#c0392b', textColor: "#FFF" },
        { label: 'Wholesalers', icon: 'fa-database', searchName: 'Team Wholesalers', color: '#6c5ce7', textColor: "#FFF" },
        { label: 'Impl', icon: 'fa-cogs', searchName: 'Team Implementation', color: '#e84393', textColor: "#FFF" },
        { label: 'Enterprise', icon: 'fa-building', searchName: 'Enterprise Support', color: '#ffaa00', textColor: "#000" }
    ];

    const FA_ICONS = [
        'none', 'fa-user', 'fa-shopping-cart', 'fa-truck', 'fa-globe', 'fa-file-text',
        'fa-credit-card', 'fa-cubes', 'fa-server', 'fa-database', 'fa-cogs', 'fa-building',
        'fa-tags', 'fa-envelope', 'fa-star', 'fa-check', 'fa-exclamation-triangle',
        'fa-wrench', 'fa-pencil', 'fa-exchange', 'fa-bullhorn', 'fa-bolt', 'fa-rocket',
        'fa-users', 'fa-pie-chart', 'fa-money', 'fa-archive', 'fa-paper-plane', 'fa-headphones', 'fa-bars'
    ];

    let TARGET_TEAMS = [];
    try {
        const stored = localStorage.getItem('BL_KAM_TEAMS_CONFIG');
        TARGET_TEAMS = stored ? JSON.parse(stored) : DEFAULT_TEAMS;
    } catch(e) {
        TARGET_TEAMS = DEFAULT_TEAMS;
    }

    function saveTeamsToStorage() {
        localStorage.setItem('BL_KAM_TEAMS_CONFIG', JSON.stringify(TARGET_TEAMS));
    }
    // ======================================

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
                    if (option.textContent.toLowerCase().includes(targetName.toLowerCase())) {
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

    function closeActiveProfileModal() {
        const closeBtn = document.querySelector('#ticket_modal button.close') ||
                         document.querySelector('#ticket_modal button');

        if (closeBtn) {
            closeBtn.click();
        }

        setTimeout(() => {
            if (typeof window.$ !== 'undefined') {
                window.$('#ticket_modal').modal('hide');
            }

            const modal = document.getElementById('ticket_modal');
            if (modal) {
                modal.classList.remove('in', 'show');
                modal.style.display = 'none';
            }

            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();

            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';

            document.body.classList.remove('silent-macro-running');
        }, 250);
    }

    function processExpandedTickets() {
        const expandedInfos = document.querySelectorAll('td.ticket_info');

        expandedInfos.forEach(infoTd => {
            if (infoTd.querySelector('.kam-btn-container')) return;

            const rowContainer = infoTd.querySelector('.row');
            if (!rowContainer) return;

            const cols = rowContainer.querySelectorAll('.col-sm-4');
            if (cols.length < 3) return;

            const idMatch = infoTd.id.match(/ticket_([a-z0-9]+)_info/i);
            if (!idMatch) return;
            const ticketHash = idMatch[1];
            const ticketRow = document.querySelector(`tr[data-hash="${ticketHash}"]`);

            let hasEnterprise = false;

            const extractTags = (text) => {
                const upperText = text.toUpperCase();
                if (upperText.includes('ENTERPRISE') || upperText.includes('ETB')) {
                    hasEnterprise = true;
                }
            };

            if (ticketRow) {
                const labels = ticketRow.querySelectorAll('.label, .badge, .ticket-tag');
                labels.forEach(tag => extractTags(tag.textContent.trim()));
            }

            const select2Choices = infoTd.querySelectorAll('.select2-selection__choice');
            select2Choices.forEach(choice => {
                const text = (choice.getAttribute('title') || choice.textContent).trim().replace(/^×\s*/, '');
                extractTags(text);
            });

            rowContainer.style.position = 'relative';

            const btnContainer = document.createElement('div');
            btnContainer.className = 'kam-btn-container';
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

                let iconHtml = '';
                if (teamConfig.icon && teamConfig.icon !== 'none') {
                    iconHtml = `<i class="fa ${teamConfig.icon}" style="margin-right: 4px;"></i>`;
                }

                btn.innerHTML = iconHtml + teamConfig.label;
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

            if (hasEnterprise && ticketRow) {
                const kamAutoBtn = document.createElement('button');
                kamAutoBtn.innerHTML = `<i class="fa fa-star" style="margin-right: 4px;"></i>Przekaż do KAM`;
                kamAutoBtn.className = 'btn';
                kamAutoBtn.style.backgroundColor = '#f1c40f';
                kamAutoBtn.style.color = '#000';
                kamAutoBtn.style.border = 'none';
                kamAutoBtn.style.fontSize = '11px';
                kamAutoBtn.style.padding = '3px 8px';
                kamAutoBtn.style.borderRadius = '3px';
                kamAutoBtn.style.cursor = 'pointer';
                kamAutoBtn.style.marginLeft = '10px';
                kamAutoBtn.style.boxShadow = '0 0 5px rgba(241, 196, 15, 0.5)';
                kamAutoBtn.title = "Pobiera przypisanego KAMa z profilu klienta i automatycznie go wybiera";

                kamAutoBtn.onmouseover = () => kamAutoBtn.style.opacity = '0.85';
                kamAutoBtn.onmouseout = () => kamAutoBtn.style.opacity = '1';

                kamAutoBtn.onclick = (e) => {
                    e.preventDefault();

                    const userSpan = ticketRow.querySelector('.username_td span');
                    if (!userSpan) {
                        showNotification("Błąd: Nie można zlokalizować maila do otwarcia profilu.", true);
                        return;
                    }

                    document.body.classList.add('silent-macro-running');

                    userSpan.click();

                    const originalHtml = kamAutoBtn.innerHTML;
                    kamAutoBtn.innerHTML = `<i class="fa fa-spinner fa-spin" style="margin-right: 4px;"></i>Szukam...`;
                    kamAutoBtn.disabled = true;

                    let attempts = 0;
                    const checkModal = setInterval(() => {
                        attempts++;
                        const modalBody = document.getElementById('ticket_modal_body');

                        if (modalBody && modalBody.textContent.includes('KAM:')) {
                            clearInterval(checkModal);

                            let kamName = null;
                            const text = modalBody.textContent;
                            const kamIndex = text.indexOf('KAM:');
                            if (kamIndex !== -1) {
                                let endBullet = text.indexOf('•', kamIndex);
                                let endNewline = text.indexOf('\n', kamIndex);

                                let endIndex = -1;
                                if (endBullet !== -1 && endNewline !== -1) endIndex = Math.min(endBullet, endNewline);
                                else if (endBullet !== -1) endIndex = endBullet;
                                else if (endNewline !== -1) endIndex = endNewline;

                                if (endIndex !== -1) {
                                    kamName = text.substring(kamIndex + 4, endIndex).trim();
                                } else {
                                    kamName = text.substring(kamIndex + 4).trim();
                                }
                            }

                            closeActiveProfileModal();

                            if (kamName) {
                                redirectTicket(ticketHash, kamName, false);
                                kamAutoBtn.innerHTML = `<i class="fa fa-check" style="margin-right: 4px;"></i>${kamName}`;
                            } else {
                                kamAutoBtn.innerHTML = originalHtml;
                                kamAutoBtn.disabled = false;
                                showNotification("Błąd: Znaleziono prefiks KAM:, ale nie udało się odczytać imienia.", true);
                            }
                        } else if (attempts > 20) {
                            clearInterval(checkModal);
                            kamAutoBtn.innerHTML = originalHtml;
                            kamAutoBtn.disabled = false;
                            showNotification("Zgłoszenie ma tag ETB, ale w profilu nie znaleziono dopisanego KAMa.", true);

                            closeActiveProfileModal();
                        }
                    }, 250);
                };

                btnContainer.appendChild(kamAutoBtn);
            }

            rowContainer.insertBefore(btnContainer, rowContainer.firstChild);

            const adjustMargin = () => {
                const h = btnContainer.offsetHeight;
                if (h > 0) {
                    cols[0].style.marginTop = (h + 10) + 'px';
                    cols[1].style.marginTop = (h + 10) + 'px';
                }
            };

            setTimeout(adjustMargin, 50);

            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => adjustMargin());
                ro.observe(btnContainer);
            }
        });
    }

    // ==========================================
    // === PANEL ZARZĄDZANIA I INIEKCJA PRZYCISKU
    // ==========================================

    let editIndex = -1;
    let selectedIcon = 'none';
    let dragStartIndex = null; // Do Drag & Drop

    function injectSettingsButton() {
        const paginateDiv = document.getElementById('datatable_paginate');
        if (!paginateDiv) return;

        if (document.getElementById('kam-settings-trigger-btn')) return;

        if (window.getComputedStyle(paginateDiv).position === 'static') {
            paginateDiv.style.position = 'relative';
        }

        const gearBtn = document.createElement('button');
        gearBtn.id = 'kam-settings-trigger-btn';
        gearBtn.innerHTML = '<i class="fa fa-cog" style="margin-right: 5px;"></i> Easy Redirect';
        gearBtn.style.backgroundColor = '#2c3e50';
        gearBtn.style.height = '35px';
        gearBtn.style.color = '#ecf0f1';
        gearBtn.style.border = 'none';
        gearBtn.style.padding = '8px 12px';
        gearBtn.style.borderRadius = '3px';
        gearBtn.style.cursor = 'pointer';
        gearBtn.style.fontSize = '0.95rem';

        gearBtn.style.position = 'absolute';
        gearBtn.style.right = '100%';
        gearBtn.style.top = '48px';
        gearBtn.style.transform = 'translateY(-50%)';
        gearBtn.style.marginRight = '15px';
        gearBtn.style.whiteSpace = 'nowrap';

        gearBtn.onmouseover = () => gearBtn.style.backgroundColor = '#34495e';
        gearBtn.onmouseout = () => gearBtn.style.backgroundColor = '#2c3e50';

        gearBtn.onclick = (e) => {
            e.preventDefault();
            openSettingsModal();
        };

        paginateDiv.appendChild(gearBtn);
    }

    function closeSettingsModal() {
        const overlay = document.getElementById('kam-settings-overlay');
        const modal = document.getElementById('kam-settings-modal');
        if (overlay) overlay.remove();
        if (modal) modal.remove();
    }

    function applyChangesLive() {
        document.querySelectorAll('.kam-btn-container').forEach(el => el.remove());
        document.querySelectorAll('.kam-processed-buttons').forEach(el => el.classList.remove('kam-processed-buttons'));
        closeSettingsModal();
    }

    function openSettingsModal() {
        if (document.getElementById('kam-settings-overlay')) return;

        const refElement = document.querySelector('.card-box') || document.body;
        const panelBg = window.getComputedStyle(refElement).backgroundColor || '#ffffff';
        const panelColor = window.getComputedStyle(refElement).color || '#333333';
        const borderColor = 'rgba(128,128,128,0.2)';
        const inputBg = 'rgba(128,128,128,0.05)';

        const overlay = document.createElement('div');
        overlay.id = 'kam-settings-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = '9999990';

        const modal = document.createElement('div');
        modal.id = 'kam-settings-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%'; modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = panelBg;
        modal.style.color = panelColor;
        modal.style.width = '650px';
        modal.style.maxHeight = '90vh';
        modal.style.overflowY = 'auto';
        modal.style.padding = '25px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        modal.style.zIndex = '9999991';
        modal.style.fontFamily = 'Arial, sans-serif';

        const modalHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${borderColor}; padding-bottom:10px; margin-bottom:15px;">
                <h2 style="margin:0; font-size:20px;">Zarządzaj Przyciskami Zespołów</h2>
                <button id="kam-btn-close-x" style="background:transparent; border:none; color:${panelColor}; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid ${borderColor}; text-align:left;">
                        <th style="padding:8px 5px; width:30px;"></th>
                        <th style="padding:8px 5px;">Etykieta (i Ikona)</th>
                        <th style="padding:8px 5px;">Cel (Szukany folder)</th>
                        <th style="padding:8px 5px;">Wygląd</th>
                        <th style="padding:8px 5px;">Akcje</th>
                    </tr>
                </thead>
                <tbody id="kam-teams-list"></tbody>
            </table>

            <div style="background:${inputBg}; padding:15px; border-radius:5px; margin-bottom:20px; border:1px solid ${borderColor};">
                <h3 style="margin-top:0; font-size:16px;" id="kam-form-title">Dodaj nowy przycisk</h3>

                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <div style="flex:1;">
                        <label style="font-size:12px; font-weight:bold; display:block; margin-bottom:3px;">Tekst na przycisku</label>
                        <input type="text" id="kam-input-label" placeholder="np. Priv" style="width:100%; padding:6px; border:1px solid ${borderColor}; border-radius:3px; background:transparent; color:${panelColor};">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:12px; font-weight:bold; display:block; margin-bottom:3px;">Dokładna nazwa folderu / Zespołu</label>
                        <input type="text" id="kam-input-search" placeholder="np. Team Shops" style="width:100%; padding:6px; border:1px solid ${borderColor}; border-radius:3px; background:transparent; color:${panelColor};">
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size:12px; font-weight:bold; display:block; margin-bottom:3px;">Wybierz Ikonę (Font Awesome)</label>
                    <div id="kam-icon-picker" style="display:flex; flex-wrap:wrap; gap:5px; max-height:85px; overflow-y:auto; padding:5px; border:1px solid ${borderColor}; border-radius:3px; background:transparent;">
                        </div>
                </div>

                <div style="display:flex; gap:15px; align-items:flex-end;">
                    <div>
                        <label style="font-size:12px; font-weight:bold; display:block; margin-bottom:3px;">Tło</label>
                        <input type="color" id="kam-input-bg" value="#3bafda" style="cursor:pointer; height:30px; width:50px; padding:0; border:none; background:transparent;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:bold; display:block; margin-bottom:3px;">Tekst</label>
                        <input type="color" id="kam-input-text" value="#ffffff" style="cursor:pointer; height:30px; width:50px; padding:0; border:none; background:transparent;">
                    </div>
                    <div style="flex:1; text-align:right;">
                        <button id="kam-btn-cancel-edit" style="display:none; padding:7px 12px; background:#95a5a6; color:#fff; border:none; border-radius:3px; cursor:pointer; margin-right:5px;">Anuluj edycję</button>
                        <button id="kam-btn-save-team" style="padding:7px 15px; background:#27ae60; color:#fff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">Zapisz Przycisk</button>
                    </div>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; border-top:2px solid ${borderColor}; padding-top:15px;">
                <button id="kam-btn-reset-defaults" style="padding:8px 15px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">Przywróć Domyślne</button>
                <div>
                    <button id="kam-btn-apply-modal" style="padding:8px 20px; background:#34495e; color:#fff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">Zastosuj Zmiany</button>
                </div>
            </div>
        `;

        modal.innerHTML = modalHTML;
        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        renderTeamsTable();
        renderIconPicker();

        document.getElementById('kam-btn-save-team').onclick = saveFormData;
        document.getElementById('kam-btn-cancel-edit').onclick = resetForm;

        document.getElementById('kam-btn-close-x').onclick = closeSettingsModal;
        document.getElementById('kam-btn-apply-modal').onclick = applyChangesLive;

        document.getElementById('kam-btn-reset-defaults').onclick = () => {
            if(confirm("Czy na pewno chcesz usunąć wszystkie zmiany i przywrócić domyślną listę przycisków?")) {
                TARGET_TEAMS = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
                saveTeamsToStorage();
                renderTeamsTable();
                resetForm();
            }
        };
    }

    function renderIconPicker() {
        const picker = document.getElementById('kam-icon-picker');
        if (!picker) return;
        picker.innerHTML = '';

        FA_ICONS.forEach(icon => {
            const btn = document.createElement('div');
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '3px';
            btn.style.border = (icon === selectedIcon) ? '2px solid #3bafda' : '1px solid transparent';
            btn.style.backgroundColor = (icon === selectedIcon) ? 'rgba(59,175,218,0.2)' : 'transparent';
            btn.title = icon;

            if (icon === 'none') {
                btn.innerHTML = '<span style="font-size:10px; font-weight:bold;">Brak</span>';
            } else {
                btn.innerHTML = `<i class="fa ${icon}" style="font-size: 16px;"></i>`;
            }

            btn.onclick = () => {
                selectedIcon = icon;
                renderIconPicker();
            };
            picker.appendChild(btn);
        });
    }

    function renderTeamsTable() {
        const tbody = document.getElementById('kam-teams-list');
        const borderColor = 'rgba(128,128,128,0.2)';
        tbody.innerHTML = '';

        TARGET_TEAMS.forEach((team, index) => {
            const tr = document.createElement('tr');
            tr.className = 'kam-draggable-row';
            tr.style.borderBottom = `1px solid ${borderColor}`;
            tr.style.cursor = 'grab';
            tr.draggable = true;

            let iconHtml = (team.icon && team.icon !== 'none') ? `<i class="fa ${team.icon}" style="margin-right:4px;"></i>` : '';

            tr.innerHTML = `
                <td style="padding:8px 5px; text-align:center; color:#95a5a6; width:30px;">
                    <i class="fa fa-bars"></i>
                </td>
                <td style="padding:8px 5px;">${iconHtml}${team.label}</td>
                <td style="padding:8px 5px;">${team.searchName}</td>
                <td style="padding:8px 5px;">
                    <span style="background-color:${team.color}; color:${team.textColor}; padding:3px 8px; border-radius:3px; font-size:11px; font-weight:bold;">${iconHtml}Próbka</span>
                </td>
                <td style="padding:8px 5px;">
                    <button class="kam-edit-btn" data-index="${index}" style="padding:3px 8px; background:#f39c12; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:11px; margin-right:3px;">Edytuj</button>
                    <button class="kam-delete-btn" data-index="${index}" style="padding:3px 8px; background:#c0392b; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:11px;">Usuń</button>
                </td>
            `;

            // === HTML5 DRAG & DROP EVENTS ===
            tr.addEventListener('dragstart', function(e) {
                dragStartIndex = index;
                this.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', this.innerHTML); // Wymagane przez Firefoxa
            });

            tr.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('kam-drag-over');
                return false;
            });

            tr.addEventListener('dragleave', function(e) {
                this.classList.remove('kam-drag-over');
            });

            tr.addEventListener('drop', function(e) {
                e.stopPropagation();
                this.classList.remove('kam-drag-over');
                const dropTargetIndex = index;

                if (dragStartIndex !== dropTargetIndex && dragStartIndex !== null) {
                    const draggedTeam = TARGET_TEAMS.splice(dragStartIndex, 1)[0];
                    TARGET_TEAMS.splice(dropTargetIndex, 0, draggedTeam);
                    saveTeamsToStorage();
                    renderTeamsTable();
                    resetForm(); // Resetujemy form w razie zmiany indeksów podczas edycji
                }
                return false;
            });

            tr.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(r => r.classList.remove('kam-drag-over'));
            });

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.kam-edit-btn').forEach(btn => {
            btn.onclick = function() { loadTeamToForm(this.getAttribute('data-index')); };
        });
        document.querySelectorAll('.kam-delete-btn').forEach(btn => {
            btn.onclick = function() { deleteTeam(this.getAttribute('data-index')); };
        });
    }

    function loadTeamToForm(index) {
        editIndex = parseInt(index);
        const team = TARGET_TEAMS[editIndex];

        document.getElementById('kam-input-label').value = team.label;
        document.getElementById('kam-input-search').value = team.searchName;
        document.getElementById('kam-input-bg').value = team.color;
        document.getElementById('kam-input-text').value = team.textColor;

        selectedIcon = team.icon || 'none';
        renderIconPicker();

        document.getElementById('kam-form-title').innerText = "Edytujesz przycisk";
        document.getElementById('kam-btn-cancel-edit').style.display = 'inline-block';
    }

    function saveFormData() {
        const label = document.getElementById('kam-input-label').value.trim();
        const searchName = document.getElementById('kam-input-search').value.trim();
        const color = document.getElementById('kam-input-bg').value;
        const textColor = document.getElementById('kam-input-text').value;

        if (!label || !searchName) {
            alert("Uzupełnij etykietę oraz nazwę folderu docelowego!");
            return;
        }

        const newTeam = { label, searchName, color, textColor, icon: selectedIcon };

        if (editIndex >= 0) {
            TARGET_TEAMS[editIndex] = newTeam;
        } else {
            TARGET_TEAMS.push(newTeam);
        }

        saveTeamsToStorage();
        renderTeamsTable();
        resetForm();
    }

    function deleteTeam(index) {
        if(confirm("Usunąć ten przycisk?")) {
            TARGET_TEAMS.splice(index, 1);
            saveTeamsToStorage();
            renderTeamsTable();
            if (editIndex == index) resetForm();
        }
    }

    function resetForm() {
        editIndex = -1;
        selectedIcon = 'none';
        document.getElementById('kam-input-label').value = '';
        document.getElementById('kam-input-search').value = '';
        document.getElementById('kam-input-bg').value = '#3bafda';
        document.getElementById('kam-input-text').value = '#ffffff';

        renderIconPicker();
        document.getElementById('kam-form-title').innerText = "Dodaj nowy przycisk";
        document.getElementById('kam-btn-cancel-edit').style.display = 'none';
    }

    setInterval(() => {
        processModal();
        processExpandedTickets();
        injectSettingsButton();
    }, 500);

})();
