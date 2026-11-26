import {
  extractProblemSlugFromUrl,
  fetchProblemMetadata,
  fetchSubmissionBenchmarks,
} from '../leetcode/client';
import { verifyAcceptedStatus } from '../leetcode/verdict-filter';
import { mountCodeSyncBadge } from './status-badge';
import type { SubmissionData } from '@leetsync/shared';

console.log('[CodeSync] Content script active on LeetCode page:', window.location.href);

// Deduplication cache to avoid processing the same submission multiple times in the same session
const processedSubmissions = new Set<string>();

interface InterceptedAcceptedPayload {
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
  ? mountCodeSyncBadge(async () => {
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
      dispatchToBackground(submissionData);
    })
  : null;

function dispatchToBackground(submissionData: SubmissionData) {
  badge?.setState('syncing', 'Syncing...');
  try {
    chrome.runtime.sendMessage(
      {
        type: 'CODESYNC_SUBMISSION_DETECTED',
        payload: submissionData,
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
  if (!raw.submissionId || !/^\d+$/.test(raw.submissionId)) {
    console.debug('[CodeSync] Ignoring non-submission check event:', raw.submissionId);
    return;
  }

  if (processedSubmissions.has(raw.submissionId)) {
    console.log(`[CodeSync] Submission ${raw.submissionId} already processed. Skipping duplicate.`);
    return;
  }

  // Mark as seen immediately to prevent race between /check/ interceptor and GraphQL fallback poller
  processedSubmissions.add(raw.submissionId);

  if (!verifyAcceptedStatus('Accepted')) {
    return;
  }

  const slug = raw.slug || extractProblemSlugFromUrl(window.location.href);
  if (!slug) {
    console.warn('[CodeSync] Could not determine problem slug for submission:', raw.submissionId);
    return;
  }

  badge?.setState('syncing', 'Fetching metadata...');
  const needsBenchmarks = !raw.code?.trim() || raw.stats?.runtimePercentile === undefined;
  const [metadata, benchmarks] = await Promise.all([
    fetchProblemMetadata(slug),
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

  const submissionData: SubmissionData = {
    submissionId: raw.submissionId,
    questionId: raw.questionId || metadata?.questionId || '',
    questionFrontendId: metadata?.questionFrontendId || '',
    questionTitle: metadata?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    questionSlug: slug,
    status: 'Accepted',
    lang: raw.lang || benchmarks?.langSlug || '',
    code: finalCode,
    timestamp: raw.timestamp || Date.now(),
    stats: mergedStats,
  };

  console.log('[CodeSync] Dispatching verified Accepted submission to service worker:', submissionData);
  dispatchToBackground(submissionData);
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
