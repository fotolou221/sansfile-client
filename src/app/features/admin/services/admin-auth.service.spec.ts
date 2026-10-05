import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { AdminAuthService } from './admin-auth.service';

/** Jeton d'accès factice portant les rôles donnés (claim « auth »). */
function fakeJwt(auth: string): string {
  const encode = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${encode({ alg: 'HS512' })}.${encode({ sub: 'user', auth })}.signature`;
}

const ADMIN_TOKEN = fakeJwt('ROLE_ADMIN ROLE_USER');

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin/login', component: class {} }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AdminAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate and store the tokens when the API accepts the credentials', async () => {
    const result = firstValueFrom(service.login(' Admin@SansFile.sn ', 'secret-password'));

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/authenticate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'admin@sansfile.sn',
      password: 'secret-password',
      rememberMe: true,
    });
    req.flush({ id_token: ADMIN_TOKEN, refresh_token: 'refresh-token' });

    expect(await result).toEqual({ success: true });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentAdmin()?.email).toBe('admin@sansfile.sn');
    expect(localStorage.getItem('sansfile_jwt_token')).toBe(ADMIN_TOKEN);
    expect(localStorage.getItem('sansfile_refresh_token')).toBe('refresh-token');
  });

  it('should fail with a clear message when the API rejects the credentials', async () => {
    const result = firstValueFrom(service.login('wrong@sansfile.sn', 'bad-password'));

    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const res = await result;
    expect(res.success).toBe(false);
    expect(res.message).toContain('Identifiants invalides');
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sansfile_jwt_token')).toBeNull();
  });

  it('should refuse a field agent account and keep no session', async () => {
    const result = firstValueFrom(service.login('agent@terrain.sn', 'Terrain2026!'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ id_token: fakeJwt('ROLE_USER ROLE_AGENT'), refresh_token: 'refresh-token' });

    const res = await result;
    expect(res.success).toBe(false);
    expect(res.message).toContain("pas accès à la console d'administration");
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sansfile_jwt_token')).toBeNull();
  });

  it('should logout and clear the whole session', async () => {
    const result = firstValueFrom(service.login('admin@sansfile.sn', 'secret-password'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ id_token: ADMIN_TOKEN, refresh_token: 'refresh-token' });
    await result;
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentAdmin()).toBeNull();
    expect(localStorage.getItem('sansfile_jwt_token')).toBeNull();
    expect(localStorage.getItem('sansfile_refresh_token')).toBeNull();
  });
});
