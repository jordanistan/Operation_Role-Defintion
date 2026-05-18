import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORAGE_CONTRACT_VERSION } from '../src/storage-contract.js';
import { importJsonToSQLite } from '../src/import-json-to-sqlite.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const jsonFile = process.env.DATA_FILE || join(root, 'data', 'operations-assistant.json');
const sqliteFile = process.env.SQLITE_FILE || join(root, 'data', 'operations-assistant.sqlite');

try {
  const result = await importJsonToSQLite({ jsonFile, sqliteFile });
  console.log(`Imported ${result.workspaceCount} workspace(s) from ${result.jsonFile}`);
  console.log(`SQLite database ready at ${result.sqliteFile}`);
  console.log(`Storage contract version: ${STORAGE_CONTRACT_VERSION}`);
  console.log('Use STORE_TYPE=sqlite to run the app against SQLite.');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`JSON source not found: ${jsonFile}`);
    console.error('Create local JSON data first, or set DATA_FILE to the JSON file to import.');
    process.exitCode = 1;
  } else {
    throw error;
  }
}
