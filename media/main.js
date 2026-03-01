(function () {
    const vscode = acquireVsCodeApi();

    let state = {
        tasks: [],
        breaks: [],
        codingTimeMs: 0,
        timerPaused: false,
        holidays: [],
        salahData: { method: "MWL", times: {} },
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear()
    };

    // Tab Navigation
    document.querySelectorAll('.segment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active', 'hidden'));

            e.target.classList.add('active');

            // hide all
            document.querySelectorAll('.tab-content').forEach(tc => {
                if (tc.id !== e.target.dataset.target) {
                    tc.classList.add('hidden');
                }
            });
            // show active
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });

    let editingTaskId = null;

    // Toggle Forms
    document.getElementById('showAddTaskFormBtn')?.addEventListener('click', () => {
        const form = document.getElementById('addTaskForm');
        form.classList.toggle('hidden');
        if (form.classList.contains('hidden')) {
            editingTaskId = null;
            document.getElementById('addTaskBtn').textContent = 'Add Task';
            document.getElementById('newTaskTitle').value = '';
            document.getElementById('newTaskDate').value = '';
            document.getElementById('newTaskHighPriority').checked = false;
        }
    });

    document.getElementById('showAddReminderFormBtn')?.addEventListener('click', () => {
        document.getElementById('addReminderForm').classList.toggle('hidden');
    });

    document.getElementById('showCalendarSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('calendarSettingsForm').classList.toggle('hidden');
    });

    document.getElementById('showSalahSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('salahSettingsForm').classList.toggle('hidden');
    });

    document.getElementById('browseHolidaysBtn')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'browseHolidays' });
    });

    document.getElementById('downloadSampleBtn')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'downloadSample' });
    });

    // Sending Messages
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newTaskTitle').value;
        const date = document.getElementById('newTaskDate').value;
        const highPriority = document.getElementById('newTaskHighPriority').checked;

        if (name) {
            if (editingTaskId) {
                vscode.postMessage({ type: 'editTask', value: { id: editingTaskId, name, date, highPriority } });
                editingTaskId = null;
                document.getElementById('addTaskBtn').textContent = 'Add Task';
            } else {
                vscode.postMessage({ type: 'addTask', value: { name, date, highPriority } });
            }
            document.getElementById('newTaskTitle').value = '';
            document.getElementById('newTaskDate').value = '';
            document.getElementById('newTaskHighPriority').checked = false;
            document.getElementById('addTaskForm').classList.add('hidden');
        }
    });

    document.getElementById('addBreakBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newBreakName').value;
        const interval = document.getElementById('newBreakInterval').value;
        const group = document.getElementById('newBreakGroup').value;

        if (name && interval) {
            const compoundName = `${group}::${name}`;
            vscode.postMessage({ type: 'addBreak', value: { name: compoundName, interval: parseInt(interval) } });
            document.getElementById('newBreakName').value = '';
            document.getElementById('newBreakInterval').value = '';
            document.getElementById('addReminderForm').classList.add('hidden');
        }
    });

    document.getElementById('timerToggleBtn')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'toggleTimer' });
    });

    document.getElementById('timerResetBtn')?.addEventListener('click', () => {
        vscode.postMessage({ type: 'resetTimer' });
    });

    // Save Settings
    document.getElementById('saveCalendarSettingsBtn')?.addEventListener('click', () => {
        const holidaysPath = document.getElementById('settingHolidaysPath').value;
        const weekends = [];
        for (let i = 0; i <= 6; i++) {
            if (document.getElementById(`weekend-${i}`).checked) {
                weekends.push(i);
            }
        }
        vscode.postMessage({ type: 'saveSettings', value: { type: 'calendar', holidaysPath, weekends } });
    });

    document.getElementById('saveSalahSettingsBtn')?.addEventListener('click', () => {
        const salahMethod = document.getElementById('settingSalahMethod').value;
        const salahOffsets = {
            "Fajr": parseInt(document.getElementById('offset-Fajr').value) || 0,
            "Dhuhr": parseInt(document.getElementById('offset-Dhuhr').value) || 0,
            "Asr": parseInt(document.getElementById('offset-Asr').value) || 0,
            "Maghrib": parseInt(document.getElementById('offset-Maghrib').value) || 0,
            "Isha": parseInt(document.getElementById('offset-Isha').value) || 0
        };
        vscode.postMessage({ type: 'saveSettings', value: { type: 'salah', salahMethod, salahOffsets } });
    });

    // Receive Messages
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'updateState':
                state = { ...state, ...message.value };
                if (state.holidays) {
                    state.holidays.sort((a, b) => a.startDate.localeCompare(b.startDate));
                }
                renderAll();
                break;
            case 'tickTimer':
                state.codingTimeMs = message.value.codingTimeMs;
                renderTimer();
                break;
            case 'showNotification':
                showToast(message.value.message, message.value.type || 'info', message.value.actions || []);
                break;
        }
    });

    vscode.postMessage({ type: 'getState' });

    // Drag and Drop Logic
    const grid = document.getElementById('dashboard-grid');
    if (grid) {
        let draggedItem = null;

        grid.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                draggedItem = card;
                // Use setTimeout to allow drag image to be generated before styling
                setTimeout(() => card.classList.add('dragging'), 0);
            }
        });

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggable = document.querySelector('.dragging');
            if (!draggable) return;

            const elements = [...grid.querySelectorAll('.card:not(.dragging)')];
            const nextElement = elements.find(child => {
                const box = child.getBoundingClientRect();
                // In a grid, check if we are logically before this element
                const isSameRow = Math.abs(e.clientY - (box.top + box.height / 2)) < box.height / 2;
                if (isSameRow) {
                    return e.clientX < box.left + box.width / 2;
                }
                return e.clientY < box.top + box.height / 2;
            });

            if (nextElement) {
                grid.insertBefore(draggable, nextElement);
            } else {
                grid.appendChild(draggable);
            }
        });

        grid.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }

            // Save order
            const order = [...grid.querySelectorAll('.card')].map(card => {
                if (card.classList.contains('widget-timer')) return 'timer';
                if (card.classList.contains('widget-tasks')) return 'tasks';
                if (card.classList.contains('widget-reminders')) return 'reminders';
                if (card.classList.contains('widget-calendar')) return 'calendar';
                if (card.classList.contains('widget-salah')) return 'salah';
                return '';
            }).filter(Boolean);
            vscode.postMessage({ type: 'updateCardOrder', value: order });
        });
    }

    // Clock & Salah Countdown Loop
    setInterval(() => {
        const now = new Date();
        const clock = document.getElementById('clockDisplay');
        if (clock) {
            clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        updateSalahCountdown(now);
    }, 1000);

    // Global Remove Handlers
    window.removeTask = (id) => vscode.postMessage({ type: 'removeTask', value: id });
    window.removeBreak = (id) => vscode.postMessage({ type: 'removeBreak', value: id });

    window.editTask = (id) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            editingTaskId = id;
            document.getElementById('newTaskTitle').value = task.name;
            document.getElementById('newTaskDate').value = task.date || '';
            document.getElementById('newTaskHighPriority').checked = task.highPriority;
            document.getElementById('addTaskBtn').textContent = 'Update Task';
            document.getElementById('addTaskForm').classList.remove('hidden');
            document.getElementById('newTaskTitle').focus();
        }
    };

    window.copyTask = (name) => {
        navigator.clipboard.writeText(name);
    };

    window.changeMonth = (offset) => {
        let newMonth = state.currentMonth + offset;
        let newYear = state.currentYear;

        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }

        state.currentMonth = newMonth;
        state.currentYear = newYear;
        renderCalendar();
    };

    function renderAll() {
        renderCardOrder();
        renderTasks();
        renderReminders();
        renderTimer();
        renderCalendar();
        renderSalah();
        renderSettings();
    }

    function renderCardOrder() {
        if (!state.cardOrder || state.cardOrder.length === 0) return;
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;

        const cards = {
            'timer': grid.querySelector('.widget-timer'),
            'tasks': grid.querySelector('.widget-tasks'),
            'reminders': grid.querySelector('.widget-reminders'),
            'calendar': grid.querySelector('.widget-calendar'),
            'salah': grid.querySelector('.widget-salah')
        };

        state.cardOrder.forEach(id => {
            const card = cards[id];
            if (card) {
                grid.appendChild(card);
            }
        });
    }

    function renderTasks() {
        const list = document.getElementById('taskList');
        list.innerHTML = '';
        const sortedTasks = [...state.tasks].sort((a, b) => (b.highPriority ? 1 : 0) - (a.highPriority ? 1 : 0));

        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            let priorityTag = task.highPriority ? `<span class="tag high-priority">High</span>` : '';
            let dateMeta = task.date ? `Due: ${task.date}` : '';

            li.innerHTML = `
                <div class="task-info">
                  <div class="task-name">${task.name} ${priorityTag}</div>
                  <div class="task-meta">${dateMeta}</div>
                </div>
                <div class="task-actions" style="display:flex; gap:8px;">
                    <button class="icon-btn action-icon" onclick="copyTask('${task.name.replace(/'/g, "\\'")}')" title="Copy">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1h-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/></svg>
                    </button>
                    <button class="icon-btn action-icon" onclick="editTask('${task.id}')" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                    </button>
                    <button class="icon-btn action-icon" onclick="removeTask('${task.id}')" title="Remove">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    function renderReminders() {
        const container = document.getElementById('reminderContainer');
        container.innerHTML = '';

        const groups = {};
        state.breaks.forEach(br => {
            let [group, name] = br.name.split('::');
            if (!name) { name = group; group = "Custom"; }

            if (!groups[group]) groups[group] = [];
            groups[group].push({ ...br, displayName: name });
        });

        for (const [groupName, reminders] of Object.entries(groups)) {
            const groupEl = document.createElement('div');
            groupEl.innerHTML = `<div class="group-header">${groupName}</div>`;

            reminders.forEach(r => {
                let groupClass = 'tag-custom';
                if (groupName.toLowerCase() === 'health') groupClass = 'tag-health';
                else if (groupName.toLowerCase() === 'productivity') groupClass = 'tag-productivity';

                const item = document.createElement('div');
                item.className = 'reminder-item';
                item.innerHTML = `
                  <div class="label">
                     <span>${r.displayName}</span>
                     <span class="tag ${groupClass}">${r.interval}m</span>
                  </div>
                  <button class="icon-btn action-icon" onclick="removeBreak('${r.id}')" style="width:24px;height:24px;font-size:12px;">✕</button>
                `;
                groupEl.appendChild(item);
            });
            container.appendChild(groupEl);
        }
    }

    function renderTimer() {
        const totalSeconds = Math.floor(state.codingTimeMs / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');

        document.getElementById('codingTimeDisplay').textContent = `${hours}:${minutes}:${seconds}`;
        document.getElementById('timerToggleBtn').textContent = state.timerPaused ? "Resume Timer" : "Pause Timer";
        if (state.timerPaused) {
            document.getElementById('timerToggleBtn').classList.replace('primary-btn', 'secondary-btn');
        } else {
            document.getElementById('timerToggleBtn').classList.replace('secondary-btn', 'primary-btn');
        }
    }

    function renderCalendar() {
        const calContainer = document.getElementById('calendarContainer');
        if (calContainer) {
            const now = new Date();
            const year = state.currentYear;
            const month = state.currentMonth;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            let html = `
                <div class="calendar-header-nav">
                    <button onclick="changeMonth(-1)" class="nav-btn">❮</button>
                    <span>${monthNames[month]} ${year}</span>
                    <button onclick="changeMonth(1)" class="nav-btn">❯</button>
                </div>
                <div class="calendar-grid">
            `;

            const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            dayLabels.forEach(d => {
                html += `<div class="calendar-day-label">${d}</div>`;
            });

            for (let i = 0; i < firstDay; i++) {
                html += `<div class="calendar-day empty"></div>`;
            }

            const todayStr = now.toISOString().split('T')[0];

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayDate = new Date(year, month, d);
                const dayOfWeek = dayDate.getDay();

                const isToday = (year === now.getFullYear() && month === now.getMonth() && d === now.getDate()) ? 'today' : '';
                const holidayMatch = state.holidays.find(h => {
                    return dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate);
                });
                const isHoliday = holidayMatch ? 'holiday' : '';

                let upcomingClass = '';
                if (holidayMatch && dateStr >= todayStr) {
                    upcomingClass = 'upcoming';
                }

                const isWeekend = state.weekends && state.weekends.includes(dayOfWeek) ? 'weekend' : '';

                // Construct Title (Tooltip)
                let labels = [];
                if (isWeekend) labels.push('Weekend');
                if (holidayMatch) labels.push(holidayMatch.name);
                const title = labels.join(' • ');

                html += `<div class="calendar-day ${isToday} ${isHoliday} ${upcomingClass} ${isWeekend}" title="${title}">${d}</div>`;
            }

            html += `</div>`;
            calContainer.innerHTML = html;
        }
    }

    function renderSettings() {
        if (state.salahData) {
            if (state.salahData.method) {
                const sel = document.getElementById('settingSalahMethod');
                if (sel) sel.value = state.salahData.method;
            }
            if (state.salahData.offsets) {
                for (const [name, val] of Object.entries(state.salahData.offsets)) {
                    const input = document.getElementById(`offset-${name}`);
                    if (input) input.value = val;
                }
            }
        }

        if (state.holidaysPath !== undefined) {
            const input = document.getElementById('settingHolidaysPath');
            if (input) input.value = state.holidaysPath;
        }

        if (state.weekends) {
            for (let i = 0; i <= 6; i++) {
                const cb = document.getElementById(`weekend-${i}`);
                if (cb) cb.checked = state.weekends.includes(i);
            }
        }
    }

    function renderSalah() {
        if (!state.salahData || !state.salahData.times) return;

        document.getElementById('salahMethodDisplay').textContent = `Method: ${state.salahData.method}`;

        const list = document.getElementById('salahList');
        list.innerHTML = '';

        const times = state.salahData.times;
        const offsets = state.salahData.offsets || {};

        for (const [name, time] of Object.entries(times)) {
            const offset = offsets[name] || 0;
            const offsetLabel = offset !== 0 ? `<span class="tag ${offset > 0 ? 'high-priority' : 'tag-custom'}" style="font-size:10px;">${offset > 0 ? '+' : ''}${offset}m</span>` : '';

            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>${name}</span>
                    ${offsetLabel}
                </div>
                <span class="time">${time}</span>
            `;
            // Add ID for active styling
            li.id = `salah-item-${name}`;
            list.appendChild(li);
        }

        updateSalahCountdown(new Date());
    }

    function updateSalahCountdown(now) {
        if (!state.salahData || !state.salahData.times) return;

        const times = state.salahData.times;
        let nextPrayer = null;
        let nextTimeObj = null;

        // Find next prayer today
        for (const [name, timeStr] of Object.entries(times)) {
            const [h, m] = timeStr.split(':').map(Number);
            const pTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

            if (pTime > now) {
                nextPrayer = name;
                nextTimeObj = pTime;
                break;
            }
        }

        // If all prayers passed, next is Fajr tomorrow
        if (!nextPrayer && times["Fajr"]) {
            nextPrayer = "Fajr";
            const [h, m] = times["Fajr"].split(':').map(Number);
            nextTimeObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m, 0);
        }

        if (nextPrayer && nextTimeObj) {
            document.getElementById('nextPrayerName').textContent = nextPrayer;

            // Highlight active in list
            document.querySelectorAll('.salah-list li').forEach(li => li.classList.remove('active'));
            const activeLi = document.getElementById(`salah-item-${nextPrayer}`);
            if (activeLi) activeLi.classList.add('active');

            // Calc difference
            const diffMs = nextTimeObj - now;

            // Trigger alert if time is exactly reached (check within 1s range)
            if (diffMs > 0 && diffMs <= 1000) {
                const msg = `It's time for ${nextPrayer}!`;
                showToast(msg, 'success');
            }

            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            const s = Math.floor((diffMs % 60000) / 1000);

            document.getElementById('salahCountdown').textContent =
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

            // Update SVG ring
            const diffMins = diffMs / 60000;
            const progress = document.getElementById('salahProgress');
            if (progress) {
                const maxDash = 283;
                let percent = diffMins / 240;
                if (percent > 1) percent = 1;
                progress.style.strokeDashoffset = maxDash - (maxDash * (1 - percent));
            }
        }
    }

    function showToast(message, type = 'info', actions = []) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        if (actions.length > 0) toast.classList.add('has-actions');

        const icons = {
            info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        };

        let actionHtml = '';
        if (actions.length > 0) {
            actionHtml = `
                <div class="toast-actions">
                    ${actions.map(a => `<button class="toast-btn ${a.primary ? 'primary' : ''}" data-action-id="${a.actionId}" data-break-id="${a.breakId}">${a.label}</button>`).join('')}
                </div>
            `;
        }

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message-wrapper">
                    <span class="toast-icon">${icons[type] || icons.info}</span>
                    <span class="toast-message">${message}</span>
                </div>
                <button class="toast-close-btn" title="Close">✕</button>
            </div>
            ${actionHtml}
        `;

        // Prepend to show newest at top (reverse of push)
        if (container.firstChild) {
            container.insertBefore(toast, container.firstChild);
        } else {
            container.appendChild(toast);
        }

        // Handle close button
        toast.querySelector('.toast-close-btn').addEventListener('click', () => {
            closeToast(toast);
        });

        // Handle button clicks
        toast.querySelectorAll('.toast-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = e.target.dataset.actionId;
                const breakId = e.target.dataset.breakId;
                vscode.postMessage({ type: 'toastAction', value: { actionId, breakId } });
                closeToast(toast);
            });
        });

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        function closeToast(el) {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 400);
        }
    }

}());
