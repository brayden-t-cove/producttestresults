import express from 'express';
import cors from 'cors';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { CSV_TEMPLATES } from './src/data/csvTemplates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const SESSIONS_DIR = join(__dirname, 'data', 'sessions');
const DEVICES_FILE = join(__dirname, 'data', 'devices.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure sessions dir exists
if (!existsSync(SESSIONS_DIR)) {
  await mkdir(SESSIONS_DIR, { recursive: true });
}
if (!existsSync(DEVICES_FILE)) {
  await writeFile(DEVICES_FILE, JSON.stringify([], null, 2));
}

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
    const { productId, productName, category, subcategory, firmware, notes, type } = req.body;
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
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'active',
      testCases: [],
      issues: [],
      verifications: [],
    };
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
    const total = session.testCases.length;

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. AI features will be unavailable.');
  }
});
