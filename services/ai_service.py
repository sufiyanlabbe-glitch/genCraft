"""
CreatorAI – AI Service Module
Handles text generation, summarization, social captions, and rewriting using Google Gemini REST API.
Includes clean error handling, timeout management, and a clearly-labeled Demo Mode when API key is unconfigured.
Compatible with all Python versions via standard HTTP REST requests.
"""
import os
import requests
from flask import current_app

# Demo responses clearly flagged when no API key is provided
DEMO_RESPONSES = {
    "text_generator": (
        "[DEMO MODE – AI API key is not configured or in setup]\n\n"
        "# Exploring {topic}\n\n"
        "In today's fast-paced digital world, {topic} has become an indispensable topic of discussion. "
        "Whether you are looking to boost productivity, innovate your daily routine, or simply stay informed, "
        "understanding the core tenets of this subject offers substantial value.\n\n"
        "### Key Takeaways:\n"
        "1. Strategic alignment and thoughtful planning yield sustainable results.\n"
        "2. Embracing modern tools transforms everyday challenges into opportunities.\n"
        "3. Continuous iteration and active learning are keys to long-term success.\n\n"
        "To enable real AI generation, configure your GEMINI_API_KEY in the .env file."
    ),
    "summarizer": (
        "[DEMO MODE – AI API key is not configured or in setup]\n\n"
        "**Executive Summary:**\n"
        "The provided text explores key concepts and developments in its subject area. "
        "The primary takeaway highlights the balance between systematic methodology and agile execution, "
        "emphasizing that consistent optimization leads to measurable outcomes.\n\n"
        "(Configure GEMINI_API_KEY in .env for real-time AI summaries.)"
    ),
    "caption_generator": {
        "captions": [
            "Transforming ideas into reality, one milestone at a time! ✨ What are you building today?",
            "Behind every great breakthrough is the courage to begin. 🚀 Double tap if you agree!",
            "Leveling up our creative workflow with modern AI tools. Stay curious and keep creating! 💡"
        ],
        "hashtags": "#CreatorAI #Innovation #DigitalCreation #ContentCreation #Productivity #TechTrends"
    },
    "rewriter": (
        "[DEMO MODE – AI API key is not configured or in setup]\n\n"
        "Here is the refined version of your text:\n\n"
        "Efficient content delivery requires clarity and intentionality. By restructuring the message, "
        "we ensure higher engagement and impactful communication across your audience.\n\n"
        "(Add your GEMINI_API_KEY in .env to experience custom tone-based AI rewriting.)"
    )
}


