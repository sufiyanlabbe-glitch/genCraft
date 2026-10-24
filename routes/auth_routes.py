"""
CreatorAI – Authentication Routes
Handles user registration, login, logout, and current user retrieval with secure password hashing.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId

from database.mongo import get_db, DatabaseError
from utils.validators import validate_email, validate_password, login_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify({"error": "Full name is required."}), 400

    if not validate_email(email):
        return jsonify({"error": "A valid email address is required."}), 400

    is_valid_pw, pw_err = validate_password(password)
    if not is_valid_pw:
        return jsonify({"error": pw_err}), 400

    try:
        db = get_db()
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503

    existing_user = db.users.find_one({"email": email})
    if existing_user:
        return jsonify({"error": "An account with this email already exists."}), 409

    hashed_password = generate_password_hash(password, method="scrypt")
    user_doc = {
        "name": name,
        "email": email,
        "password_hash": hashed_password,
        "created_at": datetime.now(timezone.utc)
    }

    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Establish session
    session.clear()
    session["user_id"] = user_id
    session["user_name"] = name
    session["user_email"] = email

    return jsonify({
        "message": "Account created successfully.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    try:
        db = get_db()
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503

    user = db.users.find_one({"email": email})
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "Invalid email or password."}), 401

    user_id = str(user["_id"])
    name = user.get("name", "User")

    # Establish session
    session.clear()
    session["user_id"] = user_id
    session["user_name"] = name
    session["user_email"] = email

    return jsonify({
        "message": "Logged in successfully.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    }), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False, "user": None}), 200

    try:
        db = get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            session.clear()
            return jsonify({"authenticated": False, "user": None}), 200

        return jsonify({
            "authenticated": True,
            "user": {
                "id": str(user["_id"]),
                "name": user.get("name", "User"),
                "email": user.get("email", ""),
                "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
            }
        }), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve user: {str(e)}"}), 500

