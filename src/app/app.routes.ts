import { Routes } from '@angular/router';
import { LoginPage } from './features/auth/pages/login/login-page';
import { OtpPage } from './features/auth/pages/otp/otp-page';
import { ClientHomePage } from './features/client/home/client-home-page';
import { SalonsListPage } from './features/client/salons-list/salons-list-page';
import { SalonDetailPage } from './features/client/salon-detail/salon-detail-page';
import { TicketOwnerPage } from './features/client/ticket/ticket-owner-page';
import { TicketDetailPage } from './features/client/ticket-detail/ticket-detail-page';
import { MyTicketsPage } from './features/client/tickets/my-tickets-page';
import { ClientProfilePage } from './features/client/profile/client-profile-page';
import { RelativesPage } from './features/client/relatives/relatives-page';
import { AddRelativePage } from './features/client/relatives/add-relative-page';
import { EditRelativePage } from './features/client/relatives/edit-relative-page';
import { ShopPage } from './features/client/shop/shop-page';
import { AllProductsPage } from './features/client/shop/all-products-page';
import { ProductDetailPage } from './features/client/shop/product-detail-page';
import { CartPage } from './features/client/shop/cart-page';
import { OrderConfirmationPage } from './features/client/shop/order-confirmation-page';
import { MyOrdersPage } from './features/client/shop/my-orders-page';
import { OrderDetailPage } from './features/client/shop/order-detail-page';
import { NotificationsPage } from './features/client/notifications/notifications-page';
import { FavoritesPage } from './features/client/favorites/favorites-page';
import { CoiffeurHomePage } from './features/coiffeur/home/coiffeur-home-page';
import { CoiffeurTicketsPage } from './features/coiffeur/tickets/coiffeur-tickets-page';
import { CoiffeurNotificationsPage } from './features/coiffeur/notifications/coiffeur-notifications-page';
import { CoiffeurProfilePage } from './features/coiffeur/profile/coiffeur-profile-page';
import { CoiffeurPhotosPage } from './features/coiffeur/photos/coiffeur-photos-page';
import { SettingsPage } from './features/shared/settings/settings-page';
import { HelpSupportPage } from './features/shared/support/help-support-page';
import { OnboardingPage } from './features/onboarding/onboarding-page';
import { VitrinePage } from './features/vitrine/vitrine-page';
import { NotFoundPage } from './features/shared/not-found/not-found-page';

// ── Admin Components & Guard ────────────────────────────────
import { AdminLoginPage } from './features/admin/pages/login/admin-login-page';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout';
import { AdminDashboardPage } from './features/admin/pages/dashboard/admin-dashboard-page';
import { AdminSalonsPage } from './features/admin/pages/salons/admin-salons-page';
import { AdminCoiffeursPage } from './features/admin/pages/coiffeurs/admin-coiffeurs-page';
import { AdminTicketsPage } from './features/admin/pages/tickets/admin-tickets-page';
import { AdminBoutiquePage } from './features/admin/pages/boutique/admin-boutique-page';
import { AdminCommandesPage } from './features/admin/pages/commandes/admin-commandes-page';
import { AdminUsersPage } from './features/admin/pages/users/admin-users-page';
import { AdminCategoriesPage } from './features/admin/pages/categories/admin-categories-page';
import { AdminSettingsPage } from './features/admin/pages/settings/admin-settings-page';
import { AdminMonitoringPage } from './features/admin/pages/monitoring/admin-monitoring-page';
import { adminAuthGuard } from './features/admin/services/admin-auth.service';
import { AdminAgentsPage } from './features/admin/pages/agents/admin-agents-page';
import { AdminAgentActivityPage } from './features/admin/pages/agents/admin-agent-activity-page';
import { AdminLocalitiesPage } from './features/admin/pages/localities/admin-localities-page';
import { AdminPartnersPage } from './features/admin/pages/partners/admin-partners-page';
import { AdminPartnerDetailPage } from './features/admin/pages/partners/admin-partner-detail-page';
import { AgentLoginPage } from './features/agent/pages/login/agent-login-page';
import { AgentLayoutComponent } from './features/agent/layout/agent-layout';
import { AgentHomePage } from './features/agent/pages/home/agent-home-page';
import { AgentPasswordPage } from './features/agent/pages/password/agent-password-page';
import { AgentSalonsPage } from './features/agent/pages/salons/agent-salons-page';
import { AgentSalonFormPage } from './features/agent/pages/salon-form/agent-salon-form-page';
import { AgentSalonDetailPage } from './features/agent/pages/salon-detail/agent-salon-detail-page';
import { AgentProfilePage } from './features/agent/pages/profile/agent-profile-page';
import {
  agentAuthGuard,
  agentPasswordChangedGuard,
} from './features/agent/services/agent-auth.service';
import { MaintenancePage } from './features/maintenance/maintenance-page';
import { maintenanceGuard } from './core/guards/maintenance.guard';
import { localityChosenGuard } from './core/guards/locality.guard';
import { ChooseLocalityPage } from './features/locality/choose-locality-page';
import {
  clientAuthGuard,
  coiffeurAuthGuard,
  guestOnlyAuthGuard,
  shopAuthGuard,
} from './core/guards/auth.guard';

