import { access } from 'node:fs/promises';
import { JsonStore } from './store.js';
import { SQLiteStore } from './sqlite-store.js';

export async function importJsonToSQLite({ jsonFile, sqliteFile }) {
  await access(jsonFile);

  const jsonStore = new JsonStore(jsonFile);
  const sqliteStore = new SQLiteStore(sqliteFile);

  try {
    const state = await jsonStore.read();
    await sqliteStore.write(state);
    return {
      workspaceCount: Object.keys(state.workspaces || {}).length,
      jsonFile,
      sqliteFile
    };
  } finally {
    sqliteStore.close();
  }
}
