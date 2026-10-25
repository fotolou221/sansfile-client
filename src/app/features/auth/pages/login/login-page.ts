import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthActionButton } from '../../components/auth-action-button/auth-action-button';
import { AuthShell } from '../../components/auth-shell/auth-shell';
import { AuthSessionService, UserRole } from '../../auth-session.service';
import {
  PHONE_COUNTRIES,
  PhoneCountry,
  SENEGAL,
  buildE164,
  formatNational,
  isNationalNumberValid,
} from '../../../../shared/phone/phone-numbers';

@Component({
  selector: 'app-login-page',
  imports: [AuthActionButton, AuthShell, RouterLink],
  template: `
    <app-auth-shell>
      <div class="login-page">
        <header class="login-page__header">
          <h1>Bienvenue</h1>
          <p>
            @if (auth.activeRole() === 'coiffeur') {
              Connecte-toi à ton <strong>Espace Coiffeur Pro</strong>
            } @else {
              Connecte-toi pour continuer
            }
          </p>
        </header>

        <div class="login-page__field-group">
          <label class="login-page__label" for="phone">T&eacute;l&eacute;phone</label>
          <div class="phone-field">
            <!-- Liste native du téléphone pour choisir le pays ; le Sénégal est proposé par défaut -->
            <label class="phone-field__country">
              <span class="phone-field__flag" aria-hidden="true">{{ country().flag }}</span>
              <span>+{{ country().dial }}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m6 8 4 4 4-4" />
              </svg>
              <select
                class="phone-field__select"
                aria-label="Indicatif du pays"
                (change)="selectCountry($event)"
              >
                @for (c of countries; track c.iso) {
                  <option [value]="c.iso" [selected]="c.iso === country().iso">
                    {{ c.flag }} {{ c.name }} (+{{ c.dial }})
                  </option>
                }
              </select>
            </label>

            <span class="phone-field__divider" aria-hidden="true"></span>

            <input
              id="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              [placeholder]="country().example"
              [value]="phoneNumber()"
              (input)="updatePhone($event)"
            />
          </div>

          @if (errorMessage()) {
            <p
              class="login-page__error"
              role="alert"
              style="color: #ef4444; font-size: 0.85rem; margin-top: 8px; text-align: left;"
            >
              {{ errorMessage() }}
            </p>
          }
        </div>

        <footer class="login-page__footer">
          <app-auth-action-button
            [disabled]="!isPhoneValid()"
            [loading]="isSubmitting()"
            loadingLabel="Envoi du code"
            (pressed)="continueWithPhone()"
          >
            <span>Continuer</span>
            <svg
              class="auth-action-button__arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </app-auth-action-button>
          <p>
            En continuant, tu acceptes nos
            <a routerLink="/informations-legales" fragment="conditions">Conditions d'utilisation</a>
            et notre
            <a routerLink="/informations-legales" fragment="confidentialite"
              >Politique de confidentialit&eacute;</a
            >.
          </p>
        </footer>
      </div>
    </app-auth-shell>
  `,
  styleUrl: './login-page.scss',
})
export class LoginPage implements OnInit {
  protected readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private loginRole: UserRole = 'client';
  /** Cible à rejoindre après connexion (ex: ticket d'un salon scanné par QR code). */
  private redirectUrl: string | null = null;

  ngOnInit(): void {
    const targetRole = this.route.snapshot.queryParamMap.get('role');
    this.loginRole = targetRole === 'coiffeur' ? 'coiffeur' : 'client';
    this.auth.selectRole(this.loginRole);

    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    this.redirectUrl =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;
  }

  protected readonly countries = PHONE_COUNTRIES;
  protected readonly country = signal<PhoneCountry>(SENEGAL);
  protected readonly phoneNumber = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly isPhoneValid = computed(() =>
    isNationalNumberValid(this.country(), this.phoneNumber()),
  );

  protected selectCountry(event: Event): void {
    const iso = (event.target as HTMLSelectElement).value;
    this.country.set(PHONE_COUNTRIES.find((c) => c.iso === iso) ?? SENEGAL);
    this.phoneNumber.set('');
    this.errorMessage.set('');
    document.getElementById('phone')?.focus();
  }

  protected updatePhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatNational(this.country(), input.value);
    this.phoneNumber.set(formatted);
    input.value = formatted;
    this.errorMessage.set('');
  }

  protected async continueWithPhone(): Promise<void> {
    if (!this.isPhoneValid()) {
      this.errorMessage.set(
        this.country() === SENEGAL
          ? 'Veuillez saisir un numéro mobile sénégalais à 9 chiffres (ex : 77 123 45 67).'
          : `Veuillez saisir un numéro de téléphone valide (ex : ${this.country().example}).`,
      );
      return;
    }
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.startPhoneLogin(
        buildE164(this.country(), this.phoneNumber()),
        this.loginRole,
      );
      void this.router.navigate(['/auth/code'], {
        queryParams: this.redirectUrl ? { redirect: this.redirectUrl } : {},
      });
    } catch (e: any) {
      this.errorMessage.set(
        e?.message || "Impossible d'envoyer le code SMS. Vérifiez votre connexion.",
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