const APP_ROUTES: Routes = [
  { path: '', component: VitrinePage },
  { path: 'vitrine', component: VitrinePage },
  { path: 'maintenance', component: MaintenancePage },
  { path: 'app', redirectTo: 'onboarding', pathMatch: 'full' },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'onboarding', component: OnboardingPage },
  { path: 'auth/login', component: LoginPage, canActivate: [guestOnlyAuthGuard] },
  { path: 'auth/code', component: OtpPage, canActivate: [guestOnlyAuthGuard] },
  // Choix de la localité (imposé après connexion tant qu'il n'est pas fait, puis depuis le profil)
  { path: 'ma-localite', component: ChooseLocalityPage, canActivate: [shopAuthGuard] },

  // ── Client Routes (Protected) ─────────────────────────────
  { path: 'client/home', component: ClientHomePage, canActivate: [clientAuthGuard] },
  { path: 'client/salons', component: SalonsListPage, canActivate: [clientAuthGuard] },
  { path: 'client/salons/:id', component: SalonDetailPage, canActivate: [clientAuthGuard] },
  { path: 'client/salons/:id/ticket', component: TicketOwnerPage, canActivate: [clientAuthGuard] },
  { path: 'client/tickets', component: MyTicketsPage, canActivate: [clientAuthGuard] },
  { path: 'client/tickets/:id', component: TicketDetailPage, canActivate: [clientAuthGuard] },
  { path: 'client/profile', component: ClientProfilePage, canActivate: [clientAuthGuard] },
  { path: 'client/proches', component: RelativesPage, canActivate: [clientAuthGuard] },
  { path: 'client/proches/ajouter', component: AddRelativePage, canActivate: [clientAuthGuard] },
  { path: 'client/proches/edit/:id', component: EditRelativePage, canActivate: [clientAuthGuard] },

  // ── Boutique Routes (Accessible by Clients and Coiffeurs) ──
  { path: 'client/boutique', component: ShopPage, canActivate: [shopAuthGuard] },
  {
    path: 'client/boutique/catalogue',
    component: AllProductsPage,
    canActivate: [shopAuthGuard],
  },
  {
    path: 'client/boutique/produits/:id',
    component: ProductDetailPage,
    canActivate: [shopAuthGuard],
  },
  { path: 'client/boutique/panier', component: CartPage, canActivate: [shopAuthGuard] },
  {
    path: 'client/boutique/commande/confirmation',
    component: OrderConfirmationPage,
    canActivate: [shopAuthGuard],
  },
  { path: 'client/boutique/commandes', component: MyOrdersPage, canActivate: [shopAuthGuard] },
  {
    path: 'client/boutique/commandes/:id',
    component: OrderDetailPage,
    canActivate: [shopAuthGuard],
  },
  { path: 'coiffeur/boutique', redirectTo: 'client/boutique', pathMatch: 'full' },
  { path: 'client/notifications', component: NotificationsPage, canActivate: [clientAuthGuard] },
  { path: 'client/favorites', component: FavoritesPage, canActivate: [clientAuthGuard] },
  { path: 'client/favoris', component: FavoritesPage, canActivate: [clientAuthGuard] },
  { path: 'client/mes-favoris', component: FavoritesPage, canActivate: [clientAuthGuard] },
  { path: 'client/settings', component: SettingsPage, canActivate: [clientAuthGuard] },
  { path: 'client/support', component: HelpSupportPage, canActivate: [clientAuthGuard] },

  // ── Coiffeur Routes (Protected) ───────────────────────────
  { path: 'coiffeur/home', component: CoiffeurHomePage, canActivate: [coiffeurAuthGuard] },
  { path: 'coiffeur/tickets', component: CoiffeurTicketsPage, canActivate: [coiffeurAuthGuard] },
  { path: 'coiffeur/tickets/:id', component: TicketDetailPage, canActivate: [coiffeurAuthGuard] },
  {
    path: 'coiffeur/notifications',
    component: CoiffeurNotificationsPage,
    canActivate: [coiffeurAuthGuard],
  },
  { path: 'coiffeur/profile', component: CoiffeurProfilePage, canActivate: [coiffeurAuthGuard] },
  { path: 'coiffeur/settings', component: SettingsPage, canActivate: [coiffeurAuthGuard] },
  {
    path: 'coiffeur/settings/photos',
    component: CoiffeurPhotosPage,
    canActivate: [coiffeurAuthGuard],
  },
  { path: 'coiffeur/support', component: HelpSupportPage, canActivate: [coiffeurAuthGuard] },

  // ── Espace agent de terrain (/agent) ──────────────────────
  { path: 'agent/login', component: AgentLoginPage },
  {
    path: 'agent',
    component: AgentLayoutComponent,
    canActivate: [agentAuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: AgentHomePage,
        canActivate: [agentPasswordChangedGuard],
      },
      { path: 'mot-de-passe', component: AgentPasswordPage },
      { path: 'salons', component: AgentSalonsPage, canActivate: [agentPasswordChangedGuard] },
      {
        path: 'salons/nouveau',
        component: AgentSalonFormPage,
        canActivate: [agentPasswordChangedGuard],
      },
      {
        path: 'salons/:id',
        component: AgentSalonDetailPage,
        canActivate: [agentPasswordChangedGuard],
      },
      {
        path: 'salons/:id/modifier',
        component: AgentSalonFormPage,
        canActivate: [agentPasswordChangedGuard],
      },
      { path: 'profil', component: AgentProfilePage, canActivate: [agentPasswordChangedGuard] },
    ],
  },

  // ── Admin Web Routes (/admin) ─────────────────────────────
  { path: 'admin/login', component: AdminLoginPage },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardPage },
      { path: 'salons', component: AdminSalonsPage },
      { path: 'coiffeurs', redirectTo: 'salons', pathMatch: 'full' },
      { path: 'tickets', component: AdminTicketsPage },
      { path: 'boutique', component: AdminBoutiquePage },
      { path: 'categories', component: AdminCategoriesPage },
      { path: 'commandes', component: AdminCommandesPage },
      { path: 'utilisateurs', component: AdminUsersPage },
      { path: 'agents', component: AdminAgentsPage },
      { path: 'agents/journal', component: AdminAgentActivityPage },
      { path: 'localites', component: AdminLocalitiesPage },
      { path: 'partenaires', component: AdminPartnersPage },
      { path: 'partenaires/:id', component: AdminPartnerDetailPage },
      { path: 'supervision', component: AdminMonitoringPage },
      { path: 'settings', component: AdminSettingsPage },
    ],
  },

  { path: 'home', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '404', component: NotFoundPage },
  { path: '**', component: NotFoundPage },
];

/** Restent ouvertes pendant la maintenance (cf. isOpenDuringMaintenance) ; les redirections suivent leur cible. */
const OPEN_DURING_MAINTENANCE = new Set(['', 'vitrine', 'maintenance', 'admin', 'admin/login']);

/** Espace client, boutique et espace coiffeur : la localité du compte doit être choisie. */
function needsLocality(path: string | undefined): boolean {
  return !!path && (path.startsWith('client/') || path.startsWith('coiffeur/'));
}

/** Toute autre page (application client, coiffeur, connexion…) affiche la page de maintenance. */
export const routes: Routes = APP_ROUTES.map((route) => {
  if (route.redirectTo !== undefined) {
    return route;
  }
  const guards = [
    ...(route.canActivate ?? []),
    ...(needsLocality(route.path) ? [localityChosenGuard] : []),
  ];
  return OPEN_DURING_MAINTENANCE.has(route.path ?? '')
    ? { ...route, canActivate: guards }
    : { ...route, canActivate: [maintenanceGuard, ...guards] };
});
