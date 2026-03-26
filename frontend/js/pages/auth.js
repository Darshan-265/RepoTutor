/**
 * Auth Page
 * - Email register -> success msg -> login tab (NO tutorial)
 * - Email login    -> dashboard   -> tutorial for new accounts only
 * - OAuth          -> email prompt -> create/find account -> dashboard
 */
let currentAuthTab = 'login';

function switchTab(tab) {
  currentAuthTab = tab;
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('auth-btn').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
  hideError('auth-error');
  hideSuccess('auth-success');
}

async function handleAuth(e) {
  e.preventDefault();
  hideError('auth-error');
  hideSuccess('auth-success');
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const restore  = setLoading('auth-btn', 'Please wait...');
  try {
    if (currentAuthTab === 'register') {
      await API.post('/api/auth/register', { email, password });
      showSuccess('auth-success', 'Account created! Please sign in.');
      switchTab('login');
      document.getElementById('auth-email').value    = email;
      document.getElementById('auth-password').value = '';
      restore('Sign In');
    } else {
      const data = await API.post('/api/auth/login', { email, password });
      restore('Sign In');
      await bootApp(data);
      showTutorialForEmail(data.email);
    }
  } catch (err) {
    showError('auth-error', err.message);
    restore(currentAuthTab === 'login' ? 'Sign In' : 'Create Account');
  }
}

async function handleOAuthLogin(provider) {
  const label = provider === 'google' ? 'Gmail' : 'GitHub';
  const email = prompt('Enter your ' + label + ' email address:');
  if (!email || !email.trim()) return;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  const btn = document.getElementById('btn-' + provider);
  const originalText = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Connecting...';

  try {
    const data = await API.post('/api/auth/oauth/' + provider, {
      email: cleanEmail,
      name:  cleanEmail.split('@')[0],
    });
    await bootApp(data);
    if (data.is_new) {
      showTutorial();
    }
  } catch (err) {
    showToast(err.message || (provider + ' sign-in failed'), 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = originalText;
  }
}

async function bootApp(data) {
  document.documentElement.setAttribute('data-theme', data.theme || 'dark');
  document.getElementById('theme-btn').textContent = (data.theme || 'dark') === 'dark' ? '🌙'  : '☀️';
  updateNavAvatar(data);
  showPage('dashboard');
  const repos = await loadDashboard();
  initProfile(data, repos || []);
}

async function logout() {
  await API.post('/api/auth/logout', {});
  showPage('auth');
  switchTab('login');
  document.getElementById('auth-email').value    = '';
  document.getElementById('auth-password').value = '';
}