import { Component, computed, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalityService } from '../../services/locality.service';

/**
 * Feuille de choix de la localité dont on regarde les salons (en-tête). Ne change jamais la localité du compte :
 * « Ma localité » y ramène, et le profil permet d'en changer durablement.
 */
@Component({
  selector: 'app-locality-picker-sheet',
  template: `
    @if (localityService.pickerOpen()) {
      <div
        class="locality-sheet__backdrop"
        (click)="localityService.closePicker()"
        role="presentation"
      >
        <div
          class="locality-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="locality-sheet-title"
          (click)="$event.stopPropagation()"
        >
          <div class="locality-sheet__handle" aria-hidden="true"></div>
          <h2 id="locality-sheet-title" class="locality-sheet__title">Voir les salons de…</h2>

          <div class="locality-sheet__list">
            @if (mine(); as m) {
              <button
                type="button"
                class="locality-sheet__item"
                [class.locality-sheet__item--active]="current() === m.id"
                (click)="pick('mine')"
              >
                <span class="locality-sheet__pin" aria-hidden="true">📍</span>
                <span class="locality-sheet__name">Ma localité ({{ m.name }})</span>
              </button>
            }

            @for (locality of others(); track locality.id) {
              <button
                type="button"
                class="locality-sheet__item"
                [class.locality-sheet__item--active]="current() === locality.id"
                (click)="pick(locality.id)"
              >
                <span class="locality-sheet__name">{{ locality.name }}</span>
              </button>
            } @empty {
              @if (!mine()) {
                <p class="locality-sheet__empty">Aucune localité n'est encore ouverte.</p>
              }
            }

            <button
              type="button"
              class="locality-sheet__item"
              [class.locality-sheet__item--active]="current() === null"
              (click)="pick('all')"
            >
              <span class="locality-sheet__name">Toutes les localités</span>
            </button>
          </div>

          <button type="button" class="locality-sheet__change" (click)="changeAccountLocality()">
            J'ai déménagé : changer ma localité
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .locality-sheet__backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
    }

    .locality-sheet {
      width: 100%;
      max-width: 520px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 10px 16px calc(16px + env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      background: var(--bg-card, #ffffff);
      color: var(--text-primary, #0f172a);
    }

    .locality-sheet__handle {
      align-self: center;
      width: 40px;
      height: 4px;
      border-radius: 9999px;
      background: var(--border-color, #e2e8f0);
    }

    .locality-sheet__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
    }

    .locality-sheet__list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
    }

    .locality-sheet__item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 13px 14px;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-page, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 0.95rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;

      &--active {
        border-color: var(--primary, #1e5af0);
        color: var(--primary, #1e5af0);
        box-shadow: inset 0 0 0 1px var(--primary, #1e5af0);
      }
    }

    .locality-sheet__name {
      flex: 1;
    }

    .locality-sheet__empty {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary, #64748b);
    }

    .locality-sheet__change {
      border: none;
      background: transparent;
      color: var(--primary, #1e5af0);
      font-size: 0.85rem;
      font-weight: 700;
      padding: 6px;
      cursor: pointer;
    }
  `,
})
export class LocalityPickerSheet implements OnInit, OnDestroy {
  protected readonly localityService = inject(LocalityService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private originalParent: Node | null = null;
  private originalNext: Node | null = null;

  /**
   * La feuille est souvent déclarée dans un en-tête (flou d'arrière-plan, position collante) qui sert
   * de repère aux éléments « fixed » : elle s'afficherait coupée en haut de l'écran. Elle est donc
   * rattachée directement à <body>, puis remise à sa place avant sa destruction.
   */
  ngOnInit(): void {
    const el = this.host.nativeElement;
    if (typeof document === 'undefined' || el.parentNode === document.body) return;
    this.originalParent = el.parentNode;
    this.originalNext = el.nextSibling;
    document.body.appendChild(el);
  }

  ngOnDestroy(): void {
    const el = this.host.nativeElement;
    if (this.originalParent && el.isConnected) {
      this.originalParent.insertBefore(el, this.originalNext);
    }
    // Page quittée feuille ouverte : elle ne doit pas réapparaître sur la page suivante
    this.localityService.closePicker();
  }

  protected readonly mine = computed(() => {
    const id = this.localityService.accountLocalityId();
    if (id === null) return null;
    const found = this.localityService.localities().find((l) => l.id === id);
    return {
      id,
      name: found?.name ?? this.localityService.accountLocalityName() ?? 'Ma localité',
    };
  });

  protected readonly others = computed(() => {
    const mineId = this.localityService.accountLocalityId();
    return this.localityService.localities().filter((l) => l.id !== mineId);
  });

  protected readonly current = computed(() => this.localityService.viewedLocalityId());

  protected pick(choice: number | 'all' | 'mine'): void {
    this.localityService.setViewed(choice);
    this.localityService.closePicker();
  }

  protected changeAccountLocality(): void {
    this.localityService.closePicker();
    void this.router.navigate(['/ma-localite'], {
      queryParams: { changer: 1, redirect: this.router.url },
    });
  }
}
