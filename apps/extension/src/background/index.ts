import {
  isAcceptedSubmission,
  formatCommitMessage,
  padProblemNumber,
  sanitizePathComponent,
  getSolutionFilename,
  resolveCategorySubfolder,
  type SubmissionData,
  type ProblemMetadata,
  type SyncHistoryEntry,
  type UserPreferences,
} from '@leetsync/shared';
import { getStorageItem, setStorageItem } from '../storage/index';
import { fetchProblemMetadata } from '../leetcode/client';
import { fetchRepositoryFolders } from '../github/repo-manager';
import { syncSubmissionToGitHub, type SyncResult } from '../github/sync-engine';

console.log('[CodeSync] Background service worker initialized.');

if (typeof chrome !== 'undefined' && chrome?.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    console.log('[CodeSync] Extension installed/updated. Reason:', details.reason);
  });
}

export function shouldSendNotification(preferences?: Partial<UserPreferences> | null): boolean {
  return preferences?.enableNotifications !== false;
}

function dispatchNotification(
  id: string,
  title: string,
  message: string,
  priority: 1 | 2,
  preferences?: Partial<UserPreferences> | null,
): void {
  if (!shouldSendNotification(preferences)) {
    return;
  }
  if (typeof chrome !== 'undefined' && chrome?.notifications?.create) {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title,
      message,
      priority,
    });
  }
}

async function handleSubmissionDetected(
  submission: SubmissionData,
  overrides?: { customParentFolder?: string; customCommitMessage?: string },
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
  const syncHistory = (await getStorageItem('syncHistory')) || [];

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
    customParentFolder: overrides?.customParentFolder,
    customCommitMessage: overrides?.customCommitMessage,
  });

  // 6. Record history and dispatch notification
  const targetBranch = selectedRepo.targetBranch || selectedRepo.defaultBranch || 'main';

  if (result.status === 'SUCCESS') {
    const newEntry: SyncHistoryEntry = {
      id: `sync_${Date.now()}_${submission.submissionId}`,
      submissionId: submission.submissionId,
      questionId: submission.questionId,
      questionFrontendId: submission.questionFrontendId,
      questionTitle: submission.questionTitle,
      questionSlug: submission.questionSlug,
      difficulty: problem?.difficulty,
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

    dispatchNotification(
      `codesync_commit_${submission.submissionId}`,
      'CodeSync: Solution Synchronized!',
      `Committed ${submission.questionFrontendId}. ${submission.questionTitle} (${submission.lang}) to ${selectedRepo.fullName}`,
      1,
      preferences,
    );

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
    questionId: submission.questionId,
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
    runtimeMs: submission.stats?.runtimeMs,
    runtimeDisplay: submission.stats?.runtimeDisplay,
    memoryBytes: submission.stats?.memoryBytes,
    memoryDisplay: submission.stats?.memoryDisplay,
    error: result.error,
    code: submission.code,
  };

  const updatedHistory = [failedEntry, ...syncHistory].slice(0, 100);
  await setStorageItem('syncHistory', updatedHistory);

  dispatchNotification(
    `codesync_err_${submission.submissionId}`,
    'CodeSync: Sync Failed',
    result.error || 'Failed to commit submission to GitHub.',
    2,
    preferences,
  );

  return { status: 'FAILED', error: result.error };
}

async function handleRetrySync(
  entryId: string,
): Promise<{ status: string; result?: SyncResult; error?: string }> {
  const auth = await getStorageItem('auth');
  const selectedRepo = await getStorageItem('selectedRepo');
  const preferences = await getStorageItem('preferences');
  const syncHistory = (await getStorageItem('syncHistory')) || [];

  const targetIndex = syncHistory.findIndex((item) => item.id === entryId);
  if (targetIndex === -1) {
    return { status: 'FAILED', error: 'History entry not found.' };
  }

  const entry = syncHistory[targetIndex];
  if (!auth?.isConnected || !auth.token) {
    return { status: 'FAILED', error: 'GitHub account is not connected.' };
  }

  if (!selectedRepo) {
    return { status: 'FAILED', error: 'No target repository selected.' };
  }

  if (!entry.code) {
    return {
      status: 'FAILED',
      error: 'Submission code was not cached for this entry. Please re-submit on LeetCode.',
    };
  }

  const submission: SubmissionData = {
    submissionId: entry.submissionId,
    questionId: entry.questionId || entry.questionFrontendId,
    questionFrontendId: entry.questionFrontendId,
    questionTitle: entry.questionTitle,
    questionSlug: entry.questionSlug,
    status: 'Accepted',
    lang: entry.lang,
    code: entry.code,
    timestamp: entry.timestamp,
    stats: {
      runtimeMs: entry.runtimeMs,
      runtimeDisplay: entry.runtimeDisplay,
      memoryBytes: entry.memoryBytes,
      memoryDisplay: entry.memoryDisplay,
    },
  };

  const problem = await fetchProblemMetadata(submission.questionSlug);
  const result = await syncSubmissionToGitHub({
    submission,
    problem,
    token: auth.token,
    repo: selectedRepo,
    preferences,
    syncHistory,
  });

  if (result.status === 'SUCCESS') {
    const updatedEntry: SyncHistoryEntry = {
      ...entry,
      repo: selectedRepo.fullName,
      branch: selectedRepo.targetBranch || selectedRepo.defaultBranch || 'main',
      folderPath: result.folderPath,
      solutionFilePath: result.solutionPath,
      readmeFilePath: result.readmePath,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      status: 'SUCCESS',
      timestamp: Date.now(),
      error: undefined,
      code: undefined, // Clear cached code after successful sync
    };

    const nextHistory = [...syncHistory];
    nextHistory[targetIndex] = updatedEntry;
    await setStorageItem('syncHistory', nextHistory);

    dispatchNotification(
      `codesync_retry_${entry.submissionId}`,
      'CodeSync: Retry Successful!',
      `Committed ${entry.questionFrontendId}. ${entry.questionTitle} to ${selectedRepo.fullName}`,
      1,
      preferences,
    );

    return { status: 'SUCCESS', result };
  }

  const updatedFailedEntry: SyncHistoryEntry = {
    ...entry,
    timestamp: Date.now(),
    error: result.error || 'Retry failed.',
  };
  const nextHistory = [...syncHistory];
  nextHistory[targetIndex] = updatedFailedEntry;
  await setStorageItem('syncHistory', nextHistory);

  return { status: 'FAILED', error: result.error };
}

