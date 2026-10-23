import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { VitrineIcon } from './vitrine-icon';

const TICKET_NUMBER = 12;
const FIRST_NUMBER = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * 80;
const FRAME_MS = 1500;

/** Démonstration en boucle : la file avance jusqu'au client suivant, puis le SMS arrive. */
const FRAMES: ReadonlyArray<{ current: number; sms: boolean }> = [
  { current: 8, sms: false },
  { current: 9, sms: false },
  { current: 10, sms: false },
  { current: 11, sms: false },
  { current: 11, sms: true },
  { current: 11, sms: true },
  { current: 11, sms: true },
  { current: 11, sms: true },
];
/** Image affichée au chargement (et seule image si l'utilisateur réduit les animations). */
const KEY_FRAME = 4;

/**
 * Téléphone de la vitrine : écran « Détail du Ticket » repris de l'application (même maquette que
 * les affiches) et bulle du SMS envoyé quand le tour approche.
 * Le contenu reste toujours sur fond clair : aucun titre ni paragraphe, que le thème sombre global
 * passerait en blanc.
 */
@Component({
  selector: 'app-vitrine-phone',
  imports: [VitrineIcon],
  host: {
    role: 'img',
    'aria-label':
      "Aperçu de l'application : ticket numéro 12 chez King Barber, un SMS prévient quand le tour approche.",
  },
  template: `
    <div class="vitrine-device" aria-hidden="true">
      <span class="vitrine-device__key vitrine-device__key--1"></span>
      <span class="vitrine-device__key vitrine-device__key--2"></span>
      <span class="vitrine-device__key vitrine-device__key--3"></span>
      <span class="vitrine-device__key vitrine-device__key--4"></span>

      <div class="vitrine-device__screen">
        <div class="vitrine-device__status">
          <span>9:41</span>
          <span class="vitrine-device__status-icons">
            <svg width="18" height="12" viewBox="0 0 18 12">
              <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
              <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
              <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
            </svg>
            <svg width="27" height="13" viewBox="0 0 27 13">
              <rect
                x=".5"
                y=".5"
                width="23"
                height="12"
                rx="3.5"
                fill="none"
                stroke="currentColor"
                opacity=".4"
              />
              <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
              <rect
                x="24.5"
                y="4.5"
                width="2"
                height="4"
                rx="1"
                fill="currentColor"
                opacity=".45"
              />
            </svg>
          </span>
        </div>
        <div class="vitrine-device__island"></div>

        <div class="vitrine-device__bar">
          <app-vitrine-icon name="back" />
          <span>Détail du Ticket</span>
        </div>

        <div class="vitrine-device__tag">EN ATTENTE</div>
        <div class="vitrine-device__name">Ticket pour : Awa Diop</div>
        <div class="vitrine-device__place">King Barber • Dakar</div>

        <div class="vitrine-device__ring">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" stroke-width="12" />
            <circle
              class="vitrine-device__ring-progress"
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke-width="12"
              stroke-linecap="round"
              transform="rotate(-90 100 100)"
              [attr.stroke-dasharray]="ringCircumference"
              [attr.stroke-dashoffset]="ringOffset()"
            />
          </svg>
          <div class="vitrine-device__ring-text">
            <span>VOTRE TICKET</span>
            <span class="vitrine-device__ring-number">{{ ticketNumber }}</span>
          </div>
        </div>

        <div class="vitrine-device__stats">
          <div class="vitrine-device__stat">
            <span class="vitrine-device__stat-label">NUMÉRO EN COURS</span>
            @for (n of [current()]; track n) {
              <span class="vitrine-device__stat-value">{{ n }}</span>
            }
          </div>
          <div class="vitrine-device__stat">
            <span class="vitrine-device__stat-label">STATUT</span>
            <span class="vitrine-device__open">Ouvert</span>
          </div>
        </div>

        <div class="vitrine-device__notice">
          <app-vitrine-icon name="message" />
          <span>
            Un SMS sera envoyé au <span class="vitrine-device__strong">+221 77 123 45 67</span> dès
            que votre tour approchera.
          </span>
        </div>

        <div class="vitrine-device__quit">
          <app-vitrine-icon name="x-circle" />
          <span>Quitter la file</span>
        </div>
        <span class="vitrine-device__home"></span>
      </div>
    </div>

    <div class="vitrine-sms" [class.vitrine-sms--visible]="smsVisible()" aria-hidden="true">
      <div class="vitrine-sms__head">
        <span class="vitrine-sms__app"><app-vitrine-icon name="sms" /></span>
        <span class="vitrine-sms__title">SMS reçu</span>
        <span class="vitrine-sms__time">maintenant</span>
      </div>
      <div class="vitrine-sms__bubble">
        <span class="vitrine-device__strong">SansFile :</span> Votre tour approche chez King Barber
        (Ticket #12) ! Il ne reste plus qu'une personne devant vous.
      </div>
    </div>
  `,
  styleUrl: './vitrine-phone.scss',
})
export class VitrinePhone {
  protected readonly ticketNumber = TICKET_NUMBER;
  protected readonly ringCircumference = RING_CIRCUMFERENCE;

  private readonly frame = signal(KEY_FRAME);
  protected readonly current = computed(() => FRAMES[this.frame()].current);
  protected readonly smsVisible = computed(() => FRAMES[this.frame()].sms);
  protected readonly ringOffset = computed(() => {
    const progress = (this.current() - FIRST_NUMBER + 1) / (TICKET_NUMBER - FIRST_NUMBER + 1);
    return RING_CIRCUMFERENCE * (1 - progress);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const timer = window.setInterval(
        () => this.frame.update((i) => (i + 1) % FRAMES.length),
        FRAME_MS,
      );
      destroyRef.onDestroy(() => window.clearInterval(timer));
    });
  }
}
