import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { HttpErrorMessageService } from '../../../shared/services/http-error-message.service';

/** UP = OK, WARN = à surveiller, DOWN = en panne, INFO = informatif (ex. SMS en simulation). */
export type MonitoringStatus = 'UP' | 'WARN' | 'DOWN' | 'INFO';

export interface MonitoringComponent {
  key: 'database' | 'redis' | 'disk' | 'sms' | string;
  label: string;
  status: MonitoringStatus;
  detail: string;
  latencyMs: number | null;
}

export interface MonitoringSnapshot {
  status: MonitoringStatus;
  checkedAt: string;
  application: {
    version: string;
    startedAt: string;
    uptimeSeconds: number;
    javaVersion: string;
    profiles: string[];
    realtimeClients: number;
  };
  components: MonitoringComponent[];
  system: {
    processCpuPercent: number | null;
    systemCpuPercent: number | null;
    processors: number;
    heapUsedMb: number;
    heapMaxMb: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    diskFreeGb: number;
    diskTotalGb: number;
  };
  database: {
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    waitingThreads: number;
  } | null;
  sms: {
    provider: string;
    live: boolean;
    senderName: string;
    remainingSms: number | null;
    expiresAt: string | null;
    daysUntilExpiry: number | null;
    balanceError: string | null;
    otpToday: number;
    otpLast7Days: number;
    otpLast30Days: number;
    sentSinceStartup: number;
    failedSinceStartup: number;
    lastSentAt: string | null;
    lastFailureAt: string | null;
  };
  storage: {
    provider: 'cloudinary' | 'local';
    cloudinaryConfigured: boolean;
    cloudName: string | null;
    /** Consommation de la période en cours, présente dès que les clés Cloudinary sont renseignées. */
    cloudinary: {
      plan: string;
      creditsUsed: number | null;
      creditsLimit: number | null;
      creditsUsedPercent: number | null;
      storageBytes: number | null;
      bandwidthBytes: number | null;
      transformations: number | null;
      resources: number | null;
      lastUpdated: string | null;
      latencyMs: number;
    } | null;
    cloudinaryError: string | null;
    localWritable: boolean;
    localFiles: number;
    localSizeMb: number;
    cloudinaryUploadsSinceStartup: number;
    cloudinaryFailuresSinceStartup: number;
    localUploadsSinceStartup: number;
    lastCloudinaryUploadAt: string | null;
    lastCloudinaryFailureAt: string | null;
    /** Nombre de fichiers sur Cloudinary à l'instant ; `cloudinary.resources` n'est recalculé qu'une fois par jour. */
    cloudinaryLiveResources: number | null;
  };
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly errorMessages = inject(HttpErrorMessageService);

  load(): Observable<MonitoringSnapshot> {
    return this.http
      .get<MonitoringSnapshot>(`${API_CONFIG.baseUrl}/admin/monitoring`)
      .pipe(
        catchError((err) =>
          throwError(
            () =>
              new Error(
                this.errorMessages.message(err, 'Impossible de joindre le serveur SansFile.'),
              ),
          ),
        ),
      );
  }
}
