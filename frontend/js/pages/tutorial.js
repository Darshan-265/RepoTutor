/**
 * Welcome Tutorial
 * Shows ONLY for new accounts — tracked per email in localStorage.
 * Email login = never shows (they already saw it on first login after register).
 * OAuth new account = shows immediately.
 * Email new account = shows on first login after registering.
 */
const TUTORIAL_STEPS = [
  { icon:'🎓', title:'Welcome to RepoTutor!',
    text:'RepoTutor helps you understand any GitHub repository using AI. Ask questions about code, functions, and classes — all in plain English.' },
  { icon:'🔗', title:'Step 1 — Paste a GitHub URL',
    text:'On the dashboard, paste any public GitHub repository URL and click "Analyse". RepoTutor fetches all the code files automatically.' },
  { icon:'⏳', title:'Step 2 — Wait for Analysis',
    text:'The system reads every file in the repository. This usually takes 30–60 seconds depending on repo size.' },
  { icon:'💬', title:'Step 3 — Ask Questions',
    text:'Click the repo to open the chat. Ask things like "What does main.py do?" or "Explain the login() function". The AI answers using the actual code.' },
  { icon:'📄', title:'View Files & Ask AI',
    text:'Switch to the Files tab and click any file to view its content. Each file also has an "Ask AI" button to instantly explain it.' },
  { icon:'🔖', title:'Save Useful Answers',
    text:'Click 🔖 Save on any AI answer to bookmark it. Find all saved answers in the Bookmarks section.' },
  { icon:'📄', title:'Export as PDF',
    text:'Click "📄 Export PDF" in the chat header to download your full conversation as a printable PDF report.' },
  { icon:'🚀', title:"You're all set!",
    text:'Start by pasting a GitHub URL on the dashboard. Happy exploring!' },
];

let tutorialStep = 0;

/** Only show if this email has never seen the tutorial */
function showTutorialForEmail(email) {
  const key = `rt_seen_${btoa(email)}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  showTutorial();
}

/** Force-show regardless of history (used for OAuth new accounts) */
function showTutorial() {
  tutorialStep = 0;
  renderTutorialStep();
  document.getElementById('tutorial-modal').classList.add('show');
}

function closeTutorial() {
  document.getElementById('tutorial-modal').classList.remove('show');
}

function renderTutorialStep() {
  const s    = TUTORIAL_STEPS[tutorialStep];
  const last = tutorialStep === TUTORIAL_STEPS.length - 1;
  document.getElementById('tutorial-content').innerHTML = `
    <div style="text-align:center;padding:0.75rem 0 1.25rem">
      <div style="font-size:3.5rem;margin-bottom:1rem;line-height:1">${s.icon}</div>
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:0.75rem;font-weight:800">${s.title}</h3>
      <p style="color:var(--muted);line-height:1.75;font-size:0.9rem">${s.text}</p>
    </div>`;
  document.getElementById('tutorial-dots').innerHTML =
    TUTORIAL_STEPS.map((_, i) => `
      <div style="width:${i===tutorialStep?'20':'8'}px;height:8px;border-radius:4px;
        background:${i===tutorialStep?'var(--accent)':'var(--border2)'};
        transition:all 0.3s ease"></div>`).join('');
  document.getElementById('tutorial-prev').style.display = tutorialStep === 0 ? 'none' : 'inline-block';
  document.getElementById('tutorial-next').textContent   = last ? '🚀 Get Started!' : 'Next →';
}

function tutorialNav(dir) {
  tutorialStep += dir;
  if (tutorialStep >= TUTORIAL_STEPS.length) { closeTutorial(); return; }
  if (tutorialStep < 0) tutorialStep = 0;
  renderTutorialStep();
}