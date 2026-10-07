import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientLayout } from '../../../shared/components/client-layout/client-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { Product } from '../../../shared/models/product';
import { ProductService } from '../../../shared/services/product.service';
import { CartService } from '../../../shared/services/cart.service';
import { LocalityService } from '../../../shared/services/locality.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [ClientLayout, PageHeader, SkeletonLoaderComponent, ErrorStateComponent, RouterLink],
  template: `
    <app-client-layout [showBottomNav]="false" [hasCustomFooter]="true">
      <!-- Fixed Header Slot -->
      <div slot="header" class="product-detail-header">
        <app-page-header title="" [backRoute]="backRoute" />

        <a
          routerLink="/client/boutique/panier"
          class="product-detail-header__cart-btn"
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
            <span class="product-detail-header__cart-badge">{{ cartService.cartCount() }}</span>
          }
        </a>
      </div>

      <!-- Main Content -->
      @if (loading()) {
        <div class="product-detail-page__loading">
          <app-skeleton-loader type="card" [count]="2" />
        </div>
      } @else if (error() || !product) {
        <div class="product-detail-page__error">
          <app-error-state [message]="error() || 'Produit introuvable.'" (retry)="loadProduct()" />
        </div>
      } @else {
        <div class="product-detail-page__content">
          <!-- Gallery -->
          <section class="product-detail-page__gallery">
            <div class="product-detail-page__main-image-wrap">
              <img
                [src]="selectedImage()"
                [alt]="product.title"
                class="product-detail-page__main-image"
              />
            </div>

            @if (product.images.length > 1) {
              <div class="product-detail-page__thumbnails">
                @for (img of product.images; track img) {
                  <button
                    type="button"
                    class="product-detail-page__thumb-btn"
                    [class.product-detail-page__thumb-btn--active]="selectedImage() === img"
                    (click)="selectedImage.set(img)"
                  >
                    <img [src]="img" [alt]="product.title" loading="lazy" />
                  </button>
                }
              </div>
            }
          </section>

          <!-- Product Summary -->
          <section class="product-detail-page__info">
            <span class="product-detail-page__brand">{{ product.brand }}</span>
            <h1 class="product-detail-page__title">{{ product.title }}</h1>
            <p class="product-detail-page__description">{{ product.description }}</p>

            <!-- Price Row -->
            <div class="product-detail-page__price-row">
              <strong class="product-detail-page__price">{{ formattedPrice }}</strong>
              @if (product.oldPrice) {
                <span class="product-detail-page__old-price">{{ formattedOldPrice }}</span>
              }
            </div>

            <div class="product-detail-page__divider"></div>

            <!-- Quantity Stepper & Stock Status -->
            <div class="product-detail-page__qty-row">
              <span class="product-detail-page__qty-label">Quantité</span>

              <div class="product-detail-page__stepper">
                <button
                  type="button"
                  class="product-detail-page__stepper-btn"
                  [disabled]="quantity() <= 1"
                  (click)="decreaseQty()"
                  aria-label="Diminuer"
                >
                  &minus;
                </button>
                <span class="product-detail-page__stepper-value">{{ quantity() }}</span>
                <button
                  type="button"
                  class="product-detail-page__stepper-btn"
                  (click)="increaseQty()"
                  aria-label="Augmenter"
                >
                  &#43;
                </button>
              </div>

              <span
                class="product-detail-page__stock-status"
                [class.product-detail-page__stock-status--out]="!availableHere()"
              >
                <span class="product-detail-page__stock-dot"></span>
                {{ availableHere() ? 'Disponible' : 'Indisponible' }} à
                {{ localityService.shopLocalityName() || 'votre localité' }}
              </span>
            </div>
          </section>
        </div>
      }

      <!-- Fixed Footer Slot -->
      @if (product && !loading()) {
        <div slot="footer" class="product-detail-page__fixed-footer">
          <button
            type="button"
            class="product-detail-page__add-btn"
            [disabled]="!availableHere()"
            (click)="addToCart()"
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
            <span>Ajouter au panier</span>
          </button>
        </div>
      }
    </app-client-layout>
  `,
  styleUrl: './product-detail-page.scss',
})
export class ProductDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  protected readonly cartService = inject(CartService);
  protected readonly localityService = inject(LocalityService);

  /** Retour vers « Tous les produits » si la fiche a été ouverte depuis cette page. */
  protected readonly backRoute =
    this.route.snapshot.queryParamMap.get('from') === 'catalogue'
      ? '/client/boutique/catalogue'
      : '/client/boutique';

  /** Le partenaire de la localité du compte a ce produit en stock. */
  protected readonly availableHere = computed(() => {
    const id = this.productId();
    return !!id && this.productService.isAvailableHere(id);
  });

  protected readonly productId = signal<string | null>(null);
  protected readonly fallbackProduct = signal<Product | null>(null);
  protected readonly liveProduct = computed(() => {
    const id = this.productId();
    if (!id) return this.fallbackProduct();
    const fromList = this.productService.products().find((p) => p.id === id);
    return fromList || this.fallbackProduct();
  });

  protected get product(): Product | null {
    return this.liveProduct();
  }

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedImage = signal('');
  protected readonly quantity = signal(1);

  ngOnInit(): void {
    this.loadProduct();
  }

  loadProduct(): void {
    this.loading.set(true);
    this.error.set(null);
    const id = this.route.snapshot.paramMap.get('id');
    this.productId.set(id);

    this.productService.getProductById(id).subscribe({
      next: (found) => {
        this.fallbackProduct.set(found);
        if (found) {
          this.selectedImage.set(found.images[0] || '');
        } else {
          this.error.set("Ce produit n'est pas disponible dans votre localité.");
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ProductDetailPage] Error loading product:', err);
        this.error.set('Impossible de charger le produit.');
        this.loading.set(false);
      },
    });
  }

  protected get formattedPrice(): string {
    return this.product ? `${this.product.price.toLocaleString('fr-FR')} FCFA` : '';
  }

  protected get formattedOldPrice(): string {
    return this.product?.oldPrice ? `${this.product.oldPrice.toLocaleString('fr-FR')} FCFA` : '';
  }

  protected decreaseQty(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected increaseQty(): void {
    this.quantity.update((q) => q + 1);
  }

  protected addToCart(): void {
    if (!this.product || !this.availableHere()) return;
    this.cartService.addToCart(this.product, this.quantity());
    this.router.navigate(['/client/boutique/panier']);
  }
}
