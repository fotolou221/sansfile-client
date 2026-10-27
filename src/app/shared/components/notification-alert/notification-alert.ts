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
