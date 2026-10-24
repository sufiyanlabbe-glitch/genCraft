"""
CreatorAI – Dashboard Routes
Provides statistical summaries, breakdown by tool, and recent creations for the current user.
"""
from flask import Blueprint, jsonify, session
from bson import ObjectId

from database.mongo import get_db, DatabaseError
from utils.validators import login_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    user_id = session["user_id"]
    try:
        db = get_db()
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503

    try:
        total_creations = db.contents.count_documents({"user_id": user_id})
        total_favorites = db.contents.count_documents({"user_id": user_id, "is_favorite": True})

        # Aggregation by tool_type
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$tool_type", "count": {"$sum": 1}}}
        ]
        tool_counts_raw = list(db.contents.aggregate(pipeline))
        tool_breakdown = {item["_id"]: item["count"] for item in tool_counts_raw if item["_id"]}

        # Count activities in last 7 days or total logs
        total_activities = db.activity_logs.count_documents({"user_id": user_id})

        return jsonify({
            "total_creations": total_creations,
            "total_favorites": total_favorites,
            "total_activities": total_activities,
            "tool_breakdown": {
                "text_generator": tool_breakdown.get("text_generator", 0),
                "summarizer": tool_breakdown.get("summarizer", 0),
                "caption_generator": tool_breakdown.get("caption_generator", 0),
                "rewriter": tool_breakdown.get("rewriter", 0),
                "image_generator": tool_breakdown.get("image_generator", 0),
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to calculate stats: {str(e)}"}), 500


@dashboard_bp.route("/recent", methods=["GET"])
@login_required
def get_recent():
    user_id = session["user_id"]
    try:
        db = get_db()
    except DatabaseError as e:
        return jsonify({"error": str(e)}), 503

    try:
        cursor = db.contents.find({"user_id": user_id}).sort("created_at", -1).limit(6)
        recent_items = []
        for doc in cursor:
            recent_items.append({
                "id": str(doc["_id"]),
                "title": doc.get("title", "Untitled Creation"),
                "tool_type": doc.get("tool_type", "text_generator"),
                "output_text": doc.get("output_text", "")[:120] + ("..." if len(doc.get("output_text", "")) > 120 else ""),
                "is_favorite": bool(doc.get("is_favorite", False)),
                "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None
            })

        return jsonify({"recent": recent_items}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve recent items: {str(e)}"}), 500

