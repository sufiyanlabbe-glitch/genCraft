/**
 * CreatorAI – Dashboard Page Logic
 * Loads statistics and recent creations dynamically from REST endpoints.
 */
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadRecentCreations();
});

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) return;
        const data = await res.json();

        // Update Stat Counters
        const totalCreationsEl = document.getElementById('stat-total-creations');
        const totalFavoritesEl = document.getElementById('stat-total-favorites');
        const totalActivitiesEl = document.getElementById('stat-total-activities');

        if (totalCreationsEl) totalCreationsEl.textContent = data.total_creations || '0';
        if (totalFavoritesEl) totalFavoritesEl.textContent = data.total_favorites || '0';
        if (totalActivitiesEl) totalActivitiesEl.textContent = data.total_activities || '0';

        // Update Breakdown
        if (data.tool_breakdown) {
            const tb = data.tool_breakdown;
            const updateCount = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val || '0';
            };
            updateCount('tool-count-writer', tb.text_generator);
            updateCount('tool-count-summarizer', tb.summarizer);
            updateCount('tool-count-caption', tb.caption_generator);
            updateCount('tool-count-rewriter', tb.rewriter);
            updateCount('tool-count-image', tb.image_generator);
        }
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

async function loadRecentCreations() {
    const listContainer = document.getElementById('recent-creations-list');
    const emptyState = document.getElementById('recent-empty-state');
    const loadingState = document.getElementById('recent-loading-state');

    if (!listContainer) return;

    try {
        const res = await fetch('/api/dashboard/recent');
        if (loadingState) loadingState.classList.add('hidden');

        if (!res.ok) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        const data = await res.json();
        const items = data.recent || [];

        if (items.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            listContainer.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        listContainer.classList.remove('hidden');

        const toolBadges = {
            text_generator: { label: 'AI Writer', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
            summarizer: { label: 'Summarizer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            caption_generator: { label: 'Captions', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            rewriter: { label: 'Rewriter', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            image_generator: { label: 'Image', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' }
        };

        listContainer.innerHTML = items.map(item => {
            const badge = toolBadges[item.tool_type] || { label: item.tool_type, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
            const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badge.color}">${badge.label}</span>
                            <span class="text-xs text-slate-400">${formattedDate}</span>
                        </div>
                        <h4 class="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1.5">${item.title}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${item.output_text}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                        <a href="/history?search=${encodeURIComponent(item.title)}" class="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                            View in History <i data-lucide="arrow-right" class="w-3 h-3"></i>
                        </a>
                        ${item.is_favorite ? '<i data-lucide="heart" class="w-4 h-4 fill-rose-500 text-rose-500"></i>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons({ root: listContainer });
    } catch (err) {
        if (loadingState) loadingState.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

