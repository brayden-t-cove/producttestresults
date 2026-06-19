import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import multer from 'multer';
import { join, dirname } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import QRCode from 'qrcode';
import { CSV_TEMPLATES } from './src/data/csvTemplates.js';
import { initDb, catalog, sessions, comparisons, devices, firmwares, config } from './lib/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 3001;
const ENV_FILE = join(__dirname, '.env');
const DATA_BASE = process.env.DATA_DIR || join(__dirname, 'data');
const IMAGES_DIR = join(DATA_BASE, 'images');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/images', express.static(IMAGES_DIR));

// ── Startup: init DB or file dirs ─────────────────────────────────────────────

await initDb();

if (!process.env.DATABASE_URL) {
  // Local file-based mode — ensure directories exist
  const { SPEC_SCHEMA } = await import('./src/data/productSpecs.js');
  const { CERT_SCHEMA } = await import('./src/data/certSchema.js');
  const SESSIONS_DIR = join(DATA_BASE, 'sessions');
  const COMPARISONS_DIR = join(DATA_BASE, 'comparisons');
  for (const dir of [DATA_BASE, SESSIONS_DIR, COMPARISONS_DIR, IMAGES_DIR]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
  const CATALOG_FILE = join(DATA_BASE, 'catalog.json');
  const DEVICES_FILE = join(DATA_BASE, 'devices.json');
  const FIRMWARES_FILE = join(DATA_BASE, 'firmwares.json');
  const SPEC_SCHEMA_FILE = join(DATA_BASE, 'specSchema.json');
  const CERT_SCHEMA_FILE = join(DATA_BASE, 'certSchema.json');
  if (!existsSync(CATALOG_FILE)) {
    const seedFile = join(__dirname, 'data', 'seed-catalog.json');
    if (existsSync(seedFile)) {
      await writeFile(CATALOG_FILE, await readFile(seedFile, 'utf-8'));
    } else {
      await writeFile(CATALOG_FILE, JSON.stringify([], null, 2));
    }
  }
  if (!existsSync(DEVICES_FILE)) await writeFile(DEVICES_FILE, '[]');
  if (!existsSync(FIRMWARES_FILE)) await writeFile(FIRMWARES_FILE, '[]');
  if (!existsSync(SPEC_SCHEMA_FILE)) await writeFile(SPEC_SCHEMA_FILE, JSON.stringify(SPEC_SCHEMA, null, 2));
  if (!existsSync(CERT_SCHEMA_FILE)) await writeFile(CERT_SCHEMA_FILE, JSON.stringify(CERT_SCHEMA, null, 2));
} else {
  // DB mode — ensure images dir exists (images stay on filesystem)
  if (!existsSync(IMAGES_DIR)) await mkdir(IMAGES_DIR, { recursive: true });
}

// ── Firmwares ─────────────────────────────────────────────────────────────────

app.get('/api/firmwares', async (req, res) => {
  try {
    const data = await firmwares.getAll();
    const { catalogId, deviceName } = req.query;
    if (catalogId) return res.json(data.filter(f => f.catalogId === catalogId || f.deviceName === catalogId));
    if (deviceName) return res.json(data.filter(f => f.deviceName === deviceName || f.catalogId === deviceName));
    res.json(data);
  } catch { res.json([]); }
});

app.post('/api/firmwares', async (req, res) => {
  try {
    const { catalogId, deviceName, version } = req.body;
    const key = catalogId || deviceName;
    if (!key || !version) return res.status(400).json({ error: 'catalogId (or deviceName) and version required' });
    const all = await firmwares.getAll();
    const existing = all.find(f => (f.catalogId === key || f.deviceName === key) && f.version === version);
    if (existing) return res.json(existing);
    const entry = { id: uuidv4(), catalogId: catalogId || null, deviceName: deviceName || key, version: version.trim() };
    await firmwares.create(entry);
    res.status(201).json(entry);
  } catch { res.status(500).json({ error: 'Failed to save firmware' }); }
});

// ── Debug / health ────────────────────────────────────────────────────────────

app.get('/api/debug', async (req, res) => {
  const checks = {};
  try {
    const data = await catalog.getAll();
    checks.catalog = { ok: true, entries: data.length, mode: process.env.DATABASE_URL ? 'postgres' : 'files' };
  } catch (e) {
    checks.catalog = { ok: false, error: e.message };
  }
  checks.server = { ok: true, port: PORT, uptime: Math.round(process.uptime()) + 's', nodeVersion: process.version };
  checks.env = { anthropicKeySet: !!process.env.ANTHROPIC_API_KEY, databaseUrl: !!process.env.DATABASE_URL };
  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 500).json({ status: allOk ? 'ok' : 'degraded', checks });
});

