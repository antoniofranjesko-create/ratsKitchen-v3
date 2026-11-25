// ── LONG MODE (branch long-mode): this server runs long mode v1 by default ──
// Any of these can still be overridden with an environment variable.
const LONG_DEFAULTS = { V5: '1', V5TURN: 'side', IMM: '2', FOODINC: 'NONE', NOFOODCARDS: '1', HEALCOST: '3', THRESH: '10',
  STARSBYP: '7,6,5,4', KIND3: '1', FOODCARD: '1', FOODSTART: '2', FOODOPT: '1', PLAYCAP: '2', SHEET: '1', NERFS: '1', FIGHT: '1', FIGHTCH: '1', FIGHTN: '2', CUT: 'exterm,gambit', BLOCKSWAP: '1', CATFAT: '1', TARGETTIMING: '1', NOBOILER: '1', BACKDOOR: '1', NOHANDLIMIT: '1', MD2: '1' };
for (const [k, v] of Object.entries(LONG_DEFAULTS)) if (process.env[k] === undefined) process.env[k] = v;
// RAT'S KITCHEN v3 — SERVER
'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const E = require('./game/engine');
const A = require('./game/actions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(process.cwd(), 'public')));

const rooms = {}; // code -> {players:[{id,name,bot,socket,token,connected}], game, started, stepMode, botTimer}

// Pause between bot turns when bots auto-advance, so humans can follow the log.
const BOT_DELAY_MS = process.env.BOT_DELAY_MS ? +process.env.BOT_DELAY_MS : 1500;
// How long an empty lobby seat is kept for someone to reconnect before it's dropped.
const LOBBY_GRACE_MS = 30000;

// Lobby view, personalised: each socket is told its OWN id as "you".
function lobbyPlayers(room) {
  return room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, connected: p.bot || !!p.connected }));
}
function emitRoom(room) {
  for (const pl of room.players) {
    if (pl.socket) pl.socket.emit('room', { code: room.code, you: pl.id, stepMode: !!room.stepMode, playCap: room.playCap || +(process.env.PLAYCAP || 2), players: lobbyPlayers(room) });
  }
}

function setCap(room) {
  const n = room.playCap || +(process.env.PLAYCAP || 2);
  room.game.playCap = n;
  for (const p of room.game.players) p._playCap = n;
}
function code() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }

