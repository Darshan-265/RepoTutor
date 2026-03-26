/**
 * Chat Page — streaming responses, bookmarks, file viewer, code search
 */
let currentRepoId   = null;
let currentFileList = [];
let currentContext  = {};
let isSending       = false;
let lastQuestion    = '';
let lastAnswer      = '';

const SUGGESTIONS = [
  'What does this project do?','Explain the main entry point',
  'List all classes and functions','What libraries are used?',
  'How does authentication work?','Explain the database structure',
  'What is the overall architecture?','How are errors handled?',
];

async function openRepo(id, name) {
  currentRepoId   = id;
  isSending       = false;
  lastQuestion    = '';
  lastAnswer      = '';
  document.getElementById('chat-repo-name').textContent  = name;
  document.getElementById('chat-repo-files').textContent = '';
  switchChatTab('chat');
  showPage('chat');
  document.getElementById('messages-inner').innerHTML = '';
  document.getElementById('suggestions-bar').style.display = 'block';
  renderSuggestions();

  try {
    const repo = await API.get(`/api/repos/${id}`);
    currentContext  = repo;
    currentFileList = repo.file_list || [];
    document.getElementById('chat-repo-files').textContent = `${currentFileList.length} files`;
    renderMarkdownInto(document.getElementById('summary-content'), repo.summary || 'No summary available.');
    renderMetaCard(repo);
    renderFileTree(currentFileList);
    loadTopQuestions(id);
  } catch {}

  try {
    const msgs = await API.get(`/api/chat/${id}/messages`);
    if (msgs.length) {
      document.getElementById('suggestions-bar').style.display = 'none';
      msgs.forEach(m => appendMessage(m.role, m.content, false));
      scrollToBottom();
    }
  } catch {}
  document.getElementById('chat-input').focus();
}

function switchChatTab(tab) {
  ['chat','summary','files','search'].forEach(t => {
    document.getElementById(`ctab-${t}`)?.classList.toggle('active', t === tab);
    document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
  });
}

function renderSuggestions() {
  const picks = [...SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 5);
  document.getElementById('suggestion-chips').innerHTML = picks.map(s =>
    `<button class="suggestion-chip" onclick="useSuggestion(this)">${escapeHtml(s)}</button>`
  ).join('');
}

function useSuggestion(btn) {
  document.getElementById('chat-input').value = btn.textContent;
  sendMessage();
}

function appendMessage(role, content, animate = true) {
  const wrap = document.getElementById('messages-inner');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;
  if (!animate) div.style.animation = 'none';

  const initials = role === 'user' ? 'U' : 'AI';
  const bubble   = role === 'assistant'
    ? addCopyButtons(renderMarkdown(content))
    : `<p>${escapeHtml(content)}</p>`;

  const bookmarkBtn = role === 'assistant' ? `
    <div class="msg-actions">
      <button class="btn-bookmark-msg" onclick="bookmarkThis(this)" title="Save answer">
         Save
      </button>
    </div>` : '';

  div.innerHTML = `
    <div class="msg-avatar">${initials}</div>
    <div class="msg-content">
      <div class="msg-bubble">${bubble}</div>
      ${bookmarkBtn}
    </div>`;
  wrap.appendChild(div);
  return div;
}

function addCopyButtons(html) {
  return html.replace(/<pre>/g, '<pre><button class="copy-code-btn" onclick="copyCode(this)">Copy</button>');
}

