/**
 * Bug Hunter — scans repo code for bugs, security issues, bad practices
 */
async function runBugScan() {
  if (!currentRepoId) return;
  const btn    = document.getElementById('btn-bug-scan');
  const output = document.getElementById('bug-output');
  btn.disabled    = true;
  btn.textContent = 'Scanning...';
  output.innerHTML = '<p style="color:var(--muted);padding:1rem">Scanning for bugs and security issues — this takes 15-30 seconds...</p>';

  try {
    const res = await fetch(`/api/bugs/${currentRepoId}`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
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
    showToast('Bug scan complete!', 'success');
  } catch (e) {
    output.innerHTML = `<p style="color:var(--red)">Error: ${e.message}</p>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Scan Again';
  }
}