// project the game state for one viewer (their hand private, others' counts only)
function project(g, viewerId, room) {
  const seat = id => room && room.players.find(x => x.id === id);
  return {
    over: g.over, winner: g.winner, active: g.players[g.active] && g.players[g.active].id,
    turn: g.turn, threshold: E.THRESHOLD, maxStars: E.STARS, longMode: !!process.env.V5, v5turn: process.env.V5TURN || '', foodCards: !!process.env.FOODCARD, playCap: g.playCap || 2, closedCards: (g.closed || []).length, anyElim: g._firstElimTurn != null, log: g.log.slice(-40),
    lastPlayed: g.lastPlayed || null,
    awaitingStep: (() => {
      // a step is available when the game isn't over, it's a bot's turn coming up,
      // and no human currently needs to act
      if (g.over || !room || !room.stepMode) return false;   // bots auto-advance unless step mode is on
      const active = g.players[g.active];
      return active && active.bot;
    })(),
    stepMode: !!(room && room.stepMode),
    binsRats: g.bins.filter(b => b.rat).length + (process.env.V5 ? (g.alley || []).length : 0),   // long mode: the hidden top rat counts as part of the rat deck
    // THE ALLEY — 3 face-up rats
    alley: (process.env.V5 ? [] : (g.alley||[])).map(c => ({ id:c.rat.id, kind:c.rat.kind, name:c.rat.name,
      w:c.rat.w, heat:c.rat.heat, col:c.rat.col, prop:c.rat.prop,
      desc:(E.RATS[c.rat.kind]&&E.RATS[c.rat.kind].desc)||'' })),
    deckLeft: g.deck.length,
    // Market Day: the event flipped for the current round (null before any flip).
    market: g.market ? { event: g.market.event, name: g.market.name, desc: g.market.desc } : null,
    round: g._round || 0,
    lastDiscards: (g.discard||[]).slice(-3).map(b => ({ id: b.id, card: b.card, name: (E.CARDS[b.card]&&E.CARDS[b.card].name)||b.card })),
    players: g.players.map(p => ({
      id: p.id, name: p.name, bot: p.bot, alive: p.alive,
      connected: p.bot || !!(seat(p.id) && seat(p.id).connected),
      stars: p.stars, maxStars: p.maxStars || E.STARS, food: p.food || 0, weight: E.weight(p), heat: E.heat(p), count: p.rats.length,
      // rats are public (zones are public) — show kind + colour, no ids to others
      rats: p.rats.map(r => ({ id: r.id, kind: r.kind, name: r.name, w: r.w, heat: r.heat, col: r.col, cols: r.cols||null, prop: r.prop || r._muzzled || null, teeth: r.teeth || 0, muzzled: !!r._muzzled, diseased: !!r._dis, stink: !!r._stink, tagged: !!r._tag, desc: (E.RATS[r.kind]&&E.RATS[r.kind].desc)||"", shielded: !!r._catShield, chilli: !!r._chilliBy })),
      armed: p.armed ? { cap: p.armed.cap, ready: p.armed.age >= 1, cols: (p.id === viewerId ? (p.armed.cols||null) : null) } : null,
      boardup: p.boardup, territorial: p.territorial,
      // Layer 3: cards sitting ON this kitchen, with who played them (for the layered display)
      kitchenCards: (() => {
        const out = [];
        const nameOf = id => { const q = g.players.find(x => x.id === id); return q ? q.name : '?'; };
        if (p._inheritBy) out.push({ key: 'inherit', name: 'Inheritance', by: nameOf(p._inheritBy), cls: 'engine' });
        if (p._rattrap) out.push({ key: 'rattrap', name: 'Rat Trap', by: nameOf(p._rattrap), cls: 'engine' });
        if (p._pelicanBy) out.push({ key: 'pelican', name: 'Pelican Delivery', by: nameOf(p._pelicanBy), cls: 'engine' });
        if (p._terrBy) out.push({ key: 'territorial', name: 'Territorial', by: nameOf(p._terrBy), cls: 'control' });
        if (p.boardup > 0) out.push({ key: 'boardup', name: 'Board Up', by: p.name, cls: 'defence' });
        return out;
      })(),
      handCount: p.hand.length,
      hand: p.id === viewerId ? p.hand.map(c => {
        if (c.ratcard) return { id: c.id, card: 'ratato_rat', name: c.ratcard.name, cls: 'attack', desc: (E.RATS.ratato&&E.RATS.ratato.desc)||'', isRat: true, col: c.ratcard.col, w: c.ratcard.w, heat: c.ratcard.heat };
        const d = E.CARDS[c.card]||{}; return { id: c.id, card: c.card, name: d.name||c.card, sub: d.sub||null, cls: d.cls||'drawn', desc: d.desc||'', cols: c.cols||null };
      }) : null,
    })),
    you: viewerId,
    youActed: (() => {
      const me = g.players.find(x => x.id === viewerId);
      if (!me) return null;
      return { attack: !!me._actedAttack, build: !!me._actedBuild, playedRat: !!me._playedRat, stars: me.stars, hasArmed: !!me.armed,
        // long mode: what this turn's one choice has used so far
        v5: me._v5 ? { att: !!me._v5.att, def: !!me._v5.def, nb: !!me._v5.nb, total: me._v5.total || 0, drew: !!me._v5.drew } : null };
    })(),
    justDrew: (g.players[g.active] && g.players[g.active].id === viewerId) ? (g.justDrew || []) : [],
    yourActions: (() => {
      const p = g.players.find(x => x.id === viewerId);
      if (!p || !p.alive || g.over) return [];
      if (g.players[g.active].id !== viewerId) return [];
      return A.legalActions(g, p).map(a => ({
        type: a.type, id: a.id, label: a.label, disabled: !!a.disabled,   // hint-only entries (e.g. inspection not ready) render as text, not buttons
        needsTarget: !!a.needsTarget, needsRat: !!a.needsRat, needsColour: a.needsColour || 0,
        needsAlleyRat: !!a.needsAlleyRat && !process.env.V5,   // long mode: no visible alley, the rat comes off the face-down rat deck   // v4.1 fix: was never sent, so players could not choose an alley rat
        targets: a.targets || [],
      }));
    })(),
  };
}

