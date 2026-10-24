"""
CreatorAI – Input Validators & Decorators
"""
import re
from functools import wraps
from bson import ObjectId
from flask import session, jsonify, request


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

VALID_TOOL_TYPES = {
    "text_generator",
    "summarizer",
    "caption_generator",
    "rewriter",
    "image_generator",
}

VALID_TONES = {
    "professional",
    "friendly",
    "creative",
    "casual",
    "academic",
}

VALID_CONTENT_TYPES = {
    "blog",
    "article",
    "essay",
    "story",
    "product_description",
    "email",
}

VALID_SUMMARY_LENGTHS = {
    "short",
    "medium",
    "long",
}

VALID_PLATFORMS = {
    "instagram",
    "youtube",
    "facebook",
    "linkedin",
    "twitter",
    "x",
}

VALID_REWRITE_STYLES = {
    "professional",
    "simple",
    "creative",
    "concise",
    "friendly",
}


def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_password(password: str) -> tuple[bool, str]:
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    return True, ""


def is_valid_object_id(id_str: str) -> bool:
    if not id_str or not isinstance(id_str, str):
        return False
    return ObjectId.is_valid(id_str)


def sanitize_string(val: str, max_length: int = 10000) -> str:
    """Strip whitespace and enforce length limits."""
    if not val or not isinstance(val, str):
        return ""
    cleaned = val.strip()
    return cleaned[:max_length]


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized. Please log in to continue."}), 401
        return f(*args, **kwargs)
    return decorated_function


