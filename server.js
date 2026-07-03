const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TFL = 'https://api.tfl.gov.uk';
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const cache = new Map();

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ fleet: [], sightings: [], boards: [] }, null, 2));
}
function readStore() { ensureStore(); return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
function writeStore(data) { ensureStore(); fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2)); }
function send(res, code, data, type = 'application/json') { res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }); res.end(type === 'application/json' ? JSON.stringify(data) : data); }
function body(req) { return new Promise(resolve => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d ? JSON.parse(d) : {})); }); }
async function proxyTfL(req, res) {
  const apiPath = decodeURIComponent(req.url.replace('/api/tfl', ''));
  const ttl = apiPath.includes('/Arrivals') ? 25000 : apiPath.includes('/Status') ? 120000 : 600000;
  const cached = cache.get(apiPath);
  if (cached && Date.now() - cached.t < ttl) return send(res, 200, cached.data);
  try {
    const r = await fetch(TFL + apiPath);
    const data = await r.json();
    cache.set(apiPath, { t: Date.now(), data });
    send(res, r.status, data);
  } catch (e) { send(res, 502, { error: 'TfL request failed' }); }
}
function staticFile(req, res) {
  const clean = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(__dirname, clean);
  if (!file.startsWith(__dirname) || !fs.existsSync(file)) return send(res, 404, 'Not found', 'text/plain');
  const ext = path.extname(file).slice(1);
  const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', json: 'application/json' };
  send(res, 200, fs.readFileSync(file), types[ext] || 'text/plain');
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.url.startsWith('/api/tfl/')) return proxyTfL(req, res);
  if (req.url === '/api/store' && req.method === 'GET') return send(res, 200, readStore());
  if (req.url === '/api/store' && req.method === 'POST') { const data = await body(req); writeStore(data); return send(res, 200, { ok: true }); }
  if (req.url === '/api/fleet' && req.method === 'GET') return send(res, 200, readStore().fleet || []);
  if (req.url === '/api/sightings' && req.method === 'GET') return send(res, 200, readStore().sightings || []);
  return staticFile(req, res);
});
server.listen(PORT, () => console.log(`RouteFlow London running on http://localhost:${PORT}`));