function broadcast(room) {
  for (const pl of room.players) {
    if (pl.socket) pl.socket.emit('state', project(room.game, pl.id, room));
  }
}

// advance any bot turns until it's a human's turn or game over
// Advance the game to the next actor. If it's a HUMAN, start their turn and wait.
// If it's a BOT, start+play+end its turn, then STOP and wait for the human to step.
function advance(room) {
  const g = room.game; if (!g) return;
  clearTimeout(room.botTimer); room.botTimer = null;
  let guard = 0;
  while (!g.over && guard++ < 5000) {
    const actor = g.players[g.active];
    A.startTurn(g);
    if (g.over) break;
    if (!actor.bot) { broadcast(room); return; }   // human's turn — wait for input
    // bot: play its whole turn
    A.botTurn(g);
    A.endTurn(g);
    if (g.over) break;
    // CRITICAL: endTurn advanced the active player. If the next actor is a human,
    // their turn must be STARTED here (draw, reset acted-flags, age armed inspections)
    // before we hand control back — otherwise they get no draw, stale flags, and
    // their armed inspection never becomes ready to fire.
    if (!g.players[g.active].bot) {
      A.startTurn(g);
      broadcast(room);
      return;
    }
    broadcast(room);
    // next actor is another bot: wait for "Next player" in step mode,
    // otherwise play it after a short pause so humans can follow along
    scheduleBot(room);
    return;
  }
  if (!g.over && guard >= 5000) E.logAdd(g, 'Turn limit reached — please report.');
  broadcast(room);
}
function scheduleBot(room) {
  const g = room.game;
  clearTimeout(room.botTimer); room.botTimer = null;
  if (!g || g.over || room.stepMode) return;
  room.botTimer = setTimeout(() => { if (room.game === g && !g.over) advance(room); }, BOT_DELAY_MS);
}
// Hand control onward after a human ends their turn (or the game starts).
function runBots(room) {
  const g = room.game; if (!g || g.over) return;
  if (g.players[g.active].bot) {
    if (room.stepMode) { broadcast(room); return; }   // wait for "Next player"
    broadcast(room); scheduleBot(room); return;      // short pause, then the bot plays
  }
  advance(room);                                     // a human is next: start their turn
}

