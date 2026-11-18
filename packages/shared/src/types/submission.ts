export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compile Error'
  | 'Output Limit Exceeded'
  | 'Pending'
  | 'Judging'
  | 'Unknown';

export interface PerformanceStats {
  runtimeMs?: number;
  runtimeDisplay?: string;
  runtimePercentile?: number;
  memoryBytes?: number;
  memoryDisplay?: string;
  memoryPercentile?: number;
}

export interface SubmissionData {
  submissionId: string;
  questionId: string;
  questionFrontendId: string;
  questionTitle: string;
  questionSlug: string;
  status: SubmissionStatus;
  lang: string;
  code: string;
  timestamp: number;
  stats?: PerformanceStats;
}

export interface ValidatedAcceptedSubmission extends SubmissionData {
  status: 'Accepted';
}

export function isAcceptedSubmission(submission: SubmissionData): submission is ValidatedAcceptedSubmission {
  return submission.status === 'Accepted';
}

