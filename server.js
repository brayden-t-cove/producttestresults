import express from 'express';
import cors from 'cors';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import multer from 'multer';
import { join, dirname } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { CSV_TEMPLATES } from './src/data/csvTemplates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
const app = express();
const PORT = 3001;
const ENV_FILE = join(__dirname, '.env');
const SESSIONS_DIR = join(__dirname, 'data', 'sessions');
const DEVICES_FILE = join(__dirname, 'data', 'devices.json');
const FIRMWARES_FILE = join(__dirname, 'data', 'firmwares.json');
const CATALOG_FILE = join(__dirname, 'data', 'catalog.json');
const SPEC_SCHEMA_FILE = join(__dirname, 'data', 'specSchema.json');
const CERT_SCHEMA_FILE = join(__dirname, 'data', 'certSchema.json');
const IMAGES_DIR = join(__dirname, 'data', 'images');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/images', express.static(IMAGES_DIR));

// Ensure sessions dir exists
if (!existsSync(SESSIONS_DIR)) {
  await mkdir(SESSIONS_DIR, { recursive: true });
}
if (!existsSync(IMAGES_DIR)) {
  await mkdir(IMAGES_DIR, { recursive: true });
}
if (!existsSync(DEVICES_FILE)) {
  await writeFile(DEVICES_FILE, JSON.stringify([], null, 2));
}
if (!existsSync(FIRMWARES_FILE)) {
  await writeFile(FIRMWARES_FILE, JSON.stringify([], null, 2));
}
if (!existsSync(CATALOG_FILE)) {
  await writeFile(CATALOG_FILE, JSON.stringify([], null, 2));
}
if (!existsSync(SPEC_SCHEMA_FILE)) {
  const { SPEC_SCHEMA } = await import('./src/data/productSpecs.js');
  await writeFile(SPEC_SCHEMA_FILE, JSON.stringify(SPEC_SCHEMA, null, 2));
}
if (!existsSync(CERT_SCHEMA_FILE)) {
  const { CERT_SCHEMA } = await import('./src/data/certSchema.js');
  await writeFile(CERT_SCHEMA_FILE, JSON.stringify(CERT_SCHEMA, null, 2));
}

// GET /api/firmwares?catalogId=xxx (or ?deviceName=xxx for backward compat)
app.get('/api/firmwares', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(FIRMWARES_FILE, 'utf8'));
    const { catalogId, deviceName } = req.query;
    if (catalogId) {
      res.json(data.filter(f => f.catalogId === catalogId || f.deviceName === catalogId));
    } else if (deviceName) {
      res.json(data.filter(f => f.deviceName === deviceName || f.catalogId === deviceName));
    } else {
      res.json(data);
    }
  } catch {
    res.json([]);
  }
});

