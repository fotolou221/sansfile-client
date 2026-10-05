/** Agent de terrain connecté (GET /api/agent/me). */
export interface AgentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Mot de passe provisoire : l'agent doit en choisir un avant toute action. */
  mustChangePassword: boolean;
}

/** Salon inscrit par l'agent (SalonDTO du serveur). */
export interface AgentSalon {
  id: number;
  name: string;
  slug: string;
  location: string;
  district: string;
  address?: string | null;
  phone?: string | null;
  ownerName?: string | null;
  openingHours?: string | null;
  status: 'OPEN' | 'CLOSED';
  active: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdDate?: string | null;
  createdByAgentId?: number | null;
}

export interface AgentDashboard {
  salonsTotal: number;
  salonsThisMonth: number;
  salonsThisWeek: number;
  recentSalons: AgentSalon[];
}

/** Formulaire d'inscription / de correction d'un salon. */
export interface AgentSalonForm {
  name: string;
  ownerName: string;
  phone: string;
  district: string;
  location: string;
  address: string;
  openingHours: string;
  latitude: number | null;
  longitude: number | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}
