import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AgentAuthService } from '../../services/agent-auth.service';

/**
 * Choix du mot de passe personnel : imposé à la première connexion (mot de passe provisoire donné par
 * l'admin), disponible ensuite depuis le profil.
 */
@Component({
  selector: 'app-agent-password-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="agent-page">
      @if (!auth.mustChangePassword()) {
        <a routerLink="/agent/profil" class="agent-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Profil
        </a>
      }

      <div>
        <h1 class="agent-title">
          {{
            auth.mustChangePassword() ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe'
          }}
        </h1>
        <p class="agent-subtitle">
          @if (auth.mustChangePassword()) {
            Bienvenue {{ auth.profile()?.firstName }} ! Pour sécuriser votre compte, remplacez le
            mot de passe provisoire reçu par un mot de passe que vous seul connaissez.
          } @else {
            Saisissez votre mot de passe actuel puis le nouveau.
          }
        </p>
      </div>

      @if (error()) {
        <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
      }

      <form class="agent-card agent-form" (ngSubmit)="submit()" novalidate>
        <div class="agent-field">
          <label for="current-password">
            {{ auth.mustChangePassword() ? 'Mot de passe provisoire' : 'Mot de passe actuel' }}
          </label>
          <input
            id="current-password"
            name="current"
            [type]="show() ? 'text' : 'password'"
            autocomplete="current-password"
            [(ngModel)]="current"
            required
          />
        </div>

        <div class="agent-field">
          <label for="new-password">Nouveau mot de passe</label>
          <input
            id="new-password"
            name="next"
            [type]="show() ? 'text' : 'password'"
            autocomplete="new-password"
            [ngModel]="next()"
            (ngModelChange)="next.set($event)"
            required
          />
          <ul class="rules" aria-live="polite">
            <li [class.ok]="longEnough()">Au moins 8 caractères</li>
            <li [class.ok]="hasLetterAndDigit()">Au moins une lettre et un chiffre</li>
            <li [class.ok]="differsFromCurrent()">Différent du mot de passe actuel</li>
          </ul>
        </div>

        <div class="agent-field" [class.agent-field--invalid]="confirm() && !confirmMatches()">
          <label for="confirm-password">Confirmer le nouveau mot de passe</label>
          <input
            id="confirm-password"
            name="confirm"
            [type]="show() ? 'text' : 'password'"
            autocomplete="new-password"
            [ngModel]="confirm()"
            (ngModelChange)="confirm.set($event)"
            required
          />
          @if (confirm() && !confirmMatches()) {
            <span class="agent-field__error">Les deux mots de passe ne correspondent pas.</span>
          }
        </div>

        <label class="show-toggle">
          <input type="checkbox" [checked]="show()" (change)="show.set(!show())" />
          Afficher les mots de passe
        </label>

        <button
          type="submit"
          class="agent-btn agent-btn--primary agent-btn--block"
          [disabled]="saving() || !canSubmit()"
        >
          {{ saving() ? 'Enregistrement…' : 'Enregistrer mon mot de passe' }}
        </button>

        @if (auth.mustChangePassword()) {
          <button
            type="button"
            class="agent-btn agent-btn--outline agent-btn--block"
            (click)="auth.logout()"
          >
            Se déconnecter
          </button>
        }
      </form>
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .rules {
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;

      li {
        position: relative;
        padding-left: 22px;
        font-size: 0.8125rem;
        color: var(--text-secondary, #64748b);

        &::before {
          content: '○';
          position: absolute;
          left: 2px;
        }

        &.ok {
          color: var(--success, #16a34a);

          &::before {
            content: '✓';
          }
        }
      }
    }

    .show-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);

      input {
        width: 18px;
        height: 18px;
      }
    }
  `,
})
export class AgentPasswordPage {
  protected readonly auth = inject(AgentAuthService);
  private readonly router = inject(Router);

  protected current = '';
  protected readonly next = signal('');
  protected readonly confirm = signal('');
  protected readonly show = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly longEnough = computed(() => this.next().length >= 8);
  protected readonly hasLetterAndDigit = computed(
    () => /\p{L}/u.test(this.next()) && /\d/.test(this.next()),
  );
  protected readonly differsFromCurrent = computed(
    () => this.next().length > 0 && this.next() !== this.current,
  );
  protected readonly confirmMatches = computed(() => this.confirm() === this.next());
  protected readonly canSubmit = computed(
    () =>
      this.longEnough() &&
      this.hasLetterAndDigit() &&
      this.confirmMatches() &&
      this.next().length > 0,
  );

  protected submit(): void {
    if (this.saving() || !this.canSubmit() || !this.current) return;
    if (this.next() === this.current) {
      this.error.set('Choisissez un mot de passe différent du mot de passe actuel.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.auth.changePassword(this.current, this.next()).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/agent'], { queryParams: { motdepasse: 'ok' } });
      },
      error: (err) => {
        this.saving.set(false);
        if (!this.auth.handleApiError(err)) {
          this.error.set(this.auth.errorMessage(err, "Le mot de passe n'a pas pu être changé."));
        }
      },
    });
  }
}
