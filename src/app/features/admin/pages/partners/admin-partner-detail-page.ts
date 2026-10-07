import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import {
  AdminLocalitiesService,
  AdminPartner,
  PartnerProductRow,
} from '../../services/admin-localities.service';

type OfferFilter = 'all' | 'offered' | 'available' | 'out' | 'missing';

/** Ligne éditable : prix de gros, stock et disponibilité saisis, avant enregistrement. */
interface EditableRow extends PartnerProductRow {
  draftPrice: number | null;
  draftStock: number | null;
  draftAvailable: boolean;
  saving: boolean;
  error: string | null;
}

const MAX_STOCK = 100_000;

/** Produits d'un partenaire : prix de gros, stock, disponibilité et part SansFile, produit par produit. */
@Component({
  selector: 'app-admin-partner-detail-page',
  imports: [FormsModule, RouterLink, AdminBadge],
  template: `
    <div class="admin-page">
      <a routerLink="/admin/partenaires" class="back-link">← Tous les partenaires</a>

      @if (partner(); as p) {
        <div class="admin-page__header">
          <div>
            <h1>{{ p.name }}</h1>
            <p>
              Partenaire de <strong>{{ p.localityName }}</strong> ·
              <a [href]="'https://wa.me/' + digits(p.phone)" target="_blank" rel="noopener">{{
                p.phone
              }}</a>
              @if (p.courierName) {
                · livreur habituel : {{ p.courierName }}
                @if (p.courierPhone) {
                  ({{ p.courierPhone }})
                }
              }
            </p>
          </div>
          @if (p.active) {
            <app-admin-badge variant="success">Actif</app-admin-badge>
          } @else {
            <app-admin-badge variant="danger"
              >Désactivé : boutique fermée à {{ p.localityName }}</app-admin-badge
            >
          }
        </div>
      }

      <div class="info-card">
        Pour chaque produit du partenaire, indiquez son <strong>prix de gros</strong>
        (sa part par unité, payée par le client à son livreur) et la
        <strong>quantité qu'il a en stock</strong>. La différence avec le prix de vente SansFile est
        votre part, envoyée par le client avant confirmation. Le stock baisse quand vous confirmez
        l'acompte d'une commande et remonte si elle est annulée ; à zéro, le produit n'est plus
        visible pour les clients et les coiffeurs de la localité. Ces montants ne sont jamais
        visibles par les clients.
      </div>

      @if (pageError()) {
        <div class="form-error">{{ pageError() }}</div>
      }

      <div class="admin-toolbar">
        <div class="admin-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Rechercher un produit…"
          />
        </div>
        <select class="admin-select" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
          <option value="all">Tout le catalogue</option>
          <option value="offered">Proposés par le partenaire</option>
          <option value="available">Disponibles (en vente)</option>
          <option value="out">En rupture chez le partenaire</option>
          <option value="missing">Pas encore proposés</option>
        </select>
      </div>

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix de vente</th>
                <th>Prix de gros *</th>
                <th>Part SansFile</th>
                <th>Stock *</th>
                <th>Disponible</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.productId) {
                <tr [class.row--off]="!row.offered">
                  <td>
                    <div class="product-cell">
                      @if (row.image) {
                        <img [src]="row.image" [alt]="row.title" loading="lazy" />
                      }
                      <div>
                        <strong>{{ row.title }}</strong>
                        <div class="sub">
                          {{ row.brand }}
                          @if (!row.productInStock) {
                            · <span class="danger">rupture SansFile (retiré partout)</span>
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="nowrap">{{ price(row.salePrice) }}</td>
                  <td>
                    <input
                      class="price-input"
                      type="number"
                      min="0"
                      step="50"
                      [max]="row.salePrice"
                      [(ngModel)]="row.draftPrice"
                      [attr.aria-label]="'Prix de gros de ' + row.title"
                      placeholder="—"
                    />
                  </td>
                  <td class="nowrap" [class.danger]="(margin(row) ?? 0) < 0">
                    {{ margin(row) === null ? '—' : price(margin(row)!) }}
                  </td>
                  <td>
                    <input
                      class="price-input stock-input"
                      type="number"
                      min="0"
                      step="1"
                      [max]="maxStock"
                      [(ngModel)]="row.draftStock"
                      [attr.aria-label]="'Quantité en stock de ' + row.title"
                      placeholder="—"
                    />
                    @if (row.offered && row.stockQuantity === 0) {
                      <div class="sub danger">Rupture : invisible</div>
                    }
                  </td>
                  <td>
                    @if (row.offered || isDirty(row)) {
                      <label class="switch">
                        <input
                          type="checkbox"
                          [(ngModel)]="row.draftAvailable"
                          [attr.aria-label]="'Disponible : ' + row.title"
                        />
                        <span>{{ row.draftAvailable ? 'Oui' : 'Non' }}</span>
                      </label>
                    } @else {
                      <span class="sub">Non proposé</span>
                    }
                  </td>
                  <td style="text-align: right;">
                    <div class="row-actions">
                      @if (isDirty(row)) {
                        <button
                          type="button"
                          class="admin-btn admin-btn--sm admin-btn--primary"
                          [disabled]="row.saving"
                          (click)="save(row)"
                        >
                          {{ row.saving ? '…' : row.offered ? 'Enregistrer' : 'Ajouter' }}
                        </button>
                      }
                      @if (row.offered) {
                        <button
                          type="button"
                          class="admin-btn admin-btn--sm admin-btn--outline"
                          [disabled]="row.saving"
                          (click)="removeOffer(row)"
                        >
                          Retirer
                        </button>
                      }
                    </div>
                    @if (row.error) {
                      <div class="row-error">{{ row.error }}</div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="admin-table__empty">
                    @if (loading()) {
                      Chargement du catalogue…
                    } @else {
                      Aucun produit ne correspond.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../users/admin-users-page.scss'],
  styles: `
    .back-link {
      color: var(--primary, #1e5af0);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
    }

    .info-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(30, 90, 240, 0.25);
      background: rgba(30, 90, 240, 0.06);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary, #0f172a);
    }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      img {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        object-fit: cover;
      }
    }

    .sub {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
    }

    .danger {
      color: var(--danger, #dc2626);
    }

    .nowrap {
      white-space: nowrap;
    }

    .row--off td {
      opacity: 0.75;
    }

    .price-input {
      width: 110px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-primary, #0f172a);
    }

    .stock-input {
      width: 80px;
    }

    .switch {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .row-actions {
      display: inline-flex;
      gap: 6px;
    }

    .row-error {
      margin-top: 4px;
      max-width: 260px;
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--danger, #dc2626);
      text-align: right;
    }

    .form-error {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.3);
      color: var(--danger, #dc2626);
      font-size: 0.875rem;
    }

    h1 + p a {
      color: var(--primary, #1e5af0);
    }
  `,
})
export class AdminPartnerDetailPage implements OnInit {
  private readonly service = inject(AdminLocalitiesService);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly route = inject(ActivatedRoute);

  protected readonly partner = signal<AdminPartner | null>(null);
  protected readonly rows = signal<EditableRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly pageError = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly filter = signal<OfferFilter>('all');
  private partnerId = 0;

  protected readonly filtered = computed(() => {
    const q = normalize(this.query());
    const filter = this.filter();
    return this.rows().filter((row) => {
      const matchesQuery =
        !q || normalize(row.title).includes(q) || normalize(row.brand ?? '').includes(q);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'offered' && row.offered) ||
        (filter === 'available' && row.offered && row.available && row.stockQuantity > 0) ||
        (filter === 'out' && row.offered && row.stockQuantity === 0) ||
        (filter === 'missing' && !row.offered);
      return matchesQuery && matchesFilter;
    });
  });

  ngOnInit(): void {
    this.partnerId = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getPartner(this.partnerId).subscribe({
      next: (p) => this.partner.set(p),
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Partenaire introuvable.')),
    });
    this.loadRows();
  }

  private loadRows(): void {
    this.loading.set(true);
    this.service.partnerProducts(this.partnerId).subscribe({
      next: (list) => {
        this.rows.set(list.map((row) => toEditable(row)));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.pageError.set(this.errorMessages.message(err, 'Impossible de charger le catalogue.'));
      },
    });
  }

  protected margin(row: EditableRow): number | null {
    return row.draftPrice === null || row.draftPrice === undefined || `${row.draftPrice}` === ''
      ? null
      : row.salePrice - Number(row.draftPrice);
  }

  protected readonly maxStock = MAX_STOCK;

  protected isDirty(row: EditableRow): boolean {
    if (isBlank(row.draftPrice)) return false;
    return (
      !row.offered ||
      Number(row.draftPrice) !== row.wholesalePrice ||
      (!isBlank(row.draftStock) && Number(row.draftStock) !== row.stockQuantity) ||
      row.draftAvailable !== row.available
    );
  }

  protected save(row: EditableRow): void {
    const wholesale = Number(row.draftPrice);
    if (!Number.isFinite(wholesale) || wholesale < 0) {
      this.patch(row.productId, { error: 'Prix de gros invalide.' });
      return;
    }
    if (wholesale > row.salePrice) {
      this.patch(row.productId, {
        error: 'Le prix de gros dépasse le prix de vente : la part SansFile serait négative.',
      });
      return;
    }
    const stock = Number(row.draftStock);
    if (isBlank(row.draftStock) || !Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
      this.patch(row.productId, {
        error: 'Indiquez la quantité en stock chez le partenaire (nombre entier, 0 si rupture).',
      });
      return;
    }
    this.patch(row.productId, { saving: true, error: null });
    this.service
      .saveOffer(this.partnerId, row.productId, {
        wholesalePrice: Math.round(wholesale),
        available: row.draftAvailable,
        stockQuantity: stock,
      })
      .subscribe({
        next: (saved) => {
          this.rows.update((list) =>
            list.map((r) => (r.productId === saved.productId ? toEditable(saved) : r)),
          );
          this.refreshPartner();
        },
        error: (err) =>
          this.patch(row.productId, {
            saving: false,
            error: this.errorMessages.message(err, "L'offre n'a pas pu être enregistrée."),
          }),
      });
  }

  protected removeOffer(row: EditableRow): void {
    this.patch(row.productId, { saving: true, error: null });
    this.service.removeOffer(this.partnerId, row.productId).subscribe({
      next: () => {
        this.patch(row.productId, {
          saving: false,
          offered: false,
          available: false,
          wholesalePrice: null,
          margin: null,
          stockQuantity: 0,
          draftPrice: null,
          draftStock: null,
          draftAvailable: true,
        });
        this.refreshPartner();
      },
      error: (err) =>
        this.patch(row.productId, {
          saving: false,
          error: this.errorMessages.message(err, 'Retrait impossible.'),
        }),
    });
  }

  protected price(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  protected digits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private refreshPartner(): void {
    this.service.getPartner(this.partnerId).subscribe({
      next: (p) => this.partner.set(p),
      error: () => {},
    });
  }

  private patch(productId: number, changes: Partial<EditableRow>): void {
    this.rows.update((list) =>
      list.map((r) => (r.productId === productId ? { ...r, ...changes } : r)),
    );
  }
}

function toEditable(row: PartnerProductRow): EditableRow {
  return {
    ...row,
    draftPrice: row.wholesalePrice,
    draftStock: row.offered ? row.stockQuantity : null,
    draftAvailable: row.offered ? row.available : true,
    saving: false,
    error: null,
  };
}

function isBlank(value: number | null | undefined): boolean {
  return value === null || value === undefined || `${value}` === '';
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
