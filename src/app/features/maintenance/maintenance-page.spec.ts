import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';
import { MaintenancePage } from './maintenance-page';

describe('MaintenancePage', () => {
  const maintenanceMode = signal(true);
  const contactPhone = signal('+221 77 862 70 52');
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  function setup(retour: string | null) {
    maintenanceMode.set(true);
    TestBed.configureTestingModule({
      imports: [MaintenancePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(retour ? { retour } : {}) } },
        },
        {
          provide: PlatformSettingsService,
          useValue: {
            loaded: signal(true),
            maintenanceMode,
            lastCheck: signal(new Date('2026-10-01T10:00:00Z')),
            contactPhone,
            contactPhoneDigits: computed(() => contactPhone().replace(/\D/g, '')),
            contactEmail: signal('contact@sansfile.sn'),
            refresh: () => Promise.resolve(),
          },
        },
      ],
    });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MaintenancePage);
    fixture.detectChanges();
    return fixture;
  }

  it('explains that SansFile is under maintenance', () => {
    const fixture = setup('/client/home');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Maintenance en cours');
    expect(text).toContain('On améliore SansFile pour vous');
    expect(text).toContain('Vos tickets, vos proches et votre compte sont bien conservés');
    expect(text).toContain('+221 77 862 70 52');
    expect(navigateByUrl).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('reopens the requested page as soon as the maintenance is lifted', () => {
    const fixture = setup('/client/home');

    maintenanceMode.set(false);
    TestBed.tick();

    expect(navigateByUrl).toHaveBeenCalledWith('/client/home', { replaceUrl: true });
    fixture.destroy();
  });

  it('never redirects to another website', () => {
    const fixture = setup('//site-externe.example');

    maintenanceMode.set(false);
    TestBed.tick();

    expect(navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    fixture.destroy();
  });
});
