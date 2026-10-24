/**
 * CreatorAI – Text Summarizer Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const summarizeForm = document.getElementById('summarizer-form');
    const inputTextarea = document.getElementById('summarizer-input');
    const lengthRadios = document.getElementsByName('summary_length');
    const formatRadios = document.getElementsByName('summary_format');
    const summarizeBtn = document.getElementById('summarizer-submit-btn');

    const outputContainer = document.getElementById('summarizer-output-container');
    const outputTextarea = document.getElementById('summarizer-output-text');
    const demoBanner = document.getElementById('summarizer-demo-banner');
    const inputCountDisplay = document.getElementById('summarizer-input-counter');
    const clearBtn = document.getElementById('summarizer-clear-btn');
    const reductionStat = document.getElementById('summarizer-reduction-stat');
    const outputWordsStat = document.getElementById('summarizer-output-words');

    const sampleTechBtn = document.getElementById('summarizer-sample-tech');
    const sampleBusinessBtn = document.getElementById('summarizer-sample-business');

    const copyBtn = document.getElementById('summarizer-copy-btn');
    const saveBtn = document.getElementById('summarizer-save-btn');

    // Export dropdown
    const exportToggle = document.getElementById('summarizer-export-toggle');
    const exportMenu = document.getElementById('summarizer-export-menu');
    const downloadTxtBtn = document.getElementById('summarizer-download-txt-btn');
    const downloadMdBtn = document.getElementById('summarizer-download-md-btn');
    const downloadHtmlBtn = document.getElementById('summarizer-download-html-btn');

    // Initialize layout position swapper (Controls Left / Right)
    if (CreatorAI.initLayoutFlip) {
        CreatorAI.initLayoutFlip('summarizer-swap-layout-btn', 'summarizer-controls-col', 'summarizer-output-col', 'creatorai_summarizer_layout_flipped');
    }

    // Sample Texts
    const SAMPLES = {
        tech: `Artificial intelligence (AI) is transforming healthcare by expediting drug discovery, improving diagnostic precision, and personalizing patient treatments. Deep learning algorithms trained on millions of medical imaging scans can now detect early-stage retinal pathologies and lung nodules with accuracy comparable to senior radiologists. Furthermore, generative protein design models are reducing the exploratory timeline for novel therapeutic molecules from years down to weeks. However, significant clinical integration barriers persist, including algorithmic bias across underrepresented demographics, stringent regulatory validation across multi-center trials, and the 'black box' explainability problem which complicates physician trust and liability in critical care environments.`,
        business: `The Global Tech Solutions quarterly project roadmap outlines three strategic pillars for fiscal year 2026: cloud cost optimization, enterprise security zero-trust architecture, and customer experience automation. During the preceding two quarters, migration of legacy monolithic microservices to Kubernetes clusters yielded an operational overhead reduction of 28%. Moving forward, Phase 2 mandates consolidating third-party identity management providers into a centralized Okta single sign-on system, integrating AI-driven anomaly detection across API gateways, and implementing customer-facing self-service resolution chatbots aimed at cutting Tier-1 support ticket volume by 45% within nine months.`
    };

    function updateInputStats() {
        if (!inputTextarea || !inputCountDisplay) return;
        const words = inputTextarea.value.trim().split(/\s+/).filter(Boolean).length;
        inputCountDisplay.textContent = `${words} words (${inputTextarea.value.length} chars)`;
    }

    if (inputTextarea) {
        inputTextarea.addEventListener('input', updateInputStats);
    }

    // Load sample buttons
    if (sampleTechBtn && inputTextarea) {
        sampleTechBtn.addEventListener('click', () => {
            inputTextarea.value = SAMPLES.tech;
            updateInputStats();
            CreatorAI.toast('Loaded AI in Medicine sample article', 'info', 2500);
            inputTextarea.focus();
        });
    }

    if (sampleBusinessBtn && inputTextarea) {
        sampleBusinessBtn.addEventListener('click', () => {
            inputTextarea.value = SAMPLES.business;
            updateInputStats();
            CreatorAI.toast('Loaded Executive Report sample article', 'info', 2500);
            inputTextarea.focus();
        });
    }

    // Clear input
    if (clearBtn && inputTextarea) {
        clearBtn.addEventListener('click', () => {
            inputTextarea.value = '';
            updateInputStats();
            inputTextarea.focus();
            CreatorAI.toast('Text cleared', 'info', 1500);
        });
    }

    function getSelectedRadio(radios, defaultVal) {
        for (const radio of radios) {
            if (radio.checked) return radio.value;
        }
        return defaultVal;
    }

    function updateReductionRatio(originalText, summaryText) {
        const origWords = (originalText || '').trim().split(/\s+/).filter(Boolean).length;
        const sumWords = (summaryText || '').trim().split(/\s+/).filter(Boolean).length;
        if (outputWordsStat) outputWordsStat.textContent = `${sumWords} words`;
        if (reductionStat) {
            if (origWords > 0) {
                const pct = Math.max(0, Math.round(((origWords - sumWords) / origWords) * 100));
                reductionStat.textContent = `${pct}% Condensed`;
            } else {
                reductionStat.textContent = 'Summary Ready';
            }
        }
    }

    // Export dropdown toggle
    if (exportToggle && exportMenu) {
        exportToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            if (!exportMenu.classList.contains('hidden')) {
                exportMenu.classList.add('hidden');
            }
        });
    }

    // Export actions
    if (downloadTxtBtn) {
        downloadTxtBtn.addEventListener('click', () => {
            CreatorAI.downloadTxt('creatorai-summary', outputTextarea.value);
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    if (downloadMdBtn) {
        downloadMdBtn.addEventListener('click', () => {
            CreatorAI.downloadMd('creatorai-summary', outputTextarea.value);
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', () => {
            CreatorAI.downloadHtml('creatorai-summary', outputTextarea.value, 'Document Summary');
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    if (summarizeForm) {
        summarizeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = inputTextarea.value.trim();

            if (!text) {
                CreatorAI.toast('Please enter or paste the text you want to summarize.', 'warning');
                inputTextarea.focus();
                return;
            }

            const words = text.split(/\s+/).filter(Boolean).length;
            if (words < 10) {
                CreatorAI.toast('Text is too short to summarize (minimum 10 words required).', 'warning');
                return;
            }

            const origBtnText = summarizeBtn.innerHTML;
            summarizeBtn.disabled = true;
            summarizeBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Summarizing Text...
            `;

            if (demoBanner) demoBanner.classList.add('hidden');

            try {
                const res = await fetch('/api/ai/summarize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        length: getSelectedRadio(lengthRadios, 'medium'),
                        format_type: getSelectedRadio(formatRadios, 'bullet_points')
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    CreatorAI.toast(data.error || 'Failed to summarize text.', 'error');
                    return;
                }

                outputTextarea.value = data.output;
                outputContainer.classList.remove('hidden');
                updateReductionRatio(text, data.output);

                if (data.is_demo && demoBanner) {
                    demoBanner.classList.remove('hidden');
                }

                CreatorAI.toast('Summary generated!', 'success');
                outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {
                CreatorAI.toast('Network error during summarization.', 'error');
            } finally {
                summarizeBtn.disabled = false;
                summarizeBtn.innerHTML = origBtnText;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const success = await CreatorAI.copyToClipboard(outputTextarea.value, 'Summary copied!');
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

    // Feedback Buttons (Helpful vs Try Again)
    const feedbackGoodBtn = document.getElementById('summarizer-feedback-good');
    const feedbackBadBtn = document.getElementById('summarizer-feedback-bad');

    if (feedbackGoodBtn) {
        feedbackGoodBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('summarizer', 'helpful', {
                input_length: (inputTextarea.value || '').length,
                format_type: formatSelect ? formatSelect.value : 'bullet_points'
            });
            feedbackGoodBtn.classList.add('bg-emerald-500/20', 'text-emerald-500', 'font-bold');
        });
    }

    if (feedbackBadBtn) {
        feedbackBadBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('summarizer', 'try_again', {
                input_length: (inputTextarea.value || '').length,
                format_type: formatSelect ? formatSelect.value : 'bullet_points'
            });
            feedbackBadBtn.classList.add('bg-rose-500/20', 'text-rose-500', 'font-bold');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = `Summary: ${inputTextarea.value.slice(0, 35)}...`;
            CreatorAI.openSaveModal('summarizer', inputTextarea.value, outputTextarea.value, title);
        });
    }
});

