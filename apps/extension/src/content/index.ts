import {
  extractProblemSlugFromUrl,
  fetchProblemMetadata,
  fetchSubmissionBenchmarks,
} from '../leetcode/client';
import {
  extractGfgSlugFromUrl,
  fetchGfgProblemMetadata,
  normalizeGfgLanguage,
} from '../gfg/client';
import { verifyAcceptedStatus } from '../leetcode/verdict-filter';
import { mountCodeSyncBadge } from './status-badge';
import { openFolderPickerDialog } from './folder-dialog';
import type { CodingPlatform, SubmissionData, ProblemMetadata } from '@leetsync/shared';

const currentPlatform: CodingPlatform =
  typeof window !== 'undefined' && window.location.hostname.includes('geeksforgeeks.org')
    ? 'gfg'
    : 'leetcode';

console.log('[CodeSync] Content script active on LeetCode page:', window.location.href);

// Deduplication cache to avoid processing the same submission multiple times in the same session
const processedSubmissions = new Set<string>();
let lastGfgNetworkSyncAt = 0;

function isGfgSolvedVisible(): boolean {
  return Boolean(document.body?.innerText?.includes('Problem Solved Successfully'));
}

function requestGfgEditorState(): Promise<{ code: string; lang: string }> {
  return new Promise((resolve) => {
    const requestId = `gfg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve({ code: '', lang: '' });
    }, 1200);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (
        data?.source === 'CODESYNC_INTERCEPTOR' &&
        data?.type === 'GFG_EDITOR_STATE' &&
        data?.payload?.requestId === requestId
      ) {
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve({
          code: String(data.payload.code || ''),
          lang: String(data.payload.lang || ''),
        });
      }
    }

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        source: 'CODESYNC_CONTENT',
        type: 'REQUEST_GFG_EDITOR_STATE',
        requestId,
      },
      '*',
    );
  });
}

async function syncGfgFromDom(isManual: boolean): Promise<void> {
  if (!isGfgSolvedVisible()) {
    if (isManual) {
      badge?.setState('error', 'Pass GFG Submit first');
    }
    return;
  }

  if (!isManual && Date.now() - lastGfgNetworkSyncAt < 8000) {
    return;
  }

  const slug = extractGfgSlugFromUrl(window.location.href);
  if (!slug) {
    if (isManual) badge?.setState('error', 'No problem detected');
    return;
  }

  const { code, lang } = await requestGfgEditorState();
  if (!code.trim()) {
    if (isManual) badge?.setState('error', 'Could not read editor');
    return;
  }

  const timeMatch = document.body?.innerText?.match(/Time Taken\s+([0-9.]+)/i);
  const runtimeDisplay = timeMatch ? `${timeMatch[1]} s` : undefined;
  const dedupKey = isManual ? `gfg-manual-${Date.now()}` : `gfg-dom-${slug}-${code.length}-${code.slice(0, 40)}`;

  await processAcceptedPayload({
    platform: 'gfg',
    submissionId: dedupKey,
    questionId: '',
    lang: lang || 'cpp',
    code,
    slug,
    stats: runtimeDisplay ? { runtimeDisplay } : undefined,
    timestamp: Date.now(),
  });
}

interface InterceptedAcceptedPayload {
  platform?: CodingPlatform;
  submissionId: string;
  questionId: string;
  lang: string;
  code: string;
  slug?: string;
  stats?: {
    runtimeMs?: number;
    runtimeDisplay?: string;
    runtimePercentile?: number;
    memoryBytes?: number;
    memoryDisplay?: string;
    memoryPercentile?: number;
  };
  timestamp: number;
}

async function fetchLatestAcceptedSubmission(slug: string): Promise<SubmissionData | null> {
  try {
    const listRes = await fetch(`https://leetcode.com/api/submissions/${encodeURIComponent(slug)}/?offset=0&limit=10`, {
      credentials: 'include',
    });
    if (!listRes.ok) return null;

    const listData = await listRes.json() as {
      submissions_dump?: Array<{
        id: number;
        status_display: string;
        lang: string;
        code: string;
        runtime?: string;
        memory?: string;
        timestamp?: number;
      }>;
    };

    const accepted = listData.submissions_dump?.find((s) => s.status_display === 'Accepted');
    if (!accepted) return null;

    const [metadata, benchmarks] = await Promise.all([
      fetchProblemMetadata(slug),
      fetchSubmissionBenchmarks(String(accepted.id)),
    ]);

    return {
      submissionId: String(accepted.id),
      questionId: metadata?.questionId || '',
      questionFrontendId: metadata?.questionFrontendId || '',
      questionTitle: metadata?.title || slug,
      questionSlug: slug,
      status: 'Accepted',
      lang: accepted.lang,
      code: accepted.code,
      timestamp: accepted.timestamp ? accepted.timestamp * 1000 : Date.now(),
      stats: {
        runtimeMs: accepted.runtime ? parseInt(accepted.runtime, 10) : undefined,
        runtimeDisplay: benchmarks?.runtimeDisplay || accepted.runtime,
        runtimePercentile: benchmarks?.runtimePercentile,
        memoryDisplay: benchmarks?.memoryDisplay || accepted.memory,
        memoryPercentile: benchmarks?.memoryPercentile,
      },
    };
  } catch (err) {
    console.error('[CodeSync] Manual sync fetch failed:', err);
    return null;
  }
}

