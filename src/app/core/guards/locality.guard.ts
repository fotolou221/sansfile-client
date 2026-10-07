import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../../features/auth/auth-session.service';
import { LocalityService } from '../../shared/services/locality.service';

/**
 * Clients et coiffeurs : tant que le compte n'a pas de localité (ni de zone demandée), la page
 * « Ma localité » s'ouvre avant toute autre. Vérifié à chaque ouverture de l'application, pas
 * seulement après l'OTP : les sessions ouvertes avant les localités durent jusqu'à 60 jours.
 */
export const localityChosenGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  const localities = inject(LocalityService);

  const user = auth.currentUser();
  if (!user || user.id === 'guest') {
    // Pas connecté : les gardes de connexion s'en chargent
    return true;
  }
  const chosen = await localities.ensureChosen();
  return chosen
    ? true
    : router.createUrlTree(['/ma-localite'], { queryParams: { redirect: state.url } });
};
