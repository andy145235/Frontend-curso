import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { CourseService } from '../../services/course.service';
import { Course } from '../../models/course';
import { Modulo } from '../../models/modulo';
import { Leccion } from '../../models/leccion';
import { KeycloakService } from 'keycloak-angular';


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
  selector: 'app-courses-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './courses-dashboard.component.html',
  styleUrls: ['./courses-dashboard.component.css']
})
export class CoursesDashboardComponent implements OnInit {

  @Input() isAdmin = false;
  @Output() openClass = new EventEmitter<Course>();
  @Output() openReviews = new EventEmitter<Course>();

  listaCursos: Course[] = [];
  cursoSeleccionado: Course | null = null;

  esEdicion = false;
  modoOrden = false;

  cursoActual: Course = {
    titulo: '',
    descripcion: '',
    categoria: '',
    nivel: 'Basico',
    estado: 'Activo'
  };

  filtroCategoria = '';
  filtroTitulo = '';
  filtroNivel = '';
  filtroEstado = '';

  private buscadorSubject = new Subject<string>();

  constructor(
    private courseService: CourseService,
    private cd: ChangeDetectorRef,
    private keycloak: KeycloakService // ✅ INYECTADO
  ) {
    this.buscadorSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(texto => this.ejecutarBusqueda(texto));
  }

  ngOnInit(): void {
    this.cargarCursos();
  }

