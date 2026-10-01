import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  catchError,
  Observable,
  of,
  retry,
  shareReplay,
  switchMap,
  throwError,
  timeout,
  timer,
} from 'rxjs';
import { API_CONFIG } from '../config/api.config';

let isRefreshing = false;
let refreshObservable: Observable<string | null> | null = null;

/**
 * Intercepteur HTTP pour :
 * 1. Injecter le token JWT Access Token dans toutes les requêtes protégées.
 * 2. Intercepter les erreurs 401 Unauthorized et rafraîchir silencieusement le token
 *    avec le Refresh Token (60 jours, renouvelé à chaque usage) sans redemander de code SMS.
 * 3. Rejouer la requête d'origine avec le nouvel Access Token.
 * 4. Gérer le timeout et le réessai automatique (retry) si le serveur répond lentement.
 */

/** Refus définitif du refresh token par le serveur (expiré, invalide, compte désactivé). */
function isRefreshRejected(err: unknown): boolean {
  return (
    err instanceof HttpErrorResponse &&
    (err.status === 400 || err.status === 401 || err.status === 403)
  );
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? localStorage.getItem('sansfile_jwt_token') : null;

  // Ne pas altérer les endpoints d'authentification ni le refresh
  const isAuthOrRefresh =
    req.url.includes('/api/auth/otp/') ||
    req.url.includes('/api/auth/refresh') ||
    req.url.includes('/api/authenticate');

  let authReq = req;
  if (token && !isAuthOrRefresh) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  const httpBackend = inject(HttpBackend);

  // Les téléversements de fichiers (images produits/catégories) peuvent être lents
  // sur mobile : on ne leur applique pas le timeout court des requêtes API classiques.
  const isFileUpload =
    authReq.url.includes('/storage/upload') || authReq.url.includes('/files/upload');
  const isApiRequest = authReq.url.startsWith(API_CONFIG.baseUrl) || authReq.url.includes('/api/');
  const isGetRequest = authReq.method === 'GET';

  let handledRequest: Observable<any> = next(authReq);

  if (isApiRequest && !isFileUpload) {
    handledRequest = handledRequest.pipe(
      timeout(API_CONFIG.timeoutMs),
      retry({
        count: isGetRequest ? 2 : 0,
        delay: (err, retryCount) => {
          const isTransient =
            err?.name === 'TimeoutError' ||
            (err instanceof HttpErrorResponse &&
              (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504));
          if (!isTransient) {
            throw err;
          }
          return timer(retryCount * 1500);
        },
      }),
    );
  }

  return handledRequest.pipe(
    catchError((error: HttpErrorResponse) => {
      // Si 401 Unauthorized et qu'on a un refresh token disponible en local
      if (error.status === 401 && !isAuthOrRefresh && isBrowser) {
        const refreshToken = localStorage.getItem('sansfile_refresh_token');

        if (refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            // Utilisation d'un HttpClient direct sur HttpBackend pour éviter tout cycle d'interception
            const rawHttp = new HttpClient(httpBackend);

            refreshObservable = rawHttp
              .post<any>(`${API_CONFIG.baseUrl}/auth/refresh`, {
                refresh_token: refreshToken,
              })
              .pipe(
                switchMap((res) => {
                  isRefreshing = false;
                  const newToken = res.id_token || res.token;
                  const newRefresh = res.refresh_token || res.refreshToken || refreshToken;

                  if (newToken) {
                    localStorage.setItem('sansfile_jwt_token', newToken);
                  }
                  if (newRefresh) {
                    localStorage.setItem('sansfile_refresh_token', newRefresh);
                  }
                  return of(newToken);
                }),
                catchError((refreshErr) => {
                  isRefreshing = false;
                  refreshObservable = null;
                  // Réseau coupé, serveur en redémarrage ou limite atteinte (429) : la session reste valide,
                  // on garde les jetons pour réessayer plus tard au lieu d'imposer un nouveau code SMS.
                  if (isRefreshRejected(refreshErr)) {
                    console.warn('[authInterceptor] Refresh token expiré ou révoqué :', refreshErr);
                    localStorage.removeItem('sansfile_jwt_token');
                    localStorage.removeItem('sansfile_refresh_token');
                  }
                  return throwError(() => refreshErr);
                }),
                shareReplay(1),
              );
          }

          return refreshObservable!.pipe(
            switchMap((newToken) => {
              if (newToken) {
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                });
                return next(retriedReq);
              }
              return throwError(() => error);
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};