io.on('connection', (socket) => {
  let myRoom = null, myId = null;

  // Re-attach this socket to an existing seat (refresh, phone sleep, network drop).
  function attach(room, pl) {
    clearTimeout(pl.graceTimer); pl.graceTimer = null;
    pl.socket = socket; pl.connected = true;
    myId = pl.id; myRoom = room.code;
    socket.join(room.code);
    emitRoom(room);
    if (room.started && room.game) {
      socket.emit('begin', {});
      broadcast(room);
    }
  }

  socket.on('create', ({ name, token }) => {
    const c = code();
    myId = E.rid();
    rooms[c] = { code: c, players: [{ id: myId, name: name || 'Host', bot: false, socket, token: token || null, connected: true }],
                 game: null, started: false, stepMode: false, botTimer: null };
    myRoom = c;
    socket.join(c);
    emitRoom(rooms[c]);
  });

  socket.on('join', ({ code: c, name, token }) => {
    const room = rooms[c];
    if (!room) { socket.emit('err', 'No such table.'); return; }
    // same browser coming back? give it its seat again
    const mine = token && room.players.find(p => !p.bot && p.token === token);
    if (mine) { attach(room, mine); return; }
    if (room.started) { socket.emit('err', 'That game has already started.'); return; }
    if (room.players.length >= 8) { socket.emit('err', 'That table is full.'); return; }
    myId = E.rid(); myRoom = c;
    room.players.push({ id: myId, name: name || 'Player', bot: false, socket, token: token || null, connected: true });
    socket.join(c);
    emitRoom(room);
  });

  socket.on('rejoin', ({ code: c, token }) => {
    const room = rooms[c];
    const mine = room && token && room.players.find(p => !p.bot && p.token === token);
    if (!mine) { socket.emit('rejoinFail', {}); return; }
    attach(room, mine);
  });

  // Turn a human seat into a bot seat so the game can go on without them.
  function seatToBot(room, pl) {
    clearTimeout(pl.graceTimer); pl.graceTimer = null;
    pl.bot = true; pl.token = null; pl.socket = null; pl.connected = false;
    const g = room.game;
    if (!g) { emitRoom(room); return; }
    const gp = g.players.find(p => p.id === pl.id);
    if (gp) gp.bot = true;
    E.logAdd(g, `${pl.name} has left — a bot takes over their stall.`);
    emitRoom(room);
    if (!g.over && gp && g.players[g.active] === gp && gp.alive) {
      A.botTurn(g);                 // their turn had already started: let the bot finish it
      A.endTurn(g);
      runBots(room);
    } else {
      broadcast(room);
    }
  }

  // Hand a seat whose player has dropped out to a bot, so the game can go on.
  socket.on('botify', ({ playerId }) => {
    const room = rooms[myRoom]; if (!room) return;
    const me = room.players.find(p => p.id === myId);
    if (!me || me.bot || !me.connected) return;
    const pl = room.players.find(p => p.id === playerId);
    if (!pl || pl.bot || pl.connected) return;        // only seats that have gone offline
    seatToBot(room, pl);
  });

  // Quit the table for good: the seat is given up, so this browser is free to
  // open or join another table. In the lobby the seat is removed; mid-game a bot
  // takes it over. A table with no human seats left is closed.
  socket.on('leave', () => {
    const room = rooms[myRoom];
    const pl = room && room.players.find(p => p.id === myId);
    if (room) socket.leave(room.code);
    myRoom = null; myId = null;
    socket.emit('left', {});
    if (!pl) return;
    clearTimeout(pl.graceTimer); pl.graceTimer = null;
    pl.socket = null; pl.connected = false; pl.token = null;
    if (!room.players.some(p => p !== pl && !p.bot)) {
      clearTimeout(room.botTimer); room.botTimer = null;
      delete rooms[room.code];
      return;
    }
    if (!room.started) {
      room.players = room.players.filter(p => p !== pl);
      emitRoom(room);
      return;
    }
    seatToBot(room, pl);
  });

  socket.on('setStep', ({ on }) => {
    const room = rooms[myRoom]; if (!room) return;
    room.stepMode = !!on;
    emitRoom(room);
    if (room.game && !room.game.over) {
      if (room.stepMode) { clearTimeout(room.botTimer); room.botTimer = null; broadcast(room); }
      else runBots(room);
    }
  });

  socket.on('addBot', () => {
    const room = rooms[myRoom]; if (!room || room.started) return;
    if (room.players.length >= 8) return;
    room.players.push({ id: E.rid(), name: 'Bot ' + room.players.length, bot: true, socket: null });
    io.to(myRoom).emit('room', { code: myRoom, players: room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })) });
  });

  socket.on('start', () => {
    const room = rooms[myRoom]; if (!room || room.started) return;
    if (room.players.length < 2) { socket.emit('err', 'Need at least 2 players.'); return; }
    room.started = true;
    clearTimeout(room.botTimer); room.botTimer = null;
    room.game = E.newGame(room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })));
    setCap(room);
    io.to(myRoom).emit('begin', {});
    runBots(room);
  });

  // long mode: cards per turn is a table setting (1-3), chosen in the lobby
  socket.on('setCap', ({ n } = {}) => {
    const room = rooms[myRoom]; if (!room || room.started) return;
    n = +n; if (![1, 2, 3].includes(n)) return;
    room.playCap = n; emitRoom(room);
  });

  socket.on('restart', () => {
    const room = rooms[myRoom]; if (!room) return;
    // rebuild a fresh game with the same seated players
    clearTimeout(room.botTimer); room.botTimer = null;
    room.game = E.newGame(room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })));
    setCap(room);
    io.to(myRoom).emit('begin', {});
    runBots(room);
  });

  socket.on('peekGambit', ({ id }) => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (g.players[g.active].id !== myId) return;
    // reveal (don't remove) the top 3 cards for the picker. When-Drawn cards
    // are shown but flagged unkeepable — they fire the moment they're drawn, so
    // they can never be taken into hand.
    const isWD = k => k === 'wd_snap' || k === 'wd_snap2' || k === 'wd_mole';
    const top = g.deck.slice(-3).reverse().map(c => {
      if (c.rat) return { id: c.rat.id, isRat:true, name: c.rat.name, col: c.rat.col, w:c.rat.w, heat:c.rat.heat };
      const d = E.CARDS[c.card]||{};
      return { id: c.id, card:c.card, name: d.name||c.card, sub:d.sub||null, cls:d.cls||'drawn', desc:d.desc||'', unkeepable: isWD(c.card) };
    });
    socket.emit('gambitPeek', { cardId: id, options: top });
  });

  socket.on('act', ({ type, id, target, ratId, theirRatId, cols, named, pickId, keepId }) => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (g.players[g.active].id !== myId) return;
    const p = g.players[g.active];
    const acts = A.legalActions(g, p);
    const act = acts.find(a => a.type === type && (id ? a.id === id : true));
    if (!act) return;
    // attach pick metadata to the act for apply()
    if (cols) act.cols = cols;
    if (named) act.named = named;
    if (pickId) act.pickId = pickId;
    if (keepId) act.keepId = keepId;
    if (theirRatId) act.theirRatId = theirRatId;
    A.apply(g, p, act, target, ratId);
    if (g.over) { broadcast(room); return; }
    // Unlimited card play: the turn ends ONLY when the player chooses to end it.
    // (Previously auto-ended once _actedAttack && _actedBuild were both set —
    // a leftover of the old one-attack-one-build-per-turn rule, which silently
    // cut turns short and blocked a second play after e.g. Gambit.)
    if (type === 'end') {
      A.endTurn(g);
      runBots(room);
    } else {
      broadcast(room);
    }
  });

  socket.on('stepBot', () => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (!g.players[g.active].bot) { broadcast(room); return; }
    advance(room);
  });

  socket.on('endTurn', () => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (g.players[g.active].id !== myId) return;
    A.endTurn(g);
    runBots(room);
  });

  socket.on('disconnect', () => {
    const room = rooms[myRoom]; if (!room) return;
    const pl = room.players.find(p => p.socket === socket);
    if (!pl) return;                      // this socket was already replaced by a reconnect
    pl.socket = null; pl.connected = false;
    if (room.started) { emitRoom(room); if (room.game) broadcast(room); return; }   // keep the seat; they can rejoin
    // lobby: hold the seat briefly in case they're just reconnecting
    emitRoom(room);
    pl.graceTimer = setTimeout(() => {
      if (pl.connected || room.started) return;
      room.players = room.players.filter(p => p !== pl);
      if (!room.players.some(p => !p.bot)) { delete rooms[room.code]; return; }
      emitRoom(room);
    }, LOBBY_GRACE_MS);
  });
});

