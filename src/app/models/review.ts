// src/app/models/review.ts
export interface Review {
  id?: number;
  courseId: number;
  userId?: number;
  rating: number;       // 1-5
  title?: string;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}
