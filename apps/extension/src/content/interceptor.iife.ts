/**
 * CodeSync Main World Network Interceptor
 * Injected into the LeetCode webpage context (world: "MAIN")
 * Hooks fetch and XMLHttpRequest to observe submission submissions and check results.
 */

interface PendingSubmission {
  platform: 'leetcode' | 'gfg';
  submissionId?: string;
  lang: string;
  code: string;
  questionId: string;
  slug?: string;
  timestamp: number;
}

const isGfgHost =
  typeof window !== 'undefined' && window.location.hostname.includes('geeksforgeeks.org');

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

function extractGfgEditorCode(): string {
  try {
    const win = window as unknown as {
      ace?: { edit?: (el: Element) => { getValue?: () => string } };
      monaco?: { editor?: { getModels?: () => Array<{ getValue?: () => string }> } };
    };

    // 1. Ace Editor (GFG default)
    const aceEl = document.querySelector('.ace_editor');
    if (aceEl) {
      const envEditor = (aceEl as unknown as { env?: { editor?: { getValue?: () => string } } }).env?.editor;
      if (envEditor?.getValue) {
        const val = envEditor.getValue();
        if (val?.trim()) return val;
      }
      if (win.ace?.edit) {
        const val = win.ace.edit(aceEl)?.getValue?.();
        if (val?.trim()) return val;
      }
    }

    // 2. Monaco Editor
    const monacoModels = win.monaco?.editor?.getModels?.();
    if (monacoModels && monacoModels.length > 0) {
      const val = monacoModels[0]?.getValue?.();
      if (val?.trim()) return val;
    }

    // 3. CodeMirror 5 / 6
    const cm5El = document.querySelector('.CodeMirror') as unknown as {
      CodeMirror?: { getValue?: () => string };
    } | null;
    if (cm5El?.CodeMirror?.getValue) {
      const val = cm5El.CodeMirror.getValue();
      if (val?.trim()) return val;
    }

    const cm6Lines = Array.from(document.querySelectorAll('.cm-content .cm-line'));
    if (cm6Lines.length > 0) {
      return cm6Lines.map((el) => el.textContent || '').join('\n');
    }

    // 4. Ace visible lines fallback
    const aceLines = Array.from(document.querySelectorAll('.ace_line'));
    if (aceLines.length > 0) {
      return aceLines.map((el) => el.textContent || '').join('\n');
    }
  } catch (err) {
    console.debug('[CodeSync] Error extracting GFG editor code:', err);
  }
  return '';
}

function extractGfgLanguage(): string {
  try {
    const candidates = Array.from(
      document.querySelectorAll('button, [role="button"], select, .dropdown, [class*="lang"]'),
    );
    for (const el of candidates) {
      const text = (el.textContent || '').trim();
      if (
        text.length > 0 &&
        text.length <= 32 &&
        /^(c\+\+|cpp|java|python|python3|c|javascript|typescript|csharp|c#|go|golang|kotlin|rust|php|ruby|swift|scala)(\s*\([^)]+\))?$/i.test(
          text,
        )
      ) {
        return text;
      }
    }
  } catch {
    // Ignore DOM lookup errors
  }
  return '';
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data;
  if (data?.source === 'CODESYNC_CONTENT' && data?.type === 'REQUEST_GFG_EDITOR_STATE') {
    notifyContentScript('GFG_EDITOR_STATE', {
      requestId: data.requestId,
      code: extractGfgEditorCode(),
      lang: extractGfgLanguage(),
    });
  }
});

function handleSubmissionRequest(url: string, requestBody: string) {
  try {
    const slugMatch = url.match(/\/problems\/([^/]+)\/submit(?:\/|\?|$)/);
    const slug = slugMatch ? slugMatch[1].toLowerCase() : undefined;
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(requestBody);
    } catch {
      const params = new URLSearchParams(requestBody);
      params.forEach((value, key) => {
        body[key] = value;
      });
    }

    if (body.typed_code && body.lang) {
      lastSubmittedRequest = {
        platform: 'leetcode',
        lang: String(body.lang),
        code: String(body.typed_code),
        questionId: String(body.question_id || ''),
        slug,
        timestamp: Date.now(),
      };
      console.log(`[CodeSync] Detected LeetCode submission for problem: ${slug || 'unknown'}`);
    } else if ((body.source_code || body.code || body.user_code) && (body.language || body.lang)) {
      lastSubmittedRequest = {
        platform: 'gfg',
        lang: String(body.language || body.lang),
        code: String(body.source_code || body.code || body.user_code),
        questionId: String(body.problem_id || body.question_id || ''),
        slug,
        timestamp: Date.now(),
      };
      console.log(`[CodeSync] Detected GFG submission for problem: ${slug || 'unknown'}`);
    }
  } catch (err) {
    console.debug('[CodeSync] Could not parse submission request body:', err);
  }
}

