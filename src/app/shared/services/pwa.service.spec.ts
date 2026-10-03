import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import type { VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let service: PwaService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [PwaService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(PwaService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect platform and mobile states', () => {
    expect(service.platform()).toBeDefined();
    expect(typeof service.isMobile()).toBe('boolean');
    expect(typeof service.isStandalone()).toBe('boolean');
  });

  it('should dismiss popup banner', () => {
    service.dismissBanner();
    expect(service.showBanner()).toBe(false);
  });

  it('should handle appinstalled event by setting standalone mode to true and closing prompts', () => {
    service.showBanner.set(true);

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.isStandalone()).toBe(true);
    expect(service.showBanner()).toBe(false);
  });
});

describe('PwaService — nouvelle version après un déploiement', () => {
  let service: PwaService;
  let versionUpdates: Subject<VersionEvent>;
  let activateUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    activateUpdate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        PwaService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates,
            unrecoverable: new Subject(),
            checkForUpdate: vi.fn().mockResolvedValue(false),
            activateUpdate,
          },
        },
      ],
    });
    service = TestBed.inject(PwaService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  function versionReady(): void {
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'ancienne' },
      latestVersion: { hash: 'nouvelle' },
    });
  }

  it('proposes the update instead of reloading the page by itself', () => {
    versionReady();

    expect(service.updateAvailable()).toBe(true);
    expect(service.showUpdatePrompt()).toBe(true);
    expect(activateUpdate).not.toHaveBeenCalled();
  });

  it('hides the prompt on « Plus tard » and shows it again 30 minutes later', () => {
    vi.useFakeTimers();
    versionReady();

    service.dismissUpdate();
    expect(service.showUpdatePrompt()).toBe(false);

    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(service.showUpdatePrompt()).toBe(false);
    vi.advanceTimersByTime(60 * 1000);
    expect(service.showUpdatePrompt()).toBe(true);
  });
});
