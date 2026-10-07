/** Agent de terrain connecté (GET /api/agent/me). */
export interface AgentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Mot de passe provisoire : l'agent doit en choisir un avant toute action. */
  mustChangePassword: boolean;
  /** Localités où l'agent exerce. Aucune : il ne peut ni inscrire ni modifier de salon. */
  localities?: AgentLocality[];
}

export interface AgentLocality {
  id: number;
  name: string;
  active: boolean;
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
  /** Localité du salon (vide : inscrit avant les localités). */
  localityId?: number | null;
  localityName?: string | null;
}

export interface AgentDashboard {
  salonsTotal: number;
  salonsThisMonth: number;
  salonsThisWeek: number;
  recentSalons: AgentSalon[];
}

/** Formulaire d'inscription / de correction d'un salon. */
export interface AgentSalonForm {
  /** Une des localités de l'agent (obligatoire). */
  localityId: number | null;
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
