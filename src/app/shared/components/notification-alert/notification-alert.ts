import { Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

const DISPLAY_MS = 8000;

/**
 * Bandeau en haut de l'écran quand une notification arrive, l'app ouverte (« C'est votre tour ! »…).
 * La recevoir ainsi évite au client le SMS de secours, payant.
 */
@Component({
  selector: 'app-notification-alert',
  template: `
    @if (notifications.screenAlert(); as alert) {
      <div class="notification-alert" role="status" aria-live="polite">
        <button type="button" class="notification-alert__body" (click)="open(alert.targetRoute)">
          <span class="notification-alert__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </span>
          <span class="notification-alert__text">
            <span class="notification-alert__title">{{ alert.title }}</span>
            <span class="notification-alert__message">{{ alert.message }}</span>
          </span>
        </button>
        <button
          type="button"
          class="notification-alert__close"
          aria-label="Fermer"
          (click)="notifications.dismissScreenAlert()"
        >
          ×
        </button>
      </div>
    }
  `,
  styleUrl: './notification-alert.scss',
})
export class NotificationAlert {
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const alert = this.notifications.screenAlert();
      untracked(() => {
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = null;
        if (!alert) return;
        this.hideTimer = setTimeout(() => {
          if (this.notifications.screenAlert()?.id === alert.id) {
            this.notifications.dismissScreenAlert();
          }
        }, DISPLAY_MS);
      });
    });
  }

  protected open(targetRoute?: string): void {
    this.notifications.dismissScreenAlert();
    void this.router.navigateByUrl(targetRoute || '/client/notifications');
  }
}
