import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClientLayout } from '../../../shared/components/client-layout/client-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PositionRequired } from '../../../shared/components/position-required/position-required';
import { CartService } from '../../../shared/services/cart.service';
import { ShopService } from '../../../shared/services/shop.service';
import { UserPositionService } from '../../../shared/services/user-position.service';

@Component({
  selector: 'app-cart-page',
  imports: [ClientLayout, PageHeader, EmptyStateComponent, PositionRequired],
  template: `
    <app-client-layout [showBottomNav]="false" [hasCustomFooter]="true">
      <!-- Fixed Header Slot -->
      <div slot="header" class="cart-header">
        <app-page-header title="Mon panier" backRoute="/client/boutique" />

        @if (cartService.cartItems().length > 0) {
          <button
            type="button"
            class="cart-header__clear-btn"
            (click)="clearCart()"
            aria-label="Vider le panier"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        }
      </div>

      <!-- Main Content -->
      <div class="cart-page__content">
        @if (cartService.cartItems().length > 0 && !positions.ready()) {
          <app-position-required
            title="Où faut-il vous livrer ?"
            text="Autorisez votre position : la boutique la plus proche de chez vous prépare et livre votre commande."
          />
        }
        @if (cartService.cartItems().length > 0) {
          <!-- Cart Items List -->
          <div class="cart-page__list">
            @for (item of cartService.cartItems(); track item.product.id) {
              <div class="cart-item-card">
                <img
                  [src]="item.product.images[0]"
                  [alt]="item.product.title"
                  class="cart-item-card__image"
                />

                <div class="cart-item-card__details">
                  <strong class="cart-item-card__title">{{ item.product.title }}</strong>
                  <span class="cart-item-card__price"
                    >{{ formatPrice(item.product.price) }} FCFA</span
                  >
                  @if (isUnavailable(item.product.id)) {
                    <span class="cart-item-card__unavailable">Indisponible près de chez vous</span>
                  }

                  <div class="cart-item-card__stepper">
                    <button
                      type="button"
                      class="cart-item-card__stepper-btn"
                      (click)="cartService.updateQuantity(item.product.id, -1)"
                    >
                      &minus;
                    </button>
                    <span class="cart-item-card__stepper-qty">{{ item.quantity }}</span>
                    <button
                      type="button"
                      class="cart-item-card__stepper-btn"
                      (click)="cartService.updateQuantity(item.product.id, 1)"
                    >
                      &#43;
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  class="cart-item-card__remove-btn"
                  (click)="cartService.removeFromCart(item.product.id)"
                  [attr.aria-label]="'Supprimer ' + item.product.title"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            }
          </div>
        } @else {
          <app-empty-state
            icon="cart"
            title="Votre panier est vide"
            description="Explorez notre boutique pour commander vos produits de coiffure professionnels."
            actionLabel="Découvrir la boutique"
            actionRoute="/client/boutique"
          />
        }
      </div>

      <!-- Fixed Footer Slot: Summary & Action Button -->
      @if (cartService.cartItems().length > 0) {
        <div slot="footer" class="cart-page__fixed-footer">
          @if (cartService.unavailableItems().length > 0) {
            <div class="cart-page__alert" role="alert">
              <span>
                {{ cartService.unavailableItems().length }} article(s) ne sont pas disponibles dans
                la boutique la plus proche de vous.
              </span>
              <button type="button" (click)="removeUnavailable()">Les retirer</button>
            </div>
          }

          <!-- Summary Breakdown -->
          <div class="cart-summary">
            <div class="cart-summary__row">
              <span>Sous-total</span>
              <strong>{{ formatPrice(cartService.subtotal()) }} FCFA</strong>
            </div>

            <div class="cart-summary__row">
              <span>Livraison</span>
              <strong>{{ formatPrice(cartService.deliveryFee()) }} FCFA</strong>
            </div>

            @if (cartService.discount() > 0) {
              <div class="cart-summary__row">
                <span>Réduction</span>
                <strong class="cart-summary__discount"
                  >- {{ formatPrice(cartService.discount()) }} FCFA</strong
                >
              </div>
            }

            <div class="cart-summary__divider"></div>

            <div class="cart-summary__total-row">
              <span class="cart-summary__total-label">TOTAL</span>
              <strong class="cart-summary__total-value"
                >{{ formatPrice(cartService.totalPrice()) }} FCFA</strong
              >
            </div>
          </div>

          <!-- Checkout Continue Button -->
          <button
            type="button"
            class="cart-page__continue-btn"
            [disabled]="!canCheckout()"
            (click)="proceedToConfirmation()"
          >
            Continuer la commande
          </button>
        </div>
      }
    </app-client-layout>
  `,
  styleUrl: './cart-page.scss',
})
export class CartPage {
  private readonly router = inject(Router);
  protected readonly cartService = inject(CartService);
  protected readonly positions = inject(UserPositionService);
  private readonly shopService = inject(ShopService);

  /** Commande possible : boutique à portée, aucun article indisponible chez son partenaire. */
  protected readonly canCheckout = computed(
    () => this.shopService.shopId() !== null && this.cartService.unavailableItems().length === 0,
  );

  protected isUnavailable(productId: string): boolean {
    return this.cartService.unavailableItems().some((item) => item.product.id === productId);
  }

  protected removeUnavailable(): void {
    for (const item of this.cartService.unavailableItems()) {
      this.cartService.removeFromCart(item.product.id);
    }
  }

  protected formatPrice(val: number): string {
    return val.toLocaleString('fr-FR');
  }

  protected clearCart(): void {
    this.cartService.clearCart();
  }

  /** La confirmation prend la position précise de livraison avant de calculer le paiement. */
  protected proceedToConfirmation(): void {
    this.router.navigate(['/client/boutique/commande/confirmation']);
  }
}
