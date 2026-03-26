/**
 * Subscription Page — pricing plans, usage stats, upgrade
 */
async function loadSubscription() {
  const body = document.getElementById('sub-content');
  body.innerHTML = '<p style="color:var(--muted);padding:2rem">Loading…</p>';
  try {
    const data = await API.get('/api/subscription/');
    renderSubscription(data);
  } catch (e) {
    body.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function renderSubscription(data) {
  const { plan, plans, usage, limits } = data;
  const reposPct  = Math.min(100, Math.round((usage.repos / limits.repos) * 100)) || 0;
  const qsPct     = Math.min(100, Math.round((usage.questions / limits.questions) * 100)) || 0;

  document.getElementById('sub-content').innerHTML = `
    <!-- Current plan banner -->
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.2rem">Current Plan</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;color:var(--text)">
          ${plan === 'pro' ? 'Pro' : 'Free'}
        </div>
      </div>
      <div class="usage-bar-wrap" style="flex:1;min-width:200px;max-width:360px;margin:0">
        <div class="usage-row" style="margin-bottom:0.6rem">
          <div class="usage-label">
            <span>Repositories</span>
            <span>${usage.repos} / ${limits.repos === 999 ? '∞' : limits.repos}</span>
          </div>
          <div class="usage-bar">
            <div class="usage-fill" style="width:${reposPct}%;background:${reposPct>80?'var(--red)':'var(--accent)'}"></div>
          </div>
        </div>
        <div class="usage-row" style="margin-bottom:0">
          <div class="usage-label">
            <span>Questions asked</span>
            <span>${usage.questions} / ${limits.questions === 999 ? '∞' : limits.questions}</span>
          </div>
          <div class="usage-bar">
            <div class="usage-fill" style="width:${qsPct}%;background:${qsPct>80?'var(--red)':'var(--green)'}"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pricing cards -->
    <div class="pricing-grid">
      ${renderPlanCard('free',  plans.free,  plan)}
      ${renderPlanCard('pro',   plans.pro,   plan)}
    </div>`;
}

function renderPlanCard(planKey, info, currentPlan) {
  const isCurrent = planKey === currentPlan;
  const isPro     = planKey === 'pro';
  const features  = (info.features || []).map(f =>
    `<li><span class="feat-check">✓</span> ${f}</li>`).join('');
  const locked    = (info.locked || []).map(f =>
    `<li><span class="feat-lock">✗</span> <span class="feat-locked">${f}</span></li>`).join('');

  return `
    <div class="plan-card ${isPro ? 'pro' : ''}">
      ${isPro ? '<div class="plan-badge">MOST POPULAR</div>' : ''}
      <div class="plan-name">${info.name}</div>
      <div class="plan-price">${info.price.split('/')[0]}<span>/${info.price.split('/')[1] || 'month'}</span></div>
      <ul class="plan-features">${features}${locked}</ul>
      <button class="btn-plan ${planKey} ${isCurrent ? 'current' : ''}"
        onclick="${isCurrent ? '' : `upgradePlan('${planKey}')`}"
        ${isCurrent ? 'disabled' : ''}>
        ${isCurrent ? '✓ Current Plan' : isPro ? 'Upgrade to Pro' : 'Downgrade to Free'}
      </button>
    </div>`;
}

async function upgradePlan(planKey) {
  if (!confirm(`Switch to the ${planKey.toUpperCase()} plan?`)) return;
  try {
    const data = await API.post('/api/subscription/upgrade', { plan: planKey });
    showToast(data.message, 'success');
    loadSubscription();
    // Update nav badge
    updatePlanBadge(planKey);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function updatePlanBadge(plan) {
  const badge = document.getElementById('plan-badge');
  if (badge) {
    badge.textContent   = plan === 'pro' ? 'Pro' : 'Free';
    badge.style.color   = plan === 'pro' ? 'var(--amber)' : 'var(--muted)';
  }
}