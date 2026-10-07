import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, switchMap, tap, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { hasAnyAuthority } from '../../../core/auth/jwt-claims';
import { HttpErrorMessageService } from '../../../shared/services/http-error-message.service';
import { AgentProfile } from '../models/agent';

const AGENT_SESSION_KEY = 'sansfile_agent_session';
const NOT_AGENT_MESSAGE =
  "Ce compte n'est pas un compte agent de terrain. Les administrateurs se connectent sur /admin.";

export interface AgentLoginResult {
  success: boolean;
  message?: string;
}

/**
 * Session des agents de terrain : connexion par e-mail + mot de passe (comptes créés par l'admin),
 * mot de passe provisoire à remplacer à la première connexion.
 */
@Injectable({ providedIn: 'root' })
export class AgentAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = API_CONFIG.baseUrl;

  readonly profile = signal<AgentProfile | null>(this.loadSession());
  readonly isAuthenticated = computed(() => this.profile() !== null);
  readonly mustChangePassword = computed(() => this.profile()?.mustChangePassword ?? false);
  /** Localités de l'agent ; aucune : il ne peut ni inscrire ni modifier de salon. */
  readonly localities = computed(() => this.profile()?.localities ?? []);
  readonly hasLocality = computed(() => this.localities().length > 0);

  /** Salon modifiable : dans une de ses localités, ou inscrit par lui avant les localités. */
  canEditSalon(salon: { localityId?: number | null; createdByAgentId?: number | null }): boolean {
    const profile = this.profile();
    if (!profile || !this.hasLocality()) return false;
    if (salon.localityId === null || salon.localityId === undefined) {
      return salon.createdByAgentId === profile.id;
    }
    return this.localities().some((l) => l.id === salon.localityId);
  }
  readonly displayName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}`.trim() || p.email : '';
  });
  readonly initials = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return (
      `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase() || p.email[0].toUpperCase()
    );
  });

  login(email: string, password: string): Observable<AgentLoginResult> {
    return this.http
      .post<{ id_token?: string; refresh_token?: string }>(`${this.baseUrl}/authenticate`, {
        username: email.trim().toLowerCase(),
        password,
        rememberMe: true,
      })
      .pipe(
        map((res) => {
          if (!res?.id_token) throw new Error('Réponse de connexion invalide.');
          if (!hasAnyAuthority(res.id_token, 'ROLE_AGENT')) throw new Error(NOT_AGENT_MESSAGE);
          this.storeTokens(res.id_token, res.refresh_token);
        }),
        switchMap(() => this.http.get<AgentProfile>(`${this.baseUrl}/agent/me`)),
        tap((profile) => this.setProfile(profile)),
        map(() => ({ success: true })),
        catchError((err) => {
          this.clearSession();
          return of({ success: false, message: this.loginErrorMessage(err) });
        }),
      );
  }

  /** Relit le profil (mot de passe provisoire, compte désactivé…) au chargement de l'espace agent. */
  refreshProfile(): Observable<AgentProfile | null> {
    return this.http.get<AgentProfile>(`${this.baseUrl}/agent/me`).pipe(
      tap((profile) => this.setProfile(profile)),
      catchError((err) => {
        this.handleApiError(err);
        return of(null);
      }),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/agent/password`, { currentPassword, newPassword })
      .pipe(
        tap(() => {
          const p = this.profile();
          if (p) this.setProfile({ ...p, mustChangePassword: false });
        }),
      );
  }

  /** Déconnexion : tracée dans le journal si le serveur répond, puis session effacée dans tous les cas. */
  logout(): void {
    if (!this.isAuthenticated()) {
      void this.router.navigate(['/agent/login']);
      return;
    }
    this.http
      .post(`${this.baseUrl}/agent/logout`, {})
      .pipe(
        timeout(4000),
        catchError(() => of(null)),
        finalize(() => {
          this.clearSession();
          void this.router.navigate(['/agent/login']);
        }),
      )
      .subscribe();
  }

  /**
   * Réaction commune aux refus du serveur : mot de passe provisoire à changer, compte désactivé ou
   * session d'un autre type de compte. Renvoie true si l'erreur a été prise en charge.
   */
  handleApiError(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) return false;
    const code = (err.error as { code?: string } | null)?.code;
    if (code === 'password-change-required') {
      const p = this.profile();
      if (p) this.setProfile({ ...p, mustChangePassword: true });
      void this.router.navigate(['/agent/mot-de-passe']);
      return true;
    }
    if (code === 'no-locality' || code === 'locality-not-assigned') {
      // Localités retirées ou modifiées par l'admin : profil relu, le message du serveur s'affiche
      this.refreshProfile().subscribe();
      return false;
    }
    if (code === 'agent-disabled' || code === 'not-agent' || err.status === 401) {
      this.clearSession();
      void this.router.navigate(['/agent/login'], {
        queryParams: code === 'agent-disabled' ? { desactive: 1 } : {},
      });
      return true;
    }
    return false;
  }

  errorMessage(err: unknown, fallback: string): string {
    return this.errorMessages.message(err, fallback);
  }

  private loginErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message === NOT_AGENT_MESSAGE) return NOT_AGENT_MESSAGE;
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'E-mail ou mot de passe incorrect.';
      if (err.status === 429)
        return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
      if (err.status === 403) return NOT_AGENT_MESSAGE;
    }
    return this.errorMessages.message(err, 'Connexion impossible. Vérifiez votre réseau.');
  }

  private setProfile(profile: AgentProfile): void {
    this.profile.set(profile);
    if (this.isBrowser) {
      try {
        localStorage.setItem(AGENT_SESSION_KEY, JSON.stringify(profile));
      } catch {}
    }
  }

  private storeTokens(token: string, refreshToken?: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem('sansfile_jwt_token', token);
    if (refreshToken) localStorage.setItem('sansfile_refresh_token', refreshToken);
  }

  private clearSession(): void {
    this.profile.set(null);
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(AGENT_SESSION_KEY);
      localStorage.removeItem('sansfile_jwt_token');
      localStorage.removeItem('sansfile_refresh_token');
    } catch {}
  }

  private loadSession(): AgentProfile | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(AGENT_SESSION_KEY);
      return raw && localStorage.getItem('sansfile_jwt_token')
        ? (JSON.parse(raw) as AgentProfile)
        : null;
    } catch {
      return null;
    }
  }
}

/** Espace agent : connexion requise. */
export const agentAuthGuard: CanActivateFn = () => {
  const auth = inject(AgentAuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/agent/login']);
};

/** Toute page de travail : le mot de passe provisoire doit avoir été remplacé. */
export const agentPasswordChangedGuard: CanActivateFn = () => {
  const auth = inject(AgentAuthService);
  return auth.mustChangePassword() ? inject(Router).createUrlTree(['/agent/mot-de-passe']) : true;
};
