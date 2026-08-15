import type { AuthenticatedUser } from './api';

const tokenKey = 'clinic.accessToken';
const userKey = 'clinic.user';

export function readAccessToken(): string | null {
  return window.localStorage.getItem(tokenKey);
}

export function writeSession(accessToken: string, user: AuthenticatedUser): void {
  window.localStorage.setItem(tokenKey, accessToken);
  window.localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
}
