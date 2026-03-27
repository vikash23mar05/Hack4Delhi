/**
 * sessionStore.ts
 * Lightweight session store that persists the logged-in user's identity
 * across the app lifetime (stored in localStorage for demo).
 *
 * Fields stored:
 *  - userId       : anonymous pseudonymous ID (e.g. U-9A1F3B)
 *  - authMethod   : how they authenticated (phone_verified, google, aadhaar)
 *  - trustScore   : computed 0–1 float from auth methods + history
 *  - phone        : last 4 digits of phone (if captured)
 */

const KEY = 'daqcc_session';

export interface UserSession {
  userId: string;
  authMethod: string;
  trustScore: number;
  phone?: string;
  loggedInAt: string;
}

/** Generate a deterministic-looking pseudonymous user ID from phone/timestamp */
function generateUserId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return 'U-' + Math.abs(hash).toString(16).toUpperCase().slice(0, 6);
}

/**
 * Compute a trust score based on authentication methods used.
 * Multiple methods = higher trust. Phone ≥ 0.7, + Google/Aadhaar ≥ 0.85
 */
function computeTrustScore(authMethod: string): number {
  const methods = authMethod.toLowerCase();
  let score = 0.50; // baseline anonymous
  if (methods.includes('phone')) score += 0.25;
  if (methods.includes('google') || methods.includes('aadhaar')) score += 0.20;
  if (methods.includes('phone') && (methods.includes('google') || methods.includes('aadhaar'))) score += 0.05;
  return Math.min(1.0, parseFloat(score.toFixed(2)));
}

/** Save a new session after login */
export function createSession(phone: string, authMethod: string): UserSession {
  const seed = phone + Date.now();
  const session: UserSession = {
    userId: generateUserId(seed),
    authMethod,
    trustScore: computeTrustScore(authMethod),
    phone: phone.slice(-4), // store only last 4 digits
    loggedInAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
  return session;
}

/** Retrieve the current session (null if not logged in) */
export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear session on sign out */
export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Ensure a session exists — create a guest one if not */
export function getOrCreateGuestSession(): UserSession {
  const existing = getSession();
  if (existing) return existing;
  return createSession('0000000000', 'Guest');
}
