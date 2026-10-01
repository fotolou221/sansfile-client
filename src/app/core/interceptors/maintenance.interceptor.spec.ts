import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_CONFIG } from '../config/api.config';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';
import { maintenanceInterceptor } from './maintenance.interceptor';

describe('maintenanceInterceptor', () => {
  const settingsUrl = `${API_CONFIG.baseUrl}/platform-settings`;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([maintenanceInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lets the settings service load at startup (no circular dependency)', async () => {
    const settings = TestBed.inject(PlatformSettingsService);

    httpMock.expectOne(settingsUrl).flush([{ maintenanceMode: true }]);
    await settings.whenLoaded();

    expect(settings.maintenanceMode()).toBe(true);
  });

  it('re-reads the settings when the server answers « maintenance »', async () => {
    const settings = TestBed.inject(PlatformSettingsService);
    httpMock.expectOne(settingsUrl).flush([{ maintenanceMode: false }]);
    await settings.whenLoaded();

    TestBed.inject(HttpClient)
      .post(`${API_CONFIG.baseUrl}/tickets/book-multiple`, {})
      .subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/tickets/book-multiple`)
      .flush(
        { error: 'SansFile est en maintenance.', maintenance: true },
        { status: 503, statusText: 'Service Unavailable' },
      );

    httpMock.expectOne(settingsUrl).flush([{ maintenanceMode: true }]);
    await Promise.resolve();
    expect(settings.maintenanceMode()).toBe(true);
  });
});
