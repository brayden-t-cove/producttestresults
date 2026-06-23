import { initDb, catalog } from '../lib/storage.js';
import { writeFile } from 'fs/promises';

await initDb();
const all = await catalog.getAll();
await writeFile(new URL('../data/seed-catalog.json', import.meta.url), JSON.stringify(all, null, 2));
await writeFile(new URL('../data/catalog.json', import.meta.url), JSON.stringify(all, null, 2));
console.log(`${all.length} entries exported to data/seed-catalog.json`);
process.exit(0);
