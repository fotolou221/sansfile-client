import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientLayout } from '../../shared/components/client-layout/client-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { LocalityService } from '../../shared/services/locality.service';
import { HttpErrorMessageService } from '../../shared/services/http-error-message.service';
import { AuthSessionService } from '../auth/auth-session.service';

const OTHER = 'other';

/**
 * « Ma localité » : imposée après la connexion tant que le compte n'en a pas, et accessible depuis
 * le profil pour en changer. Le coiffeur dont le salon est rattaché garde la localité du salon.
 */
@Component({
  selector: 'app-choose-locality-page',
  imports: [ClientLayout, PageHeader, FormsModule],
  template: `
    <app-client-layout [showBottomNav]="false" [hasCustomFooter]="true">
      <app-page-header
        slot="header"
        title="Ma localité"
        [showBack]="changing()"
        [backRoute]="changing() ? redirectUrl() : undefined"
      />

      <div class="locality-page">
        <section class="locality-page__intro">
          <div class="locality-page__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h1>Où habitez-vous ?</h1>
          <p>
            SansFile vous montre d'abord les salons de votre localité, et la boutique livre chez
            vous.
          </p>
        </section>

        @if (fromSalon()) {
          <div class="locality-page__notice" role="status">
            Votre localité est celle de votre salon :
            <strong>{{ localityService.account()?.localityName }}</strong
            >. Pour la changer, contactez l'administration SansFile.
          </div>
        } @else {
          @if (localityService.localities().length > 8) {
            <input
              class="locality-page__search"
              type="search"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="Rechercher une localité…"
              aria-label="Rechercher une localité"
            />
          }

          @if (!localityService.loaded()) {
            <div class="locality-page__skeleton"></div>
            <div class="locality-page__skeleton"></div>
            <div class="locality-page__skeleton"></div>
          } @else {
            <div class="locality-page__list" role="radiogroup" aria-label="Localités">
              @for (locality of filtered(); track locality.id) {
                <button
                  type="button"
                  role="radio"
                  class="locality-option"
                  [class.locality-option--selected]="selected() === locality.id"
                  [attr.aria-checked]="selected() === locality.id"
                  (click)="select(locality.id)"
                >
                  <span class="locality-option__radio" aria-hidden="true"></span>
                  <span class="locality-option__name">{{ locality.name }}</span>
                  @if (locality.id === localityService.accountLocalityId()) {
                    <span class="locality-option__tag">Actuelle</span>
                  }
                </button>
              } @empty {
                @if (query()) {
                  <p class="locality-page__empty">
                    Aucune localité ne correspond à « {{ query() }} ».
                  </p>
                } @else {
                  <p class="locality-page__empty">
                    Les localités ne sont pas encore ouvertes. Indiquez la vôtre ci-dessous.
                  </p>
                }
              }

              <button
                type="button"
                role="radio"
                class="locality-option"
                [class.locality-option--selected]="selected() === other"
                [attr.aria-checked]="selected() === other"
                (click)="select(other)"
              >
                <span class="locality-option__radio" aria-hidden="true"></span>
                <span class="locality-option__name">Ma localité n'est pas dans la liste</span>
              </button>
            </div>

            @if (selected() === other) {
              <div class="locality-page__other">
                <label for="other-locality">Nom de votre localité</label>
                <input
                  id="other-locality"
                  type="text"
                  maxlength="100"
                  [ngModel]="otherName()"
                  (ngModelChange)="otherName.set($event)"
                  placeholder="Ex : Thiès, Mbour, Diamniadio…"
                  autocomplete="address-level2"
                />
                <span class="locality-page__hint">
                  Les salons de toutes les localités restent visibles. La boutique ouvrira chez vous
                  dès qu'un partenaire y sera installé.
                </span>
              </div>
            }
          }
        }

        @if (error()) {
          <p class="locality-page__error" role="alert">{{ error() }}</p>
        }
      </div>

      <div slot="footer" class="locality-page__footer">
        <button
          type="button"
          class="locality-page__submit"
          [disabled]="saving() || (!fromSalon() && !canSubmit())"
          (click)="submit()"
        >
          {{ saving() ? 'Enregistrement…' : fromSalon() ? 'Continuer' : 'Valider ma localité' }}
        </button>
      </div>
    </app-client-layout>
  `,
  styles: `
    .locality-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 8px 16px 24px;
    }

    .locality-page__intro {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;

      h1 {
        margin: 4px 0 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-primary, #0f172a);
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--text-secondary, #64748b);
      }
    }

    .locality-page__icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--primary-light, #eef2ff);
      color: var(--primary, #1e5af0);

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .locality-page__search,
    .locality-page__other input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 1rem;
    }

    .locality-page__list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .locality-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 0.95rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;

      &--selected {
        border-color: var(--primary, #1e5af0);
        box-shadow: inset 0 0 0 1px var(--primary, #1e5af0);

        .locality-option__radio {
          border-color: var(--primary, #1e5af0);

          &::after {
            transform: scale(1);
          }
        }
      }
    }

    .locality-option__radio {
      position: relative;
      flex: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--border-color, #cbd5e1);

      &::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: var(--primary, #1e5af0);
        transform: scale(0);
        transition: transform 0.15s ease;
      }
    }

    .locality-option__name {
      flex: 1;
    }

    .locality-option__tag {
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--primary-light, #eef2ff);
      color: var(--primary, #1e5af0);
      font-size: 0.7rem;
      font-weight: 800;
    }

    .locality-page__other {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-primary, #0f172a);
      }
    }

    .locality-page__hint,
    .locality-page__empty {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--text-secondary, #64748b);
    }

    .locality-page__notice {
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .locality-page__error {
      margin: 0;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(220, 38, 38, 0.3);
      color: var(--danger, #dc2626);
      font-size: 0.85rem;
    }

    .locality-page__skeleton {
      height: 50px;
      border-radius: 14px;
      background: var(--bg-card-hover, #f8fafc);
    }

    .locality-page__footer {
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    }

    .locality-page__submit {
      width: 100%;
      min-height: 50px;
      border: none;
      border-radius: 14px;
      background: var(--primary, #1e5af0);
      color: #ffffff;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `,
})
export class ChooseLocalityPage implements OnInit {
  protected readonly localityService = inject(LocalityService);
  private readonly auth = inject(AuthSessionService);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly other = OTHER;
  protected readonly query = signal('');
  protected readonly selected = signal<number | typeof OTHER | null>(null);
  protected readonly otherName = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly changing = signal(false);
  protected readonly redirectUrl = signal('/client/home');

