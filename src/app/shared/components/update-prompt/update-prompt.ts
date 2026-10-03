import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PwaService } from '../../services/pwa.service';

/** Pages de la vitrine : le popup n'y apparaît jamais (la nouvelle version s'applique à la prochaine visite). */
const VITRINE_PATHS = new Set(['', '/', '/vitrine']);

/**
 * Popup « Nouvelle version disponible » affiché après un déploiement, quand le service worker
 * a téléchargé la nouvelle version : l'utilisateur choisit le moment du rechargement.
 */
@Component({
  selector: 'app-update-prompt',
  template: `
    @if (isVisible()) {
      <div class="update-prompt-backdrop">
        <div
          class="update-prompt"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="update-prompt-title"
          aria-describedby="update-prompt-desc"
        >
          <div class="update-prompt__header">
            <div class="update-prompt__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <h2 id="update-prompt-title" class="update-prompt__title">
              Nouvelle version disponible
            </h2>
          </div>

          <p id="update-prompt-desc" class="update-prompt__desc">
            SansFile a été mis à jour. Mettez à jour pour profiter des dernières améliorations.
          </p>

          <div class="update-prompt__actions">
            <button
              type="button"
              class="update-prompt__btn update-prompt__btn--secondary"
              [disabled]="pwa.updateApplying()"
              (click)="pwa.dismissUpdate()"
            >
              Plus tard
            </button>
            <button
              type="button"
              class="update-prompt__btn update-prompt__btn--primary"
              [disabled]="pwa.updateApplying()"
              (click)="pwa.applyUpdate()"
            >
              {{ pwa.updateApplying() ? 'Mise à jour…' : 'Mettre à jour' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './update-prompt.scss',
})
export class UpdatePrompt {
  protected readonly pwa = inject(PwaService);
  private readonly router = inject(Router);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url),
      startWith(typeof window !== 'undefined' ? window.location.pathname : ''),
      map((url) => url.split(/[?#]/)[0]),
    ),
    { initialValue: '' },
  );

  protected readonly isVisible = computed(
    () => this.pwa.showUpdatePrompt() && !VITRINE_PATHS.has(this.currentPath()),
  );
}
