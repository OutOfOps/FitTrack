import { Injectable } from '@angular/core';

export interface EncryptedPayload {
  readonly algorithm: 'AES-GCM';
  readonly keyVersion: number;
  readonly iv: string;
  readonly cipherText: string;
}

export interface DerivedKey {
  readonly key: CryptoKey;
  readonly salt: string;
  readonly iterations: number;
}

export interface EncryptionContext {
  readonly key: CryptoKey;
  readonly keyVersion: number;
}

const DEFAULT_PBKDF2_ITERATIONS = 250_000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

@Injectable({ providedIn: 'root' })
export class CryptoService {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  async deriveKey(
    passphrase: string,
    saltBase64?: string,
    iterations: number = DEFAULT_PBKDF2_ITERATIONS
  ): Promise<DerivedKey> {
    const salt = saltBase64 ? this.base64ToBytes(saltBase64) : this.randomBytes(SALT_LENGTH);
    const material = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations,
        salt,
      },
      material,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      key,
      salt: this.bytesToBase64(salt),
      iterations,
    };
  }

  async encrypt<T>(value: T, key: CryptoKey, keyVersion: number): Promise<EncryptedPayload> {
    const iv = this.randomBytes(IV_LENGTH);
    const payload = this.encoder.encode(JSON.stringify(value));
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);

    return {
      algorithm: 'AES-GCM',
      keyVersion,
      iv: this.bytesToBase64(iv),
      cipherText: this.bytesToBase64(new Uint8Array(cipherBuffer)),
    };
  }

  async decrypt<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
    if (payload.algorithm !== 'AES-GCM') {
      throw new Error(`Unsupported algorithm: ${payload.algorithm}`);
    }

    const iv = this.base64ToBytes(payload.iv);
    const cipherBytes = this.base64ToBytes(payload.cipherText);
    const buffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    const text = this.decoder.decode(buffer);

    return JSON.parse(text) as T;
  }

  async rotate<T>(
    payload: EncryptedPayload,
    previousKey: CryptoKey,
    nextKey: CryptoKey,
    nextKeyVersion: number
  ): Promise<EncryptedPayload> {
    const data = await this.decrypt<T>(payload, previousKey);
    return this.encrypt<T>(data, nextKey, nextKeyVersion);
  }

  private randomBytes(size: number): Uint8Array {
    const array = new Uint8Array(size);
    crypto.getRandomValues(array);
    return array;
  }

  private bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

    if (typeof btoa === 'function') {
      let binary = '';
      for (let i = 0; i < view.length; i += 1) {
        binary += String.fromCharCode(view[i]);
      }
      return btoa(binary);
    }

    const bufferCtor = (globalThis as { Buffer?: { from(data: Uint8Array): { toString(encoding: string): string } } }).Buffer;
    if (bufferCtor) {
      return bufferCtor.from(view).toString('base64');
    }

    throw new Error('No base64 encoder available in this environment.');
  }

  private base64ToBytes(value: string): Uint8Array {
    if (typeof atob === 'function') {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): Uint8Array } }).Buffer;
    if (bufferCtor) {
      return new Uint8Array(bufferCtor.from(value, 'base64'));
    }

    throw new Error('No base64 decoder available in this environment.');
  }
}
