import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';

/** Vérification automatique de la fin de maintenance (en plus du flux temps réel). */
const CHECK_INTERVAL_MS = 30_000;

/**
 * Page unique affichée pendant la maintenance : l'application est fermée,
 * et la page demandée se rouvre d'elle-même dès que l'admin lève la maintenance.
 */
@Component({
  selector: 'app-maintenance-page',
  template: `
    <main class="maintenance">
      <div class="maintenance__glow maintenance__glow--primary" aria-hidden="true"></div>
      <div class="maintenance__glow maintenance__glow--accent" aria-hidden="true"></div>

      <section class="maintenance__card" aria-labelledby="maintenance-title">
        <img
          class="maintenance__logo maintenance__logo--light"
          src="images/sansfile-logo.png"
          alt="SansFile"
        />
        <img
          class="maintenance__logo maintenance__logo--dark"
          src="images/sansfile-logo-white.png"
          alt="SansFile"
        />

        <div class="maintenance__illustration" aria-hidden="true">
          <svg class="maintenance__gear maintenance__gear--big" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="34" class="maintenance__gear-teeth" />
            <circle cx="50" cy="50" r="26" class="maintenance__gear-body" />
            <circle cx="50" cy="50" r="10" class="maintenance__gear-hole" />
          </svg>
          <svg class="maintenance__gear maintenance__gear--small" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="34" class="maintenance__gear-teeth" />
            <circle cx="50" cy="50" r="26" class="maintenance__gear-body" />
            <circle cx="50" cy="50" r="10" class="maintenance__gear-hole" />
          </svg>
          <div class="maintenance__badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              />
            </svg>
          </div>
        </div>

        <span class="maintenance__pill" role="status">
          <span class="maintenance__pill-dot"></span>
          Maintenance en cours
        </span>

        <h1 id="maintenance-title" class="maintenance__title">On améliore SansFile pour vous</h1>
        <p class="maintenance__lead">
          La plateforme est momentanément en maintenance : la prise de ticket, la boutique et
          l'application sont indisponibles pendant quelques instants.
        </p>

        <div class="maintenance__reassure">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Vos tickets, vos proches et votre compte sont bien conservés.</span>
        </div>

        <button
          type="button"
          class="maintenance__retry"
          (click)="checkNow()"
          [disabled]="checking()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            [class.maintenance__spin]="checking()"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {{ checking() ? 'Vérification…' : 'Réessayer maintenant' }}
        </button>
        <span class="maintenance__auto">
          L'application se rouvrira toute seule dès la fin de la maintenance.
          @if (settings.lastCheck(); as last) {
            Dernière vérification à {{ formatTime(last) }}.
          }
        </span>

        <div class="maintenance__contact">
          <span class="maintenance__contact-label">Une urgence ?</span>
          <a
            class="maintenance__contact-link"
            [href]="'https://wa.me/' + settings.contactPhoneDigits()"
            target="_blank"
            rel="noopener"
            >WhatsApp</a
          >
          <a class="maintenance__contact-link" [href]="'tel:+' + settings.contactPhoneDigits()">{{
            settings.contactPhone()
          }}</a>
          <a class="maintenance__contact-link" [href]="'mailto:' + settings.contactEmail()">{{
            settings.contactEmail()
          }}</a>
        </div>
      </section>
    </main>
  `,
  styleUrl: './maintenance-page.scss',
})
export class MaintenancePage implements OnInit {
  protected readonly settings = inject(PlatformSettingsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly checking = signal(false);

  constructor() {
    // Fin de maintenance (ou page ouverte hors maintenance) : retour à la page demandée
    effect(() => {
      if (this.settings.loaded() && !this.settings.maintenanceMode()) {
        void this.router.navigateByUrl(this.returnUrl(), { replaceUrl: true });
      }
    });
  }

  ngOnInit(): void {
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void this.settings.refresh();
      }
    }, CHECK_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected async checkNow(): Promise<void> {
    this.checking.set(true);
    await this.settings.refresh();
    this.checking.set(false);
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Seules les adresses internes sont acceptées (pas de redirection vers un autre site). */
  private returnUrl(): string {
    const target = this.route.snapshot.queryParamMap.get('retour');
    return target &&
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.startsWith('/maintenance')
      ? target
      : '/';
  }
}
