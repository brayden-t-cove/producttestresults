/**
 * Storage abstraction layer.
 * When DATABASE_URL is set, uses PostgreSQL.
 * Otherwise falls back to JSON files (local dev).
 */
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Postgres setup ────────────────────────────────────────────────────────────

let pool = null;

export function getPool() {
  return pool;
}

export async function initDb() {
  if (!process.env.DATABASE_URL) return;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_created_at ON sessions ((data->>'createdAt') DESC);
    CREATE INDEX IF NOT EXISTS catalog_created_at ON catalog ((data->>'createdAt') DESC);
    CREATE TABLE IF NOT EXISTS comparisons (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS firmwares (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vendor_submissions (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS test_items (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS test_items_category ON test_items ((data->>'category'));
  `);

  // Seed catalog from seed-catalog.json if catalog table is empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM catalog');
  if (parseInt(rows[0].count, 10) === 0) {
    const seedPath = join(ROOT, 'data', 'seed-catalog.json');
    if (existsSync(seedPath)) {
      const seed = JSON.parse(await readFile(seedPath, 'utf-8'));
      for (const item of seed) {
        await pool.query('INSERT INTO catalog (id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING', [item.id, item]);
      }
      console.log(`Seeded ${seed.length} catalog entries from seed-catalog.json`);
    }
  }

  console.log('PostgreSQL connected and tables ready');
}

// Called after initDb() so auth tables can use getPool()
export async function initAuthDb() {
  const { initAuthTables } = await import('./auth.js');
  await initAuthTables();
}

// ── File-based fallback paths ─────────────────────────────────────────────────

function filePaths() {
  const DATA_BASE = process.env.DATA_DIR || join(ROOT, 'data');
  return {
    DATA_BASE,
    CATALOG_FILE: join(DATA_BASE, 'catalog.json'),
    SESSIONS_DIR: join(DATA_BASE, 'sessions'),
    COMPARISONS_DIR: join(DATA_BASE, 'comparisons'),
    DEVICES_FILE: join(DATA_BASE, 'devices.json'),
    FIRMWARES_FILE: join(DATA_BASE, 'firmwares.json'),
    SPEC_SCHEMA_FILE: join(DATA_BASE, 'specSchema.json'),
    CERT_SCHEMA_FILE: join(DATA_BASE, 'certSchema.json'),
  };
}

async function readJson(file, fallback = []) {
  try { return JSON.parse(await readFile(file, 'utf-8')); } catch { return fallback; }
}
async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2));
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export const catalog = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM catalog ORDER BY (data->>\'createdAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    return readJson(filePaths().CATALOG_FILE);
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM catalog WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const all = await readJson(filePaths().CATALOG_FILE);
    return all.find(e => e.id === id) || null;
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO catalog (id, data) VALUES ($1, $2)', [entry.id, entry]);
      return entry;
    }
    const { CATALOG_FILE } = filePaths();
    const all = await readJson(CATALOG_FILE);
    all.push(entry);
    await writeJson(CATALOG_FILE, all);
    return entry;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM catalog WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id, createdAt: rows[0].data.createdAt };
      await pool.query('UPDATE catalog SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const { CATALOG_FILE } = filePaths();
    const all = await readJson(CATALOG_FILE);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, id, createdAt: all[idx].createdAt };
    await writeJson(CATALOG_FILE, all);
    return all[idx];
  },

  async delete(id) {
    if (pool) {
      const { rows } = await pool.query('DELETE FROM catalog WHERE id = $1 RETURNING data', [id]);
      return rows[0]?.data || null;
    }
    const { CATALOG_FILE } = filePaths();
    const all = await readJson(CATALOG_FILE);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const [removed] = all.splice(idx, 1);
    await writeJson(CATALOG_FILE, all);
    return removed;
  },
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessions = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM sessions ORDER BY (data->>\'createdAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    const { SESSIONS_DIR } = filePaths();
    const files = await readdir(SESSIONS_DIR).catch(() => []);
    const all = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(f => readJson(join(SESSIONS_DIR, f), null))
    );
    return all.filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Like getAll() but strips testCases from each row — much faster for list views
  async getAllSummary() {
    if (pool) {
      const { rows } = await pool.query(`
        SELECT
          (data - 'testCases') ||
          jsonb_build_object(
            'testCaseCount', jsonb_array_length(COALESCE(data->'testCases', '[]'::jsonb)),
            'passCount',     (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(data->'testCases','[]'::jsonb)) t WHERE t->>'status' = 'pass'),
            'failCount',     (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(data->'testCases','[]'::jsonb)) t WHERE t->>'status' = 'fail'),
            'skipCount',     (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(data->'testCases','[]'::jsonb)) t WHERE (t->>'status' = 'skip' OR t->>'status' = 'na'))
          ) AS data
        FROM sessions
        ORDER BY (data->>'createdAt') DESC NULLS LAST
      `);
      return rows.map(r => r.data);
    }
    // File fallback: load everything (files are small enough)
    return this.getAll();
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM sessions WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const file = join(filePaths().SESSIONS_DIR, `${id}.json`);
    if (!existsSync(file)) return null;
    return readJson(file, null);
  },

  async create(session) {
    if (pool) {
      await pool.query('INSERT INTO sessions (id, data) VALUES ($1, $2)', [session.id, session]);
      return session;
    }
    const { SESSIONS_DIR } = filePaths();
    await mkdir(SESSIONS_DIR, { recursive: true });
    await writeJson(join(SESSIONS_DIR, `${session.id}.json`), session);
    return session;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM sessions WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id };
      await pool.query('UPDATE sessions SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const file = join(filePaths().SESSIONS_DIR, `${id}.json`);
    if (!existsSync(file)) return null;
    const existing = await readJson(file, null);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    await writeJson(file, updated);
    return updated;
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
      return;
    }
    const { unlink } = await import('fs/promises');
    const file = join(filePaths().SESSIONS_DIR, `${id}.json`);
    await unlink(file).catch(() => {});
  },
};

// ── Comparisons ───────────────────────────────────────────────────────────────

export const comparisons = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM comparisons ORDER BY (data->>\'createdAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    const { COMPARISONS_DIR } = filePaths();
    const files = await readdir(COMPARISONS_DIR).catch(() => []);
    const all = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(f => readJson(join(COMPARISONS_DIR, f), null))
    );
    return all.filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM comparisons WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const file = join(filePaths().COMPARISONS_DIR, `${id}.json`);
    return existsSync(file) ? readJson(file, null) : null;
  },

  async create(comp) {
    if (pool) {
      await pool.query('INSERT INTO comparisons (id, data) VALUES ($1, $2)', [comp.id, comp]);
      return comp;
    }
    const { COMPARISONS_DIR } = filePaths();
    await mkdir(COMPARISONS_DIR, { recursive: true });
    await writeJson(join(COMPARISONS_DIR, `${comp.id}.json`), comp);
    return comp;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM comparisons WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id, createdAt: rows[0].data.createdAt };
      await pool.query('UPDATE comparisons SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const file = join(filePaths().COMPARISONS_DIR, `${id}.json`);
    if (!existsSync(file)) return null;
    const existing = await readJson(file, null);
    const updated = { ...existing, ...patch, id, createdAt: existing.createdAt };
    await writeJson(file, updated);
    return updated;
  },

  async delete(id) {
    if (pool) {
      const { rows } = await pool.query('DELETE FROM comparisons WHERE id = $1 RETURNING data', [id]);
      return !!rows[0];
    }
    const file = join(filePaths().COMPARISONS_DIR, `${id}.json`);
    if (!existsSync(file)) return false;
    await import('fs/promises').then(m => m.unlink(file));
    return true;
  },
};

// ── Devices ───────────────────────────────────────────────────────────────────

export const devices = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM devices');
      return rows.map(r => r.data);
    }
    return readJson(filePaths().DEVICES_FILE);
  },

  async create(device) {
    if (pool) {
      await pool.query('INSERT INTO devices (id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING', [device.id, device]);
      return device;
    }
    const { DEVICES_FILE } = filePaths();
    const all = await readJson(DEVICES_FILE);
    all.push(device);
    await writeJson(DEVICES_FILE, all);
    return device;
  },
};

// ── Firmwares ─────────────────────────────────────────────────────────────────

export const firmwares = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM firmwares');
      return rows.map(r => r.data);
    }
    return readJson(filePaths().FIRMWARES_FILE);
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO firmwares (id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING', [entry.id, entry]);
      return entry;
    }
    const { FIRMWARES_FILE } = filePaths();
    const all = await readJson(FIRMWARES_FILE);
    all.push(entry);
    await writeJson(FIRMWARES_FILE, all);
    return entry;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM firmwares WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch };
      await pool.query('UPDATE firmwares SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const { FIRMWARES_FILE } = filePaths();
    const all = await readJson(FIRMWARES_FILE);
    const idx = all.findIndex(f => f.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    await writeJson(FIRMWARES_FILE, all);
    return all[idx];
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM firmwares WHERE id = $1', [id]);
      return;
    }
    const { FIRMWARES_FILE } = filePaths();
    const all = await readJson(FIRMWARES_FILE);
    await writeJson(FIRMWARES_FILE, all.filter(f => f.id !== id));
  },
};

// ── Vendors ───────────────────────────────────────────────────────────────────

export const vendors = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendors ORDER BY (data->>\'createdAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    return readJson(join(filePaths().DATA_BASE, 'vendors.json'));
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendors WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const all = await readJson(join(filePaths().DATA_BASE, 'vendors.json'));
    return all.find(e => e.id === id) || null;
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO vendors (id, data) VALUES ($1, $2)', [entry.id, entry]);
      return entry;
    }
    const file = join(filePaths().DATA_BASE, 'vendors.json');
    const all = await readJson(file);
    all.push(entry);
    await writeJson(file, all);
    return entry;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendors WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id, createdAt: rows[0].data.createdAt };
      await pool.query('UPDATE vendors SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const file = join(filePaths().DATA_BASE, 'vendors.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, id, createdAt: all[idx].createdAt };
    await writeJson(file, all);
    return all[idx];
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM vendors WHERE id = $1', [id]);
      return;
    }
    const file = join(filePaths().DATA_BASE, 'vendors.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return;
    all.splice(idx, 1);
    await writeJson(file, all);
  },
};

// ── Config (spec schema, cert schema) ─────────────────────────────────────────

export const config = {
  async get(key, fallback = null) {
    if (pool) {
      const { rows } = await pool.query('SELECT value FROM kv WHERE key = $1', [key]);
      return rows[0]?.value ?? fallback;
    }
    const paths = filePaths();
    const file = key === 'specSchema' ? paths.SPEC_SCHEMA_FILE : paths.CERT_SCHEMA_FILE;
    return readJson(file, fallback);
  },

  async set(key, value) {
    if (pool) {
      await pool.query('INSERT INTO kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
      return;
    }
    const paths = filePaths();
    const file = key === 'specSchema' ? paths.SPEC_SCHEMA_FILE : paths.CERT_SCHEMA_FILE;
    await writeJson(file, value);
  },
};

// ── Vendor Submissions ────────────────────────────────────────────────────────

export const vendorSubmissions = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendor_submissions ORDER BY (data->>\'submittedAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    return readJson(join(filePaths().DATA_BASE, 'vendor_submissions.json'));
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendor_submissions WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const all = await readJson(join(filePaths().DATA_BASE, 'vendor_submissions.json'));
    return all.find(e => e.id === id) || null;
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO vendor_submissions (id, data) VALUES ($1, $2)', [entry.id, entry]);
      return entry;
    }
    const file = join(filePaths().DATA_BASE, 'vendor_submissions.json');
    const all = await readJson(file);
    all.push(entry);
    await writeJson(file, all);
    return entry;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM vendor_submissions WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id };
      await pool.query('UPDATE vendor_submissions SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const file = join(filePaths().DATA_BASE, 'vendor_submissions.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, id };
    await writeJson(file, all);
    return all[idx];
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM vendor_submissions WHERE id = $1', [id]);
      return;
    }
    const file = join(filePaths().DATA_BASE, 'vendor_submissions.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return;
    all.splice(idx, 1);
    await writeJson(file, all);
  },
};

// ── Test Items (buffet library) ───────────────────────────────────────────────

export const testItems = {
  async getAll({ category, status } = {}) {
    if (pool) {
      let q = 'SELECT data FROM test_items';
      const conds = [], vals = [];
      if (category) { conds.push(`data->>'category' = $${vals.length + 1}`); vals.push(category); }
      if (status)   { conds.push(`data->>'status' = $${vals.length + 1}`);   vals.push(status); }
      if (conds.length) q += ' WHERE ' + conds.join(' AND ');
      q += " ORDER BY (data->>'category'), (data->>'name')";
      const { rows } = await pool.query(q, vals);
      return rows.map(r => r.data);
    }
    const file = join(filePaths().DATA_BASE, 'test-items.json');
    let all = await readJson(file);
    if (category) all = all.filter(i => i.category === category);
    if (status)   all = all.filter(i => i.status === status);
    return all;
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM test_items WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const all = await readJson(join(filePaths().DATA_BASE, 'test-items.json'));
    return all.find(e => e.id === id) || null;
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO test_items (id, data) VALUES ($1, $2)', [entry.id, entry]);
      return entry;
    }
    const file = join(filePaths().DATA_BASE, 'test-items.json');
    const all = await readJson(file);
    all.push(entry);
    await writeJson(file, all);
    return entry;
  },

  async update(id, patch) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM test_items WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const updated = { ...rows[0].data, ...patch, id };
      await pool.query('UPDATE test_items SET data = $1 WHERE id = $2', [updated, id]);
      return updated;
    }
    const file = join(filePaths().DATA_BASE, 'test-items.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, id };
    await writeJson(file, all);
    return all[idx];
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM test_items WHERE id = $1', [id]);
      return;
    }
    const file = join(filePaths().DATA_BASE, 'test-items.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return;
    all.splice(idx, 1);
    await writeJson(file, all);
  },
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const projects = {
  async getAll() {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM projects ORDER BY (data->>\'createdAt\') DESC NULLS LAST');
      return rows.map(r => r.data);
    }
    return readJson(join(filePaths().DATA_BASE, 'projects.json'));
  },

  async getById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT data FROM projects WHERE id = $1', [id]);
      return rows[0]?.data || null;
    }
    const all = await readJson(join(filePaths().DATA_BASE, 'projects.json'));
    return all.find(e => e.id === id) || null;
  },

  async create(entry) {
    if (pool) {
      await pool.query('INSERT INTO projects (id, data) VALUES ($1, $2)', [entry.id, entry]);
      return entry;
    }
    const file = join(filePaths().DATA_BASE, 'projects.json');
    const all = await readJson(file);
    all.push(entry);
    await writeJson(file, all);
    return entry;
  },

  async update(id, data) {
    if (pool) {
      await pool.query('UPDATE projects SET data = $1 WHERE id = $2', [data, id]);
      return data;
    }
    const file = join(filePaths().DATA_BASE, 'projects.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    all[idx] = data;
    await writeJson(file, all);
    return data;
  },

  async delete(id) {
    if (pool) {
      await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      return;
    }
    const file = join(filePaths().DATA_BASE, 'projects.json');
    const all = await readJson(file);
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return;
    all.splice(idx, 1);
    await writeJson(file, all);
  },
};
