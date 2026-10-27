import { Component, inject, input } from '@angular/core';
import { UserPositionService } from '../../services/user-position.service';

/**
 * Demande d'autorisation de la position, affichée à la place des salons et de la boutique tant que la position
 * du téléphone est inconnue : SansFile montre les salons autour du client et la boutique la plus proche.
 */
@Component({
  selector: 'app-position-required',
  template: `
    <section class="position-required" aria-live="polite">
      <span class="position-required__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      </span>

      @switch (positions.status()) {
        @case ('locating') {
          <span class="position-required__title">Recherche de votre position…</span>
          <span class="position-required__text"
            >Quelques secondes, le temps que le GPS vous trouve.</span
          >
          <span class="position-required__spinner" aria-hidden="true"></span>
        }
        @case ('denied') {
          <span class="position-required__title">Votre position est bloquée</span>
          <span class="position-required__text">
            Touchez le cadenas à côté de l'adresse (ou ⋮ puis « Paramètres du site »), autorisez «
            Position », puis réessayez.
          </span>
          <button type="button" class="position-required__btn" (click)="positions.locate()">
            Réessayer
          </button>
        }
        @case ('unavailable') {
          <span class="position-required__title">Position introuvable</span>
          <span class="position-required__text">
            Activez la localisation (GPS) de votre téléphone, puis réessayez.
          </span>
          <button type="button" class="position-required__btn" (click)="positions.locate()">
            Réessayer
          </button>
        }
        @case ('unsupported') {
          <span class="position-required__title">Localisation impossible</span>
          <span class="position-required__text">
            Ce navigateur ne permet pas de vous localiser. Ouvrez SansFile dans Chrome ou Safari à
            jour.
          </span>
        }
        @default {
          <span class="position-required__title">{{ title() }}</span>
          <span class="position-required__text">{{ text() }}</span>
          <button type="button" class="position-required__btn" (click)="positions.locate()">
            Autoriser ma position
          </button>
          <span class="position-required__note">
            Votre position reste sur votre téléphone : elle sert à trier les salons par distance.
          </span>
        }
      }
    </section>
  `,
  styleUrl: './position-required.scss',
})
export class PositionRequired {
  protected readonly positions = inject(UserPositionService);

  readonly title = input('Les salons autour de vous');
  readonly text = input(
    'Autorisez votre position pour voir les salons les plus proches de vous, triés par distance.',
  );
}
