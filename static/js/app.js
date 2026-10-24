/**
 * CreatorAI – Core Client Application Utilities
 * Provides: Toast notifications, Theme toggle, Modal management, Clipboard, and File downloads.
 */

// Global App Object
window.CreatorAI = {
    // Theme Management
    initTheme() {
        const savedTheme = localStorage.getItem('creatorai_theme') || 'dark';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        this.updateThemeIcons();
    },

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('creatorai_theme', isDark ? 'dark' : 'light');
        this.updateThemeIcons();
        this.toast(`Switched to ${isDark ? 'Dark' : 'Light'} mode`, 'info');
    },

    updateThemeIcons() {
        const isDark = document.documentElement.classList.contains('dark');
        document.querySelectorAll('.theme-toggle-icon-sun').forEach(el => {
            el.classList.toggle('hidden', !isDark);
        });
        document.querySelectorAll('.theme-toggle-icon-moon').forEach(el => {
            el.classList.toggle('hidden', isDark);
        });
    },

    // Toast Notification System
    toast(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl text-sm font-medium border backdrop-blur-md transition-all duration-300';

        // Style configurations
        const styles = {
            success: 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-200',
            error: 'bg-rose-950/90 text-rose-200 border-rose-800/80 dark:bg-rose-950/90 dark:text-rose-200',
            info: 'bg-slate-900/95 text-slate-100 border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-100',
            warning: 'bg-amber-950/90 text-amber-200 border-amber-800/80 dark:bg-amber-950/90 dark:text-amber-200'
        };

        const icons = {
            success: '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400 shrink-0"></i>',
            error: '<i data-lucide="alert-circle" class="w-5 h-5 text-rose-400 shrink-0"></i>',
            info: '<i data-lucide="info" class="w-5 h-5 text-indigo-400 shrink-0"></i>',
            warning: '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 shrink-0"></i>'
        };

        toast.classList.add(...(styles[type] || styles.info).split(' '));
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <div class="flex-1 leading-snug">${message}</div>
            <button class="text-slate-400 hover:text-white transition-colors" onclick="this.parentElement.remove()">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(toast);
        if (window.lucide) {
            lucide.createIcons({ root: toast });
        }

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    },

    // Copy to Clipboard
    async copyToClipboard(text, successMsg = 'Copied to clipboard!') {
        if (!text) {
            this.toast('Nothing to copy.', 'warning');
            return false;
        }
        try {
            await navigator.clipboard.writeText(text);
            this.toast(successMsg, 'success');
            return true;
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.toast(successMsg, 'success');
                return true;
            } catch (fallbackErr) {
                document.body.removeChild(textarea);
                this.toast('Failed to copy to clipboard.', 'error');
                return false;
            }
        }
    },

    // Download as TXT file
    downloadTxt(filename, text) {
        if (!text) {
            this.toast('Nothing to download.', 'warning');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast(`Downloaded ${a.download}`, 'success');
    },

    // Download as Markdown (.md)
    downloadMd(filename, text) {
        if (!text) {
            this.toast('Nothing to download.', 'warning');
            return;
        }
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast(`Downloaded ${a.download}`, 'success');
    },

    // Download as HTML (.html)
    downloadHtml(filename, text, title = 'CreatorAI Document') {
        if (!text) {
            this.toast('Nothing to download.', 'warning');
            return;
        }
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
  h1, h2, h3 { color: #0f172a; }
  pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
  footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
<footer>Generated by CreatorAI Studio</footer>
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast(`Downloaded ${a.download}`, 'success');
    },

    // Modal Manager
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
        }
    },

    // Global Save Creation Modal Helper
    openSaveModal(toolType, inputText, outputText, defaultTitle = '') {
        const modal = document.getElementById('save-creation-modal');
        if (!modal) return;

        document.getElementById('save-modal-title').value = defaultTitle || `Creation - ${new Date().toLocaleDateString()}`;
        document.getElementById('save-modal-tool').value = toolType;
        document.getElementById('save-modal-input').value = inputText;
        document.getElementById('save-modal-output').value = outputText;
        document.getElementById('save-modal-fav').checked = false;

        this.openModal('save-creation-modal');
    },

    async submitSaveCreation() {
        const title = document.getElementById('save-modal-title').value.trim();
        const tool_type = document.getElementById('save-modal-tool').value;
        const input_text = document.getElementById('save-modal-input').value;
        const output_text = document.getElementById('save-modal-output').value;
        const is_favorite = document.getElementById('save-modal-fav').checked;

        if (!output_text) {
            this.toast('No content available to save.', 'warning');
            return;
        }

        const saveBtn = document.getElementById('save-modal-btn');
        const origText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Saving...';

        try {
            const res = await fetch('/api/contents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title || 'Untitled Creation',
                    tool_type,
                    input_text,
                    output_text,
                    is_favorite
                })
            });
            const data = await res.json();
            if (res.ok) {
                this.toast('Project saved to your History!', 'success');
                this.closeModal('save-creation-modal');
            } else {
                this.toast(data.error || 'Failed to save content.', 'error');
            }
        } catch (err) {
            this.toast('Network error while saving. Please try again.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = origText;
        }
    },

    // Brand Voice Management
    getBrandVoice() {
        try {
            const raw = localStorage.getItem('creatorai_brand_voice');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    saveBrandVoice(voiceObj) {
        localStorage.setItem('creatorai_brand_voice', JSON.stringify(voiceObj));
    },

    // AI Feedback Collector
    async submitFeedback(toolType, rating, metadata = {}) {
        try {
            const res = await fetch('/api/ai/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool_type: toolType,
                    rating: rating,
                    metadata: metadata
                })
            });
            if (res.ok) {
                if (rating === 'helpful') {
                    this.toast('Thank you! Glad this was helpful 👍', 'success');
                } else {
                    this.toast('Feedback noted. We will adjust tone and variations 💡', 'info');
                }
                return true;
            }
        } catch (err) {
            console.warn('Feedback submit error:', err);
        }
        return false;
    },

    // Interactive Layout Position Swapper (Controls Left / Right)
    initLayoutFlip(btnId, controlsId, outputId, storageKey = 'creatorai_layout_flipped') {
        const btn = document.getElementById(btnId);
        const controls = document.getElementById(controlsId);
        const output = document.getElementById(outputId);
        if (!controls || !output) return;

        function applyFlipped(isFlipped) {
            if (isFlipped) {
                controls.classList.remove('lg:order-1');
                controls.classList.add('lg:order-2');
                output.classList.remove('lg:order-2');
                output.classList.add('lg:order-1');
                if (btn) {
                    btn.innerHTML = '<i data-lucide="columns-2" class="w-3.5 h-3.5 text-indigo-500"></i><span>Layout: Controls Right</span>';
                }
            } else {
                controls.classList.remove('lg:order-2');
                controls.classList.add('lg:order-1');
                output.classList.remove('lg:order-1');
                output.classList.add('lg:order-2');
                if (btn) {
                    btn.innerHTML = '<i data-lucide="columns-2" class="w-3.5 h-3.5 text-indigo-500"></i><span>Layout: Controls Left</span>';
                }
            }
            if (window.lucide) lucide.createIcons({ root: btn });
        }

        const saved = localStorage.getItem(storageKey) === 'true';
        applyFlipped(saved);

        if (btn) {
            btn.addEventListener('click', () => {
                const current = localStorage.getItem(storageKey) === 'true';
                const next = !current;
                localStorage.setItem(storageKey, String(next));
                applyFlipped(next);
                CreatorAI.toast(next ? 'Layout shifted: Controls moved to Right' : 'Layout shifted: Controls moved to Left', 'info', 2000);
            });
        }
    },

    // Logout
    async logout() {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) {
                this.toast('Logged out successfully.', 'info');
                setTimeout(() => { window.location.href = '/login'; }, 500);
            }
        } catch (err) {
            window.location.href = '/login';
        }
    }
};

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    CreatorAI.initTheme();
    if (window.lucide) {
        lucide.createIcons();
    }

    // Attach theme toggle buttons
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => CreatorAI.toggleTheme());
    });

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('hidden');
            }
        });
    }

    if (sidebarOverlay && sidebar) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        });
    }

    // Close modals on escape key or backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                CreatorAI.closeModal(modal.id);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => {
                CreatorAI.closeModal(modal.id);
            });
        }
    });
});

