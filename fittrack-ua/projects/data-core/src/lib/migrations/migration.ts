import type { Transaction } from 'dexie';

export interface Migration {
  readonly version: number;
  readonly schema: Record<string, string>;
  readonly upgrade?: (transaction: Transaction) => void | Promise<void>;
}
