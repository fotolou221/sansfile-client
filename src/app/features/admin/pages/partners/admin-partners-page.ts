import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import { AdminModal } from '../../components/admin-modal/admin-modal';
import { AdminConfirmService } from '../../services/admin-confirm.service';
import {
  AdminLocalitiesService,
  AdminPartner,
  PartnerFormValue,
} from '../../services/admin-localities.service';

const EMPTY_FORM: PartnerFormValue = {
  name: '',
  managerName: '',
  phone: '',
  address: '',
  localityId: null,
  courierName: '',
  courierPhone: '',
  notes: '',
};

/** Console d'administration : partenaires boutique (un par localité). */
@Component({
  selector: 'app-admin-partners-page',
  imports: [FormsModule, RouterLink, AdminBadge, AdminModal],
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Partenaires boutique</h1>
          <p>
            Un partenaire par localité : SansFile revend ses produits au prix SansFile, et son
            livreur livre les clients de la localité.
          </p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" (click)="openCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nouveau partenaire</span>
        </button>
      </div>

      <div class="info-card">
        <strong>Comment circule l'argent :</strong> le client envoie d'abord
        <em>l'acompte</em> (part SansFile + frais de livraison) avant que vous confirmiez la
        commande ; le livreur du partenaire encaisse la <em>part du partenaire</em> (prix de gros ×
        quantités) à la livraison ; SansFile paie le livreur avec les frais de livraison.
      </div>

      @if (pageError()) {
        <div class="form-error">{{ pageError() }}</div>
      }

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Partenaire</th>
                <th>Localité</th>
                <th>WhatsApp</th>
                <th>Livreur habituel</th>
                <th>Produits disponibles</th>
                <th>Statut</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of service.partners(); track p.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/admin/partenaires', p.id]"
                      ><strong>{{ p.name }}</strong></a
                    >
                    @if (p.managerName) {
                      <div class="sub">{{ p.managerName }}</div>
                    }
                  </td>
                  <td>{{ p.localityName }}</td>
                  <td class="nowrap">
                    <a [href]="whatsAppLink(p.phone)" target="_blank" rel="noopener">{{
                      p.phone
                    }}</a>
                  </td>
                  <td>
                    {{ p.courierName || '—' }}
                    @if (p.courierPhone) {
                      <div class="sub">{{ p.courierPhone }}</div>
                    }
                  </td>
                  <td>
                    <app-admin-badge [variant]="p.availableProducts > 0 ? 'primary' : 'warning'">
                      {{ p.availableProducts }} produit{{ p.availableProducts > 1 ? 's' : '' }}
                    </app-admin-badge>
                  </td>
                  <td>
                    @if (p.active) {
                      <app-admin-badge variant="success">Actif</app-admin-badge>
                    } @else {
                      <app-admin-badge variant="danger">Désactivé</app-admin-badge>
                    }
                  </td>
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <a
                        class="admin-btn admin-btn--sm admin-btn--outline"
                        [routerLink]="['/admin/partenaires', p.id]"
                        >Produits &amp; prix de gros</a
                      >
                      <button
                        type="button"
                        class="admin-icon-btn"
                        title="Modifier"
                        (click)="openEdit(p)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn"
                        [class.admin-icon-btn--danger]="p.active"
                        [title]="
                          p.active ? 'Désactiver (boutique fermée dans la localité)' : 'Réactiver'
                        "
                        (click)="toggleActive(p)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                          <line x1="12" y1="2" x2="12" y2="12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn admin-icon-btn--danger"
                        title="Supprimer (sans commande)"
                        (click)="remove(p)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="admin-table__empty">
                    @if (!service.partnersLoaded()) {
                      Chargement des partenaires…
                    } @else {
                      Aucun partenaire. Ajoutez-en un pour ouvrir la boutique dans une localité.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-admin-modal
        [title]="editing() ? 'Modifier le partenaire' : 'Nouveau partenaire'"
        [isOpen]="formOpen()"
        [showFooter]="false"
        (close)="formOpen.set(false)"
      >
        <form class="admin-form" (ngSubmit)="save()">
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="admin-form-row">
            <div class="admin-form-group">
              <label for="partner-name">Nom du partenaire *</label>
              <input
                id="partner-name"
                name="name"
                [(ngModel)]="form.name"
                maxlength="150"
                placeholder="Ex : Dépôt Cosmétiques Rufisque"
                required
              />
            </div>
            <div class="admin-form-group">
              <label for="partner-locality">Localité *</label>
              <select id="partner-locality" name="localityId" [(ngModel)]="form.localityId">
                <option [ngValue]="null">— Choisir —</option>
                @for (l of selectableLocalities(); track l.id) {
                  <option [ngValue]="l.id">{{ l.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group">
              <label for="partner-manager">Responsable</label>
              <input
                id="partner-manager"
                name="managerName"
                [(ngModel)]="form.managerName"
                maxlength="100"
                placeholder="Ex : Awa Ndiaye"
              />
            </div>
            <div class="admin-form-group">
              <label for="partner-phone">WhatsApp du partenaire *</label>
              <input
                id="partner-phone"
                name="phone"
                type="tel"
                [(ngModel)]="form.phone"
                placeholder="77 123 45 67"
                required
              />
            </div>
          </div>
          <div class="admin-form-group">
            <label for="partner-address">Adresse</label>
            <input
              id="partner-address"
              name="address"
              [(ngModel)]="form.address"
              maxlength="255"
              placeholder="Ex : Marché central, en face de la pharmacie"
            />
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group">
              <label for="courier-name">Livreur habituel</label>
              <input
                id="courier-name"
                name="courierName"
                [(ngModel)]="form.courierName"
                maxlength="100"
                placeholder="Ex : Moussa"
              />
            </div>
            <div class="admin-form-group">
              <label for="courier-phone">Téléphone / Wave du livreur</label>
              <input
                id="courier-phone"
                name="courierPhone"
                type="tel"
                [(ngModel)]="form.courierPhone"
                placeholder="70 111 22 33"
              />
            </div>
          </div>
          <div class="admin-form-group">
            <label for="partner-notes">Notes</label>
            <textarea
              id="partner-notes"
              name="notes"
              rows="2"
              maxlength="1000"
              [(ngModel)]="form.notes"
              placeholder="Conditions, horaires de retrait…"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="admin-btn admin-btn--outline"
              (click)="formOpen.set(false)"
            >
              Annuler
            </button>
            <button type="submit" class="admin-btn admin-btn--primary" [disabled]="saving()">
              {{ saving() ? 'Enregistrement…' : editing() ? 'Enregistrer' : 'Créer le partenaire' }}
            </button>
          </div>
        </form>
      </app-admin-modal>
    </div>
  `,
  styleUrls: ['../users/admin-users-page.scss'],
  styles: `
    .info-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(30, 90, 240, 0.25);
      background: rgba(30, 90, 240, 0.06);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary, #0f172a);
    }

    .sub {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
    }

    .nowrap {
      white-space: nowrap;
    }

    td a {
      color: var(--primary, #1e5af0);
    }

    .row-actions {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .form-error {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.3);
      color: var(--danger, #dc2626);
      font-size: 0.875rem;
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }
  `,
})
export class AdminPartnersPage implements OnInit {
  protected readonly service = inject(AdminLocalitiesService);
  private readonly confirmService = inject(AdminConfirmService);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageError = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AdminPartner | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected form: PartnerFormValue = { ...EMPTY_FORM };

  /** Un partenaire par localité : seules les localités libres (et la sienne) sont proposées. */
  protected readonly selectableLocalities = computed(() => {
    const editing = this.editing();
    return this.service
      .localities()
      .filter((l) => !l.partnerId || l.id === editing?.localityId)
      .filter((l) => l.active || l.id === editing?.localityId);
  });

  ngOnInit(): void {
    this.service.loadPartners().subscribe({
      error: (err) =>
        this.pageError.set(
          this.errorMessages.message(err, 'Impossible de charger les partenaires.'),
        ),
    });
    this.service.loadLocalities().subscribe({
      next: () => {
        // Depuis la page Localités : « + Ajouter un partenaire » ouvre le formulaire pré-rempli
        const preset = Number(this.route.snapshot.queryParamMap.get('nouveau'));
        if (preset) {
          this.openCreate(preset);
        }
      },
      error: () => {},
    });
  }

  protected openCreate(localityId: number | null = null): void {
    this.editing.set(null);
    this.form = { ...EMPTY_FORM, localityId };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(partner: AdminPartner): void {
    this.editing.set(partner);
    this.form = {
      name: partner.name,
      managerName: partner.managerName ?? '',
      phone: partner.phone,
      address: partner.address ?? '',
      localityId: partner.localityId,
      courierName: partner.courierName ?? '',
      courierPhone: partner.courierPhone ?? '',
      notes: partner.notes ?? '',
    };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected save(): void {
    if (!this.form.name.trim() || !this.form.phone.trim() || !this.form.localityId) {
      this.formError.set('Renseignez le nom, le numéro WhatsApp et la localité du partenaire.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const editing = this.editing();
    const request$ = editing
      ? this.service.updatePartner(editing.id, this.form)
      : this.service.createPartner(this.form);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(
          this.errorMessages.message(err, "Le partenaire n'a pas pu être enregistré."),
        );
      },
    });
  }

  protected async toggleActive(partner: AdminPartner): Promise<void> {
    const disabling = partner.active;
    const ok = await this.confirmService.confirm({
      title: disabling ? 'Désactiver le partenaire' : 'Réactiver le partenaire',
      message: disabling
        ? `La boutique sera fermée à ${partner.localityName} tant que ${partner.name} est désactivé. Les commandes passées restent intactes.`
        : `La boutique rouvrira à ${partner.localityName} avec les produits de ${partner.name}.`,
      confirmLabel: disabling ? 'Désactiver' : 'Réactiver',
      variant: disabling ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.service.setPartnerActive(partner.id, !disabling).subscribe({
      error: (err) => this.pageError.set(this.errorMessages.message(err, 'Action impossible.')),
    });
  }

  protected async remove(partner: AdminPartner): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Supprimer le partenaire',
      message: `${partner.name} et ses prix de gros seront supprimés. Impossible s'il a déjà des commandes (désactivez-le alors).`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    this.service.deletePartner(partner.id).subscribe({
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Suppression impossible.')),
    });
  }

  protected whatsAppLink(phone: string): string {
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
  }
}
