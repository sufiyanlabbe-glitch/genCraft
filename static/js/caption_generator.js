/**
 * CreatorAI – Social Media Caption Generator Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const captionForm = document.getElementById('caption-form');
    const descriptionInput = document.getElementById('caption-desc');
    const platformSelect = document.getElementById('caption-platform');
    const toneSelect = document.getElementById('caption-tone');
    const emojiSelect = document.getElementById('caption-emoji');
    const generateBtn = document.getElementById('caption-generate-btn');

    const outputContainer = document.getElementById('caption-output-container');
    const captionsList = document.getElementById('captions-options-list');
    const hashtagsText = document.getElementById('caption-hashtags-text');
    const demoBanner = document.getElementById('caption-demo-banner');

    const inputCharsDisplay = document.getElementById('caption-input-chars');
    const platformLimitDisplay = document.getElementById('caption-platform-limit');
    const clearBtn = document.getElementById('caption-clear-btn');
    const copyHashtagsBtn = document.getElementById('copy-hashtags-btn');
    const saveAllBtn = document.getElementById('caption-save-btn');

    // Brand Voice, Keywords, Model, and Feedback references
    const bvCheckbox = document.getElementById('caption-use-bv');
    const bvBadge = document.getElementById('caption-bv-name-badge');
    const keywordsInput = document.getElementById('caption-keywords');
    const modelSelect = document.getElementById('caption-model');
    const feedbackGoodBtn = document.getElementById('caption-feedback-good');
    const feedbackBadBtn = document.getElementById('caption-feedback-bad');

    const PLATFORM_LIMITS = {
        instagram: 2200,
        linkedin: 3000,
        twitter: 280,
        youtube: 5000,
        facebook: 5000
    };

    // Initialize layout position swapper (Controls Left / Right)
    if (CreatorAI.initLayoutFlip) {
        CreatorAI.initLayoutFlip('caption-swap-layout-btn', 'caption-controls-col', 'caption-output-col', 'creatorai_caption_layout_flipped');
    }

    // Check and display Brand Voice
    function checkBrandVoice() {
        const bv = CreatorAI.getBrandVoice ? CreatorAI.getBrandVoice() : JSON.parse(localStorage.getItem('creatorai_brand_voice') || 'null');
        if (bv && bv.brand_name) {
            if (bvBadge) {
                bvBadge.innerHTML = `<span class="text-purple-500 font-bold">●</span> ${bv.brand_name}`;
            }
            if (bvCheckbox) bvCheckbox.checked = true;
        } else {
            if (bvBadge) {
                bvBadge.innerHTML = `<a href="/settings" class="underline text-purple-400 hover:text-purple-300">Set in Settings</a>`;
            }
            if (bvCheckbox) bvCheckbox.checked = false;
        }
    }
    checkBrandVoice();

    // Check URL query parameters (e.g. from Content Calendar deep-link)
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get('topic');
    if (topicParam && descriptionInput) {
        descriptionInput.value = topicParam;
        if (inputCharsDisplay) inputCharsDisplay.textContent = topicParam.length;
        CreatorAI.toast(`Loaded plan from Calendar: "${topicParam}"`, 'info', 3000);
    }

    if (bvCheckbox) {
        bvCheckbox.addEventListener('change', () => {
            const bv = CreatorAI.getBrandVoice ? CreatorAI.getBrandVoice() : JSON.parse(localStorage.getItem('creatorai_brand_voice') || 'null');
            if (bvCheckbox.checked && (!bv || !bv.brand_name)) {
                CreatorAI.toast('No brand voice found! Please configure it in Settings first.', 'info', 4000);
            }
        });
    }

    function updatePlatformLimit() {
        if (!platformSelect || !platformLimitDisplay) return;
        const limit = PLATFORM_LIMITS[platformSelect.value] || 2200;
        platformLimitDisplay.textContent = `Max ${limit.toLocaleString()} chars`;
    }

    if (platformSelect) {
        platformSelect.addEventListener('change', updatePlatformLimit);
    }

    if (descriptionInput && inputCharsDisplay) {
        descriptionInput.addEventListener('input', () => {
            inputCharsDisplay.textContent = `${descriptionInput.value.length} chars`;
        });
    }

    // Clear button
    if (clearBtn && descriptionInput) {
        clearBtn.addEventListener('click', () => {
            descriptionInput.value = '';
            if (inputCharsDisplay) inputCharsDisplay.textContent = '0 chars';
            descriptionInput.focus();
            CreatorAI.toast('Post concept cleared', 'info', 1500);
        });
    }

    // Template chips
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const platform = chip.getAttribute('data-platform');
            const desc = chip.getAttribute('data-desc');
            const tone = chip.getAttribute('data-tone');
            const emoji = chip.getAttribute('data-emoji');

            if (platform && platformSelect) {
                platformSelect.value = platform;
                updatePlatformLimit();
            }
            if (desc && descriptionInput) {
                descriptionInput.value = desc;
                if (inputCharsDisplay) inputCharsDisplay.textContent = `${desc.length} chars`;
            }
            if (tone && toneSelect) toneSelect.value = tone;
            if (emoji && emojiSelect) emojiSelect.value = emoji;

            CreatorAI.toast('Post starter loaded! Click Generate to create.', 'info', 2500);
            descriptionInput.focus();
        });
    });

    let currentResult = null;

    if (captionForm) {
        captionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const description = descriptionInput.value.trim();

            if (!description) {
                CreatorAI.toast('Please enter a description or topic for your post.', 'warning');
                descriptionInput.focus();
                return;
            }

            const origBtnText = generateBtn.innerHTML;
            generateBtn.disabled = true;
            generateBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Crafting Captions...
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
                const res = await fetch('/api/ai/generate-caption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description,
                        platform: platformSelect.value,
                        tone: toneSelect.value,
                        emoji_style: emojiSelect ? emojiSelect.value : 'rich',
                        keywords: keywordsInput ? keywordsInput.value.trim() : '',
                        model: modelSelect ? modelSelect.value : 'gemini-3.5-flash',
                        brand_voice: brandVoicePayload
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    CreatorAI.toast(data.error || 'Failed to generate captions.', 'error');
                    return;
                }

                currentResult = data;

                // Render captions
                captionsList.innerHTML = (data.captions || []).map((caption, idx) => `
                    <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between gap-3 group hover:border-purple-500/40 transition-all">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full">Option ${idx + 1}</span>
                                <span class="text-[10px] text-slate-400">${caption.length} chars</span>
                            </div>
                            <button class="text-slate-400 hover:text-purple-500 transition-colors copy-single-caption-btn p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" data-caption="${encodeURIComponent(caption)}" title="Copy this caption">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <p class="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">${caption}</p>
                    </div>
                `).join('');

                // Render hashtags
                hashtagsText.textContent = data.hashtags || '#CreatorAI #SocialMedia';

                outputContainer.classList.remove('hidden');

                if (data.is_demo && demoBanner) {
                    demoBanner.classList.remove('hidden');
                }

                // Attach copy listener to each single caption button with animated checkmark
                document.querySelectorAll('.copy-single-caption-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const cap = decodeURIComponent(btn.getAttribute('data-caption'));
                        const success = await CreatorAI.copyToClipboard(cap, 'Caption copied!');
                        if (success) {
                            const orig = btn.innerHTML;
                            btn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-500"></i>';
                            if (window.lucide) lucide.createIcons();
                            setTimeout(() => {
                                btn.innerHTML = orig;
                                if (window.lucide) lucide.createIcons();
                            }, 2000);
                        }
                    });
                });

                CreatorAI.toast('Captions & hashtags ready!', 'success');
                outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {
                CreatorAI.toast('Network error during caption generation.', 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = origBtnText;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // Feedback Buttons (Helpful vs Try Again)
    if (feedbackGoodBtn) {
        feedbackGoodBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('caption_generator', 'helpful', {
                platform: platformSelect.value,
                description: descriptionInput.value
            });
            feedbackGoodBtn.classList.add('bg-emerald-500/20', 'text-emerald-500', 'font-bold');
        });
    }

    if (feedbackBadBtn) {
        feedbackBadBtn.addEventListener('click', async () => {
            await CreatorAI.submitFeedback('caption_generator', 'try_again', {
                platform: platformSelect.value,
                description: descriptionInput.value
            });
            feedbackBadBtn.classList.add('bg-rose-500/20', 'text-rose-500', 'font-bold');
        });
    }

    // Copy hashtags separately
    if (copyHashtagsBtn) {
        copyHashtagsBtn.addEventListener('click', async () => {
            const success = await CreatorAI.copyToClipboard(hashtagsText.textContent, 'Hashtags copied!');
            if (success) {
                const orig = copyHashtagsBtn.innerHTML;
                copyHashtagsBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500"></i> Copied!';
                if (window.lucide) lucide.createIcons();
                setTimeout(() => {
                    copyHashtagsBtn.innerHTML = orig;
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }
        });
    }

    // Save full package to history
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', () => {
            if (!currentResult) return;
            const fullOutput = `Captions:\n${(currentResult.captions || []).map((c, i) => `${i + 1}. ${c}`).join('\n\n')}\n\nHashtags:\n${currentResult.hashtags}`;
            const title = `${platformSelect.value.toUpperCase()} Captions: ${descriptionInput.value.slice(0, 30)}`;
            CreatorAI.openSaveModal('caption_generator', descriptionInput.value, fullOutput, title);
        });
    }
});

