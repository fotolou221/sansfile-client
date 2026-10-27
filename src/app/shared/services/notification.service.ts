import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { AppNotification } from '../models/notification';
import { API_CONFIG } from '../../core/config/api.config';
import { AuthSessionService } from '../../features/auth/auth-session.service';
import { HttpErrorMessageService } from './http-error-message.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSessionService);
  private readonly errorMessages = inject(HttpErrorMessageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swPush = inject(SwPush, { optional: true });
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly baseUrl = API_CONFIG.baseUrl;

  readonly notifications = signal<readonly AppNotification[]>([]);
  readonly loading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  /** Nouvelle notification affichée en bandeau, l'app étant à l'écran. */
  readonly screenAlert = signal<AppNotification | null>(null);
  /** Arrivée app en arrière-plan : affichée en bandeau au retour à l'écran. */
  private alertWhenVisible: AppNotification | null = null;

  // ── Cache Strategy (SWR - 1 min TTL) ────────────────────────
  private lastFetchedAt: number | null = null;
  private readonly CACHE_TTL_MS = 60 * 1000;
  private seenNotificationIds = new Set<string>();
  private hasLoadedOnce = false;
  private audioContext: AudioContext | null = null;
  private pushRegistrationStarted = false;
  private pushSubscriptionActive = false;
  private requestInFlight = false;

  readonly clientNotifications = computed(() =>
    this.notifications().filter((n) => n.recipientRole === 'client'),
  );

  readonly coiffeurNotifications = computed(() =>
    this.notifications().filter((n) => n.recipientRole === 'coiffeur'),
  );

  readonly clientUnreadCount = computed(
    () => this.clientNotifications().filter((n) => !n.isRead).length,
  );

  readonly coiffeurUnreadCount = computed(
    () => this.coiffeurNotifications().filter((n) => !n.isRead).length,
  );

  readonly unreadCount = computed(() => this.clientUnreadCount());

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      untracked(() => {
        if (user && user.id !== 'guest') {
          this.loadNotifications(true);
          this.ensurePushSubscription();
        } else {
          this.notifications.set([]);
          this.lastFetchedAt = null;
          this.requestInFlight = false;
          this.seenNotificationIds.clear();
          this.hasLoadedOnce = false;
          this.pushRegistrationStarted = false;
          this.pushSubscriptionActive = false;
          this.loading.set(false);
          this.isRefreshing.set(false);
          this.error.set(null);
          this.screenAlert.set(null);
          this.alertWhenVisible = null;
        }
      });
    });

    if (this.isBrowser) {
      document.addEventListener('visibilitychange', () => {
        if (!this.isAppVisible()) return;
        this.confirmDelivery();
        if (this.alertWhenVisible) {
          this.showScreenAlert(this.alertWhenVisible);
          this.alertWhenVisible = null;
        }
      });
      // Les navigateurs bloquent le son tant que la page n'a pas été touchée : on le débloque au premier geste
      const unlockAudio = () => {
        this.audio()
          ?.resume()
          .catch(() => undefined);
        document.removeEventListener('pointerdown', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
      document.addEventListener('pointerdown', unlockAudio, { passive: true });
      document.addEventListener('keydown', unlockAudio);
    }
  }

  dismissScreenAlert(): void {
    this.screenAlert.set(null);
  }

  private isAppVisible(): boolean {
    return this.isBrowser && document.visibilityState === 'visible';
  }

  /**
   * L'app est à l'écran : les alertes en attente sont reçues, le serveur n'envoie pas leur SMS de secours
   * (il ne part que si ni l'app ni le téléphone ne confirment la réception à temps).
   */
  private confirmDelivery(): void {
    const user = this.auth.currentUser();
    if (!user || user.id === 'guest') return;
    this.http
      .put(`${this.baseUrl}${API_CONFIG.endpoints.notifications}/mark-delivered`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  loadNotifications(forceRefresh: boolean = false): void {
    const user = this.auth.currentUser();
    if (!user || user.id === 'guest') {
      this.notifications.set([]);
      this.lastFetchedAt = null;
      this.loading.set(false);
      this.isRefreshing.set(false);
      return;
    }

    const now = Date.now();
    const hasData = this.notifications().length > 0;
    const isCacheValid =
      this.lastFetchedAt !== null && now - this.lastFetchedAt < this.CACHE_TTL_MS;

    if (hasData && isCacheValid && !forceRefresh) {
      return;
    }

    if (this.requestInFlight) {
      return;
    }

    if (hasData) {
      this.isRefreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);
    this.requestInFlight = true;

    this.http
      .get<any[]>(`${this.baseUrl}${API_CONFIG.endpoints.notifications}`)
      .pipe(
        map((items) =>
          (Array.isArray(items) ? items : []).map((n) => ({
            id: n.id ? String(n.id) : `notif-${Date.now()}`,
            title: n.title || 'Notification SansFile',
            message: n.message || '',
            type: (n.type ? String(n.type).toLowerCase() : 'system') as any,
            recipientRole: (n.recipientRole
              ? String(n.recipientRole).toLowerCase()
              : 'client') as any,
            createdAt: n.createdAt || n.createdDate || new Date().toISOString(),
            isRead: Boolean(n.isRead),
            targetRoute: n.targetRoute,
          })),
        ),
        tap((data) => {
          this.announceNewNotifications(data);
          this.notifications.set(data);
          this.lastFetchedAt = Date.now();
        }),
        catchError((err) => {
          console.error('[NotificationService] Error loading notifications:', err);
          this.error.set(
            this.errorMessages.message(
              err,
              'Impossible de charger les notifications. Verifiez votre connexion.',
            ),
          );
          return of([]);
        }),
        finalize(() => {
          this.requestInFlight = false;
          this.loading.set(false);
          this.isRefreshing.set(false);
        }),
      )
      .subscribe();
  }

  private announceNewNotifications(data: readonly AppNotification[]): void {
    const newUnread = data.filter((n) => !this.seenNotificationIds.has(n.id) && !n.isRead);
    this.seenNotificationIds = new Set(data.map((n) => n.id));

    if (!this.hasLoadedOnce) {
      this.hasLoadedOnce = true;
      if (this.isAppVisible()) this.confirmDelivery();
      return;
    }

    if (newUnread.length === 0) {
      return;
    }

    const latest = newUnread[0];
    if (this.isAppVisible()) {
      this.showScreenAlert(latest);
      this.confirmDelivery();
    } else {
      // App en arrière-plan : notification du téléphone, puis bandeau au retour dans l'app
      this.showBrowserNotification(latest);
      this.alertWhenVisible = latest;
    }
  }

  /** Bandeau à l'écran, avec un son et une vibration pour ne pas le manquer. */
  private showScreenAlert(notification: AppNotification): void {
    this.screenAlert.set(notification);
    this.playNotificationSound();
    try {
      navigator.vibrate?.([180, 90, 180]);
    } catch {
      // vibration indisponible (ordinateur, iPhone)
    }
  }

  private audio(): AudioContext | null {
    if (!this.isBrowser) return null;
    if (this.audioContext) return this.audioContext;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      this.audioContext = new AudioContextCtor();
    } catch {
      return null;
    }
    return this.audioContext;
  }

  /** Carillon à deux notes, assez fort pour être entendu dans un salon. */
  private playNotificationSound(): void {
    const context = this.audio();
    if (!context) return;

    const play = () => {
      const start = context.currentTime;
      [
        { frequency: 880, at: 0 },
        { frequency: 1320, at: 0.16 },
      ].forEach(({ frequency, at }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start + at);
        gain.gain.setValueAtTime(0.0001, start + at);
        gain.gain.exponentialRampToValueAtTime(0.35, start + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.45);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + at);
        oscillator.stop(start + at + 0.5);
      });
    };

    if (context.state === 'suspended') {
      // Son bloqué tant que la page n'a pas été touchée : la vibration et le bandeau restent
      context
        .resume()
        .then(play)
        .catch(() => undefined);
    } else {
      play();
    }
  }

  private showBrowserNotification(notification: AppNotification): void {
    if (!this.isBrowser || this.pushSubscriptionActive || !('Notification' in window)) return;

    const show = () => {
      const title = notification.title || 'Notification SansFile';
      const options: NotificationOptions = {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: `sansfile-${notification.id}`,
        data: { url: notification.targetRoute || '/client/notifications' },
      };

      navigator.serviceWorker?.ready
        .then((registration) => registration.showNotification(title, options))
        .catch(() => {
          const browserNotification = new Notification(title, options);
          browserNotification.onclick = () => {
            window.focus();
            if (notification.targetRoute) {
              window.location.assign(notification.targetRoute);
            }
          };
        });
    };

    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          show();
        }
      });
    }
  }

  private ensurePushSubscription(): void {
    if (!this.isBrowser || this.pushRegistrationStarted || !this.swPush?.isEnabled) {
      return;
    }

    this.pushRegistrationStarted = true;
    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const data = notification.data as
        { url?: string; onActionClick?: { default?: { url?: string } } } | undefined;
      const target = data?.url || data?.onActionClick?.default?.url || '/client/notifications';
      window.open(target, '_self');
    });

    this.http
      .get<{ publicKey: string }>(`${this.baseUrl}/push/public-key`)
      .pipe(
        catchError((err) => {
          console.warn('[NotificationService] Push public key unavailable:', err);
          return of({ publicKey: '' });
        }),
      )
      .subscribe(({ publicKey }) => {
        if (!publicKey) return;

        const subscribe = () => {
          this.swPush
            ?.requestSubscription({ serverPublicKey: publicKey })
            .then((subscription) => {
              this.pushSubscriptionActive = true;
              this.http
                .post(`${this.baseUrl}/push/subscriptions`, subscription)
                .pipe(
                  catchError((err) => {
                    this.pushSubscriptionActive = false;
                    console.warn(
                      '[NotificationService] Push subscription registration failed:',
                      err,
                    );
                    return of(null);
                  }),
                )
                .subscribe();
            })
            .catch((err) => {
              this.pushSubscriptionActive = false;
              console.warn('[NotificationService] Push subscription refused:', err);
            });
        };

        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
          subscribe();
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              subscribe();
            }
          });
        }
      });
  }

  markAsRead(id: string): Observable<AppNotification | null> {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    return this.http
      .patch<AppNotification>(`${this.baseUrl}${API_CONFIG.endpoints.notifications}/${id}/read`, {})
      .pipe(
        catchError((err) => {
          console.warn(`[NotificationService] API patch failed for ${id}:`, err);
          this.error.set(
            this.errorMessages.message(err, 'Impossible de marquer cette notification comme lue.'),
          );
          return of(null);
        }),
      );
  }

  markAllAsRead(role: 'client' | 'coiffeur' = 'client'): void {
    this.notifications.update((list) =>
      list.map((n) => (n.recipientRole === role ? { ...n, isRead: true } : n)),
    );

    this.http
      .put(`${this.baseUrl}${API_CONFIG.endpoints.notifications}/mark-all-read`, {})
      .pipe(
        catchError((err) => {
          console.warn('[NotificationService] mark-all-read backend failed:', err);
          this.error.set(
            this.errorMessages.message(err, 'Impossible de marquer les notifications comme lues.'),
          );
          return of(null);
        }),
      )
      .subscribe();
  }

  markAllAsReadByRole(role: 'client' | 'coiffeur'): void {
    this.markAllAsRead(role);
  }

  deleteNotification(id: string): Observable<boolean> {
    this.notifications.update((list) => list.filter((n) => n.id !== id));

    return this.http.delete(`${this.baseUrl}${API_CONFIG.endpoints.notifications}/${id}`).pipe(
      map(() => true),
      catchError((err) => {
        console.warn(`[NotificationService] API delete failed for ${id}:`, err);
        this.error.set(
          this.errorMessages.message(err, 'Impossible de supprimer cette notification.'),
        );
        return of(true);
      }),
    );
  }
}
