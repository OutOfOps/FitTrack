import type { Migration } from './migration';
import { initialMigration } from './v1';

export const migrations: ReadonlyArray<Migration> = [initialMigration];

export type { Migration } from './migration';
