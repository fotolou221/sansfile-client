import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';
import { AuthSessionService } from '../../features/auth/auth-session.service';
import { AccountLocality, Locality, ViewedLocality } from '../models/locality';

const VIEWED_KEY = 'sansfile_viewed_locality';

/**
 * Localités côté application client / coiffeur :
 * - la localité du compte (choisie après la connexion, modifiable dans le profil) ;
 * - la localité regardée (sélecteur de l'en-tête des salons) : par défaut celle du compte, le temps de la visite
 *   seulement (sessionStorage), pour ne jamais changer la localité du compte en parcourant l'application.
 * La boutique suit toujours la localité du compte (produits et frais de livraison), jamais celle regardée :
 * le serveur l'impose aussi.
 */
@Injectable({ providedIn: 'root' })
export class LocalityService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSessionService);
  private readonly baseUrl = API_CONFIG.baseUrl;

  readonly localities = signal<readonly Locality[]>([]);
  readonly loaded = signal(false);
  readonly account = signal<AccountLocality | null>(null);
  private readonly viewed = signal<ViewedLocality | null>(this.readViewed());
  /** Feuille de choix de la localité dont on regarde les salons (en-tête). */
  readonly pickerOpen = signal(false);

  private loadingList: Promise<void> | null = null;

  /** Localité du compte : celle renvoyée par le serveur, sinon celle mémorisée à la connexion. */
  readonly accountLocalityId = computed<number | null>(() => {
    const account = this.account();
    if (account) return account.localityId;
    return this.auth.currentUser()?.localityId ?? null;
  });

  readonly accountLocalityName = computed<string | null>(() => {
    const account = this.account();
    if (account) return account.localityName;
    const user = this.auth.currentUser();
    return user?.localityName ?? this.nameOf(user?.localityId ?? null);
  });

  /** Localité regardée ; null = toutes les localités (ou aucune connue). */
  readonly viewedLocalityId = computed<number | null>(() => {
    const viewed = this.viewed();
    if (viewed === 'all') return null;
    return viewed ?? this.accountLocalityId();
  });

  readonly viewingAll = computed(() => this.viewedLocalityId() === null);

  readonly viewedLabel = computed(() => {
    const id = this.viewedLocalityId();
    if (id === null) {
      return 'Toutes les localités';
    }
    return (
      this.nameOf(id) ??
      (id === this.accountLocalityId() ? this.accountLocalityName() : null) ??
      'Ma localité'
    );
  });

  /** Localité de la boutique : celle du compte (pour un coiffeur, celle de son salon). */
  readonly shopLocalityId = computed<number | null>(() => this.accountLocalityId());

  readonly shopLocality = computed<Locality | null>(() => {
    const id = this.shopLocalityId();
    if (id === null) return null;
    return this.localities().find((l) => l.id === id) ?? null;
  });

  readonly shopLocalityName = computed(() => {
    const id = this.shopLocalityId();
    return id === null ? null : (this.nameOf(id) ?? this.accountLocalityName());
  });

  constructor() {
    // Déconnexion : on oublie la localité regardée et celle du compte précédent
    effect(() => {
      const user = this.auth.currentUser();
      untracked(() => {
        if (!user || user.id === 'guest') {
          this.account.set(null);
          this.setViewedInternal(null);
        }
      });
    });
  }

  // ── Liste publique ──────────────────────────────────────────

  async loadLocalities(force = false): Promise<void> {
    if (this.loaded() && !force) return;
    if (this.loadingList && !force) return this.loadingList;
    this.loadingList = firstValueFrom(
      this.http.get<Locality[]>(`${this.baseUrl}/public/localities`),
    )
      .then((list) => {
        this.localities.set(Array.isArray(list) ? list : []);
        this.loaded.set(true);
      })
      .catch((err) => {
        console.warn('[LocalityService] Localités indisponibles :', err);
      })
      .finally(() => (this.loadingList = null));
    return this.loadingList;
  }

  nameOf(id: number | null | undefined): string | null {
    if (id === null || id === undefined) return null;
    return this.localities().find((l) => l.id === id)?.name ?? null;
  }

  // ── Localité du compte ──────────────────────────────────────

  async loadAccount(): Promise<AccountLocality | null> {
    try {
      const account = await firstValueFrom(
        this.http.get<AccountLocality>(`${this.baseUrl}/account/locality`),
      );
      this.applyAccount(account);
      return account;
    } catch (err) {
      console.warn('[LocalityService] Localité du compte indisponible :', err);
      return null;
    }
  }

  /**
   * Le compte a-t-il une localité (ou une zone demandée) ? Réponse immédiate si la connexion l'indique,
   * sinon le serveur est interrogé : les sessions ouvertes avant les localités n'ont pas l'information.
   * En cas de panne réseau, on laisse passer (la question sera reposée plus tard).
   */
  async ensureChosen(): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user || user.id === 'guest') return true;
    if (this.account()?.chosen || user.localityChosen === true) return true;
    try {
      const account = await firstValueFrom(
        this.http.get<AccountLocality>(`${this.baseUrl}/account/locality`),
      );
      this.applyAccount(account);
      if (account.chosen) return true;
      // Aucune localité ouverte (mise en service) : rien à choisir, la question sera posée plus tard
      await this.loadLocalities(true);
      return this.localities().length === 0;
    } catch {
      return true;
    }
  }

  async choose(localityId: number): Promise<AccountLocality> {
    return this.save({ localityId });
  }

  /** « Ma localité n'est pas dans la liste » : zone enregistrée pour l'administration. */
  async requestZone(name: string): Promise<AccountLocality> {
    return this.save({ requestedLocality: name.trim() });
  }

  // ── Localité regardée ───────────────────────────────────────

  /** 'mine' : revenir à la localité du compte ; 'all' : toutes les localités. */
  setViewed(value: ViewedLocality | 'mine'): void {
    this.setViewedInternal(
      value === 'mine' || value === this.accountLocalityId() ? null : (value as ViewedLocality),
    );
  }

  openPicker(): void {
    void this.loadLocalities();
    this.pickerOpen.set(true);
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  // ── Interne ─────────────────────────────────────────────────

  private async save(body: {
    localityId?: number;
    requestedLocality?: string;
  }): Promise<AccountLocality> {
    const account = await firstValueFrom(
      this.http.put<AccountLocality>(`${this.baseUrl}/account/locality`, body),
    );
    this.applyAccount(account);
    // Nouvelle localité du compte : l'application revient sur elle
    this.setViewedInternal(null);
    return account;
  }

  private applyAccount(account: AccountLocality): void {
    this.account.set(account);
    this.auth.updateLocality({
      localityId: account.localityId,
      localityName: account.localityName,
      localityChosen: account.chosen,
    });
  }

  private setViewedInternal(value: ViewedLocality | null): void {
    this.viewed.set(value);
    try {
      if (value === null) {
        globalThis.sessionStorage?.removeItem(VIEWED_KEY);
      } else {
        globalThis.sessionStorage?.setItem(VIEWED_KEY, String(value));
      }
    } catch {
      // stockage indisponible (navigation privée) : le choix reste en mémoire
    }
  }

  private readViewed(): ViewedLocality | null {
    try {
      const raw = globalThis.sessionStorage?.getItem(VIEWED_KEY);
      if (!raw) return null;
      if (raw === 'all') return 'all';
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }
}
