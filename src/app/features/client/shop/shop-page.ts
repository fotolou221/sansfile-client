import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientLayout } from '../../../shared/components/client-layout/client-layout';
import { SearchBar } from '../../../shared/components/search-bar/search-bar';
import { ProductCard } from '../../../shared/components/product-card/product-card';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { ProductService } from '../../../shared/services/product.service';
import { CartService } from '../../../shared/services/cart.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { LocalityService } from '../../../shared/services/locality.service';
import { CategoryStrip } from '../../../shared/components/category-strip/category-strip';

@Component({
  selector: 'app-shop-page',
  imports: [
    ClientLayout,
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
      <!-- Fixed Header Slot -->
      <header slot="header" class="shop-header">
        <h1 class="shop-header__title">SansFile Boutique</h1>

        <!-- Header Actions: Notification Bell + Cart Button -->
        <div class="shop-header__actions">
          <!-- Notification Bell Button -->
          <button
            type="button"
            class="shop-header__icon-btn"
            (click)="goToNotifications()"
            aria-label="Notifications"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            @if (notificationService.unreadCount() > 0) {
              <span class="shop-header__notif-badge">{{
                notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount()
              }}</span>
            }
          </button>

          <!-- Cart button with badge count -->
          <a
            routerLink="/client/boutique/panier"
            class="shop-header__cart-btn"
            aria-label="Mon Panier"
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
              <span class="shop-header__cart-badge">{{ cartService.cartCount() }}</span>
            }
          </a>
        </div>
      </header>

      <!-- Main Content -->
      <div class="shop-page__content">
        <!-- La boutique montre ce que le partenaire de la localité du compte a en stock -->
        @if (shopClosedMessage(); as closed) {
          <app-empty-state
            icon="shop"
            [title]="closed.title"
            [description]="closed.description"
            [actionLabel]="closed.action"
            (action)="changeAccountLocality()"
          />
        } @else {
          <!-- Search Input -->
          <div class="shop-page__search">
            <app-search-bar
              placeholder="Rechercher un produit, marque..."
              [value]="productService.searchQuery()"
              (valueChange)="productService.searchQuery.set($event)"
            />
          </div>

          <!-- Categories Section -->
          @if (productService.categories().length > 0) {
            <section class="shop-page__categories-section">
              <h2 class="shop-page__section-title">Catégories</h2>
              <app-category-strip
                [categories]="productService.categories()"
                [selected]="productService.selectedCategory()"
                (toggle)="productService.toggleCategory($event)"
              />
            </section>
          }

          <!-- Products Grid Section -->
          <section class="shop-page__products-section">
            <div class="shop-page__section-header">
              <h2 class="shop-page__section-title">Produits disponibles</h2>
              <div class="shop-page__section-actions">
                @if (productService.selectedCategory()) {
                  <button
                    type="button"
                    class="shop-page__reset-filter"
                    (click)="productService.selectedCategory.set(null)"
                  >
                    Réinitialiser
                  </button>
                }
                @if (!productService.loading() && allProducts().length > 0) {
                  <a routerLink="/client/boutique/catalogue" class="shop-page__see-all">
                    Voir tout
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                }
              </div>
            </div>

            @if (productService.loading()) {
              <app-skeleton-loader type="product" [count]="6" />
            } @else if (productService.error()) {
              <app-error-state
                [message]="productService.error()!"
                (retry)="productService.loadAll()"
              />
            } @else {
              <div class="shop-page__products-grid">
                @for (product of displayedProducts(); track product.id) {
                  <app-product-card [product]="product" />
                }
              </div>

              @if (productService.filteredProducts().length === 0) {
                <app-empty-state
                  icon="shop"
                  [title]="emptyTitle()"
                  [description]="emptyDescription()"
                  [actionLabel]="emptyActionLabel()"
                  (action)="resetFilters()"
                />
              }

              <!-- Aperçu limité : la suite sur « Tous les produits » -->
              @if (hiddenCount() > 0) {
                <a routerLink="/client/boutique/catalogue" class="shop-page__see-all-cta">
                  Voir les {{ allProducts().length }} produits
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              }
            }
          </section>
        }
      </div>
    </app-client-layout>
  `,
  styleUrl: './shop-page.scss',
})
export class ShopPage {
  private readonly router = inject(Router);
  protected readonly productService = inject(ProductService);
  protected readonly cartService = inject(CartService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly localityService = inject(LocalityService);

  /** Accueil de la boutique : un aperçu, le reste sur la page « Tous les produits ». */
  protected readonly previewSize = 10;

  protected readonly allProducts = computed(() => this.productService.filteredProducts());

  protected readonly displayedProducts = computed(() =>
    this.allProducts().slice(0, this.previewSize),
  );

  protected readonly hiddenCount = computed(() =>
    Math.max(0, this.allProducts().length - this.previewSize),
  );

  constructor() {
    void this.localityService.loadLocalities(true);
    if (!this.localityService.account()) {
      void this.localityService.loadAccount();
    }
  }

  /** Boutique fermée : compte sans localité, ou pas de partenaire dans sa localité. */
  protected readonly shopClosedMessage = computed<{
    title: string;
    description: string;
    action?: string;
  } | null>(() => {
    const localityId = this.localityService.shopLocalityId();
    if (localityId === null) {
      const requested = this.localityService.account()?.requestedLocality;
      return requested
        ? {
            title: `La boutique n'est pas encore disponible à ${requested}`,
            description: 'Elle ouvrira dès qu’un partenaire SansFile y sera installé.',
            action: 'Changer ma localité',
          }
        : {
            title: 'Choisissez votre localité',
            description: 'La boutique vous montre les produits livrables dans votre localité.',
            action: 'Choisir ma localité',
          };
    }
    const locality = this.localityService.shopLocality();
    if (locality && !locality.shopAvailable) {
      return {
        title: `La boutique n'est pas encore disponible à ${locality.name}`,
        description:
          'Elle ouvrira dès qu’un partenaire SansFile y sera installé. Revenez bientôt !',
      };
    }
    return null;
  });

  /** La boutique suit la localité du compte : en changer passe par « Ma localité ». */
  protected changeAccountLocality(): void {
    void this.router.navigate(['/ma-localite'], {
      queryParams: { changer: 1, redirect: '/client/boutique' },
    });
  }

  protected readonly emptyTitle = computed(() => {
    return this.productService.products().length === 0
      ? "Boutique en cours d'approvisionnement"
      : 'Aucun produit trouvé';
  });

  protected readonly emptyDescription = computed(() => {
    return this.productService.products().length === 0
      ? 'Les produits et matériels de coiffure professionnels seront bientôt disponibles.'
      : 'Aucun article ne correspond à votre recherche.';
  });

  protected readonly emptyActionLabel = computed(() => {
    return this.productService.selectedCategory() || this.productService.searchQuery()
      ? 'Réinitialiser les filtres'
      : undefined;
  });

  protected resetFilters(): void {
    this.productService.selectedCategory.set(null);
    this.productService.searchQuery.set('');
  }

  protected goToNotifications(): void {
    this.router.navigate(['/client/notifications']);
  }
}
