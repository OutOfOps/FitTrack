import { Injectable, computed, signal } from '@angular/core';
import { CryptoService, EncryptionContext } from '@fittrack/crypto';
import { EncryptionKeyring } from '@fittrack/data-core';

const DATA_SALT_KEY = 'fittrack:data-core:salt';
const DEFAULT_KEY_VERSION = 1;
const DEFAULT_PASSPHRASE = 'fittrack-demo-passphrase';

@Injectable({ providedIn: 'root' })
export class DataContextService {
  private readonly contextState = signal<EncryptionContext | null>(null);
  private derivingContext: Promise<EncryptionContext> | null = null;

  constructor(private readonly crypto: CryptoService) {
    void this.ensureContext();
  }

  readonly context = computed(() => this.contextState());

  async ensureContext(): Promise<EncryptionContext> {
    const cached = this.contextState();
    if (cached) {
      return cached;
    }

    if (!this.derivingContext) {
      this.derivingContext = this.createContext();
    }

    return this.derivingContext;
  }

  async keyring(): Promise<EncryptionKeyring> {
    const context = await this.ensureContext();
    return new Map<number, CryptoKey>([[context.keyVersion, context.key]]);
  }

  private async createContext(): Promise<EncryptionContext> {
    const storedSalt = this.readSalt();
    const derived = await this.crypto.deriveKey(DEFAULT_PASSPHRASE, storedSalt ?? undefined);

    if (!storedSalt) {
      this.persistSalt(derived.salt);
    }

    const context: EncryptionContext = {
      key: derived.key,
      keyVersion: DEFAULT_KEY_VERSION,
    };

    this.contextState.set(context);
    return context;
  }

  private readSalt(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(DATA_SALT_KEY);
    } catch (error) {
      console.warn('Не вдалося прочитати сіль для шифрування', error);
      return null;
    }
  }

  private persistSalt(salt: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(DATA_SALT_KEY, salt);
    } catch (error) {
      console.warn('Не вдалося зберегти сіль для шифрування', error);
    }
  }
}
