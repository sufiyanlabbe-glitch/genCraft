"""
CreatorAI – Configuration
Loads settings from environment variables (see .env.example).
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask core
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/creatorai")

    # Session
    SESSION_TYPE = "filesystem"
    SESSION_FILE_DIR = os.path.join(os.path.dirname(__file__), "flask_session")
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")


    # Image generation (optional)
    IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "")
    STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")

    # Limits
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2 MB

