/** Localité proposée aux clients (GET /api/public/localities). */
export interface Locality {
  readonly id: number;
  readonly name: string;
  /** Frais de livraison de la boutique dans cette localité (FCFA). */
  readonly deliveryFee: number;
  /** La boutique y est ouverte (un partenaire actif fournit les produits). */
  readonly shopAvailable: boolean;
}

/**
 * Localité du compte connecté (GET /api/account/locality).
 * source : SALON (coiffeur, celle de son salon), USER (choisie), NONE (à choisir / zone demandée).
 */
export interface AccountLocality {
  readonly localityId: number | null;
  readonly localityName: string | null;
  readonly deliveryFee: number | null;
  readonly shopAvailable: boolean;
  readonly requestedLocality: string | null;
  readonly source: 'SALON' | 'USER' | 'NONE';
  /** Le choix a été fait (localité ou zone demandée) : la page de choix n'est plus imposée. */
  readonly chosen: boolean;
}

/** Zone regardée dans l'application : une localité, ou toutes. */
export type ViewedLocality = number | 'all';
