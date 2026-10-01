import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';

/** Délai maximal d'attente des paramètres : au-delà, on laisse passer plutôt que de bloquer l'application. */
const SETTINGS_WAIT_MS = 4000;

/** Pendant la maintenance, seuls la vitrine, l'admin (pour la lever) et la page de maintenance restent ouverts. */
export function isOpenDuringMaintenance(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return (
    path === '' ||
    path === '/' ||
    path === '/vitrine' ||
    path === '/maintenance' ||
    path === '/admin' ||
    path.startsWith('/admin/')
  );
}

/** Adresse de la page de maintenance, avec la page à rouvrir une fois la maintenance terminée. */
export function maintenanceUrl(router: Router, returnUrl: string) {
  return router.createUrlTree(['/maintenance'], { queryParams: { retour: returnUrl } });
}

/** Redirige vers la page de maintenance tant que l'admin n'a pas levé le mode maintenance. */
export const maintenanceGuard: CanActivateFn = async (_route, state) => {
  const settings = inject(PlatformSettingsService);
  const router = inject(Router);
  await Promise.race([
    settings.whenLoaded(),
    new Promise<void>((resolve) => setTimeout(resolve, SETTINGS_WAIT_MS)),
  ]);
  return settings.maintenanceMode() ? maintenanceUrl(router, state.url) : true;
};
