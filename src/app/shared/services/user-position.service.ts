import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { GeoPoint, isValidPoint } from '../utils/geo';

/** Position du téléphone, datée. */
export interface UserPosition extends GeoPoint {
  readonly accuracy: number | null;
  /** Horodatage de la mesure (ms). */
  readonly at: number;
}

/**
 * unknown : jamais demandée ; locating : demande en cours ; ready : position connue ; denied : refusée par
 * l'utilisateur ; unavailable : GPS éteint ou introuvable ; unsupported : navigateur sans géolocalisation.
 */
export type PositionStatus =
  'unknown' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported';

const STORAGE_KEY = 'sansfile_position';
/** Position plus ancienne : remesurée en arrière-plan à l'ouverture de l'application. */
const REFRESH_AFTER_MS = 10 * 60 * 1000;
/** Position mémorisée réutilisée au démarrage tant qu'elle a moins de 7 jours. */
const STORED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Position du téléphone : salons autour du client et boutique la plus proche. Elle reste sur le téléphone
 * (mémorisée pour afficher tout de suite les salons au prochain lancement) ; seule la boutique la reçoit, pour
 * trouver le partenaire le plus proche, et la commande, pour la livraison.
 */
@Injectable({ providedIn: 'root' })
export class UserPositionService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly position = signal<UserPosition | null>(this.readStored());
  readonly status = signal<PositionStatus>(this.position() ? 'ready' : 'unknown');
  readonly ready = computed(() => this.position() !== null);

  private pending: Promise<UserPosition | null> | null = null;

  constructor() {
    if (!this.isBrowser) return;
    if (!('geolocation' in navigator)) {
      this.status.set('unsupported');
      return;
    }
    void this.watchPermission();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshIfStale();
    });
    this.refreshIfStale();
  }

  /**
   * Mesure la position (le navigateur demande l'autorisation la première fois). Une seule mesure à la fois ;
   * null si refusée ou introuvable (le statut dit pourquoi).
   */
  locate(): Promise<UserPosition | null> {
    if (!this.isBrowser || !('geolocation' in navigator)) {
      this.status.set('unsupported');
      return Promise.resolve(null);
    }
    if (this.pending) return this.pending;
    if (!this.position()) this.status.set('locating');
    this.pending = new Promise<UserPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const point: UserPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            at: Date.now(),
          };
          if (!isValidPoint(point.latitude, point.longitude)) {
            this.fail('unavailable');
            resolve(null);
            return;
          }
          this.position.set(point);
          this.status.set('ready');
          this.store(point);
          resolve(point);
        },
        (error) => {
          this.fail(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
      );
    }).finally(() => (this.pending = null));
    return this.pending;
  }

  /** Remesure en arrière-plan si la position date, seulement si l'autorisation est déjà donnée. */
  private refreshIfStale(): void {
    const current = this.position();
    if (!current || Date.now() - current.at < REFRESH_AFTER_MS) return;
    void this.locate();
  }

  /** Autorisation retirée dans les réglages : on oublie la position ; donnée : on mesure. */
  private async watchPermission(): Promise<void> {
    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' });
      if (!permission) return;
      const apply = () => {
        if (permission.state === 'denied') {
          this.forget();
          this.status.set('denied');
        } else if (permission.state === 'granted' && !this.position()) {
          void this.locate();
        }
      };
      apply();
      permission.onchange = apply;
    } catch {
      // API des autorisations absente (anciens Safari) : la demande se fera au clic
    }
  }

  private fail(status: 'denied' | 'unavailable'): void {
    if (status === 'denied') {
      this.forget();
      this.status.set('denied');
    } else if (!this.position()) {
      // Mesure ratée mais position récente connue : on la garde
      this.status.set('unavailable');
    }
  }

  private forget(): void {
    this.position.set(null);
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // stockage indisponible : rien à effacer
    }
  }

  private store(point: UserPosition): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(point));
    } catch {
      // navigation privée : la position reste en mémoire
    }
  }

  private readStored(): UserPosition | null {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const point = JSON.parse(raw) as Partial<UserPosition>;
      if (
        !isValidPoint(point.latitude, point.longitude) ||
        typeof point.at !== 'number' ||
        Date.now() - point.at > STORED_MAX_AGE_MS
      ) {
        return null;
      }
      return {
        latitude: point.latitude!,
        longitude: point.longitude!,
        accuracy: typeof point.accuracy === 'number' ? point.accuracy : null,
        at: point.at,
      };
    } catch {
      return null;
    }
  }
}
