import { join } from 'node:path';
import { JsonStore } from './store.js';
import { SQLiteStore } from './sqlite-store.js';

export function createStoreFromEnv(rootDir, env = process.env) {
  const storeType = env.STORE_TYPE || 'json';

  if (storeType === 'sqlite') {
    return new SQLiteStore(env.SQLITE_FILE || join(rootDir, 'data', 'operations-assistant.sqlite'));
  }

  if (storeType === 'json') {
    return new JsonStore(env.DATA_FILE || join(rootDir, 'data', 'operations-assistant.json'));
  }

  throw new Error(`Unsupported STORE_TYPE: ${storeType}`);
}