// POST /api/firmwares
app.post('/api/firmwares', async (req, res) => {
  try {
    const { catalogId, deviceName, version } = req.body;
    const key = catalogId || deviceName;
    if (!key || !version) return res.status(400).json({ error: 'catalogId (or deviceName) and version required' });
    const data = JSON.parse(await readFile(FIRMWARES_FILE, 'utf8'));
    const existing = data.find(f => (f.catalogId === key || f.deviceName === key) && f.version === version);
    if (existing) return res.json(existing);
    const entry = { id: uuidv4(), catalogId: catalogId || null, deviceName: deviceName || key, version: version.trim() };
    data.push(entry);
    await writeFile(FIRMWARES_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to save firmware' });
  }
});

// ── Debug / health endpoint ───────────────────────────────────────────────────

app.get('/api/debug', async (req, res) => {
  const checks = {};
  try {
    const raw = await readFile(CATALOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    checks.catalogFile = { ok: true, entries: parsed.length, path: CATALOG_FILE };
  } catch (e) {
    checks.catalogFile = { ok: false, error: e.message, path: CATALOG_FILE };
  }
  try {
    await readFile(FIRMWARES_FILE, 'utf8');
    checks.firmwaresFile = { ok: true };
  } catch (e) {
    checks.firmwaresFile = { ok: false, error: e.message };
  }
  checks.server = { ok: true, port: PORT, uptime: Math.round(process.uptime()) + 's', nodeVersion: process.version };
  checks.env = { anthropicKeySet: !!process.env.ANTHROPIC_API_KEY };
  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 500).json({ status: allOk ? 'ok' : 'degraded', checks });
});

// GET /api/spec-schema
app.get('/api/spec-schema', async (req, res) => {
  try {
    const data = await readFile(SPEC_SCHEMA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Schema not found' });
  }
});

// PUT /api/spec-schema
app.put('/api/spec-schema', async (req, res) => {
  try {
    await writeFile(SPEC_SCHEMA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save schema', detail: e.message });
  }
});

// GET /api/cert-schema
app.get('/api/cert-schema', async (req, res) => {
  try {
    const data = await readFile(CERT_SCHEMA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Cert schema not found' });
  }
});

// PUT /api/cert-schema
app.put('/api/cert-schema', async (req, res) => {
  try {
    await writeFile(CERT_SCHEMA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save cert schema', detail: e.message });
  }
});

// ── Catalog endpoints ─────────────────────────────────────────────────────────

// GET /api/catalog
app.get('/api/catalog', async (req, res) => {
  try {
    const data = await readFile(CATALOG_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

// GET /api/catalog/export/csv
app.get('/api/catalog/export/csv', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    const headers = ['id','name','manufacturer','modelNumber','version','category','createdAt'];
    const rows = data.map(p => headers.map(h => {
      const v = p[h] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="catalog-export.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/catalog/export/json
app.get('/api/catalog/export/json', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="catalog-export.json"');
    res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

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

// POST /api/catalog/:id/image
app.post('/api/catalog/:id/image', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      // Clean up any partial file multer may have written
      if (req.file) unlink(req.file.path).catch(() => {});
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Image too large — maximum size is 5 MB' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
      const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
      const idx = data.findIndex(e => e.id === req.params.id);
      if (idx === -1) {
        unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: 'Not found' });
      }
      // Delete old image if present
      if (data[idx].imageUrl) {
        const oldPath = join(IMAGES_DIR, data[idx].imageUrl.split('/').pop());
        unlink(oldPath).catch(() => {});
      }
      data[idx].imageUrl = `/api/images/${req.file.filename}`;
      await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2));
      res.json({ imageUrl: data[idx].imageUrl });
    } catch (e) {
      if (req.file) unlink(req.file.path).catch(() => {});
      res.status(500).json({ error: 'Failed to upload image', detail: e.message });
    }
  });
});

// DELETE /api/catalog/:id/image
app.delete('/api/catalog/:id/image', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    const idx = data.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (data[idx].imageUrl) {
      const oldPath = join(IMAGES_DIR, data[idx].imageUrl.split('/').pop());
      unlink(oldPath).catch(() => {});
      data[idx].imageUrl = null;
      await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2));
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// GET /api/catalog/:id
app.get('/api/catalog/:id', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    const entry = data.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to read catalog' });
  }
});

// POST /api/catalog
app.post('/api/catalog', async (req, res) => {
  try {
    const { name, manufacturer, modelNumber, version, status, category, capabilities, appConfigs, specs, certifications, compatibleWith, entity, type, hubConnectionType } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required', code: 'CAT_001_MISSING_FIELDS' });
    let data;
    try {
      data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read catalog file', code: 'CAT_002_READ_ERROR', detail: e.message });
    }
    const entry = {
      id: uuidv4(),
      name: name.trim(),
      manufacturer: (manufacturer || '').trim(),
      modelNumber: (modelNumber || '').trim(),
      version: (version || '').trim(),
      status: status || 'active',
      category,
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
    data.push(entry);
    try {
      await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to write catalog file', code: 'CAT_003_WRITE_ERROR', detail: e.message });
    }
    res.status(201).json(entry);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error creating catalog entry', code: 'CAT_004_UNKNOWN', detail: e.message });
  }
});

// PUT /api/catalog/:id
app.put('/api/catalog/:id', async (req, res) => {
  try {
    let data;
    try {
      data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read catalog file', code: 'CAT_005_READ_ERROR', detail: e.message });
    }
    const idx = data.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found', code: 'CAT_006_NOT_FOUND' });
    data[idx] = { ...data[idx], ...req.body, id: data[idx].id, createdAt: data[idx].createdAt };
    try {
      await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to write catalog file', code: 'CAT_007_WRITE_ERROR', detail: e.message });
    }
    res.json(data[idx]);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected error updating catalog entry', code: 'CAT_008_UNKNOWN', detail: e.message });
  }
});

// DELETE /api/catalog/:id
app.delete('/api/catalog/:id', async (req, res) => {
  try {
    const data = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
    const idx = data.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const [removed] = data.splice(idx, 1);
    await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2));
    res.json(removed);
  } catch {
    res.status(500).json({ error: 'Failed to delete catalog entry' });
  }
});

// GET /api/devices
app.get('/api/devices', async (req, res) => {
  try {
    const data = await readFile(DEVICES_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

// POST /api/devices
app.post('/api/devices', async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const data = JSON.parse(await readFile(DEVICES_FILE, 'utf8'));
    const existing = data.find(d => d.name.toLowerCase() === name.toLowerCase() && d.category === category);
    if (existing) return res.json(existing);
    const device = { id: uuidv4(), name: name.trim(), category };
    data.push(device);
    await writeFile(DEVICES_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save device' });
  }
});

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// GET /api/sessions - list all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const files = await readdir(SESSIONS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const sessions = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8');
        const session = JSON.parse(raw);
        return {
          id: session.id,
          productName: session.productName,
          date: session.createdAt,
          status: session.status,
          issueCount: (session.issues || []).length,
          testPlan: session.testPlan || 'production',
          catalogId: session.catalogId || session.productId || null,
          appConfigName: session.appConfigName || null,
          products: session.products ? session.products.map(p => ({ catalogId: p.catalogId })) : null,
          testCases: session.testCases || [],
        };
      })
    );
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:id
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const filePath = join(SESSIONS_DIR, `${req.params.id}.json`);
    if (!existsSync(filePath)) return res.status(404).json({ error: 'Session not found' });
    const raw = await readFile(filePath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read session' });
  }
});

// POST /api/sessions - create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { productId, productName, category, subcategory, firmware, notes, type, testPlan,
            products, metrics, results, autoPulled,
            platform, testEnvironment, categories, overallSummary,
            catalogId } = req.body;
    const id = uuidv4();
    const session = {
      id,
      productId,
      productName,
      category,
      subcategory: subcategory || null,
      firmware: firmware || '',
      sessionNotes: notes || '',
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
    await writeFile(join(SESSIONS_DIR, `${id}.json`), JSON.stringify(session, null, 2));
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - update session
app.put('/api/sessions/:id', async (req, res) => {
  try {
    const filePath = join(SESSIONS_DIR, `${req.params.id}.json`);
    if (!existsSync(filePath)) return res.status(404).json({ error: 'Session not found' });
    const raw = await readFile(filePath, 'utf-8');
    const existing = JSON.parse(raw);
    const updated = { ...existing, ...req.body, id: existing.id };
    await writeFile(filePath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// POST /api/sessions/:id/ai-summary — generate AI summary for exploratory sessions
app.post('/api/sessions/:id/ai-summary', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set.' });
  try {
    const filePath = join(SESSIONS_DIR, `${req.params.id}.json`);
    if (!existsSync(filePath)) return res.status(404).json({ error: 'Session not found' });
    const session = JSON.parse(await readFile(filePath, 'utf-8'));

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
      messages: [{
        role: 'user',
        content: `Write a brief summary of this exploratory test session.\n\nProduct: ${session.productName}\nPlatform: ${session.platform || 'N/A'}\nDate: ${session.createdAt}\n\n${catSummaries}\n\nProvide 3-5 sentences covering overall findings, notable issues, and highlights.`,
      }],
    });

    const aiSummary = message.content[0].text.trim();
    const updated = { ...session, aiSummary };
    await writeFile(filePath, JSON.stringify(updated, null, 2));
    res.json({ aiSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI summary failed', details: err.message });
  }
});

// POST /api/ai/populate-tests
app.post('/api/ai/populate-tests', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Please add it to your .env file.' });

  const { productName, category, subcategory, firmware } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a QA engineer specializing in security hardware testing for smart home products.
You generate structured, thorough test cases for QA testing sessions.
Always respond with valid JSON only, no markdown code blocks, no explanation.`,
      messages: [
        {
          role: 'user',
          content: `Generate a comprehensive list of test cases for QA testing the following product:
Product: ${productName}
Category: ${category}
${subcategory ? `Subcategory: ${subcategory}` : ''}
${firmware ? `Firmware Version: ${firmware}` : ''}

Return a JSON array of test case objects. Each object must have:
- id: a unique UUID string
- title: short test case title (5-10 words)
- description: what to do step by step (2-4 sentences)
- expected: what the expected result should be (1-2 sentences)
- status: "pending"
- notes: ""
- aiGenerated: true

Tailor the test cases specifically for this product and its firmware context. Include 12-18 test cases covering the most important aspects for this product category.`,
        },
      ],
    });

    let text = message.content[0].text.trim();
    // Strip markdown code block if present
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    const testCases = JSON.parse(text);
    res.json({ testCases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

// POST /api/ai/suggest-issue
app.post('/api/ai/suggest-issue', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Please add it to your .env file.' });

  const { description, productName, category } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a QA engineer specializing in security hardware testing.
Analyze bug descriptions and classify them accurately.
Always respond with valid JSON only, no markdown, no explanation.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this issue description for a QA test of "${productName}" (category: ${category}):

"${description}"

Return a JSON object with:
- severity: one of "Critical", "High", "Medium", "Low"
- issueCategory: one of "Connectivity", "UI/UX", "Performance", "Security", "Crash/ANR", "False Positive", "False Negative", "Setup/Pairing", "Firmware", "Audio/Video", "Hardware"
- title: a clean, concise issue title (5-10 words, imperative/noun form, no punctuation at end)`,
        },
      ],
    });

    let text = message.content[0].text.trim();
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

// POST /api/ai/write-repro
app.post('/api/ai/write-repro', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Please add it to your .env file.' });

  const { description, productName, productCategory, firmwareVersion } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a QA engineer specializing in security hardware testing for smart home products.
Convert rough bug notes into structured, professional reproduction steps.
Always respond with valid JSON only, no markdown code blocks, no explanation.`,
      messages: [
        {
          role: 'user',
          content: `Turn these rough notes into structured reproduction steps for a bug in "${productName}" (${productCategory}, firmware: ${firmwareVersion || 'unknown'}):

"${description}"

Return a JSON object with:
- reproSteps: a markdown numbered list of clear, specific steps to reproduce the issue
- preconditions: a short paragraph describing what must be set up before starting the repro steps`,
        },
      ],
    });

    let text = message.content[0].text.trim();
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

// POST /api/ai/summarize
app.post('/api/ai/summarize', async (req, res) => {
  const client = getAnthropicClient();
  if (!client) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Please add it to your .env file.' });

  const { session } = req.body;
  try {
    const passCount = session.testCases.filter(t => t.status === 'pass').length;
    const failCount = session.testCases.filter(t => t.status === 'fail').length;
    const skipCount = session.testCases.filter(t => t.status === 'skip').length;
    const total = passCount + failCount; // skip/na excluded from pass rate

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a senior QA engineer writing professional test session summaries for security hardware products.
Write in a clear, professional tone. Use markdown formatting.`,
      messages: [
        {
          role: 'user',
          content: `Write a QA session summary for the following test session:

Product: ${session.productName}
Firmware: ${session.firmware || 'N/A'}
Date: ${session.createdAt}
Session Notes: ${session.sessionNotes || 'None'}

Test Results:
- Total: ${total}
- Passed: ${passCount}
- Failed: ${failCount}
- Skipped: ${skipCount}
- Pass Rate: ${total > 0 ? Math.round((passCount / total) * 100) : 0}%

Failed Tests:
${session.testCases.filter(t => t.status === 'fail').map(t => `- ${t.title}: ${t.notes || 'No notes'}`).join('\n') || 'None'}

Issues Logged (${session.issues.length}):
${session.issues.map(i => `- [${i.severity}] ${i.title} (${i.issueCategory})`).join('\n') || 'None'}

Write a professional summary with sections: Overview, Test Results, Key Issues, Recommendations. Use markdown headings.`,
        },
      ],
    });

    res.json({ summary: message.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI call failed', details: err.message });
  }
});

