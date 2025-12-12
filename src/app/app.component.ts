import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';

import { CoursesDashboardComponent } from './components/courses-dashboard/courses-dashboard.component';
import { ClassroomComponent } from './components/classroom/classroom.component';
import { ReviewsScreenComponent } from './components/reviews-screen/reviews-screen.component';
import { Course } from './models/course';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CoursesDashboardComponent,
    ClassroomComponent,
    ReviewsScreenComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  isAdmin = false;

  vistaClase = false;
  vistaResenas = false;

  cursoEnClase: Course | null = null;
  cursoSeleccionado: Course | null = null;

  constructor(private keycloak: KeycloakService) {}

  async ngOnInit() {
    const roles = this.keycloak.getUserRoles();
    this.isAdmin = roles.includes('admin');
  }

  onOpenClass(curso: Course) {
    this.cursoEnClase = curso;
    this.vistaClase = true;
    this.vistaResenas = false;
  }

  onOpenReviews(curso: Course) {
    this.cursoSeleccionado = curso;
    this.vistaResenas = true;
    this.vistaClase = false;
  }

  onCloseClass() {
    this.vistaClase = false;
    this.cursoEnClase = null;
  }

  onCloseReviews() {
    this.vistaResenas = false;
    this.cursoSeleccionado = null;
  }
}
