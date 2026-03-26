function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${name}-page`).classList.add('active');
  if (name === 'bookmarks')     loadBookmarks();
  if (name === 'subscription') loadSubscription();
  if (name === 'compare' && typeof initComparePage === 'function') initComparePage(window._allRepos || []);
  if (name === 'profile')   { /* loaded on boot */ }
}
function showError(id, msg) { const e=document.getElementById(id); if(e){e.textContent=msg;e.classList.add('show');} }
function hideError(id)       { document.getElementById(id)?.classList.remove('show'); }
function showSuccess(id,msg) { const e=document.getElementById(id); if(e){e.textContent=msg;e.classList.add('show');} }
function hideSuccess(id)     { document.getElementById(id)?.classList.remove('show'); }
function setLoading(btnId, label) {
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${label}`;
  return (text) => { btn.disabled = false; btn.textContent = text; };
}
function escapeHtml(str='') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
}
function getExt(path='') {
  const p = path.split('.'); return p.length > 1 ? '.' + p[p.length-1] : '';
}
// Polyfill for API.put
const _origAPI = window.API;