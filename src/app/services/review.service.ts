import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review } from '../models/review';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  // ✅ USAR RUTA RELATIVA (Gateway)
  private baseUrl = '/reviews';

  constructor(private http: HttpClient) {}

  // US-019: ver reseñas por curso
  getByCourse(courseId: number): Observable<Review[]> {
    return this.http.get<Review[]>(
      `${this.baseUrl}?courseId=${courseId}`
    );
  }

  // US-018: registrar reseña
  create(review: Review): Observable<Review> {
    return this.http.post<Review>(this.baseUrl, review);
  }
}
