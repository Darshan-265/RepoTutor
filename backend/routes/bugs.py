"""
Bug Hunter Routes (/api/bugs/...)
Scans repository code for bugs, security issues, and bad practices.
"""
import json, logging
from flask import Blueprint, request, jsonify, Response, stream_with_context
from backend.models.database import get_repo_by_id
from backend.services.groq_service import get_client, GROQ_MODEL
from backend.utils.auth_utils import login_required, current_user_id

logger  = logging.getLogger(__name__)
bugs_bp = Blueprint("bugs", __name__)


def _bug_prompt(repo_name, context):
    return f"""You are an expert code reviewer and security engineer analysing the repository: {repo_name}

Carefully scan the following code for:
1. Security vulnerabilities (SQL injection, XSS, hardcoded secrets, insecure auth)
2. Potential bugs (null pointer, off-by-one, race conditions, unhandled exceptions)
3. Bad practices (no input validation, missing error handling, poor structure)
4. Performance issues (N+1 queries, memory leaks, blocking calls)

--- REPOSITORY CODE ---
{context[:14000]}
--- END ---

Respond in this EXACT markdown format:

## Bug Hunter Report — {repo_name}

### Critical Issues
List critical security vulnerabilities. For each:
**[CRITICAL]** `filename.py` — Description of the issue and why it is dangerous.

### Warnings
List potential bugs and bad practices. For each:
**[WARNING]** `filename.py` — Description of the issue.

### Suggestions
List improvements and best practices. For each:
**[SUGGESTION]** `filename.py` — What to improve and how.

### Summary
Total issues found: X critical, Y warnings, Z suggestions.
Overall code safety score: X/10

If the code looks clean, say so honestly. Be specific — reference actual variable names, function names, and line patterns you see."""


@bugs_bp.route("/<repo_id>", methods=["POST"])
@login_required
def scan_bugs(repo_id):
    uid  = current_user_id()
    repo = get_repo_by_id(repo_id, uid)
    if not repo:
        return jsonify({"error": "Repository not found"}), 404

    context   = repo.get("context") or ""
    repo_name = f"{repo['owner']}/{repo['name']}"

    def generate():
        try:
            stream = get_client().chat.completions.create(
                model    = GROQ_MODEL,
                messages = [{"role": "user", "content": _bug_prompt(repo_name, context)}],
                max_tokens  = 1500,
                temperature = 0.2,
                stream      = True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    import json as _j
                    yield f"data: {_j.dumps({'token': token})}\n\n"
            import json as _j
            yield f"data: {_j.dumps({'done': True})}\n\n"
        except Exception as e:
            import json as _j
            logger.error(f"Bug scan error: {e}")
            yield f"data: {_j.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype = "text/event-stream",
        headers  = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )