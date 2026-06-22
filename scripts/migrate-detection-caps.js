/**
 * Migration: split ambiguous detection capability IDs into edge/cloud variants.
 *
 * Before this migration, cameras used un-suffixed IDs that mapped to the Cloud
 * Based Features group. This script adds the corresponding -edge variant for
 * each detection type that was already checked, so both groups are represented.
 *
 * Mappings applied to camera products:
 *   'vehicle-detection'  → also add 'vehicle-detection-edge'
 *   'animal-detection'   → also add 'animal-detection-edge'
 *   'package-detection'  → also add 'package-detection-edge'
 *
 * Run locally:  node scripts/migrate-detection-caps.js
 * Run vs Railway DB: DATABASE_URL=<url> node scripts/migrate-detection-caps.js
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
dotenv.config({ path: join(ROOT, '.env') });

const EDGE_MAP = {
  'vehicle-detection': 'vehicle-detection-edge',
  'animal-detection': 'animal-detection-edge',
  'package-detection': 'package-detection-edge',
};

function migrateCapabilities(caps) {
  if (!Array.isArray(caps)) return { caps, changed: false };
  const set = new Set(caps);
  let changed = false;
  for (const [cloudId, edgeId] of Object.entries(EDGE_MAP)) {
    if (set.has(cloudId) && !set.has(edgeId)) {
      set.add(edgeId);
      changed = true;
      console.log(`  + added ${edgeId} (because ${cloudId} was present)`);
    }
  }
  return { caps: [...set], changed };
}

async function migrateFiles() {
  const DATA_BASE = process.env.DATA_DIR || join(ROOT, 'data');
  const CATALOG_FILE = join(DATA_BASE, 'catalog.json');
  if (!existsSync(CATALOG_FILE)) {
    console.log('No local catalog.json found — skipping file migration.');
    return;
  }
  const data = JSON.parse(await readFile(CATALOG_FILE, 'utf-8'));
  let totalChanged = 0;
  const updated = data.map(product => {
    if (product.category !== 'camera') return product;
    console.log(`\nChecking: ${product.modelNumber || product.name}`);
    const { caps, changed } = migrateCapabilities(product.capabilities);
    if (changed) totalChanged++;
    return { ...product, capabilities: caps };
  });
  await writeFile(CATALOG_FILE, JSON.stringify(updated, null, 2));
  console.log(`\nFile migration complete. ${totalChanged} products updated.`);

  // Also update seed-catalog.json if it exists
  const SEED_FILE = join(ROOT, 'data', 'seed-catalog.json');
  if (existsSync(SEED_FILE)) {
    const seed = JSON.parse(await readFile(SEED_FILE, 'utf-8'));
    let seedChanged = 0;
    const updatedSeed = seed.map(product => {
      if (product.category !== 'camera') return product;
      const { caps, changed } = migrateCapabilities(product.capabilities);
      if (changed) seedChanged++;
      return { ...product, capabilities: caps };
    });
    await writeFile(SEED_FILE, JSON.stringify(updatedSeed, null, 2));
    console.log(`Seed catalog updated. ${seedChanged} products updated.`);
  }
}

async function migrateDb() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const { rows } = await pool.query("SELECT id, data FROM catalog WHERE data->>'category' = 'camera'");
    console.log(`Found ${rows.length} camera products in DB.`);
    let totalChanged = 0;
    for (const row of rows) {
      const product = row.data;
      console.log(`\nChecking: ${product.modelNumber || product.name}`);
      const { caps, changed } = migrateCapabilities(product.capabilities);
      if (changed) {
        const updated = { ...product, capabilities: caps };
        await pool.query('UPDATE catalog SET data = $1 WHERE id = $2', [updated, row.id]);
        totalChanged++;
      }
    }
    console.log(`\nDB migration complete. ${totalChanged} products updated.`);
  } finally {
    await pool.end();
  }
}

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL detected — migrating PostgreSQL...');
  await migrateDb();
} else {
  console.log('No DATABASE_URL — migrating local JSON files...');
  await migrateFiles();
}
