import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import {
  AdminMonitoringService,
  MonitoringComponent,
  MonitoringSnapshot,
  MonitoringStatus,
} from '../../services/admin-monitoring.service';

/** Actualisation automatique tant que la page est ouverte et visible. */
const REFRESH_INTERVAL_MS = 30_000;

interface Gauge {
  label: string;
  value: string;
  percent: number | null;
}

@Component({
  selector: 'app-admin-monitoring-page',
  template: `
    <div class="admin-page">
      <div class="admin-page__header">
        <div>
          <h1>Supervision</h1>
          <p>
            Santé de la plateforme, ressources du serveur, abonnement SMS et stockage des images.
            Actualisé toutes les 30 secondes.
          </p>
        </div>
        <div class="monitoring-actions">
          @if (snapshot(); as s) {
            <span class="monitoring-actions__time">Vérifié à {{ formatTime(s.checkedAt) }}</span>
          }
          <button
            type="button"
            class="admin-btn admin-btn--primary"
            (click)="refresh()"
            [disabled]="loading()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              [class.spinning]="loading()"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{{ loading() ? 'Vérification…' : 'Actualiser' }}</span>
          </button>
        </div>
      </div>

      @if (error(); as message) {
        <div class="monitoring-banner monitoring-banner--DOWN" role="alert">
          <span class="monitoring-banner__dot"></span>
          <div class="monitoring-banner__body">
            <span class="monitoring-banner__title">Serveur injoignable</span>
            <span class="monitoring-banner__text">{{ message }}</span>
          </div>
        </div>
      } @else if (snapshot(); as s) {
        <div class="monitoring-banner" [class]="'monitoring-banner monitoring-banner--' + s.status">
          <span class="monitoring-banner__dot"></span>
          <div class="monitoring-banner__body">
            <span class="monitoring-banner__title">{{ bannerTitle(s.status) }}</span>
            @if (s.warnings.length) {
              <ul class="monitoring-banner__list">
                @for (warning of s.warnings; track warning) {
                  <li>{{ warning }}</li>
                }
              </ul>
            } @else {
              <span class="monitoring-banner__text">
                Base de données, cache, disque, stockage des images et envoi de SMS répondent
                correctement.
              </span>
            }
          </div>
        </div>
      } @else {
        <div class="monitoring-banner monitoring-banner--INFO">
          <span class="monitoring-banner__dot"></span>
          <div class="monitoring-banner__body">
            <span class="monitoring-banner__title">Vérification en cours…</span>
          </div>
        </div>
      }

      @if (snapshot(); as s) {
        <div class="monitoring-services">
          @for (component of s.components; track component.key) {
            <div class="monitoring-service">
              <div class="monitoring-service__head">
                <span class="monitoring-service__name">{{ component.label }}</span>
                <span class="status-chip" [class]="'status-chip status-chip--' + component.status">
                  {{ statusLabel(component) }}
                </span>
              </div>
              <span class="monitoring-service__detail">{{ component.detail }}</span>
            </div>
          }
        </div>

        <div class="monitoring-grid">
          <!-- Abonnement SMS -->
          <div class="admin-card">
            <div class="admin-card__title">
              <h3>Abonnement SMS</h3>
              <p>Codes de connexion et alertes de tickets envoyés via SendText.</p>
            </div>

            @if (!s.sms.live) {
              <div class="monitoring-note">
                Mode simulation : aucun SMS réel n'est envoyé (code de test). En production, mettez
                <code>SMS_PROVIDER=sendtext</code> dans le fichier <code>.env</code>.
              </div>
            } @else if (s.sms.balanceError) {
              <div class="monitoring-note monitoring-note--danger">
                SendText : {{ s.sms.balanceError }}
              </div>
            } @else {
              <div class="sms-balance">
                <span
                  class="sms-balance__value"
                  [class.sms-balance__value--low]="(s.sms.remainingSms ?? 0) < lowBalance"
                >
                  {{ formatNumber(s.sms.remainingSms) }}
                </span>
                <span class="sms-balance__label">SMS restants</span>
                @if (s.sms.expiresAt) {
                  <span class="sms-balance__expiry">
                    Forfait valable jusqu'au {{ formatDate(s.sms.expiresAt) }}
                    @if (s.sms.daysUntilExpiry !== null) {
                      ({{
                        s.sms.daysUntilExpiry < 0
                          ? 'expiré'
                          : 'encore ' + s.sms.daysUntilExpiry + ' jour(s)'
                      }})
                    }
                  </span>
                }
              </div>
            }

            <div class="mini-stats">
              <div class="mini-stats__item">
                <span class="mini-stats__value">{{ formatNumber(s.sms.otpToday) }}</span>
                <span class="mini-stats__label">Codes aujourd'hui</span>
              </div>
              <div class="mini-stats__item">
                <span class="mini-stats__value">{{ formatNumber(s.sms.otpLast7Days) }}</span>
                <span class="mini-stats__label">Sur 7 jours</span>
              </div>
              <div class="mini-stats__item">
                <span class="mini-stats__value">{{ formatNumber(s.sms.otpLast30Days) }}</span>
                <span class="mini-stats__label">Sur 30 jours</span>
              </div>
            </div>

            <dl class="monitoring-list">
              <div>
                <dt>Fournisseur</dt>
                <dd>{{ s.sms.live ? 'SendText' : 'Simulation' }}</dd>
              </div>
              <div>
                <dt>Nom d'expéditeur</dt>
                <dd>{{ s.sms.senderName }}</dd>
              </div>
              <div>
                <dt>Depuis le démarrage</dt>
                <dd>
                  {{ formatNumber(s.sms.sentSinceStartup) }} envoyé(s),
                  {{ formatNumber(s.sms.failedSinceStartup) }} échec(s)
                </dd>
              </div>
              @if (s.sms.lastFailureAt) {
                <div>
                  <dt>Dernier échec</dt>
                  <dd>{{ formatDate(s.sms.lastFailureAt, true) }}</dd>
                </div>
              }
            </dl>

            @if (s.sms.live) {
              <a class="monitoring-link" href="https://sendtext.sn" target="_blank" rel="noopener">
                Recharger ou gérer l'abonnement sur SendText ↗
              </a>
            }
          </div>

          <!-- Stockage des images (Cloudinary ou serveur) -->
          <div class="admin-card">
            <div class="admin-card__title">
              <h3>Stockage des images</h3>
              <p>
                @if (s.storage.provider === 'cloudinary') {
                  Photos des salons, produits et avatars hébergées sur Cloudinary (CDN).
                } @else {
                  Photos des salons, produits et avatars enregistrées sur le serveur.
                }
              </p>
            </div>

            @if (s.storage.provider === 'cloudinary' && !s.storage.cloudinaryConfigured) {
              <div class="monitoring-note monitoring-note--danger">
                Cloudinary est choisi mais ses clés sont absentes du fichier <code>.env</code> : les
                images sont enregistrées sur le serveur.
              </div>
            }
            @if (s.storage.cloudinaryError) {
              <div class="monitoring-note monitoring-note--danger">
                Cloudinary {{ s.storage.cloudinaryError }}.
              </div>
            }

            @if (s.storage.cloudinary; as cld) {
              <div class="sms-balance">
                <span
                  class="sms-balance__value"
                  [class.sms-balance__value--low]="(cld.creditsUsedPercent ?? 0) >= 80"
                >
                  {{
                    cld.creditsUsedPercent === null
                      ? '—'
                      : formatNumber(cld.creditsUsedPercent) + ' %'
                  }}
                </span>
                <span class="sms-balance__label">du quota Cloudinary utilisé</span>
                <span class="sms-balance__expiry">
                  @if (cld.creditsLimit !== null) {
                    {{ formatNumber(cld.creditsUsed) }} /
                    {{ formatNumber(cld.creditsLimit) }} crédits ·
                  }
                  forfait {{ cld.plan }}
                  @if (cld.lastUpdated) {
                    · chiffres du {{ formatDate(cld.lastUpdated) }}
                  }
                </span>
              </div>
              <div class="gauge__bar">
                <div
                  class="gauge__fill"
                  [style.width.%]="cld.creditsUsedPercent ?? 0"
                  [class.gauge__fill--warn]="(cld.creditsUsedPercent ?? 0) >= 80"
                  [class.gauge__fill--danger]="(cld.creditsUsedPercent ?? 0) >= 100"
                ></div>
              </div>

              <div class="mini-stats">
                <div class="mini-stats__item">
                  <span class="mini-stats__value">{{
                    formatNumber(s.storage.cloudinaryLiveResources ?? cld.resources)
                  }}</span>
                  <span class="mini-stats__label">
                    Images{{ s.storage.cloudinaryLiveResources !== null ? ' · en direct' : '' }}
                  </span>
                </div>
                <div class="mini-stats__item">
                  <span class="mini-stats__value">{{ formatBytes(cld.storageBytes) }}</span>
                  <span class="mini-stats__label">Stockage</span>
                </div>
                <div class="mini-stats__item">
                  <span class="mini-stats__value">{{ formatBytes(cld.bandwidthBytes) }}</span>
                  <span class="mini-stats__label">Bande passante</span>
                </div>
              </div>
            } @else if (!s.storage.cloudinaryConfigured && s.storage.provider === 'local') {
              <div class="monitoring-note">
                Cloudinary n'est pas configuré. Pour l'utiliser :
                <code>STORAGE_PROVIDER=cloudinary</code> et les clés <code>CLOUDINARY_*</code> dans
                le fichier <code>.env</code>.
              </div>
            }

            <dl class="monitoring-list">
              <div>
                <dt>Mode actif</dt>
                <dd>
                  {{ s.storage.provider === 'cloudinary' ? 'Cloudinary' : 'Serveur (local)' }}
                </dd>
              </div>
              @if (s.storage.cloudName) {
                <div>
                  <dt>Compte Cloudinary</dt>
                  <dd>
                    {{ s.storage.cloudName }}
                    @if (s.storage.provider === 'local') {
                      (configuré, inactif)
                    }
                  </dd>
                </div>
              }
              <div>
                <dt>Images sur le serveur</dt>
                <dd>
                  {{ formatNumber(s.storage.localFiles) }} ({{ s.storage.localSizeMb }} Mo)
                  @if (!s.storage.localWritable) {
                    · écriture impossible
                  }
                </dd>
              </div>
              <div>
                <dt>Envois depuis le démarrage</dt>
                <dd>
                  {{ formatNumber(s.storage.cloudinaryUploadsSinceStartup) }} Cloudinary ·
                  {{ formatNumber(s.storage.localUploadsSinceStartup) }} serveur
                </dd>
              </div>
              @if (s.storage.cloudinaryFailuresSinceStartup > 0) {
                <div>
                  <dt>Échecs Cloudinary (bascule serveur)</dt>
                  <dd>
                    {{ formatNumber(s.storage.cloudinaryFailuresSinceStartup) }}
                    @if (s.storage.lastCloudinaryFailureAt) {
                      · dernier le {{ formatDate(s.storage.lastCloudinaryFailureAt, true) }}
                    }
                  </dd>
                </div>
              }
            </dl>

            @if (s.storage.cloudinaryConfigured) {
              <a
                class="monitoring-link"
                href="https://console.cloudinary.com/"
                target="_blank"
                rel="noopener"
              >
                Ouvrir la console Cloudinary ↗
              </a>
            }
          </div>

          <!-- Serveur : toute la largeur, jauges à gauche et détails à droite -->
          <div class="admin-card admin-card--wide">
            <div class="admin-card__title">
              <h3>Serveur</h3>
              <p>
                Version {{ s.application.version }} · en ligne depuis
                {{ formatUptime(s.application.uptimeSeconds) }}
              </p>
            </div>

            <div class="server-layout">
              <div class="gauges">
                @for (gauge of gauges(); track gauge.label) {
                  <div class="gauge">
                    <div class="gauge__head">
                      <span class="gauge__label">{{ gauge.label }}</span>
                      <span class="gauge__value">{{ gauge.value }}</span>
                    </div>
                    <div class="gauge__bar">
                      <div
                        class="gauge__fill"
                        [style.width.%]="gauge.percent ?? 0"
                        [class.gauge__fill--warn]="(gauge.percent ?? 0) >= 75"
                        [class.gauge__fill--danger]="(gauge.percent ?? 0) >= 90"
                      ></div>
                    </div>
                  </div>
                }
              </div>

              <dl class="monitoring-list">
                <div>
                  <dt>Connexions à la base</dt>
                  <dd>
                    @if (s.database; as db) {
                      {{ db.activeConnections }} active(s) / {{ db.maxConnections }} max
                      @if (db.waitingThreads > 0) {
                        · {{ db.waitingThreads }} en attente
                      }
                    } @else {
                      inconnu
                    }
                  </dd>
                </div>
                <div>
                  <dt>Navigateurs connectés en direct</dt>
                  <dd>{{ formatNumber(s.application.realtimeClients) }}</dd>
                </div>
                <div>
                  <dt>Démarré le</dt>
                  <dd>{{ formatDate(s.application.startedAt, true) }}</dd>
                </div>
                <div>
                  <dt>Java · processeurs</dt>
                  <dd>{{ s.application.javaVersion }} · {{ s.system.processors }} cœur(s)</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './admin-monitoring-page.scss',
})
export class AdminMonitoringPage implements OnInit {
  private readonly monitoring = inject(AdminMonitoringService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lowBalance = 200;
  protected readonly snapshot = signal<MonitoringSnapshot | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly gauges = computed<Gauge[]>(() => {
    const s = this.snapshot();
    if (!s) return [];
    const sys = s.system;
    const diskUsed = Math.max(0, sys.diskTotalGb - sys.diskFreeGb);
    return [
      {
        label: 'Processeur (SansFile)',
        value: sys.processCpuPercent === null ? 'inconnu' : `${sys.processCpuPercent} %`,
        percent: sys.processCpuPercent,
      },
      {
        label: 'Processeur (serveur)',
        value: sys.systemCpuPercent === null ? 'inconnu' : `${sys.systemCpuPercent} %`,
        percent: sys.systemCpuPercent,
      },
      {
        label: 'Mémoire Java',
        value: `${this.formatNumber(sys.heapUsedMb)} / ${this.formatNumber(sys.heapMaxMb)} Mo`,
        percent: this.ratio(sys.heapUsedMb, sys.heapMaxMb),
      },
      {
        label: 'Mémoire du serveur',
        value: `${this.formatNumber(sys.memoryUsedMb)} / ${this.formatNumber(sys.memoryTotalMb)} Mo`,
        percent: this.ratio(sys.memoryUsedMb, sys.memoryTotalMb),
      },
      {
        label: 'Disque',
        value: `${diskUsed.toFixed(1)} / ${sys.diskTotalGb.toFixed(1)} Go utilisés`,
        percent: this.ratio(diskUsed, sys.diskTotalGb),
      },
    ];
  });

  ngOnInit(): void {
    this.refresh();
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.refresh();
      }
    }, REFRESH_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected refresh(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.monitoring.load().subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected bannerTitle(status: MonitoringStatus): string {
    switch (status) {
      case 'UP':
        return 'Tout fonctionne normalement';
      case 'DOWN':
        return 'Incident : un service essentiel est en panne';
      default:
        return 'Attention : des points sont à surveiller';
    }
  }

  protected statusLabel(component: MonitoringComponent): string {
    switch (component.status) {
      case 'UP':
        return 'Opérationnel';
      case 'WARN':
        return 'À surveiller';
      case 'DOWN':
        return 'En panne';
      default:
        return component.key === 'sms' ? 'Simulation' : 'Information';
    }
  }

  protected formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat('fr-FR').format(value);
  }

  protected formatDate(iso: string, withTime = false): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(
      'fr-FR',
      withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'long' },
    );
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR');
  }

  protected formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    if (days > 0) return `${days} j ${hours} h`;
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${Math.max(minutes, 1)} min`;
  }

  protected formatBytes(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '—';
    const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    const digits = unit === 0 || value >= 100 ? 0 : 1;
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
  }

  private ratio(used: number, total: number): number | null {
    return total > 0 ? Math.min(100, Math.round((used / total) * 1000) / 10) : null;
  }
}
