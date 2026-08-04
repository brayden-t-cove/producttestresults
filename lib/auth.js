/**
 * Auth storage — users, allowed_domains, domain_requests tables.
 * Postgres only (auth requires DATABASE_URL in production).
 * File fallback stubs let the server start locally without a DB
 * but auth routes will be disabled.
 */
import { getPool } from './storage.js';
import { v4 as uuidv4 } from 'uuid';

// ── Schema ────────────────────────────────────────────────────────────────────

export async function initAuthTables() {
  const pool = getPool();
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      avatar      TEXT,
      provider    TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'viewer',
      entity      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login  TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS allowed_domains (
      id         TEXT PRIMARY KEY,
      domain     TEXT UNIQUE NOT NULL,
      entity     TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS domain_requests (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      domain      TEXT NOT NULL,
      name        TEXT NOT NULL,
      provider    TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      avatar      TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed known domains
  const KNOWN_DOMAINS = [
    { domain: 'covesmart.com', entity: 'Cove' },
    { domain: 'alder.com',     entity: 'Alder' },
    { domain: 'lunahome.com',  entity: 'Luna' },
    { domain: 'instaview.ai',  entity: 'InstaVision' },
  ];
  for (const { domain, entity } of KNOWN_DOMAINS) {
    await pool.query(`
      INSERT INTO allowed_domains (id, domain, entity)
      VALUES ($1, $2, $3)
      ON CONFLICT (domain) DO NOTHING
    `, [uuidv4(), domain, entity]);
  }

  // Migrate existing sessions: assign entity = 'Luna' where entity is missing
  await pool.query(`
    UPDATE sessions
    SET data = data || '{"entity":"Luna"}'::jsonb
    WHERE data->>'entity' IS NULL
  `);

  console.log('Auth tables ready');
}

// ── Domain helpers ────────────────────────────────────────────────────────────

export async function getDomainEntry(domain) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    'SELECT * FROM allowed_domains WHERE domain = $1', [domain]
  );
  return rows[0] || null;
}

export async function getAllDomains() {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query('SELECT * FROM allowed_domains ORDER BY domain');
  return rows;
}

export async function createDomain({ domain, entity }) {
  const pool = getPool();
  const id = uuidv4();
  const { rows } = await pool.query(`
    INSERT INTO allowed_domains (id, domain, entity)
    VALUES ($1, $2, $3)
    ON CONFLICT (domain) DO UPDATE SET entity = $3
    RETURNING *
  `, [id, domain.toLowerCase().trim(), entity]);
  return rows[0];
}

export async function deleteDomain(id) {
  const pool = getPool();
  if (!pool) return;
  await pool.query('DELETE FROM allowed_domains WHERE id = $1', [id]);
}

// ── User helpers ──────────────────────────────────────────────────────────────

export async function findOrCreateUser({ email, name, avatar, provider, providerId }) {
  const pool = getPool();
  if (!pool) return null;

  const domain = email.split('@')[1]?.toLowerCase();
  const domainEntry = await getDomainEntry(domain);

  // Check superuser bootstrap
  const isSuperuser = email.toLowerCase() === (process.env.SUPERUSER_EMAIL || '').toLowerCase();

  if (!domainEntry && !isSuperuser) {
    return { blocked: true, email, name, avatar, provider, providerId, domain };
  }

  // Upsert user
  const { rows } = await pool.query(`
    INSERT INTO users (id, email, name, avatar, provider, provider_id, role, entity, last_login)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (email) DO UPDATE
      SET name       = EXCLUDED.name,
          avatar     = EXCLUDED.avatar,
          provider   = EXCLUDED.provider,
          provider_id= EXCLUDED.provider_id,
          last_login = NOW()
    RETURNING *
  `, [
    uuidv4(),
    email.toLowerCase(),
    name,
    avatar || null,
    provider,
    providerId,
    isSuperuser ? 'superuser' : 'viewer',
    domainEntry ? domainEntry.entity : null,
  ]);

  const user = rows[0];

  // Always ensure the bootstrap superuser stays superuser
  if (isSuperuser && user.role !== 'superuser') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['superuser', user.id]);
    user.role = 'superuser';
  }

  return user;
}

export async function getAllUsers() {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows;
}

export async function updateUserRole(userId, role) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, userId]
  );
  return rows[0] || null;
}

export async function updateUserEntity(userId, entity) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    'UPDATE users SET entity = $1 WHERE id = $2 RETURNING *', [entity, userId]
  );
  return rows[0] || null;
}

export async function createPreregisteredUser({ email, name, role, entity }) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(`
    INSERT INTO users (id, email, name, avatar, provider, provider_id, role, entity, last_login)
    VALUES ($1, $2, $3, NULL, 'pre-registered', NULL, $4, $5, NULL)
    ON CONFLICT (email) DO UPDATE
      SET name   = COALESCE(EXCLUDED.name, users.name),
          role   = EXCLUDED.role,
          entity = EXCLUDED.entity
    RETURNING *
  `, [uuidv4(), email.toLowerCase().trim(), name || '', role || 'viewer', entity || null]);
  return rows[0] || null;
}

export async function deleteUser(userId) {
  const pool = getPool();
  if (!pool) return;
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

// ── Domain request helpers ────────────────────────────────────────────────────

export async function createDomainRequest({ email, name, avatar, provider, providerId }) {
  const pool = getPool();
  if (!pool) return null;
  const domain = email.split('@')[1]?.toLowerCase();

  // Don't create duplicate pending requests
  const { rows: existing } = await pool.query(
    `SELECT id FROM domain_requests WHERE email = $1 AND status = 'pending'`, [email]
  );
  if (existing.length > 0) return existing[0];

  const id = uuidv4();
  const { rows } = await pool.query(`
    INSERT INTO domain_requests (id, email, domain, name, avatar, provider, provider_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [id, email, domain, name, avatar || null, provider, providerId]);
  return rows[0];
}

export async function getDomainRequests(status = 'pending') {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query(
    'SELECT * FROM domain_requests WHERE status = $1 ORDER BY created_at DESC', [status]
  );
  return rows;
}

export async function approveDomainRequest(requestId, { role, entity, reviewedBy }) {
  const pool = getPool();
  if (!pool) return null;

  const { rows } = await pool.query(
    'SELECT * FROM domain_requests WHERE id = $1', [requestId]
  );
  if (!rows[0]) return null;
  const req = rows[0];

  // Add domain to allowed list
  await createDomain({ domain: req.domain, entity });

  // Create the user
  const user = await findOrCreateUser({
    email: req.email, name: req.name, avatar: req.avatar,
    provider: req.provider, providerId: req.provider_id,
  });
  if (user && !user.blocked) {
    await updateUserRole(user.id, role);
    await updateUserEntity(user.id, entity);
  }

  // Mark request approved
  await pool.query(`
    UPDATE domain_requests
    SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
    WHERE id = $2
  `, [reviewedBy, requestId]);

  return { domain: req.domain, entity, user };
}

export async function denyDomainRequest(requestId, reviewedBy) {
  const pool = getPool();
  if (!pool) return;
  await pool.query(`
    UPDATE domain_requests
    SET status = 'denied', reviewed_by = $1, reviewed_at = NOW()
    WHERE id = $2
  `, [reviewedBy, requestId]);
}
