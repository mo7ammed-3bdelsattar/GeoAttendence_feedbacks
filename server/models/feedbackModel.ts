export interface FeedbackEntity {
  id?: string;
  studentId: string;
  courseId: string;
  rating: number;
  message?: string;
  createdAt: string;
}

export type FeedbackPayload = Omit<FeedbackEntity, 'id' | 'createdAt'>;

export function validateFeedbackPayload(payload: unknown): { valid: boolean; message?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Invalid payload.' };
  }

  const { studentId, courseId, rating, message } = payload as Record<string, unknown>;

  if (!studentId || !courseId) {
    return { valid: false, message: 'studentId and courseId are required.' };
  }

  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return { valid: false, message: 'rating must be a number between 1 and 5.' };
  }

  if (message !== undefined && typeof message !== 'string') {
    return { valid: false, message: 'message must be a string.' };
  }

  return { valid: true };
}