  protected readonly fromSalon = computed(() => this.localityService.account()?.source === 'SALON');

  protected readonly filtered = computed(() => {
    const q = normalize(this.query());
    const list = this.localityService.localities();
    return q ? list.filter((l) => normalize(l.name).includes(q)) : list;
  });

  protected readonly canSubmit = computed(() => {
    const choice = this.selected();
    if (choice === OTHER) return this.otherName().trim().length >= 2;
    return choice !== null;
  });

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const redirect = params.get('redirect');
    this.changing.set(params.get('changer') === '1');
    this.redirectUrl.set(
      redirect &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//') &&
        !redirect.startsWith('/ma-localite')
        ? redirect
        : this.auth.getHomeRoute(),
    );

    await Promise.all([
      this.localityService.loadLocalities(true),
      this.localityService.loadAccount(),
    ]);
    const account = this.localityService.account();
    if (account?.localityId) {
      this.selected.set(account.localityId);
    } else if (account?.requestedLocality) {
      this.selected.set(OTHER);
      this.otherName.set(account.requestedLocality);
    }
  }

  protected select(choice: number | typeof OTHER): void {
    this.selected.set(choice);
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.fromSalon()) {
      void this.router.navigateByUrl(this.redirectUrl(), { replaceUrl: true });
      return;
    }
    const choice = this.selected();
    if (!this.canSubmit() || choice === null) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (choice === OTHER) {
        await this.localityService.requestZone(this.otherName());
      } else {
        await this.localityService.choose(choice);
      }
      void this.router.navigateByUrl(this.redirectUrl(), { replaceUrl: true });
    } catch (err) {
      this.error.set(
        this.errorMessages.message(err, "Votre localité n'a pas pu être enregistrée. Réessayez."),
      );
    } finally {
      this.saving.set(false);
    }
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
