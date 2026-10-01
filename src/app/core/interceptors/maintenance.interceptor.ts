import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';

/**
 * Le serveur refuse les actions en 503 « maintenance » : on relit aussitôt les paramètres,
 * ce qui affiche la page de maintenance même si le flux temps réel avait été coupé.
 */
export const maintenanceInterceptor: HttpInterceptorFn = (req, next) => {
  // Service récupéré seulement en cas de 503 : l'injecter ici créerait une dépendance circulaire,
  // car PlatformSettingsService fait lui-même une requête HTTP dès sa construction.
  const injector = inject(Injector);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 503 &&
        error.error?.maintenance === true
      ) {
        void injector.get(PlatformSettingsService).refresh();
      }
      return throwError(() => error);
    }),
  );
};
