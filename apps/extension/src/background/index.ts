import {
  isAcceptedSubmission,
  type SubmissionData,
  type SyncHistoryEntry,
} from '@leetsync/shared';
import { getStorageItem, setStorageItem } from '../storage/index';
import { fetchProblemMetadata } from '../leetcode/client';
import { syncSubmissionToGitHub, type SyncResult } from '../github/sync-engine';

console.log('[CodeSync] Background service worker initialized.');

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('[CodeSync] Extension installed/updated. Reason:', details.reason);
});

async function handleSubmissionDetected(
  submission: SubmissionData,
): Promise<{ status: string; result?: SyncResult; error?: string; message?: string }> {
  // 1. Strict Gate: Only Accepted submissions are ever processed
  if (!isAcceptedSubmission(submission)) {
    console.log('[CodeSync] Ignored non-accepted submission:', submission.status);
    return { status: 'IGNORED_NON_ACCEPTED' };
  }

  console.log(
    `[CodeSync] Processing accepted submission #${submission.questionFrontendId}: ${submission.questionTitle} (${submission.lang})`,
  );

  // 2. Load current storage state
  const auth = await getStorageItem('auth');
  const selectedRepo = await getStorageItem('selectedRepo');
  const preferences = await getStorageItem('preferences');
  const syncHistory = await getStorageItem('syncHistory') || [];

  // 3. Validate user configuration
  if (!auth?.isConnected || !auth.token) {
    console.warn('[CodeSync] GitHub account is not connected. Skipping sync.');
    return { status: 'NOT_CONNECTED', message: 'GitHub account is not connected.' };
  }

  if (!selectedRepo) {
    console.warn('[CodeSync] No target repository configured. Skipping sync.');
    return { status: 'NO_REPO_SELECTED', message: 'No target repository configured.' };
  }

  if (!preferences?.autoSync) {
    console.log('[CodeSync] Auto-sync is disabled in user preferences.');
    return { status: 'AUTO_SYNC_DISABLED', message: 'Auto-sync is disabled.' };
  }

  // 4. Retrieve problem metadata via LeetCode GraphQL client
  const problem = await fetchProblemMetadata(submission.questionSlug);

  // 5. Orchestrate sync via Git Data API
  const result = await syncSubmissionToGitHub({
    submission,
    problem,
    token: auth.token,
    repo: selectedRepo,
    preferences,
    syncHistory,
  });

  // 6. Record history and dispatch notification
  const targetBranch = selectedRepo.targetBranch || selectedRepo.defaultBranch || 'main';

  if (result.status === 'SUCCESS') {
    const newEntry: SyncHistoryEntry = {
      id: `sync_${Date.now()}_${submission.submissionId}`,
      submissionId: submission.submissionId,
      questionFrontendId: submission.questionFrontendId,
      questionTitle: submission.questionTitle,
      questionSlug: submission.questionSlug,
      lang: submission.lang,
      repo: selectedRepo.fullName,
      branch: targetBranch,
      folderPath: result.folderPath,
      solutionFilePath: result.solutionPath,
      readmeFilePath: result.readmePath,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      status: 'SUCCESS',
      timestamp: Date.now(),
      runtimeMs: submission.stats?.runtimeMs,
      runtimeDisplay: submission.stats?.runtimeDisplay,
      memoryBytes: submission.stats?.memoryBytes,
      memoryDisplay: submission.stats?.memoryDisplay,
    };

    const updatedHistory = [newEntry, ...syncHistory].slice(0, 100);
    await setStorageItem('syncHistory', updatedHistory);

    if (typeof chrome !== 'undefined' && chrome?.notifications?.create) {
      chrome.notifications.create(`codesync_commit_${submission.submissionId}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: 'CodeSync: Solution Synchronized!',
        message: `Committed ${submission.questionFrontendId}. ${submission.questionTitle} (${submission.lang}) to ${selectedRepo.fullName}`,
        priority: 1,
      });
    }

    return { status: 'SUCCESS', result };
  }

  if (result.status === 'SKIPPED') {
    console.log('[CodeSync] Submission skipped:', result.skipReason);
    return { status: 'SKIPPED', message: result.skipReason };
  }

  // FAILED state
  const failedEntry: SyncHistoryEntry = {
    id: `sync_fail_${Date.now()}_${submission.submissionId}`,
    submissionId: submission.submissionId,
    questionFrontendId: submission.questionFrontendId,
    questionTitle: submission.questionTitle,
    questionSlug: submission.questionSlug,
    lang: submission.lang,
    repo: selectedRepo.fullName,
    branch: targetBranch,
    folderPath: result.folderPath,
    solutionFilePath: result.solutionPath,
    readmeFilePath: result.readmePath,
    status: 'FAILED',
    timestamp: Date.now(),
    error: result.error,
  };

  const updatedHistory = [failedEntry, ...syncHistory].slice(0, 100);
  await setStorageItem('syncHistory', updatedHistory);

  if (typeof chrome !== 'undefined' && chrome?.notifications?.create) {
    chrome.notifications.create(`codesync_err_${submission.submissionId}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'CodeSync: Sync Failed',
      message: result.error || 'Failed to commit submission to GitHub.',
      priority: 2,
    });
  }

  return { status: 'FAILED', error: result.error };
}

// Runtime message listener for submission events from content scripts
chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    if (message?.type === 'CODESYNC_SUBMISSION_DETECTED') {
      const submission = message.payload as SubmissionData;
      handleSubmissionDetected(submission)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.error('[CodeSync] Error processing submission:', err);
          sendResponse({ status: 'ERROR', error: String(err) });
        });
      return true; // Keep message port open for async response
    }
    return false;
  },
);
