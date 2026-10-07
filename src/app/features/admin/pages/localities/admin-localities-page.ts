import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import { AdminModal } from '../../components/admin-modal/admin-modal';
import { AdminConfirmService } from '../../services/admin-confirm.service';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminAgentsService } from '../../services/admin-agents.service';
import {
  AdminLocalitiesService,
  AdminLocality,
  LocalityFormValue,
  RequestedZone,
} from '../../services/admin-localities.service';

/** Console d'administration : localités (zones de SansFile) et zones demandées par les clients. */
@Component({
  selector: 'app-admin-localities-page',
  imports: [FormsModule, RouterLink, AdminBadge, AdminModal],
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Localités</h1>
          <p>
            Les localités répartissent salons, clients, agents et boutique. Chaque localité a un
            partenaire qui fournit les produits et dont le livreur livre les commandes.
          </p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" (click)="openCreate()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nouvelle localité</span>
        </button>
      </div>

      @if (setupSteps(); as steps) {
        @if (steps.remaining > 0) {
          <div class="setup-card">
            <strong>Mise en place des localités</strong>
            <ol>
              <li [class.done]="steps.localities">
                Créer les localités
                @if (!steps.localities) {
                  — aucune localité pour l'instant.
                }
              </li>
              <li [class.done]="steps.salonsWithout === 0">
                Rattacher les salons
                @if (steps.salonsWithout > 0) {
                  —
                  <a routerLink="/admin/salons" [queryParams]="{ localite: 'aucune' }"
                    >{{ steps.salonsWithout }} salon(s) sans localité</a
                  >
                }
              </li>
              <li [class.done]="steps.agentsWithout === 0">
                Affecter les agents de terrain
                @if (steps.agentsWithout > 0) {
                  —
                  <a routerLink="/admin/agents"
                    >{{ steps.agentsWithout }} agent(s) sans localité (ils ne peuvent pas
                    exercer)</a
                  >
                }
              </li>
              <li [class.done]="steps.withoutPartner === 0">
                Installer un partenaire par localité
                @if (steps.withoutPartner > 0) {
                  —
                  <a routerLink="/admin/partenaires"
                    >{{ steps.withoutPartner }} localité(s) sans partenaire actif (boutique
                    fermée)</a
                  >
                }
              </li>
            </ol>
          </div>
        }
      }

      @if (pageError()) {
        <div class="form-error">{{ pageError() }}</div>
      }

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Localité</th>
                <th>Livraison</th>
                <th>Partenaire boutique</th>
                <th>Salons</th>
                <th>Clients &amp; coiffeurs</th>
                <th>Agents</th>
                <th>Commandes</th>
                <th>Statut</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (l of service.localities(); track l.id) {
                <tr>
                  <td>
                    <strong>{{ l.name }}</strong>
                  </td>
                  <td class="nowrap">{{ formatPrice(l.deliveryFee) }}</td>
                  <td>
                    @if (l.partnerId) {
                      <a [routerLink]="['/admin/partenaires', l.partnerId]">{{ l.partnerName }}</a>
                      @if (!l.partnerActive) {
                        <app-admin-badge variant="warning">désactivé</app-admin-badge>
                      }
                    } @else {
                      <a
                        class="muted-link"
                        routerLink="/admin/partenaires"
                        [queryParams]="{ nouveau: l.id }"
                        >+ Ajouter un partenaire</a
                      >
                    }
                  </td>
                  <td>{{ l.salonsCount }}</td>
                  <td>{{ l.usersCount }}</td>
                  <td>{{ l.agentsCount }}</td>
                  <td>{{ l.ordersCount }}</td>
                  <td>
                    @if (l.active) {
                      <app-admin-badge variant="success">Active</app-admin-badge>
                    } @else {
                      <app-admin-badge variant="danger">Désactivée</app-admin-badge>
                    }
                  </td>
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <button
                        type="button"
                        class="admin-icon-btn"
                        title="Modifier"
                        (click)="openEdit(l)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn"
                        [class.admin-icon-btn--danger]="l.active"
                        [title]="l.active ? 'Désactiver' : 'Réactiver'"
                        (click)="toggleActive(l)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                          <line x1="12" y1="2" x2="12" y2="12" />
                        </svg>
                      </button>
                      @if (isUnused(l)) {
                        <button
                          type="button"
                          class="admin-icon-btn admin-icon-btn--danger"
                          title="Supprimer (localité jamais utilisée)"
                          (click)="remove(l)"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="admin-table__empty">
                    @if (!service.localitiesLoaded()) {
                      Chargement des localités…
                    } @else {
                      Aucune localité. Créez la première avec « Nouvelle localité ».
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-card requested">
        <h2>Zones demandées par les utilisateurs</h2>
        <p class="muted">
          Clients et coiffeurs dont la localité n'existe pas encore. En créant une localité du même
          nom, ils y sont rattachés automatiquement.
        </p>
        @if (requested() === null) {
          <p class="muted">Chargement…</p>
        } @else {
          <ul>
            @for (zone of requested(); track zone.name) {
              <li>
                <span
                  ><strong>{{ zone.name }}</strong> — {{ zone.count }} demande{{
                    zone.count > 1 ? 's' : ''
                  }}</span
                >
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--outline"
                  (click)="openCreate(zone)"
                >
                  Créer cette localité
                </button>
              </li>
            } @empty {
              <li class="muted">Aucune zone demandée pour le moment.</li>
            }
          </ul>
        }
      </div>

      <app-admin-modal
        [title]="editing() ? 'Modifier la localité' : 'Nouvelle localité'"
        [isOpen]="formOpen()"
        [showFooter]="false"
        (close)="formOpen.set(false)"
      >
        <form class="admin-form" (ngSubmit)="save()">
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="admin-form-group">
            <label for="locality-name">Nom de la localité *</label>
            <input
              id="locality-name"
              name="name"
              [(ngModel)]="form.name"
              maxlength="100"
              placeholder="Ex : Rufisque"
              required
            />
          </div>
          <div class="admin-form-group">
            <label for="locality-fee">Frais de livraison (FCFA) *</label>
            <input
              id="locality-fee"
              name="deliveryFee"
              type="number"
              min="0"
              step="100"
              [(ngModel)]="form.deliveryFee"
              placeholder="Ex : 1500"
            />
            <span class="form-hint">
              Payés par le client avec l'acompte ; SansFile les reverse au livreur du partenaire.
            </span>
          </div>
          <label class="checkbox">
            <input type="checkbox" name="active" [(ngModel)]="form.active" />
            Proposée aux clients (active)
          </label>
          <div class="modal-actions">
            <button
              type="button"
              class="admin-btn admin-btn--outline"
              (click)="formOpen.set(false)"
            >
              Annuler
            </button>
            <button type="submit" class="admin-btn admin-btn--primary" [disabled]="saving()">
              {{ saving() ? 'Enregistrement…' : editing() ? 'Enregistrer' : 'Créer la localité' }}
            </button>
          </div>
        </form>
      </app-admin-modal>
    </div>
  `,
  styleUrls: ['../users/admin-users-page.scss'],
  styles: `
    .setup-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.08);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary, #0f172a);

      ol {
        margin: 6px 0 0;
        padding-left: 20px;
      }

      li.done {
        color: var(--text-secondary, #64748b);
        text-decoration: line-through;
      }

      a {
        color: var(--primary, #1e5af0);
        font-weight: 600;
      }
    }

    .requested {
      padding: 16px;

      h2 {
        margin: 0 0 4px;
        font-size: 1rem;
        font-weight: 800;
      }

      ul {
        margin: 12px 0 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid var(--border-color, #e2e8f0);
        font-size: 0.875rem;
      }
    }

    .muted,
    .form-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-secondary, #64748b);
    }

    .muted-link {
      color: var(--primary, #1e5af0);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .nowrap {
      white-space: nowrap;
    }

    .row-actions {
      display: inline-flex;
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

    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
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
export class AdminLocalitiesPage implements OnInit {
  protected readonly service = inject(AdminLocalitiesService);
  private readonly data = inject(AdminDataService);
  private readonly agents = inject(AdminAgentsService);
  private readonly confirmService = inject(AdminConfirmService);
  private readonly errorMessages = inject(HttpErrorMessageService);

  protected readonly pageError = signal<string | null>(null);
  protected readonly requested = signal<RequestedZone[] | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AdminLocality | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected form: LocalityFormValue = { name: '', deliveryFee: 1500, active: true };

  /** Étapes de mise en place restantes (déploiement des localités). */
  protected readonly setupSteps = computed(() => {
    const localities = this.service.localities();
    if (!this.service.localitiesLoaded()) return null;
    const salonsWithout = this.data.salons().filter((s) => !s.localityId).length;
    const agentsWithout = this.agents.loaded()
      ? this.agents.agents().filter((a) => a.activated && (a.localities?.length ?? 0) === 0).length
      : 0;
    const withoutPartner = localities.filter(
      (l) => l.active && (!l.partnerId || !l.partnerActive),
    ).length;
    const done = {
      localities: localities.length > 0,
      salonsWithout,
      agentsWithout,
      withoutPartner,
    };
    const remaining =
      (done.localities ? 0 : 1) +
      (salonsWithout > 0 ? 1 : 0) +
      (agentsWithout > 0 ? 1 : 0) +
      (withoutPartner > 0 ? 1 : 0);
    return { ...done, remaining };
  });

  ngOnInit(): void {
    this.reload();
    this.data.loadSalons();
    this.agents.load().subscribe({ error: () => {} });
  }

  protected reload(): void {
    this.service.loadLocalities().subscribe({
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Impossible de charger les localités.')),
    });
    this.service.requestedZones().subscribe({
      next: (zones) => this.requested.set(zones),
      error: () => this.requested.set([]),
    });
  }

  protected openCreate(zone?: RequestedZone): void {
    this.editing.set(null);
    this.form = { name: zone?.name ?? '', deliveryFee: 1500, active: true };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(locality: AdminLocality): void {
    this.editing.set(locality);
    this.form = { name: locality.name, deliveryFee: locality.deliveryFee, active: locality.active };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.name.trim().length < 2) {
      this.formError.set('Renseignez le nom de la localité.');
      return;
    }
    if (this.form.deliveryFee === null || this.form.deliveryFee < 0) {
      this.formError.set('Indiquez les frais de livraison (0 si la livraison est offerte).');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const editing = this.editing();
    const request$ = editing
      ? this.service.updateLocality(editing.id, this.form)
      : this.service.createLocality(this.form);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        if (!editing) {
          // Les utilisateurs qui avaient demandé cette zone y sont rattachés : listes à jour
          this.reload();
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(
          this.errorMessages.message(err, "La localité n'a pas pu être enregistrée."),
        );
      },
    });
  }

  protected async toggleActive(locality: AdminLocality): Promise<void> {
    const disabling = locality.active;
    const ok = await this.confirmService.confirm({
      title: disabling ? 'Désactiver la localité' : 'Réactiver la localité',
      message: disabling
        ? `« ${locality.name} » ne sera plus proposée aux clients. Ses salons, comptes et commandes restent rattachés.`
        : `« ${locality.name} » sera de nouveau proposée aux clients.`,
      confirmLabel: disabling ? 'Désactiver' : 'Réactiver',
      variant: disabling ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.service.setLocalityActive(locality.id, !disabling).subscribe({
      error: (err) => this.pageError.set(this.errorMessages.message(err, 'Action impossible.')),
    });
  }

  protected isUnused(l: AdminLocality): boolean {
    return (
      !l.partnerId &&
      l.salonsCount === 0 &&
      l.usersCount === 0 &&
      l.agentsCount === 0 &&
      l.ordersCount === 0
    );
  }

  protected async remove(locality: AdminLocality): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Supprimer la localité',
      message: `« ${locality.name} » n'est utilisée nulle part : elle sera supprimée définitivement.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    this.service.deleteLocality(locality.id).subscribe({
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Suppression impossible.')),
    });
  }

  protected formatPrice(amount: number): string {
    return amount > 0 ? `${amount.toLocaleString('fr-FR')} FCFA` : 'Offerte';
  }
}
