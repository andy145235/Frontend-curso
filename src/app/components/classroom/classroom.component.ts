import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { Course } from '../../models/course';
import { Leccion } from '../../models/leccion';
import { CourseService } from '../../services/course.service';
import { SafePipe } from '../../pipes/safe-pipe';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [CommonModule, SafePipe],
  templateUrl: './classroom.component.html',
  styleUrls: ['./classroom.component.css']
})
export class ClassroomComponent implements OnChanges {

  @Input() curso!: Course | null;
  @Output() close = new EventEmitter<void>();
  @Output() openReviews = new EventEmitter<Course>();

  leccionActual: any = null;
  leccionesCompletadas: number[] = [];
  progresoPorcentaje = 0;
  cargandoAbandonar = false;

  constructor(private courseService: CourseService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['curso'] && this.curso) {
      this.prepararCurso();
      this.cargarProgreso();
    }
  }

  prepararCurso() {
    if (!this.curso?.modulos?.length) {
      this.leccionActual = null;
      return;
    }

    this.curso.modulos.forEach((m, index) => {
      (m as any).isOpen = index === 0;
    });

    const primerModulo = this.curso.modulos[0];
    if (primerModulo?.lecciones?.length) {
      this.leccionActual = primerModulo.lecciones[0];
      this.normalizarLeccion(this.leccionActual);
    }
  }

  normalizarLeccion(l: any) {
    if (!l.idLeccion && l.id_leccion) l.idLeccion = l.id_leccion;
    if (!l.videoUrl && l.video_url) l.videoUrl = l.video_url;
    if (!l.pdfUrl && l.pdf_url) l.pdfUrl = l.pdf_url;
  }

  seleccionarLeccion(lec: any) {
    this.normalizarLeccion(lec);
    this.leccionActual = lec;
  }

  volverAlHome() {
    this.close.emit();
  }

  irAResenas() {
    if (this.curso) {
      this.openReviews.emit(this.curso);
    }
  }

  // === Progreso ===

  cargarProgreso() {
    if (!this.curso?.idCurso) return;

    this.courseService.getStudentProgress(this.curso.idCurso).subscribe(ids => {
      this.leccionesCompletadas = ids;
      this.calcularPorcentaje();
    });
  }

  marcarYContinuar() {
    if (!this.curso?.idCurso || !this.leccionActual?.idLeccion) return;

    this.courseService
      .markLessonAsCompleted(this.curso.idCurso, this.leccionActual.idLeccion)
      .subscribe({
        next: () => {
          if (!this.leccionesCompletadas.includes(this.leccionActual.idLeccion)) {
            this.leccionesCompletadas.push(this.leccionActual.idLeccion);
          }
          this.calcularPorcentaje();

          const siguiente = this.encontrarSiguienteLeccion();
          if (siguiente) {
            Toast.fire({ icon: 'success', title: '¡Lección completada! Siguiente...' });
            this.seleccionarLeccion(siguiente);
          } else {
            this.progresoPorcentaje = 100;
            Swal.fire('¡Felicidades! 🎓', 'Has completado todo el curso.', 'success');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo guardar el progreso', 'error')
      });
  }

  encontrarSiguienteLeccion(): Leccion | null {
    if (!this.curso?.modulos) return null;
    let encontrarActual = false;

    for (const modulo of this.curso.modulos) {
      if (modulo.lecciones) {
        for (const leccion of modulo.lecciones) {
          this.normalizarLeccion(leccion);

          if (encontrarActual) {
            (modulo as any).isOpen = true;
            return leccion;
          }

          if (leccion.idLeccion == this.leccionActual.idLeccion) {
            encontrarActual = true;
          }
        }
      }
    }
    return null;
  }

  calcularPorcentaje() {
    let totalLecciones = 0;
    this.curso?.modulos?.forEach(m => {
      totalLecciones += m.lecciones?.length || 0;
    });

    if (totalLecciones > 0) {
      const unicasCompletadas = new Set(this.leccionesCompletadas).size;
      const calculo = Math.round((unicasCompletadas / totalLecciones) * 100);
      this.progresoPorcentaje = Math.min(100, calculo);
    } else {
      this.progresoPorcentaje = 0;
    }
  }

  esCompletada(id: number): boolean {
    return this.leccionesCompletadas.includes(id);
  }

  abandonarCurso() {
    if (!this.curso?.idCurso) return;

    Swal.fire({
      title: '¿Abandonar curso?',
      text: 'Perderás tu cupo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, salir'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargandoAbandonar = true;
        this.courseService.unenrollStudent(this.curso!.idCurso!).subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Te has desinscrito.' });
            this.cargandoAbandonar = false;
            this.close.emit();
          },
          error: () => {
            this.cargandoAbandonar = false;
          }
        });
      }
    });
  }
}
