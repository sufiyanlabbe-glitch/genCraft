"""
CreatorAI – Image Service Module
Supports:
1. Hugging Face Serverless Inference (FLUX.1-schnell / SDXL) via HUGGINGFACE_API_KEY (100% Free)
2. Stability AI Core via STABILITY_API_KEY
3. Pollinations AI (Free public tier with clear rate-limit handling)
"""
import os
import random
import urllib.parse
import base64
import requests
from flask import current_app


class ImageService:
    @staticmethod
    def is_configured() -> bool:
        """Check if an image generation provider or key is configured."""
        if current_app and "IMAGE_PROVIDER" in current_app.config:
            provider = (current_app.config.get("IMAGE_PROVIDER") or "").lower().strip()
        else:
            provider = os.getenv("IMAGE_PROVIDER", "").lower().strip()

        if current_app and "STABILITY_API_KEY" in current_app.config:
            stability_key = (current_app.config.get("STABILITY_API_KEY") or "").strip()
        else:
            stability_key = os.getenv("STABILITY_API_KEY", "").strip()

        if current_app and "HUGGINGFACE_API_KEY" in current_app.config:
            hf_key = (current_app.config.get("HUGGINGFACE_API_KEY") or "").strip()
        else:
            hf_key = os.getenv("HUGGINGFACE_API_KEY", "").strip()

        if hf_key and hf_key.startswith("hf_"):
            return True

        if stability_key and stability_key != "your-stability-ai-key-here":
            return True

        if provider in ("pollinations", "flux", "free", "auto"):
            return True

        return False

    @classmethod
    def generate_image(cls, prompt: str, style: str = "photorealistic", aspect_ratio: str = "square") -> dict:
        """
        Generate image across Hugging Face, Stability AI, or Pollinations with aspect ratio support.
        """
        if not cls.is_configured():
            return {
                "success": False,
                "is_configured": False,
                "message": (
                    "Image generation provider is not configured yet. "
                    "Add your free Hugging Face token or Stability AI key in .env."
                ),
                "setup_instructions": [
                    "Option A (Recommended - 100% Free): Get a free user token from https://huggingface.co/settings/tokens and add HUGGINGFACE_API_KEY=hf_... in .env",
                    "Option B: Get an API key from https://platform.stability.ai and add STABILITY_API_KEY=sk_... in .env",
                    "Option C: Set IMAGE_PROVIDER=pollinations in .env for public free tier."
                ],
                "image_url": None,
                "prompt": prompt,
                "style": style,
                "aspect_ratio": aspect_ratio
            }

        # Aspect ratio dimensions
        dimensions = {
            "square": (768, 768),
            "landscape": (1024, 576),
            "portrait": (576, 1024)
        }
        width, height = dimensions.get(aspect_ratio.lower(), (768, 768))

        # Style enhancements
        style_prompts = {
            "photorealistic": "ultra realistic 8k, cinematic photography, hyperdetailed, sharp focus, award-winning photo, 50mm lens",
            "anime": "anime illustration, studio ghibli and makoto shinkai style, vibrant colors, clean aesthetic lineart, anime masterpiece",
            "digital_art": "digital concept art, vivid digital painting, fantasy illustration, trending on ArtStation, highly detailed",
            "3d_render": "3d octane render, cinema 4d style, raytraced volumetric lighting, high quality 3d model, smooth shading",
            "cyberpunk": "cyberpunk neon style, futuristic sci-fi city, synthwave illumination, high tech, glowing rain reflections",
            "minimalist": "minimalist vector illustration, clean lines, elegant flat graphic art, modern poster design, vector aesthetic"
        }
        style_suffix = style_prompts.get(style.lower(), "high quality, detailed, masterpiece")
        enhanced_prompt = f"{prompt.strip()}, {style_suffix}"

        hf_key = (current_app.config.get("HUGGINGFACE_API_KEY") or os.getenv("HUGGINGFACE_API_KEY", "")).strip()
        stability_key = (current_app.config.get("STABILITY_API_KEY") or os.getenv("STABILITY_API_KEY", "")).strip()

        # Method 1: Hugging Face Serverless Inference (FLUX.1-schnell or SDXL)
        if hf_key and hf_key.startswith("hf_"):
            hf_models = [
                "black-forest-labs/FLUX.1-schnell",
                "stabilityai/stable-diffusion-xl-base-1.0"
            ]
            for model_id in hf_models:
                try:
                    url = f"https://api-inference.huggingface.co/models/{model_id}"
                    headers = {"Authorization": f"Bearer {hf_key}"}
                    res = requests.post(url, headers=headers, json={"inputs": enhanced_prompt}, timeout=35)
                    if res.status_code == 200 and "image" in res.headers.get("content-type", ""):
                        b64_image = base64.b64encode(res.content).decode("utf-8")
                        return {
                            "success": True,
                            "is_configured": True,
                            "image_url": f"data:image/jpeg;base64,{b64_image}",
                            "prompt": prompt,
                            "style": style,
                            "aspect_ratio": aspect_ratio,
                            "provider": f"Hugging Face ({model_id.split('/')[-1]})"
                        }
                except Exception:
                    continue

        # Method 2: Stability AI
        if stability_key and stability_key != "your-stability-ai-key-here":
            try:
                headers = {
                    "authorization": f"Bearer {stability_key}",
                    "accept": "image/*"
                }
                files = {"none": ""}
                data = {
                    "prompt": enhanced_prompt,
                    "output_format": "jpeg",
                    "aspect_ratio": "1:1" if aspect_ratio == "square" else ("16:9" if aspect_ratio == "landscape" else "9:16")
                }
                response = requests.post(
                    "https://api.stability.ai/v2beta/stable-image/generate/core",
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=45
                )

                if response.status_code == 200:
                    b64_image = base64.b64encode(response.content).decode("utf-8")
                    return {
                        "success": True,
                        "is_configured": True,
                        "image_url": f"data:image/jpeg;base64,{b64_image}",
                        "prompt": prompt,
                        "style": style,
                        "aspect_ratio": aspect_ratio,
                        "provider": "Stability AI"
                    }
                else:
                    error_detail = response.json() if "application/json" in response.headers.get("content-type", "") else response.text
                    return {
                        "success": False,
                        "is_configured": True,
                        "error": f"Stability AI Error ({response.status_code}): {error_detail}"
                    }
            except Exception as e:
                return {
                    "success": False,
                    "is_configured": True,
                    "error": f"Stability AI Connection Failed: {str(e)}"
                }

        # Method 3: Public Free Tier (Pollinations Flux.1)
        try:
            encoded_prompt = urllib.parse.quote(enhanced_prompt)
            seed = random.randint(1, 999999)
            url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true&seed={seed}"

            res = requests.get(url, timeout=35)
            if res.status_code == 200 and "image" in res.headers.get("content-type", ""):
                b64_image = base64.b64encode(res.content).decode("utf-8")
                return {
                    "success": True,
                    "is_configured": True,
                    "image_url": f"data:image/jpeg;base64,{b64_image}",
                    "prompt": prompt,
                    "style": style,
                    "aspect_ratio": aspect_ratio,
                    "provider": "Flux.1 AI (Free Public API)"
                }
            elif res.status_code == 402:
                return {
                    "success": False,
                    "is_configured": True,
                    "error": (
                        "Public free rate limit reached (Error 402). "
                        "Please wait 30 seconds and try again, or add a free Hugging Face token (HUGGINGFACE_API_KEY) in .env for unlimited generations!"
                    )
                }
            else:
                return {
                    "success": False,
                    "is_configured": True,
                    "error": f"Image API returned status code {res.status_code}. Please try again shortly."
                }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "is_configured": True,
                "error": "Image generation timed out. Please wait a moment and click Generate again."
            }
        except Exception as e:
            return {
                "success": False,
                "is_configured": True,
                "error": f"Image Generation Error: {str(e)}"
            }
