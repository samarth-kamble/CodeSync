import {
  type SubmissionData,
  type ProblemMetadata,
  type SelectedRepository,
  type UserPreferences,
  type SyncHistoryEntry,
  getProblemFolderPath,
  getSolutionFilename,
  formatSolutionCode,
  generateProblemReadme,
  generateRootReadme,
  formatCommitMessage,
} from '@leetsync/shared';

const GITHUB_API_BASE = 'https://api.github.com';

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CodeSync-Extension',
    'Content-Type': 'application/json',
  };
}

export interface SyncResult {
  success: boolean;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  skipReason?: string;
  commitSha?: string;
  commitUrl?: string;
  folderPath: string;
  solutionPath: string;
  readmePath: string;
  error?: string;
}

export interface TreeFileItem {
  path: string;
  content: string;
}

/**
 * Retrieves the latest commit SHA for a specific branch.
 * Returns null if the branch or repository is empty (404).
 */
export async function getBranchRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ commitSha: string } | null> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: getAuthHeaders(token) });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to get branch reference: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { commitSha: data.object.sha };
}

/**
 * Retrieves the root tree SHA for a given commit.
 */
export async function getCommitTreeSha(
  token: string,
  owner: string,
  repo: string,
  commitSha: string,
): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(commitSha)}`;
  const res = await fetch(url, { headers: getAuthHeaders(token) });

  if (!res.ok) {
    throw new Error(`Failed to get commit tree: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.tree.sha;
}

/**
 * Creates a Git Blob from UTF-8 string content.
 */
export async function createBlob(
  token: string,
  owner: string,
  repo: string,
  content: string,
): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      content,
      encoding: 'utf-8',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create blob: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.sha;
}

/**
 * Creates a Git Tree referencing multiple file blobs based on an optional parent tree.
 */
export async function createTree(
  token: string,
  owner: string,
  repo: string,
  baseTreeSha: string | null,
  treeItems: Array<{ path: string; blobSha: string }>,
): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`;
  const payload: Record<string, unknown> = {
    tree: treeItems.map((item) => ({
      path: item.path,
      mode: '100644', // standard file mode in Git
      type: 'blob',
      sha: item.blobSha,
    })),
  };

  if (baseTreeSha) {
    payload.base_tree = baseTreeSha;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create tree: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.sha;
}

/**
 * Creates a Git Commit pointing to a new tree and parent commit.
 */
export async function createCommit(
  token: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentCommitSha: string | null,
): Promise<{ sha: string; url: string }> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create commit: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const commitUrl =
    data.html_url || `https://github.com/${owner}/${repo}/commit/${data.sha}`;

  return { sha: data.sha, url: commitUrl };
}

/**
 * Updates an existing branch ref, or creates the ref if this is the first commit on the branch.
 */
export async function updateBranchRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  commitSha: string,
  isNewBranch: boolean,
): Promise<void> {
  const url = isNewBranch
    ? `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`
    : `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`;

  const method = isNewBranch ? 'POST' : 'PATCH';
  const body = isNewBranch
    ? JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha })
    : JSON.stringify({ sha: commitSha, force: false });

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(token),
    body,
  });

  if (!res.ok) {
    throw new Error(`Failed to update branch ref: ${res.status} ${res.statusText}`);
  }
}

// In-memory sequential queue to prevent concurrent Git ref updates (422 conflicts)
let commitQueue: Promise<unknown> = Promise.resolve();

function enqueueCommit<T>(task: () => Promise<T>): Promise<T> {
  const next = commitQueue.then(task, task);
  commitQueue = next.catch(() => {});
  return next;
}

/**
 * Executes a single atomic Git commit containing multiple files via GitHub Git Data API.
 * Serialized through an internal queue and retried on 409/422 non-fast-forward conflicts.
 */
export async function executeAtomicCommit(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  commitMessage: string,
  files: TreeFileItem[],
): Promise<{ commitSha: string; commitUrl: string }> {
  // 1. Create blobs in parallel (content-addressed, safe outside queue)
  const blobPromises = files.map(async (file) => {
    const blobSha = await createBlob(token, owner, repo, file.content);
    return { path: file.path, blobSha };
  });
  const treeItems = await Promise.all(blobPromises);

  // 2. Serialize tree -> commit -> ref update so concurrent submissions never race
  return enqueueCommit(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const branchHead = await getBranchRef(token, owner, repo, branch);
      const isNewBranch = branchHead === null;
      const parentCommitSha = branchHead ? branchHead.commitSha : null;

      let baseTreeSha: string | null = null;
      if (parentCommitSha) {
        baseTreeSha = await getCommitTreeSha(token, owner, repo, parentCommitSha);
      }

      const newTreeSha = await createTree(token, owner, repo, baseTreeSha, treeItems);

      const newCommit = await createCommit(
        token,
        owner,
        repo,
        commitMessage,
        newTreeSha,
        parentCommitSha,
      );

      try {
        await updateBranchRef(token, owner, repo, branch, newCommit.sha, isNewBranch);
        return { commitSha: newCommit.sha, commitUrl: newCommit.url };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRefConflict = msg.includes('422') || msg.includes('409');
        if (attempt < 2 && isRefConflict) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to update branch ref after retries.');
  });
}

/**
 * Evaluates whether a submission should be synced according to user preferences and sync history.
 */
