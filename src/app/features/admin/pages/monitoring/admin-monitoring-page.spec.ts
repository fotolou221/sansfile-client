import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_CONFIG } from '../../../../core/config/api.config';
import { MonitoringSnapshot } from '../../services/admin-monitoring.service';
import { AdminMonitoringPage } from './admin-monitoring-page';

const HEALTHY: MonitoringSnapshot = {
  status: 'UP',
  checkedAt: '2026-10-01T10:00:00Z',
  application: {
    version: '0.0.1',
    startedAt: '2026-10-01T08:00:00Z',
    uptimeSeconds: 7_260,
    javaVersion: '21.0.8',
    profiles: ['prod'],
    realtimeClients: 3,
  },
  components: [
    {
      key: 'database',
      label: 'Base de données',
      status: 'UP',
      detail: 'PostgreSQL répond en 2 ms',
      latencyMs: 2,
    },
    {
      key: 'redis',
      label: 'Cache Redis',
      status: 'UP',
      detail: 'Redis répond en 1 ms',
      latencyMs: 1,
    },
    {
      key: 'disk',
      label: 'Espace disque',
      status: 'UP',
      detail: '40.0 Go libres sur 80.0 Go',
      latencyMs: null,
    },
    {
      key: 'storage',
      label: 'Stockage des images',
      status: 'UP',
      detail: 'sur le serveur : 12 image(s), 3.4 Mo',
      latencyMs: null,
    },
    {
      key: 'sms',
      label: 'Envoi de SMS',
      status: 'INFO',
      detail: 'mode simulation',
      latencyMs: null,
    },
  ],
  system: {
    processCpuPercent: 4.5,
    systemCpuPercent: 12,
    processors: 2,
    heapUsedMb: 256,
    heapMaxMb: 1024,
    memoryUsedMb: 1500,
    memoryTotalMb: 4000,
    diskFreeGb: 40,
    diskTotalGb: 80,
  },
  database: { activeConnections: 1, idleConnections: 9, maxConnections: 10, waitingThreads: 0 },
  sms: {
    provider: 'mock',
    live: false,
    senderName: 'SansFile',
    remainingSms: null,
    expiresAt: null,
    daysUntilExpiry: null,
    balanceError: null,
    otpToday: 4,
    otpLast7Days: 20,
    otpLast30Days: 75,
    sentSinceStartup: 4,
    failedSinceStartup: 0,
    lastSentAt: null,
    lastFailureAt: null,
  },
  storage: {
    provider: 'local',
    cloudinaryConfigured: false,
    cloudName: null,
    cloudinary: null,
    cloudinaryError: null,
    localWritable: true,
    localFiles: 12,
    localSizeMb: 3.4,
    cloudinaryUploadsSinceStartup: 0,
    cloudinaryFailuresSinceStartup: 0,
    localUploadsSinceStartup: 2,
    lastCloudinaryUploadAt: null,
    lastCloudinaryFailureAt: null,
    cloudinaryLiveResources: null,
  },
  warnings: [],
};

describe('AdminMonitoringPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMonitoringPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function render(): { fixture: ComponentFixture<AdminMonitoringPage>; text: () => string } {
    const fixture = TestBed.createComponent(AdminMonitoringPage);
    fixture.detectChanges();
    return { fixture, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  it('shows a healthy platform with SMS in simulation mode', () => {
    const { fixture, text } = render();
    httpMock.expectOne(`${API_CONFIG.baseUrl}/admin/monitoring`).flush(HEALTHY);
    fixture.detectChanges();

    expect(text()).toContain('Tout fonctionne normalement');
    expect(text()).toContain('Base de données');
    expect(text()).toContain('Opérationnel');
    expect(text()).toContain('Simulation');
    expect(text()).toContain('Mode simulation');
    expect(text()).toContain('Serveur (local)');
    expect(text()).toContain("Cloudinary n'est pas configuré");
    expect(text()).toContain('en ligne depuis 2 h 1 min');
    fixture.destroy();
  });

  it('shows the Cloudinary account usage when it is the active storage', () => {
    const { fixture, text } = render();
    httpMock.expectOne(`${API_CONFIG.baseUrl}/admin/monitoring`).flush({
      ...HEALTHY,
      storage: {
        ...HEALTHY.storage,
        provider: 'cloudinary',
        cloudinaryConfigured: true,
        cloudName: 'demo-cloud',
        cloudinary: {
          plan: 'Free',
          creditsUsed: 0.3,
          creditsLimit: 25,
          creditsUsedPercent: 1.2,
          storageBytes: 193_918_646,
          bandwidthBytes: 80_962_501,
          transformations: 35,
          resources: 99,
          lastUpdated: '2026-09-30',
          latencyMs: 120,
        },
        cloudinaryFailuresSinceStartup: 1,
        lastCloudinaryFailureAt: '2026-10-01T09:00:00Z',
        cloudinaryLiveResources: 7,
      },
    });
    fixture.detectChanges();

    // Le compteur en direct remplace le chiffre du rapport quotidien (99, d'avant les suppressions)
    expect(text()).toContain('Images · en direct');
    expect(text()).not.toContain('99');
    expect(text()).toContain('1,2 %');
    expect(text()).toContain('0,3 / 25 crédits');
    expect(text()).toContain('forfait Free');
    expect(text()).toContain('185 Mo');
    expect(text()).toContain('demo-cloud');
    expect(text()).toContain('Échecs Cloudinary');
    expect(text()).toContain('Ouvrir la console Cloudinary');
    fixture.destroy();
  });

  it('reports an unreachable server', () => {
    const { fixture, text } = render();
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/admin/monitoring`)
      .flush(null, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();

    expect(text()).toContain('Serveur injoignable');
    fixture.destroy();
  });
});