const badge = typeof document !== 'undefined'
  ? mountCodeSyncBadge(
      async () => {
        if (currentPlatform === 'gfg') {
          await syncGfgFromDom(true);
          return;
        }
        const slug = extractProblemSlugFromUrl(window.location.href);
        if (!slug) {
          badge?.setState('error', 'No problem detected');
          return;
        }
        badge?.setState('syncing', 'Fetching accepted...');
        const submissionData = await fetchLatestAcceptedSubmission(slug);
        if (!submissionData) {
          badge?.setState('error', 'No Accepted found');
          return;
        }
        const metadata = await fetchProblemMetadata(slug);
        await syncWithOptionalDialog(submissionData, metadata);
      },
      { bottomOffsetPx: currentPlatform === 'gfg' ? 72 : 20 },
    )
  : null;

interface DialogContextResponse {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  askFolderBeforeSync?: boolean;
  autoSync?: boolean;
  repoFullName?: string;
  branch?: string;
  folders?: string[];
  defaultParentFolder?: string;
  problemFolderName?: string;
  solutionFileName?: string;
  defaultCommitMessage?: string;
}

async function syncWithOptionalDialog(
  submissionData: SubmissionData,
  problemMetadata: ProblemMetadata | null,
) {
  try {
    const context = await new Promise<DialogContextResponse>((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'CODESYNC_GET_DIALOG_CONTEXT',
          payload: { submission: submissionData, problem: problemMetadata },
        },
        (res: DialogContextResponse | undefined) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { ok: false, error: 'No response from service worker' });
          }
        },
      );
    });

    if (!context.ok) {
      const msg = context.error || context.message || 'Setup required';
      badge?.setState(
        'error',
        msg.includes('context invalidated') ? 'Refresh LeetCode tab' : msg,
      );
      return;
    }

    if (context.askFolderBeforeSync) {
      badge?.setState('syncing', 'Choose folder...');
      const dialogResult = await openFolderPickerDialog({
        repoFullName: context.repoFullName || '',
        branch: context.branch || 'main',
        folders: context.folders || [],
        defaultParentFolder: context.defaultParentFolder || '',
        problemFolderName: context.problemFolderName || submissionData.questionSlug,
        solutionFileName: context.solutionFileName || `${submissionData.questionSlug}.txt`,
        defaultCommitMessage: context.defaultCommitMessage || '',
        submission: submissionData,
        problem: problemMetadata,
      });

      if (!dialogResult.confirmed) {
        badge?.setState('idle', 'Cancelled');
        return;
      }

      dispatchToBackground(submissionData, {
        customParentFolder: dialogResult.customParentFolder,
        customCommitMessage: dialogResult.customCommitMessage,
      });
      return;
    }

    dispatchToBackground(submissionData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    badge?.setState(
      'error',
      msg.includes('context invalidated') ? 'Refresh LeetCode tab' : 'Extension error',
    );
  }
}

