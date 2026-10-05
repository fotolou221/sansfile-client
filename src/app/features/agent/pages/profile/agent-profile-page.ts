import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformSettingsService } from '../../../../shared/services/platform-settings.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { AgentAuthService } from '../../services/agent-auth.service';

/** Profil de l'agent : identité, mot de passe, thème, contact de l'administration, déconnexion. */
@Component({
  selector: 'app-agent-profile-page',
  imports: [RouterLink],
  template: `
    <div class="agent-page">
      <div class="identity">
        <span class="identity__avatar" aria-hidden="true">{{ auth.initials() }}</span>
        <div>
          <h1 class="agent-title">{{ auth.displayName() }}</h1>
          <p class="agent-subtitle">Agent de terrain SansFile</p>
        </div>
      </div>

      <section class="agent-card">
        <h2 class="agent-card__title">Mon compte</h2>
        <dl class="infos">
          <div>
            <dt>E-mail (identifiant)</dt>
            <dd>{{ auth.profile()?.email }}</dd>
          </div>
          <div>
            <dt>Téléphone</dt>
            <dd>{{ auth.profile()?.phone || 'Non renseigné' }}</dd>
          </div>
        </dl>
        <a routerLink="/agent/mot-de-passe" class="agent-btn agent-btn--outline agent-btn--block">
          Changer mon mot de passe
        </a>
      </section>

      <section class="agent-card">
        <h2 class="agent-card__title">Apparence</h2>
        <div class="theme-switch" role="radiogroup" aria-label="Thème de l'application">
          @for (option of themes; track option.value) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme.theme() === option.value"
              [class.active]="theme.theme() === option.value"
              (click)="theme.setTheme(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </section>

      <section class="agent-card">
        <h2 class="agent-card__title">Besoin d'aide ?</h2>
        <p class="agent-subtitle">
          Mot de passe oublié, salon à corriger, numéro de coiffeur erroné : contactez
          l'administration SansFile.
        </p>
        <div class="contact">
          <a class="agent-btn agent-btn--outline" [href]="'tel:' + settings.contactPhone()"
            >Appeler</a
          >
          <a
            class="agent-btn agent-btn--outline"
            [href]="'https://wa.me/' + settings.contactPhoneDigits()"
            target="_blank"
            rel="noopener"
            >WhatsApp</a
          >
        </div>
      </section>

      <button
        type="button"
        class="agent-btn agent-btn--danger agent-btn--block"
        (click)="auth.logout()"
      >
        Se déconnecter
      </button>
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .identity {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .identity__avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--primary, #1e5af0);
      color: #ffffff;
      font-size: 1.125rem;
      font-weight: 800;
      flex-shrink: 0;
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
        font-weight: 600;
        text-align: right;
        word-break: break-all;
        color: var(--text-primary, #0f172a);
      }
    }

    .theme-switch {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;

      button {
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
        background: transparent;
        color: var(--text-primary, #0f172a);
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;

        &.active {
          border-color: var(--primary, #1e5af0);
          color: var(--primary, #1e5af0);
          background: rgba(30, 90, 240, 0.08);
        }
      }
    }

    .contact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  `,
})
export class AgentProfilePage {
  protected readonly auth = inject(AgentAuthService);
  protected readonly settings = inject(PlatformSettingsService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes = [
    { value: 'light' as const, label: 'Clair' },
    { value: 'dark' as const, label: 'Sombre' },
    { value: 'system' as const, label: 'Système' },
  ];
}