function handleSubmissionResponse(responseText: string) {
  try {
    const json = JSON.parse(responseText);
    const rawId = json.submission_id || json.results?.submission_id;
    if (rawId) {
      const submissionId = String(rawId);
      if (lastSubmittedRequest) {
        pendingBySubmissionId.set(submissionId, {
          ...lastSubmittedRequest,
          submissionId,
        });
      }
      if (!isGfgHost && /^\d+$/.test(submissionId)) {
        notifyContentScript('SUBMISSION_STARTED', {
          platform: 'leetcode',
          submissionId,
          questionId: lastSubmittedRequest?.questionId || '',
          lang: lastSubmittedRequest?.lang || '',
          code: lastSubmittedRequest?.code || '',
          slug: lastSubmittedRequest?.slug,
        });
      }
      console.log(`[CodeSync] Associated submission ID: ${submissionId}`);
    }
  } catch (err) {
    console.debug('[CodeSync] Could not parse submission response:', err);
  }
}

function handleGfgStatusResponse(url: string, responseText: string) {
  try {
    if (url.includes('/compile')) return;
    const data = JSON.parse(responseText);
    const payload = data.results || data;
    if (!payload || typeof payload !== 'object') return;
    if (payload.is_sample === true || String(payload.submission_type || '').toLowerCase() === 'compile') {
      return;
    }

    const msg = String(payload.message || payload.status_message || '').trim().toLowerCase();
    const solStatus = String(payload.user_solution_status || payload.status || '').trim().toLowerCase();
    const isRejected =
      msg.includes('wrong') ||
      msg.includes('time limit') ||
      msg.includes('compilation error') ||
      msg.includes('runtime error') ||
      msg.includes('memory limit') ||
      msg.includes('incorrect');

    if (isRejected) return;

    const totalCases = Number(payload.total_test_cases || 0);
    const passedCases = Number(payload.test_cases_passed || 0);
    const allCasesPassed = totalCases > 0 && passedCases === totalCases;

    const isAccepted =
      msg.includes('problem solved successfully') ||
      solStatus === 'correct' ||
      payload.correct === true ||
      payload.is_correct === true ||
      allCasesPassed;

    if (!isAccepted) return;

    const idMatch = url.match(/\/submissions\/([^/]+)/);
    const submissionId = String(payload.submission_id || (idMatch ? idMatch[1] : '') || Date.now());
    const pending = pendingBySubmissionId.get(submissionId) || lastSubmittedRequest;

    const code = String(payload.source_code || payload.code || payload.user_code || pending?.code || '') || extractGfgEditorCode();
    if (!code.trim()) return;

    const timeSec = payload.time_taken || payload.execution_time;
    const runtimeDisplay = timeSec !== undefined ? `${timeSec} s` : undefined;

    notifyContentScript('SUBMISSION_ACCEPTED', {
      platform: 'gfg',
      submissionId,
      questionId: pending?.questionId || String(payload.problem_id || ''),
      lang: pending?.lang || String(payload.language || '') || extractGfgLanguage() || 'cpp',
      code,
      slug: pending?.slug || payload.slug,
      stats: runtimeDisplay ? { runtimeDisplay } : undefined,
      timestamp: Date.now(),
    });
    pendingBySubmissionId.delete(submissionId);
  } catch (err) {
    console.debug('[CodeSync] Error parsing GFG status response:', err);
  }
}

function handleCheckResponse(url: string, responseText: string) {
  try {
    const checkMatch = url.match(/\/submissions\/detail\/([^/]+)\/check\/?/);
    if (!checkMatch) return;

    const submissionId = checkMatch[1];
    // Strictly ignore LeetCode "Run" test executions (e.g. runcode_1732...)
    if (!/^\d+$/.test(submissionId)) {
      return;
    }

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
  const req = args[0];
  const init = args[1];
  const url = typeof req === 'string' ? req : (req as Request)?.url || '';

  if (url.includes('/submit')) {
    if (init && init.body && typeof init.body === 'string') {
      handleSubmissionRequest(url, init.body);
    } else if (req && typeof req !== 'string' && typeof (req as Request).clone === 'function') {
      (req as Request).clone().text().then((text) => {
        if (text) handleSubmissionRequest(url, text);
      }).catch(() => {});
    }
  }

  const response = await originalFetch.apply(this, args);
  try {
    if (url.includes('/submit')) {
      const clone = response.clone();
      clone.text().then((text) => {
        handleSubmissionResponse(text);
        if (isGfgHost) {
          handleGfgStatusResponse(url, text);
        }
      }).catch(() => {});
    } else if (url.includes('/check/')) {
      const clone = response.clone();
      clone.text().then((text) => handleCheckResponse(url, text)).catch(() => {});
    } else if (
      isGfgHost &&
      url.includes('geeksforgeeks.org') &&
      !url.includes('/compile')
    ) {
      const clone = response.clone();
      clone.text().then((text) => handleGfgStatusResponse(url, text)).catch(() => {});
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

  if (url.includes('/submit') && typeof body === 'string') {
    handleSubmissionRequest(url, body);
  }

  this.addEventListener('load', function () {
    if (url.includes('/submit') && this.responseText) {
      handleSubmissionResponse(this.responseText);
      if (isGfgHost) {
        handleGfgStatusResponse(url, this.responseText);
      }
    } else if (url.includes('/check/') && this.responseText) {
      handleCheckResponse(url, this.responseText);
    } else if (
      isGfgHost &&
      this.responseText &&
      url.includes('geeksforgeeks.org') &&
      !url.includes('/compile')
    ) {
      handleGfgStatusResponse(url, this.responseText);
    }
  });

  return originalSend.apply(this, [body]);
};

console.log('[CodeSync] Network interceptor attached to main world.');