// ── Spec / Cert schema ────────────────────────────────────────────────────────

app.get('/api/spec-schema', async (req, res) => {
  try {
    const data = await config.get('specSchema');
    if (!data) return res.status(404).json({ error: 'Schema not found' });
    res.json(data);
  } catch { res.status(404).json({ error: 'Schema not found' }); }
});

app.put('/api/spec-schema', async (req, res) => {
  try {
    await config.set('specSchema', req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to save schema', detail: e.message }); }
});

app.get('/api/cert-schema', async (req, res) => {
  try {
    const data = await config.get('certSchema');
    if (!data) return res.status(404).json({ error: 'Cert schema not found' });
    res.json(data);
  } catch { res.status(404).json({ error: 'Cert schema not found' }); }
});

app.put('/api/cert-schema', async (req, res) => {
  try {
    await config.set('certSchema', req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to save cert schema', detail: e.message }); }
});

// ── Catalog ───────────────────────────────────────────────────────────────────

app.get('/api/catalog', async (req, res) => {
  try { res.json(await catalog.getAll()); }
  catch { res.json([]); }
});

app.get('/api/catalog/export/csv', async (req, res) => {
  try {
    const data = await catalog.getAll();
    const headers = ['id', 'name', 'manufacturer', 'modelNumber', 'version', 'category', 'createdAt'];
    const rows = data.map(p => headers.map(h => `"${String(p[h] ?? '').replace(/"/g, '""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="catalog-export.csv"');
    res.send([headers.join(','), ...rows].join('\n'));
  } catch { res.status(500).json({ error: 'Failed to export CSV' }); }
});

app.get('/api/catalog/export/json', async (req, res) => {
  try {
    const data = await catalog.getAll();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="catalog-export.json"');
    res.send(JSON.stringify(data, null, 2));
  } catch { res.status(500).json({ error: 'Failed to export JSON' }); }
});

// Image upload (images always stay on filesystem)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    cb(null, `${req.params.id}-${Date.now()}.${ext}`);
  },
});
const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

app.post('/api/catalog/:id/image', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (req.file) unlink(req.file.path).catch(() => {});
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Image too large — maximum size is 5 MB' });
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
      const entry = await catalog.getById(req.params.id);
      if (!entry) {
        unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: 'Not found' });
      }
      if (entry.imageUrl) {
        const oldPath = join(IMAGES_DIR, entry.imageUrl.split('/').pop());
        unlink(oldPath).catch(() => {});
      }
      const imageUrl = `/api/images/${req.file.filename}`;
      await catalog.update(req.params.id, { imageUrl });
      res.json({ imageUrl });
    } catch (e) {
      if (req.file) unlink(req.file.path).catch(() => {});
      res.status(500).json({ error: 'Failed to upload image', detail: e.message });
    }
  });
});

app.delete('/api/catalog/:id/image', async (req, res) => {
  try {
    const entry = await catalog.getById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (entry.imageUrl) {
      const oldPath = join(IMAGES_DIR, entry.imageUrl.split('/').pop());
      unlink(oldPath).catch(() => {});
      await catalog.update(req.params.id, { imageUrl: null });
    }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed to delete image' }); }
});

app.get('/api/catalog/:id', async (req, res) => {
  try {
    const entry = await catalog.getById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch { res.status(500).json({ error: 'Failed to read catalog' }); }
});

app.post('/api/catalog', async (req, res) => {
  try {
    const { name, manufacturer, modelNumber, version, status, category, capabilities, appConfigs,
            specs, certifications, compatibleWith, entity, type, hubConnectionType, subclass } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required', code: 'CAT_001_MISSING_FIELDS' });
    const entry = {
      id: uuidv4(),
      name: name.trim(),
      manufacturer: (manufacturer || '').trim(),
      modelNumber: (modelNumber || '').trim(),
      version: (version || '').trim(),
      status: status || 'active',
      category,
      subclass: subclass || null,
      capabilities: capabilities || [],
      compatibleWith: compatibleWith || [],
      hubConnectionType: hubConnectionType || null,
      appConfigs: appConfigs || [],
      specs: specs || {},
      certifications: certifications || {},
      entity: entity || [],
      type: type || 'production',
      createdAt: new Date().toISOString(),
    };
    await catalog.create(entry);
    res.status(201).json(entry);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error creating catalog entry', detail: e.message });
  }
});

app.put('/api/catalog/:id', async (req, res) => {
  try {
    const updated = await catalog.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error updating catalog entry', detail: e.message });
  }
});

app.delete('/api/catalog/:id', async (req, res) => {
  try {
    const removed = await catalog.delete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json(removed);
  } catch { res.status(500).json({ error: 'Failed to delete catalog entry' }); }
});

// ── Devices ───────────────────────────────────────────────────────────────────

app.get('/api/devices', async (req, res) => {
  try { res.json(await devices.getAll()); }
  catch { res.json([]); }
});

app.post('/api/devices', async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const all = await devices.getAll();
    const existing = all.find(d => d.name.toLowerCase() === name.toLowerCase() && d.category === category);
    if (existing) return res.json(existing);
    const device = { id: uuidv4(), name: name.trim(), category };
    await devices.create(device);
    res.status(201).json(device);
  } catch { res.status(500).json({ error: 'Failed to save device' }); }
});

// ── Sessions ──────────────────────────────────────────────────────────────────

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

app.get('/api/sessions', async (req, res) => {
  try {
    const all = await sessions.getAll();
    const result = all.map(s => ({
      id: s.id,
      productName: s.productName,
      date: s.createdAt,
      status: s.status,
      issueCount: (s.issues || []).length,
      testPlan: s.testPlan || 'production',
      catalogId: s.catalogId || s.productId || null,
      appConfigName: s.appConfigName || null,
      testerName: s.testerName || null,
      products: s.products ? s.products.map(p => ({ catalogId: p.catalogId })) : null,
      testCases: s.testCases || [],
      createdAt: s.createdAt,
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const session = await sessions.getById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read session' });
  }
});

// GET /api/qr?url=...
app.get('/api/qr', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url param required' });
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1 });
    res.json({ dataUrl });
  } catch { res.status(500).json({ error: 'QR generation failed' }); }
});

app.get('/api/sessions/:id/export/csv', async (req, res) => {
  try {
    const session = await sessions.getById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Test #', 'Title', 'Status', 'Notes', 'Linked Issue', 'Firmware', 'Date']];
    for (const t of (session.tests || [])) {
      rows.push([
        escape(t.testNumber ?? ''), escape(t.title ?? ''), escape(t.status ?? ''),
        escape(t.notes ?? ''), escape(t.linkedIssueTitle ?? ''),
        escape(session.firmware ?? ''), escape(session.date ?? session.createdAt ?? ''),
      ]);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id}.csv"`);
    res.send(rows.map(r => r.join(',')).join('\n'));
  } catch { res.status(500).json({ error: 'Failed to export session' }); }
});

app.get('/api/sessions/:id/export/exploratory-csv', async (req, res) => {
  try {
    const session = await sessions.getById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Category', 'Performance', 'UI/UX', 'Bug/Issue', 'Like', 'Dislike', 'Other Notes', 'Rating', 'Product', 'Date']];
    for (const cat of (session.categories || [])) {
      const obs = cat.observations || {};
      rows.push([
        escape(cat.label ?? ''), escape(obs.performance ?? ''), escape(obs.uiux ?? ''),
        escape(obs.bugIssue ?? ''), escape(obs.like ?? ''), escape(obs.dislike ?? ''),
        escape(obs.otherNotes ?? ''), escape(cat.rating ?? ''),
        escape(session.productName ?? ''), escape(session.date ?? session.createdAt ?? ''),
      ]);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exploratory-${req.params.id}.csv"`);
    res.send(rows.map(r => r.join(',')).join('\n'));
  } catch { res.status(500).json({ error: 'Failed to export session' }); }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { productId, productName, category, subcategory, firmware, notes, type, testPlan,
            products, metrics, results, autoPulled, platform, testEnvironment, categories,
            overallSummary, catalogId, testerName } = req.body;
    const id = uuidv4();
    const session = {
      id,
      productId,
      productName,
      category,
      subcategory: subcategory || null,
      firmware: firmware || '',
      sessionNotes: notes || '',
      testerName: testerName || null,
      type: type || 'e2e',
      testPlan: testPlan || 'production',
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'active',
      testCases: [],
      issues: [],
      verifications: [],
    };
    if (catalogId) session.catalogId = catalogId;
    if (testPlan === 'comparative') {
      session.products = products || [];
      session.metrics = metrics || [];
      session.results = results || {};
      session.autoPulled = autoPulled || {};
    } else if (testPlan === 'exploratory') {
      session.platform = platform || 'native';
      session.testEnvironment = testEnvironment || {};
      session.categories = categories || [];
      session.overallSummary = overallSummary || '';
      session.status = 'in-progress';
    } else {
      if (products && products.length > 0) session.products = products;
      if (testEnvironment) session.testEnvironment = testEnvironment;
    }
    await sessions.create(session);
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const updated = await sessions.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

app.post('/api/sessions/:id/ai-summary', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  try {
    const session = await sessions.getById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const catSummaries = (session.categories || []).map(cat => {
      const obs = cat.observations || {};
      const lines = [];
      if (obs.performance) lines.push(`Performance: ${obs.performance}`);
      if (obs.uiux) lines.push(`UI/UX: ${obs.uiux}`);
      if (obs.bugIssue) lines.push(`Bug/Issue: ${obs.bugIssue}`);
      if (obs.like) lines.push(`Like: ${obs.like}`);
      if (obs.dislike) lines.push(`Dislike: ${obs.dislike}`);
      if (obs.otherNotes) lines.push(`Other: ${obs.otherNotes}`);
      return `### ${cat.label}\n${lines.join('\n') || 'No observations.'}`;
    }).join('\n\n');
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a QA engineer writing exploratory test session summaries. Be concise and professional.`,
      messages: [{ role: 'user', content: `Write a brief summary of this exploratory test session.\n\nProduct: ${session.productName}\nPlatform: ${session.platform || 'N/A'}\nDate: ${session.createdAt}\n\n${catSummaries}\n\nProvide 3-5 sentences covering overall findings, notable issues, and highlights.` }],
    });
    const aiSummary = message.content[0].text.trim();
    await sessions.update(session.id, { aiSummary });
    res.json({ aiSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI summary failed', details: err.message });
  }
});

// ── AI endpoints ──────────────────────────────────────────────────────────────

app.post('/api/ai/populate-tests', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  const { productName, category, subcategory, firmware } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a QA engineer specializing in security hardware testing for smart home products. Generate structured, thorough test cases. Always respond with valid JSON only, no markdown code blocks, no explanation.`,
      messages: [{ role: 'user', content: `Generate a comprehensive list of test cases for QA testing the following product:\nProduct: ${productName}\nCategory: ${category}\n${subcategory ? `Subcategory: ${subcategory}` : ''}\n${firmware ? `Firmware Version: ${firmware}` : ''}\n\nReturn a JSON array of test case objects. Each object must have:\n- id: a unique UUID string\n- title: short test case title (5-10 words)\n- description: what to do step by step (2-4 sentences)\n- expected: what the expected result should be (1-2 sentences)\n- status: "pending"\n- notes: ""\n- aiGenerated: true\n\nInclude 12-18 test cases covering the most important aspects for this product category.` }],
    });
    let text = message.content[0].text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    res.json({ testCases: JSON.parse(text) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

app.post('/api/ai/suggest-issue', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  const { description, productName, category } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a QA engineer specializing in security hardware testing. Analyze bug descriptions and classify them. Always respond with valid JSON only.`,
      messages: [{ role: 'user', content: `Analyze this issue description for a QA test of "${productName}" (category: ${category}):\n\n"${description}"\n\nReturn a JSON object with:\n- severity: one of "Critical", "High", "Medium", "Low"\n- issueCategory: one of "Connectivity", "UI/UX", "Performance", "Security", "Crash/ANR", "False Positive", "False Negative", "Setup/Pairing", "Firmware", "Audio/Video", "Hardware"\n- title: a clean, concise issue title (5-10 words)` }],
    });
    let text = message.content[0].text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    res.json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

app.post('/api/ai/write-repro', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  const { description, productName, productCategory, firmwareVersion } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a QA engineer specializing in security hardware testing. Convert rough bug notes into structured repro steps. Always respond with valid JSON only.`,
      messages: [{ role: 'user', content: `Turn these rough notes into structured reproduction steps for a bug in "${productName}" (${productCategory}, firmware: ${firmwareVersion || 'unknown'}):\n\n"${description}"\n\nReturn a JSON object with:\n- reproSteps: a markdown numbered list of clear, specific steps\n- preconditions: a short paragraph describing setup required` }],
    });
    let text = message.content[0].text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    res.json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

app.post('/api/ai/summarize', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  const { session } = req.body;
  try {
    const passCount = session.testCases.filter(t => t.status === 'pass').length;
    const failCount = session.testCases.filter(t => t.status === 'fail').length;
    const skipCount = session.testCases.filter(t => t.status === 'skip').length;
    const total = passCount + failCount;
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a senior QA engineer writing professional test session summaries. Use markdown formatting.`,
      messages: [{ role: 'user', content: `Write a QA session summary:\n\nProduct: ${session.productName}\nFirmware: ${session.firmware || 'N/A'}\nDate: ${session.createdAt}\nSession Notes: ${session.sessionNotes || 'None'}\n\nTest Results:\n- Total: ${total}\n- Passed: ${passCount}\n- Failed: ${failCount}\n- Skipped: ${skipCount}\n- Pass Rate: ${total > 0 ? Math.round((passCount / total) * 100) : 0}%\n\nFailed Tests:\n${session.testCases.filter(t => t.status === 'fail').map(t => `- ${t.title}: ${t.notes || 'No notes'}`).join('\n') || 'None'}\n\nIssues Logged (${session.issues.length}):\n${session.issues.map(i => `- [${i.severity}] ${i.title} (${i.issueCategory})`).join('\n') || 'None'}\n\nWrite a professional summary with sections: Overview, Test Results, Key Issues, Recommendations.` }],
    });
    res.json({ summary: message.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

// ── CSV templates / import ────────────────────────────────────────────────────

app.get('/api/csv-template/:type', (req, res) => {
  const template = CSV_TEMPLATES[req.params.type];
  if (!template) return res.status(400).json({ error: `Unknown type: ${req.params.type}` });
  function escapeField(val) {
    const s = String(val ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const lines = [template.headers.join(','), ...template.exampleRows.map(row => row.map(escapeField).join(','))];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="template-${req.params.type}.csv"`);
  res.send(lines.join('\r\n') + '\r\n');
});

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else val += line[i++];
        }
        fields.push(val);
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i)); break; }
        else { fields.push(line.slice(i, end)); i = end + 1; }
      }
    }
    rows.push(fields);
  }
  return rows;
}

