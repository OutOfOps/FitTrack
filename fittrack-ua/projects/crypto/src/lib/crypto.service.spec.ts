import { CryptoService, EncryptedPayload } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeAll(() => {
    if (!globalThis.crypto || typeof globalThis.crypto.subtle === 'undefined') {
      throw new Error('Web Crypto API is not available in this environment.');
    }
  });

  beforeEach(() => {
    service = new CryptoService();
  });

  it('derives stable keys for the same input', async () => {
    const passphrase = 'fittrack';
    const salt = 'L3lha1tX4VnWTy3n5adgFg==';

    const first = await service.deriveKey(passphrase, salt, 12_000);
    const second = await service.deriveKey(passphrase, salt, 12_000);

    expect(first.salt).toBe(salt);
    expect(second.salt).toBe(salt);

    const probe = await crypto.subtle.exportKey('raw', first.key);
    const probeB = await crypto.subtle.exportKey('raw', second.key);
    expect(new Uint8Array(probe)).toEqual(new Uint8Array(probeB));
  });

  it('encrypts and decrypts payloads symmetrically', async () => {
    const { key } = await service.deriveKey('fittrack-demo', undefined, 32_000);
    const payload: EncryptedPayload = await service.encrypt({ value: 42 }, key, 1);

    expect(payload.cipherText).not.toContain('42');

    const data = await service.decrypt<{ value: number }>(payload, key);
    expect(data.value).toBe(42);
  });

  it('rotates keys by re-encrypting the payload', async () => {
    const first = await service.deriveKey('alpha', undefined, 4_000);
    const second = await service.deriveKey('beta', undefined, 4_000);

    const initial = await service.encrypt({ sample: 'data' }, first.key, 1);
    const rotated = await service.rotate(initial, first.key, second.key, 2);

    expect(rotated.keyVersion).toBe(2);
    expect(rotated.cipherText).not.toEqual(initial.cipherText);

    const plaintext = await service.decrypt<{ sample: string }>(rotated, second.key);
    expect(plaintext.sample).toBe('data');
  });
});