const VERSION = 'L1.7';
app.get('/version', (req, res) => res.json({ version: VERSION }));

// ---- /art: phone page that makes the card art (Pollinations, free) and lays out the print sheets ----
// The server fetches each picture once (one at a time, ~16 s apart for the free tier) and caches it.
{
  const fs = require('fs');
  let ART = {}; try { const P = require('./tools/print/prompts'); for (const j of P.jobs) ART[j.file] = P.urlFor(j); } catch (e) { console.log('art prompts missing', e.message); }
  const CACHE = path.join(require('os').tmpdir(), 'ratart'); fs.mkdirSync(CACHE, { recursive: true });
  let chain = Promise.resolve(), last = 0;
  const fetchOne = file => chain = chain.then(async () => {
    const f = path.join(CACHE, file + '.jpg'); if (fs.existsSync(f)) return;
    const wait = last + 16000 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    try { const r = await fetch(ART[file]); if (!r.ok) throw new Error('HTTP ' + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
    finally { last = Date.now(); }
  });
  app.get('/art', (req, res) => res.sendFile(path.join(__dirname, 'public', 'art.html')));
  app.get('/artimg/:file', async (req, res) => {
    const file = String(req.params.file).replace(/\.jpg$/, '');
    if (!ART[file]) return res.status(404).end();
    const f = path.join(CACHE, file + '.jpg');
    if (!fs.existsSync(f)) { if (req.query.cached) return res.status(404).end(); try { await fetchOne(file); } catch (e) { return res.status(502).send(e.message); } }
    if (!fs.existsSync(f)) return res.status(502).end();
    res.set('Cache-Control', 'public, max-age=86400'); res.sendFile(f);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rat's Kitchen v${VERSION} on :${PORT}`));
