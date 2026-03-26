/**
 * Dashboard Page — repo list, analyse, stats
 */
let allRepos = [];

async function loadDashboard() {
  try {
    allRepos = await API.get('/api/repos/');
    renderRepoList(allRepos);
    renderStats(allRepos);
    // Update plan badge
    API.get('/api/subscription/').then(d => updatePlanBadge(d.plan)).catch(()=>{});
    // Store globally for compare page
    window._allRepos = allRepos;
    // Init compare dropdowns
    if (typeof initComparePage === 'function') initComparePage(allRepos);
    return allRepos;
  } catch (err) {
    console.error('Failed to load repos:', err);
    return [];
  }
}

function renderStats(repos) {
  const bar          = document.getElementById('stats-bar');
  const totalFiles   = repos.reduce((s,r) => s + (r.file_count||0), 0);
  const totalQs      = repos.reduce((s,r) => s + (r.question_count||0), 0);
  if (repos.length > 0) {
    document.getElementById('stat-repos').textContent     = repos.length;
    document.getElementById('stat-files').textContent     = totalFiles;
    document.getElementById('stat-questions').textContent = totalQs;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function renderRepoList(repos) {
  const container = document.getElementById('repo-list');
  if (!repos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </div>
        <p>No repositories yet</p>
        <span>Paste a GitHub URL above to get started</span>
      </div>`;
    return;
  }
  container.innerHTML = repos.map(r => `
    <div class="repo-card" onclick="openRepo('${r.id}','${escapeHtml(r.owner)}/${escapeHtml(r.name)}')">
      <div class="repo-card-left">
        <div class="repo-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </div>
        <div class="repo-info">
          <div class="repo-name">${escapeHtml(r.owner)}/${escapeHtml(r.name)}</div>
          <div class="repo-desc">${escapeHtml(r.description || r.github_url)}</div>
        </div>
      </div>
      <div class="repo-card-right">
        ${r.language ? `<span class="repo-badge">${escapeHtml(r.language)}</span>` : ''}
        <span class="repo-badge">${r.file_count||0} files</span>
        <button onclick="event.stopPropagation();openHealthScore('${r.id}')" title="Code Health Score" style="
          background:transparent;border:1px solid var(--border2);border-radius:6px;
          color:var(--muted);font-size:0.72rem;padding:0.2rem 0.5rem;cursor:pointer;
          white-space:nowrap;transition:all 0.15s;font-family:inherit"
          onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'"
          onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
          Health Score
        </button>
        <button onclick="event.stopPropagation();openBugHunter('${r.id}','${escapeHtml(r.owner)}/${escapeHtml(r.name)}')" title="Bug Hunter" style="
          background:transparent;border:1px solid var(--border2);border-radius:6px;
          color:var(--muted);font-size:0.72rem;padding:0.2rem 0.5rem;cursor:pointer;
          white-space:nowrap;transition:all 0.15s;font-family:inherit"
          onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
          onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
          Bug Hunter
        </button>
        <button onclick="event.stopPropagation();openActivity('${r.id}','${escapeHtml(r.owner)}/${escapeHtml(r.name)}')" title="Live Activity" style="
          background:transparent;border:1px solid var(--border2);border-radius:6px;
          color:var(--muted);font-size:0.72rem;padding:0.2rem 0.5rem;cursor:pointer;
          white-space:nowrap;transition:all 0.15s;font-family:inherit"
          onmouseover="this.style.borderColor='var(--accent2)';this.style.color='var(--accent2)'"
          onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
          Activity
        </button>
        <span class="repo-date">${formatDate(r.created_at)}</span>
        <button class="btn-delete-repo" title="Delete" onclick="deleteRepo(event,'${r.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`).join('');
}

function filterRepos(query) {
  const q       = query.toLowerCase().trim();
  const filtered = q
    ? allRepos.filter(r =>
        (r.name       || '').toLowerCase().includes(q) ||
        (r.owner      || '').toLowerCase().includes(q) ||
        (r.language   || '').toLowerCase().includes(q) ||
        (r.description|| '').toLowerCase().includes(q)
      )
    : allRepos;
  renderRepoList(filtered);
  const count = document.getElementById('search-count');
  if (count) count.textContent = q ? `${filtered.length} of ${allRepos.length} repos` : '';
}

async function analyseRepo() {
  const url = document.getElementById('repo-url').value.trim();
  if (!url) return;
  hideError('analyse-error');
  const restore = setLoading('analyse-btn', 'Analysing…');
  try {
    const repo = await API.post('/api/repos/', { url });
    document.getElementById('repo-url').value = '';
    showToast(`✓ ${repo.owner}/${repo.name} analysed successfully`);
    const repos = await loadDashboard();
    initProfile(await API.get('/api/auth/me'), repos || []);
  } catch (err) {
    showError('analyse-error', err.message);
  } finally {
    restore('Analyse →');
  }
}

async function deleteRepo(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this repository and all its conversation history?')) return;
  try {
    await API.delete(`/api/repos/${id}`);
    showToast('Repository deleted', 'error');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}