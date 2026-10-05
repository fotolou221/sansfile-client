import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { HttpErrorMessageService } from '../../../shared/services/http-error-message.service';
import { hasAnyAuthority } from '../../../core/auth/jwt-claims';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'manager';
  avatar?: string;
}

const ADMIN_STORAGE_KEY = 'sansfile_admin_session';
const NOT_ADMIN_MESSAGE =
  "Ce compte n'a pas accès à la console d'administration. Agents de terrain : connectez-vous depuis l'espace agent (/agent).";

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly baseUrl = API_CONFIG.baseUrl;

  readonly currentAdmin = signal<AdminUser | null>(this.loadSession());
  readonly isAuthenticated = computed(() => this.currentAdmin() !== null);

  private loadSession(): AdminUser | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  login(email: string, pass: string): Observable<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    return this.http
      .post<any>(`${this.baseUrl}/authenticate`, {
        username: cleanEmail,
        password: cleanPass,
        rememberMe: true,
      })
      .pipe(
        map((res) => {
          // Le mot de passe ouvre aussi l'espace des agents de terrain : la console reste réservée aux admins
          if (res?.id_token && !hasAnyAuthority(res.id_token, 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')) {
            throw new Error(NOT_ADMIN_MESSAGE);
          }
          return res;
        }),
        tap((res) => {
          if (res && res.id_token) {
            if (this.isBrowser) {
              localStorage.setItem('sansfile_jwt_token', res.id_token);
              const refreshToken = res.refresh_token || res.refreshToken;
              if (refreshToken) {
                localStorage.setItem('sansfile_refresh_token', refreshToken);
              }
            }
            const user: AdminUser = {
              id: 'admin-01',
              name: 'Direction SansFile',
              email: cleanEmail,
              role: 'super_admin',
            };

            this.currentAdmin.set(user);
            if (this.isBrowser) {
              localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
            }
          }
        }),
        map(() => ({ success: true })),
        catchError((err) => {
          console.warn('[AdminAuthService] Login failed:', err);
          const message =
            err instanceof Error && err.message === NOT_ADMIN_MESSAGE
              ? NOT_ADMIN_MESSAGE
              : err instanceof HttpErrorResponse && err.status === 401
                ? 'Identifiants invalides. Verifiez votre adresse email et mot de passe.'
                : this.errorMessages.message(
                    err,
                    'Impossible de se connecter au tableau de bord. Verifiez votre connexion.',
                  );
          return of({
            success: false,
            message,
          });
        }),
      );
  }

  logout(): void {
    this.currentAdmin.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      localStorage.removeItem('sansfile_jwt_token');
      localStorage.removeItem('sansfile_refresh_token');
    }
    this.router.navigate(['/admin/login']);
  }
}

export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/admin/login']);
  return false;
};
