/**
 * Bookmarks Page
 */
async function loadBookmarks() {
  const list = document.getElementById('bookmarks-list');
  list.innerHTML = '<p style="color:var(--muted);padding:2rem">Loading…</p>';
  try {
    const items = await API.get('/api/chat/bookmarks');
    if (!items.length) {
      list.innerHTML = '<div class="empty-state" style="border:1px dashed var(--border2);border-radius:16px;padding:3rem;text-align:center;color:var(--muted)"><p>No saved answers yet</p><span style="font-size:0.85rem">Click Save on any AI answer to bookmark it</span></div>';
      return;
    }
    list.innerHTML = items.map(b => `
      <div class="bookmark-card" id="bm-${b.id}">
        <div class="bookmark-header">
          <span class="bookmark-repo">${escapeHtml(b.repo_name)}</span>
          <span class="bookmark-date">${formatDate(b.created_at)}</span>
        </div>
        <div class="bookmark-question">Q: ${escapeHtml(b.question)}</div>
        <div class="bookmark-answer" id="bma-${b.id}">${escapeHtml(b.answer)}</div>
        <div class="bookmark-footer">
          <button class="btn-expand" onclick="toggleBookmark('${b.id}')">Show more</button>
          <button class="btn-del-bookmark" onclick="deleteBookmark('${b.id}')">Delete</button>
        </div>
      </div>`).join('');
  } catch (e) {
    list.innerHTML = `<p style="color:var(--red);padding:1rem">${e.message}</p>`;
  }
}

function toggleBookmark(id) {
  const el  = document.getElementById(`bma-${id}`);
  const btn = el.nextElementSibling?.querySelector('.btn-expand');
  el.classList.toggle('expanded');
  if (btn) btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Show more';
}

async function deleteBookmark(id) {
  if (!confirm('Delete this bookmark?')) return;
  try {
    await API.delete(`/api/chat/bookmarks/${id}`);
    document.getElementById(`bm-${id}`)?.remove();
    showToast('Bookmark deleted');
  } catch (e) { showToast(e.message, 'error'); }
}
