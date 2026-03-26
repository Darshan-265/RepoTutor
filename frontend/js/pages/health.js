/**
 * Code Health Score Page
 */
async function loadHealthScore(repoId) {
  const modal = document.getElementById('health-modal');
  const body  = document.getElementById('health-content');
  body.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Analysing code quality…</p>';
  modal.classList.add('show');

  try {
    const data = await API.get(`/api/health/${repoId}`);
    renderHealthScore(data);
  } catch (e) {
    body.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function renderHealthScore(data) {
  const { score, max, grade, color, breakdown } = data;
  const pct = Math.round((score / max) * 100);

  const checks = breakdown.map(c => `
    <div class="health-check-row ${c.passed ? 'passed' : 'failed'}">
      <div class="check-label">
        <span style="font-size:14px">${c.passed ? '✅' : '❌'}</span>
        <div>
          <div style="font-weight:500">${c.label}</div>
          <div style="font-size:0.75rem;color:var(--muted)">${c.desc}</div>
        </div>
      </div>
      <span class="check-points ${c.passed ? 'earned' : ''}">
        ${c.passed ? '+' : ''}${c.earned}/${c.points}
      </span>
    </div>`).join('');

  document.getElementById('health-content').innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem">
      <div class="health-score-ring" style="border-color:${color};box-shadow:0 0 24px ${color}40">
        <div class="health-score-num" style="color:${color}">${score}</div>
        <div class="health-score-label">out of ${max}</div>
      </div>
      <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:${color}">${grade}</div>
      <div style="color:var(--muted);font-size:0.85rem;margin-top:0.25rem">Code Health Score</div>
    </div>

    <!-- Score bar -->
    <div style="background:var(--bg3);border-radius:6px;height:10px;margin-bottom:1.5rem;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;transition:width 1s ease"></div>
    </div>

    <!-- Checks -->
    <div>${checks}</div>

    <button onclick="refreshHealthScore()" style="
      width:100%;margin-top:1.25rem;padding:0.65rem;border-radius:var(--radius-sm);
      background:var(--bg3);border:1px solid var(--border2);color:var(--muted);
      font-size:0.875rem;cursor:pointer;transition:all 0.15s;font-family:inherit"
      onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent2)'"
      onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
      Recalculate Score
    </button>`;
}

let _healthRepoId = null;

async function openHealthScore(repoId) {
  _healthRepoId = repoId;
  loadHealthScore(repoId);
}

async function refreshHealthScore() {
  if (!_healthRepoId) return;
  const body = document.getElementById('health-content');
  body.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Recalculating…</p>';
  try {
    const data = await API.post(`/api/health/${_healthRepoId}/refresh`, {});
    renderHealthScore(data);
    showToast('Health score updated!', 'success');
  } catch (e) {
    body.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}