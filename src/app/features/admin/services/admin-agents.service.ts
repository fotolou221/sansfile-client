import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';

export interface AdminAgent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  activated: boolean;
  /** Mot de passe provisoire pas encore remplacé (jamais connecté ou mot de passe réinitialisé). */
  mustChangePassword: boolean;
  salonsCount: number;
  lastLoginAt: string | null;
  createdDate: string | null;
}

export interface AgentFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Réponse à la création / réinitialisation : mot de passe provisoire à transmettre à l'agent. */
export interface AgentCredentials {
  agent: AdminAgent;
  temporaryPassword: string;
}

export type AgentActionType =
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_UPDATED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED'
  | 'PASSWORD_RESET'
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'SALON_CREATED'
  | 'SALON_UPDATED';

export interface AgentActivity {
  id: number;
  agentId: number;
  agentName: string;
  agentEmail: string | null;
  action: AgentActionType;
  description: string | null;
  salonId: number | null;
  actor: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdDate: string;
}

export interface AgentSalonSummary {
  id: number;
  name: string;
  slug: string;
  district: string;
  location: string;
  phone: string | null;
  ownerName: string | null;
  status: 'OPEN' | 'CLOSED';
  createdDate: string | null;
}

export const AGENT_ACTION_LABELS: Record<AgentActionType, string> = {
  ACCOUNT_CREATED: 'Compte créé',
  ACCOUNT_UPDATED: 'Compte modifié',
  ACCOUNT_DISABLED: 'Compte désactivé',
  ACCOUNT_ENABLED: 'Compte réactivé',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  LOGIN: 'Connexion',
  LOGIN_FAILED: 'Échec de connexion',
  LOGOUT: 'Déconnexion',
  PASSWORD_CHANGED: 'Mot de passe changé',
  SALON_CREATED: 'Salon inscrit',
  SALON_UPDATED: 'Salon modifié',
};

/** Couleur du badge d'une action dans le journal. */
export function agentActionVariant(
  action: AgentActionType,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' {
  switch (action) {
    case 'SALON_CREATED':
      return 'success';
    case 'SALON_UPDATED':
      return 'primary';
    case 'LOGIN_FAILED':
    case 'ACCOUNT_DISABLED':
      return 'danger';
    case 'PASSWORD_RESET':
      return 'warning';
    case 'LOGIN':
    case 'LOGOUT':
      return 'neutral';
    default:
      return 'info';
  }
}

/** « Android · Chrome », « iPhone · Safari »… à partir du User-Agent du journal. */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return '—';
  const os = /iPhone|iPad/i.test(userAgent)
    ? 'iPhone'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /Windows/i.test(userAgent)
        ? 'Windows'
        : /Mac OS/i.test(userAgent)
          ? 'Mac'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Autre';
  const browser = /Edg\//i.test(userAgent)
    ? 'Edge'
    : /SamsungBrowser/i.test(userAgent)
      ? 'Samsung Internet'
      : /Chrome\//i.test(userAgent)
        ? 'Chrome'
        : /Firefox\//i.test(userAgent)
          ? 'Firefox'
          : /Safari\//i.test(userAgent)
            ? 'Safari'
            : '';
  return browser ? `${os} · ${browser}` : os;
}

/** Comptes des agents de terrain et journal de leurs actions (console d'administration). */
@Injectable({ providedIn: 'root' })
export class AdminAgentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_CONFIG.baseUrl}/admin`;

  readonly agents = signal<AdminAgent[]>([]);
  readonly loaded = signal(false);
  private readonly namesById = computed(
    () =>
      new Map(this.agents().map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim() || a.email])),
  );

  /** Nom de l'agent créateur d'un salon (liste des salons de l'admin). */
  agentName(agentId: number | null | undefined): string | null {
    if (agentId == null) return null;
    return this.namesById().get(agentId) ?? `Agent n°${agentId}`;
  }

  load(): Observable<AdminAgent[]> {
    return this.http.get<AdminAgent[]>(`${this.baseUrl}/agents`).pipe(
      tap((list) => {
        this.agents.set(list);
        this.loaded.set(true);
      }),
    );
  }

  create(form: AgentFormValue): Observable<AgentCredentials> {
    return this.http
      .post<AgentCredentials>(`${this.baseUrl}/agents`, this.clean(form))
      .pipe(tap((res) => this.agents.update((list) => [res.agent, ...list])));
  }

  update(id: number, form: AgentFormValue): Observable<AdminAgent> {
    return this.http
      .put<AdminAgent>(`${this.baseUrl}/agents/${id}`, this.clean(form))
      .pipe(tap((agent) => this.replace(agent)));
  }

  resetPassword(id: number): Observable<AgentCredentials> {
    return this.http
      .post<AgentCredentials>(`${this.baseUrl}/agents/${id}/reset-password`, {})
      .pipe(tap((res) => this.replace(res.agent)));
  }

  setActivation(id: number, activated: boolean): Observable<AdminAgent> {
    return this.http
      .put<AdminAgent>(`${this.baseUrl}/agents/${id}/activation`, { activated })
      .pipe(tap((agent) => this.replace(agent)));
  }

  salonsOf(id: number): Observable<AgentSalonSummary[]> {
    return this.http.get<AgentSalonSummary[]>(`${this.baseUrl}/agents/${id}/salons`);
  }

  activities(filters: {
    agentId?: number | null;
    action?: AgentActionType | null;
    page: number;
    size: number;
  }): Observable<{ items: AgentActivity[]; total: number }> {
    let params = new HttpParams().set('page', filters.page).set('size', filters.size);
    if (filters.agentId) params = params.set('agentId', filters.agentId);
    if (filters.action) params = params.set('action', filters.action);
    return this.http
      .get<AgentActivity[]>(`${this.baseUrl}/agent-activities`, { params, observe: 'response' })
      .pipe(
        map((res) => ({
          items: res.body ?? [],
          total: Number(res.headers.get('X-Total-Count')) || (res.body?.length ?? 0),
        })),
      );
  }

  private replace(agent: AdminAgent): void {
    this.agents.update((list) => list.map((a) => (a.id === agent.id ? agent : a)));
  }

  private clean(form: AgentFormValue): AgentFormValue {
    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    };
  }
}
