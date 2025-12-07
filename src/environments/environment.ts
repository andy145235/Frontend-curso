export const environment = {
  production: false,
  keycloak: {
    url: 'http://localhost:8080', // Tu servidor Keycloak
    realm: 'DemoUCB',             // El reino que creamos
    clientId: 'angular-client'    // El nombre del cliente PÚBLICO que creaste
  }
};
