/**
 * Live GitHub Activity Feed
 */
async function loadActivity(repoId) {
  const wrap = document.getElementById('activity-content');
  if (!wrap) return;
  wrap.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Fetching live activity from GitHub...</p>';

  try {
    const data = await API.get(`/api/activity/${repoId}`);
    renderActivity(data);
  } catch (e) {
    wrap.innerHTML = `<p style="color:var(--red);padding:1rem">Error: ${e.message}</p>`;
  }
}

function renderActivity(data) {
  const wrap = document.getElementById('activity-content');
  let   html = '';

  // AI Insight
  if (data.insight) {
    html += `
      <div class="activity-insight">
        <div class="activity-insight-label">AI Insight</div>
        ${escapeHtml(data.insight)}
      </div>`;
  }

  // Recent Commits
  if (data.commits && data.commits.length) {
    html += `<div class="activity-section-title">Recent Commits (${data.commits.length})</div>`;
    data.commits.forEach(c => {
      const date = c.date ? new Date(c.date).toLocaleDateString() : '';
      html += `
        <div class="commit-item" onclick="window.open('${c.url}','_blank')">
          <span class="commit-sha">${escapeHtml(c.sha)}</span>
          <div style="min-width:0">
            <div class="commit-msg">${escapeHtml(c.message)}</div>
            <div class="commit-meta">${escapeHtml(c.author)} &nbsp;·&nbsp; ${date}</div>
          </div>
        </div>`;
    });
  }

  // Events
  if (data.events && data.events.length) {
    html += `<div class="activity-section-title">Recent Events</div>`;
    data.events.forEach(e => {
      const date = e.date ? timeAgo(e.date) : '';
      html += `
        <div class="event-item">
          ${e.avatar ? `<img class="event-avatar" src="${e.avatar}" alt="${escapeHtml(e.actor)}" loading="lazy"/>` : ''}
          <span class="event-summary">${escapeHtml(e.summary)}</span>
          <span class="event-type-badge">${escapeHtml(e.type)}</span>
          <span class="event-date">${date}</span>
        </div>`;
    });
  }

  // Open Issues
  if (data.issues && data.issues.length) {
    html += `<div class="activity-section-title">Open Issues (${data.issues.length})</div>`;
    data.issues.forEach(i => {
      const labels = (i.labels || []).map(l =>
        `<span class="issue-label">${escapeHtml(l)}</span>`).join('');
      html += `
        <div class="issue-item" onclick="window.open('${i.url}','_blank')">
          <div class="issue-number">#${i.number} &nbsp;·&nbsp; ${escapeHtml(i.user)}</div>
          <div class="issue-title">${escapeHtml(i.title)}</div>
          ${labels ? `<div class="issue-labels">${labels}</div>` : ''}
        </div>`;
    });
  }

  if (!html) {
    html = '<div class="activity-empty">No recent activity found for this repository.</div>';
  }

  wrap.innerHTML = html;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}