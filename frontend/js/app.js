/**
 * app.js — Bootstrap
 * Page refresh = no tutorial (existing accounts already saw it).
 * Tutorial only shows via auth.js after login/OAuth for new accounts.
 */
(async () => {
  try {
    const data = await API.get('/api/auth/me');
    if (data.authenticated) {
      document.documentElement.setAttribute('data-theme', data.theme || 'dark');
      document.getElementById('theme-btn').textContent = (data.theme||'dark') === 'dark' ? '🌙' : '☀️';
      updateNavAvatar(data);
      showPage('dashboard');
      const repos = await loadDashboard();
      initProfile(data, repos || []);
      // No tutorial on page refresh
    } else {
      showPage('auth');
    }
  } catch {
    showPage('auth');
  }
})();