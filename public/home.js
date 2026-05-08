const form = document.getElementById('paste-form');
const result = document.getElementById('result');
const error = document.getElementById('error');
const recentCreated = new Map();

function toShareUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.toString();
  } catch {
    return String(url);
  }
}

function showError(message) {
  error.textContent = message;
  error.style.display = 'block';
  result.style.display = 'none';
}

function showResult(payload) {
  const shareUrl = toShareUrl(payload.url);
  result.innerHTML = '';
  const container = document.createElement('div');
  const text = document.createTextNode('Paste created: ');
  const link = document.createElement('a');
  link.href = shareUrl;
  link.textContent = shareUrl;
  container.appendChild(text);
  container.appendChild(link);

  const copyUrlBtn = document.createElement('button');
  copyUrlBtn.textContent = 'Copy';
  copyUrlBtn.style.marginLeft = '8px';
  copyUrlBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      const prev = copyUrlBtn.textContent;
      copyUrlBtn.textContent = 'Copied';
      setTimeout(() => { copyUrlBtn.textContent = prev; }, 2000);
    } catch (e) {
      copyUrlBtn.textContent = 'Copy failed';
    }
  });
  container.appendChild(copyUrlBtn);

  result.appendChild(container);

  if (payload.password) {
    const pwRow = document.createElement('div');
    pwRow.style.marginTop = '8px';
    pwRow.style.color = '#f0e6c8';
    pwRow.textContent = 'Password: ';

    const strong = document.createElement('strong');
    strong.textContent = String(payload.password);
    pwRow.appendChild(strong);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.marginLeft = '8px';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(String(payload.password));
        const prev = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = prev; }, 2000);
      } catch (e) {
        copyBtn.textContent = 'Copy failed';
      }
    });

    pwRow.appendChild(copyBtn);
    result.appendChild(pwRow);
  }
  result.style.display = 'block';
  error.style.display = 'none';

  if (payload.private) {
    recentCreated.set(payload.id, {
      id: payload.id,
      created_at: new Date().toISOString(),
      remaining_views: null,
      private: true
    });
  }
}

function renderRecentList(items) {
  const el = document.getElementById('recent-list');
  if (!el) return;

  const merged = new Map();
  items.forEach((item) => merged.set(item.id, item));
  recentCreated.forEach((item) => merged.set(item.id, item));

  const list = Array.from(merged.values());
  if (!list.length) {
    el.innerHTML = '<p>No pastes yet.</p>';
    return;
  }

  el.innerHTML = list.map(p => {
    const created = p.created_at || 'unknown';
    const remaining = p.remaining_views === null ? 'Unlimited' : p.remaining_views;
    const lock = p.private ? ' 🔒' : '';
    const badge = p.private ? '<span style="display:inline-flex;align-items:center;gap:6px;margin-left:8px;padding:2px 8px;border-radius:999px;background:rgba(255,177,77,0.18);border:1px solid rgba(255,177,77,0.4);color:#ffd199;font-size:0.78rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase">Locked</span>' : '';
    const hint = p.private ? '<div style="margin-top:6px;color:#ffd199;font-size:0.88rem">Password required to open</div>' : '';
    return '<div class="paste-item" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,177,77,0.06);margin-bottom:8px;background:rgba(255,255,255,0.01)"><div><a href="/p/'+p.id+'">/p/'+p.id+lock+'</a>'+badge+'</div><div style="font-size:0.9rem;color:#b6ad9f;margin-top:4px">Created: '+created+' • Remaining views: '+remaining+'</div>'+hint+'</div>';
  }).join('');
}

form.addEventListener('keydown', (evt) => {
  if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter' && evt.target.tagName !== 'TEXTAREA') {
    form.requestSubmit();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.style.display = 'none';
  result.style.display = 'none';

  const content = document.getElementById('content').value;
  const maxViews = document.getElementById('max_views').value;
  const password = document.getElementById('password').value;

  const body = { content };

  if (maxViews) {
    body.max_views = Number(maxViews);
  }

  if (password) {
    body.password = password;
  }

  try {
    const response = await fetch('/api/pastes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 503) {
        showError(data.error || 'Database unavailable. Connect Neon to create pastes.');
        return;
      }

      showError(data.error || 'Unable to create paste');
      return;
    }

    showResult(data);
    // refresh recent list after creation
    loadRecent();
  } catch (requestError) {
    showError('Network error while creating paste');
  }
});

async function loadRecent() {
  const el = document.getElementById('recent-list');
  if (!el) return;

  try {
    const resp = await fetch('/api/pastes', { cache: 'no-store' });
    if (!resp.ok) {
      el.innerHTML = '<p>Unable to load pastes.</p>';
      return;
    }

    const list = await resp.json();
    renderRecentList(Array.isArray(list) ? list : []);

  } catch (e) {
    el.innerHTML = '<p>Unable to load pastes.</p>';
  }
}

// load recent pastes on page load
document.addEventListener('DOMContentLoaded', () => {
  loadRecent();
  window.setInterval(loadRecent, 5000);
});
