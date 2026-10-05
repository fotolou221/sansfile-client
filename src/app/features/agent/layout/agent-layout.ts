import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AgentAuthService } from '../services/agent-auth.service';

/** Cadre de l'espace agent : en-tête, contenu, barre de navigation en bas (pouce, téléphone). */
@Component({
  selector: 'app-agent-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="agent-shell" [class.agent-shell--locked]="auth.mustChangePassword()">
      <header class="agent-header">
        <a routerLink="/agent" class="agent-header__brand" aria-label="Accueil de l'espace agent">
          <img
            src="images/sansfile-logo.png"
            alt="SansFile"
            class="agent-header__logo agent-header__logo--light"
          />
          <img
            src="images/sansfile-logo-white.png"
            alt="SansFile"
            class="agent-header__logo agent-header__logo--dark"
          />
          <span class="agent-header__tag">Agent terrain</span>
        </a>
        <a
          routerLink="/agent/profil"
          class="agent-header__avatar"
          [attr.aria-label]="'Profil de ' + auth.displayName()"
        >
          {{ auth.initials() }}
        </a>
      </header>

      <main class="agent-main">
        <router-outlet />
      </main>

      @if (!auth.mustChangePassword()) {
        <nav class="agent-nav" aria-label="Navigation de l'espace agent">
          <a
            routerLink="/agent"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="agent-nav__item"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>Accueil</span>
          </a>
          <a
            routerLink="/agent/salons"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="agent-nav__item"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="4" cy="6" r="1" />
              <circle cx="4" cy="12" r="1" />
              <circle cx="4" cy="18" r="1" />
            </svg>
            <span>Mes salons</span>
          </a>
          <a
            routerLink="/agent/salons/nouveau"
            routerLinkActive="active"
            class="agent-nav__item agent-nav__item--main"
          >
            <span class="agent-nav__plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span>Inscrire</span>
          </a>
          <a routerLink="/agent/profil" routerLinkActive="active" class="agent-nav__item">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profil</span>
          </a>
        </nav>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-page, #ffffff);
    }

    .agent-shell {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .agent-header {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
      background: var(--bg-card, #ffffff);
      border-bottom: 1px solid var(--border-color, #e2e8f0);
    }

    .agent-header__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .agent-header__logo {
      height: 28px;
      width: auto;

      &--dark {
        display: none;
      }
    }

    .agent-header__tag {
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: rgba(30, 90, 240, 0.1);
      color: var(--primary, #1e5af0);
    }

    .agent-header__avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--primary, #1e5af0);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.8125rem;
      text-decoration: none;
    }

    .agent-main {
      flex: 1;
      padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    }

    .agent-shell--locked .agent-main {
      padding-bottom: 24px;
    }

    .agent-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      max-width: 720px;
      margin: 0 auto;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
      background: var(--bg-card, #ffffff);
      border-top: 1px solid var(--border-color, #e2e8f0);

      @media (min-width: 720px) {
        bottom: 12px;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 20px;
      }
    }

    .agent-nav__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: 56px;
      border-radius: 14px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-decoration: none;
      color: var(--text-secondary, #64748b);

      svg {
        width: 22px;
        height: 22px;
      }

      &.active {
        color: var(--primary, #1e5af0);
      }
    }

    .agent-nav__plus {
      width: 40px;
      height: 40px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: var(--primary, #1e5af0);
      color: #ffffff;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    :host-context(.dark-theme) {
      .agent-header__logo--light {
        display: none;
      }

      .agent-header__logo--dark {
        display: block;
      }

      .agent-header__tag {
        background: rgba(147, 180, 255, 0.16);
        color: #93b4ff;
      }
    }
  `,
})
export class AgentLayoutComponent implements OnInit {
  protected readonly auth = inject(AgentAuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Compte désactivé ou mot de passe réinitialisé par l'admin depuis la dernière visite
    this.auth.refreshProfile().subscribe((profile) => {
      if (profile?.mustChangePassword && !this.router.url.startsWith('/agent/mot-de-passe')) {
        void this.router.navigate(['/agent/mot-de-passe']);
      }
    });
  }
}
