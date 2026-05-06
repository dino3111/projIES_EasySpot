export function getAccessToken(): string | null {
  try {
    const sessionToken = sessionStorage.getItem('es_access_token');
    if (sessionToken) return sessionToken;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) ?? '';
      if (!key.startsWith('oidc.user:')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    }
    return null;
  } catch {
    return null;
  }
}