  // ======================
  // 🔐 LOGOUT GLOBAL
  // ======================
  logout(): void {
    Swal.fire({
      title: 'Cerrar sesión',
      text: '¿Deseas salir de la plataforma?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.keycloak.logout(window.location.origin);
      }
    });
  }

  // === Navegación hacia otras vistas ===

  irAClase(curso: Course) {
    this.openClass.emit(curso);
  }

  irAResenas(curso: Course) {
    this.cursoSeleccionado = curso; // también se usa para el temario
    this.openReviews.emit(curso);
  }

  // === CRUD Cursos ===

  cargarCursos() {
    this.courseService.getCourses().subscribe(d => {
      this.listaCursos = d;
      this.cd.detectChanges();
    });
  }

  guardarCurso() {
    if (!this.cursoActual.titulo) return;

    const req = (this.esEdicion && this.cursoActual.idCurso)
      ? this.courseService.updateCourse(this.cursoActual.idCurso, this.cursoActual)
      : this.courseService.createCourse(this.cursoActual);

    req.subscribe(() => {
      Swal.fire({
        title: 'Guardado',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      this.limpiarFormulario();
      this.cargarCursos();
    });
  }

  eliminarCurso(id: number) {
    Swal.fire({
      title: '¿Borrar curso?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33'
    }).then(r => {
      if (r.isConfirmed) {
        this.courseService.deleteCourse(id).subscribe(() => {
          this.cargarCursos();
          Toast.fire({ icon: 'success', title: 'Eliminado' });
        });
      }
    });
  }

  editarCurso(c: Course) {
    this.cursoActual = { ...c };
    this.esEdicion = true;
  }

  limpiarFormulario() {
    this.cursoActual = {
      titulo: '',
      descripcion: '',
      categoria: '',
      nivel: 'Basico',
      estado: 'Activo'
    };
    this.esEdicion = false;
  }

  inscribirse(c: Course) {
    if (c.idCurso) {
      this.courseService.enrollStudent(c.idCurso).subscribe(() => {
        Swal.fire('¡Inscrito!', '', 'success');
        this.cargarCursos();
      });
    }
  }

  cambiarCupos(c: Course, n: number) {
    if (c.idCurso) {
      this.courseService.updateQuota(c.idCurso, n).subscribe(() => this.cargarCursos());
    }
  }

  // === Temario: módulos y lecciones ===

  verTemario(curso: Course) {
    this.cursoSeleccionado = curso;
  }

  cerrarTemario() {
    this.cursoSeleccionado = null;
  }

  recargarCursoSeleccionado() {
    if (!this.cursoSeleccionado?.idCurso) return;

    this.courseService.getCourses().subscribe(d => {
      this.listaCursos = d;
      const c = d.find(x => x.idCurso === this.cursoSeleccionado?.idCurso);
      if (c) this.cursoSeleccionado = c;
    });
  }

  toggleModoOrden() {
    this.modoOrden = !this.modoOrden;
    Toast.fire({
      icon: 'info',
      title: this.modoOrden ? 'Arrastra para ordenar' : 'Modo orden desactivado'
    });
  }

  dropModulo(event: CdkDragDrop<Modulo[]>) {
    if (!this.cursoSeleccionado?.modulos) return;
    moveItemInArray(this.cursoSeleccionado.modulos, event.previousIndex, event.currentIndex);

    this.cursoSeleccionado.modulos.forEach((mod, index) => {
      mod.orden = index + 1;
      this.courseService.updateModulo(mod.idModulo!, mod).subscribe();
    });
  }

  dropLeccion(event: CdkDragDrop<Leccion[]>, modulo: Modulo) {
    if (!modulo.lecciones) return;
    moveItemInArray(modulo.lecciones, event.previousIndex, event.currentIndex);

    modulo.lecciones.forEach((lec, index) => {
      lec.orden = index + 1;
      // Si tu backend soporta PUT lección, aquí lo llamas
    });
  }

  async agregarModulo() {
    if (!this.cursoSeleccionado?.idCurso) return;

    const ordenAuto = (this.cursoSeleccionado.modulos?.length || 0) + 1;

    const { value: vals } = await Swal.fire({
      title: 'Nuevo Módulo',
      html: `
        <input id="t" class="swal2-input" placeholder="Título">
        <input id="d" class="swal2-input" placeholder="Descripción">
      `,
      showCancelButton: true,
      focusConfirm: false,
      preConfirm: () => [
        (document.getElementById('t') as HTMLInputElement).value,
        (document.getElementById('d') as HTMLInputElement).value
      ]
    });

    if (vals) {
      const [t, d] = vals;
      if (!t) return;

      this.courseService
        .addModulo(this.cursoSeleccionado.idCurso, {
          titulo: t,
          descripcion: d,
          orden: ordenAuto,
          lecciones: []
        })
        .subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Módulo agregado' });
            this.recargarCursoSeleccionado();
          }
        });
    }
  }

  async agregarLeccion(moduloId: number, modulo: Modulo) {
    const ordenAuto = (modulo.lecciones?.length || 0) + 1;

    const { value: vals } = await Swal.fire({
      title: 'Nueva Lección',
      html: `
        <input id="t" class="swal2-input" placeholder="Título">
        <textarea id="c" class="swal2-textarea" placeholder="Contenido"></textarea>
        <input id="v" class="swal2-input" placeholder="URL YouTube">
        <input id="p" class="swal2-input" placeholder="URL PDF">
      `,
      showCancelButton: true,
      focusConfirm: false,
      preConfirm: () => [
        (document.getElementById('t') as HTMLInputElement).value,
        (document.getElementById('c') as HTMLTextAreaElement).value,
        (document.getElementById('v') as HTMLInputElement).value,
        (document.getElementById('p') as HTMLInputElement).value
      ]
    });

    if (vals) {
      const [t, c, v, p] = vals;
      if (!t) return;

      this.courseService
        .addLeccion(moduloId, {
          titulo: t,
          contenido: c,
          videoUrl: v,
          pdfUrl: p,
          orden: ordenAuto
        })
        .subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Lección creada' });
            this.recargarCursoSeleccionado();
          }
        });
    }
  }

  eliminarLeccion(leccion: Leccion) {
    Swal.fire({
      title: '¿Eliminar lección?',
      text: `Se borrará "${leccion.titulo}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, borrar'
    }).then((result) => {
      if (result.isConfirmed) {
        const idBorrar = leccion.idLeccion || (leccion as any).id_leccion;
        if (!idBorrar) {
          Swal.fire('Error', 'No se identificó el ID', 'error');
          return;
        }

        this.courseService.deleteLeccion(idBorrar).subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Eliminado' });
            this.recargarCursoSeleccionado();
          },
          error: (e: { message: string | undefined }) => {
            Swal.fire('Error', e.message, 'error');
          }
        });
      }
    });
  }

  async editarModulo(modulo: Modulo) {
    if (!modulo.idModulo) return;

    const { value: titulo } = await Swal.fire({
      title: 'Editar Módulo',
      input: 'text',
      inputValue: modulo.titulo,
      showCancelButton: true
    });

    if (titulo) {
      this.courseService
        .updateModulo(modulo.idModulo, { ...modulo, titulo })
        .subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Actualizado' });
            this.recargarCursoSeleccionado();
          }
        });
    }
  }

  eliminarModulo(id: number) {
    Swal.fire({
      title: '¿Borrar?',
      text: 'Se perderán las lecciones.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33'
    }).then(r => {
      if (r.isConfirmed) {
        this.courseService.deleteModulo(id).subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Eliminado' });
            this.recargarCursoSeleccionado();
          }
        });
      }
    });
  }

  toggleModulo(mod: any) {
    mod.isOpen = !mod.isOpen;
  }

  trackByFn(index: number, item: any) {
    return item.idLeccion || item.idModulo || index;
  }

  // === Filtros y búsqueda ===

  get cursosFiltrados() {
    return this.listaCursos;
  }

  onSearchInput() {
    this.buscadorSubject.next(this.filtroTitulo);
  }

  onSelectChange() {
    this.ejecutarFiltro();
  }

  ejecutarFiltro() {
    this.courseService
      .searchCourses(this.filtroTitulo, this.filtroNivel, this.filtroEstado)
      .subscribe(d => {
        this.listaCursos = this.filtroCategoria
          ? d.filter(x =>
            x.categoria.toLowerCase()
              .includes(this.filtroCategoria.toLowerCase())
          )
          : d;

        this.cd.detectChanges();
      });
  }

  ejecutarBusqueda(_: string) {
    this.ejecutarFiltro();
  }

  limpiarFiltros() {
    this.filtroTitulo = '';
    this.filtroNivel = '';
    this.filtroEstado = '';
    this.filtroCategoria = '';
    this.cargarCursos();
  }

  async editarLeccion(_leccion: Leccion, _moduloId: number) {
    Swal.fire('Info', 'Falta endpoint PUT lección', 'info');
  }
}
