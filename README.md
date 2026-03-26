# RepoTutor — AI-Powered GitHub Repository Understanding System

> Internship Project | 4-Week Development Timeline

---

## Project Overview

RepoTutor is a full-stack web application that enables developers, students, and researchers to understand any public GitHub repository instantly using Artificial Intelligence. Users paste a GitHub URL and the system automatically analyses the code, generates a summary, and provides an interactive Q&A chat interface powered by a Large Language Model (LLM).

---

## Tech Stack

| Layer        | Technology                          |
|--------------|--------------------------------------|
| Backend      | Python 3.13, Flask 3.x               |
| AI / LLM     | Groq API (llama-3.3-70b-versatile)   |
| Database     | SQLite 3 (via Python stdlib)         |
| Frontend     | Vanilla JS (ES6+), HTML5, CSS3       |
| GitHub Data  | GitHub REST API v3                   |
| Auth         | Session-based (Flask sessions)       |

---

## Project Structure

```
repotutor/
├── README.md
├── backend
│   ├── __init__.py
│   ├── __pycache__
│   │   ├── __init__.cpython-313.pyc
│   │   └── config.cpython-313.pyc
│   ├── config.py
│   ├── models
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-313.pyc
│   │   │   └── database.cpython-313.pyc
│   │   └── database.py
│   ├── routes
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-313.pyc
│   │   │   ├── activity.cpython-313.pyc
│   │   │   ├── auth.cpython-313.pyc
│   │   │   ├── bugs.cpython-313.pyc
│   │   │   ├── chat.cpython-313.pyc
│   │   │   ├── compare.cpython-313.pyc
│   │   │   ├── health.cpython-313.pyc
│   │   │   ├── repos.cpython-313.pyc
│   │   │   └── subscription.cpython-313.pyc
│   │   ├── activity.py
│   │   ├── auth.py
│   │   ├── bugs.py
│   │   ├── chat.py
│   │   ├── compare.py
│   │   ├── health.py
│   │   ├── repos.py
│   │   └── subscription.py
│   ├── services
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-313.pyc
│   │   │   ├── github_service.cpython-313.pyc
│   │   │   ├── groq_service.cpython-313.pyc
│   │   │   └── health_service.cpython-313.pyc
│   │   ├── github_service.py
│   │   ├── groq_service.py
│   │   └── health_service.py
│   └── utils
│       ├── __init__.py
│       ├── __pycache__
│       │   ├── __init__.cpython-313.pyc
│       │   └── auth_utils.cpython-313.pyc
│       └── auth_utils.py
├── frontend
│   ├── css
│   │   ├── animations.css
│   │   ├── auth.css
│   │   ├── base.css
│   │   ├── bookmarks.css
│   │   ├── bugs.css
│   │   ├── chat.css
│   │   ├── compare.css
│   │   ├── components.css
│   │   ├── dashboard.css
│   │   ├── profile.css
│   │   ├── subscription.css
│   │   └── variables.css
│   ├── index.html
│   └── js
│       ├── app.js
│       ├── components
│       │   ├── markdown.js
│       │   └── toast.js
│       ├── pages
│       │   ├── activity.js
│       │   ├── auth.js
│       │   ├── bookmarks.js
│       │   ├── bugs.js
│       │   ├── chat.js
│       │   ├── compare.js
│       │   ├── dashboard.js
│       │   ├── health.js
│       │   ├── profile.js
│       │   ├── subscription.js
│       │   └── tutorial.js
│       └── utils
│           ├── api.js
│           └── helpers.js
├── repotutor.db
├── requirements.txt
└── run.py

---

## Features

- **User Authentication** — Register, login, logout with session management
- **Repository Analysis** — Fetches all source files from any public GitHub repo via the GitHub REST API
- **AI Summary Generation** — Automatically generates a structured markdown summary using Groq LLM
- **Interactive Q&A Chat** — Ask natural language questions about any file, function, class, or concept in the codebase
- **Conversation History** — Chat history is persisted per repository per user
- **Files Explorer** — Searchable list of all indexed files with extension badges
- **Statistics Dashboard** — Shows total repos and files indexed

---

## API Endpoints

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| POST   | `/api/auth/register`            | Create a new user account      |
| POST   | `/api/auth/login`               | Login and create session       |
| POST   | `/api/auth/logout`              | Destroy session                |
| GET    | `/api/auth/me`                  | Check session status           |
| GET    | `/api/repos/`                   | List user's repositories       |
| POST   | `/api/repos/`                   | Analyse a new GitHub repo      |
| GET    | `/api/repos/<id>`               | Get repo details + file list   |
| DELETE | `/api/repos/<id>`               | Delete repo + history          |
| GET    | `/api/chat/<id>/messages`       | Get conversation history       |
| POST   | `/api/chat/<id>/messages`       | Send a question, get AI answer |
| DELETE | `/api/chat/<id>/messages`       | Clear conversation history     |

---

## Setup & Installation

### Prerequisites
- Python 3.11 or higher
- A Groq API key (free at https://console.groq.com)

### Steps

```bash
# 1. Install dependencies
pip3 install flask flask-cors groq requests

# 2. Set your Groq API key in backend/config.py
GROQ_API_KEY = "gsk_xxxxxxxxxxxx"

# 3. Run the app
python3 run.py

# 4. Open in browser
# http://localhost:5000
```

---

## 4-Week Development Timeline

| Week | Days  | Tasks Completed                                                              |
|------|-------|------------------------------------------------------------------------------|
| 1    | 1–5   | Project planning, tech stack selection, backend structure, database schema   |
| 2    | 6–10  | GitHub API integration, Groq LLM integration, REST API endpoints             |
| 3    | 11–15 | Frontend UI design, Auth pages, Dashboard, SPA routing                       |
| 4    | 16–20 | Chat interface, Summary tab, Files explorer, testing and bug fixes           |

---

## Database Schema

### users
| Column        | Type | Description              |
|---------------|------|--------------------------|
| id            | TEXT | UUID primary key         |
| email         | TEXT | Unique email address     |
| password_hash | TEXT | SHA-256 hashed password  |
| created_at    | TEXT | ISO timestamp            |

### repositories
| Column      | Type    | Description                        |
|-------------|---------|------------------------------------|
| id          | TEXT    | UUID primary key                   |
| user_id     | TEXT    | Foreign key → users.id             |
| github_url  | TEXT    | Original GitHub URL                |
| owner       | TEXT    | Repository owner                   |
| name        | TEXT    | Repository name                    |
| description | TEXT    | Repo description from GitHub       |
| summary     | TEXT    | AI-generated markdown summary      |
| file_list   | TEXT    | JSON array of indexed file paths   |
| context     | TEXT    | Full code context for LLM queries  |
| file_count  | INTEGER | Number of files indexed            |
| created_at  | TEXT    | ISO timestamp                      |

### messages
| Column     | Type | Description                    |
|------------|------|--------------------------------|
| id         | TEXT | UUID primary key               |
| repo_id    | TEXT | Foreign key → repositories.id  |
| role       | TEXT | "user" or "assistant"          |
| content    | TEXT | Message text                   |
| created_at | TEXT | ISO timestamp                  |

---

## License
MIT — Free to use and modify.
