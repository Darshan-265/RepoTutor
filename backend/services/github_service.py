"""
GitHub Service
Handles all communication with the GitHub REST API:
fetching repo metadata, file trees, and individual file contents.
"""
import base64
import requests
from backend.config import (
    GITHUB_TOKEN, ALLOWED_EXTENSIONS,
    MAX_FILES, MAX_FILE_SIZE_BYTES, MAX_CONTENT_CHARS
)


def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL."""
    url = url.strip().rstrip("/").removesuffix(".git")
    url = url.replace("https://github.com/", "").replace("http://github.com/", "")
    parts = url.split("/")
    if len(parts) < 2:
        raise ValueError("Invalid GitHub URL. Use: https://github.com/owner/repo")
    return parts[0], parts[1]


def get_repo_meta(owner: str, repo: str) -> dict:
    """Fetch basic repository metadata."""
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}",
        headers=_headers(), timeout=15
    )
    if resp.status_code == 404:
        raise ValueError(f"Repository '{owner}/{repo}' not found or is private.")
    resp.raise_for_status()
    data = resp.json()
    return {
        "description": data.get("description") or "",
        "language":    data.get("language") or "",
        "stars":       data.get("stargazers_count", 0),
        "forks":       data.get("forks_count", 0),
    }


def get_file_tree(owner: str, repo: str) -> list[dict]:
    """Return a filtered list of eligible files from the repo tree."""
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
        headers=_headers(), timeout=30
    )
    if resp.status_code == 404:
        raise ValueError(f"Repository '{owner}/{repo}' not found or is private.")
    resp.raise_for_status()

    tree = resp.json().get("tree", [])
    return [
        item for item in tree
        if item["type"] == "blob"
        and _allowed_ext(item["path"])
        and item.get("size", 0) < MAX_FILE_SIZE_BYTES
    ][:MAX_FILES]


def get_file_content(owner: str, repo: str, path: str) -> str | None:
    """Fetch and decode a single file's content."""
    resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
        headers=_headers(), timeout=15
    )
    if resp.status_code != 200:
        return None
    try:
        content = base64.b64decode(resp.json()["content"]).decode("utf-8", errors="replace")
        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS] + "\n... [truncated]"
        return content
    except Exception:
        return None


def build_repo_context(owner: str, repo: str) -> tuple[str, list[str], dict]:
    """
    Fetch all eligible files and build:
    - context str   : full text for the LLM
    - file_list     : list of file paths
    - meta          : repo metadata dict
    """
    meta      = get_repo_meta(owner, repo)
    files     = get_file_tree(owner, repo)
    parts     = []
    file_list = []

    for i, file_info in enumerate(files):
        path    = file_info["path"]
        content = get_file_content(owner, repo, path)
        if not content or not content.strip():
            continue
        file_list.append(path)
        parts.append(f"### File: {path}\n```\n{content}\n```")

    return "\n\n".join(parts), file_list, meta


def _allowed_ext(path: str) -> bool:
    import os
    _, ext = os.path.splitext(path.lower())
    return ext in ALLOWED_EXTENSIONS
