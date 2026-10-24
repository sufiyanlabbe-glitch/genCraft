/**
 * CreatorAI – AI Image Generator Page Logic
 * Safely handles unconfigured states with clear setup instructions without fabricating images.
 */
document.addEventListener('DOMContentLoaded', () => {
    const imageForm = document.getElementById('image-form');
    const promptInput = document.getElementById('image-prompt');
    const styleSelect = document.getElementById('image-style');
    const aspectRatioSelect = document.getElementById('image-aspect-ratio');
    const generateBtn = document.getElementById('image-generate-btn');
    const enhanceBtn = document.getElementById('image-enhance-btn');
    const clearBtn = document.getElementById('image-clear-btn');
    const counterDisplay = document.getElementById('image-prompt-counter');

    const resultContainer = document.getElementById('image-result-container');
    const setupGuideContainer = document.getElementById('image-setup-guide');
    const imagePreview = document.getElementById('image-preview');
    const downloadBtn = document.getElementById('image-download-btn');
    const saveBtn = document.getElementById('image-save-btn');

    let currentImageData = null;

    // Initialize layout position swapper (Controls Left / Right)
    if (CreatorAI.initLayoutFlip) {
        CreatorAI.initLayoutFlip('image-swap-layout-btn', 'image-controls-col', 'image-output-col', 'creatorai_image_layout_flipped');
    }

    if (promptInput && counterDisplay) {
        promptInput.addEventListener('input', () => {
            counterDisplay.textContent = `${promptInput.value.length} chars`;
        });
    }

    if (clearBtn && promptInput) {
        clearBtn.addEventListener('click', () => {
            promptInput.value = '';
            if (counterDisplay) counterDisplay.textContent = '0 chars';
            promptInput.focus();
            CreatorAI.toast('Prompt cleared', 'info', 1500);
        });
    }

    // Template chips
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            const style = chip.getAttribute('data-style');
            const ratio = chip.getAttribute('data-ratio');

            if (prompt && promptInput) {
                promptInput.value = prompt;
                if (counterDisplay) counterDisplay.textContent = `${prompt.length} chars`;
            }
            if (style && styleSelect) styleSelect.value = style;
            if (ratio && aspectRatioSelect) aspectRatioSelect.value = ratio;

            CreatorAI.toast('Scene loaded! Click Generate Image to create.', 'info', 2500);
            promptInput.focus();
        });
    });

    // Enhance prompt using Gemini AI
    if (enhanceBtn && promptInput) {
        enhanceBtn.addEventListener('click', async () => {
            const basePrompt = promptInput.value.trim();
            if (!basePrompt) {
                CreatorAI.toast('Enter a basic idea first, then click Enhance Prompt.', 'warning');
                promptInput.focus();
                return;
            }

            const origHtml = enhanceBtn.innerHTML;
            enhanceBtn.disabled = true;
            enhanceBtn.innerHTML = `
                <svg class="animate-spin h-3 w-3 text-pink-500 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Enhancing...
            `;

            try {
                const res = await fetch('/api/ai/enhance-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: basePrompt,
                        target_type: 'image'
                    })
                });

                const data = await res.json();
                if (res.ok && data.enhanced_prompt) {
                    promptInput.value = data.enhanced_prompt;
                    if (counterDisplay) counterDisplay.textContent = `${data.enhanced_prompt.length} chars`;
                    CreatorAI.toast('Prompt enhanced with cinematic detail!', 'success');
                } else {
                    CreatorAI.toast(data.error || 'Failed to enhance prompt.', 'error');
                }
            } catch (err) {
                CreatorAI.toast('Connection error while enhancing prompt.', 'error');
            } finally {
                enhanceBtn.disabled = false;
                enhanceBtn.innerHTML = origHtml;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (imageForm) {
        imageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = promptInput.value.trim();

            if (!prompt) {
                CreatorAI.toast('Please enter a prompt describing the image you want.', 'warning');
                promptInput.focus();
                return;
            }

            const origBtnText = generateBtn.innerHTML;
            generateBtn.disabled = true;
            generateBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Processing Image Request...
            `;

            if (resultContainer) resultContainer.classList.add('hidden');
            if (setupGuideContainer) setupGuideContainer.classList.add('hidden');

            try {
                const res = await fetch('/api/ai/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        style: styleSelect.value,
                        aspect_ratio: aspectRatioSelect ? aspectRatioSelect.value : 'square'
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    CreatorAI.toast(data.error || 'Failed to process image generation.', 'error');
                    return;
                }

                // Check if API is configured
                if (!data.is_configured) {
                    // Show clear setup guidance
                    if (setupGuideContainer) {
                        setupGuideContainer.classList.remove('hidden');
                        const instructionsList = document.getElementById('image-instructions-list');
                        if (instructionsList && data.setup_instructions) {
                            instructionsList.innerHTML = data.setup_instructions.map(step => `
                                <li class="text-sm text-slate-300 flex items-start gap-2">
                                    <span class="text-indigo-400 font-bold">•</span>
                                    <span>${step}</span>
                                </li>
                            `).join('');
                        }
                        setupGuideContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    CreatorAI.toast('Image API configuration needed (see instructions below)', 'info', 5000);
                    return;
                }

                if (data.success && data.image_url) {
                    currentImageData = data;
                    if (imagePreview) imagePreview.src = data.image_url;
                    if (resultContainer) resultContainer.classList.remove('hidden');
                    CreatorAI.toast('Image generated successfully!', 'success');
                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    CreatorAI.toast(data.error || 'Provider returned an error generating the image.', 'error');
                }
            } catch (err) {
                CreatorAI.toast('Connection error while contacting image generator.', 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = origBtnText;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // Download image
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!currentImageData || !currentImageData.image_url) return;
            const a = document.createElement('a');
            a.href = currentImageData.image_url;
            a.download = `creatorai-image-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            CreatorAI.toast('Image download started.', 'success');
        });
    }

    // Save creation reference
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!currentImageData) return;
            const title = `AI Image: ${promptInput.value.slice(0, 30)}`;
            const outputRef = `Image Prompt: ${promptInput.value}\nStyle: ${styleSelect.value}\nAspect Ratio: ${aspectRatioSelect.value}\nProvider: ${currentImageData.provider || 'Flux.1'}`;
            CreatorAI.openSaveModal('image_generator', promptInput.value, outputRef, title);
        });
    }
});

