"""
RepoTutor Configuration
Reads ALL sensitive values from the .env file.
Never hardcode API keys here.
"""
import os
from dotenv import load_dotenv

load_dotenv()   # reads .env automatically

# ── Groq AI ───────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", )
GROQ_MODEL   = os.getenv("GROQ_MODEL",   "llama-3.3-70b-versatile")
MAX_TOKENS   = int(os.getenv("MAX_TOKENS", "1024"))

# ── GitHub ─────────────────────────────────────────────────────────────────────
GITHUB_TOKEN        = os.getenv("GITHUB_TOKEN", "")
MAX_FILES           = 200
MAX_FILE_SIZE_BYTES = 2_000_000
MAX_CONTENT_CHARS   = 3000

ALLOWED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb",
    ".rs", ".cpp", ".c", ".cs", ".php", ".swift", ".kt", ".md",
    ".txt", ".rst", ".yaml", ".yml", ".json", ".toml", ".sh",
    ".ipynb", ".r", ".sql", ".html", ".css"
}

# ── Database ───────────────────────────────────────────────────────────────────
DB_PATH = os.getenv("DB_PATH", "repotutor.db")

# ── Context window ─────────────────────────────────────────────────────────────
MAX_CONTEXT_CHARS = 15000
MAX_HISTORY_MSGS  = 6

# ── Subscription limits ────────────────────────────────────────────────────────
FREE_MAX_REPOS     = int(os.getenv("FREE_MAX_REPOS",     "3"))
FREE_MAX_QUESTIONS = int(os.getenv("FREE_MAX_QUESTIONS", "20"))
PRO_PRICE_MONTHLY  = os.getenv("PRO_PRICE_MONTHLY", "9.99")