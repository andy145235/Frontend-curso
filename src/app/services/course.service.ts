import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Course } from '../models/course';
import { Modulo } from '../models/modulo';
import { Leccion } from '../models/leccion';

@Injectable({
  providedIn: 'root'
})
export class CourseService {

  private apiUrlCursos = '/cursos';
  private apiUrlModulos = '/modulos';

  constructor(private http: HttpClient) { }

  // ==========================================
  //   LECTURA (GET) CON NORMALIZACIÓN
  // ==========================================

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(this.apiUrlCursos).pipe(
      map((cursos: any[]) => this.normalizarLista(cursos))
    );
  }

  searchCourses(titulo: string, nivel: string, estado: string): Observable<Course[]> {
    let params = new HttpParams();
    if (titulo) params = params.set('titulo', titulo);
    if (nivel) params = params.set('nivel', nivel);
    if (estado) params = params.set('estado', estado);

    return this.http.get<Course[]>(`${this.apiUrlCursos}/criteria`, { params }).pipe(
      map((cursos: any[]) => this.normalizarLista(cursos))
    );
  }

  // Helpers para arreglar IDs (id_leccion -> idLeccion)
  private normalizarLista(cursos: any[]): Course[] {
    return cursos.map(c => this.normalizarCurso(c));
  }

  private normalizarCurso(curso: any): Course {
    return {
      ...curso,
      idCurso: curso.idCurso || curso.id_curso,
      modulos: curso.modulos?.map((mod: any) => ({
        ...mod,
        idModulo: mod.idModulo || mod.id_modulo,
        lecciones: mod.lecciones?.map((l: any) => ({
          ...l,
          idLeccion: l.idLeccion || l.id_leccion,
          videoUrl: l.videoUrl || l.video_url,
          pdfUrl: l.pdfUrl || l.pdf_url,
          idModulo: l.idModulo || l.id_modulo
        }))
      }))
    };
  }

  // ==========================================
  //   ESCRITURA (POST, PUT, DELETE)
  // ==========================================

  createCourse(c: Course): Observable<Course> { return this.http.post<Course>(this.apiUrlCursos, c); }
  updateCourse(id: number, c: Course): Observable<Course> { return this.http.put<Course>(`${this.apiUrlCursos}/${id}`, c); }
  deleteCourse(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrlCursos}/${id}`); }

  enrollStudent(id: number): Observable<void> { return this.http.post<void>(`${this.apiUrlCursos}/${id}/inscribir`, {}); }
  unenrollStudent(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrlCursos}/${id}/inscribir`); }
  updateQuota(id: number, n: number): Observable<Course> { return this.http.patch<Course>(`${this.apiUrlCursos}/${id}/cupos?cantidad=${n}`, {}); }

  // Módulos
  addModulo(id: number, m: Modulo): Observable<Modulo> { return this.http.post<Modulo>(`${this.apiUrlCursos}/${id}/modulos`, m); }
  updateModulo(id: number, m: Modulo): Observable<Modulo> { return this.http.put<Modulo>(`${this.apiUrlModulos}/${id}`, m); }
  deleteModulo(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrlModulos}/${id}`); }

  // Lecciones
  addLeccion(modId: number, l: Leccion): Observable<Leccion> {
    return this.http.post<Leccion>(`${this.apiUrlModulos}/${modId}/lecciones`, l);
  }

  // 👇 AQUÍ ESTABA EL ERROR (Asegúrate de que tenga 'return')
  deleteLeccion(idLeccion: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlModulos}/lecciones/${idLeccion}`);
  }

  // Progreso
  markLessonAsCompleted(cId: number, lId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrlCursos}/${cId}/lecciones/${lId}/completar`, {});
  }

  getStudentProgress(cId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrlCursos}/${cId}/progreso`);
  }
}
