import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';

export interface AdminLocality {
  id: number;
  name: string;
  active: boolean;
  /** Frais de livraison facturés au client, payés par SansFile au livreur du partenaire. */
  deliveryFee: number;
  partnerId: number | null;
  partnerName: string | null;
  partnerActive: boolean;
  salonsCount: number;
  usersCount: number;
  agentsCount: number;
  ordersCount: number;
  createdDate: string | null;
}

export interface LocalityFormValue {
  name: string;
  deliveryFee: number | null;
  active: boolean;
}

/** Zone demandée par des utilisateurs dont la localité n'existe pas encore. */
export interface RequestedZone {
  name: string;
  count: number;
}

export interface AdminPartner {
  id: number;
  name: string;
  managerName: string | null;
  phone: string;
  address: string | null;
  localityId: number;
  localityName: string;
  active: boolean;
  courierName: string | null;
  courierPhone: string | null;
  notes: string | null;
  availableProducts: number;
  createdDate: string | null;
}

export interface PartnerFormValue {
  name: string;
  managerName: string;
  phone: string;
  address: string;
  localityId: number | null;
  courierName: string;
  courierPhone: string;
  notes: string;
}

/** Produit du catalogue vu depuis un partenaire : son offre, son stock et la part SansFile. */
export interface PartnerProductRow {
  productId: number;
  title: string;
  brand: string | null;
  image: string | null;
  salePrice: number;
  productInStock: boolean;
  offered: boolean;
  wholesalePrice: number | null;
  available: boolean;
  margin: number | null;
  /** Quantité en stock chez le partenaire : à zéro, le produit n'est plus en vente dans sa localité. */
  stockQuantity: number;
}

/** Localités et partenaires boutique (console d'administration). */
@Injectable({ providedIn: 'root' })
export class AdminLocalitiesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_CONFIG.baseUrl}/admin`;

  readonly localities = signal<AdminLocality[]>([]);
  readonly partners = signal<AdminPartner[]>([]);
  readonly localitiesLoaded = signal(false);
  readonly partnersLoaded = signal(false);

  private readonly namesById = computed(
    () => new Map(this.localities().map((l) => [l.id, l.name])),
  );

  /** Localités actives, pour les listes de choix (salons, agents, commandes, partenaires). */
  readonly activeLocalities = computed(() => this.localities().filter((l) => l.active));

  localityName(id: number | null | undefined): string | null {
    if (id === null || id === undefined) return null;
    return this.namesById().get(id) ?? null;
  }

  // ── Localités ───────────────────────────────────────────────

  loadLocalities(): Observable<AdminLocality[]> {
    return this.http.get<AdminLocality[]>(`${this.baseUrl}/localities`).pipe(
      tap((list) => {
        this.localities.set(list);
        this.localitiesLoaded.set(true);
      }),
    );
  }

  /** Charge les localités si ce n'est pas déjà fait (pages qui en ont besoin pour leurs listes). */
  ensureLocalities(): void {
    if (!this.localitiesLoaded()) {
      this.loadLocalities().subscribe({ error: () => {} });
    }
  }

  createLocality(form: LocalityFormValue): Observable<AdminLocality> {
    return this.http
      .post<AdminLocality>(`${this.baseUrl}/localities`, this.cleanLocality(form))
      .pipe(tap((created) => this.localities.update((list) => sortByName([...list, created]))));
  }

  updateLocality(id: number, form: LocalityFormValue): Observable<AdminLocality> {
    return this.http
      .put<AdminLocality>(`${this.baseUrl}/localities/${id}`, this.cleanLocality(form))
      .pipe(tap((updated) => this.replaceLocality(updated)));
  }

  setLocalityActive(id: number, active: boolean): Observable<AdminLocality> {
    return this.http
      .put<AdminLocality>(`${this.baseUrl}/localities/${id}/activation`, { active })
      .pipe(tap((updated) => this.replaceLocality(updated)));
  }

  deleteLocality(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/localities/${id}`)
      .pipe(tap(() => this.localities.update((list) => list.filter((l) => l.id !== id))));
  }

  requestedZones(): Observable<RequestedZone[]> {
    return this.http.get<RequestedZone[]>(`${this.baseUrl}/localities/requested`);
  }

  // ── Partenaires ─────────────────────────────────────────────

  loadPartners(): Observable<AdminPartner[]> {
    return this.http.get<AdminPartner[]>(`${this.baseUrl}/partners`).pipe(
      tap((list) => {
        this.partners.set(list);
        this.partnersLoaded.set(true);
      }),
    );
  }

  getPartner(id: number): Observable<AdminPartner> {
    return this.http
      .get<AdminPartner>(`${this.baseUrl}/partners/${id}`)
      .pipe(tap((partner) => this.replacePartner(partner)));
  }

  createPartner(form: PartnerFormValue): Observable<AdminPartner> {
    return this.http.post<AdminPartner>(`${this.baseUrl}/partners`, this.cleanPartner(form)).pipe(
      tap((created) => {
        this.partners.update((list) => sortByName([...list, created]));
        this.refreshLocalitiesQuietly();
      }),
    );
  }

  updatePartner(id: number, form: PartnerFormValue): Observable<AdminPartner> {
    return this.http
      .put<AdminPartner>(`${this.baseUrl}/partners/${id}`, this.cleanPartner(form))
      .pipe(
        tap((updated) => {
          this.replacePartner(updated);
          this.refreshLocalitiesQuietly();
        }),
      );
  }

  setPartnerActive(id: number, active: boolean): Observable<AdminPartner> {
    return this.http
      .put<AdminPartner>(`${this.baseUrl}/partners/${id}/activation`, { active })
      .pipe(
        tap((updated) => {
          this.replacePartner(updated);
          this.refreshLocalitiesQuietly();
        }),
      );
  }

  deletePartner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/partners/${id}`).pipe(
      tap(() => {
        this.partners.update((list) => list.filter((p) => p.id !== id));
        this.refreshLocalitiesQuietly();
      }),
    );
  }

  partnerProducts(partnerId: number): Observable<PartnerProductRow[]> {
    return this.http.get<PartnerProductRow[]>(`${this.baseUrl}/partners/${partnerId}/products`);
  }

  saveOffer(
    partnerId: number,
    productId: number,
    offer: { wholesalePrice: number; available: boolean; stockQuantity: number },
  ): Observable<PartnerProductRow> {
    return this.http.put<PartnerProductRow>(
      `${this.baseUrl}/partners/${partnerId}/products/${productId}`,
      offer,
    );
  }

  removeOffer(partnerId: number, productId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/partners/${partnerId}/products/${productId}`);
  }

  // ── Interne ─────────────────────────────────────────────────

  private refreshLocalitiesQuietly(): void {
    this.loadLocalities().subscribe({ error: () => {} });
  }

  private replaceLocality(updated: AdminLocality): void {
    this.localities.update((list) =>
      sortByName(list.map((l) => (l.id === updated.id ? updated : l))),
    );
  }

  private replacePartner(updated: AdminPartner): void {
    this.partners.update((list) =>
      list.some((p) => p.id === updated.id)
        ? list.map((p) => (p.id === updated.id ? updated : p))
        : sortByName([...list, updated]),
    );
  }

  private cleanLocality(form: LocalityFormValue) {
    return {
      name: form.name.trim(),
      deliveryFee:
        form.deliveryFee === null || form.deliveryFee === undefined
          ? null
          : Math.max(0, Math.round(Number(form.deliveryFee))),
      active: form.active,
    };
  }

  private cleanPartner(form: PartnerFormValue) {
    return {
      name: form.name.trim(),
      managerName: form.managerName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      localityId: form.localityId,
      courierName: form.courierName.trim(),
      courierPhone: form.courierPhone.trim(),
      notes: form.notes.trim(),
    };
  }
}

function sortByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
