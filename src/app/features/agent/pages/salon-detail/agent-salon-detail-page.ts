import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { buildSalonTicketUrl } from '../../../../core/config/app-origin';
import { QrCode } from '../../../../shared/components/qr-code/qr-code';
import { AgentSalon } from '../../models/agent';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AgentDataService } from '../../services/agent-data.service';

/** Fiche d'un salon inscrit : informations, QR code à remettre au salon, prochaines étapes. */
@Component({
  selector: 'app-agent-salon-detail-page',
  imports: [RouterLink, QrCode],
  template: `
    <div class="agent-page">
      <a routerLink="/agent/salons" class="agent-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Mes salons
      </a>

      @if (justCreated()) {
        <div class="agent-alert agent-alert--success" role="status">
          Salon inscrit ! Le compte du coiffeur est prêt : il se connecte avec son numéro.
        </div>
      }
      @if (justUpdated()) {
        <div class="agent-alert agent-alert--success" role="status">Fiche mise à jour.</div>
      }
      @if (error()) {
        <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
      }

      @if (!salon() && !error()) {
        <div class="agent-skeleton" style="height: 180px"></div>
        <div class="agent-skeleton"></div>
      }

      @if (salon(); as s) {
        <section class="agent-card salon-card">
          @if (s.coverUrl || s.avatarUrl) {
            <img class="salon-card__cover" [src]="s.coverUrl || s.avatarUrl" [alt]="s.name" />
          }
          <div class="salon-card__head">
            <div>
              <h1 class="agent-title">{{ s.name }}</h1>
              <p class="agent-subtitle">
                {{ s.localityName ? s.localityName + ' — ' : '' }}{{ s.district }}, {{ s.location }}
              </p>
            </div>
            <span
              class="agent-chip"
              [class.agent-chip--open]="s.status === 'OPEN'"
              [class.agent-chip--closed]="s.status !== 'OPEN'"
            >
              {{ s.status === 'OPEN' ? 'Ouvert' : 'Fermé' }}
            </span>
          </div>

          <dl class="infos">
            <div>
              <dt>Propriétaire</dt>
              <dd>{{ s.ownerName || '—' }}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>
                @if (s.phone) {
                  <a [href]="'tel:' + s.phone">{{ s.phone }}</a>
                } @else {
                  —
                }
              </dd>
            </div>
            @if (s.address) {
              <div>
                <dt>Adresse</dt>
                <dd>{{ s.address }}</dd>
              </div>
            }
            @if (s.openingHours) {
              <div>
                <dt>Horaires</dt>
                <dd>{{ s.openingHours }}</dd>
              </div>
            }
            <div>
              <dt>Position</dt>
              <dd>
                @if (s.latitude && s.longitude) {
                  <a
                    [href]="'https://www.google.com/maps?q=' + s.latitude + ',' + s.longitude"
                    target="_blank"
                    rel="noopener"
                    >Voir sur la carte</a
                  >
                } @else {
                  Non renseignée
                }
              </dd>
            </div>
            @if (s.createdDate) {
              <div>
                <dt>Inscrit le</dt>
                <dd>{{ formatDate(s.createdDate) }}</dd>
              </div>
            }
          </dl>

          @if (canEdit()) {
            <a
              [routerLink]="['/agent/salons', s.id, 'modifier']"
              class="agent-btn agent-btn--outline agent-btn--block"
            >
              Corriger la fiche
            </a>
          }
        </section>

        <section class="agent-card qr-card">
          <h2 class="agent-card__title">QR code du salon</h2>
          <p class="agent-subtitle">
            À imprimer ou à montrer au salon : les clients le scannent pour prendre un ticket.
          </p>
          <app-qr-code
            [value]="ticketUrl()"
            [size]="200"
            [showDownloadButtons]="true"
            [downloadFileName]="'sansfile-' + s.slug + '-qrcode'"
          />
          <button
            type="button"
            class="agent-btn agent-btn--outline agent-btn--block"
            (click)="share()"
          >
            {{ copied() ? 'Lien copié ✓' : 'Partager le lien du salon' }}
          </button>
        </section>

        <section class="agent-card">
          <h2 class="agent-card__title">À expliquer au coiffeur</h2>
          <ol class="steps">
            <li>
              Ouvrir <strong>sansfile.com</strong> sur son téléphone et installer l'application.
            </li>
            <li>
              Se connecter avec le numéro <strong>{{ s.phone }}</strong> (code reçu par SMS).
            </li>
            <li>
              Ouvrir son salon depuis son espace : les clients peuvent alors prendre un ticket.
            </li>
          </ol>
        </section>
      }
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .salon-card__cover {
      width: calc(100% + 32px);
      margin: -18px -16px 0;
      height: 170px;
      object-fit: cover;
      border-radius: 18px 18px 0 0;
    }

    .salon-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .infos {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.875rem;
      }

      dt {
        color: var(--text-secondary, #64748b);
      }

      dd {
        margin: 0;
        text-align: right;
        font-weight: 600;
        color: var(--text-primary, #0f172a);
      }

      a {
        color: var(--primary, #1e5af0);
      }
    }

    .qr-card {
      align-items: center;
      text-align: center;
    }

    .steps {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text-primary, #0f172a);
    }
  `,
})
export class AgentSalonDetailPage implements OnInit {
  private readonly data = inject(AgentDataService);
  private readonly auth = inject(AgentAuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly salon = signal<AgentSalon | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly justCreated = signal(false);
  protected readonly justUpdated = signal(false);

  protected readonly ticketUrl = computed(() => {
    const s = this.salon();
    return s ? buildSalonTicketUrl(s.slug || String(s.id)) : '';
  });
  /** Salon de ses localités (ou inscrit par lui avant les localités) : correction possible. */
  protected readonly canEdit = computed(() => {
    const s = this.salon();
    return !!s && this.auth.canEditSalon(s);
  });

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    this.justCreated.set(params.has('nouveau'));
    this.justUpdated.set(params.has('modifie'));
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      this.salon.set(await firstValueFrom(this.data.salon(id)));
    } catch (err) {
      this.error.set(this.auth.errorMessage(err, 'Salon introuvable.'));
    }
  }

  protected async share(): Promise<void> {
    const s = this.salon();
    if (!s) return;
    const url = this.ticketUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: s.name,
          text: `Prenez votre ticket chez ${s.name} sur SansFile`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      // Partage annulé par l'utilisateur : rien à faire
    }
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
