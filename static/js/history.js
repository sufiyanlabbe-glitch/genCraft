/**
 * CreatorAI – History & Favorites Page Logic
 * Full search, filtering, favorites toggle, item preview, and deletion confirmation dialog.
 */
document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    let currentLimit = 12;
    let currentToolType = '';
    let currentFavoriteOnly = null;
    let currentSearch = '';

    // Check if query params passed from dashboard
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search')) {
        currentSearch = urlParams.get('search');
        const searchInput = document.getElementById('history-search-input');
        if (searchInput) searchInput.value = currentSearch;
    }

    if (urlParams.has('favorites')) {
        currentFavoriteOnly = true;
        const favToggle = document.getElementById('filter-favorites-only');
        if (favToggle) favToggle.checked = true;
    }

    // Element references
    const cardsGrid = document.getElementById('history-cards-grid');
    const emptyState = document.getElementById('history-empty-state');
    const loadingState = document.getElementById('history-loading-state');
    const paginationContainer = document.getElementById('history-pagination');
    const searchInput = document.getElementById('history-search-input');
    const toolFilter = document.getElementById('history-tool-filter');
    const favoritesOnlyToggle = document.getElementById('filter-favorites-only');

    // Item to delete tracker
    let pendingDeleteId = null;

    // Fetch and render
    async function loadHistory(page = 1) {
        currentPage = page;
        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (cardsGrid) cardsGrid.classList.add('hidden');

        let url = `/api/contents?page=${currentPage}&limit=${currentLimit}`;
        if (currentToolType) url += `&tool_type=${encodeURIComponent(currentToolType)}`;
        if (currentFavoriteOnly !== null) url += `&is_favorite=${currentFavoriteOnly}`;
        if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;

        try {
            const res = await fetch(url);
            if (loadingState) loadingState.classList.add('hidden');

            if (!res.ok) {
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            const data = await res.json();
            const items = data.items || [];

            if (items.length === 0) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (cardsGrid) cardsGrid.classList.add('hidden');
                if (paginationContainer) paginationContainer.classList.add('hidden');
                return;
            }

            if (emptyState) emptyState.classList.add('hidden');
            if (cardsGrid) cardsGrid.classList.remove('hidden');

            renderCards(items);
            renderPagination(data.page, data.pages, data.total);
        } catch (err) {
            if (loadingState) loadingState.classList.add('hidden');
            CreatorAI.toast('Failed to load history items.', 'error');
        }
    }

    function renderCards(items) {
        const toolBadges = {
            text_generator: { label: 'AI Writer', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
            summarizer: { label: 'Summarizer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            caption_generator: { label: 'Captions', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            rewriter: { label: 'Rewriter', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            image_generator: { label: 'Image', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' }
        };

        cardsGrid.innerHTML = items.map(item => {
            const badge = toolBadges[item.tool_type] || { label: item.tool_type, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
            const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const isFav = item.is_favorite;

            return `
                <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badge.color}">${badge.label}</span>
                            <div class="flex items-center gap-1.5">
                                <button class="fav-toggle-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors" data-id="${item.id}" data-fav="${isFav}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                                    <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}"></i>
                                </button>
                                <button class="delete-item-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors" data-id="${item.id}" data-title="${encodeURIComponent(item.title)}" title="Delete item">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2 text-base">${item.title}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4 font-mono bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">${item.output_text}</p>
                    </div>

                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>${formattedDate}</span>
                        <div class="flex items-center gap-2">
                            <button class="copy-card-btn px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-1" data-content="${encodeURIComponent(item.output_text)}">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy
                            </button>
                            <button class="view-card-btn px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 font-medium transition-colors flex items-center gap-1" data-id="${item.id}" data-title="${encodeURIComponent(item.title)}" data-content="${encodeURIComponent(item.output_text)}" data-input="${encodeURIComponent(item.input_text || '')}" data-tool="${badge.label}" data-date="${formattedDate}">
                                <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> View
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons({ root: cardsGrid });

        // Attach action listeners
        attachCardListeners();
    }

    function attachCardListeners() {
        // Favorite toggle
        document.querySelectorAll('.fav-toggle-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    const res = await fetch(`/api/contents/${id}/favorite`, { method: 'PATCH' });
                    if (res.ok) {
                        const data = await res.json();
                        CreatorAI.toast(data.is_favorite ? 'Added to favorites!' : 'Removed from favorites', 'info');
                        loadHistory(currentPage);
                    }
                } catch (err) {
                    CreatorAI.toast('Failed to update favorite status.', 'error');
                }
            });
        });

        // Copy button
        document.querySelectorAll('.copy-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = decodeURIComponent(btn.getAttribute('data-content'));
                CreatorAI.copyToClipboard(text);
            });
        });

        // View Modal
        document.querySelectorAll('.view-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = decodeURIComponent(btn.getAttribute('data-title'));
                const content = decodeURIComponent(btn.getAttribute('data-content'));
                const input = decodeURIComponent(btn.getAttribute('data-input'));
                const tool = btn.getAttribute('data-tool');
                const date = btn.getAttribute('data-date');

                document.getElementById('view-modal-title').textContent = title;
                document.getElementById('view-modal-tool').textContent = tool;
                document.getElementById('view-modal-date').textContent = date;
                document.getElementById('view-modal-content').value = content;
                document.getElementById('view-modal-input').textContent = input || '(No input prompt recorded)';

                // Download button inside modal
                document.getElementById('view-modal-download-btn').onclick = () => {
                    CreatorAI.downloadTxt(title.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), content);
                };

                // Copy button inside modal
                document.getElementById('view-modal-copy-btn').onclick = () => {
                    CreatorAI.copyToClipboard(content);
                };

                CreatorAI.openModal('view-creation-modal');
            });
        });

        // Delete confirmation
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pendingDeleteId = btn.getAttribute('data-id');
                const title = decodeURIComponent(btn.getAttribute('data-title'));
                document.getElementById('delete-modal-item-title').textContent = title;
                CreatorAI.openModal('delete-confirmation-modal');
            });
        });
    }

    // Confirm Delete button handler
    const confirmDeleteBtn = document.getElementById('confirm-delete-action-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!pendingDeleteId) return;
            const orig = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⟳</span> Deleting...';

            try {
                const res = await fetch(`/api/contents/${pendingDeleteId}`, { method: 'DELETE' });
                if (res.ok) {
                    CreatorAI.toast('Item deleted successfully.', 'info');
                    CreatorAI.closeModal('delete-confirmation-modal');
                    loadHistory(currentPage);
                } else {
                    CreatorAI.toast('Failed to delete item.', 'error');
                }
            } catch (err) {
                CreatorAI.toast('Error deleting item.', 'error');
            } finally {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = orig;
                pendingDeleteId = null;
            }
        });
    }

    function renderPagination(page, totalPages, totalItems) {
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.classList.add('hidden');
            return;
        }

        paginationContainer.classList.remove('hidden');
        paginationContainer.innerHTML = `
            <div class="text-xs text-slate-400">
                Page <span class="font-bold text-slate-200">${page}</span> of <span class="font-bold text-slate-200">${totalPages}</span> (${totalItems} total items)
            </div>
            <div class="flex items-center gap-2">
                <button id="prev-page-btn" ${page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Previous
                </button>
                <button id="next-page-btn" ${page >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next
                </button>
            </div>
        `;

        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');

        if (prevBtn && page > 1) {
            prevBtn.addEventListener('click', () => loadHistory(page - 1));
        }
        if (nextBtn && page < totalPages) {
            nextBtn.addEventListener('click', () => loadHistory(page + 1));
        }
    }

    // Search and filter listeners
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearch = searchInput.value.trim();
                loadHistory(1);
            }, 350);
        });
    }

    if (toolFilter) {
        toolFilter.addEventListener('change', () => {
            currentToolType = toolFilter.value;
            loadHistory(1);
        });
    }

    if (favoritesOnlyToggle) {
        favoritesOnlyToggle.addEventListener('change', () => {
            currentFavoriteOnly = favoritesOnlyToggle.checked ? true : null;
            loadHistory(1);
        });
    }

    // Initial load
    loadHistory(1);
});

