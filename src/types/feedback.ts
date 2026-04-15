export interface Feedback {
  id: string;
  studentId: string;
  courseId: string;
  rating: number;
  message?: string;
  createdAt: string;
}

export interface FeedbackSubmission {
  studentId: string;
  courseId: string;
  rating: number;
  message?: string;
}

export interface FeedbackSummary {
  totalFeedbacks: number;
  overallAverage: number;
}