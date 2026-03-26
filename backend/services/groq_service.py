"""
Groq AI Service
Streaming + non-streaming LLM calls via Groq API.
"""
import logging
from groq import Groq
from backend.config import GROQ_API_KEY, GROQ_MODEL, MAX_TOKENS, MAX_CONTEXT_CHARS

logger  = logging.getLogger(__name__)
_client = None


def get_client():
    global _client
    if _client is None:
        key = GROQ_API_KEY.strip()
        if not key or key == :
            raise ValueError(
                "GROQ_API_KEY is not set. "
                "Open backend/config.py and replace 'your_groq_api_key_here' with your real key."
            )
        _client = Groq(api_key=key)
    return _client


def _system_prompt(repo_name, context):
    trimmed = context[:MAX_CONTEXT_CHARS] if context else "No code context available."
    return (
        f"You are RepoTutor, an expert who explains GitHub repositories clearly.\n"
        f"Repository: {repo_name}\n\n"
        f"Instructions:\n"
        f"- Answer based on the actual code provided below\n"
        f"- Reference file paths when discussing specific code\n"
        f"- Use markdown with fenced code blocks for all code snippets\n"
        f"- Be concise but thorough\n\n"
        f"--- REPOSITORY CODE ---\n{trimmed}\n--- END ---"
    )


def generate_summary(repo_name, context):
    """Generate a structured markdown summary of the repository."""
    if not context or not context.strip():
        return "No code context was available to generate a summary."

    messages = [
        {
            "role": "system",
            "content": _system_prompt(repo_name, context)
        },
        {
            "role": "user",
            "content": (
                "Please generate a clear repository summary using these sections:\n\n"
                "## Overview\nWhat this project does in 2-3 sentences.\n\n"
                "## Tech Stack\nMain languages, frameworks, and libraries used.\n\n"
                "## Key Files\nThe most important files and what each one does.\n\n"
                "## How It Works\nA brief explanation of the main flow or architecture."
            )
        }
    ]

    resp = get_client().chat.completions.create(
        model       = GROQ_MODEL,
        messages    = messages,
        max_tokens  = MAX_TOKENS,
        temperature = 0.3,
    )
    return resp.choices[0].message.content


def stream_answer(repo_name, context, question, history):
    """Yield text tokens for SSE streaming."""
    messages = [{"role": "system", "content": _system_prompt(repo_name, context)}]
    messages += (history or [])[-6:]
    messages.append({"role": "user", "content": question})

    stream = get_client().chat.completions.create(
        model       = GROQ_MODEL,
        messages    = messages,
        max_tokens  = MAX_TOKENS,
        temperature = 0.3,
        stream      = True,
    )
    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token


def answer_question(repo_name, context, question, history):
    """Non-streaming fallback — returns full answer at once."""
    messages = [{"role": "system", "content": _system_prompt(repo_name, context)}]
    messages += (history or [])[-6:]
    messages.append({"role": "user", "content": question})

    resp = get_client().chat.completions.create(
        model       = GROQ_MODEL,
        messages    = messages,
        max_tokens  = MAX_TOKENS,
        temperature = 0.3,
        stream      = False,
    )
    return resp.choices[0].message.content