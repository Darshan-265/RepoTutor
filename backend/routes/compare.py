"""
Repo Comparison Routes (/api/compare/...)
Compare two repositories side by side using AI.
"""
import json, logging
from flask import Blueprint, request, jsonify, Response, stream_with_context
from backend.models.database import get_repo_by_id
from backend.services.groq_service import get_client, GROQ_MODEL, MAX_TOKENS
from backend.utils.auth_utils import login_required, current_user_id

logger     = logging.getLogger(__name__)
compare_bp = Blueprint("compare", __name__)


def _build_comparison_prompt(repo1, repo2):
    ctx1 = (repo1.get("context") or "")[:6000]
    ctx2 = (repo2.get("context") or "")[:6000]
    name1 = f"{repo1['owner']}/{repo1['name']}"
    name2 = f"{repo2['owner']}/{repo2['name']}"
    return f"""You are RepoTutor comparing two GitHub repositories side by side.

Repository A: {name1}
Files: {repo1.get('file_count', 0)} | Language: {repo1.get('language', 'Unknown')} | Stars: {repo1.get('stars', 0)}
--- CODE A ---
{ctx1}
--- END A ---

Repository B: {name2}
Files: {repo2.get('file_count', 0)} | Language: {repo2.get('language', 'Unknown')} | Stars: {repo2.get('stars', 0)}
--- CODE B ---
{ctx2}
--- END B ---

Compare these two repositories in detail using markdown. Cover:
## Overview
Brief description of each repo and their purpose.

## Tech Stack
Languages, frameworks, and libraries used in each.

## Architecture
How each project is structured and organised.

## Code Quality
Comments, documentation, testing, folder structure.

## Key Differences
The most important differences between the two projects.

## Which is Better For...
When you would choose one over the other.

Be specific and reference actual files and code where possible."""


@compare_bp.route("/", methods=["POST"])
@login_required
def compare_repos():
    data    = request.get_json() or {}
    repo1_id = data.get("repo1_id")
    repo2_id = data.get("repo2_id")

    if not repo1_id or not repo2_id:
        return jsonify({"error": "Both repo1_id and repo2_id are required"}), 400
    if repo1_id == repo2_id:
        return jsonify({"error": "Please select two different repositories"}), 400

    uid   = current_user_id()
    repo1 = get_repo_by_id(repo1_id, uid)
    repo2 = get_repo_by_id(repo2_id, uid)

    if not repo1:
        return jsonify({"error": "Repository 1 not found"}), 404
    if not repo2:
        return jsonify({"error": "Repository 2 not found"}), 404

    prompt = _build_comparison_prompt(repo1, repo2)

    def generate():
        try:
            stream = get_client().chat.completions.create(
                model    = GROQ_MODEL,
                messages = [{"role": "user", "content": prompt}],
                max_tokens  = 1500,
                temperature = 0.3,
                stream      = True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    import json as _json
                    yield f"data: {_json.dumps({'token': token})}\n\n"
            yield f"data: {_json.dumps({'done': True})}\n\n"
        except Exception as e:
            import json as _json
            logger.error(f"Compare error: {e}")
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype = "text/event-stream",
        headers  = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )