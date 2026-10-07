import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map, finalize } from 'rxjs';
import { Product, ProductCategory } from '../models/product';
import { API_CONFIG } from '../../core/config/api.config';
import { HttpErrorMessageService } from './http-error-message.service';
import { LocalityService } from './locality.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly localityService = inject(LocalityService);
  private readonly baseUrl = API_CONFIG.baseUrl;

  // ── State Signals ───────────────────────────────────────────
  readonly products = signal<readonly Product[]>([]);
  readonly categories = signal<readonly ProductCategory[]>([]);
  readonly loading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ── Cache Strategy (SWR - 5 min TTL) ────────────────────────
  private lastProductsFetchedAt: number | null = null;
  private lastCategoriesFetchedAt: number | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string | null>(null);

  // ── Computed Filtered List ──────────────────────────────────
  readonly filteredProducts = computed(() => {
    const list = this.products();
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return list.filter((p) => {
      const matchesCategory = category ? p.categoryId === category : true;
      const matchesQuery = query
        ? p.title.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        : true;
      return matchesCategory && matchesQuery;
    });
  });

  /** Localité dont les produits sont chargés (undefined : rien de chargé encore). */
  private loadedLocalityId: number | null | undefined = undefined;

  constructor() {
    this.loadCategories();
    // La boutique suit la localité du compte
    effect(() => {
      const localityId = this.localityService.shopLocalityId();
      untracked(() => this.loadProducts(localityId !== this.loadedLocalityId));
    });
  }

  loadAll(forceRefresh: boolean = false): void {
    this.loadCategories(forceRefresh);
    this.loadProducts(forceRefresh);
  }

  /**
   * Produits commandables dans la localité du compte : ceux que son partenaire a en stock (le serveur
   * impose cette localité). Sans localité (compte sans localité ouverte), la boutique est vide.
   */
  loadProducts(forceRefresh: boolean = false): void {
    const localityId = this.localityService.shopLocalityId();
    if (localityId === null) {
      this.products.set([]);
      this.loadedLocalityId = null;
      this.lastProductsFetchedAt = null;
      this.loading.set(false);
      this.isRefreshing.set(false);
      return;
    }

    const now = Date.now();
    const hasData = this.products().length > 0 && this.loadedLocalityId === localityId;
    const isCacheValid =
      this.lastProductsFetchedAt !== null && now - this.lastProductsFetchedAt < this.CACHE_TTL_MS;

    if (hasData && isCacheValid && !forceRefresh) {
      return;
    }

    if (hasData) {
      this.isRefreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    this.http
      .get<any[]>(`${this.baseUrl}${API_CONFIG.endpoints.products}`, {
        params: { page: 0, size: 500 },
      })
      .pipe(
        map((items) => (Array.isArray(items) ? items : []).map((p) => this.mapApiProduct(p))),
        tap((items) => {
          // Réponse arrivée après un changement de localité : on l'ignore
          if (this.localityService.shopLocalityId() !== localityId) return;
          this.products.set(items);
          this.loadedLocalityId = localityId;
          this.lastProductsFetchedAt = Date.now();
        }),
        catchError((err) => {
          console.error('[ProductService] Error loading products:', err);
          this.error.set(
            this.errorMessages.message(
              err,
              'Impossible de charger les produits de la boutique. Verifiez votre connexion.',
            ),
          );
          return of([]);
        }),
        finalize(() => {
          this.loading.set(false);
          this.isRefreshing.set(false);
        }),
      )
      .subscribe();
  }

  loadCategories(forceRefresh: boolean = false): void {
    const now = Date.now();
    const hasData = this.categories().length > 0;
    const isCacheValid =
      this.lastCategoriesFetchedAt !== null &&
      now - this.lastCategoriesFetchedAt < this.CACHE_TTL_MS;

    if (hasData && isCacheValid && !forceRefresh) {
      return;
    }

    this.http
      .get<any[]>(`${this.baseUrl}${API_CONFIG.endpoints.categories}`)
      .pipe(
        map((cats) => (Array.isArray(cats) ? cats : []).map((c) => this.mapApiCategory(c))),
        tap((cats) => {
          this.categories.set(cats);
          this.lastCategoriesFetchedAt = Date.now();
        }),
        catchError((err) => {
          console.error('[ProductService] Error loading categories:', err);
          this.error.set(
            this.errorMessages.message(err, 'Impossible de charger les categories de la boutique.'),
          );
          return of([]);
        }),
      )
      .subscribe();
  }

  getProductById(id: string | null): Observable<Product | null> {
    if (!id) return of(null);
    return this.http.get<any>(`${this.baseUrl}${API_CONFIG.endpoints.products}/${id}`).pipe(
      map((p) => this.mapApiProduct(p)),
      catchError((err) => {
        // Produit absent de la boutique de la localité du compte : simplement introuvable
        if (err?.status === 404) return of(null);
        console.error(`[ProductService] Error loading product ${id}:`, err);
        this.error.set(this.errorMessages.message(err, 'Impossible de charger ce produit.'));
        return of(this.products().find((p) => p.id === id) || null);
      }),
    );
  }

  mapApiProduct(p: any): Product {
    const catId =
      p.category?.slug ||
      (typeof p.category === 'string' ? p.category : p.categoryId || 'tondeuses');
    return {
      id: p.id ? p.id.toString() : `prod-${Date.now()}`,
      brand: p.brand || 'SansFile',
      title: p.title || '',
      description: p.description || '',
      price: Number(p.price) || 0,
      oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
      rating: p.rating || 4.8,
      categoryId: catId,
      images:
        Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : [
              p.category?.image ||
                'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80',
            ],
      inStock: p.inStock !== false,
    };
  }

  /** Produit en vente dans la localité du compte ? */
  isAvailableHere(productId: string): boolean {
    return this.products().some((p) => p.id === productId);
  }

  upsertProduct(dto: any): void {
    if (!dto) return;
    const mapped = this.mapApiProduct(dto);
    // Boutique d'une localité : un produit absent de chez son partenaire n'y est pas ajouté
    if (!this.isAvailableHere(mapped.id)) {
      this.loadProducts(true);
      return;
    }
    this.products.update((prev) => {
      const exists = prev.some((p) => p.id === mapped.id);
      if (exists) {
        return prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p));
      }
      return [mapped, ...prev];
    });
  }

  removeProduct(id: string | number): void {
    if (!id) return;
    const targetId = id.toString();
    this.products.update((prev) => prev.filter((p) => p.id !== targetId));
  }

  mapApiCategory(c: any): ProductCategory {
    return {
      id: c.slug || c.id?.toString() || 'cat',
      name: c.name || '',
      image:
        c.image ||
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80',
    };
  }

  upsertCategory(dto: any): void {
    if (!dto) return;
    const mapped = this.mapApiCategory(dto);
    this.categories.update((prev) => {
      const exists = prev.some((c) => c.id === mapped.id);
      if (exists) {
        return prev.map((c) => (c.id === mapped.id ? mapped : c));
      }
      return [...prev, mapped];
    });
  }

  removeCategory(id: string | number): void {
    if (!id) return;
    const targetId = id.toString();
    this.categories.update((prev) => prev.filter((c) => c.id !== targetId));
  }

  toggleCategory(catId: string): void {
    if (this.selectedCategory() === catId) {
      this.selectedCategory.set(null);
    } else {
      this.selectedCategory.set(catId);
    }
  }
}
