/**
 * Repo Comparison Page
 * Select two repos from dropdowns, stream AI comparison side by side.
 */

function initComparePage(repos) {
  const sel1 = document.getElementById('compare-select-1');
  const sel2 = document.getElementById('compare-select-2');
  if (!sel1 || !sel2) return;

  const options = repos.map(r =>
    `<option value="${r.id}" data-owner="${escapeHtml(r.owner)}" data-name="${escapeHtml(r.name)}"
      data-files="${r.file_count||0}" data-lang="${escapeHtml(r.language||'')}"
      data-stars="${r.stars||0}">
      ${escapeHtml(r.owner)}/${escapeHtml(r.name)}
    </option>`
  ).join('');

  const placeholder = '<option value="">-- Select a repository --</option>';
  sel1.innerHTML = placeholder + options;
  sel2.innerHTML = placeholder + options;

  sel1.onchange = () => updateCompareMeta(repos);
  sel2.onchange = () => updateCompareMeta(repos);

  // Reset result
  document.getElementById('compare-output').innerHTML = `
    <div class="compare-placeholder">
      <div class="icon">⚖️</div>
      <p>Select two repositories above and click Compare</p>
    </div>`;
}

function updateCompareMeta(repos) {
  const id1 = document.getElementById('compare-select-1').value;
  const id2 = document.getElementById('compare-select-2').value;
  const r1  = repos.find(r => r.id === id1);
  const r2  = repos.find(r => r.id === id2);
  renderCompareMeta('meta-1', r1);
  renderCompareMeta('meta-2', r2);
}

function renderCompareMeta(elId, repo) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!repo) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="compare-meta-card">
      <div class="repo-card-icon" style="background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      </div>
      <div class="compare-meta-info">
        <div class="compare-meta-name">${escapeHtml(repo.owner)}/${escapeHtml(repo.name)}</div>
        <div class="compare-meta-sub">
          ${repo.file_count||0} files
          ${repo.language ? ' &nbsp;·&nbsp; ' + escapeHtml(repo.language) : ''}
          ${repo.stars ? ' &nbsp;·&nbsp; ' + repo.stars + ' stars' : ''}
        </div>
      </div>
    </div>`;
}

async function runComparison() {
  const repo1_id = document.getElementById('compare-select-1').value;
  const repo2_id = document.getElementById('compare-select-2').value;

  if (!repo1_id || !repo2_id) {
    showToast('Please select both repositories', 'error');
    return;
  }
  if (repo1_id === repo2_id) {
    showToast('Please select two different repositories', 'error');
    return;
  }

  const btn    = document.getElementById('btn-compare');
  const output = document.getElementById('compare-output');
  btn.disabled    = true;
  btn.textContent = 'Comparing...';
  output.innerHTML = '<p style="color:var(--muted);padding:1rem">Generating comparison — this may take 20-30 seconds...</p>';

  try {
    const res = await fetch('/api/compare/', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body:        JSON.stringify({ repo1_id, repo2_id }),
    });

    let   fullText = '';
    const reader   = res.body.getReader();
    const decoder  = new TextDecoder();
    let   buffer   = '';
    output.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.token) {
            fullText += data.token;
            output.innerHTML = renderMarkdown(fullText);
          }
          if (data.error) throw new Error(data.error);
        } catch {}
      }
    }
    showToast('Comparison complete!', 'success');
  } catch (err) {
    output.innerHTML = `<p style="color:var(--red)">Error: ${err.message}</p>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Compare Repositories';
  }
}