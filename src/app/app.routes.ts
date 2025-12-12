import { Routes } from '@angular/router';
import { AppComponent } from './app.component'; // Tu home actual

export const routes: Routes = [
  { path: '', component: AppComponent }, // Home
  { path: '**', redirectTo: '' }
];
