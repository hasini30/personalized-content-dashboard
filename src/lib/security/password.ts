import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Generates a secure PBKDF2-SHA512 hash with a random 16-byte cryptographic salt.
 * Format: pbkdf2$<iterations>$<salt>$<derivedKey>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored password hash using constant-time comparison.
 * Also supports legacy plaintext passwords for transparent migration.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const key = parts[3];

    try {
      const computedKey = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString(
        'hex'
      );
      const keyBuffer = Buffer.from(key, 'hex');
      const computedBuffer = Buffer.from(computedKey, 'hex');

      if (keyBuffer.length !== computedBuffer.length) return false;
      return timingSafeEqual(keyBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  // Backward compatibility with legacy plaintext passwords
  return password === storedHash;
}