app.post('/api/csv-import', (req, res) => {
  const { csvText, type } = req.body;
  if (!csvText || !type) return res.status(400).json({ error: 'csvText and type are required' });
  const template = CSV_TEMPLATES[type];
  if (!template) return res.status(400).json({ error: `Unknown type: ${type}` });
  const rows = parseCsv(csvText);
  if (rows.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(h => h.trim());
  if (type === 'reproduction') {
    return res.json({ issues: dataRows.map(row => { const obj = { id: uuidv4() }; headers.forEach((h, i) => { obj[h] = row[i] ?? ''; }); return obj; }) });
  }
  res.json({ testCases: dataRows.map(row => { const obj = { id: uuidv4(), status: 'pending' }; headers.forEach((h, i) => { obj[h] = row[i] ?? ''; }); return obj; }) });
});

// ── Issues ────────────────────────────────────────────────────────────────────

app.get('/api/issues', async (req, res) => {
  const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  try {
    const allSessions = await sessions.getAll();
    const allIssues = [];
    for (const session of allSessions) {
      const verifications = session.verifications || [];
      for (const issue of (session.issues || [])) {
        const issueVerifs = verifications.filter(v => v.issueId === issue.id);
        let status = 'Open';
        if (issueVerifs.length > 0) {
          const latest = issueVerifs[issueVerifs.length - 1];
          if (latest.result === 'Fixed' || latest.result === 'fixed-verified') status = 'Fixed';
          else if (latest.result === 'Cannot Reproduce' || latest.result === 'cannot-reproduce') status = 'Cannot Reproduce';
        }
        allIssues.push({ ...issue, sessionId: session.id, productName: session.productName, sessionDate: session.createdAt, firmware: session.firmware || '', verificationHistory: issueVerifs, derivedStatus: status });
      }
    }
    allIssues.sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99, sb = SEVERITY_ORDER[b.severity] ?? 99;
      return sa !== sb ? sa - sb : new Date(b.sessionDate) - new Date(a.sessionDate);
    });
    const { productName, catalogId } = req.query;
    let result = allIssues;
    if (productName) result = result.filter(i => i.productName === productName);
    if (catalogId) {
      const matchingIds = new Set(allSessions.filter(s => s.catalogId === catalogId).map(s => s.id));
      result = result.filter(i => matchingIds.has(i.sessionId));
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load issues' });
  }
});

