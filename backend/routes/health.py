"""Health Score Routes (/api/health/...)"""
import json, uuid, logging
from datetime import datetime
from flask import Blueprint, jsonify
from backend.models.database import get_repo_by_id, get_db
from backend.services.health_service import analyse_health
from backend.utils.auth_utils import login_required, current_user_id

logger    = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/<repo_id>", methods=["GET"])
@login_required
def get_health(repo_id):
    try:
        uid  = current_user_id()
        repo = get_repo_by_id(repo_id, uid)
        if not repo:
            return jsonify({"error": "Repository not found"}), 404

        # Return cached score if exists
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM health_scores WHERE repo_id=? AND user_id=?",
                (repo_id, uid)
            ).fetchone()
        if row:
            data = json.loads(row["breakdown"])
            data["cached"] = True
            return jsonify(data)

        # Calculate fresh
        file_list = json.loads(repo.get("file_list") or "[]")
        context   = repo.get("context") or ""
        result    = analyse_health(file_list, context)

        with get_db() as conn:
            conn.execute(
                "INSERT INTO health_scores VALUES (?,?,?,?,?,?)",
                (str(uuid.uuid4()), repo_id, uid,
                 result["score"], json.dumps(result), datetime.utcnow().isoformat())
            )
        result["cached"] = False
        return jsonify(result)

    except Exception as e:
        logger.error(f"Health score error: {e}")
        return jsonify({"error": str(e)}), 500


@health_bp.route("/<repo_id>/refresh", methods=["POST"])
@login_required
def refresh_health(repo_id):
    try:
        uid  = current_user_id()
        repo = get_repo_by_id(repo_id, uid)
        if not repo:
            return jsonify({"error": "Repository not found"}), 404

        file_list = json.loads(repo.get("file_list") or "[]")
        result    = analyse_health(file_list, repo.get("context") or "")

        with get_db() as conn:
            conn.execute("DELETE FROM health_scores WHERE repo_id=? AND user_id=?", (repo_id, uid))
            conn.execute(
                "INSERT INTO health_scores VALUES (?,?,?,?,?,?)",
                (str(uuid.uuid4()), repo_id, uid,
                 result["score"], json.dumps(result), datetime.utcnow().isoformat())
            )
        result["cached"] = False
        return jsonify(result)

    except Exception as e:
        logger.error(f"Health refresh error: {e}")
        return jsonify({"error": str(e)}), 500