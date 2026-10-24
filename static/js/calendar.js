/**
 * CreatorAI – Content Calendar & Progress Tracker Logic
 * Provides:
 * - Interactive date selection and visual day focus
 * - Daily and monthly progress tracking (% completed, in-progress, planned)
 * - 1-click status cycling and instant checkbox completion
 * - Filtering by date, platform, status, and search keywords
 * - Plan arrangement, rescheduling, and editing progress notes
 * - Deep-link drafting into AI Writer and Caption Generator
 */
document.addEventListener('DOMContentLoaded', () => {
    let currentDate = new Date();
    let selectedDate = null; // 'YYYY-MM-DD' or null for all
    let activePlatformFilter = 'all';
    let activeStatusFilter = 'all';
    let searchQuery = '';

    // Calendar Elements
    const monthYearEl = document.getElementById('calendar-month-year');
    const daysGridEl = document.getElementById('calendar-days-grid');
    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');
    const todayBtn = document.getElementById('cal-today-btn');

    // Metrics Elements
    const statTotalEl = document.getElementById('stat-total-count');
    const statInProgressEl = document.getElementById('stat-inprogress-count');
    const statCompletedEl = document.getElementById('stat-completed-count');
    const statProgressPercentEl = document.getElementById('stat-progress-percent');
    const statProgressBarEl = document.getElementById('stat-progress-bar');
    const statProgressRatioEl = document.getElementById('stat-progress-ratio');

    // Focus Banner Elements
    const focusTitleEl = document.getElementById('focus-date-title');
    const focusSubtitleEl = document.getElementById('focus-date-subtitle');
    const dayProgressLabelEl = document.getElementById('day-progress-label');
    const dayProgressBarEl = document.getElementById('day-progress-bar');
    const clearDateFilterBtn = document.getElementById('clear-date-filter-btn');
    const quickAddDateBtn = document.getElementById('quick-add-date-btn');

    // Queue / Arrange Elements
    const itemsListEl = document.getElementById('calendar-items-list');
    const emptyStateEl = document.getElementById('calendar-empty-state');
    const filterSearchInput = document.getElementById('filter-search-input');
    const filterStatusSelect = document.getElementById('filter-status-select');
    const platformFilterBtns = document.querySelectorAll('.filter-platform-btn');

    // Modals & Forms
    const addEventBtn = document.getElementById('add-event-btn');
    const planForm = document.getElementById('plan-post-form');
    const planTitleInput = document.getElementById('plan-title');
    const planPlatformSelect = document.getElementById('plan-platform');
    const planDateInput = document.getElementById('plan-date');
    const planStatusSelect = document.getElementById('plan-status');
    const planPrioritySelect = document.getElementById('plan-priority');
    const planNotesInput = document.getElementById('plan-notes');

    // Edit Modal Elements
    const editForm = document.getElementById('edit-plan-form');
    const editIdInput = document.getElementById('edit-plan-id');
    const editTitleInput = document.getElementById('edit-plan-title');
    const editPlatformSelect = document.getElementById('edit-plan-platform');
    const editDateInput = document.getElementById('edit-plan-date');
    const editStatusSelect = document.getElementById('edit-plan-status');
    const editPrioritySelect = document.getElementById('edit-plan-priority');
    const editProgressInput = document.getElementById('edit-plan-progress');
    const editProgressNumEl = document.getElementById('edit-progress-num');
    const editNotesInput = document.getElementById('edit-plan-notes');

    // ----------------------------------------------------
    // Stored Events Management
    // ----------------------------------------------------
    function getStoredEvents() {
        const raw = localStorage.getItem('creatorai_calendar_events');
        if (!raw) {
            const todayStr = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            const samples = [
                {
                    id: 'sample-1',
                    title: 'Announce AI Automation Beta v2.0',
                    platform: 'linkedin',
                    date: todayStr,
                    status: 'In Progress',
                    progress: 60,
                    priority: 'High',
                    notes: 'Hook written, graphics generated. Need to finalize call to action.'
                },
                {
                    id: 'sample-2',
                    title: '5 Clean Architecture Code Tips',
                    platform: 'instagram',
                    date: tomorrow,
                    status: 'Planned',
                    progress: 10,
                    priority: 'Medium',
                    notes: 'Carousel slides outline ready in drafts.'
                },
                {
                    id: 'sample-3',
                    title: 'Weekly Creator Roundup & Top AI Trends',
                    platform: 'blog',
                    date: yesterday,
                    status: 'Completed',
                    progress: 100,
                    priority: 'High',
                    notes: 'Published on main blog and shared to newsletter subscribers!'
                }
            ];
            localStorage.setItem('creatorai_calendar_events', JSON.stringify(samples));
            return samples;
        }

        try {
            const parsed = JSON.parse(raw) || [];
            // Normalize existing events
            return parsed.map(e => {
                let status = e.status || 'Planned';
                if (status === 'Drafting' || status === 'Scheduled') status = 'In Progress';
                if (status === 'Published') status = 'Completed';

                let progress = typeof e.progress === 'number' ? e.progress : (status === 'Completed' ? 100 : (status === 'In Progress' ? 50 : 0));

                return {
                    id: e.id || `event-${Date.now()}-${Math.random()}`,
                    title: e.title || 'Untitled Post',
                    platform: e.platform || 'instagram',
                    date: e.date || new Date().toISOString().split('T')[0],
                    status: status,
                    progress: progress,
                    priority: e.priority || 'Medium',
                    notes: e.notes || ''
                };
            });
        } catch {
            return [];
        }
    }

    function saveEvents(events, notify = false) {
        localStorage.setItem('creatorai_calendar_events', JSON.stringify(events));
        updateAllUI();
    }

    // ----------------------------------------------------
    // Update Metrics & Top Bar
    // ----------------------------------------------------
    function updateMetrics() {
        const events = getStoredEvents();
        const total = events.length;
        const completed = events.filter(e => e.status === 'Completed').length;
        const inProgress = events.filter(e => e.status === 'In Progress').length;
        const planned = events.filter(e => e.status === 'Planned').length;

        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (statTotalEl) statTotalEl.textContent = total;
        if (statCompletedEl) statCompletedEl.textContent = completed;
        if (statInProgressEl) statInProgressEl.textContent = inProgress;
        if (statProgressPercentEl) statProgressPercentEl.textContent = `${percent}%`;
        if (statProgressBarEl) statProgressBarEl.style.width = `${percent}%`;
        if (statProgressRatioEl) statProgressRatioEl.textContent = `${completed} of ${total} tasks completed`;
    }

    // ----------------------------------------------------
    // Format Date Helper
    // ----------------------------------------------------
    function formatDateNice(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    // ----------------------------------------------------
    // Render Monthly Calendar Grid
    // ----------------------------------------------------
    function renderCalendar() {
        if (!monthYearEl || !daysGridEl) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        const events = getStoredEvents();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let cellsHtml = '';

        // Previous month padding days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthTotalDays - i;
            cellsHtml += `
                <div class="h-24 p-1.5 rounded-2xl border border-slate-100/60 dark:border-slate-800/30 text-slate-300 dark:text-slate-700 text-xs select-none bg-slate-50/30 dark:bg-slate-900/10">
                    <span class="font-medium text-[11px] opacity-40">${dayNum}</span>
                </div>
            `;
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;

            // Calculate day progress
            const dayTotal = dayEvents.length;
            const dayCompleted = dayEvents.filter(e => e.status === 'Completed').length;
            const dayPercent = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;
            const isAllDone = dayTotal > 0 && dayCompleted === dayTotal;

            // Border & Background classes
            let cellClasses = 'h-24 p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ';
            if (isSelected) {
                cellClasses += 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ';
            } else if (isToday) {
                cellClasses += 'border-indigo-400/80 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-500 ';
            } else if (isAllDone) {
                cellClasses += 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400 ';
            } else {
                cellClasses += 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-600 ';
            }

            // Progress badge logic
            let badgeHtml = '';
            if (dayTotal > 0) {
                if (isAllDone) {
                    badgeHtml = `<span class="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5" title="All ${dayTotal} tasks completed!">✓ Done</span>`;
                } else {
                    badgeHtml = `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" title="${dayCompleted} of ${dayTotal} completed">${dayCompleted}/${dayTotal}</span>`;
                }
            }

            // Platform mini icons / indicators
            const itemsSnippet = dayEvents.slice(0, 2).map(e => {
                let dotColor = 'bg-blue-500';
                if (e.status === 'In Progress') dotColor = 'bg-amber-500';
                if (e.status === 'Completed') dotColor = 'bg-emerald-500';

                return `
                    <div class="text-[9px] px-1 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 truncate font-semibold flex items-center gap-1" title="${e.title} (${e.status})">
                        <span class="w-1.5 h-1.5 rounded-full ${dotColor} shrink-0"></span>
                        <span class="truncate">${e.title}</span>
                    </div>
                `;
            }).join('');

            const overflowCount = dayEvents.length > 2 ? `<div class="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 pl-1">+${dayEvents.length - 2} more</div>` : '';

            cellsHtml += `
                <div class="${cellClasses}" data-date="${dateStr}" title="Click to view & arrange plans for ${dateStr}">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="font-extrabold text-xs ${isToday ? 'text-indigo-600 dark:text-indigo-400 underline decoration-2' : (isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200')}">
                                ${day}
                            </span>
                            ${badgeHtml}
                        </div>
                        ${dayTotal > 0 ? `
                            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                                <div class="bg-gradient-to-r from-indigo-500 to-emerald-500 h-1 rounded-full" style="width: ${dayPercent}%"></div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="space-y-0.5 overflow-hidden my-auto">
                        ${itemsSnippet}
                        ${overflowCount}
                    </div>

                    <div class="text-[8px] font-semibold text-slate-400 group-hover:text-indigo-500 transition-colors flex items-center justify-between">
                        <span>${isToday ? 'Today' : ''}</span>
                        <span class="opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                    </div>
                </div>
            `;
        }

        daysGridEl.innerHTML = cellsHtml;

        // Attach Click Handlers to Day Cells
        daysGridEl.querySelectorAll('[data-date]').forEach(cell => {
            cell.addEventListener('click', () => {
                const clickedDate = cell.getAttribute('data-date');
                if (selectedDate === clickedDate) {
                    selectedDate = null; // Toggle off if clicked twice
                    CreatorAI.toast('Showing all dates', 'info', 1500);
                } else {
                    selectedDate = clickedDate;
                    CreatorAI.toast(`Selected date: ${formatDateNice(selectedDate)}`, 'info', 1500);
                }
                updateAllUI();
            });
        });
    }

    // ----------------------------------------------------
    // Update Focus Banner & Day Progress
    // ----------------------------------------------------
    function updateFocusBanner() {
        const events = getStoredEvents();

        if (selectedDate) {
            const dayEvents = events.filter(e => e.date === selectedDate);
            const total = dayEvents.length;
            const completed = dayEvents.filter(e => e.status === 'Completed').length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            if (focusTitleEl) focusTitleEl.textContent = formatDateNice(selectedDate);
            if (focusSubtitleEl) focusSubtitleEl.textContent = `${total} plan${total === 1 ? '' : 's'} scheduled • ${completed} completed`;
            if (dayProgressLabelEl) dayProgressLabelEl.textContent = `${percent}% (${completed}/${total} done)`;
            if (dayProgressBarEl) dayProgressBarEl.style.width = `${percent}%`;

            if (clearDateFilterBtn) clearDateFilterBtn.classList.remove('hidden');
            if (quickAddDateBtn) {
                quickAddDateBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i> Plan on ${selectedDate.split('-').slice(1).join('/')}`;
            }
        } else {
            const total = events.length;
            const completed = events.filter(e => e.status === 'Completed').length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            if (focusTitleEl) focusTitleEl.textContent = 'All Scheduled Plans';
            if (focusSubtitleEl) focusSubtitleEl.textContent = `Viewing ${total} plan${total === 1 ? '' : 's'} across all dates`;
            if (dayProgressLabelEl) dayProgressLabelEl.textContent = `${percent}% Overall Done`;
            if (dayProgressBarEl) dayProgressBarEl.style.width = `${percent}%`;

            if (clearDateFilterBtn) clearDateFilterBtn.classList.add('hidden');
            if (quickAddDateBtn) {
                quickAddDateBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i> Plan New Post`;
            }
        }

        if (window.lucide) lucide.createIcons();
    }

    // ----------------------------------------------------
    // Render Queue / Arranged Plans List
    // ----------------------------------------------------
    function renderQueue() {
        if (!itemsListEl) return;
        const allEvents = getStoredEvents();

        // 1. Filter by Selected Date
        let filtered = allEvents;
        if (selectedDate) {
            filtered = filtered.filter(e => e.date === selectedDate);
        }

        // 2. Filter by Platform
        if (activePlatformFilter !== 'all') {
            filtered = filtered.filter(e => e.platform.toLowerCase() === activePlatformFilter.toLowerCase());
        }

        // 3. Filter by Status
        if (activeStatusFilter !== 'all') {
            filtered = filtered.filter(e => e.status === activeStatusFilter);
        }

        // 4. Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                (e.title && e.title.toLowerCase().includes(q)) ||
                (e.notes && e.notes.toLowerCase().includes(q))
            );
        }

        // Sort by Date ascending
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (filtered.length === 0) {
            itemsListEl.classList.add('hidden');
            if (emptyStateEl) emptyStateEl.classList.remove('hidden');
            return;
        }

        if (emptyStateEl) emptyStateEl.classList.add('hidden');
        itemsListEl.classList.remove('hidden');

        const platformConfig = {
            instagram: { color: 'bg-pink-500/10 text-pink-500 border-pink-500/20', icon: 'camera' },
            linkedin: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'briefcase' },
            twitter: { color: 'bg-sky-500/10 text-sky-500 border-sky-500/20', icon: 'twitter' },
            youtube: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: 'video' },
            blog: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: 'file-text' }
        };

        const statusBadges = {
            'Planned': { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: '💡 Planned', next: 'In Progress' },
            'In Progress': { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: '⏳ In Progress', next: 'Completed' },
            'Completed': { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: '✅ Completed', next: 'Planned' }
        };

        const priorityBadges = {
            'High': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
            'Medium': 'text-slate-500 bg-slate-500/10 border-slate-500/20',
            'Low': 'text-slate-400 bg-slate-400/10 border-slate-400/20'
        };

        itemsListEl.innerHTML = filtered.map(e => {
            const pConf = platformConfig[e.platform] || { color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: 'calendar' };
            const sConf = statusBadges[e.status] || statusBadges['Planned'];
            const priorityClass = priorityBadges[e.priority] || priorityBadges['Medium'];
            const isDone = e.status === 'Completed';

            return `
                <div class="p-4 rounded-2xl border ${isDone ? 'border-emerald-300/80 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70'} space-y-3 hover:border-indigo-500/40 transition-all shadow-xs group" data-item-id="${e.id}">
                    <!-- Top Row: Checkbox, Platform, Status, Date -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <!-- 1-Click Done Checkbox -->
                            <button class="toggle-done-btn w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'}" data-id="${e.id}" title="${isDone ? 'Mark as In Progress' : 'Mark as Completed'}">
                                ${isDone ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                            </button>

                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${pConf.color}">
                                ${e.platform}
                            </span>

                            <!-- Status Pill (Click to cycle status) -->
                            <button class="cycle-status-btn text-[10px] font-bold px-2 py-0.5 rounded-full border ${sConf.bg} hover:opacity-85 transition-opacity" data-id="${e.id}" title="Click to cycle status (Next: ${sConf.next})">
                                ${sConf.label}
                            </button>
                        </div>

                        <div class="flex items-center gap-2">
                            ${e.priority === 'High' ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded border ${priorityClass}">HIGH</span>` : ''}
                            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3 h-3"></i> ${e.date}
                            </span>
                        </div>
                    </div>

                    <!-- Middle Row: Title & Progress Bar -->
                    <div>
                        <h4 class="text-sm font-extrabold ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'} leading-snug">
                            ${e.title}
                        </h4>

                        <!-- Progress indicator line -->
                        <div class="flex items-center gap-2 mt-2">
                            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div class="${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-amber-500'} h-1.5 rounded-full transition-all duration-300" style="width: ${e.progress}%"></div>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400">${e.progress}% done</span>
                        </div>
                    </div>

                    <!-- Progress Notes Section -->
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <div class="flex items-center justify-between text-slate-400 font-semibold mb-1">
                            <span class="flex items-center gap-1"><i data-lucide="activity" class="w-3 h-3 text-indigo-500"></i> Work Done / Progress Notes:</span>
                            <button class="edit-notes-btn text-indigo-500 hover:text-indigo-400 font-bold" data-id="${e.id}">✏️ Update</button>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 italic font-normal">${e.notes || 'No progress recorded yet. Click Update to log what you accomplished.'}</p>
                    </div>

                    <!-- Bottom Actions Row -->
                    <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div class="flex items-center gap-2">
                            <!-- Direct AI studio link -->
                            <a href="${e.platform === 'instagram' || e.platform === 'linkedin' || e.platform === 'twitter' ? `/caption-generator?topic=${encodeURIComponent(e.title)}` : `/ai-writer?topic=${encodeURIComponent(e.title)}`}" class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                <i data-lucide="sparkles" class="w-3 h-3"></i> Draft with AI
                            </a>

                            <!-- Quick Reschedule button -->
                            <button class="quick-reschedule-btn text-[11px] font-semibold text-slate-400 hover:text-slate-200" data-id="${e.id}" title="Change publication date">
                                📅 Reschedule
                            </button>
                        </div>

                        <div class="flex items-center gap-1">
                            <button class="edit-calendar-item text-slate-400 hover:text-indigo-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" data-id="${e.id}" title="Edit plan details">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button class="delete-calendar-item text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" data-id="${e.id}" title="Delete plan">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
        attachCardListeners();
    }

    // ----------------------------------------------------
    // Attach Event Listeners to Plan Cards
    // ----------------------------------------------------
    function attachCardListeners() {
        const events = getStoredEvents();

        // 1-Click Checkbox Toggle
        document.querySelectorAll('.toggle-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const target = events.find(e => e.id === id);
                if (!target) return;

                if (target.status === 'Completed') {
                    target.status = 'In Progress';
                    target.progress = 50;
                    CreatorAI.toast('Marked as In Progress (50%)', 'info', 1500);
                } else {
                    target.status = 'Completed';
                    target.progress = 100;
                    CreatorAI.toast(`🎉 Marked "${target.title}" as Completed!`, 'success', 2000);
                }
                saveEvents(events);
            });
        });

        // 1-Click Cycle Status
        document.querySelectorAll('.cycle-status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const target = events.find(e => e.id === id);
                if (!target) return;

                if (target.status === 'Planned') {
                    target.status = 'In Progress';
                    target.progress = 50;
                    CreatorAI.toast('Status: In Progress (50%)', 'info', 1500);
                } else if (target.status === 'In Progress') {
                    target.status = 'Completed';
                    target.progress = 100;
                    CreatorAI.toast('Status: Completed & Published! (100%)', 'success', 1500);
                } else {
                    target.status = 'Planned';
                    target.progress = 0;
                    CreatorAI.toast('Status: Reset to Planned Idea', 'info', 1500);
                }
                saveEvents(events);
            });
        });

        // Edit Notes Button
        document.querySelectorAll('.edit-notes-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openEditModal(id);
            });
        });

        // Edit Button
        document.querySelectorAll('.edit-calendar-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openEditModal(id);
            });
        });

        // Quick Reschedule
        document.querySelectorAll('.quick-reschedule-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const target = events.find(e => e.id === id);
                if (!target) return;

                const newDate = prompt('Enter new publication date (YYYY-MM-DD):', target.date);
                if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
                    target.date = newDate.trim();
                    saveEvents(events);
                    CreatorAI.toast(`Rescheduled to ${formatDateNice(target.date)}`, 'success');
                } else if (newDate) {
                    CreatorAI.toast('Invalid date format. Use YYYY-MM-DD', 'warning');
                }
            });
        });

        // Delete Button
        document.querySelectorAll('.delete-calendar-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const remaining = getStoredEvents().filter(e => e.id !== id);
                saveEvents(remaining);
                CreatorAI.toast('Post removed from calendar', 'info', 1500);
            });
        });
    }

    // ----------------------------------------------------
    // Open Edit Modal
    // ----------------------------------------------------
    function openEditModal(id) {
        const events = getStoredEvents();
        const target = events.find(e => e.id === id);
        if (!target) return;

        if (editIdInput) editIdInput.value = target.id;
        if (editTitleInput) editTitleInput.value = target.title;
        if (editPlatformSelect) editPlatformSelect.value = target.platform;
        if (editDateInput) editDateInput.value = target.date;
        if (editStatusSelect) editStatusSelect.value = target.status;
        if (editPrioritySelect) editPrioritySelect.value = target.priority || 'Medium';
        if (editProgressInput) {
            editProgressInput.value = target.progress;
            if (editProgressNumEl) editProgressNumEl.textContent = `${target.progress}%`;
        }
        if (editNotesInput) editNotesInput.value = target.notes || '';

        CreatorAI.openModal('edit-plan-modal');
    }

    // Edit progress slider change listener
    if (editProgressInput && editProgressNumEl) {
        editProgressInput.addEventListener('input', () => {
            const val = editProgressInput.value;
            editProgressNumEl.textContent = `${val}%`;

            // Auto-sync status dropdown
            if (editStatusSelect) {
                if (parseInt(val) === 100) editStatusSelect.value = 'Completed';
                else if (parseInt(val) > 0) editStatusSelect.value = 'In Progress';
                else editStatusSelect.value = 'Planned';
            }
        });
    }

    if (editStatusSelect && editProgressInput && editProgressNumEl) {
        editStatusSelect.addEventListener('change', () => {
            if (editStatusSelect.value === 'Completed') {
                editProgressInput.value = 100;
                editProgressNumEl.textContent = '100%';
            } else if (editStatusSelect.value === 'In Progress' && parseInt(editProgressInput.value) === 0) {
                editProgressInput.value = 50;
                editProgressNumEl.textContent = '50%';
            } else if (editStatusSelect.value === 'Planned') {
                editProgressInput.value = 0;
                editProgressNumEl.textContent = '0%';
            }
        });
    }

    // ----------------------------------------------------
    // Master Update Routine
    // ----------------------------------------------------
    function updateAllUI() {
        updateMetrics();
        renderCalendar();
        updateFocusBanner();
        renderQueue();
    }

    // ----------------------------------------------------
    // Filter & Search Listeners
    // ----------------------------------------------------
    if (filterSearchInput) {
        filterSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderQueue();
        });
    }

    if (filterStatusSelect) {
        filterStatusSelect.addEventListener('change', (e) => {
            activeStatusFilter = e.target.value;
            renderQueue();
        });
    }

    platformFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            platformFilterBtns.forEach(b => {
                b.classList.remove('bg-indigo-500', 'text-white', 'font-bold');
                b.classList.add('text-slate-500', 'dark:text-slate-400', 'font-semibold');
            });
            btn.classList.add('bg-indigo-500', 'text-white', 'font-bold');
            btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-semibold');

            activePlatformFilter = btn.getAttribute('data-platform');
            renderQueue();
        });
    });

    if (clearDateFilterBtn) {
        clearDateFilterBtn.addEventListener('click', () => {
            selectedDate = null;
            updateAllUI();
            CreatorAI.toast('Showing all dates', 'info', 1500);
        });
    }

    // ----------------------------------------------------
    // New Plan Modal Triggers
    // ----------------------------------------------------
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            if (planDateInput) {
                planDateInput.value = selectedDate || new Date().toISOString().split('T')[0];
            }
            CreatorAI.openModal('plan-post-modal');
        });
    }

    if (quickAddDateBtn) {
        quickAddDateBtn.addEventListener('click', () => {
            if (planDateInput) {
                planDateInput.value = selectedDate || new Date().toISOString().split('T')[0];
            }
            CreatorAI.openModal('plan-post-modal');
        });
    }

    // ----------------------------------------------------
    // Save New Plan Form Submit
    // ----------------------------------------------------
    if (planForm) {
        planForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = planTitleInput.value.trim();
            const platform = planPlatformSelect.value;
            const date = planDateInput.value;
            const status = planStatusSelect.value;
            const priority = planPrioritySelect ? planPrioritySelect.value : 'Medium';
            const notes = planNotesInput.value.trim();

            if (!title || !date) {
                CreatorAI.toast('Please provide a title and target date.', 'warning');
                return;
            }

            let progress = status === 'Completed' ? 100 : (status === 'In Progress' ? 50 : 0);

            const events = getStoredEvents();
            events.push({
                id: `event-${Date.now()}`,
                title,
                platform,
                date,
                status,
                progress,
                priority,
                notes
            });

            // Focus on this date so user sees their new post immediately!
            selectedDate = date;
            saveEvents(events);

            planForm.reset();
            CreatorAI.closeModal('plan-post-modal');
            CreatorAI.toast(`Scheduled "${title}" on ${formatDateNice(date)}!`, 'success');
        });
    }

    // ----------------------------------------------------
    // Save Edit Form Submit
    // ----------------------------------------------------
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = editIdInput.value;
            const title = editTitleInput.value.trim();
            const platform = editPlatformSelect.value;
            const date = editDateInput.value;
            const status = editStatusSelect.value;
            const priority = editPrioritySelect.value;
            const progress = parseInt(editProgressInput.value) || 0;
            const notes = editNotesInput.value.trim();

            if (!title || !date) {
                CreatorAI.toast('Please provide a title and target date.', 'warning');
                return;
            }

            const events = getStoredEvents();
            const targetIndex = events.findIndex(ev => ev.id === id);
            if (targetIndex !== -1) {
                events[targetIndex] = {
                    ...events[targetIndex],
                    title,
                    platform,
                    date,
                    status,
                    priority,
                    progress,
                    notes
                };
                saveEvents(events);
                CreatorAI.closeModal('edit-plan-modal');
                CreatorAI.toast('Plan & progress updated successfully!', 'success');
            }
        });
    }

    // ----------------------------------------------------
    // Month Navigation
    // ----------------------------------------------------
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentDate = new Date();
            selectedDate = new Date().toISOString().split('T')[0];
            updateAllUI();
        });
    }

    // Initial render
    updateAllUI();
});
