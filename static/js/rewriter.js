/**
 * CreatorAI – Content Rewriter Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const rewriterForm = document.getElementById('rewriter-form');
    const inputTextarea = document.getElementById('rewriter-input');
    const styleSelect = document.getElementById('rewriter-style');
    const rewriteBtn = document.getElementById('rewriter-submit-btn');

    const outputContainer = document.getElementById('rewriter-output-container');
    const outputTextarea = document.getElementById('rewriter-output-text');
    const demoBanner = document.getElementById('rewriter-demo-banner');
    const inputCountDisplay = document.getElementById('rewriter-input-count');
    const clearBtn = document.getElementById('rewriter-clear-btn');
    const wordStatDisplay = document.getElementById('rewriter-word-stat');

    const sampleInformalBtn = document.getElementById('rewriter-sample-informal');
    const sampleWordyBtn = document.getElementById('rewriter-sample-wordy');
    const useAsInputBtn = document.getElementById('rewriter-use-as-input-btn');

    const copyBtn = document.getElementById('rewriter-copy-btn');
    const saveBtn = document.getElementById('rewriter-save-btn');
    const downloadBtn = document.getElementById('rewriter-download-btn');

    // Initialize layout position swapper (Controls Left / Right)
    if (CreatorAI.initLayoutFlip) {
        CreatorAI.initLayoutFlip('rewriter-swap-layout-btn', 'rewriter-controls-col', 'rewriter-output-col', 'creatorai_rewriter_layout_flipped');
    }

    const SAMPLES = {
        informal: "Hey boss, just wanted to let you know the site was totally down this morning cause the database ran out of memory. We rebooted it and it's fine now, but we definitely gotta upgrade the server soon so it doesn't crash again during peak hours.",
        wordy: "It is incumbent upon our operational division to utilize all available organizational resources in order to facilitate a comprehensive paradigm shift towards maximum synergetic efficiency and cloud utilization methodologies across various business channels."
    };

    function updateInputStats() {
        if (!inputTextarea || !inputCountDisplay) return;
        const words = inputTextarea.value.trim().split(/\s+/).filter(Boolean).length;
        inputCountDisplay.textContent = `${words} words (${inputTextarea.value.length} chars)`;
    }

    if (inputTextarea) {
        inputTextarea.addEventListener('input', updateInputStats);
    }

    if (clearBtn && inputTextarea) {
        clearBtn.addEventListener('click', () => {
            inputTextarea.value = '';
            updateInputStats();
            inputTextarea.focus();
            CreatorAI.toast('Input cleared', 'info', 1500);
        });
    }

    if (sampleInformalBtn && inputTextarea) {
        sampleInformalBtn.addEventListener('click', () => {
            inputTextarea.value = SAMPLES.informal;
            if (styleSelect) styleSelect.value = 'professional';
            updateInputStats();
            CreatorAI.toast('Loaded informal draft (Target: Professional)', 'info', 2500);
            inputTextarea.focus();
        });
    }

    if (sampleWordyBtn && inputTextarea) {
        sampleWordyBtn.addEventListener('click', () => {
            inputTextarea.value = SAMPLES.wordy;
            if (styleSelect) styleSelect.value = 'concise';
            updateInputStats();
            CreatorAI.toast('Loaded wordy jargon (Target: Concise)', 'info', 2500);
            inputTextarea.focus();
        });
    }

    // Use output as new input (for iteration)
    if (useAsInputBtn && outputTextarea && inputTextarea) {
        useAsInputBtn.addEventListener('click', () => {
            if (!outputTextarea.value.trim()) return;
            inputTextarea.value = outputTextarea.value.trim();
            updateInputStats();
            CreatorAI.toast('Rewritten text moved to input for further refinement!', 'info', 2500);
            inputTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputTextarea.focus();
        });
    }

    if (rewriterForm) {
        rewriterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = inputTextarea.value.trim();

            if (!text) {
                CreatorAI.toast('Please enter text to rewrite.', 'warning');
                inputTextarea.focus();
                return;
            }

            const origBtnText = rewriteBtn.innerHTML;
            rewriteBtn.disabled = true;
            rewriteBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Rewriting Content...
            `;

            if (demoBanner) demoBanner.classList.add('hidden');

            try {
                const res = await fetch('/api/ai/rewrite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        style: styleSelect.value
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    CreatorAI.toast(data.error || 'Failed to rewrite text.', 'error');
                    return;
                }

                outputTextarea.value = data.output;
                outputContainer.classList.remove('hidden');

                const origWords = text.split(/\s+/).filter(Boolean).length;
                const newWords = data.output.trim().split(/\s+/).filter(Boolean).length;
                if (wordStatDisplay) {
                    wordStatDisplay.textContent = `${newWords} words (Original: ${origWords})`;
                }

                if (data.is_demo && demoBanner) {
                    demoBanner.classList.remove('hidden');
                }

                CreatorAI.toast('Text rewritten successfully!', 'success');
                outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {
                CreatorAI.toast('Network error during rewrite.', 'error');
            } finally {
                rewriteBtn.disabled = false;
                rewriteBtn.innerHTML = origBtnText;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const success = await CreatorAI.copyToClipboard(outputTextarea.value, 'Rewritten text copied!');
            if (success) {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-500"></i>';
                if (window.lucide) lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = orig;
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            CreatorAI.downloadTxt('creatorai-rewritten', outputTextarea.value);
        });
    }

    // Feedback Buttons (Helpful vs Try Again)
    const feedbackGoodBtn = document.getElementById('rewriter-feedback-good');
    const feedbackBadBtn = document.getElementById('rewriter-feedback-bad');

    if (feedbackGoodBtn) {
        feedbackGoodBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('rewriter', 'helpful', {
                style: styleSelect ? styleSelect.value : 'clearer',
                input_length: (inputTextarea.value || '').length
            });
            feedbackGoodBtn.classList.add('bg-emerald-500/20', 'text-emerald-500', 'font-bold');
        });
    }

    if (feedbackBadBtn) {
        feedbackBadBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('rewriter', 'try_again', {
                style: styleSelect ? styleSelect.value : 'clearer',
                input_length: (inputTextarea.value || '').length
            });
            feedbackBadBtn.classList.add('bg-rose-500/20', 'text-rose-500', 'font-bold');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = `Rewrite (${styleSelect.value}): ${inputTextarea.value.slice(0, 30)}...`;
            CreatorAI.openSaveModal('rewriter', inputTextarea.value, outputTextarea.value, title);
        });
    }
});