class AIService:
    @staticmethod
    def is_configured() -> bool:
        """Check if Gemini API key is configured and not placeholder."""
        if current_app and "GEMINI_API_KEY" in current_app.config:
            api_key = current_app.config.get("GEMINI_API_KEY", "")
        else:
            api_key = os.getenv("GEMINI_API_KEY", "")

        if not api_key:
            return False
        key = api_key.strip()
        return bool(key and key != "your-gemini-api-key-here")




    @classmethod
    def _call_gemini_api(cls, prompt: str, preferred_model: str = None) -> str:
        """Call Google Gemini REST API with preferred model and multi-model fallback."""
        api_key = current_app.config.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY", "")
        configured_model = current_app.config.get("GEMINI_MODEL", "gemini-3.5-flash")

        # Candidate models to try in order
        candidate_models = []
        if preferred_model:
            candidate_models.append(preferred_model)
        candidate_models.extend([configured_model, "gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.8-flash"])
        models_to_try = list(dict.fromkeys(candidate_models))

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048
            }
        }
        headers = {"Content-Type": "application/json"}

        last_error = None
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                res = requests.post(url, json=payload, headers=headers, timeout=30)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                    continue
                else:
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        err_msg = res.text
                    last_error = f"Gemini API Error ({res.status_code}): {err_msg}"
                    # Try next candidate model if 404 or 503
                    if res.status_code in (404, 503):
                        continue
                    else:
                        raise RuntimeError(last_error)
            except requests.exceptions.Timeout:
                last_error = "Request to Gemini API timed out."
                continue
            except requests.exceptions.RequestException as e:
                last_error = f"Network error connecting to Gemini API: {str(e)}"
                continue

        raise RuntimeError(last_error or "AI generation failed across all available models.")


    @classmethod
    def generate_text(cls, topic: str, content_type: str = "blog", tone: str = "professional",
                      language: str = "English", word_count: int = 300, keywords: str = "",
                      brand_voice: dict = None, model: str = "gemini-3.5-flash") -> dict:
        """
        Generate structured text content based on parameters, keywords, brand voice, and chosen model.
        Returns dict with keys: output, is_demo, model_used.
        """
        if not cls.is_configured():
            demo_out = DEMO_RESPONSES["text_generator"].format(topic=topic or "the topic")
            return {
                "output": demo_out,
                "is_demo": True,
                "model_used": "demo-mode",
                "message": "Notice: Demo output shown because GEMINI_API_KEY is not configured in .env."
            }

        brand_notes = ""
        if brand_voice and isinstance(brand_voice, dict):
            brand_name = brand_voice.get("name", "").strip()
            audience = brand_voice.get("audience", "").strip()
            custom_tone = brand_voice.get("tone", "").strip()
            if brand_name:
                brand_notes += f"- Brand/Creator Name: {brand_name}\n"
            if audience:
                brand_notes += f"- Target Audience: {audience}\n"
            if custom_tone:
                brand_notes += f"- Custom Voice: {custom_tone}\n"

        keywords_note = f"- Naturally weave in these keywords/phrases: {keywords}\n" if keywords else ""

        prompt = (
            f"You are a professional content creator. Write a {tone} {content_type} about: \"{topic}\".\n"
            f"Requirements:\n"
            f"- Language: {language}\n"
            f"- Target Word Count: approximately {word_count} words\n"
            f"- Tone: {tone.capitalize()}\n"
            f"{brand_notes}"
            f"{keywords_note}"
            f"- Format: Clean, well-structured text with compelling headings and paragraphs.\n"
            f"Do not include meta-commentary, introductory notes, or disclaimers. Provide only the finished content."
        )

        try:
            output_text = cls._call_gemini_api(prompt, preferred_model=model)
            return {
                "output": output_text,
                "is_demo": False,
                "model_used": model or "gemini-3.5-flash"
            }
        except Exception as e:
            raise RuntimeError(f"AI Generation Error: {str(e)}")

    @classmethod
    def summarize_text(cls, text: str, length: str = "medium", format_type: str = "bullet_points") -> dict:
        """
        Summarize a body of text according to requested length and format.
        """
        if not cls.is_configured():
            return {
                "output": DEMO_RESPONSES["summarizer"],
                "is_demo": True,
                "model_used": "demo-mode",
                "message": "Notice: Demo output shown because GEMINI_API_KEY is not configured in .env."
            }

        length_guidelines = {
            "short": "Provide a concise 1-2 sentence executive summary (under 60 words).",
            "medium": "Provide a balanced summary of 2-3 paragraphs with key highlights (around 150-200 words).",
            "long": "Provide a comprehensive, in-depth summary with structured bullet points and complete context (around 300-400 words)."
        }
        guideline = length_guidelines.get(length.lower(), length_guidelines["medium"])

        format_guidelines = {
            "bullet_points": "Format the main points as clean, high-impact markdown bullet points with a brief conclusion.",
            "paragraph": "Format as cohesive, professional narrative paragraphs.",
            "tldr": "Format as an ultra-punchy TL;DR followed by 3 core takeaways."
        }
        format_instr = format_guidelines.get(format_type.lower(), format_guidelines["bullet_points"])

        prompt = (
            f"Summarize the following text accurately and clearly.\n"
            f"Length Guideline: {guideline}\n"
            f"Format Guideline: {format_instr}\n\n"
            f"Text to summarize:\n\"\"\"\n{text}\n\"\"\"\n\n"
            f"Provide only the summary without meta-introductions."
        )

        try:
            output_text = cls._call_gemini_api(prompt)
            return {
                "output": output_text,
                "is_demo": False,
                "model_used": current_app.config.get("GEMINI_MODEL", "gemini-3.5-flash")
            }
        except Exception as e:
            raise RuntimeError(f"AI Summarization Error: {str(e)}")

    @classmethod
    def generate_captions(cls, description: str, platform: str = "instagram", tone: str = "casual",
                          emoji_style: str = "rich", keywords: str = "", brand_voice: dict = None,
                          model: str = "gemini-3.5-flash") -> dict:
        """
        Generate social media captions and relevant hashtags with customizable emoji intensity, keywords, and model.
        """
        if not cls.is_configured():
            demo_data = DEMO_RESPONSES["caption_generator"]
            return {
                "captions": demo_data["captions"],
                "hashtags": demo_data["hashtags"],
                "is_demo": True,
                "model_used": "demo-mode",
                "message": "Notice: Demo output shown because GEMINI_API_KEY is not configured in .env."
            }

        emoji_instruction = {
            "rich": "Use vibrant, expressive, engaging emojis strategically throughout.",
            "minimal": "Use only 1-2 subtle, tasteful emojis.",
            "none": "Do not use any emojis at all; keep it clean and textual."
        }.get(emoji_style.lower(), "Use vibrant, expressive, engaging emojis strategically throughout.")

        brand_notes = ""
        if brand_voice and isinstance(brand_voice, dict):
            brand_name = brand_voice.get("name", "").strip()
            audience = brand_voice.get("audience", "").strip()
            if brand_name:
                brand_notes += f"- Brand Name: {brand_name}\n"
            if audience:
                brand_notes += f"- Audience: {audience}\n"

        keywords_note = f"- Include these hashtags or keywords: {keywords}\n" if keywords else ""

        prompt = (
            f"You are a top-tier social media manager for {platform.capitalize()}.\n"
            f"Topic/Post Description: \"{description}\"\n"
            f"Tone: {tone}\n"
            f"Emoji Guideline: {emoji_instruction}\n"
            f"{brand_notes}"
            f"{keywords_note}\n"
            f"Generate:\n"
            f"1. Exactly 3 distinct, engaging post caption options optimized for {platform}.\n"
            f"2. A curated set of 8-15 high-performing, relevant hashtags.\n\n"
            f"Format strictly as follows:\n"
            f"CAPTION 1: [caption text]\n"
            f"CAPTION 2: [caption text]\n"
            f"CAPTION 3: [caption text]\n"
            f"HASHTAGS: #tag1 #tag2 #tag3..."
        )

        try:
            raw = cls._call_gemini_api(prompt, preferred_model=model)
            captions = []
            hashtags = ""

            for line in raw.split("\n"):
                line_str = line.strip()
                if line_str.startswith("CAPTION 1:"):
                    captions.append(line_str.replace("CAPTION 1:", "").strip())
                elif line_str.startswith("CAPTION 2:"):
                    captions.append(line_str.replace("CAPTION 2:", "").strip())
                elif line_str.startswith("CAPTION 3:"):
                    captions.append(line_str.replace("CAPTION 3:", "").strip())
                elif line_str.startswith("HASHTAGS:"):
                    hashtags = line_str.replace("HASHTAGS:", "").strip()

            if not captions:
                captions = [raw]
            if not hashtags:
                tags = [w for w in raw.split() if w.startswith("#")]
                hashtags = " ".join(tags) if tags else "#Trending #Viral #CreatorAI"

            return {
                "captions": captions,
                "hashtags": hashtags,
                "raw_text": raw,
                "is_demo": False,
                "model_used": current_app.config.get("GEMINI_MODEL", "gemini-3.5-flash")
            }
        except Exception as e:
            raise RuntimeError(f"AI Caption Generation Error: {str(e)}")

    @classmethod
    def rewrite_text(cls, text: str, style: str = "professional") -> dict:
        """
        Rewrite existing content in a specific target style.
        """
        if not cls.is_configured():
            return {
                "output": DEMO_RESPONSES["rewriter"],
                "is_demo": True,
                "model_used": "demo-mode",
                "message": "Notice: Demo output shown because GEMINI_API_KEY is not configured in .env."
            }

        style_instructions = {
            "professional": "Polished, authoritative, business-ready, and grammatically impeccable.",
            "simple": "Clear, accessible, easy-to-read, using plain vocabulary without jargon.",
            "creative": "Vivid, compelling, expressive, and engaging with literary flair.",
            "concise": "Direct, punchy, eliminating all fluff and unnecessary words.",
            "friendly": "Warm, conversational, empathetic, and approachable."
        }
        instruction = style_instructions.get(style.lower(), style_instructions["professional"])

        prompt = (
            f"Rewrite the following text with the style: '{style.capitalize()}'.\n"
            f"Style guide: {instruction}\n\n"
            f"Original text:\n\"\"\"\n{text}\n\"\"\"\n\n"
            f"Output only the rewritten text without preambles or notes."
        )

        try:
            output_text = cls._call_gemini_api(prompt)
            return {
                "output": output_text,
                "is_demo": False,
                "model_used": current_app.config.get("GEMINI_MODEL", "gemini-3.5-flash")
            }
        except Exception as e:
            raise RuntimeError(f"AI Rewrite Error: {str(e)}")

    @classmethod
    def enhance_prompt(cls, prompt: str, target_type: str = "image") -> dict:
        """
        Expand a basic prompt into a vivid, descriptive prompt for image generation or text drafting.
        """
        if not cls.is_configured():
            return {
                "enhanced_prompt": f"Detailed cinematic masterpiece of {prompt}, dramatic lighting, 8k resolution, photorealistic rendering.",
                "is_demo": True
            }

        if target_type == "image":
            system_instruction = (
                "You are an expert AI prompt engineer for text-to-image models (Flux, Midjourney, Stable Diffusion). "
                "Take the user's short concept and expand it into a detailed, descriptive 1-2 sentence visual prompt "
                "covering subject, environment, lighting, mood, color palette, and camera composition. "
                "Output ONLY the prompt text without quotes or prefix."
            )
        else:
            system_instruction = (
                "You are an expert creative director. Expand the user's content idea into a detailed, "
                "specific prompt that outlines angle, target audience, core arguments, and hook. "
                "Output ONLY the enhanced prompt."
            )

        full_prompt = f"{system_instruction}\n\nUser Concept: {prompt}\nEnhanced Prompt:"
        try:
            enhanced = cls._call_gemini_api(full_prompt)
            return {
                "enhanced_prompt": enhanced.strip().strip('"'),
                "is_demo": False
            }
        except Exception as e:
            raise RuntimeError(f"Prompt Enhancement Error: {str(e)}")

