import { CartItem } from './product';

export type OrderStatus = 'en_attente' | 'en_cours' | 'livre' | 'annule';
export type OrderType = 'whatsapp' | 'call';

export interface Order {
  readonly id: string;
  readonly orderNumber: string; // e.g. CMD-2026-001
  readonly items: readonly CartItem[];
  readonly subtotal: number;
  readonly deliveryFee: number;
  readonly totalPrice: number;
  readonly status: OrderStatus;
  readonly orderType: OrderType;
  readonly createdAt: string;
  readonly customerName?: string;
  readonly customerPhone?: string;
  readonly deliveryAddress?: string;
  readonly deliveryDistrict?: string;
  readonly notes?: string;
  /** Lien WhatsApp pré-rempli renvoyé par le backend au moment du checkout. */
  readonly whatsAppUrl?: string;
  /** Localité de livraison (son nom est dans deliveryDistrict). */
  readonly localityId?: number;
  /** À envoyer avant confirmation : part SansFile + frais de livraison. */
  readonly upfrontAmount?: number;
  /** À payer au livreur du partenaire à la réception. */
  readonly partnerAmount?: number;
  readonly courierName?: string;
  readonly courierPhone?: string;
  // Réservé à l'administration (jamais renvoyé aux clients)
  readonly partnerId?: number;
  readonly partnerName?: string;
  readonly partnerPhone?: string;
  readonly courierPaid?: boolean;
  readonly deliveryLatitude?: number;
  readonly deliveryLongitude?: number;
  /** Articles retirés du stock du partenaire (acompte reçu). */
  readonly stockDeducted?: boolean;
  /** Lien de la facture envoyée au partenaire. */
  readonly invoiceToken?: string;
}

/** Devis du panier dans une localité (POST /api/orders/quote). */
export interface OrderQuote {
  readonly localityId: number;
  readonly localityName: string;
  readonly shopAvailable: boolean;
  readonly subtotal: number;
  readonly deliveryFee: number;
  readonly totalPrice: number;
  readonly upfrontAmount: number;
  readonly partnerAmount: number;
  readonly unavailableProductIds: readonly number[];
  /** Articles demandés en plus grande quantité que le stock du partenaire. */
  readonly stockShortages?: readonly { readonly productId: number; readonly remaining: number }[];
}

/** Champs de répartition communs aux réponses commande (client et admin). */
export function mapOrderSplit(o: any): Partial<Order> {
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : Number(v));
  return {
    localityId: num(o.localityId),
    upfrontAmount: num(o.upfrontAmount),
    partnerAmount: num(o.partnerAmount),
    courierName: o.courierName || undefined,
    courierPhone: o.courierPhone || undefined,
    partnerId: num(o.partnerId),
    partnerName: o.partnerName || undefined,
    partnerPhone: o.partnerPhone || undefined,
    courierPaid: typeof o.courierPaid === 'boolean' ? o.courierPaid : undefined,
    deliveryLatitude: num(o.deliveryLatitude),
    deliveryLongitude: num(o.deliveryLongitude),
    stockDeducted: typeof o.stockDeducted === 'boolean' ? o.stockDeducted : undefined,
    invoiceToken: o.invoiceToken || undefined,
  };
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  livre: 'Livrée',
  annule: 'Annulée',
};
