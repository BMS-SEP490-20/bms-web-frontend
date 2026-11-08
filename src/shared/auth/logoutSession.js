import { API_URL, getToken, getRefreshToken, clearAuthTokens } from '../../config/api';

/** Clears the local session immediately and revokes its captured refresh token without triggering refresh interceptors. */
export async function logoutSession() {
  const accessToken = getToken();
  const refreshToken = getRefreshToken();
  clearAuthTokens();
  if (!accessToken) return;
  try {
    await fetch(`${API_URL.replace(/\/$/, '')}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Losing connectivity must not leave credentials or an authenticated UI on this device.
  }
}
