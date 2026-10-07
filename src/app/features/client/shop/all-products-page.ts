import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientLayout } from '../../../shared/components/client-layout/client-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SearchBar } from '../../../shared/components/search-bar/search-bar';
import { ProductCard } from '../../../shared/components/product-card/product-card';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { ProductService } from '../../../shared/services/product.service';
import { CartService } from '../../../shared/services/cart.service';
import { LocalityService } from '../../../shared/services/locality.service';
import { CategoryStrip } from '../../../shared/components/category-strip/category-strip';

/**
 * Tous les produits de la boutique (localité du compte) : recherche, catégories et affichage progressif
 * par 10 au fil du défilement. Recherche et catégorie sont partagées avec l'accueil de la boutique.
 */
@Component({
  selector: 'app-all-products-page',
  imports: [
    ClientLayout,
    PageHeader,
    SearchBar,
    ProductCard,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    RouterLink,
    CategoryStrip,
  ],
  template: `
    <app-client-layout activeNav="shop" [hasHeaderSlot]="true">
      <div slot="header" class="catalog-header">
        <app-page-header
          title="Tous les produits"
          [subtitle]="subtitle()"
          backRoute="/client/boutique"
        />
        <a
          routerLink="/client/boutique/panier"
          class="catalog-header__cart"
          aria-label="Mon panier"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          @if (cartService.cartCount() > 0) {
            <span class="catalog-header__badge">{{ cartService.cartCount() }}</span>
          }
        </a>
      </div>

      <div class="catalog">
        @if (shopClosed()) {
          <app-empty-state
            icon="shop"
            title="La boutique n'est pas disponible dans votre localité"
            description="Retrouvez les informations sur la page d'accueil de la boutique."
            actionLabel="Retour à la boutique"
            actionRoute="/client/boutique"
          />
        } @else {
          <div class="catalog__search">
            <app-search-bar
              placeholder="Rechercher un produit, une marque…"
              [value]="productService.searchQuery()"
              (valueChange)="productService.searchQuery.set($event)"
            />
          </div>

          @if (productService.categories().length > 0) {
            <app-category-strip
              class="catalog__categories"
              [categories]="productService.categories()"
              [selected]="productService.selectedCategory()"
              (toggle)="productService.toggleCategory($event)"
            />
          }

          @if (productService.loading()) {
            <app-skeleton-loader type="product" [count]="6" />
          } @else if (productService.error()) {
            <app-error-state
              [message]="productService.error()!"
              (retry)="productService.loadAll(true)"
            />
          } @else if (allProducts().length === 0) {
            <app-empty-state
              icon="search"
              [title]="isFiltered() ? 'Aucun produit trouvé' : 'Aucun produit pour le moment'"
              [description]="
                isFiltered()
                  ? 'Aucun article ne correspond à votre recherche.'
                  : 'Les produits de votre localité arrivent bientôt.'
              "
              [actionLabel]="isFiltered() ? 'Réinitialiser les filtres' : undefined"
              (action)="resetFilters()"
            />
          } @else {
            <div class="catalog__summary">
              <span>
                <strong>{{ allProducts().length }}</strong>
                {{ allProducts().length > 1 ? 'produits' : 'produit' }}
              </span>
              @if (isFiltered()) {
                <button type="button" class="catalog__reset" (click)="resetFilters()">
                  Réinitialiser
                </button>
              }
            </div>

            <div class="catalog__grid">
              @for (product of displayedProducts(); track product.id) {
                <app-product-card [product]="product" from="catalogue" />
              }
            </div>

            <!-- Affichage progressif : 10 produits de plus à l'approche du bas de la page -->
            <div #sentinel class="catalog__sentinel">
              @if (hasMore()) {
                <div class="catalog__loading">
                  <span class="catalog__spinner" aria-hidden="true"></span>
                  <span>Chargement d'autres produits…</span>
                </div>
              } @else {
                <p class="catalog__end">Vous avez vu tous les produits disponibles</p>
              }
            </div>
          }
        }
      </div>
    </app-client-layout>
  `,
  styleUrl: './all-products-page.scss',
})
export class AllProductsPage implements OnDestroy {
  protected readonly productService = inject(ProductService);
  protected readonly cartService = inject(CartService);
  private readonly localityService = inject(LocalityService);

  protected readonly pageSize = 10;
  private readonly limit = signal(this.pageSize);
  private observer?: IntersectionObserver;
  private sentinelEl?: HTMLElement;
  private loadingMore = false;

  protected readonly allProducts = computed(() => this.productService.filteredProducts());
  protected readonly displayedProducts = computed(() => this.allProducts().slice(0, this.limit()));
  protected readonly hasMore = computed(() => this.limit() < this.allProducts().length);

  protected readonly isFiltered = computed(
    () => !!this.productService.selectedCategory() || !!this.productService.searchQuery().trim(),
  );

  protected readonly subtitle = computed(() => {
    const name = this.localityService.shopLocalityName();
    return name ? `Livraison à ${name}` : undefined;
  });

  /** Compte sans localité, ou localité sans partenaire : rien à afficher ici. */
  protected readonly shopClosed = computed(() => {
    if (this.localityService.shopLocalityId() === null) return true;
    const locality = this.localityService.shopLocality();
    return !!locality && !locality.shopAvailable;
  });

  /** Le repère du bas de liste apparaît et disparaît avec la liste : on l'observe à chaque fois. */
  @ViewChild('sentinel')
  set sentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.sentinelEl = ref?.nativeElement;
    this.observe();
  }

  constructor() {
    void this.localityService.loadLocalities();
    if (!this.localityService.account()) {
      void this.localityService.loadAccount();
    }
    this.productService.loadAll();
    // Nouvelle recherche ou catégorie : on repart des 10 premiers
    effect(() => {
      this.productService.searchQuery();
      this.productService.selectedCategory();
      this.limit.set(this.pageSize);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected resetFilters(): void {
    this.productService.selectedCategory.set(null);
    this.productService.searchQuery.set('');
  }

  private observe(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    this.observer?.disconnect();
    if (!this.sentinelEl) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.loadMore();
      },
      { rootMargin: '300px' },
    );
    this.observer.observe(this.sentinelEl);
  }

  private loadMore(): void {
    if (!this.hasMore() || this.loadingMore) return;
    this.loadingMore = true;
    setTimeout(() => {
      this.limit.update((n) => n + this.pageSize);
      this.loadingMore = false;
      // Écran encore incomplet (grand écran) : la nouvelle observation relance le chargement
      requestAnimationFrame(() => this.observe());
    }, 250);
  }
}
