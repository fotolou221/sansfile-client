import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { maintenanceInterceptor } from './core/interceptors/maintenance.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, maintenanceInterceptor])),
    // Service worker d'Angular, enrichi de l'accusé de réception des notifications push (public/sansfile-sw.js)
    provideServiceWorker('sansfile-sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
      updateViaCache: 'none',
    }),
  ],
};
