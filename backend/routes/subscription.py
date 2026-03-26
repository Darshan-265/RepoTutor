"""Subscription Routes (/api/subscription/...)"""
import logging
from flask import Blueprint, jsonify, request
from backend.models.database import get_db, get_repos_by_user, get_question_count_by_repo
from backend.utils.auth_utils import login_required, current_user_id
from backend.config import FREE_MAX_REPOS, FREE_MAX_QUESTIONS, PRO_PRICE_MONTHLY

logger = logging.getLogger(__name__)
sub_bp = Blueprint("subscription", __name__)

PLANS = {
    "free": {
        "name": "Free", "price": "0", "period": "forever",
        "max_repos": FREE_MAX_REPOS, "max_questions": FREE_MAX_QUESTIONS,
        "features": [
            "Up to " + str(FREE_MAX_REPOS) + " repositories",
            str(FREE_MAX_QUESTIONS) + " questions per day",
            "Code Health Score",
            "File viewer",
            "Bookmarks",
            "Chat export PDF",
        ],
        "locked": [
            "Unlimited repositories",
            "Unlimited questions",
            "Priority AI responses",
        ]
    },
    "pro": {
        "name": "Pro", "price": PRO_PRICE_MONTHLY, "period": "month",
        "max_repos": 999, "max_questions": 999,
        "features": [
            "Unlimited repositories",
            "Unlimited questions",
            "Code Health Score",
            "File viewer",
            "Bookmarks",
            "Chat export PDF",
            "Priority AI responses",
        ],
        "locked": []
    }
}


@sub_bp.route("/", methods=["GET"])
@login_required
def get_plan():
    try:
        uid = current_user_id()
        with get_db() as conn:
            user = conn.execute("SELECT plan FROM users WHERE id=?", (uid,)).fetchone()
        plan      = "free"
        if user and user["plan"]:
            plan = user["plan"]
        plan_info = PLANS.get(plan, PLANS["free"])
        repos     = get_repos_by_user(uid)
        q_counts  = get_question_count_by_repo(uid)
        return jsonify({
            "plan":     plan,
            "plan_info": plan_info,
            "plans":    PLANS,
            "usage":    {"repos": len(repos), "questions": sum(q_counts.values())},
            "limits":   {"repos": plan_info["max_repos"], "questions": plan_info["max_questions"]},
        })
    except Exception as e:
        logger.error(f"Subscription get_plan error: {e}")
        return jsonify({"error": str(e)}), 500


@sub_bp.route("/upgrade", methods=["POST"])
@login_required
def upgrade():
    try:
        uid  = current_user_id()
        plan = (request.get_json() or {}).get("plan", "pro")
        if plan not in PLANS:
            return jsonify({"error": "Invalid plan"}), 400
        with get_db() as conn:
            conn.execute("UPDATE users SET plan=? WHERE id=?", (plan, uid))
        return jsonify({
            "message":   "Switched to " + plan.capitalize() + " plan!",
            "plan":      plan,
            "plan_info": PLANS[plan],
        })
    except Exception as e:
        logger.error(f"Subscription upgrade error: {e}")
        return jsonify({"error": str(e)}), 500


@sub_bp.route("/check/<resource>", methods=["GET"])
@login_required
def check_limit(resource):
    try:
        uid = current_user_id()
        with get_db() as conn:
            user = conn.execute("SELECT plan FROM users WHERE id=?", (uid,)).fetchone()
        plan      = (user["plan"] if user and user["plan"] else "free")
        plan_info = PLANS.get(plan, PLANS["free"])
        if resource == "repos":
            current = len(get_repos_by_user(uid))
            limit   = plan_info["max_repos"]
        else:
            current = sum(get_question_count_by_repo(uid).values())
            limit   = plan_info["max_questions"]
        return jsonify({"allowed": current < limit, "current": current, "limit": limit, "plan": plan})
    except Exception as e:
        logger.error(f"Check limit error: {e}")
        return jsonify({"error": str(e)}), 500