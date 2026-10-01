import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';
import { isOpenDuringMaintenance, maintenanceGuard } from './maintenance.guard';

describe('maintenanceGuard', () => {
  const maintenanceMode = signal(false);

  beforeEach(() => {
    maintenanceMode.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PlatformSettingsService,
          useValue: { whenLoaded: () => Promise.resolve(), maintenanceMode },
        },
      ],
    });
  });

  function run(url: string): Promise<unknown> {
    return TestBed.runInInjectionContext(
      () =>
        maintenanceGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot,
        ) as Promise<unknown>,
    );
  }

  it('lets users in when SansFile is not in maintenance', async () => {
    expect(await run('/client/home')).toBe(true);
  });

  it('sends users to the maintenance page and remembers where they were going', async () => {
    maintenanceMode.set(true);

    const result = await run('/client/home');

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/maintenance?retour=%2Fclient%2Fhome',
    );
  });

  it('keeps the website, the admin console and the maintenance page open', () => {
    for (const url of [
      '/',
      '',
      '/vitrine',
      '/maintenance?retour=%2F',
      '/admin',
      '/admin/settings',
    ]) {
      expect(isOpenDuringMaintenance(url)).toBe(true);
    }
    for (const url of [
      '/client/home',
      '/auth/login',
      '/coiffeur/tickets',
      '/onboarding',
      '/administration',
    ]) {
      expect(isOpenDuringMaintenance(url)).toBe(false);
    }
  });
});
