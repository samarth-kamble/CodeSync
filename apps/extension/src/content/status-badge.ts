export type BadgeState = 'idle' | 'syncing' | 'synced' | 'skipped' | 'error';

export interface BadgeController {
  setState: (state: BadgeState, detail?: string, commitUrl?: string) => void;
}

const BADGE_HOST_ID = 'codesync-status-host';

export function mountCodeSyncBadge(onManualSync?: () => Promise<void>): BadgeController {
  const existing = document.getElementById(BADGE_HOST_ID);
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('div');
  host.id = BADGE_HOST_ID;
  host.style.position = 'fixed';
  host.style.bottom = '20px';
  host.style.right = '20px';
  host.style.zIndex = '2147483647';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 9999px;
      background: #0f172a;
      color: #f1f5f9;
      border: 1px solid #334155;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      background: #94a3b8;
      flex-shrink: 0;
    }
    .dot.syncing { background: #f97316; }
    .dot.synced { background: #10b981; }
    .dot.skipped { background: #eab308; }
    .dot.error { background: #ef4444; }
    .label { font-weight: 600; color: #f8fafc; }
    .detail { color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button {
      background: #f97316;
      color: #fff;
      border: none;
      border-radius: 9999px;
      padding: 3px 9px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #ea580c; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    a {
      color: #fb923c;
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
    }
    a:hover { text-decoration: underline; }
  `;

  const container = document.createElement('div');
  container.className = 'pill';

  const dot = document.createElement('span');
  dot.className = 'dot';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'CodeSync';

  const detailSpan = document.createElement('span');
  detailSpan.className = 'detail';
  detailSpan.textContent = 'Ready';

  const syncBtn = document.createElement('button');
  syncBtn.type = 'button';
  syncBtn.textContent = 'Sync Accepted';
  syncBtn.addEventListener('click', async () => {
    if (!onManualSync) return;
    syncBtn.disabled = true;
    try {
      await onManualSync();
    } finally {
      syncBtn.disabled = false;
    }
  });

  const commitLink = document.createElement('a');
  commitLink.target = '_blank';
  commitLink.rel = 'noreferrer';
  commitLink.textContent = 'View Commit';
  commitLink.style.display = 'none';

  container.append(dot, label, detailSpan, commitLink, syncBtn);
  shadow.append(style, container);
  document.body.appendChild(host);

  return {
    setState(state: BadgeState, detail?: string, commitUrl?: string) {
      dot.className = `dot ${state}`;
      if (state === 'syncing') {
        detailSpan.textContent = detail || 'Syncing...';
        commitLink.style.display = 'none';
        syncBtn.disabled = true;
      } else if (state === 'synced') {
        detailSpan.textContent = detail || 'Synced ✓';
        syncBtn.disabled = false;
        if (commitUrl) {
          commitLink.href = commitUrl;
          commitLink.style.display = 'inline';
        }
      } else if (state === 'skipped') {
        detailSpan.textContent = detail || 'Already synced';
        commitLink.style.display = 'none';
        syncBtn.disabled = false;
      } else if (state === 'error') {
        detailSpan.textContent = detail || 'Sync failed';
        commitLink.style.display = 'none';
        syncBtn.disabled = false;
      } else {
        detailSpan.textContent = detail || 'Ready';
        commitLink.style.display = 'none';
        syncBtn.disabled = false;
      }
    },
  };
}
