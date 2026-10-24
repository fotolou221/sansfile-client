import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PwaService } from '../../shared/services/pwa.service';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';
import { QrCode } from '../../shared/components/qr-code/qr-code';
import { VitrineStatsService, PublicStats } from './services/vitrine-stats.service';
import { VitrineIcon } from './components/vitrine-icon';
import { VitrinePhone } from './components/vitrine-phone';

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

/** Les chiffres réels ne s'affichent qu'à partir de ce volume : « 1 salon partenaire » dessert la marque. */
const STATS_MIN_SALONS = 10;
const STATS_MIN_USERS = 100;

const PARTNER_MESSAGE = 'Bonjour, je souhaite inscrire mon salon sur SansFile.';

@Component({
  selector: 'app-vitrine-page',
  imports: [RouterLink, QrCode, VitrineIcon, VitrinePhone],
  template: `
    <div
      class="vitrine"
      [class.vitrine--maintenance]="platform.maintenanceMode()"
      [class.vitrine--motion]="motion()"
    >
      <!-- ══════════════ EN-TÊTE FLOTTANT ══════════════ -->
      <header class="vitrine-header">
        <!-- Mode maintenance (Paramètres Système de l'admin) : toujours visible, même en faisant défiler -->
        @if (platform.maintenanceMode()) {
          <div class="vitrine-maintenance" role="status">
            <app-vitrine-icon name="wrench" />
            <span class="vitrine-maintenance__title">SansFile est en maintenance</span>
            <span class="vitrine-maintenance__detail">
              · La prise de ticket et l’application sont momentanément indisponibles. Nous revenons
              très vite&nbsp;!
            </span>
          </div>
        }

        <div class="vitrine-header__bar">
          <a routerLink="/" class="vitrine-header__logo" aria-label="SansFile, accueil">
            <img
              src="images/sansfile-logo-horizontal.png"
              alt="SansFile"
              class="vitrine-logo vitrine-logo--color"
              width="1232"
              height="232"
            />
            <img
              src="images/sansfile-logo-horizontal-white.png"
              alt=""
              class="vitrine-logo vitrine-logo--white"
              width="1232"
              height="232"
            />
          </a>

          <div class="vitrine-header__actions">
            <a routerLink="/auth/login" class="vitrine-header__login">Se connecter</a>
            <button
              type="button"
              class="vitrine-btn vitrine-btn--primary vitrine-btn--sm"
              (click)="triggerInstall()"
            >
              <app-vitrine-icon name="download" />
              <span>Installer</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <!-- ══════════════ HERO ══════════════ -->
        <section class="vitrine-hero" id="accueil">
          <div class="vitrine-container vitrine-hero__grid">
            <div class="vitrine-hero__copy">
              <span class="vitrine-hero__eyebrow">
                <span class="vitrine-hero__dot"></span>
                Ticket virtuel pour coiffeurs et barbiers
              </span>

              <h1 class="vitrine-hero__title">
                Moins d’attente.<br />
                Plus de <span class="vitrine-hero__title-highlight">temps.</span>
              </h1>

              <p class="vitrine-hero__lead">
                Prends ton ticket depuis ton téléphone, vis ta vie, et arrive au salon juste à ton
                tour.
              </p>

              <div class="vitrine-hero__actions">
                <a routerLink="/auth/login" class="vitrine-btn vitrine-btn--amber vitrine-btn--lg">
                  <span>Prendre un ticket</span>
                  <app-vitrine-icon name="arrow-right" />
                </a>
                <button
                  type="button"
                  class="vitrine-btn vitrine-btn--ghost-light vitrine-btn--lg"
                  (click)="triggerInstall()"
                >
                  <app-vitrine-icon name="download" />
                  <span>Installer l’application</span>
                </button>
              </div>

              <a
                class="vitrine-hero__salon"
                [href]="partnerWhatsAppUrl()"
                target="_blank"
                rel="noopener"
              >
                <span class="vitrine-hero__salon-icon"><app-vitrine-icon name="scissors" /></span>
                <span class="vitrine-hero__salon-text">
                  <span class="vitrine-hero__salon-title"
                    >Vous êtes coiffeur ou barbier&nbsp;?</span
                  >
                  <span class="vitrine-hero__salon-sub">Inscrivez votre salon sur SansFile</span>
                </span>
                <app-vitrine-icon class="vitrine-hero__salon-arrow" name="arrow-right" />
              </a>
            </div>

            <div class="vitrine-hero__visual">
              <app-vitrine-phone />

              <!-- Autocollant qui tourne -->
              <div class="vitrine-sticker" aria-hidden="true">
                <svg class="vitrine-sticker__ring" viewBox="0 0 120 120">
                  <defs>
                    <path
                      id="vitrine-sticker-path"
                      d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#vitrine-sticker-path" textLength="279" lengthAdjust="spacing">
                      GRATUIT • ANDROID ET IPHONE • SANS STORE •
                    </textPath>
                  </text>
                </svg>
                <span class="vitrine-sticker__center"><app-vitrine-icon name="ticket" /></span>
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════ BANDEAU DÉFILANT ══════════════ -->
        <div class="vitrine-marquee" aria-hidden="true">
          <div class="vitrine-marquee__track">
            @for (copy of [0, 1, 2]; track copy) {
              <div class="vitrine-marquee__group">
                @for (word of marqueeWords; track word) {
                  <span class="vitrine-marquee__word">{{ word }}</span>
                  <app-vitrine-icon name="ticket" />
                }
              </div>
            }
          </div>
        </div>

        <!-- ══════════════ CHIFFRES RÉELS (affichés à partir d'un volume significatif) ══════════════ -->
        @if (visibleStats(); as s) {
          <section class="vitrine-figures" aria-label="SansFile en chiffres">
            <div class="vitrine-container vitrine-figures__grid">
              <div class="vitrine-figure">
                <span class="vitrine-figure__value">{{ s.totalSalonsFormatted }}</span>
                <span class="vitrine-figure__label">salons partenaires</span>
              </div>
              <div class="vitrine-figure">
                <span class="vitrine-figure__value">{{ s.activeUsersFormatted }}</span>
                <span class="vitrine-figure__label">utilisateurs</span>
              </div>
              <div class="vitrine-figure">
                <span class="vitrine-figure__value">{{
                  formatCount(s.totalTicketsServed ?? 0)
                }}</span>
                <span class="vitrine-figure__label">tickets servis</span>
              </div>
            </div>
          </section>
        }

        <!-- ══════════════ COMMENT ÇA MARCHE ══════════════ -->
        <section class="vitrine-section" id="comment-ca-marche">
          <div class="vitrine-container">
            <div class="vitrine-head vitrine-reveal">
              <span class="vitrine-eyebrow">Comment ça marche</span>
              <h2 class="vitrine-title">Trois étapes. Zéro salle d’attente.</h2>
            </div>

            <ol class="vitrine-steps">
              <li class="vitrine-step vitrine-reveal">
                <div class="vitrine-step__visual vitrine-step__visual--blue" aria-hidden="true">
                  <div class="vitrine-mini-salon">
                    <span class="vitrine-mini-salon__avatar">KB</span>
                    <span class="vitrine-mini-salon__info">
                      <span class="vitrine-mini-salon__name">King Barber</span>
                      <span class="vitrine-mini-salon__meta">
                        Mermoz · <span class="vitrine-mini-salon__open">Ouvert</span>
                      </span>
                    </span>
                    <span class="vitrine-mini-salon__count">4 en attente</span>
                  </div>
                  <div class="vitrine-mini-salon vitrine-mini-salon--tilted">
                    <span class="vitrine-mini-salon__avatar vitrine-mini-salon__avatar--amber">
                      SO
                    </span>
                    <span class="vitrine-mini-salon__info">
                      <span class="vitrine-mini-salon__name">Le Salon d’Or</span>
                      <span class="vitrine-mini-salon__meta">
                        Plateau · <span class="vitrine-mini-salon__open">Ouvert</span>
                      </span>
                    </span>
                    <span class="vitrine-mini-salon__count">2 en attente</span>
                  </div>
                </div>
                <div class="vitrine-step__body">
                  <span class="vitrine-step__num">1</span>
                  <h3>Choisis ton salon</h3>
                  <p>Tu vois en direct combien de personnes attendent.</p>
                </div>
              </li>

              <li class="vitrine-step vitrine-reveal" style="--vitrine-delay: 100ms">
                <div class="vitrine-step__visual vitrine-step__visual--amber" aria-hidden="true">
                  <div class="vitrine-mini-ticket">
                    <span class="vitrine-mini-ticket__num">#12</span>
                    <span class="vitrine-mini-ticket__meta">
                      <span class="vitrine-mini-ticket__salon">King Barber</span>
                      <span>Pour toi ou un proche</span>
                    </span>
                  </div>
                </div>
                <div class="vitrine-step__body">
                  <span class="vitrine-step__num">2</span>
                  <h3>Prends ton ticket</h3>
                  <p>Pour toi ou pour un proche, en un geste.</p>
                </div>
              </li>

              <li class="vitrine-step vitrine-reveal" style="--vitrine-delay: 200ms">
                <div class="vitrine-step__visual vitrine-step__visual--navy" aria-hidden="true">
                  <div class="vitrine-mini-sms">
                    <span class="vitrine-mini-sms__from">
                      <span class="vitrine-mini-sms__app"><app-vitrine-icon name="sms" /></span>
                      SansFile
                      <span class="vitrine-mini-sms__time">maintenant</span>
                    </span>
                    <span class="vitrine-mini-sms__text">
                      Votre tour approche chez King Barber (Ticket #12)&nbsp;!
                    </span>
                  </div>
                </div>
                <div class="vitrine-step__body">
                  <span class="vitrine-step__num">3</span>
                  <h3>Viens à ton tour</h3>
                  <p>Un SMS te prévient quand ton tour approche.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <!-- ══════════════ LES PETITS PLUS ══════════════ -->
        <section class="vitrine-section vitrine-section--soft" id="fonctionnalites">
          <div class="vitrine-container">
            <div class="vitrine-head vitrine-reveal">
              <span class="vitrine-eyebrow">Les petits plus</span>
              <h2 class="vitrine-title">Et ce n’est pas tout.</h2>
            </div>

            <div class="vitrine-perks">
              @for (perk of perks; track perk.title; let i = $index) {
                <article
                  class="vitrine-perk vitrine-reveal"
                  [style.--vitrine-delay]="i * 80 + 'ms'"
                >
                  <span class="vitrine-perk__icon" [class]="'vitrine-perk__icon--' + perk.color">
                    <app-vitrine-icon [name]="perk.icon" />
                  </span>
                  <h3>{{ perk.title }}</h3>
                  <p>{{ perk.text }}</p>
                </article>
              }
            </div>
          </div>
        </section>

        <!-- ══════════════ POUR LES SALONS ══════════════ -->
        <section class="vitrine-salons" id="salons">
          <div class="vitrine-container vitrine-salons__grid">
            <div class="vitrine-reveal">
              <span class="vitrine-salons__chip">Coiffeurs &amp; barbiers</span>
              <h2 class="vitrine-salons__title">
                Finie la salle d’attente <span class="vitrine-salons__mark">bondée.</span>
              </h2>
              <ul class="vitrine-salons__list">
                <li>
                  <span class="vitrine-salons__check"><app-vitrine-icon name="check" /></span>
                  Vos clients réservent à distance ou scannent votre QR code.
                </li>
                <li>
                  <span class="vitrine-salons__check"><app-vitrine-icon name="check" /></span>
                  Vous servez ou sautez un client en un geste.
                </li>
                <li>
                  <span class="vitrine-salons__check"><app-vitrine-icon name="check" /></span>
                  Le client suivant est prévenu par SMS, automatiquement.
                </li>
                <li>
                  <span class="vitrine-salons__check"><app-vitrine-icon name="check" /></span>
                  Un client sans smartphone&nbsp;? Ajoutez-le à la file en quelques secondes.
                </li>
              </ul>
              <div class="vitrine-salons__actions">
                <a
                  [href]="partnerWhatsAppUrl()"
                  target="_blank"
                  rel="noopener"
                  class="vitrine-btn vitrine-btn--amber vitrine-btn--lg"
                >
                  <app-vitrine-icon name="whatsapp" />
                  <span>Inscrire mon salon</span>
                </a>
                <a
                  routerLink="/auth/login"
                  [queryParams]="{ role: 'coiffeur' }"
                  class="vitrine-btn vitrine-btn--ghost-light vitrine-btn--lg"
                >
                  <span>Espace coiffeur</span>
                  <app-vitrine-icon name="arrow-right" />
                </a>
              </div>
            </div>

            <!-- Photo : Unsplash (licence libre) -->
            <div class="vitrine-salons__media vitrine-reveal" style="--vitrine-delay: 120ms">
              <img
                src="images/vitrine/ticket-direct.webp"
                alt="Barbier en pleine coupe avec son client"
                width="800"
                height="480"
                loading="lazy"
                decoding="async"
              />
              <div class="vitrine-salons__queue" aria-hidden="true">
                <span class="vitrine-salons__queue-title">File du jour</span>
                <span class="vitrine-salons__queue-row">
                  <span class="vitrine-salons__queue-num">11</span>
                  <span class="vitrine-salons__queue-name">Moussa</span>
                  <span class="vitrine-salons__queue-btn vitrine-salons__queue-btn--ok">
                    <app-vitrine-icon name="check" />
                  </span>
                  <span class="vitrine-salons__queue-btn vitrine-salons__queue-btn--skip">
                    <app-vitrine-icon name="x" />
                  </span>
                </span>
                <span class="vitrine-salons__queue-row vitrine-salons__queue-row--next">
                  <span class="vitrine-salons__queue-num">12</span>
                  <span class="vitrine-salons__queue-name">Awa · prévenue par SMS</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════ FAQ ══════════════ -->
        <section class="vitrine-section" id="faq">
          <div class="vitrine-container vitrine-faq">
            <div class="vitrine-head vitrine-reveal">
              <span class="vitrine-eyebrow">FAQ</span>
              <h2 class="vitrine-title">Tu as une question&nbsp;?</h2>
            </div>

            <div class="vitrine-faq__list">
              @for (item of faqs(); track item.question; let i = $index) {
                <div class="vitrine-faq-item" [class.vitrine-faq-item--open]="item.isOpen">
                  <h3 class="vitrine-faq-item__heading">
                    <button
                      type="button"
                      class="vitrine-faq-item__btn"
                      [id]="'faq-question-' + i"
                      [attr.aria-controls]="'faq-answer-' + i"
                      [attr.aria-expanded]="item.isOpen"
                      (click)="toggleFaq(i)"
                    >
                      <span class="vitrine-faq-item__q">{{ item.question }}</span>
                      <span class="vitrine-faq-item__icon">
                        <app-vitrine-icon name="chevron-down" />
                      </span>
                    </button>
                  </h3>
                  <div
                    class="vitrine-faq-item__panel"
                    role="region"
                    [id]="'faq-answer-' + i"
                    [attr.aria-labelledby]="'faq-question-' + i"
                    [attr.inert]="item.isOpen ? null : ''"
                  >
                    <div class="vitrine-faq-item__inner">
                      <p>{{ withContacts(item.answer) }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="vitrine-faq__contact">
              <span class="vitrine-faq__contact-label">Pas trouvé ta réponse&nbsp;?</span>
              <a
                class="vitrine-faq__contact-link vitrine-faq__contact-link--wa"
                [href]="whatsAppUrl()"
                target="_blank"
                rel="noopener"
              >
                <app-vitrine-icon name="whatsapp" />
                <span>WhatsApp</span>
              </a>
              <a class="vitrine-faq__contact-link" [href]="'mailto:' + platform.contactEmail()">
                <app-vitrine-icon name="mail" />
                <span>E-mail</span>
              </a>
            </div>
          </div>
        </section>

        <!-- ══════════════ APPEL À L'ACTION ══════════════ -->
        <section class="vitrine-section vitrine-section--last">
          <div class="vitrine-container">
            <div class="vitrine-cta vitrine-reveal">
              <span class="vitrine-cta__disc vitrine-cta__disc--blue" aria-hidden="true"></span>
              <span class="vitrine-cta__disc vitrine-cta__disc--amber" aria-hidden="true"></span>

              <div class="vitrine-cta__copy">
                <h2 class="vitrine-cta__title">
                  Ta prochaine coupe, <span class="vitrine-cta__accent">sans attendre.</span>
                </h2>
                <p class="vitrine-cta__text">Gratuit, sans store, prêt en quelques secondes.</p>
                <div class="vitrine-cta__actions">
                  <a
                    routerLink="/auth/login"
                    class="vitrine-btn vitrine-btn--amber vitrine-btn--lg"
                  >
                    <span>Prendre un ticket</span>
                    <app-vitrine-icon name="arrow-right" />
                  </a>
                  <button
                    type="button"
                    class="vitrine-btn vitrine-btn--ghost-light vitrine-btn--lg"
                    (click)="triggerInstall()"
                  >
                    <app-vitrine-icon name="download" />
                    <span>Installer l’application</span>
                  </button>
                </div>
              </div>

              <!-- Sur ordinateur, l'application ne s'ouvre pas : on propose de passer au téléphone -->
              @if (isDesktop()) {
                <div class="vitrine-cta__qr">
                  <app-qr-code [value]="siteUrl()" [size]="140" />
                  <span class="vitrine-cta__qr-label">Scanne pour l’ouvrir sur ton téléphone</span>
                </div>
              }
            </div>
          </div>
        </section>
      </main>

      <!-- ══════════════ PIED DE PAGE ══════════════ -->
      <footer class="vitrine-footer" id="contact">
        <div class="vitrine-container">
          <div class="vitrine-footer__top">
            <div>
              <img
                src="images/sansfile-logo-horizontal-white.png"
                alt="SansFile"
                class="vitrine-footer__logo"
                width="1232"
                height="232"
                loading="lazy"
              />
              <p class="vitrine-footer__tagline">Moins d’attente, plus de temps.</p>
            </div>

            <nav class="vitrine-footer__links" aria-label="Liens utiles">
              <a routerLink="/auth/login">Se connecter</a>
              <a routerLink="/auth/login" [queryParams]="{ role: 'coiffeur' }">Espace coiffeur</a>
              <a href="#faq" (click)="scrollTo('faq', $event)">FAQ</a>
              <button type="button" (click)="triggerInstall()">Installer l’application</button>
              <a routerLink="/informations-legales">Informations légales</a>
            </nav>

            <div class="vitrine-footer__contact">
              <a [href]="'mailto:' + platform.contactEmail()">
                <app-vitrine-icon name="mail" />{{ platform.contactEmail() }}
              </a>
              <a [href]="'tel:+' + platform.contactPhoneDigits()">
                <app-vitrine-icon name="phone" />{{ platform.contactPhone() }}
              </a>
            </div>
          </div>

          <div class="vitrine-footer__bottom">
            <span>© {{ year }} SansFile. Tous droits réservés.</span>
            <span>Conçu à Dakar</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styleUrl: './vitrine-page.scss',
})
export class VitrinePage implements OnInit {
  private readonly router = inject(Router);
  private readonly pwa = inject(PwaService);
  private readonly statsService = inject(VitrineStatsService);
  protected readonly platform = inject(PlatformSettingsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly year = new Date().getFullYear();
  protected readonly marqueeWords = [
    'Moins d’attente',
    'Plus de temps',
    'Ticket virtuel',
    'Alerte SMS',
    'Pour toi et tes proches',
    'Gratuit',
  ];
  protected readonly perks = [
    {
      icon: 'users',
      color: 'blue',
      title: 'Pour tes proches',
      text: 'Prends un ticket pour tes enfants, tes parents ou un ami.',
    },
    {
      icon: 'bell',
      color: 'amber',
      title: 'Alerte par SMS',
      text: 'Le SMS arrive quand ton tour approche, même appli fermée.',
    },
    {
      icon: 'heart',
      color: 'pink',
      title: 'Salons favoris',
      text: 'Tes salons habituels, toujours sous la main.',
    },
    {
      icon: 'bag',
      color: 'green',
      title: 'La boutique',
      text: 'Tondeuses, soins et accessoires livrés dans ta localité.',
    },
  ] as const;

  /** Apparition des sections au défilement (activée seulement si le navigateur la permet). */
  protected readonly motion = signal(false);
  protected readonly isDesktop = signal(false);
  protected readonly siteUrl = signal('https://sansfile.com');

  private readonly stats = signal<PublicStats | null>(null);
  protected readonly visibleStats = computed(() => {
    const s = this.stats();
    return s && s.totalSalons >= STATS_MIN_SALONS && s.activeUsers >= STATS_MIN_USERS ? s : null;
  });

  protected readonly whatsAppUrl = computed(
    () => `https://wa.me/${this.platform.contactPhoneDigits()}`,
  );
  protected readonly partnerWhatsAppUrl = computed(
    () => `${this.whatsAppUrl()}?text=${encodeURIComponent(PARTNER_MESSAGE)}`,
  );

  constructor() {
    afterNextRender(() => {
      this.watchDesktop();
      this.revealOnScroll();
    });
  }

  ngOnInit(): void {
    // Coordonnées du support toujours à jour (modifiables depuis l'admin)
    this.platform.refresh();
    if (isPlatformBrowser(this.platformId)) {
      // If user opened the installed PWA on iPhone/Android or with ?source=pwa, forward directly into the app
      if (this.pwa.isStandalone() || window.location.search.includes('source=pwa')) {
        void this.router.navigateByUrl('/onboarding');
      }

      this.siteUrl.set(window.location.origin);

      // Chiffres réels de la plateforme (affichés seulement à partir d'un volume significatif)
      this.statsService.getPublicStats().subscribe((data) => this.stats.set(data));
    }
  }

  protected readonly faqs = signal<FaqItem[]>([
    {
      question: 'Comment prendre un ticket ?',
      answer:
        'Ouvre SansFile, choisis ton salon et appuie sur « Prendre mon ticket ». Indique si le ticket est pour toi ou pour un proche, puis confirme : ton numéro de passage s’affiche tout de suite.',
      isOpen: true,
    },
    {
      question: 'C’est gratuit ?',
      answer:
        'Oui. Pour les clients, SansFile est entièrement gratuit : pas d’abonnement, pas de frais cachés.',
      isOpen: false,
    },
    {
      question: 'Je peux prendre un ticket pour un proche ?',
      answer:
        'Oui. Ajoute tes enfants, tes parents ou tes amis dans « Mes Proches », puis choisis pour qui est le ticket au moment de le prendre.',
      isOpen: false,
    },
    {
      question: 'Comment installer SansFile sur mon téléphone ?',
      answer:
        'Sur Android, ouvre le site dans Chrome et appuie sur « Installer l’application ». Sur iPhone, ouvre-le dans Safari, appuie sur Partager puis « Sur l’écran d’accueil ». Si Samsung Internet ou Google Play Protect affiche un avertissement, choisis « Plus de détails » puis « Installer quand même ».',
      isOpen: false,
    },
    {
      question: 'Je suis coiffeur : comment inscrire mon salon ?',
      answer:
        'Contactez-nous au {phone} ou à {email}. Nous créons votre salon avec vous et vous remettons le QR code à afficher dans votre salon.',
      isOpen: false,
    },
  ]);

  protected toggleFaq(index: number): void {
    this.faqs.update((items) =>
      items.map((item, i) => ({
        ...item,
        isOpen: i === index ? !item.isOpen : item.isOpen,
      })),
    );
  }

  /** Insère les coordonnées du support (paramètres admin) dans un texte. */
  protected withContacts(text: string): string {
    return text
      .replace('{email}', this.platform.contactEmail())
      .replace('{phone}', this.platform.contactPhone());
  }

  protected formatCount(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  /** Défilement vers une section sans changer de route (la vitrine répond aussi sur /vitrine). */
  protected scrollTo(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }

  protected triggerInstall(): void {
    this.pwa.showBanner.set(true);
    this.pwa.promptInstall();
  }

  /** Le QR code « ouvrir sur ton téléphone » ne concerne que les grands écrans. */
  private watchDesktop(): void {
    const query = window.matchMedia?.('(min-width: 1024px)');
    if (!query) return;
    const update = () => this.isDesktop.set(query.matches);
    update();
    query.addEventListener('change', update);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
  }

  private revealOnScroll(): void {
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('vitrine-reveal--in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    this.host.nativeElement
      .querySelectorAll('.vitrine-reveal')
      .forEach((element) => observer.observe(element));
    this.motion.set(true);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
