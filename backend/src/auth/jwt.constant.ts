import * as crypto from 'crypto';

// Single source of truth for the JWT signing secret. If JWT_SECRET isn't set we
// use an ephemeral random secret (NOT a guessable hardcoded default) — tokens
// then simply invalidate on restart, which is safe. Both the JwtModule and the
// passport strategy import THIS so they always agree.
export const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[SECURITY] JWT_SECRET is not set — using an ephemeral random secret; set it in the environment.');
}
