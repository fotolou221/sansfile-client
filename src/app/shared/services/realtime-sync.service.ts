import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { API_CONFIG } from '../../core/config/api.config';
import { SalonService } from './salon.service';
import { TicketService } from './ticket.service';
import { AdminDataService } from '../../features/admin/services/admin-data.service';
import { NotificationService } from './notification.service';
import { ProductService } from './product.service';
import { OrderService } from './order.service';
import { PlatformSettingsService } from './platform-settings.service';
import { Salon } from '../models/salon';

/**
 * Service singleton de synchronisation en temps réel (Server-Sent Events).
 * Écoute en continu les changements de salons, files d'attente et tickets
 * pour actualiser instantanément l'interface (Admin, Coiffeurs, Clients) sans rechargement.
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeSyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly ngZone = inject(NgZone);
  private readonly salonService = inject(SalonService);
  private readonly ticketService = inject(TicketService);
  private readonly adminDataService = inject(AdminDataService);
  private readonly notificationService = inject(NotificationService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly platformSettings = inject(PlatformSettingsService);

  private eventSource: EventSource | null = null;
  private reconnectTimer: any = null;

  constructor() {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        this.connect();
      });
    }
  }

  private connect(): void {
    if (!this.isBrowser || typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const url = `${API_CONFIG.baseUrl}/realtime/events`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('⚡ [RealtimeSync] Connecté au flux temps réel SansFile');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.addEventListener('CONNECTED', (e: MessageEvent) => {
        console.log('⚡ [RealtimeSync] Session temps réel active :', e.data);
      });

      this.eventSource.addEventListener('SALON_UPDATED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(e.data);
            this.handleSalonUpdated(data);
          } catch (err) {
            console.warn('[RealtimeSync] Error parsing SALON_UPDATED:', err);
          }
        });
      });

      this.eventSource.addEventListener('SALON_CREATED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(e.data);
            this.handleSalonCreated(data);
          } catch (err) {
            console.warn('[RealtimeSync] Error parsing SALON_CREATED:', err);
          }
        });
      });

      this.eventSource.addEventListener('SALON_DELETED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(e.data);
            this.handleSalonDeleted(data);
          } catch (err) {
            console.warn('[RealtimeSync] Error parsing SALON_DELETED:', err);
          }
        });
      });

      this.eventSource.addEventListener('TICKET_CREATED', () => {
        this.ngZone.run(() => {
          this.ticketService.loadTickets(true);
          this.adminDataService.loadFromBackend();
          this.notificationService.loadNotifications(true);
        });
      });

      this.eventSource.addEventListener('TICKET_UPDATED', () => {
        this.ngZone.run(() => {
          this.ticketService.loadTickets(true);
          this.adminDataService.loadFromBackend();
          this.notificationService.loadNotifications(true);
        });
      });

      this.eventSource.addEventListener('QUEUE_UPDATED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          this.ticketService.loadTickets(true);
          this.notificationService.loadNotifications(true);
          try {
            // Flux public : seulement le salon et le nombre de personnes en attente (aucune donnée personnelle)
            const update = JSON.parse(e.data) as {
              salonId?: number | string;
              waitingCount?: number;
            };
            const salonId = update.salonId?.toString();
            const waiting = update.waitingCount ?? 0;
            if (salonId) {
              this.salonService.updateSalonWaiting(salonId, waiting);
              this.adminDataService.salons.update((list) =>
                list.map((s) =>
                  s.id === salonId ||
                  s.slug === salonId ||
                  (s.numericId && s.numericId.toString() === salonId)
                    ? { ...s, peopleWaiting: waiting, estimatedWaitMinutes: waiting * 20 }
                    : s,
                ),
              );
            }
          } catch (err) {
            console.warn('[RealtimeSync] Error parsing QUEUE_UPDATED:', err);
          }
        });
      });

      this.eventSource.addEventListener('NOTIFICATION_CREATED', () => {
        this.ngZone.run(() => {
          this.notificationService.loadNotifications(true);
        });
      });

      // ── Boutique : produits & catégories ──────────────────
      const handleProductChange = (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const dto = JSON.parse(e.data);
            if (dto) {
              this.productService.upsertProduct(dto);
              this.adminDataService.upsertProduct(dto);
            }
          } catch {
            this.productService.loadProducts(true);
            this.adminDataService.loadProducts();
          }
        });
      };
      this.eventSource.addEventListener('PRODUCT_CREATED', handleProductChange);
      this.eventSource.addEventListener('PRODUCT_UPDATED', handleProductChange);

      this.eventSource.addEventListener('PRODUCT_DELETED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(e.data);
            if (data?.id) {
              this.productService.removeProduct(data.id);
              this.adminDataService.removeProduct(data.id);
            }
          } catch {
            this.productService.loadProducts(true);
            this.adminDataService.loadProducts();
          }
        });
      });

      const handleCategoryChange = (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const dto = JSON.parse(e.data);
            if (dto) {
              this.productService.upsertCategory(dto);
              this.adminDataService.upsertCategory(dto);
            }
          } catch {
            this.productService.loadCategories(true);
            this.adminDataService.loadCategories();
          }
        });
      };
      this.eventSource.addEventListener('CATEGORY_CREATED', handleCategoryChange);
      this.eventSource.addEventListener('CATEGORY_UPDATED', handleCategoryChange);

      this.eventSource.addEventListener('CATEGORY_DELETED', (e: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(e.data);
            if (data?.id) {
              this.productService.removeCategory(data.id);
              this.adminDataService.removeCategory(data.id);
            }
          } catch {
            this.productService.loadCategories(true);
            this.adminDataService.loadCategories();
          }
        });
      });

      // ── Boutique : commandes ──────────────────────────────
      // Le flux ne transporte que l'identifiant de la commande : chacun recharge ses propres commandes via l'API
      const refreshOrders = () => {
        this.ngZone.run(() => {
          this.notificationService.loadNotifications(true);
          this.orderService.loadOrders(true);
          this.adminDataService.loadOrders();
        });
      };
      this.eventSource.addEventListener('ORDER_CREATED', refreshOrders);
      this.eventSource.addEventListener('ORDER_UPDATED', refreshOrders);
      this.eventSource.addEventListener('ORDER_DELETED', () => {
        this.ngZone.run(() => {
          this.orderService.loadOrders(true);
          this.adminDataService.loadOrders();
        });
      });

      // Coordonnées du support et mode maintenance modifiés depuis l'admin
      this.eventSource.addEventListener('SETTINGS_UPDATED', () => {
        this.ngZone.run(() => this.platformSettings.refresh());
      });

      this.eventSource.onerror = () => {
        // Déconnexion naturelle due au timeout du proxy (Nginx / Cloudflare)
        // Fermeture propre de la socket et reconnexion automatique en arrière-plan
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
      };
    } catch (err) {
      console.warn("⚡ [RealtimeSync] Impossible d'initialiser EventSource:", err);
    }
  }

  private handleSalonUpdated(data: any): void {
    if (!data) return;

    const salonId = (data.id ?? data.salonId)?.toString();
    const slug = data.slug;
    const newStatus = data.status ? data.status.toLowerCase() : undefined;
    const newWaiting = data.peopleWaiting !== undefined ? Number(data.peopleWaiting) : undefined;
    const newEstimated =
      data.estimatedWaitMinutes !== undefined ? Number(data.estimatedWaitMinutes) : undefined;

    // 1. Update SalonService.salons
    this.salonService.salons.update((list) =>
      list.map((s) => {
        const matches =
          (salonId && (s.id === salonId || (s.numericId && s.numericId.toString() === salonId))) ||
          (slug && (s.slug === slug || s.id === slug));
        if (matches) {
          return {
            ...s,
            ...(newStatus !== undefined ? { status: newStatus as any } : {}),
            ...(newWaiting !== undefined ? { peopleWaiting: newWaiting } : {}),
            ...(newEstimated !== undefined ? { estimatedWaitMinutes: newEstimated } : {}),
            ...(data.name ? { name: data.name } : {}),
            ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
            ...(data.coverUrl ? { coverUrl: data.coverUrl } : {}),
          };
        }
        return s;
      }),
    );

    // 2. Update AdminDataService.salons
    this.adminDataService.salons.update((list) =>
      list.map((s) => {
        const matches =
          (salonId && (s.id === salonId || (s.numericId && s.numericId.toString() === salonId))) ||
          (slug && (s.slug === slug || s.id === slug));
        if (matches) {
          return {
            ...s,
            ...(newStatus !== undefined ? { status: newStatus as any } : {}),
            ...(newWaiting !== undefined ? { peopleWaiting: newWaiting } : {}),
            ...(newEstimated !== undefined ? { estimatedWaitMinutes: newEstimated } : {}),
          };
        }
        return s;
      }),
    );
  }

  private handleSalonCreated(data: any): void {
    if (!data || !data.id) return;

    const newSalon: Salon = {
      id: data.slug || data.id.toString(),
      name: data.name || 'Nouveau Salon',
      slug: data.slug,
      district: data.district || '',
      location: data.location || '',
      phone: data.phone || '',
      status: data.status ? data.status.toLowerCase() : 'open',
      peopleWaiting: data.peopleWaiting || 0,
      avatarUrl: data.avatarUrl || 'images/salons/king-barber-avatar.png',
      coverUrl: data.coverUrl || 'images/salons/king-barber-cover.png',
      latitude: data.latitude || 14.716677,
      longitude: data.longitude || -17.467686,
      actions: [
        { label: 'Site Web', icon: 'globe', href: '#' },
        { label: 'Appeler', icon: 'phone', href: `tel:${data.phone || ''}` },
        { label: 'Direction', icon: 'navigation', href: '#' },
        { label: 'Partager', icon: 'share', href: '#' },
      ],
    };

    this.salonService.salons.update((list) => {
      if (list.some((s) => s.id === newSalon.id || s.slug === newSalon.slug)) {
        return list;
      }
      return [newSalon, ...list];
    });

    this.adminDataService.salons.update((list) => {
      if (list.some((s) => s.id === newSalon.id || s.slug === newSalon.slug)) {
        return list;
      }
      return [newSalon, ...list];
    });
  }

  private handleSalonDeleted(data: any): void {
    if (!data || !data.id) return;
    const delId = data.id.toString();

    this.salonService.salons.update((list) =>
      list.filter((s) => s.id !== delId && s.slug !== delId),
    );
    this.adminDataService.salons.update((list) =>
      list.filter((s) => s.id !== delId && s.slug !== delId),
    );
  }
}
