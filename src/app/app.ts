import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstallBanner } from './shared/components/install-banner/install-banner';
import { UpdatePrompt } from './shared/components/update-prompt/update-prompt';
import { DesktopRestriction } from './shared/components/desktop-restriction/desktop-restriction';
import { RealtimeSyncService } from './shared/services/realtime-sync.service';
import { PwaService } from './shared/services/pwa.service';
import { ThemeService } from './shared/services/theme.service';
import { MaintenanceWatcher } from './core/services/maintenance-watcher.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InstallBanner, UpdatePrompt, DesktopRestriction],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Injected eagerly to establish the real-time SSE stream across the entire app
  private readonly realtimeSync = inject(RealtimeSyncService);
  // Injected eagerly to keep PWA install/update lifecycle active from startup
  private readonly pwa = inject(PwaService);
  // Injected eagerly to initialize and persist dark/light/system theme across the entire app on all routes
  private readonly themeService = inject(ThemeService);
  // Injected eagerly so that switching maintenance on sends app users to the maintenance page right away
  private readonly maintenanceWatcher = inject(MaintenanceWatcher);
}
