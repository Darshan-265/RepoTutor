"""
Chat Routes  (/api/chat/...)
"""
import json
import logging
from flask import Blueprint, request, jsonify, Response, stream_with_context
from backend.models.database import (
    get_repo_by_id, save_message, get_messages,
    get_recent_messages, clear_messages,
    save_bookmark, get_bookmarks, delete_bookmark,
    log_question, get_top_questions
)
from backend.services.groq_service import stream_answer, generate_summary
from backend.utils.auth_utils import login_required, current_user_id

logger  = logging.getLogger(__name__)
chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/<repo_id>/messages", methods=["GET"])
@login_required
def get_chat(repo_id):
    if not get_repo_by_id(repo_id, current_user_id()):
        return jsonify({"error": "Repository not found"}), 404
    return jsonify(get_messages(repo_id))


@chat_bp.route("/<repo_id>/messages", methods=["POST"])
@login_required
def send_message(repo_id):
    question = ((request.get_json() or {}).get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400

    uid  = current_user_id()
    repo = get_repo_by_id(repo_id, uid)
    if not repo:
        return jsonify({"error": "Repository not found"}), 404

    history = get_recent_messages(repo_id)
    log_question(uid, repo_id, question)
    save_message(repo_id, "user", question)

    def generate():
        full_answer = []
        try:
            for token in stream_answer(
                repo_name = f"{repo['owner']}/{repo['name']}",
                context   = repo["context"] or "",
                question  = question,
                history   = history,
            ):
                full_answer.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            answer = "".join(full_answer)
            if answer:
                save_message(repo_id, "assistant", answer)
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            # Try non-streaming fallback
            try:
                from backend.services.groq_service import answer_question
                answer = answer_question(
                    repo_name = f"{repo['owner']}/{repo['name']}",
                    context   = repo["context"] or "",
                    question  = question,
                    history   = history,
                )
                save_message(repo_id, "assistant", answer)
                yield f"data: {json.dumps({'token': answer})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e2:
                logger.error(f"Fallback also failed: {e2}")
                yield f"data: {json.dumps({'error': str(e2)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype    = "text/event-stream",
        headers     = {
            "Cache-Control":   "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":      "keep-alive",
        }
    )


@chat_bp.route("/<repo_id>/messages", methods=["DELETE"])
@login_required
def clear_chat(repo_id):
    if not get_repo_by_id(repo_id, current_user_id()):
        return jsonify({"error": "Repository not found"}), 404
    clear_messages(repo_id)
    return jsonify({"message": "Conversation cleared"})


@chat_bp.route("/<repo_id>/top-questions", methods=["GET"])
@login_required
def top_questions(repo_id):
    return jsonify(get_top_questions(current_user_id(), repo_id))


@chat_bp.route("/<repo_id>/bookmarks", methods=["POST"])
@login_required
def add_bookmark(repo_id):
    uid  = current_user_id()
    repo = get_repo_by_id(repo_id, uid)
    if not repo:
        return jsonify({"error": "Repository not found"}), 404
    data = request.get_json() or {}
    save_bookmark(uid, repo_id, f"{repo['owner']}/{repo['name']}",
                  data.get("question", ""), data.get("answer", ""))
    return jsonify({"message": "Bookmarked"})


@chat_bp.route("/bookmarks", methods=["GET"])
@login_required
def list_bookmarks():
    return jsonify(get_bookmarks(current_user_id()))


@chat_bp.route("/bookmarks/<bookmark_id>", methods=["DELETE"])
@login_required
def remove_bookmark(bookmark_id):
    delete_bookmark(bookmark_id, current_user_id())
    return jsonify({"message": "Deleted"})


@chat_bp.route("/followups", methods=["POST"])
@login_required
def generate_followups():
    """Generate 3 smart follow-up questions based on the last AI answer."""
    data      = request.get_json() or {}
    answer    = data.get("answer", "")
    repo_name = data.get("repo_name", "this repository")
    if not answer:
        return jsonify({"questions": []})
    try:
        from backend.services.groq_service import get_client, GROQ_MODEL
        resp = get_client().chat.completions.create(
            model    = GROQ_MODEL,
            messages = [
                {"role": "system", "content":
                    "You generate short follow-up questions for a code Q&A chat. "
                    "Return ONLY a JSON array of exactly 3 short questions (max 10 words each). "
                    "No explanations. No markdown. Just the JSON array."},
                {"role": "user", "content":
                    f"Based on this answer about {repo_name}, suggest 3 follow-up questions:\n\n{answer}"}
            ],
            max_tokens  = 120,
            temperature = 0.7,
        )
        import json as _json
        text = resp.choices[0].message.content.strip()
        # Extract JSON array
        start = text.find('[')
        end   = text.rfind(']') + 1
        if start != -1 and end > start:
            questions = _json.loads(text[start:end])
            return jsonify({"questions": questions[:3]})
        return jsonify({"questions": []})
    except Exception as e:
        logger.error(f"Follow-up generation failed: {e}")
        return jsonify({"questions": []})