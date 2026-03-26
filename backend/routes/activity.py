"""
Live GitHub Activity Routes (/api/activity/...)
Fetches real-time GitHub events and summarises them with AI.
"""
import logging, requests
from flask import Blueprint, jsonify
from backend.models.database import get_repo_by_id
from backend.services.groq_service import get_client, GROQ_MODEL
from backend.config import GITHUB_TOKEN
from backend.utils.auth_utils import login_required, current_user_id

logger      = logging.getLogger(__name__)
activity_bp = Blueprint("activity", __name__)


def _gh_headers():
    h = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def _summarise_event(event):
    """Convert a raw GitHub event into a human-readable summary."""
    etype  = event.get("type", "")
    actor  = event.get("actor", {}).get("login", "Someone")
    payload = event.get("payload", {})

    if etype == "PushEvent":
        commits = payload.get("commits", [])
        count   = len(commits)
        msg     = commits[0].get("message", "")[:60] if commits else ""
        return f"{actor} pushed {count} commit(s) — \"{msg}\""

    elif etype == "IssuesEvent":
        action = payload.get("action", "")
        title  = payload.get("issue", {}).get("title", "")[:60]
        return f"{actor} {action} issue: \"{title}\""

    elif etype == "PullRequestEvent":
        action = payload.get("action", "")
        title  = payload.get("pull_request", {}).get("title", "")[:60]
        return f"{actor} {action} PR: \"{title}\""

    elif etype == "IssueCommentEvent":
        title = payload.get("issue", {}).get("title", "")[:40]
        return f"{actor} commented on \"{title}\""

    elif etype == "CreateEvent":
        ref_type = payload.get("ref_type", "branch")
        ref      = payload.get("ref", "")
        return f"{actor} created {ref_type} \"{ref}\""

    elif etype == "DeleteEvent":
        ref_type = payload.get("ref_type", "branch")
        ref      = payload.get("ref", "")
        return f"{actor} deleted {ref_type} \"{ref}\""

    elif etype == "ForkEvent":
        return f"{actor} forked this repository"

    elif etype == "WatchEvent":
        return f"{actor} starred this repository"

    elif etype == "ReleaseEvent":
        name = payload.get("release", {}).get("name", "")[:40]
        return f"{actor} published release \"{name}\""

    return f"{actor} performed {etype.replace('Event', '')}"


def _ai_insight(events_text, repo_name):
    """Get a short AI insight about recent activity."""
    try:
        resp = get_client().chat.completions.create(
            model    = GROQ_MODEL,
            messages = [{
                "role": "user",
                "content": (
                    f"Based on this recent GitHub activity for {repo_name}:\n\n{events_text}\n\n"
                    "Write a 2-3 sentence insight about what the team is currently working on, "
                    "any patterns you notice, and the overall project health. Be concise and specific."
                )
            }],
            max_tokens  = 150,
            temperature = 0.4,
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.error(f"AI insight error: {e}")
        return None


@activity_bp.route("/<repo_id>", methods=["GET"])
@login_required
def get_activity(repo_id):
    uid  = current_user_id()
    repo = get_repo_by_id(repo_id, uid)
    if not repo:
        return jsonify({"error": "Repository not found"}), 404

    owner = repo["owner"]
    name  = repo["name"]

    # Fetch commits
    try:
        commits_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{name}/commits?per_page=10",
            headers=_gh_headers(), timeout=10
        )
        commits = commits_resp.json() if commits_resp.status_code == 200 else []
    except Exception:
        commits = []

    # Fetch events
    try:
        events_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{name}/events?per_page=15",
            headers=_gh_headers(), timeout=10
        )
        events = events_resp.json() if events_resp.status_code == 200 else []
        if not isinstance(events, list):
            events = []
    except Exception:
        events = []

    # Fetch issues
    try:
        issues_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{name}/issues?state=open&per_page=5",
            headers=_gh_headers(), timeout=10
        )
        issues = issues_resp.json() if issues_resp.status_code == 200 else []
        if not isinstance(issues, list):
            issues = []
    except Exception:
        issues = []

    # Build commit list
    commit_list = []
    for c in commits[:8]:
        commit_list.append({
            "sha":     c.get("sha", "")[:7],
            "message": c.get("commit", {}).get("message", "").split("\n")[0][:80],
            "author":  c.get("commit", {}).get("author", {}).get("name", "Unknown"),
            "date":    c.get("commit", {}).get("author", {}).get("date", ""),
            "url":     c.get("html_url", ""),
        })

    # Build events list
    event_list = []
    for e in events[:12]:
        summary = _summarise_event(e)
        event_list.append({
            "type":    e.get("type", "").replace("Event", ""),
            "summary": summary,
            "date":    e.get("created_at", ""),
            "actor":   e.get("actor", {}).get("login", ""),
            "avatar":  e.get("actor", {}).get("avatar_url", ""),
        })

    # Build issues list
    issue_list = []
    for i in issues[:5]:
        issue_list.append({
            "number": i.get("number"),
            "title":  i.get("title", "")[:80],
            "user":   i.get("user", {}).get("login", ""),
            "url":    i.get("html_url", ""),
            "labels": [l.get("name") for l in i.get("labels", [])],
            "date":   i.get("created_at", ""),
        })

    # Get AI insight
    events_text = "\n".join([e["summary"] for e in event_list[:8]])
    insight     = _ai_insight(events_text, f"{owner}/{name}") if event_list else None

    return jsonify({
        "repo":    f"{owner}/{name}",
        "commits": commit_list,
        "events":  event_list,
        "issues":  issue_list,
        "insight": insight,
    })