import {
  extractProblemSlugFromUrl,
  fetchProblemMetadata,
} from '../leetcode/client';
import { verifyAcceptedStatus } from '../leetcode/verdict-filter';
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

window.addEventListener('message', async (event: MessageEvent) => {
  // Only accept messages from our own window
  if (event.source !== window) return;

  const data = event.data;
  if (data?.source !== 'CODESYNC_INTERCEPTOR') return;

  if (data.type === 'SUBMISSION_ACCEPTED') {
    const raw = data.payload as InterceptedAcceptedPayload;

    if (!raw.submissionId) {
      console.warn('[CodeSync] Received accepted event without submissionId.');
      return;
    }

    if (processedSubmissions.has(raw.submissionId)) {
      console.log(`[CodeSync] Submission ${raw.submissionId} already processed. Skipping duplicate.`);
      return;
    }

    // Mark as seen
    processedSubmissions.add(raw.submissionId);

    // Double-check strict accepted status
    if (!verifyAcceptedStatus('Accepted')) {
      return;
    }

    // Resolve title slug
    const slug = raw.slug || extractProblemSlugFromUrl(window.location.href);
    if (!slug) {
      console.warn('[CodeSync] Could not determine problem slug for submission:', raw.submissionId);
      return;
    }

    console.log(`[CodeSync] Fetching metadata for problem: ${slug}...`);
    const metadata = await fetchProblemMetadata(slug);

    const submissionData: SubmissionData = {
      submissionId: raw.submissionId,
      questionId: raw.questionId || metadata?.questionId || '',
      questionFrontendId: metadata?.questionFrontendId || '',
      questionTitle: metadata?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      questionSlug: slug,
      status: 'Accepted',
      lang: raw.lang,
      code: raw.code,
      timestamp: raw.timestamp || Date.now(),
      stats: raw.stats,
    };

    console.log('[CodeSync] Dispatching verified Accepted submission to service worker:', submissionData);

    try {
      chrome.runtime.sendMessage({
        type: 'CODESYNC_SUBMISSION_DETECTED',
        payload: submissionData,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug('[CodeSync] Service worker response note:', chrome.runtime.lastError.message);
        } else {
          console.log('[CodeSync] Service worker acknowledged:', response);
        }
      });
    } catch (err) {
      console.error('[CodeSync] Error sending message to service worker:', err);
    }
  }
});