// GET /api/csv-template/:type
app.get('/api/csv-template/:type', (req, res) => {
  const { type } = req.params;
  const template = CSV_TEMPLATES[type];
  if (!template) return res.status(400).json({ error: `Unknown type: ${type}` });

  function escapeField(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const lines = [
    template.headers.join(','),
    ...template.exampleRows.map(row => row.map(escapeField).join(',')),
  ];
  const csv = lines.join('\r\n') + '\r\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="template-${type}.csv"`);
  res.send(csv);
});

// Simple CSV parser that handles quoted fields
function parseCsv(text) {
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let val = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            val += line[i++];
          }
        }
        fields.push(val);
        if (line[i] === ',') i++; // skip comma
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          fields.push(line.slice(i));
          break;
        } else {
          fields.push(line.slice(i, end));
          i = end + 1;
        }
      }
    }
    rows.push(fields);
  }
  return rows;
}

// POST /api/csv-import
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
    const issues = dataRows.map(row => {
      const obj = { id: uuidv4() };
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
    return res.json({ issues });
  } else {
    const testCases = dataRows.map(row => {
      const obj = { id: uuidv4(), status: 'pending' };
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
    return res.json({ testCases });
  }
});

// GET /api/issues - flat list of all issues across all sessions
app.get('/api/issues', async (req, res) => {
  const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  try {
    const files = await readdir(SESSIONS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const allIssues = [];
    for (const file of jsonFiles) {
      const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8');
      const session = JSON.parse(raw);
      const issues = session.issues || [];
      const verifications = session.verifications || [];
      for (const issue of issues) {
        // Derive status from verifications
        const issueVerifs = verifications.filter(v => v.issueId === issue.id);
        let status = 'Open';
        if (issueVerifs.length > 0) {
          const latestVerif = issueVerifs[issueVerifs.length - 1];
          if (latestVerif.result === 'Fixed' || latestVerif.result === 'fixed-verified') status = 'Fixed';
          else if (latestVerif.result === 'Cannot Reproduce' || latestVerif.result === 'cannot-reproduce') status = 'Cannot Reproduce';
        }
        allIssues.push({
          ...issue,
          sessionId: session.id,
          productName: session.productName,
          sessionDate: session.createdAt,
          firmware: session.firmware || '',
          verificationHistory: issueVerifs,
          derivedStatus: status,
        });
      }
    }
    allIssues.sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(b.sessionDate) - new Date(a.sessionDate);
    });
    res.json(allIssues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load issues' });
  }
});

// GET /api/analytics - pre-computed analytics across all sessions
app.get('/api/analytics', async (req, res) => {
  try {
    const files = await readdir(SESSIONS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const sessions = await Promise.all(
      jsonFiles.map(async f => JSON.parse(await readFile(join(SESSIONS_DIR, f), 'utf-8')))
    );

    let totalTests = 0, passCount = 0, failCount = 0, skipCount = 0, naCount = 0;
    const productMap = {};
    const testFailMap = {};
    const issueSeverityBreakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const issueCategoryBreakdown = {};

    for (const session of sessions) {
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

      const sTotal = sPass + sFail; // skip/na excluded from pass rate denominator
      const sPassRate = sTotal > 0 ? sPass / sTotal : 0;

      const pName = session.productName || 'Unknown';
      if (!productMap[pName]) {
        productMap[pName] = {
          productName: pName,
          catalogId: session.productId || null,
          sessionCount: 0,
          totalPass: 0, totalFail: 0, totalSkip: 0, totalNa: 0,
          sessions: [],
          openIssues: 0,
        };
      }
      const pm = productMap[pName];
      pm.sessionCount++;
      pm.totalPass += sPass; pm.totalFail += sFail; pm.totalSkip += sSkip; pm.totalNa += sNa;
      pm.sessions.push({
        sessionId: session.id,
        date: session.createdAt,
        firmware: session.firmware || '',
        passRate: sPassRate,
        passCount: sPass, failCount: sFail, skipCount: sSkip, naCount: sNa,
      });

      // Issues
      const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      for (const issue of issues) {
        const sev = issue.severity;
        if (sev in issueSeverityBreakdown) issueSeverityBreakdown[sev]++;
        const cat = issue.issueCategory || issue.category || 'Other';
        issueCategoryBreakdown[cat] = (issueCategoryBreakdown[cat] || 0) + 1;

        // Check if open
        const issueVerifs = verifications.filter(v => v.issueId === issue.id);
        let isOpen = true;
        if (issueVerifs.length > 0) {
          const latest = issueVerifs[issueVerifs.length - 1];
          if (latest.result === 'Fixed' || latest.result === 'fixed-verified' ||
              latest.result === 'Cannot Reproduce' || latest.result === 'cannot-reproduce') {
            isOpen = false;
          }
        }
        if (isOpen) pm.openIssues++;
      }
    }

    // Build productStats
    const productStats = Object.values(productMap).map(pm => {
      const tot = pm.totalPass + pm.totalFail; // skip/na excluded
      return {
        productName: pm.productName,
        catalogId: pm.catalogId,
        sessionCount: pm.sessionCount,
        passRate: tot > 0 ? pm.totalPass / tot : 0,
        sessions: pm.sessions.sort((a, b) => new Date(a.date) - new Date(b.date)),
        openIssues: pm.openIssues,
      };
    }).sort((a, b) => a.passRate - b.passRate);

    // Top failing tests (min 1 fail, top 10 by failCount)
    const topFailingTests = Object.values(testFailMap)
      .filter(t => t.failCount >= 1)
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10);

    // Open issues by product
    const openIssuesByProduct = Object.values(productMap).map(pm => {
      // Count by severity
      let crit = 0, high = 0, medLow = 0, oldestDays = 0;
      for (const session of sessions.filter(s => s.productName === pm.productName)) {
        for (const issue of (session.issues || [])) {
          const issueVerifs = (session.verifications || []).filter(v => v.issueId === issue.id);
          let isOpen = true;
          if (issueVerifs.length > 0) {
            const latest = issueVerifs[issueVerifs.length - 1];
            if (latest.result === 'Fixed' || latest.result === 'fixed-verified' ||
                latest.result === 'Cannot Reproduce' || latest.result === 'cannot-reproduce') {
              isOpen = false;
            }
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
      return {
        productName: pm.productName,
        openCount: pm.openIssues,
        critical: crit,
        high,
        medLow,
        oldestDays,
      };
    }).filter(p => p.openCount > 0).sort((a, b) => b.openCount - a.openCount);

    res.json({
      overallStats: {
        sessionCount: sessions.length,
        totalTests,
        passCount,
        failCount,
        skipCount,
        naCount,
        overallPassRate: (passCount + failCount) > 0 ? passCount / (passCount + failCount) : 0,
      },
      productStats,
      issueSeverityBreakdown,
      issueCategoryBreakdown,
      topFailingTests,
      openIssuesByProduct,
      totalIssues: Object.values(issueSeverityBreakdown).reduce((a, b) => a + b, 0),
      totalOpenIssues: openIssuesByProduct.reduce((a, p) => a + p.openCount, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// GET /api/settings - return masked API key status
app.get('/api/settings', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({
    hasApiKey: !!key,
    apiKeyPreview: key ? `${key.slice(0, 8)}...${key.slice(-4)}` : null,
  });
});

// POST /api/settings - save API key to .env and hot-reload
app.post('/api/settings', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'apiKey required' });
    const trimmed = apiKey.trim();

    // Read existing .env or start fresh
    let envContent = '';
    if (existsSync(ENV_FILE)) {
      envContent = await readFile(ENV_FILE, 'utf8');
    }

    // Replace or append ANTHROPIC_API_KEY line
    if (/^ANTHROPIC_API_KEY=.*/m.test(envContent)) {
      envContent = envContent.replace(/^ANTHROPIC_API_KEY=.*/m, `ANTHROPIC_API_KEY=${trimmed}`);
    } else {
      envContent = envContent.trimEnd() + `\nANTHROPIC_API_KEY=${trimmed}\n`;
    }

    await writeFile(ENV_FILE, envContent);
    process.env.ANTHROPIC_API_KEY = trimmed; // hot-reload without restart
    res.json({ success: true, apiKeyPreview: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. AI features will be unavailable.');
  }
});
