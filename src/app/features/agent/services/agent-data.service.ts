import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { generateSlug } from '../../admin/services/admin-data.service';
import { AgentDashboard, AgentSalon, AgentSalonForm } from '../models/agent';

/**
 * Données de l'espace agent. Un salon inscrit passe par POST /api/salons : le serveur le rattache
 * à l'agent connecté, crée le compte du coiffeur (numéro du salon) et laisse le salon fermé.
 */
@Injectable({ providedIn: 'root' })
export class AgentDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_CONFIG.baseUrl;

  /** Derniers salons chargés (accueil, liste) : affichage immédiat en revenant sur une page. */
  readonly salons = signal<AgentSalon[]>([]);

  dashboard(): Observable<AgentDashboard> {
    return this.http.get<AgentDashboard>(`${this.baseUrl}/agent/dashboard`);
  }

  mySalons(): Observable<AgentSalon[]> {
    return this.http
      .get<AgentSalon[]>(`${this.baseUrl}/agent/salons`)
      .pipe(tap((list) => this.salons.set(list)));
  }

  /** Tous les salons des localités de l'agent (y compris ceux inscrits par d'autres). */
  zoneSalons(): Observable<AgentSalon[]> {
    return this.http.get<AgentSalon[]>(`${this.baseUrl}/agent/zone-salons`);
  }

  salon(id: number): Observable<AgentSalon> {
    return this.http.get<AgentSalon>(`${this.baseUrl}/salons/${id}`);
  }

  /** Inscrit le salon ; si l'adresse web (slug) existe déjà, réessaie une fois avec un suffixe. */
  async createSalon(form: AgentSalonForm): Promise<AgentSalon> {
    const base = generateSlug(form.name) || 'salon';
    try {
      return await firstValueFrom(this.postSalon(form, base));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const suffix = Date.now().toString(36).slice(-4);
        return await firstValueFrom(this.postSalon(form, `${base}-${suffix}`));
      }
      throw err;
    }
  }

  /** Correction d'une fiche : le serveur ignore téléphone, propriétaire et statut pour un agent. */
  updateSalon(id: number, form: AgentSalonForm): Observable<AgentSalon> {
    return this.http.patch<AgentSalon>(`${this.baseUrl}/salons/${id}`, {
      id,
      localityId: form.localityId,
      name: form.name.trim(),
      district: form.district.trim(),
      location: form.location.trim(),
      address: form.address.trim() || null,
      openingHours: form.openingHours.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
      avatarUrl: form.avatarUrl,
      coverUrl: form.coverUrl,
    });
  }

  /** Photo du salon (dossier « salons ») ; renvoie l'URL publique. */
  async uploadPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'salons');
    const res = await firstValueFrom(
      this.http.post<{ url?: string }>(`${this.baseUrl}/storage/upload`, formData),
    );
    if (!res?.url) throw new Error("La photo n'a pas pu être envoyée.");
    return this.absoluteUrl(res.url);
  }

  private postSalon(form: AgentSalonForm, slug: string): Observable<AgentSalon> {
    return this.http.post<AgentSalon>(`${this.baseUrl}/salons`, {
      localityId: form.localityId,
      name: form.name.trim(),
      slug,
      ownerName: form.ownerName.trim(),
      coiffeurName: form.ownerName.trim(),
      phone: form.phone.trim(),
      district: form.district.trim(),
      location: form.location.trim(),
      address: form.address.trim() || null,
      openingHours: form.openingHours.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
      avatarUrl: form.avatarUrl,
      coverUrl: form.coverUrl,
      // Imposés par le serveur pour un agent (salon fermé, file vide) ; requis par la validation
      status: 'CLOSED',
      active: true,
    });
  }

  private absoluteUrl(url: string): string {
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    const apiOrigin = API_CONFIG.baseUrl.replace(/\/api\/?$/, '');
    return apiOrigin + (url.startsWith('/') ? url : '/' + url);
  }
}
