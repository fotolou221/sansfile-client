import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AgentDataService } from '../../services/agent-data.service';
import { AgentSalonItem } from '../../components/agent-salon-item';
import { AgentSalon } from '../../models/agent';

type SalonTab = 'mine' | 'zone';

/**
 * Salons de l'agent : ceux qu'il a inscrits, ou tous ceux de ses localités (inscrits par d'autres
 * agents ou par l'administration), avec recherche.
 */
@Component({
  selector: 'app-agent-salons-page',
  imports: [RouterLink, AgentSalonItem],
  template: `
    <div class="agent-page">
      <div class="agent-page__header">
        <div>
          <h1 class="agent-title">{{ tab() === 'mine' ? 'Mes salons' : 'Salons de ma zone' }}</h1>
          <p class="agent-subtitle">
            {{ current().length }} salon{{ current().length > 1 ? 's' : '' }}
            {{
              tab() === 'mine'
                ? 'inscrit' + (current().length > 1 ? 's' : '')
                : 'dans vos localités'
            }}
          </p>
        </div>
        @if (auth.hasLocality()) {
          <a
            routerLink="/agent/salons/nouveau"
            class="agent-btn agent-btn--primary"
            aria-label="Inscrire un salon"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </a>
        }
      </div>

      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab() === 'mine'"
          [class.tabs__item--active]="tab() === 'mine'"
          class="tabs__item"
          (click)="selectTab('mine')"
        >
          Inscrits par moi
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab() === 'zone'"
          [class.tabs__item--active]="tab() === 'zone'"
          class="tabs__item"
          (click)="selectTab('zone')"
        >
          Ma zone
        </button>
      </div>

      <div class="agent-field">
        <input
          type="search"
          placeholder="Rechercher un salon, un quartier, un propriétaire…"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          aria-label="Rechercher un salon"
        />
      </div>

      @if (error()) {
        <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
      } @else if (loading() && current().length === 0) {
        <div class="agent-skeleton"></div>
        <div class="agent-skeleton"></div>
        <div class="agent-skeleton"></div>
      } @else {
        <div class="agent-salon-list">
          @for (salon of filtered(); track salon.id) {
            <app-agent-salon-item [salon]="salon" />
          } @empty {
            <div class="agent-empty">
              @if (query()) {
                Aucun salon ne correspond à « {{ query() }} ».
              } @else if (tab() === 'mine') {
                Vous n'avez encore inscrit aucun salon.
              } @else if (!auth.hasLocality()) {
                Vous n'êtes affecté à aucune localité.
              } @else {
                Aucun salon dans vos localités pour l'instant.
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
    }

    .tabs__item {
      padding: 8px;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: var(--text-secondary, #64748b);
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;

      &--active {
        background: var(--primary, #1e5af0);
        color: #ffffff;
      }
    }
  `,
})
export class AgentSalonsPage implements OnInit {
  protected readonly data = inject(AgentDataService);
  protected readonly auth = inject(AgentAuthService);

  protected readonly tab = signal<SalonTab>('mine');
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly zone = signal<AgentSalon[] | null>(null);

  protected readonly current = computed(() =>
    this.tab() === 'mine' ? this.data.salons() : (this.zone() ?? []),
  );

  protected readonly filtered = computed(() => {
    const q = this.normalize(this.query());
    const list = this.current();
    if (!q) return list;
    return list.filter((s) =>
      [s.name, s.district, s.location, s.localityName, s.ownerName, s.phone].some((v) =>
        this.normalize(v ?? '').includes(q),
      ),
    );
  });

  ngOnInit(): void {
    this.data.mySalons().subscribe({
      next: () => this.loading.set(false),
      error: (err) => this.onError(err, 'Impossible de charger vos salons.'),
    });
  }

  protected selectTab(tab: SalonTab): void {
    this.tab.set(tab);
    this.error.set(null);
    if (tab === 'zone' && this.zone() === null) {
      this.loading.set(true);
      this.data.zoneSalons().subscribe({
        next: (list) => {
          this.zone.set(list);
          this.loading.set(false);
        },
        error: (err) => this.onError(err, 'Impossible de charger les salons de votre zone.'),
      });
    }
  }

  private onError(err: unknown, fallback: string): void {
    this.loading.set(false);
    if (!this.auth.handleApiError(err)) {
      this.error.set(this.auth.errorMessage(err, fallback));
    }
  }

  private normalize(value: string): string {
    // Recherche sans accents : « medina » trouve « Médina »
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  }
}