function dispatchToBackground(
  submissionData: SubmissionData,
  overrides?: { customParentFolder?: string; customCommitMessage?: string },
) {
  badge?.setState('syncing', 'Syncing...');
  try {
    chrome.runtime.sendMessage(
      {
        type: 'CODESYNC_SUBMISSION_DETECTED',
        payload: overrides
          ? {
              submission: submissionData,
              customParentFolder: overrides.customParentFolder,
              customCommitMessage: overrides.customCommitMessage,
            }
          : submissionData,
      },
      (response: { status?: string; result?: { commitUrl?: string }; message?: string; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          console.debug('[CodeSync] Service worker response note:', chrome.runtime.lastError.message);
          badge?.setState('error', chrome.runtime.lastError.message);
          return;
        }
        console.log('[CodeSync] Service worker acknowledged:', response);
        if (response?.status === 'SUCCESS') {
          badge?.setState('synced', 'Synced ✓', response.result?.commitUrl);
        } else if (response?.status === 'SKIPPED') {
          badge?.setState('skipped', 'Skipped');
        } else if (response?.status === 'NOT_CONNECTED' || response?.status === 'NO_REPO_SELECTED') {
          badge?.setState('error', response.message || 'Setup required');
        } else if (response?.status === 'FAILED' || response?.status === 'ERROR') {
          badge?.setState('error', response.error || 'Sync failed');
        }
      },
    );
  } catch (err) {
    console.error('[CodeSync] Error sending message to service worker:', err);
    const msg = err instanceof Error ? err.message : String(err);
    badge?.setState(
      'error',
      msg.includes('context invalidated') ? 'Refresh LeetCode tab' : 'Extension error',
    );
  }
}

async function processAcceptedPayload(raw: InterceptedAcceptedPayload) {
  const platform: CodingPlatform = raw.platform || currentPlatform;
  const isLeetCode = platform === 'leetcode';

  if (!raw.submissionId || (isLeetCode && !/^\d+$/.test(raw.submissionId))) {
    console.debug('[CodeSync] Ignoring non-submission check event:', raw.submissionId);
    return;
  }

  if (processedSubmissions.has(raw.submissionId)) {
    console.log(`[CodeSync] Submission ${raw.submissionId} already processed. Skipping duplicate.`);
    return;
  }

  // Mark as seen immediately to prevent race between /check/ interceptor and GraphQL fallback poller
  processedSubmissions.add(raw.submissionId);
  if (platform === 'gfg' && !raw.submissionId.startsWith('gfg-dom-')) {
    lastGfgNetworkSyncAt = Date.now();
  }

  if (!verifyAcceptedStatus('Accepted')) {
    return;
  }

  const slug =
    raw.slug ||
    (platform === 'gfg'
      ? extractGfgSlugFromUrl(window.location.href)
      : extractProblemSlugFromUrl(window.location.href));
  if (!slug) {
    console.warn('[CodeSync] Could not determine problem slug for submission:', raw.submissionId);
    return;
  }

  badge?.setState('syncing', 'Fetching metadata...');
  const needsBenchmarks =
    isLeetCode && (!raw.code?.trim() || raw.stats?.runtimePercentile === undefined);
  const [metadata, benchmarks] = await Promise.all([
    platform === 'gfg' ? fetchGfgProblemMetadata(slug) : fetchProblemMetadata(slug),
    needsBenchmarks ? fetchSubmissionBenchmarks(raw.submissionId) : Promise.resolve(null),
  ]);

  const finalCode = raw.code?.trim() ? raw.code : benchmarks?.code || '';
  if (!finalCode.trim()) {
    console.warn('[CodeSync] Ignoring submission with empty code:', raw.submissionId);
    badge?.setState('error', 'Missing submission code');
    return;
  }

  const mergedStats = {
    ...raw.stats,
    runtimeDisplay: raw.stats?.runtimeDisplay || benchmarks?.runtimeDisplay,
    runtimePercentile: raw.stats?.runtimePercentile ?? benchmarks?.runtimePercentile,
    memoryDisplay: raw.stats?.memoryDisplay || benchmarks?.memoryDisplay,
    memoryPercentile: raw.stats?.memoryPercentile ?? benchmarks?.memoryPercentile,
  };

  const normalizedLang =
    platform === 'gfg'
      ? normalizeGfgLanguage(raw.lang)
      : raw.lang || benchmarks?.langSlug || '';

  const submissionData: SubmissionData = {
    platform,
    problemUrl: metadata?.problemUrl,
    submissionId: raw.submissionId,
    questionId: raw.questionId || metadata?.questionId || '',
    questionFrontendId: metadata?.questionFrontendId || '',
    questionTitle: metadata?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    questionSlug: slug,
    status: 'Accepted',
    lang: normalizedLang,
    code: finalCode,
    timestamp: raw.timestamp || Date.now(),
    stats: mergedStats,
  };

  console.log('[CodeSync] Verified Accepted submission ready:', submissionData);
  await syncWithOptionalDialog(submissionData, metadata);
}

