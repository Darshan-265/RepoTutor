"""
Code Health Score Service
Scores a repository out of 100 using 10 checks — no AI needed.
"""
import re

CHECKS = [
    ("has_readme",       "README file",          10, "Project has a README.md or README.rst"),
    ("has_requirements", "Dependency file",       10, "Has requirements.txt, package.json, or similar"),
    ("has_tests",        "Test files",            15, "Contains test files or a tests/ folder"),
    ("has_gitignore",    ".gitignore",             8, "Has a .gitignore file"),
    ("has_license",      "LICENSE file",           8, "Has a LICENSE file"),
    ("has_comments",     "Code comments",         12, "Source files contain inline comments"),
    ("no_hardcoded_keys","No hardcoded secrets",  15, "No obvious API keys or passwords in code"),
    ("has_env_example",  ".env.example",           7, "Has .env.example for configuration guidance"),
    ("good_structure",   "Good folder structure", 10, "Code organised into subfolders, not just root"),
    ("has_docstrings",   "Docstrings / JSDoc",     5, "Functions have docstrings or JSDoc comments"),
]

MAX_SCORE = sum(c[2] for c in CHECKS)   # 100


def analyse_health(file_list: list, context: str) -> dict:
    paths = [p.lower() for p in file_list]
    ctx   = context[:25000]
    r     = {}

    r["has_readme"]       = any(p in paths for p in ["readme.md","readme.rst","readme.txt","readme"])
    r["has_requirements"] = any(p in paths for p in ["requirements.txt","package.json","pipfile","pyproject.toml","gemfile","go.mod","pom.xml"])
    r["has_tests"]        = any("test" in p or "spec" in p for p in paths)
    r["has_gitignore"]    = ".gitignore" in paths
    r["has_license"]      = any(p in paths for p in ["license","license.md","license.txt","licence"])
    r["has_comments"]     = len(re.findall(r'(#\s.{3,}|//\s.{3,})', ctx)) >= 5
    r["no_hardcoded_keys"]= not any(re.search(p, ctx) for p in [
        r'(?i)(api_key|apikey|secret|password)\s*=\s*["\'][a-zA-Z0-9]{8,}["\']',
        r'(?i)sk-[a-zA-Z0-9]{20,}', r'gsk_[a-zA-Z0-9]{20,}',
    ])
    r["has_env_example"]  = any(p in paths for p in [".env.example",".env.sample",".env.template"])
    r["good_structure"]   = sum(1 for p in file_list if "/" in p) >= max(3, len(file_list) * 0.3)
    r["has_docstrings"]   = len(re.findall(r'("""[\s\S]{10,}?"""|/\*\*[\s\S]{10,}?\*/)', ctx)) >= 2

    score     = 0
    breakdown = []
    for key, label, points, desc in CHECKS:
        passed = r.get(key, False)
        earned = points if passed else 0
        score += earned
        breakdown.append({"key":key,"label":label,"points":points,"earned":earned,"passed":passed,"desc":desc})

    if   score >= 85: grade, color = "Excellent", "#34d399"
    elif score >= 70: grade, color = "Good",      "#60a5fa"
    elif score >= 50: grade, color = "Fair",      "#fbbf24"
    elif score >= 30: grade, color = "Poor",      "#f87171"
    else:             grade, color = "Very Poor", "#ef4444"

    return {"score":score,"max":MAX_SCORE,"grade":grade,"color":color,"breakdown":breakdown}