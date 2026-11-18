/**
 * CodeSync Main World Network Interceptor
 * Injected into the LeetCode webpage context (world: "MAIN")
 * Hooks fetch and XMLHttpRequest to observe submission submissions and check results.
 */

interface PendingSubmission {
  submissionId?: string;
  lang: string;
  code: string;
  questionId: string;
  slug?: string;
  timestamp: number;
}

const pendingBySubmissionId = new Map<string, PendingSubmission>();
let lastSubmittedRequest: PendingSubmission | null = null;

function notifyContentScript(type: string, payload: unknown) {
  window.postMessage(
    {
      source: 'CODESYNC_INTERCEPTOR',
      type,
      payload,
    },
    '*',
  );
}

function handleSubmissionRequest(url: string, requestBody: string) {
  try {
    const slugMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    const slug = slugMatch ? slugMatch[1].toLowerCase() : undefined;
    const body = JSON.parse(requestBody);

    if (body.typed_code && body.lang) {
      lastSubmittedRequest = {
        lang: body.lang,
        code: body.typed_code,
        questionId: String(body.question_id || ''),
        slug,
        timestamp: Date.now(),
      };
      console.log(`[CodeSync] Detected submission initiation for problem: ${slug || 'unknown'}`);
    }
  } catch (err) {
    console.debug('[CodeSync] Could not parse submission request body:', err);
  }
}

function handleSubmissionResponse(responseText: string) {
  try {
    const json = JSON.parse(responseText);
    if (json.submission_id && lastSubmittedRequest) {
      const submissionId = String(json.submission_id);
      pendingBySubmissionId.set(submissionId, {
        ...lastSubmittedRequest,
        submissionId,
      });
      console.log(`[CodeSync] Associated submission ID: ${submissionId}`);
    }
  } catch (err) {
    console.debug('[CodeSync] Could not parse submission response:', err);
  }
}

function handleCheckResponse(url: string, responseText: string) {
  try {
    const checkMatch = url.match(/\/submissions\/detail\/([^/]+)\/check\/?/);
    if (!checkMatch) return;

    const submissionId = checkMatch[1];
    const data = JSON.parse(responseText);

    // Only process terminal states
    if (data.state !== 'SUCCESS') {
      // Still pending / judging
      return;
    }

    const statusMsg = String(data.status_msg || '');
    const isAccepted = statusMsg.trim().toLowerCase() === 'accepted';

    console.log(`[CodeSync] Submission ${submissionId} judging finished. Status: ${statusMsg}`);

    if (!isAccepted) {
      console.log(`[CodeSync] Submission ${submissionId} status is not Accepted (${statusMsg}). Discarding.`);
      pendingBySubmissionId.delete(submissionId);
      return;
    }

    // Submission is ACCEPTED!
    const pending = pendingBySubmissionId.get(submissionId) || lastSubmittedRequest;

    const stats = {
      runtimeMs: data.status_runtime ? parseInt(data.status_runtime, 10) : undefined,
      runtimeDisplay: data.status_runtime || undefined,
      runtimePercentile: typeof data.runtime_percentile === 'number' ? data.runtime_percentile : undefined,
      memoryBytes: data.status_memory ? parseInt(data.status_memory, 10) : undefined,
      memoryDisplay: data.status_memory || undefined,
      memoryPercentile: typeof data.memory_percentile === 'number' ? data.memory_percentile : undefined,
    };

    const payload = {
      submissionId,
      questionId: pending?.questionId || String(data.question_id || ''),
      lang: pending?.lang || String(data.lang || ''),
      code: pending?.code || '',
      slug: pending?.slug,
      stats,
      timestamp: Date.now(),
    };

    notifyContentScript('SUBMISSION_ACCEPTED', payload);
    pendingBySubmissionId.delete(submissionId);
  } catch (err) {
    console.error('[CodeSync] Error parsing check response:', err);
  }
}

// 1. Hook window.fetch
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  try {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';

    if (url.includes('/submit/')) {
      const init = args[1];
      if (init && init.body && typeof init.body === 'string') {
        handleSubmissionRequest(url, init.body);
      }
      const clone = response.clone();
      clone.text().then(handleSubmissionResponse).catch(() => {});
    } else if (url.includes('/check/')) {
      const clone = response.clone();
      clone.text().then((text) => handleCheckResponse(url, text)).catch(() => {});
    }
  } catch (err) {
    console.debug('[CodeSync] Fetch hook inspection error:', err);
  }
  return response;
};

// 2. Hook XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (
  this: XMLHttpRequest & { _codesyncUrl?: string },
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null,
) {
  this._codesyncUrl = String(url);
  return originalOpen.call(this, method, url, async, username, password);
};

XMLHttpRequest.prototype.send = function (
  this: XMLHttpRequest & { _codesyncUrl?: string },
  body?: Document | XMLHttpRequestBodyInit | null,
) {
  const url = this._codesyncUrl || '';

  if (url.includes('/submit/') && typeof body === 'string') {
    handleSubmissionRequest(url, body);
  }

  this.addEventListener('load', function () {
    if (url.includes('/submit/') && this.responseText) {
      handleSubmissionResponse(this.responseText);
    } else if (url.includes('/check/') && this.responseText) {
      handleCheckResponse(url, this.responseText);
    }
  });

  return originalSend.apply(this, [body]);
};

console.log('[CodeSync] Network interceptor attached to main world.');
