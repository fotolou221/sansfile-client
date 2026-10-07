import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import { AdminModal } from '../../components/admin-modal/admin-modal';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';
import type { Order, OrderStatus } from '../../../../shared/models/order';
import { AdminConfirmService } from '../../services/admin-confirm.service';
import { AdminLocalitiesService } from '../../services/admin-localities.service';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { API_CONFIG } from '../../../../core/config/api.config';

interface DraftLine {
  productId: string;
  quantity: number;
}

@Component({
  selector: 'app-admin-commandes-page',
  imports: [FormsModule, AdminBadge, AdminModal, AdminPagination],
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Commandes Clients &bull; Boutique</h1>
          <p>Suivez, confirmez et enregistrez les commandes de la boutique SansFile.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nouvelle commande (client au téléphone)</span>
        </button>
      </div>

      <div class="admin-toolbar">
        <div class="admin-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event); currentPage.set(1)"
            placeholder="Rechercher par N° ou client..."
          />
        </div>

        <div class="admin-filter-group">
          <select
            [ngModel]="localityFilter()"
            (ngModelChange)="localityFilter.set($event); currentPage.set(1)"
            aria-label="Filtrer par localité"
          >
            <option value="all">Toutes les localités</option>
            @for (l of localities.localities(); track l.id) {
              <option [value]="'' + l.id">{{ l.name }}</option>
            }
          </select>
          <select
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event); currentPage.set(1)"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="livre">Livrée</option>
            <option value="annule">Annulée</option>
          </select>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Client</th>
                <th>Localité &bull; Partenaire</th>
                <th>Articles</th>
                <th>Total &bull; Acompte</th>
                <th>Statut</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (order of paginatedOrders(); track order.id) {
                <tr>
                  <td>
                    <strong class="admin-table__order-num">{{ order.orderNumber }}</strong>
                    <span class="admin-table__date">{{ formatDate(order.createdAt) }}</span>
                  </td>
                  <td>
                    <div>{{ order.customerName || '—' }}</div>
                    <span class="admin-table__subtext">{{ order.customerPhone || '' }}</span>
                    <span class="admin-table__subtext">
                      {{ order.orderType === 'whatsapp' ? 'WhatsApp' : 'Appel' }}
                    </span>
                  </td>
                  <td>
                    <div>{{ order.deliveryDistrict || '—' }}</div>
                    <span class="admin-table__subtext">{{
                      order.partnerName || 'Sans partenaire'
                    }}</span>
                  </td>
                  <td>
                    <div class="admin-order-items-preview">
                      @for (item of order.items; track item.product.id) {
                        <span>{{ item.quantity }}x {{ item.product.title }}</span>
                      } @empty {
                        <span class="admin-table__subtext">—</span>
                      }
                    </div>
                  </td>
                  <td>
                    <strong class="admin-price-tag">{{ formatPrice(order.totalPrice) }}</strong>
                    @if (order.upfrontAmount !== undefined) {
                      <span class="admin-table__subtext"
                        >acompte {{ formatPrice(order.upfrontAmount) }}</span
                      >
                    }
                  </td>
                  <td>
                    <app-admin-badge [variant]="getOrderBadgeVariant(order.status)">
                      {{ getOrderStatusLabel(order.status) }}
                    </app-admin-badge>
                  </td>
                  <td style="text-align: right;">
                    <div class="admin-table__actions" style="justify-content: flex-end; gap: 8px;">
                      <button
                        type="button"
                        class="admin-btn admin-btn--sm admin-btn--outline"
                        (click)="openDetail(order)"
                        title="Répartition, partenaire et livreur"
                      >
                        Détail
                      </button>
                      <button
                        type="button"
                        class="admin-btn admin-btn--sm admin-btn--whatsapp"
                        (click)="shareOrderOnWhatsApp(order)"
                        title="Partager la commande et la position sur WhatsApp"
                        aria-label="Partager sur WhatsApp"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style="width: 14px; height: 14px;"
                        >
                          <path
                            d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.82 14.1c-.25.7-1.46 1.34-2.02 1.4-.53.07-1.22.1-1.96-.14-.45-.15-1.03-.34-1.78-.67-3.14-1.36-5.18-4.54-5.34-4.75-.16-.21-1.29-1.72-1.29-3.28 0-1.56.82-2.33 1.11-2.65.29-.32.64-.4.85-.4.21 0 .42.01.6.01.2 0 .46-.07.72.55.26.63.89 2.17.97 2.32.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.15.15-.31.31-.13.62.18.3.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.54.31.16.49.13.67-.08.18-.21.77-.9 1-.1.21.23.21.37.05.78.7.16.41.32.82.32 1.23 0 .41-.25.82-1.02.82z"
                          />
                        </svg>
                        <span>Partager</span>
                      </button>

                      @if (order.status === 'en_attente') {
                        <button
                          type="button"
                          class="admin-btn admin-btn--sm admin-btn--primary"
                          (click)="confirmOrder(order.id)"
                        >
                          Confirmer
                        </button>
                      }
                      <select
                        class="admin-order-status-select"
                        [value]="order.status"
                        (change)="onStatusChange(order.id, $event)"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="livre">Marquer Livrée</option>
                        <option value="annule">Annuler</option>
                      </select>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="admin-table__empty">Aucune commande trouvée.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-admin-pagination
          [totalItems]="filteredOrders().length"
          [pageSize]="pageSize()"
          [currentPage]="currentPage()"
          (pageChange)="currentPage.set($event)"
          (pageSizeChange)="pageSize.set($event)"
        />
      </div>

      <!-- Modal création commande admin -->
      <app-admin-modal
        title="Nouvelle commande client"
        [isOpen]="isCreateOpen()"
        (close)="closeCreateModal()"
      >
        <form class="admin-form" (ngSubmit)="submitCreate()">
          @if (createError()) {
            <div class="admin-form-alert admin-form-alert--danger">
              <span>{{ createError() }}</span>
            </div>
          }
          <div class="admin-form__row">
            <div class="admin-form__field">
              <label>Nom du client *</label>
              <input
                type="text"
                [(ngModel)]="cName"
                name="cName"
                required
                placeholder="Ex : Awa Ndiaye"
              />
            </div>
            <div class="admin-form__field">
              <label>Téléphone *</label>
              <input
                type="text"
                [(ngModel)]="cPhone"
                name="cPhone"
                required
                placeholder="+221 77 000 00 00"
              />
            </div>
          </div>
          <div class="admin-form__field">
            <label>Localité de livraison *</label>
            <select [(ngModel)]="cLocalityId" name="cLocalityId">
              <option [ngValue]="null">— Choisir la localité —</option>
              @for (l of localities.activeLocalities(); track l.id) {
                <option [ngValue]="l.id" [disabled]="!l.partnerId || !l.partnerActive">
                  {{ l.name }}{{ !l.partnerId || !l.partnerActive ? ' (pas de partenaire)' : '' }}
                </option>
              }
            </select>
          </div>
          <div class="admin-form__row">
            <div class="admin-form__field">
              <label>Adresse de livraison</label>
              <input
                type="text"
                [(ngModel)]="cAddress"
                name="cAddress"
                placeholder="Quartier, rue, repère"
              />
            </div>
            <div class="admin-form__field">
              <label>Quartier</label>
              <input
                type="text"
                [(ngModel)]="cDistrict"
                name="cDistrict"
                placeholder="Ex : Ouakam"
              />
            </div>
          </div>

          <div class="admin-form__field">
            <label>Articles *</label>
            @for (line of draftLines(); track $index) {
              <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
                <select
                  [ngModel]="line.productId"
                  (ngModelChange)="setLineProduct($index, $event)"
                  [ngModelOptions]="{ standalone: true }"
                  style="flex:1;"
                >
                  <option value="">— Choisir un produit —</option>
                  @for (p of data.products(); track p.id) {
                    <option [value]="p.id">{{ p.title }} ({{ formatPrice(p.price) }})</option>
                  }
                </select>
                <input
                  type="number"
                  min="1"
                  [ngModel]="line.quantity"
                  (ngModelChange)="setLineQty($index, $event)"
                  [ngModelOptions]="{ standalone: true }"
                  style="width:70px;"
                />
                <button
                  type="button"
                  class="admin-icon-btn admin-icon-btn--danger"
                  (click)="removeLine($index)"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </div>
            }
            <button type="button" class="admin-btn admin-btn--sm" (click)="addLine()">
              + Ajouter un article
            </button>
          </div>

          <div class="admin-form__field">
            <label>Statut initial</label>
            <select [(ngModel)]="cStatus" name="cStatus">
              <option value="EN_COURS">Confirmée (en cours)</option>
              <option value="EN_ATTENTE">En attente</option>
            </select>
          </div>
        </form>

        <div footer-actions>
          <button
            type="button"
            class="admin-btn admin-btn--primary"
            [disabled]="creating()"
            (click)="submitCreate()"
          >
            {{ creating() ? 'Enregistrement…' : 'Enregistrer la commande' }}
          </button>
        </div>
      </app-admin-modal>

      <!-- Détail : répartition de l'argent, partenaire et livreur -->
      <app-admin-modal
        [title]="detail() ? 'Commande ' + detail()!.orderNumber : ''"
        [isOpen]="detail() !== null"
        [showFooter]="false"
        (close)="closeDetail()"
      >
        @if (detail(); as o) {
          <div class="order-detail">
            <section>
              <h4>Client</h4>
              <p>
                <strong>{{ o.customerName || '—' }}</strong> · {{ o.customerPhone || '—' }}<br />
                Livraison à <strong>{{ o.deliveryDistrict || '—' }}</strong>
                @if (o.deliveryAddress) {
                  — {{ o.deliveryAddress }}
                }
                @if (mapsUrl(o); as maps) {
                  · <a [href]="maps" target="_blank" rel="noopener">position GPS</a>
                }
              </p>
            </section>

            @if (o.upfrontAmount !== undefined && o.partnerAmount !== undefined) {
              <section>
                <h4>Répartition de l'argent</h4>
                <dl class="split">
                  <div>
                    <dt>Total payé par le client</dt>
                    <dd>{{ formatPrice(o.totalPrice) }}</dd>
                  </div>
                  <div class="split__highlight">
                    <dt>
                      Acompte à recevoir avant de confirmer<br /><small
                        >part SansFile {{ formatPrice(o.upfrontAmount - o.deliveryFee) }} +
                        livraison {{ formatPrice(o.deliveryFee) }}</small
                      >
                    </dt>
                    <dd>{{ formatPrice(o.upfrontAmount) }}</dd>
                  </div>
                  <div>
                    <dt>
                      Encaissé par le livreur à la livraison<br /><small
                        >part du partenaire (prix de gros)</small
                      >
                    </dt>
                    <dd>{{ formatPrice(o.partnerAmount) }}</dd>
                  </div>
                  <div>
                    <dt>À payer au livreur par SansFile</dt>
                    <dd>{{ formatPrice(o.deliveryFee) }}</dd>
                  </div>
                </dl>
              </section>
            } @else {
              <p class="muted">Commande passée avant les localités : pas de répartition.</p>
            }

            @if (o.partnerName) {
              <section>
                <h4>Partenaire</h4>
                <p>
                  <strong>{{ o.partnerName }}</strong>
                  @if (o.partnerPhone) {
                    · {{ o.partnerPhone }}
                  }
                </p>
                @if (o.invoiceToken) {
                  <div class="detail-actions detail-actions--start">
                    @if (o.partnerPhone && (o.status === 'en_cours' || o.status === 'livre')) {
                      <button
                        type="button"
                        class="admin-btn admin-btn--sm admin-btn--whatsapp"
                        (click)="sendInvoiceToPartner(o)"
                      >
                        Envoyer la facture au partenaire (WhatsApp)
                      </button>
                    }
                    <a
                      class="admin-btn admin-btn--sm admin-btn--secondary"
                      [href]="invoiceUrl(o)"
                      target="_blank"
                      rel="noopener"
                    >
                      Voir la facture
                    </a>
                  </div>
                  @if (o.status === 'en_attente') {
                    <p class="muted">
                      La facture s'envoie au partenaire une fois l'acompte reçu et la commande
                      confirmée.
                    </p>
                  }
                }
                @if (o.stockDeducted) {
                  <p class="muted">Articles retirés du stock du partenaire.</p>
                }
              </section>

              <section>
                <h4>Livreur du partenaire</h4>
                <div class="admin-form__row">
                  <div class="admin-form__field">
                    <label for="courier-name">Nom</label>
                    <input
                      id="courier-name"
                      type="text"
                      [(ngModel)]="courierName"
                      maxlength="100"
                    />
                  </div>
                  <div class="admin-form__field">
                    <label for="courier-phone">Téléphone / Wave</label>
                    <input id="courier-phone" type="tel" [(ngModel)]="courierPhone" />
                  </div>
                </div>
                <label class="checkbox">
                  <input type="checkbox" [(ngModel)]="courierPaid" />
                  Livreur payé ({{ formatPrice(o.deliveryFee) }})
                </label>
                <div class="detail-actions">
                  <button
                    type="button"
                    class="admin-btn admin-btn--sm admin-btn--primary"
                    [disabled]="savingCourier()"
                    (click)="saveCourier(o)"
                  >
                    {{ savingCourier() ? 'Enregistrement…' : 'Enregistrer le livreur' }}
                  </button>
                </div>
              </section>
            }

            @if (o.status === 'en_attente') {
              <section class="confirm-box">
                <p>
                  Confirmez la commande quand l'acompte
                  @if (o.upfrontAmount !== undefined) {
                    de <strong>{{ formatPrice(o.upfrontAmount) }}</strong>
                  }
                  est reçu : ses articles sortent du stock du partenaire. Envoyez-lui ensuite la
                  facture.
                </p>
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--primary"
                  (click)="confirmOrder(o.id)"
                >
                  Acompte reçu : confirmer
                </button>
              </section>
            }
          </div>
        }
      </app-admin-modal>

      @if (toast()) {
        <div class="admin-toast-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ toast() }}</span>
        </div>
      }
    </div>
  `,
  styleUrl: './admin-commandes-page.scss',
})
export class AdminCommandesPage {
  protected readonly data = inject(AdminDataService);
  protected readonly localities = inject(AdminLocalitiesService);
  private readonly confirmService = inject(AdminConfirmService);
  private readonly errorMessages = inject(HttpErrorMessageService);

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal('all');
  /** 'all' ou identifiant de localité. */
  protected readonly localityFilter = signal('all');

  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = signal<number>(10);
  protected readonly toast = signal<string | null>(null);

  // ── Détail : répartition, partenaire, livreur ──
  private readonly detailId = signal<string | null>(null);
  /** Toujours la version à jour de la commande (temps réel, enregistrement du livreur). */
  protected readonly detail = computed<Order | null>(() => {
    const id = this.detailId();
    return id ? (this.data.orders().find((o) => o.id === id) ?? null) : null;
  });
  protected readonly savingCourier = signal(false);
  protected courierName = '';
  protected courierPhone = '';
  protected courierPaid = false;

  constructor() {
    this.localities.ensureLocalities();
  }

  // ── Création admin ──
  protected readonly isCreateOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly draftLines = signal<DraftLine[]>([{ productId: '', quantity: 1 }]);
  protected cName = '';
  protected cPhone = '';
  protected cAddress = '';
  protected cDistrict = '';
  protected cStatus: 'EN_COURS' | 'EN_ATTENTE' = 'EN_COURS';
  protected cLocalityId: number | null = null;

  protected readonly filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const locality = this.localityFilter();
    return this.data.orders().filter((o) => {
      const matchQ =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').includes(q);
      const matchSt = st === 'all' || o.status === st;
      const matchLocality = locality === 'all' || String(o.localityId ?? '') === locality;
      return matchQ && matchSt && matchLocality;
    });
  });

  protected closeDetail(): void {
    this.detailId.set(null);
  }

  protected openDetail(order: Order): void {
    this.detailId.set(order.id);
    this.courierName = order.courierName ?? '';
    this.courierPhone = order.courierPhone ?? '';
    this.courierPaid = order.courierPaid === true;
  }

  protected saveCourier(order: Order): void {
    this.savingCourier.set(true);
    this.data
      .updateCourier(order.id, {
        courierName: this.courierName,
        courierPhone: this.courierPhone,
        courierPaid: this.courierPaid,
      })
      .subscribe({
        next: () => {
          this.savingCourier.set(false);
          this.showToast('Livreur enregistré.');
        },
        error: (err) => {
          this.savingCourier.set(false);
          alert(this.errorMessages.message(err, "Le livreur n'a pas pu être enregistré."));
        },
      });
  }

  protected mapsUrl(order: Order): string | null {
    if (order.deliveryLatitude !== undefined && order.deliveryLongitude !== undefined) {
      return `https://maps.google.com/?q=${order.deliveryLatitude},${order.deliveryLongitude}`;
    }
    const gps = order.notes?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    return gps ? `https://maps.google.com/?q=${gps[1]},${gps[2]}` : null;
  }

  /** Facture du partenaire : page ouverte sans connexion (photos des articles, client, montant à encaisser). */
  protected invoiceUrl(order: Order): string {
    return new URL(
      `${API_CONFIG.baseUrl}/public/invoices/${order.invoiceToken}`,
      window.location.origin,
    ).href;
  }

  /**
   * Facture envoyée au partenaire sur WhatsApp : le lien de la facture (photos des articles à préparer,
   * client à livrer, montant que son livreur encaisse). Jamais la part SansFile.
   */
  protected sendInvoiceToPartner(order: Order): void {
    if (!order.partnerPhone || !order.invoiceToken) return;
    const articles = order.items.reduce((sum, it) => sum + it.quantity, 0);
    let msg = `📦 *Commande SansFile ${order.orderNumber}*\n\n`;
    msg += `Bonjour${order.partnerName ? ' ' + order.partnerName : ''}, voici la facture à préparer `;
    msg += `(${articles} article${articles > 1 ? 's' : ''}, avec les photos) :\n${this.invoiceUrl(order)}\n\n`;
    msg += `📍 *Livraison :* ${order.deliveryDistrict || ''}${order.deliveryAddress ? ' — ' + order.deliveryAddress : ''}\n`;
    if (order.partnerAmount !== undefined) {
      msg += `💵 *Votre livreur encaisse à la livraison :* ${this.formatPrice(order.partnerAmount)}\n`;
    }
    const phone = order.partnerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  protected readonly paginatedOrders = computed(() => {
    const list = this.filteredOrders();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  protected formatDate(isoString: string): string {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('fr-FR') +
        ' ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoString;
    }
  }

  protected getOrderBadgeVariant(
    status: OrderStatus,
  ): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'livre':
        return 'success';
      case 'en_cours':
        return 'primary';
      case 'en_attente':
        return 'warning';
      case 'annule':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected getOrderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'livre':
        return 'Livrée';
      case 'en_cours':
        return 'En cours';
      case 'en_attente':
        return 'En attente';
      case 'annule':
        return 'Annulée';
      default:
        return status;
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3000);
  }

  protected shareOrderOnWhatsApp(order: Order): void {
    let msg = `📦 *COMMANDE SANSFILE : ${order.orderNumber}*\n`;
    msg += `📅 *Date :* ${this.formatDate(order.createdAt)}\n`;
    msg += `👤 *Client :* ${order.customerName || 'Non renseigné'}\n`;
    msg += `📞 *Téléphone :* ${order.customerPhone || 'Non renseigné'}\n`;
    msg += `📌 *Statut :* ${this.getOrderStatusLabel(order.status)}\n\n`;

    msg += `🛒 *Articles commandés :*\n`;
    if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const title = it.product?.title || 'Article';
        const price = (it.product?.price || 0) * it.quantity;
        msg += `• ${it.quantity}x ${title} - ${this.formatPrice(price)}\n`;
      });
    } else {
      msg += `• Aucun article\n`;
    }

    msg += `\n💰 *Total TTC :* ${this.formatPrice(order.totalPrice)}\n`;

    if (order.deliveryAddress || order.deliveryDistrict) {
      const addr = [order.deliveryAddress, order.deliveryDistrict].filter(Boolean).join(', ');
      msg += `🏠 *Adresse de livraison :* ${addr}\n`;
    }

    if (order.notes && order.notes.trim()) {
      const notes = order.notes.trim();
      msg += `📝 *Notes :* ${notes}\n`;

      // Lien de localisation Google Maps : présent uniquement si la note n'est pas vide
      let mapUrl = '';
      const gpsMatch = notes.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (gpsMatch) {
        mapUrl = `https://maps.google.com/?q=${gpsMatch[1]},${gpsMatch[2]}`;
      } else if (notes.includes('http')) {
        const urlMatch = notes.match(/https?:\/\/[^\s]+/);
        if (urlMatch) mapUrl = urlMatch[0];
      } else {
        mapUrl = `https://maps.google.com/?q=${encodeURIComponent(notes)}`;
      }

      if (mapUrl) {
        msg += `📍 *Position client (Google Maps) :*\n${mapUrl}\n`;
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  }

  protected confirmOrder(orderId: string): void {
    this.data.confirmOrder(orderId).subscribe({
      next: () => this.showToast('Commande confirmée : stock du partenaire mis à jour.'),
      // Stock insuffisant chez le partenaire : le serveur dit quel article manque
      error: (err) =>
        alert(this.errorMessages.message(err, 'Impossible de confirmer la commande.')),
    });
  }

  protected async onStatusChange(orderId: string, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as OrderStatus;
    const order = this.data.orders().find((o) => o.id === orderId);

    if (newStatus === 'annule') {
      const confirmed = await this.confirmService.confirm({
        title: 'Annulation de Commande',
        message: 'Êtes-vous sûr de vouloir annuler cette commande client ?',
        confirmLabel: "Confirmer l'annulation",
        variant: 'danger',
      });
      if (!confirmed) {
        if (order) select.value = order.status;
        return;
      }
    }

    this.data.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => this.showToast('Statut mis à jour.'),
      error: (err) => {
        alert(this.errorMessages.message(err, 'Impossible de mettre à jour le statut. Réessayez.'));
        if (order) select.value = order.status;
      },
    });
  }

  // ── Modal création ──
  protected openCreateModal(): void {
    this.cName = '';
    this.cPhone = '';
    this.cAddress = '';
    this.cDistrict = '';
    this.cStatus = 'EN_COURS';
    this.cLocalityId = null;
    this.draftLines.set([{ productId: '', quantity: 1 }]);
    this.createError.set(null);
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    if (!this.creating()) this.isCreateOpen.set(false);
  }

  protected addLine(): void {
    this.draftLines.update((l) => [...l, { productId: '', quantity: 1 }]);
  }

  protected removeLine(i: number): void {
    this.draftLines.update((l) => l.filter((_, idx) => idx !== i));
  }

  protected setLineProduct(i: number, productId: string): void {
    this.draftLines.update((l) =>
      l.map((line, idx) => (idx === i ? { ...line, productId } : line)),
    );
  }

  protected setLineQty(i: number, qty: number): void {
    this.draftLines.update((l) =>
      l.map((line, idx) =>
        idx === i ? { ...line, quantity: Math.max(1, Number(qty) || 1) } : line,
      ),
    );
  }

  protected submitCreate(): void {
    if (this.creating()) return;
    const items = this.draftLines()
      .filter((l) => l.productId && !isNaN(Number(l.productId)))
      .map((l) => ({ productId: Number(l.productId), quantity: Math.max(1, l.quantity) }));

    if (!this.cName.trim() || !this.cPhone.trim()) {
      this.createError.set('Le nom et le téléphone du client sont obligatoires.');
      return;
    }
    if (items.length === 0) {
      this.createError.set('Ajoutez au moins un article valide.');
      return;
    }
    if (!this.cLocalityId) {
      this.createError.set(
        'Choisissez la localité de livraison (son partenaire prépare la commande).',
      );
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.data
      .adminCreateOrder({
        items,
        customerName: this.cName.trim(),
        customerPhone: this.cPhone.trim(),
        deliveryAddress: this.cAddress.trim() || undefined,
        deliveryDistrict: this.cDistrict.trim() || undefined,
        status: this.cStatus,
        localityId: this.cLocalityId,
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.isCreateOpen.set(false);
          this.showToast('Commande enregistrée avec succès.');
        },
        error: (err) => {
          this.creating.set(false);
          this.createError.set(
            this.errorMessages.message(err, "Impossible d'enregistrer la commande."),
          );
        },
      });
  }
}
