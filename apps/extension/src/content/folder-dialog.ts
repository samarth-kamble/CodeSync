import type { SubmissionData, ProblemMetadata } from '@leetsync/shared';

export interface FolderDialogContext {
  repoFullName: string;
  branch: string;
  folders: string[];
  defaultParentFolder: string;
  problemFolderName: string;
  solutionFileName: string;
  defaultCommitMessage: string;
  submission: SubmissionData;
  problem?: ProblemMetadata | null;
}

export interface FolderDialogResult {
  confirmed: boolean;
  customParentFolder?: string;
  customCommitMessage?: string;
}

const DIALOG_HOST_ID = 'codesync-folder-dialog-host';

function sanitizeFolderPathInput(input: string): string {
  return input
    .trim()
    .split('/')
    .map((seg) =>
      seg
        .trim()
        .replace(/[<>:"\\|?*\x00-\x1F]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .toLowerCase(),
    )
    .filter(Boolean)
    .join('/');
}

export function openFolderPickerDialog(ctx: FolderDialogContext): Promise<FolderDialogResult> {
  return new Promise((resolve) => {
    const existing = document.getElementById(DIALOG_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = DIALOG_HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .backdrop {
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(2, 6, 23, 0.78);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .modal {
        width: 100%; max-width: 520px;
        background: #0f172a; color: #f1f5f9;
        border: 1px solid #334155; border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6);
        overflow: hidden;
      }
      .header {
        padding: 14px 18px; border-bottom: 1px solid #1e293b;
        display: flex; align-items: center; justify-content: space-between;
        background: #020617;
      }
      .title { font-size: 14px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
      .badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); font-weight: 600; }
      .close-btn { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; }
      .close-btn:hover { color: #fff; }
      .body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
      .meta {
        display: flex; justify-content: space-between; align-items: center; gap: 8px;
        padding: 10px 12px; border-radius: 10px; background: #020617; border: 1px solid #1e293b;
        font-size: 12px;
      }
      .meta-title { font-weight: 600; color: #f8fafc; }
      .meta-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; font-family: ui-monospace, monospace; }
      .repo-pill { font-size: 11px; color: #fb923c; font-family: ui-monospace, monospace; }
      .row { display: flex; gap: 8px; }
      input {
        width: 100%; background: #020617; color: #f1f5f9;
        border: 1px solid #334155; border-radius: 8px;
        padding: 8px 10px; font-size: 12px; outline: none;
      }
      input:focus { border-color: #f97316; }
      .folder-list {
        max-height: 190px; overflow-y: auto;
        border: 1px solid #1e293b; border-radius: 10px; background: #020617;
        padding: 4px;
      }
      .folder-item {
        width: 100%; text-align: left; background: transparent; border: none;
        color: #cbd5e1; padding: 7px 10px; border-radius: 7px;
        font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;
        font-family: ui-monospace, monospace;
      }
      .folder-item:hover { background: #1e293b; }
      .folder-item.active { background: rgba(249, 115, 22, 0.16); color: #fb923c; border: 1px solid rgba(249,115,22,0.35); }
      .preview {
        padding: 9px 12px; border-radius: 8px; background: rgba(16,185,129,0.06);
        border: 1px solid rgba(16,185,129,0.2); font-size: 11px; color: #94a3b8;
      }
      .preview code { color: #34d399; font-family: ui-monospace, monospace; word-break: break-all; }
      .label { font-size: 11px; font-weight: 600; color: #cbd5e1; margin-bottom: 4px; display: block; }
      .footer {
        padding: 12px 18px; border-top: 1px solid #1e293b; background: #020617;
        display: flex; justify-content: flex-end; gap: 8px;
      }
      .btn {
        border: none; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .btn-secondary { background: #1e293b; color: #cbd5e1; }
      .btn-secondary:hover { background: #334155; }
      .btn-primary { background: #f97316; color: #fff; }
      .btn-primary:hover { background: #ea580c; }
      .btn-outline { background: #0f172a; color: #fb923c; border: 1px solid #334155; white-space: nowrap; }
      .btn-outline:hover { border-color: #f97316; }
    `;

    const allFolders = Array.from(new Set(ctx.folders));
    let selectedFolder = ctx.defaultParentFolder || '';
    let searchQuery = '';

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const title = ctx.problem?.title || ctx.submission.questionTitle;
    const id = ctx.problem?.questionFrontendId || ctx.submission.questionFrontendId;
    const runtime = ctx.submission.stats?.runtimeDisplay || '';
    const memory = ctx.submission.stats?.memoryDisplay || '';
    const benchText = [runtime, memory].filter(Boolean).join(' • ');

    modal.innerHTML = `
      <div class="header">
        <div class="title">
          <span>Push to GitHub</span>
          <span class="badge">Accepted</span>
        </div>
        <button class="close-btn" id="cs-close" title="Cancel">&times;</button>
      </div>
      <div class="body">
        <div class="meta">
          <div>
            <div class="meta-title">#${id}. ${title}</div>
            <div class="meta-sub">${ctx.submission.lang}${benchText ? ' • ' + benchText : ''}</div>
          </div>
          <div class="repo-pill">${ctx.repoFullName} (${ctx.branch})</div>
        </div>

        <div>
          <span class="label">Select Repository Folder</span>
          <input id="cs-search" type="text" placeholder="Search folders..." style="margin-bottom: 6px;" />
          <div class="folder-list" id="cs-folder-list"></div>
        </div>

        <div>
          <span class="label">Or Create New Folder</span>
          <div class="row">
            <input id="cs-new-folder" type="text" placeholder="e.g. sliding-window or dsa/trees" />
            <button type="button" class="btn btn-outline" id="cs-add-folder">+ Use Folder</button>
          </div>
        </div>

        <div class="preview">
          Destination: <code id="cs-preview-path"></code>
        </div>

        <div>
          <span class="label">Commit Message</span>
          <input id="cs-commit-msg" type="text" />
        </div>
      </div>
      <div class="footer">
        <button type="button" class="btn btn-secondary" id="cs-cancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="cs-push">Push to GitHub</button>
      </div>
    `;

    backdrop.appendChild(modal);
    shadow.append(style, backdrop);
    document.body.appendChild(host);

    const searchInput = shadow.getElementById('cs-search') as HTMLInputElement;
    const folderListEl = shadow.getElementById('cs-folder-list') as HTMLDivElement;
    const newFolderInput = shadow.getElementById('cs-new-folder') as HTMLInputElement;
    const addFolderBtn = shadow.getElementById('cs-add-folder') as HTMLButtonElement;
    const previewEl = shadow.getElementById('cs-preview-path') as HTMLElement;
    const commitInput = shadow.getElementById('cs-commit-msg') as HTMLInputElement;
    const pushBtn = shadow.getElementById('cs-push') as HTMLButtonElement;
    const cancelBtn = shadow.getElementById('cs-cancel') as HTMLButtonElement;
    const closeBtn = shadow.getElementById('cs-close') as HTMLButtonElement;

    commitInput.value = ctx.defaultCommitMessage;

    const updatePreview = () => {
      const fullFolder = selectedFolder
        ? `${selectedFolder}/${ctx.problemFolderName}`
        : ctx.problemFolderName;
      previewEl.textContent = `${fullFolder}/${ctx.solutionFileName} (+ README.md)`;
    };

    const renderFolders = () => {
      folderListEl.innerHTML = '';

      // Root option
      const rootBtn = document.createElement('button');
      rootBtn.type = 'button';
      rootBtn.className = `folder-item ${selectedFolder === '' ? 'active' : ''}`;
      rootBtn.textContent = '📁 / (Repository Root)';
      rootBtn.addEventListener('click', () => {
        selectedFolder = '';
        renderFolders();
        updatePreview();
      });
      folderListEl.appendChild(rootBtn);

      const q = searchQuery.trim().toLowerCase();
      const filtered = allFolders.filter((f) => !q || f.toLowerCase().includes(q));

      for (const folder of filtered) {
        const depth = folder.split('/').length - 1;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `folder-item ${selectedFolder === folder ? 'active' : ''}`;
        btn.style.paddingLeft = `${10 + depth * 14}px`;
        btn.textContent = `📁 ${folder}`;
        btn.addEventListener('click', () => {
          selectedFolder = folder;
          renderFolders();
          updatePreview();
        });
        folderListEl.appendChild(btn);
      }
    };

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderFolders();
    });

    const handleAddFolder = () => {
      const cleaned = sanitizeFolderPathInput(newFolderInput.value);
      if (!cleaned) return;
      if (!allFolders.includes(cleaned)) {
        allFolders.unshift(cleaned);
      }
      selectedFolder = cleaned;
      newFolderInput.value = '';
      renderFolders();
      updatePreview();
    };

    addFolderBtn.addEventListener('click', handleAddFolder);
    newFolderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddFolder();
      }
    });

    const cleanup = (result: FolderDialogResult) => {
      host.remove();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => cleanup({ confirmed: false }));
    closeBtn.addEventListener('click', () => cleanup({ confirmed: false }));

    pushBtn.addEventListener('click', () => {
      pushBtn.disabled = true;
      pushBtn.textContent = 'Pushing...';
      cleanup({
        confirmed: true,
        customParentFolder: selectedFolder,
        customCommitMessage: commitInput.value.trim() || ctx.defaultCommitMessage,
      });
    });

    renderFolders();
    updatePreview();
  });
}
