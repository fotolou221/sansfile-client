/**
 * Rôles contenus dans un jeton d'accès SansFile (claim « auth », séparés par des espaces).
 * Lecture seule côté client, pour orienter l'utilisateur : c'est toujours le serveur qui contrôle les droits.
 * Jeton absent ou illisible : aucun rôle.
 */
export function jwtAuthorities(token: string | null | undefined): string[] {
  const payload = token?.split('.')[1];
  if (!payload) return [];
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { auth?: unknown };
    return typeof claims.auth === 'string' ? claims.auth.split(' ').filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function hasAnyAuthority(
  token: string | null | undefined,
  ...authorities: string[]
): boolean {
  const roles = jwtAuthorities(token);
  return authorities.some((a) => roles.includes(a));
}
