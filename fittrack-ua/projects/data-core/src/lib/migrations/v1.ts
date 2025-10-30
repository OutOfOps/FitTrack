import type { Migration } from './migration';

export const initialMigration: Migration = {
  version: 1,
  schema: {
    entries: '&id, day, type, createdAt',
  },
};
