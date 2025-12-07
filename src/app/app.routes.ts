import { Routes } from '@angular/router';
import { AppComponent } from './app.component'; // Tu home actual
import { CourseClassroomComponent } from './components/course-classroom/course-classroom.component';

export const routes: Routes = [
  { path: '', component: AppComponent }, // Home
  { path: 'aprender/:id', component: CourseClassroomComponent }, // <--- NUEVA RUTA
  { path: '**', redirectTo: '' }
];