export function evaluateOverwritePolicy(
  submission: SubmissionData,
  preferences: UserPreferences,
  syncHistory: SyncHistoryEntry[],
): { shouldSync: boolean; reason?: string } {
  // 1. In-memory / storage deduplication by exact submissionId
  const alreadySynced = syncHistory.some(
    (entry) =>
      entry.submissionId === submission.submissionId && entry.status === 'SUCCESS',
  );
  if (alreadySynced) {
    return { shouldSync: false, reason: 'Submission has already been synchronized.' };
  }

  // 2. Look for existing successful sync of this problem and language
  const prevSync = syncHistory.find(
    (entry) =>
      entry.questionFrontendId === submission.questionFrontendId &&
      entry.lang.toLowerCase() === submission.lang.toLowerCase() &&
      entry.status === 'SUCCESS',
  );

  if (!prevSync) {
    return { shouldSync: true };
  }

  // 3. Evaluate Overwrite Policy
  if (preferences.overwritePolicy === 'never') {
    return {
      shouldSync: false,
      reason: `Question #${submission.questionFrontendId} already exists in repository and overwrite policy is set to 'never'.`,
    };
  }

  if (preferences.overwritePolicy === 'always') {
    return { shouldSync: true };
  }

  if (preferences.overwritePolicy === 'improved') {
    const newRuntime = submission.stats?.runtimeMs;
    const prevRuntime = prevSync.runtimeMs;

    // If both have numeric runtimes, compare
    if (newRuntime !== undefined && prevRuntime !== undefined) {
      if (newRuntime > prevRuntime) {
        return {
          shouldSync: false,
          reason: `Previous submission had better runtime (${prevRuntime}ms vs ${newRuntime}ms) and overwrite policy is set to 'improved'.`,
        };
      }
    }
    return { shouldSync: true };
  }

  return { shouldSync: true };
}

export interface SyncOptions {
  submission: SubmissionData;
  problem?: ProblemMetadata | null;
  token: string;
  repo: SelectedRepository;
  preferences: UserPreferences;
  syncHistory: SyncHistoryEntry[];
  customParentFolder?: string;
  customCommitMessage?: string;
}

/**
 * Orchestrates formatting, policy check, and atomic commit push to GitHub.
 */
export async function syncSubmissionToGitHub(options: SyncOptions): Promise<SyncResult> {
  const {
    submission,
    problem,
    token,
    repo,
    preferences,
    syncHistory,
    customParentFolder,
    customCommitMessage,
  } = options;

  const folderName = getProblemFolderPath(
    submission.questionFrontendId,
    submission.questionSlug,
    preferences.folderNamingFormat,
    {
      organization: preferences.folderOrganization,
      langSlug: submission.lang,
      difficulty: problem?.difficulty,
      topicTags: problem?.topicTags,
      customParentFolder,
    },
  );
  const solutionFileName = getSolutionFilename(
    submission.questionSlug,
    submission.lang,
    preferences.solutionNamingStyle || 'slug',
    submission.questionFrontendId,
  );

  const solutionPath = `${folderName}/${solutionFileName}`;
  const readmePath = `${folderName}/README.md`;

  // 1. Evaluate Overwrite & Deduplication Policy
  const policyCheck = evaluateOverwritePolicy(submission, preferences, syncHistory);
  if (!policyCheck.shouldSync) {
    return {
      success: true,
      status: 'SKIPPED',
      skipReason: policyCheck.reason,
      folderPath: folderName,
      solutionPath,
      readmePath,
    };
  }

  // 2. Prepare file contents
  const formattedCode = formatSolutionCode(submission.code, submission, problem);
  const readmeContent = generateProblemReadme(
    problem || {
      questionId: submission.questionId,
      questionFrontendId: submission.questionFrontendId,
      title: submission.questionTitle,
      titleSlug: submission.questionSlug,
      difficulty: 'Easy',
      topicTags: [],
    },
    submission,
  );
  const commitMsg =
    (customCommitMessage && customCommitMessage.trim()) ||
    formatCommitMessage(preferences.commitMessageFormat, submission, problem);

  const filesToCommit: TreeFileItem[] = [
    { path: solutionPath, content: formattedCode },
    { path: readmePath, content: readmeContent },
  ];

  if (preferences.updateRootReadme !== false) {
    const projectedEntry: SyncHistoryEntry = {
      id: `projected_${submission.submissionId}`,
      submissionId: submission.submissionId,
      questionId: submission.questionId,
      questionFrontendId: submission.questionFrontendId,
      questionTitle: problem?.title || submission.questionTitle,
      questionSlug: submission.questionSlug,
      difficulty: problem?.difficulty,
      lang: submission.lang,
      repo: repo.fullName,
      branch: repo.targetBranch || repo.defaultBranch || 'main',
      folderPath: folderName,
      solutionFilePath: solutionPath,
      readmeFilePath: readmePath,
      status: 'SUCCESS',
      timestamp: submission.timestamp || Date.now(),
      runtimeMs: submission.stats?.runtimeMs,
      runtimeDisplay: submission.stats?.runtimeDisplay,
      memoryBytes: submission.stats?.memoryBytes,
      memoryDisplay: submission.stats?.memoryDisplay,
    };
    const rootReadme = generateRootReadme([projectedEntry, ...syncHistory], repo.fullName);
    filesToCommit.push({ path: 'README.md', content: rootReadme });
  }

  // 3. Execute atomic commit via Git Data API
  const targetBranch = repo.targetBranch || repo.defaultBranch || 'main';
  try {
    const { commitSha, commitUrl } = await executeAtomicCommit(
      token,
      repo.owner,
      repo.name,
      targetBranch,
      commitMsg,
      filesToCommit,
    );

    return {
      success: true,
      status: 'SUCCESS',
      commitSha,
      commitUrl,
      folderPath: folderName,
      solutionPath,
      readmePath,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 'FAILED',
      folderPath: folderName,
      solutionPath,
      readmePath,
      error: message,
    };
  }
}

