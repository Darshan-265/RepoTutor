"""RepoTutor v2 — Entry Point"""
import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from backend.models.database import init_db
from backend.routes.auth         import auth_bp
from backend.routes.repos        import repos_bp
from backend.routes.chat         import chat_bp
from backend.routes.health       import health_bp
from backend.routes.subscription import sub_bp
from backend.routes.compare      import compare_bp
from backend.routes.bugs         import bugs_bp
from backend.routes.activity     import activity_bp

def create_app():
    app = Flask(__name__, static_folder="frontend", static_url_path="")
    app.secret_key = os.environ.get("SECRET_KEY", "repotutor-secret-v2")
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_PERMANENT']       = False
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(repos_bp,     url_prefix="/api/repos")
    app.register_blueprint(chat_bp,      url_prefix="/api/chat")
    app.register_blueprint(health_bp,    url_prefix="/api/health")
    app.register_blueprint(sub_bp,       url_prefix="/api/subscription")
    app.register_blueprint(compare_bp,   url_prefix="/api/compare")
    app.register_blueprint(bugs_bp,      url_prefix="/api/bugs")
    app.register_blueprint(activity_bp,  url_prefix="/api/activity")

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": str(e)}), 500

    @app.route("/", methods=["GET"])
    def index():
        return send_from_directory("frontend", "index.html")

    @app.route("/<path:path>", methods=["GET"])
    def serve(path):
        full = os.path.join("frontend", path)
        if os.path.exists(full):
            return send_from_directory("frontend", path)
        return send_from_directory("frontend", "index.html")

    return app

if __name__ == "__main__":
    init_db()
    print("\nRepoTutor v2 -> http://localhost:8080\n")
    app = create_app()
    app.run(host="127.0.0.1", port=8080, debug=True)