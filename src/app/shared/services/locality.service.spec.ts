import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { API_CONFIG } from '../../core/config/api.config';
import { localityChosenGuard } from '../../core/guards/locality.guard';
import { AccountLocality, Locality } from '../models/locality';
import { LocalityService } from './locality.service';

const LOCALITIES: Locality[] = [
  { id: 1, name: 'Keur Massar', deliveryFee: 1000, shopAvailable: true },
  { id: 2, name: 'Rufisque', deliveryFee: 1500, shopAvailable: true },
  { id: 3, name: 'Pikine', deliveryFee: 1000, shopAvailable: false },
];

/** Session client telle que mémorisée après la connexion OTP. */
function storeSession(user: Record<string, unknown>): void {
  localStorage.setItem('sansfile_jwt_token', 'token');
  localStorage.setItem('sansfile-active-role', 'client');
  localStorage.setItem(
    'sansfile-active-user',
    JSON.stringify({
      id: 7,
      name: 'Awa',
      phone: '+221770000000',
      role: 'client',
      homeRoute: '/client/home',
      ...user,
    }),
  );
}

function account(overrides: Partial<AccountLocality>): AccountLocality {
  return {
    localityId: null,
    localityName: null,
    deliveryFee: null,
    shopAvailable: false,
    requestedLocality: null,
    source: 'NONE',
    chosen: false,
    ...overrides,
  };
}

describe('LocalityService', () => {
  let httpMock: HttpTestingController;

  function setup(): LocalityService {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(LocalityService);
  }

  async function loadList(service: LocalityService): Promise<void> {
    const loading = service.loadLocalities();
    httpMock.expectOne(`${API_CONFIG.baseUrl}/public/localities`).flush(LOCALITIES);
    await loading;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shows the account's locality by default and lets the client look at another one", async () => {
    storeSession({ localityId: 2, localityName: 'Rufisque', localityChosen: true });
    const service = setup();
    await loadList(service);

    expect(service.viewedLocalityId()).toBe(2);
    expect(service.viewedLabel()).toBe('Rufisque');
    expect(service.shopLocality()?.deliveryFee).toBe(1500);

    service.setViewed(1);
    expect(service.viewedLabel()).toBe('Keur Massar');
    // La boutique, elle, reste sur la localité du compte
    expect(service.shopLocalityId()).toBe(2);
    // Le choix de l'en-tête ne vaut que pour la visite en cours
    expect(sessionStorage.getItem('sansfile_viewed_locality')).toBe('1');

    service.setViewed('all');
    expect(service.viewingAll()).toBe(true);
    expect(service.viewedLabel()).toBe('Toutes les localités');
    // « Toutes » pour les salons, la boutique ne bouge pas
    expect(service.shopLocalityId()).toBe(2);

    service.setViewed('mine');
    expect(service.viewedLocalityId()).toBe(2);
    expect(sessionStorage.getItem('sansfile_viewed_locality')).toBeNull();
  });

  it('saves the chosen locality on the account and comes back to it', async () => {
    storeSession({ localityChosen: false });
    const service = setup();
    service.setViewed(3);

    const saving = service.choose(1);
    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/account/locality`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ localityId: 1 });
    req.flush(
      account({ localityId: 1, localityName: 'Keur Massar', source: 'USER', chosen: true }),
    );
    await saving;

    expect(service.accountLocalityId()).toBe(1);
    expect(service.viewedLocalityId()).toBe(1);
    const stored = JSON.parse(localStorage.getItem('sansfile-active-user')!);
    expect(stored.localityChosen).toBe(true);
    expect(stored.localityId).toBe(1);
  });

  it('records a zone that is not open yet', async () => {
    storeSession({ localityChosen: false });
    const service = setup();

    const saving = service.requestZone('  Thiès ');
    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/account/locality`);
    expect(req.request.body).toEqual({ requestedLocality: 'Thiès' });
    req.flush(account({ requestedLocality: 'Thiès', chosen: true }));
    await saving;

    expect(service.accountLocalityId()).toBeNull();
    expect(service.shopLocalityId()).toBeNull();
    expect(service.account()?.requestedLocality).toBe('Thiès');
  });

  describe('localityChosenGuard', () => {
    function runGuard(url: string): Promise<boolean | UrlTree> {
      return TestBed.runInInjectionContext(
        () => localityChosenGuard({} as never, { url } as never) as Promise<boolean | UrlTree>,
      );
    }

    it('lets a client with a locality through without asking the server', async () => {
      storeSession({ localityId: 2, localityChosen: true });
      setup();
      await expect(runGuard('/client/home')).resolves.toBe(true);
    });

    it('sends an old session without locality to « Ma localité » after checking the server', async () => {
      // Session ouverte avant les localités : la connexion ne disait rien de la localité
      storeSession({});
      setup();
      const result = runGuard('/client/boutique');
      httpMock.expectOne(`${API_CONFIG.baseUrl}/account/locality`).flush(account({}));
      await Promise.resolve();
      httpMock.expectOne(`${API_CONFIG.baseUrl}/public/localities`).flush(LOCALITIES);

      const tree = (await result) as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(tree)).toBe(
        '/ma-localite?redirect=%2Fclient%2Fboutique',
      );
    });

    it('does not ask while no locality is open yet (deployment)', async () => {
      storeSession({});
      setup();
      const result = runGuard('/client/home');
      httpMock.expectOne(`${API_CONFIG.baseUrl}/account/locality`).flush(account({}));
      await Promise.resolve();
      httpMock.expectOne(`${API_CONFIG.baseUrl}/public/localities`).flush([]);
      await expect(result).resolves.toBe(true);
    });

    it('lets the client through when the locality was chosen on another device', async () => {
      storeSession({});
      setup();
      const result = runGuard('/client/home');
      httpMock
        .expectOne(`${API_CONFIG.baseUrl}/account/locality`)
        .flush(
          account({ localityId: 1, localityName: 'Keur Massar', source: 'USER', chosen: true }),
        );
      await expect(result).resolves.toBe(true);
    });

    it('does not block the app when the server cannot be reached', async () => {
      storeSession({});
      setup();
      const result = runGuard('/client/home');
      httpMock
        .expectOne(`${API_CONFIG.baseUrl}/account/locality`)
        .flush(null, { status: 503, statusText: 'Service Unavailable' });
      await expect(result).resolves.toBe(true);
    });
  });
});
