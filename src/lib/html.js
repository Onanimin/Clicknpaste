const HTML_ESCAPE_PATTERN = /[&<>"']/g;

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  return String(value).replace(HTML_ESCAPE_PATTERN, (character) => HTML_ESCAPE_MAP[character]);
}

export function renderPastePage({ id, content, expiresAt, remainingViews }) {
  const escapedContent = escapeHtml(content);
  const escapedId = escapeHtml(id);
  const viewsLabel = remainingViews === null ? 'Unlimited' : String(remainingViews);
  const rawUrl = `/p/${escapedId}/raw`;
  const deleteUrl = `/api/pastes/${escapedId}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paste ${escapedId}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #0f172a;
      --panel: #111827;
      --panel-2: #1f2937;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --border: rgba(148, 163, 184, 0.18);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top, #1e293b, var(--bg));
      color: var(--text);
      min-height: 100vh;
      padding: 32px 16px;
    }
    main {
      max-width: 960px;
      margin: 0 auto;
      background: rgba(17, 24, 39, 0.92);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.45);
    }
    header {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(56, 189, 248, 0.14), transparent);
    }
    h1 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: 0.02em;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .meta span {
      background: rgba(31, 41, 55, 0.9);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 999px;
      padding: 10px 14px;
      text-decoration: none;
      font-weight: 700;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    .action:hover { transform: translateY(-1px); }
    .action.primary {
      color: #0f172a;
      background: linear-gradient(135deg, #38bdf8, #7dd3fc);
    }
    .action.secondary {
      color: var(--text);
      background: rgba(31, 41, 55, 0.9);
    }
    .action.danger {
      color: #fecaca;
      background: rgba(127, 29, 29, 0.35);
      border-color: rgba(248, 113, 113, 0.35);
    }
    pre {
      margin: 0;
      padding: 28px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 1rem;
      line-height: 1.6;
      background: var(--panel);
    }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Paste ${escapedId}</h1>
      <div class="meta">
        <span>Remaining views: ${viewsLabel}</span>
      </div>
      <div class="actions">
        <a class="action primary" href="${rawUrl}">Open raw</a>
        <button class="action danger" id="delete-paste-btn" type="button">Delete paste</button>
      </div>
    </header>
    <pre><code>${escapedContent}</code></pre>
  </main>
  <script>
    const deleteButton = document.getElementById('delete-paste-btn');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        const password = window.prompt('Enter password to delete this paste (leave blank for public pastes):', '');
        if (password === null) return;

        const confirmed = window.confirm('Delete this paste permanently?');
        if (!confirmed) return;

        try {
          const response = await fetch('${deleteUrl}', {
            method: 'DELETE',
            headers: password ? { 'x-paste-password': password } : {}
          });

          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            window.alert(body.error || 'Unable to delete paste');
            return;
          }

          window.location.href = '/';
        } catch (error) {
          window.alert('Network error while deleting paste');
        }
      });
    }
  </script>
</body>
</html>`;
}

export function renderPrivatePastePromptPage({ id, invalid = false }) {
  const escapedId = escapeHtml(id);
  const errorHtml = invalid
    ? '<p style="color:#fca5a5;margin:0 0 14px">Invalid password. Try again.</p>'
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Private paste ${escapedId}</title>
  <style>
    body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Inter,ui-sans-serif,system-ui;padding:28px}
    main{max-width:560px;margin:40px auto;background:#111827;border:1px solid rgba(148,163,184,.2);border-radius:16px;padding:20px}
    h1{margin:0 0 8px;font-size:1.2rem}
    p{color:#94a3b8;margin:0 0 16px}
    input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,.3);background:#1f2937;color:#fff;box-sizing:border-box}
    button{margin-top:12px;padding:10px 14px;border:0;border-radius:10px;background:#38bdf8;color:#0b1220;font-weight:700;cursor:pointer}
  </style>
</head>
<body>
  <main>
    <h1>Private paste ${escapedId}</h1>
    <p>This paste is password-protected. Enter the password to view it.</p>
    ${errorHtml}
    <form method="GET" action="/p/${escapedId}">
      <input type="password" name="password" placeholder="Enter password" required />
      <button type="submit">Unlock paste</button>
    </form>
  </main>
</body>
</html>`;
}