function copyCode(btn) {
  const code = btn.parentElement.querySelector('code')?.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

function bookmarkThis(btn) {
  const bubble = btn.closest('.msg-content').querySelector('.msg-bubble');
  const answer = bubble?.textContent || '';
  if (!lastQuestion || !currentRepoId) return;
  API.post(`/api/chat/${currentRepoId}/bookmarks`, {
    question: lastQuestion, answer: answer.slice(0, 1000)
  }).then(() => {
    btn.textContent = '🔖 Saved!';
    btn.classList.add('saved');
    showToast('Answer bookmarked!', 'success');
  }).catch(e => showToast(e.message, 'error'));
}

function appendThinking() {
  const wrap     = document.getElementById('messages-inner');
  const repoName = document.getElementById('chat-repo-name').textContent || 'repository';
  const div      = document.createElement('div');
  div.className  = 'msg assistant thinking';
  div.innerHTML  = `
    <div class="msg-avatar">AI</div>
    <div class="msg-content">
      <div class="msg-bubble" style="display:flex;align-items:center;gap:10px">
        <span class="dot-bounce"></span>
        <span class="dot-bounce"></span>
        <span class="dot-bounce"></span>
        <span style="font-size:0.78rem;color:var(--muted);margin-left:4px">
          Analysing <strong style="color:var(--accent2)">${repoName}</strong>…
        </span>
      </div>
    </div>`;
  wrap.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  const w = document.getElementById('messages-wrap');
  w.scrollTop = w.scrollHeight;
}

function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

async function sendMessage() {
  if (isSending) return;
  const input    = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question || !currentRepoId) return;

  isSending      = true;
  lastQuestion   = question;
  input.value    = '';
  document.getElementById('send-btn').disabled = true;
  document.getElementById('suggestions-bar').style.display = 'none';

  appendMessage('user', question);
  const thinking = appendThinking();

  try {
    const res = await fetch(`/api/chat/${currentRepoId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ question })
    });

    thinking.remove();
    const asstDiv   = appendMessage('assistant', '', true);
    const bubble    = asstDiv.querySelector('.msg-bubble');
    let   fullText  = '';
    const reader    = res.body.getReader();
    const decoder   = new TextDecoder();
    let   buffer    = '';

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
            bubble.innerHTML = addCopyButtons(renderMarkdown(fullText));
            scrollToBottom();
          }
          if (data.done) {
            lastAnswer = fullText;
            generateFollowUps(fullText);
          }
          if (data.error) throw new Error(data.error);
        } catch {}
      }
    }
  } catch (err) {
    thinking.remove();
    appendMessage('assistant', `⚠️ Error: ${err.message}`);
    scrollToBottom();
  } finally {
    isSending = false;
    document.getElementById('send-btn').disabled = false;
    input.focus();
  }
}

async function clearChat() {
  if (!confirm('Clear all conversation history?')) return;
  await API.delete(`/api/chat/${currentRepoId}/messages`);
  document.getElementById('messages-inner').innerHTML = '';
  document.getElementById('suggestions-bar').style.display = 'block';
  renderSuggestions();
  showToast('Conversation cleared');
}

function renderMetaCard(repo) {
  document.getElementById('meta-card').innerHTML = `
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-num">${repo.file_count||0}</div><div class="meta-label">Files</div></div>
      <div class="meta-item"><div class="meta-num">${repo.language||'—'}</div><div class="meta-label">Language</div></div>
      <div class="meta-item"><div class="meta-num">${repo.stars||0}</div><div class="meta-label">Stars</div></div>
    </div>`;
}

async function loadTopQuestions(repoId) {
  try {
    const qs = await API.get(`/api/chat/${repoId}/top-questions`);
    if (!qs.length) return;
    const card = document.getElementById('top-questions-card');
    card.style.display = 'block';
    document.getElementById('top-questions-list').innerHTML = qs.map(q => `
      <div class="top-q-item" onclick="askTopQuestion('${escapeHtml(q.question).replace(/'/g,"\\'")}')">
        <span>${escapeHtml(q.question)}</span>
        <span class="top-q-count">${q.count}×</span>
      </div>`).join('');
  } catch {}
}

function askTopQuestion(q) {
  switchChatTab('chat');
  document.getElementById('chat-input').value = q;
  sendMessage();
}

function renderFileTree(files) {
  document.getElementById('files-tree').innerHTML = files.map(f => {
    const ext = getExt(f).replace('.', '') || 'file';
    const safe = escapeHtml(f).replace(/'/g,"\\'");
    return `
      <div class="file-row" style="justify-content:space-between" onclick="openFile('${safe}')">
        <span style="display:flex;align-items:center;gap:0.5rem;min-width:0">
          <span class="file-ext-badge">${escapeHtml(ext)}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f)}</span>
        </span>
        <button onclick="event.stopPropagation();askAboutFile('${safe}')" style="
          flex-shrink:0;background:transparent;border:1px solid var(--border2);
          border-radius:6px;color:var(--accent2);font-size:0.72rem;padding:0.15rem 0.5rem;
          cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:inherit"
          onmouseover="this.style.background='rgba(108,99,255,0.1)'"
          onmouseout="this.style.background='transparent'">
          Ask AI
        </button>
      </div>`;
  }).join('');
}

function filterFiles(q) {
  const filtered = q ? currentFileList.filter(f => f.toLowerCase().includes(q.toLowerCase())) : currentFileList;
  renderFileTree(filtered);
}

function openFile(path) {
  const ctx    = currentContext.context || '';
  const marker = `### File: ${path}\n`;
  const start  = ctx.indexOf(marker);
  if (start === -1) { showToast('File content not available', 'error'); return; }
  const next   = ctx.indexOf('### File:', start + marker.length);
  let   raw    = ctx.slice(start + marker.length, next === -1 ? undefined : next)
    .replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();

  // Parse .ipynb — fetch fresh from GitHub to avoid truncation
  if (path.endsWith('.ipynb')) {
    document.getElementById('file-modal-name').textContent = path;
    document.getElementById('file-viewer-content').textContent = 'Loading notebook…';
    document.getElementById('file-modal').classList.add('show');
    API.get(`/api/repos/${currentRepoId}/file?path=${encodeURIComponent(path)}`)
      .then(data => {
        try {
          const nb        = JSON.parse(data.content);
          const cells     = nb.cells || [];
          const codeParts = [];
          cells.forEach((cell, i) => {
            if (cell.cell_type === 'code') {
              const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
              if (src.trim()) codeParts.push(`# ── Cell ${i + 1} ──────────────────────\n${src}`);
            } else if (cell.cell_type === 'markdown') {
              const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
              if (src.trim()) codeParts.push(`# 📝 ${src.replace(/\n/g, '\n# ')}`);
            }
          });
          document.getElementById('file-viewer-content').textContent =
            codeParts.join('\n\n') || '# No code cells found.';
        } catch {
          document.getElementById('file-viewer-content').textContent = data.content;
        }
      })
      .catch(e => {
        document.getElementById('file-viewer-content').textContent = 'Error loading file: ' + e.message;
      });
    return;
  }

  document.getElementById('file-modal-name').textContent = path;
  document.getElementById('file-viewer-content').textContent = raw;
  document.getElementById('file-modal').classList.add('show');
  document.querySelectorAll('.file-row').forEach(r => r.classList.remove('active'));
  event?.currentTarget?.classList?.add('active');
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function doCodeSearch() {
  const q = document.getElementById('code-search-input').value.trim();
  if (!q || !currentRepoId) return;
  const el = document.getElementById('search-results');
  el.innerHTML = '<div class="search-empty">Searching…</div>';
  try {
    const results = await API.get(`/api/repos/${currentRepoId}/search?q=${encodeURIComponent(q)}`);
    if (!results.length) {
      el.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(q)}</strong>"</div>`;
      return;
    }
    el.innerHTML = results.map(r => `
      <div class="search-result" onclick="openFile('${escapeHtml(r.file).replace(/'/g,"\\'")}')">
        <div class="search-result-file"> ${escapeHtml(r.file)}</div>
        <div class="search-result-excerpt">${escapeHtml(r.excerpt)}</div>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div class="search-empty">Error: ${e.message}</div>`;
  }
}

