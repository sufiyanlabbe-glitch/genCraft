"""
CreatorAI – Backend Test Suite
Tests authentication validation, session enforcement, AI service demo fallbacks, and content endpoints.
"""
import pytest
from app import create_app
from utils.validators import validate_email, validate_password, sanitize_string, is_valid_object_id
from services.ai_service import AIService
from services.image_service import ImageService


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"
    with app.test_client() as client:
        yield client


class TestValidators:
    def test_email_validation(self):
        assert validate_email("user@example.com") is True
        assert validate_email("invalid-email") is False
        assert validate_email("") is False
        assert validate_email("user@domain") is False

    def test_password_validation(self):
        valid, _ = validate_password("secret123")
        assert valid is True

        valid_short, msg = validate_password("123")
        assert valid_short is False
        assert "at least 6 characters" in msg

        valid_empty, _ = validate_password("")
        assert valid_empty is False

    def test_sanitize_string(self):
        assert sanitize_string("  Hello World  ") == "Hello World"
        assert sanitize_string("") == ""
        assert len(sanitize_string("a" * 200, max_length=50)) == 50

    def test_object_id_validation(self):
        assert is_valid_object_id("507f1f77bcf86cd799439011") is True
        assert is_valid_object_id("invalid-id") is False
        assert is_valid_object_id("") is False


class TestAuthRoutes:
    def test_register_invalid_data(self, client):
        # Empty body
        res = client.post("/api/auth/register", json={})
        assert res.status_code == 400

        # Invalid email
        res = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "not-an-email",
            "password": "validpassword123"
        })
        assert res.status_code == 400
        assert "valid email" in res.get_json()["error"]

        # Short password
        res = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "123"
        })
        assert res.status_code == 400
        assert "6 characters" in res.get_json()["error"]

    def test_login_empty(self, client):
        res = client.post("/api/auth/login", json={})
        assert res.status_code == 400

    def test_unauthenticated_me(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 200
        data = res.get_json()
        assert data["authenticated"] is False


class TestProtectedRoutesWithoutAuth:
    def test_protected_ai_generate(self, client):
        res = client.post("/api/ai/generate-text", json={"topic": "test"})
        assert res.status_code == 401

    def test_protected_contents(self, client):
        res = client.get("/api/contents")
        assert res.status_code == 401

    def test_protected_dashboard_stats(self, client):
        res = client.get("/api/dashboard/stats")
        assert res.status_code == 401


class TestAIServiceDemoMode:
    def test_unconfigured_text_generation_demo(self, client):
        client.application.config["GEMINI_API_KEY"] = ""
        with client.application.app_context():
            res = AIService.generate_text(topic="Climate Change")
            assert res["is_demo"] is True
            assert "DEMO MODE" in res["output"]

    def test_unconfigured_summarizer_demo(self, client):
        client.application.config["GEMINI_API_KEY"] = ""
        with client.application.app_context():
            res = AIService.summarize_text("Long text content to summarize")
            assert res["is_demo"] is True
            assert "DEMO MODE" in res["output"]

    def test_unconfigured_image_generation(self, client):
        client.application.config["IMAGE_PROVIDER"] = ""
        client.application.config["STABILITY_API_KEY"] = ""
        with client.application.app_context():
            res = ImageService.generate_image(prompt="Cyberpunk city")
            assert res["is_configured"] is False
            assert res["success"] is False
            assert "setup_instructions" in res


class TestNewFeaturesAndEndpoints:
    def test_validator_new_platforms_and_types(self):
        from utils.validators import VALID_CONTENT_TYPES, VALID_PLATFORMS
        assert "email" in VALID_CONTENT_TYPES
        assert "twitter" in VALID_PLATFORMS
        assert "x" in VALID_PLATFORMS

    def test_feedback_endpoint_unauthenticated(self, client):
        res = client.post("/api/ai/feedback", json={"tool_type": "text_generator", "rating": "helpful"})
        assert res.status_code == 401

    def test_calendar_route_redirects_unauthenticated(self, client):
        res = client.get("/calendar")
        # Should redirect to /login
        assert res.status_code in [302, 401]

    def test_enhance_prompt_unauthenticated(self, client):
        res = client.post("/api/ai/enhance-prompt", json={"prompt": "cyberpunk cat"})
        assert res.status_code == 401



