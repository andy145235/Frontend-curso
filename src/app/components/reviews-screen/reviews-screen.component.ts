import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { Course } from '../../models/course';
import { Review } from '../../models/review';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-reviews-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews-screen.component.html',
  styleUrls: ['./reviews-screen.component.css']
})
export class ReviewsScreenComponent implements OnChanges {

  @Input() curso!: Course | null;
  @Output() close = new EventEmitter<void>();

  reviews: Review[] = [];
  loading = false;

  // === FORM US-018 ===
  rating = 5;
  title = '';
  comment = '';

  // Control de "ver más"
  expandedReviews = new Set<number>();
  readonly MAX_CHARS = 120;

  constructor(private reviewService: ReviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['curso'] && this.curso?.idCurso) {
      this.cargarResenas();
    }
  }

  cargarResenas() {
    this.loading = true;

    this.reviewService.getByCourse(this.curso!.idCurso!).subscribe({
      next: (data) => {
        this.reviews = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar las reseñas', 'error');
      }
    });
  }

  // === US-018: enviar reseña ===
  enviarReview() {
    if (!this.comment.trim()) {
      Swal.fire('Atención', 'El comentario es obligatorio', 'warning');
      return;
    }

    const payload: Review = {
      courseId: this.curso!.idCurso!,
      rating: this.rating,
      title: this.title || '',
      comment: this.comment
    };

    this.reviewService.create(payload).subscribe({
      next: () => {
        Swal.fire('Gracias', 'Reseña registrada', 'success');
        this.title = '';
        this.comment = '';
        this.rating = 5;
        this.cargarResenas();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo registrar la reseña', 'error');
      }
    });
  }

  promedio(): string {
    if (!this.reviews.length) return '0.0';

    const sum = this.reviews.reduce((a, b) => a + b.rating, 0);
    return (sum / this.reviews.length).toFixed(1);
  }

  // === UTILIDADES TEXTO ===
  isLong(comment: string): boolean {
    return comment.length > this.MAX_CHARS;
  }

  getComment(review: Review): string {
    if (this.expandedReviews.has(review.id!)) {
      return review.comment;
    }
    return review.comment.slice(0, this.MAX_CHARS) + '...';
  }

  toggleReview(reviewId: number) {
    if (this.expandedReviews.has(reviewId)) {
      this.expandedReviews.delete(reviewId);
    } else {
      this.expandedReviews.add(reviewId);
    }
  }
}
