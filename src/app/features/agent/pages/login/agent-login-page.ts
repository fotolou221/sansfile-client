import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentAuthService } from '../../services/agent-auth.service';

/** Connexion des agents de terrain : e-mail + mot de passe donnés par l'administration. */
@Component({
  selector: 'app-agent-login-page',
  imports: [FormsModule],
  template: `
    <div class="agent-login">
      <div class="agent-login__card">
        <img src="images/sansfile-logo.png" alt="SansFile" class="agent-login__logo logo-light" />
        <img
          src="images/sansfile-logo-white.png"
          alt="SansFile"
          class="agent-login__logo logo-dark"
        />

        <div>
          <h1 class="agent-title">Espace agent de terrain</h1>
          <p class="agent-subtitle">
            Connectez-vous avec l'adresse e-mail et le mot de passe transmis par l'administration
            SansFile.
          </p>
        </div>

        @if (disabledNotice()) {
          <div class="agent-alert agent-alert--warning" role="status">
            Votre compte agent a été désactivé. Contactez l'administration SansFile.
          </div>
        }
        @if (error()) {
          <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
        }

        <form class="agent-form" (ngSubmit)="submit()" novalidate>
          <div class="agent-field">
            <label for="agent-email">Adresse e-mail</label>
            <input
              id="agent-email"
              name="email"
              type="email"
              inputmode="email"
              autocomplete="username"
              [(ngModel)]="email"
              placeholder="prenom.nom@exemple.com"
              required
            />
          </div>

          <div class="agent-field">
            <label for="agent-password">Mot de passe</label>
            <div class="password-wrap">
              <input
                id="agent-password"
                name="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                [(ngModel)]="password"
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                class="password-toggle"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="
                  showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                "
              >
                {{ showPassword() ? 'Masquer' : 'Afficher' }}
              </button>
            </div>
            <span class="agent-field__hint">
              Première connexion : utilisez le mot de passe provisoire reçu. Vous choisirez ensuite
              le vôtre.
            </span>
          </div>

          <button
            type="submit"
            class="agent-btn agent-btn--primary agent-btn--block"
            [disabled]="loading() || !email.trim() || !password"
          >
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-page, #ffffff);
    }

    .agent-login {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }

    .agent-login__card {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 28px 20px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 24px;
    }

    .agent-login__logo {
      height: 34px;
      width: auto;
      align-self: flex-start;
    }

    .logo-dark {
      display: none;
    }

    .password-wrap {
      position: relative;

      input {
        padding-right: 92px;
      }
    }

    .password-toggle {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      padding: 6px 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--primary, #1e5af0);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
    }

    :host-context(.dark-theme) {
      .logo-light {
        display: none;
      }

      .logo-dark {
        display: block;
      }
    }
  `,
})
export class AgentLoginPage implements OnInit {
  private readonly auth = inject(AgentAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly disabledNotice = signal(false);

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate([
        this.auth.mustChangePassword() ? '/agent/mot-de-passe' : '/agent',
      ]);
      return;
    }
    this.disabledNotice.set(this.route.snapshot.queryParamMap.has('desactive'));
  }

  protected submit(): void {
    if (this.loading() || !this.email.trim() || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    this.disabledNotice.set(false);
    this.auth.login(this.email, this.password).subscribe((result) => {
      this.loading.set(false);
      if (!result.success) {
        this.error.set(result.message ?? 'Connexion impossible.');
        return;
      }
      void this.router.navigate([
        this.auth.mustChangePassword() ? '/agent/mot-de-passe' : '/agent',
      ]);
    });
  }
}
