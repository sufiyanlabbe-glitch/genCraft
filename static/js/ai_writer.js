/**
 * CreatorAI – AI Text Generator Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('writer-form');
    const topicInput = document.getElementById('writer-topic');
    const contentTypeSelect = document.getElementById('writer-content-type');
    const toneSelect = document.getElementById('writer-tone');
    const languageSelect = document.getElementById('writer-language');
    const wordCountInput = document.getElementById('writer-word-count');
    const wordCountDisplay = document.getElementById('word-count-display');

    const generateBtn = document.getElementById('writer-generate-btn');
    const outputContainer = document.getElementById('writer-output-container');
    const outputTextarea = document.getElementById('writer-output-text');
    const demoBanner = document.getElementById('writer-demo-banner');
    const wordStats = document.getElementById('writer-word-stats');

    const inputCounter = document.getElementById('writer-input-counter');
    const clearInputBtn = document.getElementById('writer-clear-input-btn');
    const readTimeDisplay = document.getElementById('writer-read-time');

    const copyBtn = document.getElementById('writer-copy-btn');
    const saveBtn = document.getElementById('writer-save-btn');
    const regenerateBtn = document.getElementById('writer-regenerate-btn');

    // Export Dropdown
    const exportToggle = document.getElementById('writer-export-toggle');
    const exportMenu = document.getElementById('writer-export-menu');
    const downloadTxtBtn = document.getElementById('writer-download-txt-btn');
    const downloadMdBtn = document.getElementById('writer-download-md-btn');
    const downloadHtmlBtn = document.getElementById('writer-download-html-btn');

    // Brand Voice, Keywords, Model, and Feedback references
    const bvCheckbox = document.getElementById('writer-use-bv');
    const bvBadge = document.getElementById('writer-bv-name-badge');
    const keywordsInput = document.getElementById('writer-keywords');
    const modelSelect = document.getElementById('writer-model');
    const feedbackGoodBtn = document.getElementById('writer-feedback-good');
    const feedbackBadBtn = document.getElementById('writer-feedback-bad');

    // Initialize layout position swapper (Controls Left / Right)
    if (CreatorAI.initLayoutFlip) {
        CreatorAI.initLayoutFlip('writer-swap-layout-btn', 'writer-controls-col', 'writer-output-col', 'creatorai_writer_layout_flipped');
    }

    let lastGeneratedData = null;

    // Check and display Brand Voice
    function checkBrandVoice() {
        const bv = CreatorAI.getBrandVoice ? CreatorAI.getBrandVoice() : JSON.parse(localStorage.getItem('creatorai_brand_voice') || 'null');
        if (bv && bv.brand_name) {
            if (bvBadge) {
                bvBadge.innerHTML = `<span class="text-emerald-500 font-bold">●</span> ${bv.brand_name}`;
            }
            if (bvCheckbox) bvCheckbox.checked = true;
        } else {
            if (bvBadge) {
                bvBadge.innerHTML = `<a href="/settings" class="underline text-indigo-400 hover:text-indigo-300">Set in Settings</a>`;
            }
            if (bvCheckbox) bvCheckbox.checked = false;
        }
    }
    checkBrandVoice();

    if (bvCheckbox) {
        bvCheckbox.addEventListener('change', () => {
            const bv = CreatorAI.getBrandVoice ? CreatorAI.getBrandVoice() : JSON.parse(localStorage.getItem('creatorai_brand_voice') || 'null');
            if (bvCheckbox.checked && (!bv || !bv.brand_name)) {
                CreatorAI.toast('No brand voice found! Please configure it in Settings first.', 'info', 4000);
            }
        });
    }

    // Word count slider live display
    if (wordCountInput && wordCountDisplay) {
        wordCountInput.addEventListener('input', () => {
            wordCountDisplay.textContent = `${wordCountInput.value} words`;
        });
    }

    // Input counter
    if (topicInput && inputCounter) {
        topicInput.addEventListener('input', () => {
            inputCounter.textContent = `${topicInput.value.length} chars`;
        });
    }

    // Clear input button
    if (clearInputBtn && topicInput) {
        clearInputBtn.addEventListener('click', () => {
            topicInput.value = '';
            if (inputCounter) inputCounter.textContent = '0 chars';
            topicInput.focus();
            CreatorAI.toast('Prompt cleared', 'info', 2000);
        });
    }

    // Check URL query parameters (e.g. from Content Calendar deep-link)
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get('topic');
    if (topicParam && topicInput) {
        topicInput.value = topicParam;
        if (inputCounter) inputCounter.textContent = `${topicParam.length} chars`;
        CreatorAI.toast(`Loaded plan from Calendar: "${topicParam}"`, 'info', 3000);
    }

    // Template chips starter
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const topic = chip.getAttribute('data-topic');
            const type = chip.getAttribute('data-type');
            const tone = chip.getAttribute('data-tone');
            const words = chip.getAttribute('data-words');

            if (topic && topicInput) {
                topicInput.value = topic;
                if (inputCounter) inputCounter.textContent = `${topic.length} chars`;
            }
            if (type && contentTypeSelect) contentTypeSelect.value = type;
            if (tone && toneSelect) toneSelect.value = tone;
            if (words && wordCountInput) {
                wordCountInput.value = words;
                if (wordCountDisplay) wordCountDisplay.textContent = `${words} words`;
            }
            CreatorAI.toast('Template loaded! Click Generate to create.', 'info', 3000);
            topicInput.focus();
        });
    });

    // Update Output Stats and Reading Time
    function updateOutputMetrics(text) {
        const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
        if (wordStats) wordStats.textContent = `${words} words`;
        if (readTimeDisplay) {
            const minutes = Math.max(1, Math.round(words / 200));
            readTimeDisplay.textContent = `~${minutes} min read`;
        }
    }

    // Real-time metric update when user edits output
    if (outputTextarea) {
        outputTextarea.addEventListener('input', () => {
            updateOutputMetrics(outputTextarea.value);
        });
    }

    // Export Menu Toggle
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

    function getSlug() {
        return (topicInput.value.trim() || 'ai-content')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 30);
    }

    // Downloads
    if (downloadTxtBtn) {
        downloadTxtBtn.addEventListener('click', () => {
            CreatorAI.downloadTxt(`creatorai-${getSlug()}`, outputTextarea.value);
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    if (downloadMdBtn) {
        downloadMdBtn.addEventListener('click', () => {
            CreatorAI.downloadMd(`creatorai-${getSlug()}`, outputTextarea.value);
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', () => {
            const title = topicInput.value.trim() || 'CreatorAI Article';
            CreatorAI.downloadHtml(`creatorai-${getSlug()}`, outputTextarea.value, title);
            if (exportMenu) exportMenu.classList.add('hidden');
        });
    }

    // Generate Action
    async function handleGenerate() {
        const topic = topicInput.value.trim();
        if (!topic) {
            CreatorAI.toast('Please enter a topic or prompt to generate content.', 'warning');
            topicInput.focus();
            return;
        }

        const origBtnText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Generating Content...
        `;

        if (demoBanner) demoBanner.classList.add('hidden');

        // Prepare Brand Voice payload if active
        let brandVoicePayload = null;
        if (bvCheckbox && bvCheckbox.checked) {
            const bv = CreatorAI.getBrandVoice ? CreatorAI.getBrandVoice() : JSON.parse(localStorage.getItem('creatorai_brand_voice') || 'null');
            if (bv && bv.brand_name) {
                brandVoicePayload = bv;
            }
        }

        try {
            const res = await fetch('/api/ai/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    content_type: contentTypeSelect.value,
                    tone: toneSelect.value,
                    language: languageSelect.value,
                    word_count: parseInt(wordCountInput.value, 10),
                    keywords: keywordsInput ? keywordsInput.value.trim() : '',
                    model: modelSelect ? modelSelect.value : 'gemini-3.5-flash',
                    brand_voice: brandVoicePayload
                })
            });

            const data = await res.json();

            if (!res.ok) {
                CreatorAI.toast(data.error || 'Failed to generate text.', 'error');
                return;
            }

            lastGeneratedData = {
                topic,
                content_type: contentTypeSelect.value,
                output: data.output
            };

            // Display output
            outputTextarea.value = data.output;
            outputContainer.classList.remove('hidden');
            updateOutputMetrics(data.output);

            // Check if demo response
            if (data.is_demo && demoBanner) {
                demoBanner.classList.remove('hidden');
            }

            CreatorAI.toast('Content generated successfully!', 'success');
            outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (err) {
            CreatorAI.toast('Network error during AI generation. Check your server.', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = origBtnText;
            if (window.lucide) lucide.createIcons();
        }
    }

    if (generateForm) {
        generateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleGenerate();
        });
    }

    // Feedback Buttons (Helpful vs Try Again)
    if (feedbackGoodBtn) {
        feedbackGoodBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('text_generator', 'helpful', {
                topic: topicInput.value,
                content_type: contentTypeSelect.value
            });
            feedbackGoodBtn.classList.add('bg-emerald-500/20', 'text-emerald-500', 'font-bold');
        });
    }

    if (feedbackBadBtn) {
        feedbackBadBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('text_generator', 'try_again', {
                topic: topicInput.value,
                content_type: contentTypeSelect.value
            });
            feedbackBadBtn.classList.add('bg-rose-500/20', 'text-rose-500', 'font-bold');
        });
    }

    // Regenerate
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            handleGenerate();
        });
    }

    // Copy Action with visual feedback
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const success = await CreatorAI.copyToClipboard(outputTextarea.value, 'Generated content copied!');
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

    // Save Action
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = `${contentTypeSelect.options[contentTypeSelect.selectedIndex].text}: ${topicInput.value.slice(0, 40)}`;
            CreatorAI.openSaveModal('text_generator', topicInput.value, outputTextarea.value, title);
        });
    }
});

