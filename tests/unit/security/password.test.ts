import { hashPassword, verifyPassword } from '@/lib/security/password';

describe('Password Security and Hashing', () => {
  it('hashes password with PBKDF2 and random salt', () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hash1 = hashPassword(rawPassword);
    const hash2 = hashPassword(rawPassword);

    expect(hash1).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash2).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    // Two hashes of the same password must differ due to random salts
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correctly with matching password', () => {
    const rawPassword = 'MySecurePassword!';
    const hash = hashPassword(rawPassword);

    expect(verifyPassword(rawPassword, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('rejects empty or malformed passwords/hashes', () => {
    expect(verifyPassword('', 'pbkdf2$100000$salt$key')).toBe(false);
    expect(verifyPassword('password', '')).toBe(false);
    expect(verifyPassword('password', 'pbkdf2$invalid')).toBe(false);
    expect(verifyPassword('password', 'pbkdf2$abc$def$ghi')).toBe(false);
  });

  it('supports legacy plaintext password backwards compatibility', () => {
    const legacyPlain = 'password123';
    expect(verifyPassword('password123', legacyPlain)).toBe(true);
    expect(verifyPassword('wrong', legacyPlain)).toBe(false);
  });
});
