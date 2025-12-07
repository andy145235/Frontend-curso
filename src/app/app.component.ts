import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from './services/course.service';
import { Course } from './models/course';
import { Modulo } from './models/modulo';
import { Leccion } from './models/leccion';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { SafePipe } from './pipes/safe-pipe';
import Swal from 'sweetalert2';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
  didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SafePipe, DragDropModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend-curso';

  // --- ESTADO ---
  vistaClase = false;
  vistaResenas = false;
  cargandoAbandonar = false;
  isAdmin = false;
  esEdicion = false;
  modoOrden = false;

  // --- DATOS ---
  listaCursos: Course[] = [];
  cursoEnClase: Course | null = null;
  cursoSeleccionado: Course | null = null;
  leccionActual: any = null;
  leccionesCompletadas: number[] = [];
  progresoPorcentaje = 0;

  cursoActual: Course = { titulo: '', descripcion: '', categoria: '', nivel: 'Basico', estado: 'Activo' };
  filtroCategoria = ''; filtroTitulo = ''; filtroNivel = ''; filtroEstado = '';
  private buscadorSubject = new Subject<string>();

  constructor(
    private courseService: CourseService, // ✅ AHORA SE LLAMA 'courseService' EN TODO EL ARCHIVO
    private cd: ChangeDetectorRef,
    private keycloak: KeycloakService
  ) {
    this.buscadorSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(texto => this.ejecutarBusqueda(texto));
  }

  async ngOnInit() {
    try {
      const roles = this.keycloak.getUserRoles();
      this.isAdmin = roles.includes('admin');
      this.cargarCursos();
    } catch (error) { console.error('Error Auth:', error); }
  }

  // ==========================================
  //   LÓGICA DE NAVEGACIÓN
  // ==========================================

  volverAlHome() {
    this.vistaClase = false;
    this.cursoEnClase = null;
    this.leccionActual = null;
    this.cargarCursos();
  }
  // --- RESEÑAS (CORREGIDO E INTEGRADO) ---
  irAResenas(curso: Course) {
    this.cursoSeleccionado = curso;
    this.vistaClase = false;
    this.vistaResenas = true;  // Mostramos pantalla reseñas
  }

  volverDeResenas() {
    this.vistaResenas = false;
    this.cursoSeleccionado = null;
    this.volverAlHome();
  }

  irAClase(curso: Course) {
    this.cursoEnClase = curso;
    this.vistaClase = true;
    this.cargarProgreso();

    if (this.cursoEnClase.modulos) {
      this.cursoEnClase.modulos.forEach((m, index) => {
        (m as any).isOpen = (index === 0);
      });
      // Seleccionar primera lección
      const primerModulo = this.cursoEnClase.modulos[0];
      if (primerModulo?.lecciones?.length) {
        this.leccionActual = primerModulo.lecciones[0];
        // Parches de datos por si acaso
        this.normalizarLeccion(this.leccionActual);
      }
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

  verTemario(curso: Course) { this.cursoSeleccionado = curso; }
  cerrarTemario() { this.cursoSeleccionado = null; }

  // ==========================================
  //   PROGRESO
  // ==========================================

  cargarProgreso() {
    if (!this.cursoEnClase?.idCurso) return;
    this.courseService.getStudentProgress(this.cursoEnClase.idCurso).subscribe(ids => {
      this.leccionesCompletadas = ids;
      this.calcularPorcentaje();
    });
  }

  marcarYContinuar() {
    if (!this.cursoEnClase?.idCurso || !this.leccionActual?.idLeccion) return;

    this.courseService.markLessonAsCompleted(this.cursoEnClase.idCurso, this.leccionActual.idLeccion)
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
        error: (e) => Swal.fire('Error', 'No se pudo guardar el progreso', 'error')
      });
  }

  encontrarSiguienteLeccion(): Leccion | null {
    if (!this.cursoEnClase?.modulos) return null;
    let encontrarActual = false;
    for (const modulo of this.cursoEnClase.modulos) {
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
    // 1. Contar lecciones totales del curso
    let totalLecciones = 0;
    this.cursoEnClase?.modulos?.forEach(m => totalLecciones += m.lecciones?.length || 0);

    if (totalLecciones > 0) {
      // 2. Eliminar duplicados del array de completadas (Set hace esto automático)
      const unicasCompletadas = new Set(this.leccionesCompletadas).size;

      // 3. Calcular
      const calculo = Math.round((unicasCompletadas / totalLecciones) * 100);

      // 4. Asegurar que nunca pase de 100 (Math.min)
      this.progresoPorcentaje = Math.min(100, calculo);
    } else {
      this.progresoPorcentaje = 0;
    }
  }

  esCompletada(id: number): boolean { return this.leccionesCompletadas.includes(id); }

  abandonarCurso() {
    if (!this.cursoEnClase?.idCurso) return;
    Swal.fire({
      title: '¿Abandonar curso?', text: "Perderás tu cupo.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, salir'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargandoAbandonar = true;
        this.courseService.unenrollStudent(this.cursoEnClase!.idCurso!).subscribe({
          next: () => {
            Toast.fire({ icon: 'success', title: 'Te has desinscrito.' });
            this.cargandoAbandonar = false;
            this.volverAlHome();
          },
          error: () => this.cargandoAbandonar = false
        });
      }
    });
  }

  // ==========================================
  //   GESTIÓN CONTENIDO (MÓDULOS/LECCIONES)
  // ==========================================

  recargarCursoSeleccionado() {
    if (!this.cursoSeleccionado?.idCurso) return;
    this.courseService.getCourses().subscribe(d => {
      this.listaCursos = d;
      const c = d.find(x => x.idCurso === this.cursoSeleccionado?.idCurso);
      if (c) this.cursoSeleccionado = c;
    });
  }

  // --- DRAG & DROP ---
  toggleModoOrden() {
    this.modoOrden = !this.modoOrden;
    Toast.fire({ icon: 'info', title: this.modoOrden ? 'Arrastra para ordenar' : 'Modo orden desactivado' });
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
      // Si tuvieras updateLeccion, iría aquí.
    });
  }

  // --- AGREGAR / EDITAR / ELIMINAR ---

  async agregarModulo() {
    if (!this.cursoSeleccionado?.idCurso) return;
    const ordenAuto = (this.cursoSeleccionado.modulos?.length || 0) + 1;
    const { value: vals } = await Swal.fire({
      title: 'Nuevo Módulo',
      html: '<input id="t" class="swal2-input" placeholder="Título"><input id="d" class="swal2-input" placeholder="Descripción">',
      showCancelButton: true, focusConfirm: false,
      preConfirm: () => [(document.getElementById('t') as HTMLInputElement).value, (document.getElementById('d') as HTMLInputElement).value]
    });
    if (vals) {
      const [t, d] = vals;
      if (!t) return;
      this.courseService.addModulo(this.cursoSeleccionado.idCurso, { titulo: t, descripcion: d, orden: ordenAuto, lecciones: [] })
        .subscribe({ next: () => { Toast.fire({ icon: 'success', title: 'Módulo agregado' }); this.recargarCursoSeleccionado(); } });
    }
  }

  async agregarLeccion(moduloId: number, modulo: Modulo) {
    const ordenAuto = (modulo.lecciones?.length || 0) + 1;
    const { value: vals } = await Swal.fire({
      title: 'Nueva Lección',
      html: '<input id="t" class="swal2-input" placeholder="Título"><textarea id="c" class="swal2-textarea" placeholder="Contenido"></textarea><input id="v" class="swal2-input" placeholder="URL YouTube"><input id="p" class="swal2-input" placeholder="URL PDF">',
      showCancelButton: true, focusConfirm: false,
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
      this.courseService.addLeccion(moduloId, { titulo: t, contenido: c, videoUrl: v, pdfUrl: p, orden: ordenAuto })
        .subscribe({ next: () => { Toast.fire({ icon: 'success', title: 'Lección creada' }); this.recargarCursoSeleccionado(); } });
    }
  }

  // ✅ ESTA ES LA FUNCIÓN QUE FALTABA Y DABA ERROR
  eliminarLeccion(leccion: Leccion) {
    Swal.fire({
      title: '¿Eliminar lección?', text: `Se borrará "${leccion.titulo}".`, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, borrar'
    }).then((result) => {
      if (result.isConfirmed) {
        const idBorrar = leccion.idLeccion || (leccion as any).id_leccion;
        if (!idBorrar) { Swal.fire('Error', 'No se identificó el ID', 'error'); return; }

        this.courseService.deleteLeccion(idBorrar).subscribe({
          next: () => { Toast.fire({ icon: 'success', title: 'Eliminado' }); this.recargarCursoSeleccionado(); },
          error: (e: { message: string | undefined; }) => Swal.fire('Error', e.message, 'error')
        });
      }
    });
  }

  async editarModulo(modulo: Modulo) {
    if (!modulo.idModulo) return;
    const { value: titulo } = await Swal.fire({
      title: 'Editar Módulo', input: 'text', inputValue: modulo.titulo, showCancelButton: true
    });
    if (titulo) {
      this.courseService.updateModulo(modulo.idModulo, { ...modulo, titulo }).subscribe({
        next: () => { Toast.fire({ icon: 'success', title: 'Actualizado' }); this.recargarCursoSeleccionado(); }
      });
    }
  }

  eliminarModulo(id: number) {
    Swal.fire({ title: '¿Borrar?', text: 'Se perderán las lecciones.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })
      .then(r => {
        if (r.isConfirmed) {
          this.courseService.deleteModulo(id).subscribe({
            next: () => { Toast.fire({ icon: 'success', title: 'Eliminado' }); this.recargarCursoSeleccionado(); }
          });
        }
      });
  }

  // Helpers vista
  toggleModulo(mod: any) { mod.isOpen = !mod.isOpen; }
  trackByFn(index: number, item: any) { return item.idLeccion || item.idModulo || index; }

  // ==========================================
  //   CRUD CURSOS
  // ==========================================
  cargarCursos() { this.courseService.getCourses().subscribe(d => { this.listaCursos = d; this.cd.detectChanges(); }); }

  guardarCurso() {
    if (!this.cursoActual.titulo) return;
    const req = (this.esEdicion && this.cursoActual.idCurso)
      ? this.courseService.updateCourse(this.cursoActual.idCurso, this.cursoActual)
      : this.courseService.createCourse(this.cursoActual);
    req.subscribe(() => { Swal.fire({title:'Guardado', icon:'success', timer:1500, showConfirmButton:false}); this.limpiarFormulario(); this.cargarCursos(); });
  }

  eliminarCurso(id: number) {
    Swal.fire({ title: '¿Borrar curso?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => {
      if (r.isConfirmed) this.courseService.deleteCourse(id).subscribe(() => { this.cargarCursos(); Toast.fire({ icon: 'success', title: 'Eliminado' }); });
    });
  }

  inscribirse(c: Course) { if(c.idCurso) this.courseService.enrollStudent(c.idCurso).subscribe(() => { Swal.fire('¡Inscrito!', '', 'success'); this.cargarCursos(); }); }
  cambiarCupos(c: Course, n: number) { if(c.idCurso) this.courseService.updateQuota(c.idCurso, n).subscribe(() => this.cargarCursos()); }

  editarCurso(c: Course) { this.cursoActual = { ...c }; this.esEdicion = true; }
  limpiarFormulario() { this.cursoActual = { titulo: '', descripcion: '', categoria: '', nivel: 'Basico', estado: 'Activo' }; this.esEdicion = false; }

  // Filtros
  onSearchInput() { this.buscadorSubject.next(this.filtroTitulo); }
  onSelectChange() { this.ejecutarFiltro(); }
  ejecutarFiltro() {
    this.courseService.searchCourses(this.filtroTitulo, this.filtroNivel, this.filtroEstado).subscribe(d => {
      this.listaCursos = this.filtroCategoria ? d.filter(x => x.categoria.toLowerCase().includes(this.filtroCategoria.toLowerCase())) : d;
      this.cd.detectChanges();
    });
  }
  ejecutarBusqueda(t: string) { this.ejecutarFiltro(); }
  limpiarFiltros() { this.filtroTitulo = ''; this.filtroNivel = ''; this.filtroEstado = ''; this.filtroCategoria = ''; this.cargarCursos(); }
  get cursosFiltrados() { return this.listaCursos; }
  async editarLeccion(leccion: Leccion, moduloId: number) { /* Pendiente de backend */ Swal.fire('Info', 'Falta endpoint PUT leccion', 'info'); }
}

