"""
Repository Routes  (/api/repos/...)
"""
import json
import logging
from flask import Blueprint, request, jsonify
from backend.models.database import (
    create_repository, get_repos_by_user, get_repo_by_id,
    delete_repository, get_question_count_by_repo, get_db
)
from backend.services.github_service import parse_github_url, build_repo_context
from backend.services.groq_service   import generate_summary
from backend.utils.auth_utils        import login_required, current_user_id

logger   = logging.getLogger(__name__)
repos_bp = Blueprint("repos", __name__)


@repos_bp.route("/", methods=["GET"])
@login_required
def list_repos():
    repos    = get_repos_by_user(current_user_id())
    q_counts = get_question_count_by_repo(current_user_id())
    for r in repos:
        r["question_count"] = q_counts.get(r["id"], 0)
    return jsonify(repos)


@repos_bp.route("/", methods=["POST"])
@login_required
def analyse_repo():
    url = (request.get_json() or {}).get("url", "").strip()
    if not url:
        return jsonify({"error": "GitHub URL is required"}), 400

    try:
        owner, repo_name = parse_github_url(url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        context, file_list, meta = build_repo_context(owner, repo_name)
    except Exception as e:
        logger.error(f"GitHub fetch failed: {e}")
        return jsonify({"error": f"Could not fetch repository: {str(e)}"}), 400

    if not file_list:
        return jsonify({"error": "No readable files found in this repository."}), 400

    try:
        summary = generate_summary(f"{owner}/{repo_name}", context)
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        summary = "Summary not yet generated. Click 'Generate Summary' in the Summary tab."

    try:
        repo_id = create_repository(
            user_id        = current_user_id(),
            github_url     = url,
            owner          = owner,
            name           = repo_name,
            description    = meta.get("description", ""),
            summary        = summary,
            file_list_json = json.dumps(file_list),
            context        = context,
            file_count     = len(file_list),
            language       = meta.get("language", ""),
            stars          = meta.get("stars", 0),
        )
    except Exception as e:
        logger.error(f"Database save failed: {e}")
        return jsonify({"error": f"Failed to save repository: {str(e)}"}), 500

    return jsonify({
        "id":         repo_id,
        "owner":      owner,
        "name":       repo_name,
        "summary":    summary,
        "file_list":  file_list,
        "file_count": len(file_list),
        "meta":       meta,
    }), 201


@repos_bp.route("/<repo_id>", methods=["GET"])
@login_required
def get_repo(repo_id):
    repo = get_repo_by_id(repo_id, current_user_id())
    if not repo:
        return jsonify({"error": "Repository not found"}), 404
    repo["file_list"] = json.loads(repo.get("file_list") or "[]")
    return jsonify(repo)


@repos_bp.route("/<repo_id>", methods=["DELETE"])
@login_required
def delete_repo(repo_id):
    delete_repository(repo_id, current_user_id())
    return jsonify({"message": "Repository deleted"})


@repos_bp.route("/<repo_id>/summary", methods=["POST"])
@login_required
def regenerate_summary(repo_id):
    """Regenerate the AI summary on demand."""
    repo = get_repo_by_id(repo_id, current_user_id())
    if not repo:
        return jsonify({"error": "Repository not found"}), 404

    context = repo.get("context") or ""
    if not context.strip():
        return jsonify({"error": "No code context found. Please delete and re-analyse this repository."}), 400

    try:
        summary = generate_summary(f"{repo['owner']}/{repo['name']}", context)
    except Exception as e:
        logger.error(f"Summary regeneration failed: {e}")
        return jsonify({"error": str(e)}), 500

    with get_db() as conn:
        conn.execute("UPDATE repositories SET summary=? WHERE id=?", (summary, repo_id))

    return jsonify({"summary": summary})


@repos_bp.route("/<repo_id>/search", methods=["GET"])
@login_required
def search_files(repo_id):
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify([])
    repo = get_repo_by_id(repo_id, current_user_id())
    if not repo:
        return jsonify({"error": "Not found"}), 404

    context   = repo.get("context") or ""
    file_list = json.loads(repo.get("file_list") or "[]")
    results   = []

    for path in file_list:
        marker = f"### File: {path}\n"
        start  = context.find(marker)
        if start == -1:
            continue
        next_m  = context.find("### File:", start + len(marker))
        snippet = context[start: next_m if next_m != -1 else start + 2000]
        if query in snippet.lower():
            idx     = snippet.lower().find(query)
            excerpt = snippet[max(0, idx - 80): idx + 200].strip()
            results.append({"file": path, "excerpt": excerpt})
        if len(results) >= 15:
            break

    return jsonify(results)