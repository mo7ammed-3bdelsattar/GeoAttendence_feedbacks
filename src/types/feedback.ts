export interface Feedback {
  id: string;
  sessionId: string;
  userId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface FeedbackSubmission {
  sessionId: string;
  rating: number;
  comment?: string;
}

export interface FeedbackSummary {
  rating: number;
  count: number;
}