async function handleGetDialogContext(payload: {
  submission: SubmissionData;
  problem?: ProblemMetadata | null;
}) {
  const auth = await getStorageItem('auth');
  const selectedRepo = await getStorageItem('selectedRepo');
  const preferences = await getStorageItem('preferences');

  if (!auth?.isConnected || !auth.token) {
    return { ok: false, status: 'NOT_CONNECTED', message: 'GitHub account is not connected.' };
  }
  if (!selectedRepo) {
    return { ok: false, status: 'NO_REPO_SELECTED', message: 'No target repository configured.' };
  }

  const targetBranch = selectedRepo.targetBranch || selectedRepo.defaultBranch || 'main';
  const askFolderBeforeSync = Boolean(preferences.askFolderBeforeSync);
  const folders = askFolderBeforeSync
    ? await fetchRepositoryFolders(
        auth.token,
        selectedRepo.owner,
        selectedRepo.name,
        targetBranch,
      )
    : [];

  const { submission, problem } = payload;
  const padded = padProblemNumber(submission.questionFrontendId);
  const slug = sanitizePathComponent(submission.questionSlug);
  const problemFolderName = `${padded}-${slug}`;
  const solutionFileName = getSolutionFilename(
    submission.questionSlug,
    submission.lang,
    preferences.solutionNamingStyle || 'slug',
    submission.questionFrontendId,
  );
  const defaultParentFolder = resolveCategorySubfolder({
    organization: preferences.folderOrganization,
    langSlug: submission.lang,
    difficulty: problem?.difficulty,
    topicTags: problem?.topicTags,
  });
  const defaultCommitMessage = formatCommitMessage(
    preferences.commitMessageFormat,
    submission,
    problem,
  );

  return {
    ok: true,
    askFolderBeforeSync,
    autoSync: preferences.autoSync,
    repoFullName: selectedRepo.fullName,
    branch: targetBranch,
    folders,
    defaultParentFolder,
    problemFolderName,
    solutionFileName,
    defaultCommitMessage,
  };
}

// Runtime message listener for submission events from content scripts & settings UI
if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
    (
      message: { type?: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => {
      if (message?.type === 'CODESYNC_GET_DIALOG_CONTEXT') {
        handleGetDialogContext(
          message.payload as { submission: SubmissionData; problem?: ProblemMetadata | null },
        )
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.error('[CodeSync] Error loading dialog context:', err);
            sendResponse({ ok: false, status: 'ERROR', error: String(err) });
          });
        return true;
      }

      if (message?.type === 'CODESYNC_SUBMISSION_DETECTED') {
        const rawPayload = message.payload as
          | SubmissionData
          | {
              submission: SubmissionData;
              customParentFolder?: string;
              customCommitMessage?: string;
            };
        const submission = 'submission' in rawPayload ? rawPayload.submission : rawPayload;
        const overrides =
          'submission' in rawPayload
            ? {
                customParentFolder: rawPayload.customParentFolder,
                customCommitMessage: rawPayload.customCommitMessage,
              }
            : undefined;

        handleSubmissionDetected(submission, overrides)
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.error('[CodeSync] Error processing submission:', err);
            sendResponse({ status: 'ERROR', error: String(err) });
          });
        return true; // Keep message port open for async response
      }

      if (message?.type === 'CODESYNC_RETRY_SYNC') {
        const { entryId } = (message.payload as { entryId?: string }) || {};
        if (!entryId) {
          sendResponse({ status: 'FAILED', error: 'Missing entryId' });
          return false;
        }
        handleRetrySync(entryId)
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.error('[CodeSync] Error retrying sync:', err);
            sendResponse({ status: 'FAILED', error: String(err) });
          });
        return true;
      }

      return false;
    },
  );
}
