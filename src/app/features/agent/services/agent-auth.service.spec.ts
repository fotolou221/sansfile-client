import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { AgentProfile } from '../models/agent';
import { AgentAuthService } from './agent-auth.service';

/** Jeton d'accès factice portant les rôles donnés (claim « auth »). */
function fakeJwt(auth: string): string {
  const encode = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${encode({ alg: 'HS512' })}.${encode({ sub: 'agent', auth })}.signature`;
}

const PROFILE: AgentProfile = {
  id: 42,
  firstName: 'Awa',
  lastName: 'Ndiaye',
  email: 'awa@terrain.sn',
  phone: null,
  mustChangePassword: true,
};

describe('AgentAuthService', () => {
  let service: AgentAuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AgentAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs an agent in with e-mail and password, then loads the profile', async () => {
    const result = firstValueFrom(service.login(' Awa@Terrain.sn ', 'sansfile2026@'));

    const auth = httpMock.expectOne(`${API_CONFIG.baseUrl}/authenticate`);
    expect(auth.request.body).toEqual({
      username: 'awa@terrain.sn',
      password: 'sansfile2026@',
      rememberMe: true,
    });
    auth.flush({ id_token: fakeJwt('ROLE_USER ROLE_AGENT'), refresh_token: 'refresh' });
    httpMock.expectOne(`${API_CONFIG.baseUrl}/agent/me`).flush(PROFILE);

    expect(await result).toEqual({ success: true });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.mustChangePassword()).toBe(true);
    expect(service.initials()).toBe('AN');
    expect(localStorage.getItem('sansfile_refresh_token')).toBe('refresh');
  });

  it('refuses an account that is not a field agent and keeps no session', async () => {
    const result = firstValueFrom(service.login('admin@sansfile.com', 'secret'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ id_token: fakeJwt('ROLE_USER ROLE_ADMIN'), refresh_token: 'refresh' });

    const res = await result;
    expect(res.success).toBe(false);
    expect(res.message).toContain("n'est pas un compte agent");
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sansfile_jwt_token')).toBeNull();
  });

  it('shows a clear message on wrong credentials', async () => {
    const result = firstValueFrom(service.login('awa@terrain.sn', 'faux'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect((await result).message).toBe('E-mail ou mot de passe incorrect.');
  });

  it('sends the agent to the password page when the server requires it', () => {
    const handled = service.handleApiError(
      new HttpErrorResponse({ status: 403, error: { code: 'password-change-required' } }),
    );

    expect(handled).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/agent/mot-de-passe']);
  });

  it('closes the session of a disabled agent', async () => {
    const login = firstValueFrom(service.login('awa@terrain.sn', 'Terrain2026!'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ id_token: fakeJwt('ROLE_AGENT'), refresh_token: 'refresh' });
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/agent/me`)
      .flush({ ...PROFILE, mustChangePassword: false });
    await login;

    service.handleApiError(
      new HttpErrorResponse({ status: 403, error: { code: 'agent-disabled' } }),
    );

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sansfile_jwt_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/agent/login'], {
      queryParams: { desactive: 1 },
    });
  });

  it('clears the « change your password » obligation once the new password is saved', async () => {
    const login = firstValueFrom(service.login('awa@terrain.sn', 'sansfile2026@'));
    httpMock
      .expectOne(`${API_CONFIG.baseUrl}/authenticate`)
      .flush({ id_token: fakeJwt('ROLE_AGENT'), refresh_token: 'refresh' });
    httpMock.expectOne(`${API_CONFIG.baseUrl}/agent/me`).flush(PROFILE);
    await login;

    const change = firstValueFrom(service.changePassword('sansfile2026@', 'Terrain2026!'));
    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/agent/password`);
    expect(req.request.body).toEqual({
      currentPassword: 'sansfile2026@',
      newPassword: 'Terrain2026!',
    });
    req.flush(null);
    await change;

    expect(service.mustChangePassword()).toBe(false);
  });
});
