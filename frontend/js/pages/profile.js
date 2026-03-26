/**
 * Profile Page — name, avatar color, theme, password change, stats
 */
const AVATAR_COLORS = ['#6c63ff','#a78bfa','#34d399','#f87171','#fbbf24','#60a5fa','#f472b6','#4ade80'];
let selectedColor = '#6c63ff';

function initProfile(user, repos) {
  document.getElementById('profile-name-input').value    = user.name || '';
  document.getElementById('profile-name-display').textContent = user.name || user.email.split('@')[0];
  document.getElementById('profile-email-display').textContent = user.email;
  selectedColor = user.avatar_color || '#6c63ff';

  // Avatar
  const big = document.getElementById('profile-avatar-big');
  big.style.background   = selectedColor;
  big.textContent        = (user.name || user.email)[0].toUpperCase();

  // Color picker
  document.getElementById('color-picker').innerHTML = AVATAR_COLORS.map(c => `
    <div class="color-dot${c === selectedColor ? ' selected':''}" style="background:${c}"
      onclick="pickColor('${c}')"></div>`).join('');

  // Stats
  const totalFiles     = repos.reduce((s,r) => s + (r.file_count||0), 0);
  const totalQuestions = repos.reduce((s,r) => s + (r.question_count||0), 0);
  document.getElementById('ps-repos').textContent     = repos.length;
  document.getElementById('ps-files').textContent     = totalFiles;
  document.getElementById('ps-questions').textContent = totalQuestions;

  // Theme options
  updateThemeOptions(user.theme || 'dark');
}

function pickColor(c) {
  selectedColor = c;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('selected', d.style.background === c));
  document.getElementById('profile-avatar-big').style.background = c;
}

async function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  try {
    await API.put("/api/auth/profile", { name, avatar_color: selectedColor });
    document.getElementById('profile-name-display').textContent = name || 'My Profile';
    updateNavAvatar({ name, avatar_color: selectedColor });
    showSuccess('profile-success', '✓ Profile saved');
    setTimeout(() => hideSuccess('profile-success'), 2500);
  } catch (e) { showToast(e.message, 'error'); }
}

async function changePassword() {
  hideError('pwd-error'); hideSuccess('pwd-success');
  const oldPwd = document.getElementById('old-password').value;
  const newPwd = document.getElementById('new-password').value;
  if (!oldPwd || !newPwd) { showError('pwd-error', 'Both fields are required'); return; }
  try {
    await API.put('/api/auth/password', { old_password: oldPwd, new_password: newPwd });
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    showSuccess('pwd-success', '✓ Password changed');
    setTimeout(() => hideSuccess('pwd-success'), 2500);
  } catch (e) { showError('pwd-error', e.message); }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-btn').textContent = theme === 'dark' ? '🌙' : '☀️';
  updateThemeOptions(theme);
  API.put('/api/auth/theme', { theme }).catch(() => {});
}

function updateThemeOptions(theme) {
  document.getElementById('theme-opt-dark') ?.classList.toggle('selected', theme === 'dark');
  document.getElementById('theme-opt-light')?.classList.toggle('selected', theme === 'light');
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}

function updateNavAvatar(user) {
  const av   = document.getElementById('nav-avatar');
  const initl = (user.name || user.email || '?')[0].toUpperCase();
  av.textContent       = initl;
  av.style.background  = user.avatar_color || '#6c63ff';
  av.title             = 'Profile';
}