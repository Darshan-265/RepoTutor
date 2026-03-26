"""
Auth Routes  (/api/auth/...)
Register, login, logout, session check, profile update, theme preference.
"""
from flask import Blueprint, request, jsonify, session
from backend.models.database import (
    create_user, get_user_by_email, verify_user, get_user_by_id,
    update_user_profile, update_user_password, verify_user_password,
    get_preference, set_preference
)
from backend.utils.auth_utils import set_session, clear_session, current_user_id

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    pwd   = data.get("password", "")
    if not email or not pwd:
        return jsonify({"error": "Email and password are required"}), 400
    if len(pwd) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if get_user_by_email(email):
        return jsonify({"error": "This email is already registered"}), 400
    create_user(email, pwd)
    return jsonify({"message": "Account created! Please sign in."}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    pwd   = data.get("password", "")
    user  = verify_user(email, pwd)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    set_session(user["id"], user["email"])
    prefs = get_preference(user["id"])
    return jsonify({"message": "Logged in", "email": user["email"],
                    "name": user["name"] or "", "theme": prefs.get("theme", "dark")})


@auth_bp.route("/logout", methods=["POST"])
def logout():
    clear_session()
    return jsonify({"message": "Logged out"})


@auth_bp.route("/me")
def me():
    uid = current_user_id()
    if not uid:
        return jsonify({"authenticated": False})
    user  = get_user_by_id(uid)
    prefs = get_preference(uid)
    if not user:
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "email": user["email"],
        "name":  user["name"] or "",
        "avatar_color": user["avatar_color"] or "#6c63ff",
        "theme": prefs.get("theme", "dark"),
        "created_at": user["created_at"],
    })


@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    uid  = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    data         = request.get_json() or {}
    name         = data.get("name", "").strip()
    avatar_color = data.get("avatar_color", "#6c63ff")
    update_user_profile(uid, name, avatar_color)
    return jsonify({"message": "Profile updated"})


@auth_bp.route("/password", methods=["PUT"])
def change_password():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    data     = request.get_json() or {}
    old_pwd  = data.get("old_password", "")
    new_pwd  = data.get("new_password", "")
    if not verify_user_password(uid, old_pwd):
        return jsonify({"error": "Current password is incorrect"}), 400
    if len(new_pwd) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    update_user_password(uid, new_pwd)
    return jsonify({"message": "Password changed successfully"})


@auth_bp.route("/theme", methods=["PUT"])
def update_theme():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    theme = (request.get_json() or {}).get("theme", "dark")
    if theme not in ("dark", "light"):
        return jsonify({"error": "Invalid theme"}), 400
    set_preference(uid, "theme", theme)
    return jsonify({"message": "Theme updated", "theme": theme})
