"""
CreatorAI – Application Entry Point
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_session import Session

from config import Config
from database.mongo import init_db
from routes.auth_routes import auth_bp
from routes.ai_routes import ai_bp
from routes.content_routes import content_bp
from routes.dashboard_routes import dashboard_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure session dir exists
    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)

    # Extensions
    CORS(app, supports_credentials=True, origins=["http://localhost:5000"])
    Session(app)

    # Database
    init_db(app)

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(content_bp, url_prefix="/api/contents")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    # Serve HTML pages
    from flask import render_template, session, redirect, url_for

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/favicon.ico")
    def favicon():
        return app.send_static_file("favicon.svg")

    @app.route("/login")
    def login_page():
        if "user_id" in session:
            return redirect(url_for("dashboard_page"))
        return render_template("login.html")

    @app.route("/register")
    def register_page():
        if "user_id" in session:
            return redirect(url_for("dashboard_page"))
        return render_template("register.html")

    @app.route("/dashboard")
    def dashboard_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("dashboard.html")

    @app.route("/ai-writer")
    def ai_writer_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("ai_writer.html")

    @app.route("/summarizer")
    def summarizer_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("summarizer.html")

    @app.route("/caption-generator")
    def caption_generator_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("caption_generator.html")

    @app.route("/rewriter")
    def rewriter_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("rewriter.html")

    @app.route("/image-generator")
    def image_generator_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("image_generator.html")

    @app.route("/history")
    def history_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("history.html")

    @app.route("/calendar")
    def calendar_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("calendar.html")

    @app.route("/settings")
    def settings_page():
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return render_template("settings.html")

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        from flask import jsonify, request
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not found"}), 404
        return render_template("index.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        from flask import jsonify
        return jsonify({"error": "Internal server error"}), 500

    return app


# Production WSGI application instance (for Gunicorn / Render)
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=app.config.get("DEBUG", False), host="0.0.0.0", port=port)


