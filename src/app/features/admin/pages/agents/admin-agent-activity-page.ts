import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorMessageService } from '../../../../shared/services/http-error-message.service';
import { AdminBadge } from '../../components/admin-badge/admin-badge';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';
import {
  AdminAgentsService,
  AGENT_ACTION_LABELS,
  AgentActionType,
  AgentActivity,
  agentActionVariant,
  describeDevice,
} from '../../services/admin-agents.service';

/** Journal des agents de terrain : toutes leurs actions et celles de l'admin sur leurs comptes. */
@Component({
  selector: 'app-admin-agent-activity-page',
  imports: [FormsModule, RouterLink, AdminBadge, AdminPagination],
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Journal des agents</h1>
          <p>
            Connexions, salons inscrits ou modifiés, mots de passe, comptes créés ou désactivés :
            tout est tracé, du plus récent au plus ancien.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/agents" class="admin-btn admin-btn--outline">Agents de terrain</a>
          <button type="button" class="admin-btn admin-btn--primary" (click)="load()">
            Actualiser
          </button>
        </div>
      </div>

      <div class="admin-toolbar">
        <select
          class="admin-select"
          [ngModel]="agentId()"
          (ngModelChange)="onAgentChange($event)"
          aria-label="Agent"
        >
          <option [ngValue]="null">Tous les agents</option>
          @for (agent of agentsService.agents(); track agent.id) {
            <option [ngValue]="agent.id">{{ agent.firstName }} {{ agent.lastName }}</option>
          }
        </select>
        <select
          class="admin-select"
          [ngModel]="action()"
          (ngModelChange)="onActionChange($event)"
          aria-label="Action"
        >
          <option [ngValue]="null">Toutes les actions</option>
          @for (option of actionOptions; track option.value) {
            <option [ngValue]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      @if (error()) {
        <div class="form-error">{{ error() }}</div>
      }

      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Action</th>
                <th>Détail</th>
                <th>Par</th>
                <th>Appareil · IP</th>
              </tr>
            </thead>
            <tbody>
              @for (act of items(); track act.id) {
                <tr>
                  <td class="nowrap">{{ formatDateTime(act.createdDate) }}</td>
                  <td>
                    <strong>{{ act.agentName }}</strong>
                    <div class="sub">{{ act.agentEmail }}</div>
                  </td>
                  <td>
                    <app-admin-badge [variant]="variant(act.action)">{{
                      label(act.action)
                    }}</app-admin-badge>
                  </td>
                  <td class="detail">{{ act.description || '—' }}</td>
                  <td class="sub">{{ act.actor || '—' }}</td>
                  <td class="sub">
                    {{ device(act.userAgent) }}
                    @if (act.ipAddress) {
                      <div>{{ act.ipAddress }}</div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="admin-table__empty">
                    {{
                      loading()
                        ? 'Chargement du journal…'
                        : 'Aucune action enregistrée pour ces filtres.'
                    }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-admin-pagination
          [totalItems]="total()"
          [pageSize]="pageSize()"
          [currentPage]="page()"
          [pageSizeOptions]="[25, 50, 100]"
          (pageChange)="onPage($event)"
          (pageSizeChange)="onPageSize($event)"
        />
      </div>
    </div>
  `,
  styleUrls: ['../users/admin-users-page.scss'],
  styles: `
    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .sub {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
    }

    .nowrap {
      white-space: nowrap;
    }

    .detail {
      min-width: 220px;
      font-size: 0.8125rem;
    }

    .form-error {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.3);
      color: var(--danger, #dc2626);
      font-size: 0.875rem;
    }
  `,
})
export class AdminAgentActivityPage implements OnInit {
  protected readonly agentsService = inject(AdminAgentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly errorMessages = inject(HttpErrorMessageService);

  protected readonly actionOptions = (Object.keys(AGENT_ACTION_LABELS) as AgentActionType[]).map(
    (value) => ({
      value,
      label: AGENT_ACTION_LABELS[value],
    }),
  );

  protected readonly agentId = signal<number | null>(null);
  protected readonly action = signal<AgentActionType | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(50);
  protected readonly items = signal<AgentActivity[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly label = (action: AgentActionType) => AGENT_ACTION_LABELS[action] ?? action;
  protected readonly variant = agentActionVariant;
  protected readonly device = describeDevice;

  ngOnInit(): void {
    const agentId = Number(this.route.snapshot.queryParamMap.get('agentId'));
    if (agentId) this.agentId.set(agentId);
    if (!this.agentsService.loaded()) {
      this.agentsService.load().subscribe({ error: () => undefined });
    }
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.agentsService
      .activities({
        agentId: this.agentId(),
        action: this.action(),
        page: this.page() - 1,
        size: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(this.errorMessages.message(err, 'Impossible de charger le journal.'));
        },
      });
  }

  protected onAgentChange(agentId: number | null): void {
    this.agentId.set(agentId);
    this.page.set(1);
    this.load();
  }

  protected onActionChange(action: AgentActionType | null): void {
    this.action.set(action);
    this.page.set(1);
    this.load();
  }

  protected onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
}