app.patch('/api/sessions/:sessionId/issues/:issueId', async (req, res) => {
  try {
    const session = await sessions.getById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const issues = session.issues || [];
    const idx = issues.findIndex(i => i.id === req.params.issueId);
    if (idx === -1) return res.status(404).json({ error: 'Issue not found' });
    issues[idx] = { ...issues[idx], ...req.body };
    await sessions.update(req.params.sessionId, { issues });
    res.json(issues[idx]);
  } catch { res.status(404).json({ error: 'Session not found' }); }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

app.get('/api/analytics', async (req, res) => {
  try {
    const allSessions = await sessions.getAll();
    let totalTests = 0, passCount = 0, failCount = 0, skipCount = 0, naCount = 0;
    const productMap = {};
    const testFailMap = {};
    const issueSeverityBreakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const issueCategoryBreakdown = {};

    for (const session of allSessions) {
      const tc = session.testCases || [];
      const issues = session.issues || [];
      const verifications = session.verifications || [];
      let sPass = 0, sFail = 0, sSkip = 0, sNa = 0;
      for (const t of tc) {
        totalTests++;
        if (t.status === 'pass') { passCount++; sPass++; }
        else if (t.status === 'fail') { failCount++; sFail++; }
        else if (t.status === 'skip') { skipCount++; sSkip++; }
        else if (t.status === 'na') { naCount++; sNa++; }
        if (t.status === 'fail' && t.title) {
          const key = t.testNumber ? `${t.testNumber}|${t.title}` : t.title;
          if (!testFailMap[key]) testFailMap[key] = { title: t.title, testNumber: t.testNumber || '', failCount: 0, totalCount: 0 };
          testFailMap[key].failCount++;
        }
        if (t.title) {
          const key = t.testNumber ? `${t.testNumber}|${t.title}` : t.title;
          if (!testFailMap[key]) testFailMap[key] = { title: t.title, testNumber: t.testNumber || '', failCount: 0, totalCount: 0 };
          testFailMap[key].totalCount++;
        }
      }
      const sTotal = sPass + sFail;
      const pName = session.productName || 'Unknown';
      if (!productMap[pName]) productMap[pName] = { productName: pName, sessionCount: 0, totalPass: 0, totalFail: 0, totalSkip: 0, totalNa: 0, sessions: [], openIssues: 0 };
      const pm = productMap[pName];
      pm.sessionCount++;
      pm.totalPass += sPass; pm.totalFail += sFail; pm.totalSkip += sSkip; pm.totalNa += sNa;
      pm.sessions.push({ sessionId: session.id, date: session.createdAt, firmware: session.firmware || '', passRate: sTotal > 0 ? sPass / sTotal : 0, passCount: sPass, failCount: sFail, skipCount: sSkip, naCount: sNa });
      for (const issue of issues) {
        if (issue.severity in issueSeverityBreakdown) issueSeverityBreakdown[issue.severity]++;
        const cat = issue.issueCategory || issue.category || 'Other';
        issueCategoryBreakdown[cat] = (issueCategoryBreakdown[cat] || 0) + 1;
        const issueVerifs = verifications.filter(v => v.issueId === issue.id);
        let isOpen = true;
        if (issueVerifs.length > 0) {
          const latest = issueVerifs[issueVerifs.length - 1];
          if (latest.result === 'Fixed' || latest.result === 'fixed-verified' || latest.result === 'Cannot Reproduce' || latest.result === 'cannot-reproduce') isOpen = false;
        }
        if (isOpen) pm.openIssues++;
      }
    }

    const productStats = Object.values(productMap).map(pm => {
      const tot = pm.totalPass + pm.totalFail;
      return { productName: pm.productName, sessionCount: pm.sessionCount, passRate: tot > 0 ? pm.totalPass / tot : 0, sessions: pm.sessions.sort((a, b) => new Date(a.date) - new Date(b.date)), openIssues: pm.openIssues };
    }).sort((a, b) => a.passRate - b.passRate);

    const openIssuesByProduct = Object.values(productMap).map(pm => {
      let crit = 0, high = 0, medLow = 0, oldestDays = 0;
      for (const session of allSessions.filter(s => s.productName === pm.productName)) {
        for (const issue of (session.issues || [])) {
          const issueVerifs = (session.verifications || []).filter(v => v.issueId === issue.id);
          let isOpen = true;
          if (issueVerifs.length > 0) {
            const latest = issueVerifs[issueVerifs.length - 1];
            if (latest.result === 'Fixed' || latest.result === 'fixed-verified' || latest.result === 'Cannot Reproduce' || latest.result === 'cannot-reproduce') isOpen = false;
          }
          if (isOpen) {
            if (issue.severity === 'Critical') crit++;
            else if (issue.severity === 'High') high++;
            else medLow++;
            const days = Math.floor((Date.now() - new Date(session.createdAt)) / 86400000);
            if (days > oldestDays) oldestDays = days;
          }
        }
      }
      return { productName: pm.productName, openCount: pm.openIssues, critical: crit, high, medLow, oldestDays };
    }).filter(p => p.openCount > 0).sort((a, b) => b.openCount - a.openCount);

    res.json({
      overallStats: { sessionCount: allSessions.length, totalTests, passCount, failCount, skipCount, naCount, overallPassRate: (passCount + failCount) > 0 ? passCount / (passCount + failCount) : 0 },
      productStats,
      issueSeverityBreakdown,
      issueCategoryBreakdown,
      topFailingTests: Object.values(testFailMap).filter(t => t.failCount >= 1).sort((a, b) => b.failCount - a.failCount).slice(0, 10),
      openIssuesByProduct,
      totalIssues: Object.values(issueSeverityBreakdown).reduce((a, b) => a + b, 0),
      totalOpenIssues: openIssuesByProduct.reduce((a, p) => a + p.openCount, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({ hasApiKey: !!key, apiKeyPreview: key ? `${key.slice(0, 8)}...${key.slice(-4)}` : null });
});

app.post('/api/settings', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'apiKey required' });
    const trimmed = apiKey.trim();
    let envContent = existsSync(ENV_FILE) ? await readFile(ENV_FILE, 'utf8') : '';
    if (/^ANTHROPIC_API_KEY=.*/m.test(envContent)) {
      envContent = envContent.replace(/^ANTHROPIC_API_KEY=.*/m, `ANTHROPIC_API_KEY=${trimmed}`);
    } else {
      envContent = envContent.trimEnd() + `\nANTHROPIC_API_KEY=${trimmed}\n`;
    }
    await writeFile(ENV_FILE, envContent);
    process.env.ANTHROPIC_API_KEY = trimmed;
    res.json({ success: true, apiKeyPreview: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}` });
  } catch { res.status(500).json({ error: 'Failed to save API key' }); }
});

// ── Comparisons ───────────────────────────────────────────────────────────────

app.get('/api/comparisons', async (req, res) => {
  try {
    const all = await comparisons.getAll();
    const { catalogId } = req.query;
    res.json(catalogId ? all.filter(c => c.products?.some(p => p.catalogId === catalogId)) : all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/comparisons/:id', async (req, res) => {
  try {
    const comp = await comparisons.getById(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Not found' });
    res.json(comp);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.post('/api/comparisons', async (req, res) => {
  try {
    const id = uuidv4();
    const comp = { id, createdAt: new Date().toISOString(), ...req.body };
    await comparisons.create(comp);
    res.status(201).json(comp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/comparisons/:id', async (req, res) => {
  try {
    const updated = await comparisons.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.delete('/api/comparisons/:id', async (req, res) => {
  try {
    const ok = await comparisons.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// ── Static frontend (production only — must be after all API routes) ───────────

const DIST_DIR = join(__dirname, 'dist');
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => res.sendFile(join(DIST_DIR, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${process.env.DATABASE_URL ? 'postgres' : 'file'} mode)`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY not set. AI features unavailable.');
});
