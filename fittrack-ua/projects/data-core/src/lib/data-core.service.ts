import { Injectable } from '@angular/core';
import Dexie, { Table, Transaction } from 'dexie';
import { CryptoService, EncryptedPayload } from '@fittrack/crypto';
import { migrations } from './migrations';

export type EntryType = 'water' | 'food';

export interface WaterEntry {
  volumeMl: number;
  recordedAt: number;
  note?: string;
}

export interface FoodEntry {
  label: string;
  calories: number;
  recordedAt: number;
  catalogItemId?: string;
  vitamins?: Record<string, number>;
}

export interface PersistedEntry {
  id: string;
  day: string;
  type: EntryType;
  payload: EncryptedPayload;
  createdAt: number;
}

export interface DecryptedEntry<T = unknown> {
  id: string;
  day: string;
  type: EntryType;
  createdAt: number;
  keyVersion: number;
  data: T;
}

export type EncryptionKeyring = Map<number, CryptoKey>;

export interface SaveOptions {
  key: CryptoKey;
  keyVersion: number;
}

export const DATA_CORE_DB_NAME = 'fittrack-data-core';

class DataCoreDatabase extends Dexie {
  readonly entries!: Table<PersistedEntry, string>;

  constructor() {
    super(DATA_CORE_DB_NAME);
    this.applyMigrations();
  }

  private applyMigrations(): void {
    migrations
      .slice()
      .sort((a, b) => a.version - b.version)
      .forEach((migration) => {
        const version = this.version(migration.version).stores(migration.schema);
        if (migration.upgrade) {
          version.upgrade((transaction: Transaction) => migration.upgrade!(transaction));
        }
      });
  }
}

@Injectable({ providedIn: 'root' })
export class DataCoreService {
  private readonly db = new DataCoreDatabase();

  constructor(private readonly cryptoService: CryptoService) {}

  async saveWater(day: string, entry: WaterEntry, options: SaveOptions): Promise<string> {
    return this.saveEntry(day, 'water', entry, options);
  }

  async saveFood(day: string, entry: FoodEntry, options: SaveOptions): Promise<string> {
    return this.saveEntry(day, 'food', entry, options);
  }

  async listByDay(day: string, keyring: EncryptionKeyring): Promise<Array<DecryptedEntry>> {
    const raw = await this.db.entries.where('day').equals(day).toArray();
    const enriched: Array<DecryptedEntry> = [];

    for (const entry of raw) {
      const key = keyring.get(entry.payload.keyVersion);
      if (!key) {
        throw new Error(`Missing key for version ${entry.payload.keyVersion}`);
      }

      const data = await this.cryptoService.decrypt(entry.payload, key);
      enriched.push({
        id: entry.id,
        day: entry.day,
        type: entry.type,
        createdAt: entry.createdAt,
        keyVersion: entry.payload.keyVersion,
        data,
      });
    }

    enriched.sort((a, b) => a.createdAt - b.createdAt);
    return enriched;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.entries.delete(id);
  }

  private async saveEntry<T>(
    day: string,
    type: EntryType,
    entry: T,
    options: SaveOptions
  ): Promise<string> {
    const payload = await this.cryptoService.encrypt(entry, options.key, options.keyVersion);
    const record: PersistedEntry = {
      id: this.generateId(),
      day,
      type,
      payload,
      createdAt: Date.now(),
    };

    await this.db.entries.put(record);
    return record.id;
  }

  private generateId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