async function pollSubmissionFallback(started: InterceptedAcceptedPayload) {
  const { submissionId } = started;
  if (!submissionId || !/^\d+$/.test(submissionId)) return;

  badge?.setState('syncing', 'Judging submission...');

  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    if (processedSubmissions.has(submissionId)) {
      return; // Already handled by /check/ interceptor
    }

    try {
      const checkRes = await fetch(
        `https://leetcode.com/submissions/detail/${encodeURIComponent(submissionId)}/check/`,
        { credentials: 'include' },
      );
      if (!checkRes.ok) continue;

      const data = (await checkRes.json()) as {
        state?: string;
        status_msg?: string;
        status_runtime?: string;
        runtime_percentile?: number;
        status_memory?: string;
        memory_percentile?: number;
        lang?: string;
        question_id?: string | number;
      };

      if (data.state !== 'SUCCESS') {
        continue; // Still PENDING or STARTED
      }

      const statusMsg = String(data.status_msg || '').trim();
      if (statusMsg.toLowerCase() === 'accepted') {
        await processAcceptedPayload({
          ...started,
          questionId: started.questionId || (data.question_id ? String(data.question_id) : ''),
          lang: started.lang || String(data.lang || ''),
          stats: {
            runtimeMs: data.status_runtime ? parseInt(data.status_runtime, 10) : undefined,
            runtimeDisplay: data.status_runtime || undefined,
            runtimePercentile:
              typeof data.runtime_percentile === 'number' ? data.runtime_percentile : undefined,
            memoryBytes: data.status_memory ? parseInt(data.status_memory, 10) : undefined,
            memoryDisplay: data.status_memory || undefined,
            memoryPercentile:
              typeof data.memory_percentile === 'number' ? data.memory_percentile : undefined,
          },
          timestamp: Date.now(),
        });
        return;
      }

      // Terminal non-Accepted verdict (Wrong Answer, TLE, etc.)
      badge?.setState('idle', statusMsg || 'Not Accepted');
      return;
    } catch {
      // Retry on transient network hiccup
    }
  }
}

window.addEventListener('message', async (event: MessageEvent) => {
  // Only accept messages from our own window
  if (event.source !== window) return;

  const data = event.data;
  if (data?.source !== 'CODESYNC_INTERCEPTOR') return;

  if (data.type === 'SUBMISSION_STARTED') {
    const started = data.payload as InterceptedAcceptedPayload;
    pollSubmissionFallback(started);
    return;
  }

  if (data.type === 'SUBMISSION_ACCEPTED') {
    await processAcceptedPayload(data.payload as InterceptedAcceptedPayload);
  }
});

if (currentPlatform === 'gfg' && typeof document !== 'undefined' && document.body) {
  let wasSolvedVisible = isGfgSolvedVisible();
  let solveDebounceTimer: number | null = null;

  const gfgObserver = new MutationObserver(() => {
    const nowSolvedVisible = isGfgSolvedVisible();
    if (!wasSolvedVisible && nowSolvedVisible) {
      if (solveDebounceTimer !== null) {
        window.clearTimeout(solveDebounceTimer);
      }
      solveDebounceTimer = window.setTimeout(() => {
        solveDebounceTimer = null;
        void syncGfgFromDom(false);
      }, 350);
    }
    wasSolvedVisible = nowSolvedVisible;
  });

  gfgObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
