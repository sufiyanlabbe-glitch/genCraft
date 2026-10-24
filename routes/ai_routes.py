"""
CreatorAI – AI Tool Endpoints
Connects frontend AI requests to the AIService and ImageService with robust validation.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, session

from services.ai_service import AIService
from services.image_service import ImageService
from database.mongo import get_db, DatabaseError
from utils.validators import (
    login_required,
    sanitize_string,
    VALID_TONES,
    VALID_CONTENT_TYPES,
    VALID_SUMMARY_LENGTHS,
    VALID_PLATFORMS,
    VALID_REWRITE_STYLES
)

ai_bp = Blueprint("ai", __name__)


def _log_ai_action(action: str, tool_type: str):
    user_id = session.get("user_id")
    if not user_id:
        return
    try:
        db = get_db()
        db.activity_logs.insert_one({
            "user_id": user_id,
            "action": action,
            "tool_type": tool_type,
            "created_at": datetime.now(timezone.utc)
        })
    except Exception:
        pass


@ai_bp.route("/generate-text", methods=["POST"])
@login_required
def generate_text():
    data = request.get_json(silent=True) or {}
    topic = sanitize_string(data.get("topic") or "", max_length=500)
    content_type = (data.get("content_type") or "blog").strip().lower()
    tone = (data.get("tone") or "professional").strip().lower()
    language = sanitize_string(data.get("language") or "English", max_length=50)

    try:
        word_count = int(data.get("word_count", 300))
        word_count = max(50, min(1500, word_count))
    except (ValueError, TypeError):
        word_count = 300

    if not topic:
        return jsonify({"error": "Please provide a topic or prompt for text generation."}), 400

    if content_type not in VALID_CONTENT_TYPES:
        content_type = "blog"
    if tone not in VALID_TONES:
        tone = "professional"

    keywords = sanitize_string(data.get("keywords") or "", max_length=200)
    brand_voice = data.get("brand_voice") if isinstance(data.get("brand_voice"), dict) else None
    model = sanitize_string(data.get("model") or "gemini-3.5-flash", max_length=50)

    try:
        result = AIService.generate_text(
            topic=topic,
            content_type=content_type,
            tone=tone,
            language=language,
            word_count=word_count,
            keywords=keywords,
            brand_voice=brand_voice,
            model=model
        )
        _log_ai_action("generated_text", "text_generator")
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/summarize", methods=["POST"])
@login_required
def summarize():
    data = request.get_json(silent=True) or {}
    text = sanitize_string(data.get("text") or "", max_length=20000)
    length = (data.get("length") or "medium").strip().lower()
    format_type = (data.get("format_type") or "bullet_points").strip().lower()

    if not text:
        return jsonify({"error": "Please provide text to summarize."}), 400

    if len(text.split()) < 10:
        return jsonify({"error": "Input text is too short to summarize (minimum 10 words required)."}), 400

    if length not in VALID_SUMMARY_LENGTHS:
        length = "medium"

    if format_type not in ("bullet_points", "paragraph", "tldr"):
        format_type = "bullet_points"

    try:
        result = AIService.summarize_text(text=text, length=length, format_type=format_type)
        _log_ai_action("summarized_text", "summarizer")
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/generate-caption", methods=["POST"])
@login_required
def generate_caption():
    data = request.get_json(silent=True) or {}
    description = sanitize_string(data.get("description") or "", max_length=1000)
    platform = (data.get("platform") or "instagram").strip().lower()
    tone = (data.get("tone") or "casual").strip().lower()
    emoji_style = (data.get("emoji_style") or "rich").strip().lower()

    if not description:
        return jsonify({"error": "Please provide a description or topic for your post."}), 400

    if platform not in VALID_PLATFORMS:
        platform = "instagram"
    if tone not in VALID_TONES:
        tone = "casual"
    if emoji_style not in ("rich", "minimal", "none"):
        emoji_style = "rich"

    keywords = sanitize_string(data.get("keywords") or "", max_length=200)
    brand_voice = data.get("brand_voice") if isinstance(data.get("brand_voice"), dict) else None
    model = sanitize_string(data.get("model") or "gemini-3.5-flash", max_length=50)

    try:
        result = AIService.generate_captions(
            description=description,
            platform=platform,
            tone=tone,
            emoji_style=emoji_style,
            keywords=keywords,
            brand_voice=brand_voice,
            model=model
        )
        _log_ai_action("generated_caption", "caption_generator")
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/rewrite", methods=["POST"])
@login_required
def rewrite():
    data = request.get_json(silent=True) or {}
    text = sanitize_string(data.get("text") or "", max_length=10000)
    style = (data.get("style") or "professional").strip().lower()

    if not text:
        return jsonify({"error": "Please provide text to rewrite."}), 400

    if style not in VALID_REWRITE_STYLES:
        style = "professional"

    try:
        result = AIService.rewrite_text(text=text, style=style)
        _log_ai_action("rewrote_text", "rewriter")
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/generate-image", methods=["POST"])
@login_required
def generate_image():
    data = request.get_json(silent=True) or {}
    prompt = sanitize_string(data.get("prompt") or "", max_length=500)
    style = sanitize_string(data.get("style") or "photorealistic", max_length=50)
    aspect_ratio = sanitize_string(data.get("aspect_ratio") or "square", max_length=20).lower()

    if not prompt:
        return jsonify({"error": "Please provide an image description prompt."}), 400

    if aspect_ratio not in ("square", "landscape", "portrait"):
        aspect_ratio = "square"

    try:
        result = ImageService.generate_image(prompt=prompt, style=style, aspect_ratio=aspect_ratio)
        _log_ai_action("generated_image_attempt", "image_generator")
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/enhance-prompt", methods=["POST"])
@login_required
def enhance_prompt():
    data = request.get_json(silent=True) or {}
    prompt = sanitize_string(data.get("prompt") or "", max_length=400)
    target_type = sanitize_string(data.get("target_type") or "image", max_length=20)

    if not prompt:
        return jsonify({"error": "Please provide a concept to enhance."}), 400

    try:
        result = AIService.enhance_prompt(prompt=prompt, target_type=target_type)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/feedback", methods=["POST"])
@login_required
def feedback():
    data = request.get_json(silent=True) or {}
    rating = sanitize_string(data.get("rating") or "helpful", max_length=20)
    tool_type = sanitize_string(data.get("tool_type") or "general", max_length=50)
    _log_ai_action(f"feedback_{rating}", tool_type)
    return jsonify({"success": True, "message": "Feedback logged successfully"}), 200



