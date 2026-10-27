import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';
import { distanceKm, GeoPoint } from '../utils/geo';
import { UserPositionService } from './user-position.service';

/** Boutique la plus proche du téléphone (GET /api/public/shop/nearest), sans l'identité du partenaire. */
export interface NearestShop {
  /** Une boutique est à portée de livraison. */
  readonly available: boolean;
  /** Identifiant de la boutique (comparé aux événements temps réel SHOP_UPDATED). */
  readonly shopId: number | null;
  readonly deliveryFee: number;
  readonly distanceKm: number | null;
}

/** Déplacement au-delà duquel on recherche à nouveau la boutique la plus proche. */
const MOVE_THRESHOLD_KM = 0.5;

/**
 * Boutique servie au client : celle du partenaire le plus proche de la position du téléphone, dans le rayon de
 * livraison. Elle suit la position (et ses frais de livraison avec elle) ; le serveur applique la même règle aux
 * produits, au devis et à la commande.
 */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);
  private readonly positions = inject(UserPositionService);

  /** null : pas encore cherchée (position inconnue ou recherche en cours). */
  readonly shop = signal<NearestShop | null>(null);
  readonly loading = signal(false);

  readonly shopId = computed(() => {
    const shop = this.shop();
    return shop?.available ? shop.shopId : null;
  });
  readonly deliveryFee = computed(() => this.shop()?.deliveryFee ?? 0);

  private searchedFrom: GeoPoint | null = null;

  constructor() {
    effect(() => {
      const here = this.positions.position();
      untracked(() => {
        if (!here) {
          this.shop.set(null);
          this.searchedFrom = null;
        } else if (!this.searchedFrom || distanceKm(this.searchedFrom, here) > MOVE_THRESHOLD_KM) {
          void this.refresh();
        }
      });
    });
  }

  /** Recherche la boutique la plus proche de la position actuelle (après un changement côté admin, par exemple). */
  async refresh(): Promise<void> {
    const here = this.positions.position();
    if (!here) return;
    this.loading.set(true);
    try {
      const shop = await firstValueFrom(
        this.http.get<NearestShop>(`${API_CONFIG.baseUrl}/public/shop/nearest`, {
          params: { latitude: here.latitude, longitude: here.longitude },
        }),
      );
      // Position changée pendant la recherche : la suivante l'emporte
      if (this.positions.position() !== here) return;
      this.searchedFrom = here;
      this.shop.set({
        available: shop.available === true,
        shopId: shop.shopId ?? null,
        deliveryFee: Number(shop.deliveryFee) || 0,
        distanceKm: typeof shop.distanceKm === 'number' ? shop.distanceKm : null,
      });
    } catch (err) {
      console.warn('[ShopService] Boutique la plus proche indisponible :', err);
    } finally {
      this.loading.set(false);
    }
  }

  /** Paramètres de position pour les appels de la boutique (produits, devis). */
  positionParams(): { latitude: number; longitude: number } | null {
    const here = this.positions.position();
    return here ? { latitude: here.latitude, longitude: here.longitude } : null;
  }
}
