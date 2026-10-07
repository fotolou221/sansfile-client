import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { resolveAppOrigin } from '../../../../core/config/app-origin';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import { AdminModal } from '../../components/admin-modal/admin-modal';
import { AdminConfirmService } from '../../services/admin-confirm.service';
import { AdminLocalitiesService } from '../../services/admin-localities.service';
import {
  AdminAgent,
  AdminAgentsService,
  AGENT_ACTION_LABELS,
  AgentActivity,
  agentActionVariant,
  AgentCredentials,
  AgentFormValue,
  AgentSalonSummary,
  describeDevice,
} from '../../services/admin-agents.service';

type StatusFilter = 'all' | 'active' | 'pending' | 'disabled';

/** Console d'administration : comptes des agents de terrain. */
@Component({
  selector: 'app-admin-agents-page',
  imports: [FormsModule, RouterLink, AdminBadge, AdminModal],
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Agents de terrain</h1>
          <p>
            Créez les comptes des agents qui inscrivent les salons sur le terrain et suivez leur
            activité.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/agents/journal" class="admin-btn admin-btn--outline"
            >Journal des agents</a
          >
          <button type="button" class="admin-btn admin-btn--primary" (click)="openCreate()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nouvel agent</span>
          </button>
        </div>
      </div>

      @if (agentsWithoutLocality() > 0) {
        <div class="warning-card">
          <span>
            <strong>{{ agentsWithoutLocality() }} agent(s) sans localité</strong> : ils peuvent se
            connecter mais ne peuvent ni inscrire ni modifier de salon.
          </span>
          <button
            type="button"
            class="admin-btn admin-btn--sm admin-btn--outline"
            [disabled]="autoAssigning()"
            (click)="autoAssign()"
          >
            {{ autoAssigning() ? 'Affectation…' : "Affecter d'après leurs salons" }}
          </button>
        </div>
      }
      @if (autoAssignMessage()) {
        <div class="info-card">{{ autoAssignMessage() }}</div>
      }

      <div class="info-card">
        <strong>Connexion des agents :</strong>
        <a [href]="loginUrl" target="_blank" rel="noopener">{{ loginUrl }}</a> avec leur adresse
        e-mail. À la création (ou après une réinitialisation), le mot de passe provisoire est
        <code>{{ defaultPassword }}</code> : l'agent doit le remplacer à sa première connexion.
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
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Rechercher un agent (nom, e-mail, téléphone)…"
          />
        </div>
        <select
          class="admin-select"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event)"
        >
          <option value="all">Tous les agents</option>
          <option value="active">Actifs</option>
          <option value="pending">En attente de 1re connexion</option>
          <option value="disabled">Désactivés</option>
        </select>
      </div>

      @if (pageError()) {
        <div class="form-error">{{ pageError() }}</div>
      }

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Téléphone</th>
                <th>Localités</th>
                <th>Salons inscrits</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (agent of filtered(); track agent.id) {
                <tr>
                  <td>
                    <div class="admin-table__item-with-avatar">
                      <div class="admin-user-avatar">{{ initials(agent) }}</div>
                      <div>
                        <strong>{{ agent.firstName }} {{ agent.lastName }}</strong>
                        <div class="sub">{{ agent.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ agent.phone || '—' }}</td>
                  <td>
                    <button
                      type="button"
                      class="localities-cell"
                      title="Modifier les localités"
                      (click)="openLocalities(agent)"
                    >
                      @for (l of agent.localities; track l.id) {
                        <app-admin-badge [variant]="l.active ? 'info' : 'neutral'">{{
                          l.name
                        }}</app-admin-badge>
                      } @empty {
                        <app-admin-badge variant="danger">Aucune localité</app-admin-badge>
                      }
                    </button>
                  </td>
                  <td>
                    <app-admin-badge [variant]="agent.salonsCount > 0 ? 'primary' : 'neutral'">
                      {{ agent.salonsCount }} salon{{ agent.salonsCount > 1 ? 's' : '' }}
                    </app-admin-badge>
                  </td>
                  <td>{{ agent.lastLoginAt ? formatDateTime(agent.lastLoginAt) : 'Jamais' }}</td>
                  <td>
                    @if (!agent.activated) {
                      <app-admin-badge variant="danger">Désactivé</app-admin-badge>
                    } @else if (agent.mustChangePassword) {
                      <app-admin-badge variant="warning">Mot de passe provisoire</app-admin-badge>
                    } @else {
                      <app-admin-badge variant="success">Actif</app-admin-badge>
                    }
                  </td>
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <button
                        type="button"
                        class="admin-icon-btn"
                        title="Voir l'activité"
                        (click)="openDetail(agent)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn"
                        title="Modifier"
                        (click)="openEdit(agent)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn"
                        title="Réinitialiser le mot de passe"
                        (click)="resetPassword(agent)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="admin-icon-btn"
                        [class.admin-icon-btn--danger]="agent.activated"
                        [title]="agent.activated ? 'Désactiver le compte' : 'Réactiver le compte'"
                        (click)="toggleActivation(agent)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                          <line x1="12" y1="2" x2="12" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="admin-table__empty">
                    @if (!agentsService.loaded()) {
                      Chargement des agents…
                    } @else if (agentsService.agents().length === 0) {
                      Aucun agent de terrain. Créez le premier avec « Nouvel agent ».
                    } @else {
                      Aucun agent ne correspond à la recherche.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Création / modification -->
      <app-admin-modal
        [title]="editing() ? 'Modifier l\\'agent' : 'Nouvel agent de terrain'"
        [isOpen]="formOpen()"
        [showFooter]="false"
        (close)="formOpen.set(false)"
      >
        <form class="admin-form" (ngSubmit)="saveAgent()">
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="admin-form-row">
            <div class="admin-form-group">
              <label for="agent-first-name">Prénom *</label>
              <input
                id="agent-first-name"
                name="firstName"
                [(ngModel)]="form.firstName"
                maxlength="50"
                placeholder="Ex : Awa"
                required
              />
            </div>
            <div class="admin-form-group">
              <label for="agent-last-name">Nom *</label>
              <input
                id="agent-last-name"
                name="lastName"
                [(ngModel)]="form.lastName"
                maxlength="50"
                placeholder="Ex : Ndiaye"
                required
              />
            </div>
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group">
              <label for="agent-email">E-mail (identifiant de connexion) *</label>
              <input
                id="agent-email"
                name="email"
                type="email"
                [(ngModel)]="form.email"
                maxlength="50"
                placeholder="prenom.nom@exemple.com"
                required
              />
            </div>
            <div class="admin-form-group">
              <label for="agent-phone">Téléphone (facultatif)</label>
              <input
                id="agent-phone"
                name="phone"
                type="tel"
                [(ngModel)]="form.phone"
                placeholder="77 123 45 67"
              />
            </div>
          </div>
          @if (!editing()) {
            <p class="form-hint">
              Le compte est créé avec le mot de passe provisoire <code>{{ defaultPassword }}</code
              >. L'agent devra choisir le sien à sa première connexion.
            </p>
          } @else if (editing()!.email !== form.email.trim().toLowerCase()) {
            <p class="form-hint">
              L'e-mail sert d'identifiant : l'agent devra se reconnecter avec la nouvelle adresse.
            </p>
          }
          <div class="admin-modal-footer modal-actions">
            <button
              type="button"
              class="admin-btn admin-btn--outline"
              (click)="formOpen.set(false)"
            >
              Annuler
            </button>
            <button type="submit" class="admin-btn admin-btn--primary" [disabled]="saving()">
              {{ saving() ? 'Enregistrement…' : editing() ? 'Enregistrer' : "Créer l'agent" }}
            </button>
          </div>
        </form>
      </app-admin-modal>

      <!-- Localités de l'agent -->
      <app-admin-modal
        [title]="
          localitiesAgent()
            ? 'Localités de ' + localitiesAgent()!.firstName + ' ' + localitiesAgent()!.lastName
            : ''
        "
        [isOpen]="localitiesAgent() !== null"
        [showFooter]="false"
        (close)="localitiesAgent.set(null)"
      >
        @if (localitiesAgent(); as a) {
          <div class="localities-form">
            <p class="form-hint">
              L'agent inscrit et corrige les salons de ces localités seulement. Sans localité, il
              peut se connecter mais ne peut plus exercer ; le changement est immédiat.
            </p>
            @if (localitiesError()) {
              <div class="form-error">{{ localitiesError() }}</div>
            }
            <div class="localities-list">
              @for (l of assignableLocalities(); track l.id) {
                <label class="localities-option">
                  <input
                    type="checkbox"
                    [checked]="selectedLocalities().has(l.id)"
                    (change)="toggleLocality(l.id)"
                  />
                  <span>{{ l.name }}</span>
                  @if (!l.active) {
                    <span class="muted">(désactivée)</span>
                  }
                </label>
              } @empty {
                <p class="muted">
                  Aucune localité. Créez-les d'abord sur la page
                  <a routerLink="/admin/localites" (click)="localitiesAgent.set(null)">Localités</a
                  >.
                </p>
              }
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="admin-btn admin-btn--outline"
                (click)="localitiesAgent.set(null)"
              >
                Annuler
              </button>
              <button
                type="button"
                class="admin-btn admin-btn--primary"
                [disabled]="savingLocalities()"
                (click)="saveLocalities(a)"
              >
                {{ savingLocalities() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        }
      </app-admin-modal>

      <!-- Identifiants à transmettre -->
      <app-admin-modal
        title="Identifiants à transmettre à l'agent"
        [isOpen]="credentials() !== null"
        [showFooter]="false"
        (close)="credentials.set(null)"
      >
        @if (credentials(); as c) {
          <div class="credentials">
            <p>
              Transmettez ces informations à
              <strong>{{ c.agent.firstName }} {{ c.agent.lastName }}</strong
              >. Le mot de passe provisoire devra être changé à la première connexion.
            </p>
            <dl>
              <div>
                <dt>Lien</dt>
                <dd>{{ loginUrl }}</dd>
              </div>
              <div>
                <dt>Identifiant</dt>
                <dd>{{ c.agent.email }}</dd>
              </div>
              <div>
                <dt>Mot de passe provisoire</dt>
                <dd>
                  <code>{{ c.temporaryPassword }}</code>
                </dd>
              </div>
            </dl>
            <div class="modal-actions">
              <button
                type="button"
                class="admin-btn admin-btn--outline"
                (click)="copyCredentials(c)"
              >
                {{ copied() ? 'Message copié ✓' : 'Copier le message (WhatsApp, SMS…)' }}
              </button>
              <button
                type="button"
                class="admin-btn admin-btn--primary"
                (click)="credentials.set(null)"
              >
                Terminé
              </button>
            </div>
          </div>
        }
      </app-admin-modal>

      <!-- Activité d'un agent -->
      <app-admin-modal
        [title]="detail() ? detail()!.firstName + ' ' + detail()!.lastName : ''"
        [isOpen]="detail() !== null"
        [showFooter]="false"
        (close)="detail.set(null)"
      >
        @if (detail(); as a) {
          <div class="detail">
            <div class="detail__stats">
              <div>
                <strong>{{ a.salonsCount }}</strong
                ><span>salon(s) inscrit(s)</span>
              </div>
              <div>
                <strong>{{ a.lastLoginAt ? formatDate(a.lastLoginAt) : '—' }}</strong>
                <span>dernière connexion</span>
              </div>
              <div>
                <strong>{{ a.createdDate ? formatDate(a.createdDate) : '—' }}</strong
                ><span>compte créé</span>
              </div>
            </div>

            <h3>Salons inscrits</h3>
            @if (detailSalons() === null) {
              <p class="muted">Chargement…</p>
            } @else {
              <ul class="detail__list">
                @for (s of detailSalons(); track s.id) {
                  <li>
                    <span>
                      <strong>{{ s.name }}</strong> — {{ s.localityName || 'sans localité' }},
                      {{ s.district }}
                      <span class="muted"
                        >({{ s.ownerName || 'propriétaire ?' }}, {{ s.phone }})</span
                      >
                    </span>
                    <span class="muted">{{ s.createdDate ? formatDate(s.createdDate) : '' }}</span>
                  </li>
                } @empty {
                  <li class="muted">Aucun salon inscrit.</li>
                }
              </ul>
            }

            <h3>Dernières actions</h3>
            @if (detailActivities() === null) {
              <p class="muted">Chargement…</p>
            } @else {
              <ul class="detail__list">
                @for (act of detailActivities(); track act.id) {
                  <li>
                    <span>
                      <app-admin-badge [variant]="actionVariant(act.action)">{{
                        actionLabel(act.action)
                      }}</app-admin-badge>
                      {{ act.description }}
                    </span>
                    <span class="muted"
                      >{{ formatDateTime(act.createdDate) }} · {{ device(act.userAgent) }}</span
                    >
                  </li>
                } @empty {
                  <li class="muted">Aucune action enregistrée.</li>
                }
              </ul>
            }
            <div class="modal-actions">
              <a
                class="admin-btn admin-btn--outline"
                routerLink="/admin/agents/journal"
                [queryParams]="{ agentId: a.id }"
                (click)="detail.set(null)"
                >Voir tout son journal</a
              >
            </div>
          </div>
        }
      </app-admin-modal>
    </div>
  `,
  styleUrls: ['../users/admin-users-page.scss'],
  styles: `
    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .warning-card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid rgba(220, 38, 38, 0.3);
      background: rgba(220, 38, 38, 0.06);
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);
    }

    .localities-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-width: 140px;
      max-width: 240px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
    }

    .localities-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .localities-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;

      a {
        color: var(--primary, #1e5af0);
      }
    }

    .localities-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--border-color, #e2e8f0);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .info-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(30, 90, 240, 0.25);
      background: rgba(30, 90, 240, 0.06);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary, #0f172a);

      a {
        color: var(--primary, #1e5af0);
        font-weight: 600;
        word-break: break-all;
      }
    }

    code {
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(100, 116, 139, 0.14);
      font-weight: 700;
    }

    .sub,
    .muted {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
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

    .form-hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-secondary, #64748b);
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }

    .credentials {
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 0.875rem;

      p {
        margin: 0;
      }

      dl {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      dt {
        color: var(--text-secondary, #64748b);
      }

      dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
        word-break: break-all;
      }
    }

    .detail {
      display: flex;
      flex-direction: column;
      gap: 12px;

      h3 {
        margin: 8px 0 0;
        font-size: 0.9375rem;
        font-weight: 800;
      }
    }

    .detail__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      div {
        display: flex;
        flex-direction: column;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
        text-align: center;
      }

      span {
        font-size: 0.75rem;
        color: var(--text-secondary, #64748b);
      }
    }

    .detail__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 260px;
      overflow-y: auto;

      li {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid var(--border-color, #e2e8f0);
        font-size: 0.8125rem;
      }
    }
  `,
})
export class AdminAgentsPage implements OnInit {
  protected readonly agentsService = inject(AdminAgentsService);
  private readonly confirmService = inject(AdminConfirmService);
  private readonly errorMessages = inject(HttpErrorMessageService);

  protected readonly loginUrl = `${resolveAppOrigin() || 'https://sansfile.com'}/agent/login`;
  protected readonly defaultPassword = 'sansfile2026@';

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly pageError = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AdminAgent | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected form: AgentFormValue = { firstName: '', lastName: '', email: '', phone: '' };

  protected readonly credentials = signal<AgentCredentials | null>(null);
  protected readonly copied = signal(false);

  protected readonly detail = signal<AdminAgent | null>(null);
  protected readonly detailSalons = signal<AgentSalonSummary[] | null>(null);
  protected readonly detailActivities = signal<AgentActivity[] | null>(null);

  // ── Localités des agents ──
  private readonly localitiesService = inject(AdminLocalitiesService);
  protected readonly localitiesAgent = signal<AdminAgent | null>(null);
  protected readonly selectedLocalities = signal<ReadonlySet<number>>(new Set());
  protected readonly savingLocalities = signal(false);
  protected readonly localitiesError = signal<string | null>(null);
  protected readonly autoAssigning = signal(false);
  protected readonly autoAssignMessage = signal<string | null>(null);

  protected readonly agentsWithoutLocality = computed(
    () =>
      this.agentsService.agents().filter((a) => a.activated && (a.localities?.length ?? 0) === 0)
        .length,
  );

  /** Localités actives, plus celles (désactivées) déjà attribuées à l'agent ouvert. */
  protected readonly assignableLocalities = computed(() => {
    const current = new Set((this.localitiesAgent()?.localities ?? []).map((l) => l.id));
    return this.localitiesService.localities().filter((l) => l.active || current.has(l.id));
  });

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();
    return this.agentsService.agents().filter((a) => {
      const status: StatusFilter = !a.activated
        ? 'disabled'
        : a.mustChangePassword
          ? 'pending'
          : 'active';
      const matchesStatus = filter === 'all' || filter === status;
      const matchesQuery =
        !q ||
        [a.firstName, a.lastName, a.email, a.phone ?? ''].some((v) => v.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.localitiesService.ensureLocalities();
  }

  protected openLocalities(agent: AdminAgent): void {
    this.localitiesService.ensureLocalities();
    this.localitiesAgent.set(agent);
    this.selectedLocalities.set(new Set((agent.localities ?? []).map((l) => l.id)));
    this.localitiesError.set(null);
  }

  protected toggleLocality(id: number): void {
    this.selectedLocalities.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected async saveLocalities(agent: AdminAgent): Promise<void> {
    const ids = [...this.selectedLocalities()];
    if (ids.length === 0 && (agent.localities?.length ?? 0) > 0) {
      const ok = await this.confirmService.confirm({
        title: 'Retirer toutes les localités',
        message: `${agent.firstName} ${agent.lastName} ne pourra plus inscrire ni modifier de salon (il garde l'accès à son espace en lecture).`,
        confirmLabel: 'Retirer',
        variant: 'warning',
      });
      if (!ok) return;
    }
    this.savingLocalities.set(true);
    this.localitiesError.set(null);
    this.agentsService.setLocalities(agent.id, ids).subscribe({
      next: () => {
        this.savingLocalities.set(false);
        this.localitiesAgent.set(null);
      },
      error: (err) => {
        this.savingLocalities.set(false);
        this.localitiesError.set(
          this.errorMessages.message(err, "Les localités n'ont pas pu être enregistrées."),
        );
      },
    });
  }

  protected autoAssign(): void {
    this.autoAssigning.set(true);
    this.autoAssignMessage.set(null);
    this.agentsService.autoAssignLocalities().subscribe({
      next: (res) => {
        this.autoAssigning.set(false);
        this.autoAssignMessage.set(
          `${res.agentsAssigned} agent(s) affecté(s) d'après les localités de leurs salons.` +
            (res.agentsStillWithout > 0
              ? ` ${res.agentsStillWithout} agent(s) restent à affecter à la main (aucun salon rattaché à une localité).`
              : ''),
        );
      },
      error: (err) => {
        this.autoAssigning.set(false);
        this.pageError.set(this.errorMessages.message(err, 'Affectation automatique impossible.'));
      },
    });
  }

  protected reload(): void {
    this.agentsService.load().subscribe({
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Impossible de charger les agents.')),
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form = { firstName: '', lastName: '', email: '', phone: '' };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(agent: AdminAgent): void {
    this.editing.set(agent);
    this.form = {
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone ?? '',
    };
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected saveAgent(): void {
    if (!this.form.firstName.trim() || !this.form.lastName.trim() || !this.form.email.trim()) {
      this.formError.set('Renseignez le prénom, le nom et l’adresse e-mail.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const editing = this.editing();
    const onError = (err: unknown) => {
      this.saving.set(false);
      this.formError.set(this.errorMessages.message(err, "L'agent n'a pas pu être enregistré."));
    };
    if (editing) {
      this.agentsService.update(editing.id, this.form).subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
        },
        error: onError,
      });
      return;
    }
    this.agentsService.create(this.form).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.copied.set(false);
        this.credentials.set(created);
      },
      error: onError,
    });
  }

  protected async resetPassword(agent: AdminAgent): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Réinitialiser le mot de passe',
      message: `Le mot de passe de ${agent.firstName} ${agent.lastName} redeviendra « ${this.defaultPassword} ». Il devra en choisir un nouveau à sa prochaine connexion.`,
      confirmLabel: 'Réinitialiser',
      variant: 'warning',
    });
    if (!ok) return;
    this.agentsService.resetPassword(agent.id).subscribe({
      next: (res) => {
        this.copied.set(false);
        this.credentials.set(res);
      },
      error: (err) =>
        this.pageError.set(this.errorMessages.message(err, 'Réinitialisation impossible.')),
    });
  }

  protected async toggleActivation(agent: AdminAgent): Promise<void> {
    const disabling = agent.activated;
    const ok = await this.confirmService.confirm({
      title: disabling ? 'Désactiver le compte' : 'Réactiver le compte',
      message: disabling
        ? `${agent.firstName} ${agent.lastName} ne pourra plus se connecter. Ses salons et son journal sont conservés.`
        : `${agent.firstName} ${agent.lastName} pourra de nouveau se connecter.`,
      confirmLabel: disabling ? 'Désactiver' : 'Réactiver',
      variant: disabling ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.agentsService.setActivation(agent.id, !disabling).subscribe({
      error: (err) => this.pageError.set(this.errorMessages.message(err, 'Action impossible.')),
    });
  }

  protected openDetail(agent: AdminAgent): void {
    this.detail.set(agent);
    this.detailSalons.set(null);
    this.detailActivities.set(null);
    this.agentsService.salonsOf(agent.id).subscribe({
      next: (list) => this.detailSalons.set(list),
      error: () => this.detailSalons.set([]),
    });
    this.agentsService.activities({ agentId: agent.id, page: 0, size: 20 }).subscribe({
      next: (res) => this.detailActivities.set(res.items),
      error: () => this.detailActivities.set([]),
    });
  }

  protected async copyCredentials(c: AgentCredentials): Promise<void> {
    const message =
      `Bonjour ${c.agent.firstName}, votre compte agent SansFile est prêt.\n` +
      `Connexion : ${this.loginUrl}\n` +
      `Identifiant : ${c.agent.email}\n` +
      `Mot de passe provisoire : ${c.temporaryPassword}\n` +
      `Vous choisirez votre propre mot de passe à la première connexion.`;
    try {
      await navigator.clipboard.writeText(message);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  protected initials(agent: AdminAgent): string {
    return `${agent.firstName?.[0] ?? ''}${agent.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  protected actionLabel = (action: AgentActivity['action']) =>
    AGENT_ACTION_LABELS[action] ?? action;
  protected actionVariant = agentActionVariant;
  protected device = describeDevice;

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
}
