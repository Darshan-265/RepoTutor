"""
Auth Utilities — session helpers and login_required decorator
"""
from functools import wraps
from flask import session, jsonify


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated

def current_user_id():
    return session.get("user_id")

def current_email():
    return session.get("email")

def set_session(user_id, email):
    session["user_id"] = user_id
    session["email"]   = email

def clear_session():
    session.clear()
