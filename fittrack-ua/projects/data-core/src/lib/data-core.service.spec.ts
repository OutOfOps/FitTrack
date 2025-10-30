import 'fake-indexeddb/auto';

import Dexie, { Table } from 'dexie';
import { Crypto } from 'webcrypto-mock';

import { CryptoService } from '@fittrack/crypto';

import {
  DATA_CORE_DB_NAME,
  DataCoreService,
  EncryptionKeyring,
  FoodEntry,
  SaveOptions,
  WaterEntry,
} from './data-core.service';

describe('DataCoreService', () => {
  let service: DataCoreService;
  let cryptoService: CryptoService;
  let saveOptions: SaveOptions;
  let keyring: EncryptionKeyring;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: new Crypto(),
      configurable: true,
    });
  });

  beforeEach(async () => {
    await Dexie.delete(DATA_CORE_DB_NAME);
    cryptoService = new CryptoService();
    const derived = await cryptoService.deriveKey('fittrack-master', undefined, 40_000);
    saveOptions = { key: derived.key, keyVersion: 1 };
    keyring = new Map([[1, derived.key]]);
    service = new DataCoreService(cryptoService);
  });

  it('persists encrypted water and food entries and lists them by day', async () => {
    const water: WaterEntry = { volumeMl: 250, recordedAt: Date.now(), note: 'morning' };
    const food: FoodEntry = { label: 'oatmeal', calories: 320, recordedAt: Date.now() + 1000 };

    await service.saveWater('2024-04-01', water, saveOptions);
    await service.saveFood('2024-04-01', food, saveOptions);

    const stored = await (service as unknown as { db: Dexie & { entries: Table<any, string> } }).db.entries.toArray();
    expect(stored.length).toBe(2);
    expect(stored.every((entry: any) => typeof entry.payload.cipherText === 'string')).toBeTrue();
    expect(stored[0].payload.cipherText).not.toContain('oatmeal');

    const entries = await service.listByDay('2024-04-01', keyring);

    expect(entries.map((entry) => entry.type)).toEqual(['water', 'food']);
    expect(entries[0].data).toEqual(water);
    expect(entries[1].data).toEqual(food);
  });

  it('deletes entries by identifier', async () => {
    const id = await service.saveWater('2024-04-02', { volumeMl: 500, recordedAt: Date.now() }, saveOptions);

    await service.deleteById(id);

    const entries = await service.listByDay('2024-04-02', keyring);
    expect(entries.length).toBe(0);
  });

  it('supports backup roundtrip by rehydrating raw entries', async () => {
    const water: WaterEntry = { volumeMl: 300, recordedAt: Date.now() };
    const food: FoodEntry = { label: 'salad', calories: 210, recordedAt: Date.now() + 1000 };

    await service.saveWater('2024-04-03', water, saveOptions);
    await service.saveFood('2024-04-03', food, saveOptions);

    const backup = await (service as unknown as { db: Dexie & { entries: Table<any, string> } }).db.entries.toArray();

    await Dexie.delete(DATA_CORE_DB_NAME);
    const secondService = new DataCoreService(cryptoService);
    await (secondService as unknown as { db: Dexie & { entries: Table<any, string> } }).db.entries.bulkAdd(backup);

    const restored = await secondService.listByDay('2024-04-03', keyring);

    expect(restored).toHaveSize(2);
    expect(restored[0].data).toEqual(water);
    expect(restored[1].data).toEqual(food);
  });
});
