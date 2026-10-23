import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';

export interface PublicStats {
  activeUsers: number;
  activeUsersFormatted: string;
  totalSalons: number;
  totalSalonsFormatted: string;
  satisfactionRate: number;
  satisfactionRateFormatted: string;
  serviceAvailability: string;
  totalTicketsServed?: number;
  totalOrders?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VitrineStatsService {
  private readonly http = inject(HttpClient);

  /**
   * Récupère les métriques publiques réelles depuis le backend Spring Boot.
   * Renvoie `null` si le serveur ne répond pas : la vitrine n'affiche alors aucun chiffre plutôt
   * que des valeurs inventées.
   */
  getPublicStats(): Observable<PublicStats | null> {
    return this.http.get<PublicStats>(`${API_CONFIG.baseUrl}/public/stats`).pipe(
      catchError((err) => {
        console.warn('[VitrineStatsService] Statistiques publiques indisponibles :', err);
        return of(null);
      }),
    );
  }
}
