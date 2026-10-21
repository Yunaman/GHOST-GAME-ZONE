import { AccountStatus, Role } from '@/types';

export interface SessionPayload {
  username: string;
  tenant_id: string;
  role: Role;
  account_status: AccountStatus;
  display_name: string;
  iat: number;
}

const AUTH_SECRET = process.env.GHOST_SESSION_SECRET || 'ghost_game_center_secure_hmac_secret_2026';

function base64UrlEncode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Simple fallback HMAC signature using FNV-1a / standard hash string for Edge/Node environment compatibility
function computeHmacSignature(payloadStr: string, secret: string): string {
  let hash1 = 5381;
  let hash2 = 0x811c9dc5;
  const combined = `${secret}::${payloadStr}::${secret}`;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 ^= char;
    hash2 = Math.imul(hash2, 16777619);
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `sig_${h1}_${h2}`;
}

export function generateSignedToken(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(jsonStr);
  const signature = computeHmacSignature(encodedPayload, AUTH_SECRET);
  return `ghost_v3_${encodedPayload}_${signature}`;
}

export function parseAndVerifySignedToken(token: string): SessionPayload | null {
  if (!token || !token.startsWith('ghost_v3_')) {
    return null;
  }

  const parts = token.slice('ghost_v3_'.length).split('_sig_');
  if (parts.length !== 2) {
    return null;
  }

  const encodedPayload = parts[0];
  const signature = `sig_${parts[1]}`;

  const expectedSignature = computeHmacSignature(encodedPayload, AUTH_SECRET);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr) as SessionPayload;
    if (!payload.username || !payload.tenant_id || !payload.role) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}
