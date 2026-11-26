# Privacy Policy — CodeSync

**Last Updated:** 2026-11-26

CodeSync ("the Extension") is committed to protecting your privacy. This policy explains what data CodeSync accesses and how it is handled.

## 1. Data Collection & Storage
- **No Analytics or Tracking:** CodeSync does not collect, track, sell, or transmit any telemetry, browsing history, or personal usage analytics to third parties.
- **Local-Only Storage:** Your GitHub OAuth access token (or Personal Access Token), selected repository configuration, sync preferences, and synchronization audit history are stored exclusively on your local machine using Chrome's `chrome.storage.local` API.

## 2. Permissions Explained
- `storage`: Persists your local preferences, selected repository, and sync history.
- `notifications`: Displays optional desktop notifications when a solution is synced or fails to commit (can be disabled in Settings).
- `identity`: Facilitates the GitHub OAuth sign-in flow via `chrome.identity`.
- **Host Permissions (`leetcode.com`, `api.github.com`)**:
  - `leetcode.com`: Detects verified `Accepted` submissions and fetches problem metadata via LeetCode's GraphQL endpoint.
  - `api.github.com`: Lists your repositories/branches and commits your accepted solutions directly to your chosen repository.

## 3. Data Deletion
You may disconnect your GitHub account or clear all locally stored extension data at any time from **Settings -> Account & Repository -> Disconnect** or **Settings -> About & Help -> Reset All Data**.
