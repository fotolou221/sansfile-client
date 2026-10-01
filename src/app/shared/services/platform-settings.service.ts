import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';

interface PublicPlatformSettings {
  contactEmail: string;
  contactPhone: string;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: PublicPlatformSettings = {
  contactEmail: 'contact@sansfile.sn',
  contactPhone: '+221 77 862 70 52',
  maintenanceMode: false,
};

/**
 * Paramètres publics de la plateforme (coordonnées du support, mode maintenance),
 * modifiables depuis la console admin (Paramètres Système).
 */
@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<PublicPlatformSettings>(DEFAULT_SETTINGS);
  private readonly loadedSignal = signal(false);
  private readonly lastCheckSignal = signal<Date | null>(null);
  private readonly firstLoad: Promise<void>;

  readonly contactEmail = computed(() => this.state().contactEmail);
  readonly contactPhone = computed(() => this.state().contactPhone);
  /** Numéro international sans « + » ni espaces, pour les liens tel: et wa.me. */
  readonly contactPhoneDigits = computed(() => this.state().contactPhone.replace(/\D/g, ''));
  readonly maintenanceMode = computed(() => this.state().maintenanceMode);
  /** Vrai dès la première réponse (ou le premier échec) du serveur. */
  readonly loaded = this.loadedSignal.asReadonly();
  readonly lastCheck = this.lastCheckSignal.asReadonly();

  constructor() {
    this.firstLoad = this.refresh();
  }

  /** Attend le premier chargement des paramètres (utile aux gardes de navigation). */
  whenLoaded(): Promise<void> {
    return this.firstLoad;
  }

  refresh(): Promise<void> {
    return new Promise((resolve) => {
      this.http
        .get<any>(`${API_CONFIG.baseUrl}/platform-settings`)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          const s = Array.isArray(res) ? res[0] : res;
          if (s) {
            this.state.set({
              contactEmail: s.contactEmail || DEFAULT_SETTINGS.contactEmail,
              contactPhone: s.contactPhone || DEFAULT_SETTINGS.contactPhone,
              maintenanceMode: s.maintenanceMode === true,
            });
          }
          this.lastCheckSignal.set(new Date());
          this.loadedSignal.set(true);
          resolve();
        });
    });
  }
}
