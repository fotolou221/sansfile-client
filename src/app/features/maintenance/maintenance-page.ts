import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';

/** Vérification automatique de la fin de maintenance (en plus du flux temps réel). */
const CHECK_INTERVAL_MS = 30_000;

/**
 * Page unique affichée pendant la maintenance : l'application est fermée,
 * et la page demandée se rouvre d'elle-même dès que l'admin lève la maintenance.
 * Toujours sur fond marine (comme le hero de la vitrine), quel que soit le thème.
 */
@Component({
  selector: 'app-maintenance-page',
  template: `
    <main class="maintenance">
      <span class="maintenance__disc maintenance__disc--mid" aria-hidden="true"></span>
      <span class="maintenance__disc maintenance__disc--blue" aria-hidden="true"></span>

      <section class="maintenance__content" aria-labelledby="maintenance-title">
        <img
          class="maintenance__logo"
          src="images/sansfile-logo-horizontal-white.png"
          alt="SansFile"
          width="1232"
          height="232"
        />

        <div class="maintenance__icon" aria-hidden="true">
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

        <h1 id="maintenance-title" class="maintenance__title">
          On revient <span class="maintenance__title-tag">très vite.</span>
        </h1>
        <p class="maintenance__lead" role="status">
          SansFile est en maintenance pour quelques instants. Tes tickets et ton compte sont bien
          conservés.
        </p>

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
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            [class.maintenance__spin]="checking()"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          {{ checking() ? 'Vérification…' : 'Réessayer' }}
        </button>
        <span class="maintenance__auto">La page se rouvre toute seule dès que c’est fini.</span>

        <a
          class="maintenance__contact"
          [href]="'https://wa.me/' + settings.contactPhoneDigits()"
          target="_blank"
          rel="noopener"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41"
            />
          </svg>
          <span>Une urgence&nbsp;? {{ settings.contactPhone() }}</span>
        </a>
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
