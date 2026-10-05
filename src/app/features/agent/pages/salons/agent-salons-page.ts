import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AgentDataService } from '../../services/agent-data.service';
import { AgentSalonItem } from '../../components/agent-salon-item';

/** Tous les salons inscrits par l'agent, avec recherche. */
@Component({
  selector: 'app-agent-salons-page',
  imports: [RouterLink, AgentSalonItem],
  template: `
    <div class="agent-page">
      <div class="agent-page__header">
        <div>
          <h1 class="agent-title">Mes salons</h1>
          <p class="agent-subtitle">
            {{ data.salons().length }} salon{{ data.salons().length > 1 ? 's' : '' }} inscrit{{
              data.salons().length > 1 ? 's' : ''
            }}
          </p>
        </div>
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
      } @else if (loading() && data.salons().length === 0) {
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
              } @else {
                Vous n'avez encore inscrit aucun salon.
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
})
export class AgentSalonsPage implements OnInit {
  protected readonly data = inject(AgentDataService);
  private readonly auth = inject(AgentAuthService);

  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.normalize(this.query());
    if (!q) return this.data.salons();
    return this.data
      .salons()
      .filter((s) =>
        [s.name, s.district, s.location, s.ownerName, s.phone].some((v) =>
          this.normalize(v ?? '').includes(q),
        ),
      );
  });

  ngOnInit(): void {
    this.data.mySalons().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        if (!this.auth.handleApiError(err)) {
          this.error.set(this.auth.errorMessage(err, 'Impossible de charger vos salons.'));
        }
      },
    });
  }

  private normalize(value: string): string {
    // Recherche sans accents : « medina » trouve « Médina »
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  }
}
