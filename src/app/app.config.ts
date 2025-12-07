import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // Ahora esto funcionará bien
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { KeycloakAngularModule, KeycloakService, KeycloakBearerInterceptor } from 'keycloak-angular';
import { initializeKeycloak } from './keycloak-init.factory';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideRouter(routes),
    importProvidersFrom(KeycloakAngularModule),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService]
    },
    // --- ESTO ES LO QUE CONECTA TUS ENDPOINTS ---
    {
      provide: HTTP_INTERCEPTORS,
      useClass: KeycloakBearerInterceptor, // Pega el token automáticamente
      multi: true
    },
    // -------------------------------------------
    KeycloakService,
    provideHttpClient(withInterceptorsFromDi())
  ]
};
