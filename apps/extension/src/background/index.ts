import { isAcceptedSubmission, type SubmissionData } from '@leetsync/shared';

console.log('[LeetSync] Background service worker initialized.');

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('[LeetSync] Extension installed/updated. Reason:', details.reason);
});

// Listener placeholder for content-script messages
chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: { status: string }) => void,
  ) => {
    if (message?.type === 'LEETSYNC_SUBMISSION_DETECTED') {
      const submission = message.payload as SubmissionData;
      console.log(
        '[LeetSync] Submission detected:',
        submission.submissionId,
        'Status:',
        submission.status,
      );

      if (isAcceptedSubmission(submission)) {
        console.log('[LeetSync] Submission accepted. Ready for sync orchestration.');
        sendResponse({ status: 'QUEUED_FOR_SYNC' });
      } else {
        console.log('[LeetSync] Submission was not Accepted. Ignored.');
        sendResponse({ status: 'IGNORED_NON_ACCEPTED' });
      }
      return true;
    }
    return false;
  },
);
