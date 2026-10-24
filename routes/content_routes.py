"""
CreatorAI – Content Management Routes
Handles CRUD operations and favorites for user-generated content in MongoDB.
Ensures users only access their own saved documents.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, session
from bson import ObjectId

from database.mongo import get_db, DatabaseError
from utils.validators import login_required, is_valid_object_id, sanitize_string, VALID_TOOL_TYPES

content_bp = Blueprint("contents", __name__)


def serialize_content(doc: dict) -> dict:
    """Format MongoDB content document for JSON response."""
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc.get("user_id")),
        "title": doc.get("title", "Untitled Creation"),
        "tool_type": doc.get("tool_type", "text_generator"),
        "input_text": doc.get("input_text", ""),
        "output_text": doc.get("output_text", ""),
        "is_favorite": bool(doc.get("is_favorite", False)),
        "metadata": doc.get("metadata", {}),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None
    }


@content_bp.route("", methods=["GET"])
@login_required
def get_contents():
    user_id = session["user_id"]
    tool_type = request.args.get("tool_type", "").strip()
    is_favorite_param = request.args.get("is_favorite")
    search_query = request.args.get("search", "").strip()
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, max(1, int(request.args.get("limit", 12))))

    try:
        db = get_db()
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503

    query = {"user_id": user_id}

    if tool_type and tool_type in VALID_TOOL_TYPES:
        query["tool_type"] = tool_type

    if is_favorite_param is not None:
        if is_favorite_param.lower() in ("true", "1"):
            query["is_favorite"] = True
        elif is_favorite_param.lower() in ("false", "0"):
            query["is_favorite"] = False

    if search_query:
        # Regex search on title or input_text or output_text (case-insensitive)
        safe_regex = {"$regex": search_query, "$options": "i"}
        query["$or"] = [
            {"title": safe_regex},
            {"input_text": safe_regex},
            {"output_text": safe_regex}
        ]

    total_count = db.contents.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.contents.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = [serialize_content(doc) for doc in cursor]

    return jsonify({
        "items": items,
        "page": page,
        "limit": limit,
        "total": total_count,
        "pages": (total_count + limit - 1) // limit if total_count > 0 else 1
    }), 200


@content_bp.route("", methods=["POST"])
@login_required
def create_content():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}

    title = sanitize_string(data.get("title") or "Untitled Creation", max_length=150)
    tool_type = (data.get("tool_type") or "text_generator").strip().lower()
    input_text = sanitize_string(data.get("input_text") or "", max_length=20000)
    output_text = sanitize_string(data.get("output_text") or "", max_length=50000)
    is_favorite = bool(data.get("is_favorite", False))
    metadata = data.get("metadata") or {}

    if not output_text:
        return jsonify({"error": "Output content cannot be empty."}), 400

    if tool_type not in VALID_TOOL_TYPES:
        tool_type = "text_generator"

    now = datetime.now(timezone.utc)
    new_doc = {
        "user_id": user_id,
        "title": title,
        "tool_type": tool_type,
        "input_text": input_text,
        "output_text": output_text,
        "is_favorite": is_favorite,
        "metadata": metadata,
        "created_at": now,
        "updated_at": now
    }

    try:
        db = get_db()
        result = db.contents.insert_one(new_doc)
        new_doc["_id"] = result.inserted_id

        # Log activity
        db.activity_logs.insert_one({
            "user_id": user_id,
            "action": "created_content",
            "tool_type": tool_type,
            "content_id": str(result.inserted_id),
            "created_at": now
        })

        return jsonify({
            "message": "Content saved successfully.",
            "content": serialize_content(new_doc)
        }), 201
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Failed to save content: {str(e)}"}), 500


@content_bp.route("/<content_id>", methods=["GET"])
@login_required
def get_content_by_id(content_id):
    if not is_valid_object_id(content_id):
        return jsonify({"error": "Invalid content ID."}), 400

    user_id = session["user_id"]

    try:
        db = get_db()
        doc = db.contents.find_one({"_id": ObjectId(content_id), "user_id": user_id})
        if not doc:
            return jsonify({"error": "Content not found or unauthorized access."}), 404
        return jsonify({"content": serialize_content(doc)}), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@content_bp.route("/<content_id>", methods=["PUT"])
@login_required
def update_content(content_id):
    if not is_valid_object_id(content_id):
        return jsonify({"error": "Invalid content ID."}), 400

    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}

    update_fields = {}
    if "title" in data:
        update_fields["title"] = sanitize_string(data["title"], max_length=150)
    if "output_text" in data:
        update_fields["output_text"] = sanitize_string(data["output_text"], max_length=50000)
    if "is_favorite" in data:
        update_fields["is_favorite"] = bool(data["is_favorite"])

    if not update_fields:
        return jsonify({"error": "No valid fields provided for update."}), 400

    update_fields["updated_at"] = datetime.now(timezone.utc)

    try:
        db = get_db()
        result = db.contents.find_one_and_update(
            {"_id": ObjectId(content_id), "user_id": user_id},
            {"$set": update_fields},
            return_document=True
        )
        if not result:
            return jsonify({"error": "Content not found or unauthorized access."}), 404
        return jsonify({
            "message": "Content updated successfully.",
            "content": serialize_content(result)
        }), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@content_bp.route("/<content_id>", methods=["DELETE"])
@login_required
def delete_content(content_id):
    if not is_valid_object_id(content_id):
        return jsonify({"error": "Invalid content ID."}), 400

    user_id = session["user_id"]

    try:
        db = get_db()
        result = db.contents.delete_one({"_id": ObjectId(content_id), "user_id": user_id})
        if result.deleted_count == 0:
            return jsonify({"error": "Content not found or already deleted."}), 404

        # Log activity
        db.activity_logs.insert_one({
            "user_id": user_id,
            "action": "deleted_content",
            "content_id": content_id,
            "created_at": datetime.now(timezone.utc)
        })

        return jsonify({"message": "Content deleted successfully."}), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@content_bp.route("/<content_id>/favorite", methods=["PATCH"])
@login_required
def toggle_favorite(content_id):
    if not is_valid_object_id(content_id):
        return jsonify({"error": "Invalid content ID."}), 400

    user_id = session["user_id"]

    try:
        db = get_db()
        doc = db.contents.find_one({"_id": ObjectId(content_id), "user_id": user_id})
        if not doc:
            return jsonify({"error": "Content not found or unauthorized."}), 404

        new_status = not doc.get("is_favorite", False)
        db.contents.update_one(
            {"_id": ObjectId(content_id)},
            {"$set": {"is_favorite": new_status, "updated_at": datetime.now(timezone.utc)}}
        )

        return jsonify({
            "message": "Favorite status updated.",
            "is_favorite": new_status
        }), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@content_bp.route("/clear-all", methods=["DELETE"])
@login_required
def clear_all_history():
    user_id = session["user_id"]
    try:
        db = get_db()
        del_res = db.contents.delete_many({"user_id": user_id})
        db.activity_logs.delete_many({"user_id": user_id})
        return jsonify({
            "message": f"Cleared {del_res.deleted_count} items from history.",
            "deleted_count": del_res.deleted_count
        }), 200
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

