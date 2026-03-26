marked.setOptions({ breaks: true, gfm: true, pedantic: false });
function renderMarkdown(text) { return text ? marked.parse(text) : ''; }
function renderMarkdownInto(el, md) { if (el) el.innerHTML = renderMarkdown(md); }
