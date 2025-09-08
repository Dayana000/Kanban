import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

const ALLOWED_STATUSES = ['Creado', 'En progreso', 'Bloqueada', 'Finalizado', 'Cancelada'];

app.use(cors());
app.use(express.json());

// --- utilidades de "BD" JSON ---
async function ensureDB() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    const initial = { tasks: [], responsibles: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  }
}
async function loadDB() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}
async function saveDB(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
async function logEvent(type, payload) {
  if (!N8N_WEBHOOK_URL) return;
  try {
    await axios.post(N8N_WEBHOOK_URL, {
      source: 'backend',
      type,
      payload,
      at: new Date().toISOString(),
    }, { timeout: 3000 });
  } catch (err) {
    console.warn('[n8n] no se pudo notificar:', err?.message || err);
  }
}

// --- health & catálogos ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/statuses', (req, res) => {
  res.json(ALLOWED_STATUSES);
});

// --- RESPONSIBLES ---
app.get('/responsibles', async (req, res) => {
  const db = await loadDB();
  res.json(db.responsibles);
});
app.post('/responsibles', async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name es requerido' });
  }
  const db = await loadDB();
  const now = new Date().toISOString();
  const responsible = { id: uuid(), name, email: email || null, createdAt: now, updatedAt: now };
  db.responsibles.push(responsible);
  await saveDB(db);
  await logEvent('RESPONSIBLE_CREATED', responsible);
  res.status(201).json(responsible);
});
app.delete('/responsibles/:id', async (req, res) => {
  const { id } = req.params;
  const db = await loadDB();
  const before = db.responsibles.length;
  db.responsibles = db.responsibles.filter(r => r.id !== id);
  if (db.responsibles.length === before) {
    return res.status(404).json({ error: 'responsable no encontrado' });
  }
  await saveDB(db);
  await logEvent('RESPONSIBLE_DELETED', { id });
  res.status(204).send();
});

// --- TASKS ---
app.get('/tasks', async (req, res) => {
  const db = await loadDB();
  res.json(db.tasks);
});
app.get('/tasks/:id', async (req, res) => {
  const db = await loadDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'tarea no encontrada' });
  res.json(task);
});
app.post('/tasks', async (req, res) => {
  const { title, description, status, assigneeId } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title es requerido' });
  }
  const s = status && ALLOWED_STATUSES.includes(status) ? status : 'Creado';
  const now = new Date().toISOString();
  const task = {
    id: uuid(),
    title,
    description: description || '',
    status: s,
    assigneeId: assigneeId || null,
    createdAt: now,
    updatedAt: now,
  };
  const db = await loadDB();
  db.tasks.push(task);
  await saveDB(db);
  await logEvent('TASK_CREATED', task);
  res.status(201).json(task);
});
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, assigneeId } = req.body || {};
  const db = await loadDB();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'tarea no encontrada' });
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status inválido' });
  }
  const updated = {
    ...db.tasks[idx],
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(assigneeId !== undefined ? { assigneeId } : {}),
    updatedAt: new Date().toISOString(),
  };
  db.tasks[idx] = updated;
  await saveDB(db);
  await logEvent('TASK_UPDATED', updated);
  res.json(updated);
});
app.patch('/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status inválido' });
  }
  const db = await loadDB();
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'tarea no encontrada' });
  task.status = status;
  task.updatedAt = new Date().toISOString();
  await saveDB(db);
  await logEvent('TASK_STATUS_CHANGED', { id, status });
  res.json(task);
});
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const db = await loadDB();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter(t => t.id !== id);
  if (db.tasks.length === before) {
    return res.status(404).json({ error: 'tarea no encontrada' });
  }
  await saveDB(db);
  await logEvent('TASK_DELETED', { id });
  res.status(204).send();
});

// --- start ---
ensureDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
});