import { environment } from '../../../environments/environment';

/**
 * Centralized API configuration for SansFile.
 * Base URL from the active environment (local Spring Boot in dev, same-origin /api in production).
 */
export const API_CONFIG = {
  baseUrl: environment.apiUrl,
  endpoints: {
    salons: '/salons',
    tickets: '/tickets',
    products: '/products',
    categories: '/categories',
    orders: '/orders',
    relatives: '/relatives',
    notifications: '/notifications',
    users: '/users',
  },
  timeoutMs: 45000,
};
