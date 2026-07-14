// StackMax persistence — the server becomes the source of truth so a group
// can hold >1 member. Lightweight JSON-file store (SQLite-class per contract §4).
// The API surface (server/index.js) is identical regardless of this backing store.
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.STACKMAX_DB || path.join(__dirname, '.data', 'stackmax.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function blank() {
  return { groups: {}, members: {}, entries: {}, feed: {}, uploads: {} };
}

function load() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return blank(); }
}

let db = load();

function persist() {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();

module.exports = {
  db,
  persist,
  id,
  now,
  reset() { db = blank(); Object.assign(module.exports.db, db); persist(); }
};
