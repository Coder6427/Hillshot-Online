const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const MAX_PARTY = 5;
const STALE_MS = 60000;
const users = new Map();
const parties = new Map();

function cleanName(name) {
  return String(name || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 18);
}
function code() {
  let c;
  do { c = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3) + '-' + crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3); }
  while (parties.has(c));
  return c;
}
function body(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
  });
}
function json(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
  res.end(JSON.stringify(data));
}
function publicParty(p) {
  return p && { code:p.code, members:p.members, max:MAX_PARTY, game:p.game || null };
}
function touch(p, name) {
  if (!p || !name) return;
  p.seen[name] = Date.now();
  if (!p.members.includes(name) && p.members.length < MAX_PARTY) p.members.push(name);
}
function cleanup() {
  const now = Date.now();
  for (const [c, p] of parties) {
    p.members = p.members.filter(n => now - (p.seen[n] || 0) < STALE_MS);
    if (!p.members.length) parties.delete(c);
  }
}
function serve(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  let file = u.pathname === '/' ? 'worms-like-game.html' : decodeURIComponent(u.pathname.slice(1));
  file = path.normalize(file).replace(/^([.][.][\/])+/, '');
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type': path.extname(full) === '.html' ? 'text/html' : 'text/plain'});
  fs.createReadStream(full).pipe(res);
}

setInterval(cleanup, 15000).unref();

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {ok:true});
  cleanup();
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/api/health') return json(res, 200, {ok:true, parties:parties.size, users:users.size, maxParty:MAX_PARTY});
  if (req.method === 'POST' && u.pathname === '/api/account') {
    const b = await body(req), name = cleanName(b.name);
    if (!name) return json(res, 400, {error:'name required'});
    users.set(name, {name, seen:Date.now()});
    return json(res, 200, {user:{name}});
  }
  if (req.method === 'POST' && u.pathname === '/api/party/create') {
    const b = await body(req), name = cleanName(b.name);
    if (!name) return json(res, 400, {error:'name required'});
    const c = code(), p = {code:c, members:[], seen:{}, game:null};
    parties.set(c, p); touch(p, name);
    return json(res, 200, {party:publicParty(p)});
  }
  if (req.method === 'POST' && u.pathname === '/api/party/join') {
    const b = await body(req), name = cleanName(b.name), c = String(b.code || '').toUpperCase();
    const p = parties.get(c);
    if (!name || !p) return json(res, 404, {error:'party not found'});
    if (!p.members.includes(name) && p.members.length >= MAX_PARTY) return json(res, 400, {error:'party full'});
    touch(p, name);
    return json(res, 200, {party:publicParty(p)});
  }
  if (req.method === 'GET' && u.pathname === '/api/party') {
    const c = String(u.searchParams.get('code') || '').toUpperCase(), name = cleanName(u.searchParams.get('name'));
    const p = parties.get(c);
    if (p && name) touch(p, name);
    return json(res, 200, {party:publicParty(p)});
  }
  if (req.method === 'POST' && u.pathname === '/api/game/start') {
    const b = await body(req), c = String(b.code || '').toUpperCase(), name = cleanName(b.name), p = parties.get(c);
    if (!p || !p.members.includes(name)) return json(res, 404, {error:'party not found'});
    p.game = {id:crypto.randomBytes(4).toString('hex'), seed:Number(b.seed || Date.now()), config:b.config || {}, actions:[]};
    touch(p, name);
    return json(res, 200, {party:publicParty(p)});
  }
  if (req.method === 'POST' && u.pathname === '/api/game/action') {
    const b = await body(req), c = String(b.code || '').toUpperCase(), name = cleanName(b.name), p = parties.get(c);
    if (!p || !p.game || !p.members.includes(name)) return json(res, 404, {error:'game not found'});
    const action = b.action || {};
    action.id = p.game.actions.length + 1;
    action.name = name;
    p.game.actions.push(action);
    touch(p, name);
    return json(res, 200, action);
  }
  serve(req, res);
}).listen(PORT, '0.0.0.0', () => console.log(`Hillshot server on http://localhost:${PORT} - max party ${MAX_PARTY}`));