async function generateSummary() {
  const btn = document.getElementById('gen-summary-btn');
  const el  = document.getElementById('summary-content');
  if (!currentRepoId) return;

  btn.disabled    = true;
  btn.textContent = '⏳ Generating…';
  el.innerHTML    = '<p style="color:var(--muted)">Generating summary with AI… this may take 10–20 seconds.</p>';

  try {
    const data = await API.post(`/api/repos/${currentRepoId}/summary`, {});
    renderMarkdownInto(el, data.summary);
    btn.textContent = '✨ Regenerate';
    showToast('Summary generated!', 'success');
  } catch (err) {
    el.innerHTML = `<p style="color:var(--red)">Failed: ${err.message}</p>`;
    btn.textContent = '✨ Generate Summary';
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Follow-up suggestions ─────────────────────────────────────────────────────
async function generateFollowUps(lastAnswer) {
  if (!currentRepoId || !lastAnswer) return;
  const repoName = document.getElementById('chat-repo-name').textContent;

  // Remove existing follow-ups
  document.getElementById('followup-bar')?.remove();

  try {
    const data = await API.post('/api/chat/followups', {
      answer:    lastAnswer.slice(0, 800),
      repo_name: repoName,
    });
    if (!data.questions || !data.questions.length) return;

    const bar = document.createElement('div');
    bar.id    = 'followup-bar';
    bar.style.cssText = 'padding:0 1.5rem 0.75rem;flex-shrink:0';
    bar.innerHTML = `
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem">💡 Follow-up questions</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.45rem">
        ${data.questions.map(q => `
          <button class="suggestion-chip" style="border-color:rgba(108,99,255,0.3)"
            onclick="useFollowUp(this)">${escapeHtml(q)}</button>`).join('')}
      </div>`;

    const inputBar = document.querySelector('.chat-input-bar');
    inputBar.parentNode.insertBefore(bar, inputBar);
  } catch {}
}

function useFollowUp(btn) {
  document.getElementById('chat-input').value = btn.textContent;
  document.getElementById('followup-bar')?.remove();
  sendMessage();
}

// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportChatPDF() {
  if (!currentRepoId) return;
  const btn = document.getElementById('export-pdf-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Exporting…'; }

  try {
    const msgs     = await API.get(`/api/chat/${currentRepoId}/messages`);
    const repoName = document.getElementById('chat-repo-name').textContent;
    const date     = new Date().toLocaleDateString();

    if (!msgs.length) { showToast('No conversation to export', 'error'); return; }

    // Build HTML for PDF
    const rows = msgs.map(m => {
      const isUser = m.role === 'user';
      return `
        <div style="margin-bottom:20px;page-break-inside:avoid">
          <div style="font-weight:bold;font-size:12px;color:${isUser?'#6c63ff':'#059669'};margin-bottom:6px">
            ${isUser ? '👤 You' : '🤖 RepoTutor AI'}
            <span style="font-weight:normal;color:#999;margin-left:8px;font-size:10px">
              ${new Date(m.created_at).toLocaleTimeString()}
            </span>
          </div>
          <div style="background:${isUser?'#f0effe':'#f0fdf4'};border-left:3px solid ${isUser?'#6c63ff':'#059669'};
            padding:10px 14px;border-radius:0 8px 8px 0;font-size:12px;line-height:1.7;white-space:pre-wrap">
            ${m.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
          </div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>RepoTutor — ${repoName}</title>
      <style>
        body { font-family: -apple-system, Arial, sans-serif; max-width:800px; margin:0 auto; padding:40px 30px; color:#1a1a1a; }
        h1   { color:#6c63ff; font-size:22px; margin-bottom:4px; }
        .sub { color:#666; font-size:13px; margin-bottom:30px; padding-bottom:16px; border-bottom:2px solid #eee; }
      </style>
    </head><body>
      <h1> ${repoName}</h1>
      <div class="sub">RepoTutor Chat Export &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; ${msgs.length} messages</div>
      ${rows}
    </body></html>`;

    // Open in new tab — user can print/save as PDF from browser
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);

    showToast('Chat opened — use Print → Save as PDF', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Export PDF'; }
  }
}

// ── Ask about specific file ───────────────────────────────────────────────────
function askAboutFile(path) {
  const question = `Explain the file \`${path}\` in detail — its purpose, how it works, key functions or classes, and how it connects to the rest of the project.`;
  switchChatTab('chat');
  document.getElementById('chat-input').value = question;
  sendMessage();
}