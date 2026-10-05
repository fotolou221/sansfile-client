import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgentDashboard } from '../../models/agent';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AgentDataService } from '../../services/agent-data.service';
import { AgentSalonItem } from '../../components/agent-salon-item';

/** Accueil de l'agent : ses chiffres et ses derniers salons inscrits. */
@Component({
  selector: 'app-agent-home-page',
  imports: [RouterLink, AgentSalonItem],
  template: `
    <div class="agent-page">
      @if (passwordChanged()) {
        <div class="agent-alert agent-alert--success" role="status">
          Mot de passe enregistré. Votre compte est prêt.
        </div>
      }

      <div>
        <h1 class="agent-title">Bonjour {{ auth.profile()?.firstName }} 👋</h1>
        <p class="agent-subtitle">Inscrivez les salons que vous rencontrez sur le terrain.</p>
      </div>

      <div class="agent-stats">
        <div class="agent-stat">
          <span class="agent-stat__value">{{ dashboard()?.salonsThisWeek ?? '–' }}</span>
          <span class="agent-stat__label">Cette semaine</span>
        </div>
        <div class="agent-stat">
          <span class="agent-stat__value">{{ dashboard()?.salonsThisMonth ?? '–' }}</span>
          <span class="agent-stat__label">Ce mois-ci</span>
        </div>
        <div class="agent-stat">
          <span class="agent-stat__value">{{ dashboard()?.salonsTotal ?? '–' }}</span>
          <span class="agent-stat__label">Au total</span>
        </div>
      </div>

      <a routerLink="/agent/salons/nouveau" class="agent-btn agent-btn--primary agent-btn--block">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Inscrire un nouveau salon
      </a>

      <section class="agent-card">
        <div class="section-head">
          <h2 class="agent-card__title">Derniers salons inscrits</h2>
          @if ((dashboard()?.salonsTotal ?? 0) > 0) {
            <a routerLink="/agent/salons" class="see-all">Tout voir</a>
          }
        </div>

        @if (error()) {
          <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
        } @else if (!dashboard()) {
          <div class="agent-skeleton"></div>
          <div class="agent-skeleton"></div>
        } @else {
          <div class="agent-salon-list">
            @for (salon of dashboard()!.recentSalons; track salon.id) {
              <app-agent-salon-item [salon]="salon" />
            } @empty {
              <div class="agent-empty">
                Aucun salon inscrit pour l'instant.<br />
                Touchez « Inscrire » pour ajouter votre premier salon.
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .see-all {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary, #1e5af0);
      text-decoration: none;
    }
  `,
})
export class AgentHomePage implements OnInit {
  protected readonly auth = inject(AgentAuthService);
  private readonly data = inject(AgentDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly dashboard = signal<AgentDashboard | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly passwordChanged = signal(false);

  ngOnInit(): void {
    this.passwordChanged.set(this.route.snapshot.queryParamMap.get('motdepasse') === 'ok');
    this.data.dashboard().subscribe({
      next: (d) => this.dashboard.set(d),
      error: (err) => {
        if (!this.auth.handleApiError(err)) {
          this.error.set(this.auth.errorMessage(err, 'Impossible de charger vos statistiques.'));
        }
      },
    });
  }
}
