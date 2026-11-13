// RAT'S KITCHEN v3 — ACTIONS, LEGALITY, TURN FLOW, BOT
'use strict';
const E = require('./engine');
const { COLOURS, THRESHOLD, HAND } = E;

// A turn: draw 1 (WD fires on reveal), then 1 attack + 1 build, OR draw instead.
// Reactives (wok/cat) are handled inside inspection/steal resolution.

function startTurn(g) {
  // ── Market Day: flip one event at the START of each round ────────────────
  // A round = one pass of all alive players. _roundCounter counts down; at 0
  // (incl. game start) we flip the next Market Day, which applies all round.
  if ((g._roundCounter || 0) <= 0) {
    flipMarketDay(g);
    g._roundCounter = g.players.filter(pp => pp.alive).length;
    if (g.over) return;   // a market effect ended the game
  }
  g._roundCounter--;

  const p = g.players[g.active];
  if (!p.alive) return;   // market effect eliminated the active player pre-turn
  p.turns++;
  // v4.1: Rat King is crowned here — at the start of your own turn, if you
  // still hold the weight after everyone has had a go at you.
  g._crown = p.id; E.checkWin(g, p); g._crown = null;
  if (g.over) return;
  // Turn header — the client styles lines starting with '▸' as a heading, so
  // the log reads as grouped turns rather than one undifferentiated stream.
  E.logAdd(g, `▸ Round ${g._round} · ${p.name}'s turn`);
  p._actedAttack = false;
  p._actedBuild = false;
  p._plays = 0;           // play counter (unlimited play — retained for telemetry / optional future cap)
  p._ratsIn = 0;
  p._playedRat = false;   // one rat into your kitchen per turn (Ratato/hand-play)
  p._hitZones = {};
  p._sowUsed = false;
  p._bredThisTurn = false;
  p._fed = {};             // rats fed this turn (once per rat per turn)

  // 1) resolve YOUR lingering cards placed last turn (card-as-token): Hot Chilli detonates now
  for (const q of g.players) {
    if (!q.alive) continue;
    q.rats = q.rats.filter(r => {
      if (r._chilliBy === p.id) { g.bins.push({ id: r.id, rat: r }); E.logAdd(g, `A Hot Chilli detonates — ${q.name} loses a ${r.name} to the bins.`); return false; }
      return true;
    });
    // Territorial placed by you expires at your next turn
    if (q._terrBy === p.id) { q._terrBy = null; q.territorial = 0; }
    // Rat Trap you set expires unsprung at your next turn (1-turn card)
    if (q._rattrap === p.id) { q._rattrap = null; E.logAdd(g, `${p.name}'s Rat Trap in ${q.name}'s kitchen goes unsprung.`); }
    // Pelican Delivery you placed lands now: top bin rat drops into that kitchen
    if (q._pelicanBy === p.id) {
      q._pelicanBy = null;
      const b = E.takeFromAlley(g, q._pelicanPick);
      q._pelicanPick = null;
      if (b) {
        if (E.ratEnters(g, q, b.rat)) {
          E.logAdd(g, `The pelican drops a ${b.rat.name} into ${q.name}'s kitchen.`);
          if (E.checkWin(g, q)) return;
        }
      } else {
        E.logAdd(g, `The pelican arrives at ${q.name}'s kitchen — but the alley is empty.`);
      }
    }
  }

  // 2) armed Scheduled ages; must fire this turn or expire
  if (p.armed) {
    p.armed.age++;
    if (p.armed.age >= 2) { E.logAdd(g, `${p.name}'s Health Inspection expires unused.`); p.armed = null; }
  }
  // Board Up clears at the start of your next turn (1 turn of protection —
  // self-clearing, so nothing to track between turns at a physical table).
  if (p.boardup > 0) p.boardup = 0;

  // 3) draw phase — Runner chains; Ratato and other rats obey the entry rules
  g.justDrew = [];   // what the active player drew this turn (for UI visibility)
  let draws = 1;
  for (let i = 0; i < draws && i < 8; i++) {
    const c = E.drawCard(g);
    if (!c) break;
    const r = resolveDraw(g, p, c, true);   // true = record in justDrew (active player)
    if (g.over || !p.alive) return;
    if (r === 'again') draws++;
  }
}

// ── centralised "a card enters a player's control" ─────────────────────────
// EVERY draw path must go through this: turn draw, initial deal, Frenzy, Sow,
// Gambit-keep, etc. It fires When-Drawn cards immediately (they must never sit
// in a hand), routes rats into the kitchen (or holds Ratato), and only normal
// action cards actually land in hand. Returns 'again' if a Runner chains.
function resolveDraw(g, p, c, record) {
  const note = o => { if (record) g.justDrew.push(o); };
  if (c.rat) {
    if (c.rat.kind === 'hotrat') {
      // Hot Ratato is HELD in hand, to be thrown into a rival later.
      p.hand.push({ id: c.rat.id, ratcard: c.rat });
      note({ isRat: true, name: c.rat.name, col: c.rat.col, held: true });
      E.logAdd(g, `${p.name} draws a Ratato Rat (held to deploy).`);
    } else if (E.ratEnters(g, p, c.rat)) {
      note({ isRat: true, name: c.rat.name, col: c.rat.col });
      E.logAdd(g, `${p.name} draws a ${c.rat.name}.`);
      E.checkWin(g, p);
      if (c.rat.prop === 'draw_again') return 'again';
    }
    return null;
  }
  if (c.card === 'wd_snap' || c.card === 'wd_snap2') {
    const cols = c.cols || (c.card === 'wd_snap2' ? ['red', 'blue'] : ['red']);
    g.discard.push(c);
    note({ isRat: false, name: 'Snap Inspection', cols, cls: 'drawn' });
    E.logAdd(g, `${p.name} draws a ${cols.join('/').toUpperCase()} Snap Inspection — it fires immediately!`);
    E.fireScheduled(g, p, p, cols);
    if (p.alive) E.checkWin(g, p);
    return null;
  }
  if (c.card === 'wd_mole') {
    g.discard.push(c);
    note({ isRat: false, name: 'Snap Inspection (Mole)', cls: 'drawn' });
    E.logAdd(g, `${p.name} draws a Naked Mole Rat Snap — it fires immediately!`);
    E.fireMole(g, p, p);
    return null;
  }
  // normal action card
  p.hand.push(c);
  const d = E.CARDS[c.card] || {};
  note({ isRat: false, name: d.name || c.card, cls: d.cls || 'drawn' });
  return null;
}

// ── Market Days ───────────────────────────────────────────────────────────
function flipMarketDay(g) {
  g._round = (g._round || 0) + 1;
  // discard the previous round's event
  if (g.market) { g.marketDiscard.push(g.market); g.market = null; }
  if (!g.marketDeck.length) { g.marketDeck = E.shuffle(g.marketDiscard.splice(0)); }
  const md = g.marketDeck.pop();
  if (!md) return;
  g.market = md;
  E.logAdd(g, `── Market Day: ${md.name} — ${md.desc}`);
  const alive = () => g.players.filter(p => p.alive);
  const anyWin = () => { const a = alive()[0]; if (a) E.checkWin(g, a); };

  switch (md.event) {
    case 'rat_release': {
      // Fewest rats draws 1 from the top of the bins (catch-up).
      // TIE-BREAK (Koko spec): fewest rats → if tied, fewest cards in hand →
      // if STILL tied, every tied player draws a card from the DECK instead.
      const al = alive();
      const minRats = Math.min(...al.map(q => q.rats.length));
      let pool = al.filter(q => q.rats.length === minRats);
      if (pool.length > 1) {
        const minCards = Math.min(...pool.map(q => q.hand.length));
        pool = pool.filter(q => q.hand.length === minCards);
      }
      if (pool.length === 1 && g.alley.length) {
        const cand = pool[0];
        const b = E.takeFromAlley(g, null);
        if (E.ratEnters(g, cand, b.rat)) { E.logAdd(g, `Rat Release: ${cand.name} (fewest rats) takes a ${b.rat.name} from the alley.`); E.checkWin(g, cand); }
      } else {
        // still tied (or no bin rat): each tied player draws from the deck
        E.logAdd(g, `Rat Release: tied on rats and cards — ${pool.map(q=>q.name).join(', ')} each draw from the deck.`);
        for (const q of pool) { const dc = E.drawCard(g); if (dc) resolveDraw(g, q, dc, false); if (g.over) return; }
      }
      break;
    }
    case 'frenzy': {
      for (const q of alive()) {
        const c = E.drawCard(g); if (!c) continue;
        resolveDraw(g, q, c, false);   // WD fires on the drawer, rats route correctly
        if (g.over) return;
      }
      E.logAdd(g, `Frenzy: everyone draws a card.`);
      break;
    }
    case 'blackout': {
      for (const q of alive()) {
        if (!q.hand.length) continue;
        const i = Math.floor(Math.random() * q.hand.length);
        const c = q.hand.splice(i, 1)[0];
        if (c.rat) g.bins.unshift(c); else if (c.ratcard) g.bins.unshift({ id: c.ratcard.id, rat: c.ratcard }); else g.discard.push(c);
      }
      E.logAdd(g, `Blackout: everyone discards a card.`);
      break;
    }
    case 'pied_piper': {
      // each player passes ONE chosen rat one seat left, simultaneously.
      const a = alive().slice().sort((x, y) => x.seat - y.seat);
      if (a.length < 2) break;
      // left neighbour = previous alive seat (wrap)
      const moves = [];
      a.forEach((q, i) => {
        if (!q.rats.length) return;
        // bot policy: offload the hottest rat (biggest liability)
        const rat = q.rats.slice().sort((r1, r2) => r2.heat - r1.heat || r2.w - r1.w)[0];
        const left = a[(i - 1 + a.length) % a.length];
        moves.push({ from: q, rat, to: left });
      });
      for (const m of moves) m.from.rats = m.from.rats.filter(r => r.id !== m.rat.id);
      for (const m of moves) { E.ratEnters(g, m.to, m.rat); }
      E.logAdd(g, `Pied Piper: rats shuffle one seat left.`);
      for (const q of a) if (E.checkWin(g, q)) return;
      break;
    }
    case 'roulette': {
      const a = alive();
      const pool = [];
      for (const q of a) { if (q.hand.length) { const i = Math.floor(Math.random() * q.hand.length); pool.push(q.hand.splice(i, 1)[0]); } }
      const mole = { id: E.rid(), card: 'mole', _rr: true };
      pool.push(mole);
      E.shuffle(pool);
      a.forEach((q, idx) => {
        const c = pool[idx];
        if (!c) return;
        if (c._rr) { E.fireMole(g, null, q); g.discard.push(c); }
        else q.hand.push(c);
      });
      // any leftover cards (incl. the mole if it fell past the last seat) → discard unseen
      for (let idx = a.length; idx < pool.length; idx++) { const c = pool[idx]; if (c._rr) g.discard.push(c); else if (c.rat) g.bins.unshift(c); else g.discard.push(c); }
      E.logAdd(g, `Russian Roulette resolves.`);
      anyWin();
      break;
    }
    case 'day_off':   // handled as a legality modifier (no arming this round)
    case 'curfew':    // social-layer freeze — no mechanical effect vs bots
      break;
  }
  // A market effect can eliminate the last one or two players at once; make sure
  // the game ends cleanly (checkWin on a specific player can miss a 0-alive tie).
  if (!g.over) {
    const alv = g.players.filter(p => p.alive);
    if (alv.length <= 1) { g.over = true; g.winner = alv[0] ? alv[0].id : null; }
  }
}

// ── legality ────────────────────────────────────────────────────────────────
function canGainRat(p) { return p._ratsIn < 1; }

function legalActions(g, p) {
  // returns list of {type, card, needsTarget, targets:[], meta}
  const acts = [];
  const opps = E.opponents(g, p).filter(o => o.boardup === 0);
  const push = (a) => acts.push(a);
  const freeZones = list => list.filter(o => !p._hitZones[o.id]);   // zone-once
  const capped = false;   // unlimited card play (confirmed direction)
  const noArm = g.market && g.market.event === 'day_off';   // Inspector's Day Off

  if (!capped) for (const c of p.hand) {
    const t = c.card;
    // ---- Ratato Rat held in hand → play into a rival kitchen (attack) ----
    if (c.ratcard && c.ratcard.kind === 'hotrat' && true && !p._playedRat) {
      const tg = freeZones(opps);
      if (tg.length) push({ id: c.id, type: 'play_ratato', needsTarget: true, targets: tg.map(o => o.id), label: 'Throw Hot Ratato into a rival' });
      continue;
    }
    if (!t) continue;
    // ---- inspections ----
    if (t === 'mole' && true) { const tg=freeZones(opps); if(tg.length) push({ id: c.id, type: t, needsTarget: true, targets: tg.map(o => o.id), label: 'Health Inspection — Snap (-1 star)' }); }
    if ((t === 'sched1' || t === 'sched2') && !noArm && !p.armed)
      push({ id: c.id, type: t, label: `Arm ${E.CARDS[t].sub}` });
    // ---- poach: weight-1 rat, not Boiler, not in an Alpha-guarded kitchen ----
    if (t === 'poach' && true && canGainRat(p)) {
      const vics = freeZones(opps).filter(o => !o.rats.some(r => r.prop === 'alpha_guard') && o.rats.some(r => r.prop !== 'no_steal' && r.prop !== 'alpha_guard' && r.w <= 1));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, needsRat: 'target', targets: vics.map(o => o.id), label: 'Poach a rat' });
    }
    // ---- switcheroo ----
    if (t === 'switch' && true && p.rats.length) {
      const vics = freeZones(opps).filter(o => o.rats.some(r => r.prop !== 'no_steal'));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, needsRat: 'both', targets: vics.map(o => o.id), label: 'Switcheroo (swap 1 rat)' });
    }
    // ---- hot chilli: PLACE on a rival's rat (not Spice), detonates next turn ----
    if (t === 'chilli' && true) {
      const vics = freeZones(opps).filter(o => o.rats.some(r => r.prop !== 'no_explode' && !r._chilliBy));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, needsRat: 'target', targets: vics.map(o => o.id), label: 'Hot Chilli (place on a rat)' });
    }
    // ---- territorial: place on a rival kitchen ----
    if (t === 'territorial' && true) { const tg=freeZones(opps); if(tg.length) push({ id: c.id, type: t, needsTarget: true, targets: tg.map(o => o.id), label: 'Territorial' }); }
    if (t === 'hotratato' && true && p.rats.length) { const tg=freeZones(opps); if(tg.length) push({ id: c.id, type: t, needsTarget: true, needsRat: true, targets: tg.map(o => o.id), label: 'Ratata Quente (dump a rat)' }); }
    // ---- grease an armed rival ----
    if (t === 'grease' && true) {
      const armed = opps.filter(o => o.armed);
      if (armed.length) push({ id: c.id, type: t, needsTarget: true, targets: armed.map(o => o.id), label: 'Grease the Palm' });
    }
    // ---- kleptomaniac: steal random card from any opponent with cards ----
    if (t === 'klepto' && true) {
      const vics = opps.filter(o => o.hand.length);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Kleptomaniac (steal a card)' });
    }
    // ---- shakedown: name a card; handled with a follow-up (bot names randomly) ----
    if (t === 'shakedown' && true) {
      const vics = opps.filter(o => o.hand.length);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Shakedown (demand a card)' });
    }
    // ---- cat: buff on your own rat (not fat/alpha) ----
    if (t === 'cat' && true) {
      const shieldable = p.rats.filter(r => r.kind !== 'fat' && r.kind !== 'alpha' && !r._catShield);
      if (shieldable.length) push({ id: c.id, type: 'cat', needsRat: true, label: 'Cat — shield a rat' });
    }
    // ---- board up ----
    if (t === 'boardup' && true)
      push({ id: c.id, type: t, label: 'Board Up (safe 1 turn)' });
    // ---- rat trap ----
    if (t === 'rattrap' && true)
      push({ id: c.id, type: t, needsTarget: true, targets: [...opps.map(o => o.id), p.id], label: 'Rat Trap' });
    // ---- special delivery: take any alley rat → ANY kitchen (v4.1) ----
    // Your own kitchen needs the usual one-rat-in-per-turn room; a rival's
    // counts as touching that kitchen.
    if (t === 'delivery' && g.alley.length) {
      const tg = freeZones(opps).filter(o => o.territorial === 0).map(o => o.id);
      if (canGainRat(p) && !p._playedRat) tg.unshift(p.id);
      if (tg.length) push({ id: c.id, type: t, needsAlleyRat: true, needsTarget: true, targets: tg, label: 'Special Delivery (alley rat → any kitchen)' });
    }
    // ---- dodgy inspector: lose a star, take any alley rat ----
    if (t === 'desperate' && p.stars >= 2 && g.alley.length && canGainRat(p) && !p._playedRat)
      push({ id: c.id, type: t, needsAlleyRat: true, label: 'Dodgy Inspector (-1 star → alley rat)' });
    // ---- pelican delivery: delayed Special Delivery on YOUR OWN kitchen ----
    if (t === 'pelican' && g.alley.length && !p._pelicanBy)
      push({ id: c.id, type: t, label: 'Pelican Delivery (alley rat arrives next turn)' });
    // ---- trash diver: take one of the last 3 discards ----
    if (t === 'recycle' && true && g.discard.length)
      push({ id: c.id, type: t, label: 'Recycle Day (recover a card)' });
    // ---- exterminator: remove ANY rat (yours or a rival's) to the bins ----
    if (t === 'exterm' && true) {
      const withRats = [p, ...opps].filter(x => x.rats.length && (x.id === p.id || x.boardup === 0));
      if (withRats.length) push({ id: c.id, type: t, needsTarget: true, needsRat: true, targets: withRats.map(o => o.id), label: 'Exterminator (remove a rat)' });
    }
    // ---- gambit: scry top 3 ----
    if (t === 'gambit' && true && g.deck.length)
      push({ id: c.id, type: t, label: 'Gambit (look at top 3)' });
    if (t === 'inherit' && true) {
      const vics = opps.filter(o => !o._inheritBy);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Inheritance (place on a rival)' });
    }
  }

  // fire armed inspection (free, on your turn). Colours are FIXED on the card, so
  // you may fire at ANY opponent — it whiffs for 0 if they lack the card's colours.
  if (p.armed && p.armed.age < 1) {
    // armed this turn — it can only fire from your NEXT turn onward
    push({ type: 'fire_wait', disabled: true, label: 'Inspection arms now — fires from your next turn' });
  }
  if (p.armed && p.armed.age >= 1) {
    const colsLabel = (p.armed.cols || []).join('/');
    const blocked = E.opponents(g, p).filter(o => o.boardup > 0 || p._hitZones[o.id]);
    const legal = E.opponents(g, p).filter(o => o.boardup === 0 && !p._hitZones[o.id]);
    if (!legal.length && blocked.length) {
      push({ type: 'fire_blocked', disabled: true,
             label: blocked.some(o => o.boardup > 0)
               ? 'No target — rivals are boarded up or already hit this turn'
               : 'No target — you already hit those kitchens this turn' });
    }
    if (legal.length) push({ type: 'fire', needsTarget: true, targets: legal.map(o => o.id),
                             // 2-colour cards: choose ONE of the printed colours at fire time
                             pickOneCol: (p.armed.cols && p.armed.cols.length > 1) ? p.armed.cols.slice() : null,
                             label: `Fire Inspection (${colsLabel})` });
  }
  // 2 Food -> 1 star
  if (!capped && p.hand.filter(c => c.card === 'food').length >= 2 && p.stars < E.STARS)
    push({ type: 'food_heal', label: 'Spend 2 Food (+1 star)' });
  // Last Resort still eats any rat for stars = weight
  if (!capped) {
    const hasLR = p.hand.find(c => c.card === 'lastresort');
    if (hasLR && p.rats.length) push({ id: hasLR.id, type: 'eat_lastresort', needsRat: true, label: 'Last Resort — eat a rat (+stars = weight)' });
  }
  // Breeder Rat: FREE once per turn — take any rat from the Alley
  if (!p._bredThisTurn && p.rats.some(r => r.prop === 'breed')
      && g.alley.length && canGainRat(p) && !p._playedRat)
    push({ type: 'breed', needsAlleyRat: true, label: 'Breeder: take an alley rat (free)' });

  // ── FEEDING ───────────────────────────────────────────────────────────────
  // Runner, Sow, Larder and Spice have a FED ability costing 1 Food, once per
  // turn per rat. Immunity rats (Feral/Boiler/Sewer/Alpha, Spice's chilli
  // immunity) stay free passives — that is what the rat IS.
  if (p.hand.some(c => c.card === 'food')) {
    p._fed = p._fed || {};
    for (const r of p.rats) {
      if (p._fed[r.id]) continue;
      if (r.prop === 'feed_draw')
        push({ type: 'feed', ratId: r.id, feed: 'draw',  label: 'Feed the Runner (1 Food → draw 1)' });
      if (r.prop === 'feed_draw2')
        push({ type: 'feed', ratId: r.id, feed: 'draw2', label: 'Feed the Sow (1 Food → draw 2)' });
      if (r.prop === 'feed_eat' && p.stars < E.STARS)
        push({ type: 'feed', ratId: r.id, feed: 'eat',   label: 'Feed the Larder (1 Food → eat it, +1 star)' });
      if (r.prop === 'no_explode' && p.rats.some(x => x._chilliBy))
        push({ type: 'feed', ratId: r.id, feed: 'spice', label: 'Feed the Spice Rat (1 Food → clear a Hot Chilli)' });
    }
  }
  // end turn
  push({ type: 'end', label: 'End turn' });
  return acts;
}

// ── apply an action ──────────────────────────────────────────────────────────
function apply(g, p, act, targetId, ratId) {
  const t = targetId ? g.players.find(x => x.id === targetId) : null;
  // 2 card-plays per turn. Firing an already-armed inspection is FREE (arming
  // already cost a play last turn); Sow draw and End are free.
  const FREE = { fire: 1, end: 1, sow_draw: 1 };
  if (!FREE[act.type]) p._plays = (p._plays || 0) + 1;
  // record what was just played so the UI can show it physically (central slot)
  if (act.type !== 'end' && act.type !== 'sow_draw') {
    const catalogue = E.CARDS[act.type] || E.CARDS[(p.hand.find(c => c.id === act.id) || {}).card];
    let cardKey = act.type;
    let cardName = catalogue ? catalogue.name : act.type;
    let cardSub = catalogue ? catalogue.sub : null;
    let cardCls = catalogue ? catalogue.cls : 'drawn';
    if (act.type === 'play_ratato') { cardKey = 'hotrat'; cardName = 'Hot Ratato'; cardCls = 'attack'; cardSub = null; }
    if (act.type === 'fire') { cardKey = 'fire'; cardName = 'Health Inspection'; cardSub = 'Fires!'; cardCls = 'attack'; }
    // for a fire, the colours come from the armed inspection, not the act
    const shownCols = (act.type === 'fire' && p.armed) ? (p.armed.cols || null) : (act.cols || null);
    g.lastPlayed = {
      by: p.id, byName: p.name,
      target: t ? t.id : null, targetName: t ? t.name : null,
      key: cardKey, name: cardName, sub: cardSub, cls: cardCls,
      cols: shownCols, at: (g.lastPlayedSeq = (g.lastPlayedSeq || 0) + 1),
    };
  }
  const ATTACKS = ["mole","poach","play_ratato","hotratato","switch","chilli","territorial","fire","klepto","shakedown"];
  if (t && t.id !== p.id && ATTACKS.includes(act.type)) { if(!p._hitZones) p._hitZones={}; p._hitZones[t.id] = true; }
  const takeCard = (id) => {
    const i = p.hand.findIndex(c => c.id === id);
    return i >= 0 ? p.hand.splice(i, 1)[0] : null;
  };
  const bin = (c) => { if (c) { if (c.rat) g.bins.unshift(c); else g.discard.push(c); } };   // cards->discard, rats->bin bottom

  switch (act.type) {
    case 'food_boost': { bin(takeCard(act.id)); p._actedBuild = true; E.logAdd(g, `${p.name} plays Food.`); break; }
    case 'food_heal': {
      let removed = 0;
      p.hand = p.hand.filter(c => { if (c.card === 'food' && removed < 2) { g.discard.push(c); removed++; return false; } return true; });
      p.stars = Math.min(E.STARS, p.stars + 1); p._actedBuild = true;
      E.logAdd(g, `${p.name} spends 2 Food for a star.`); break;
    }
    case 'eat_lastresort': {
      const r = p.rats.find(x => x.id === ratId); if (!r) break;
      bin(takeCard(act.id));   // spend the Last Resort card
      p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r });
      p.stars = Math.min(E.STARS, p.stars + r.w); p._actedBuild = true;
      E.logAdd(g, `${p.name} plays Last Resort and eats a ${r.name} for ${r.w} star(s).`); break;
    }
    case 'mole': { bin(takeCard(act.id)); E.fireMole(g, p, t); p._actedAttack = true; break; }
    case 'sched1': case 'sched2': {
      const card = takeCard(act.id);
      bin(card);
      const cap = act.type === 'sched2' ? 2 : 1;
      // colours are FIXED on the card (assigned at deck-build); carry them on the armed inspection
      const cols = (card && card.cols) ? card.cols.slice() : [];
      p.armed = { cap, cols, age: 0 };
      p._actedAttack = true;
      E.logAdd(g, `${p.name} arms a ${cap === 2 ? '2' : '1'}-colour Health Inspection (${cols.join('/')}).`); break;
    }
    case 'fire': {
      // A 2-colour Scheduled card is FLEXIBLE, not stronger: at fire time you
      // pick ONE of its two printed colours to inspect. act.cols carries the
      // choice; with none given (bots) pick whichever hurts the target most.
      const printed = (p.armed && p.armed.cols) ? p.armed.cols : [];
      let cols = printed;
      if (printed.length > 1) {
        const chosen = act.cols && act.cols.length ? act.cols[0] : null;
        if (chosen && printed.includes(chosen)) cols = [chosen];
        else cols = [printed.slice().sort((a, b) => E.heatOf(t, [b]) - E.heatOf(t, [a]))[0]];
      }
      p.armed = null;
      E.fireScheduled(g, p, t, cols);
      if (t && t.id !== p.id) { if(!p._hitZones) p._hitZones={}; p._hitZones[t.id] = true; }
      break;
    }
    case 'poach': {
      bin(takeCard(act.id));
      const pool = t.rats.filter(r => r.prop !== 'no_steal' && r.w <= 1);
      // honour the player's chosen rat when given; else auto-pick the best
      const r = (ratId && pool.find(x => x.id === ratId)) || pool.slice().sort((a, b) => b.w - a.w)[0];
      if (r && E.tryCat(g, t, r)) { E.logAdd(g, `${t.name}'s Cat shields the ${r.name}.`); p._actedAttack = true; break; }
      if (r) { t.rats = t.rats.filter(x => x.id !== r.id); if (E.ratEnters(g, p, r)) p._ratsIn++; E.logAdd(g, `${p.name} poaches a ${r.name} from ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'hotratato': {
      bin(takeCard(act.id));
      const r = p.rats.find(x => x.id === ratId) || p.rats.slice().sort((a,b)=>b.heat-a.heat)[0];
      if (r) { p.rats = p.rats.filter(x => x.id !== r.id); E.ratEnters(g, t, r); E.logAdd(g, `${p.name} dumps a ${r.name} into ${t.name}'s kitchen.`); }
      p._actedAttack = true; break;
    }
    case 'play_ratato': {
      const c = takeCard(act.id); if (!c || !c.ratcard) { p._actedAttack = true; break; }
      E.ratEnters(g, t, c.ratcard);   // enters rival kitchen; 0 weight so no win
      p._actedAttack = true; p._playedRat = true;
      E.logAdd(g, `${p.name} deploys a Ratato Rat into ${t.name}'s kitchen.`); break;
    }
    case 'switch': {
      bin(takeCard(act.id));
      const tpool = t.rats.filter(r => r.prop !== 'no_steal');
      // act.theirRatId = the rival rat you want; ratId = which of yours to give
      const theirs = (act.theirRatId && tpool.find(x => x.id === act.theirRatId))
                     || tpool.slice().sort((a, b) => b.w - a.w)[0];
      if (theirs && E.tryCat(g, t, theirs)) { E.logAdd(g, `${t.name}'s Cat shields the ${theirs.name}.`); p._actedAttack = true; break; }
      const mine = (ratId && p.rats.find(x => x.id === ratId)) || p.rats.slice().sort((a, b) => a.w - b.w)[0];
      if (theirs && mine) {
        p.rats = p.rats.filter(x => x.id !== mine.id);
        t.rats = t.rats.filter(x => x.id !== theirs.id);
        p.rats.push(theirs); t.rats.push(mine);
        E.logAdd(g, `${p.name} swaps a ${mine.name} for ${t.name}'s ${theirs.name}.`);
      }
      p._actedAttack = true; break;
    }
    case 'chilli': {
      bin(takeCard(act.id));
      const cpool = t.rats.filter(x => x.prop !== 'no_explode' && !x._chilliBy);
      const r = (ratId && cpool.find(x => x.id === ratId)) || cpool.slice().sort((a, b) => b.w - a.w)[0];
      if (r && E.tryCat(g, t, r)) { E.logAdd(g, `${t.name}'s Cat shields the ${r.name} from the chilli.`); p._actedAttack = true; break; }
      if (r) { r._chilliBy = p.id; E.logAdd(g, `${p.name} plants a Hot Chilli on ${t.name}'s ${r.name} — it blows next turn.`); }
      p._actedAttack = true; break;
    }
    case 'territorial': { bin(takeCard(act.id)); t.territorial = 1; t._terrBy = p.id; p._actedAttack = true; E.logAdd(g, `${p.name} marks ${t.name}'s kitchen Territorial.`); break; }
    case 'grease': { bin(takeCard(act.id)); t.armed = null; p._actedAttack = true; E.logAdd(g, `${p.name} greases ${t.name}'s inspector.`); break; }
    case 'cat': {
      bin(takeCard(act.id));
      const r = p.rats.find(x => x.id === ratId && x.kind !== 'fat' && x.kind !== 'alpha');
      if (r) { r._catShield = true; E.logAdd(g, `${p.name} shields a ${r.name} with a Cat.`); }
      p._actedBuild = true; break;
    }
    case 'boardup': { bin(takeCard(act.id)); p.boardup = 1; p._actedBuild = true; E.logAdd(g, `${p.name} boards up.`); break; }
    case 'rattrap': { bin(takeCard(act.id)); t._rattrap = p.id; p._actedBuild = true; E.logAdd(g, `${p.name} sets a Rat Trap on ${t.name}.`); break; }
    case 'delivery': {
      // take ANY rat from the Alley (3 face-up) and put it in ANY legal kitchen
      const dest = (t && act.targets && act.targets.includes(t.id)) ? t : null;
      if (!dest) break;   // no legal kitchen chosen — card stays in hand
      bin(takeCard(act.id));
      const b = E.takeFromAlley(g, ratId);
      if (b && dest.id === p.id) {
        if (E.ratEnters(g, p, b.rat)) { p._ratsIn++; p._playedRat = true; }
        E.logAdd(g, `${p.name} takes a ${b.rat.name} from the alley.`);
        p._actedBuild = true;
      } else if (b) {
        E.ratEnters(g, dest, b.rat);
        if (!p._hitZones) p._hitZones = {}; p._hitZones[dest.id] = true;
        E.logAdd(g, `${p.name} delivers a ${b.rat.name} from the alley to ${dest.name}'s kitchen.`);
        p._actedAttack = true;
      }
      break;
    }
    case 'desperate': {
      bin(takeCard(act.id));
      E.damage(g, p, 1);
      if (!p.alive) break;
      const lb = E.takeFromAlley(g, ratId);
      if (lb && E.ratEnters(g, p, lb.rat)) {
        p._ratsIn++; p._playedRat = true;
        E.logAdd(g, `The Dodgy Inspector docks ${p.name} a star — and looks away while they take a ${lb.rat.name}.`);
      }
      p._actedBuild = true; break;
    }
    case 'pelican': {
      bin(takeCard(act.id));
      p._pelicanBy = p.id;
      E.logAdd(g, `${p.name} signals the pelican to their kitchen.`);
      p._actedBuild = true; break;
    }
    case 'exterm': {
      bin(takeCard(act.id));
      const kitchen = t || p;   // target kitchen (yours or a rival's)
      const r = (ratId && kitchen.rats.find(x => x.id === ratId))
                || kitchen.rats.slice().sort((a, b) => b.heat - a.heat)[0];   // fallback: hottest
      if (r) {
        E.ratToBins(g, kitchen, r);
        const whose = kitchen.id === p.id ? 'their own' : `${kitchen.name}'s`;
        E.logAdd(g, `${p.name} calls the Exterminator on ${whose} ${r.name}.`);
      }
      if (t && t.id !== p.id) { if(!p._hitZones) p._hitZones={}; p._hitZones[t.id] = true; }
      p._actedBuild = true; break;
    }
    case 'klepto': {
      bin(takeCard(act.id));
      if (t.hand.length) { const i = Math.floor(Math.random()*t.hand.length); const stolen = t.hand.splice(i,1)[0]; p.hand.push(stolen); E.logAdd(g, `${p.name} lifts a card from ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'shakedown': {
      bin(takeCard(act.id));
      // demand a named card. Human passes act.named; bot picks the commonest.
      const named = act.named || (t.hand[0] && t.hand[0].card);
      const i = t.hand.findIndex(c => c.card === named);
      if (i >= 0) { const given = t.hand.splice(i,1)[0]; p.hand.push(given); E.logAdd(g, `${p.name} shakes down ${t.name} for a ${E.CARDS[named]?E.CARDS[named].name:named}.`); }
      else E.logAdd(g, `${p.name} demands a card from ${t.name} — they hold none.`);
      p._actedAttack = true; break;
    }
    case 'recycle': {
      const spent = takeCard(act.id);
      bin(spent);
      // Eligible discards exclude: the just-spent Recycle (would loop), other
      // Recycle cards, any When-Drawn card (fires on draw, can't be held), and
      // rats (they belong in the bins, not a hand).
      const isWD = c => c.card === 'wd_snap' || c.card === 'wd_snap2' || c.card === 'wd_mole';
      const eligible = g.discard.filter(c => c.id !== (spent && spent.id) && c.card !== 'recycle' && !isWD(c) && !c.rat);
      const last3 = eligible.slice(-3);
      const pickId = act.pickId && eligible.some(c => c.id === act.pickId) ? act.pickId
                     : (last3.length ? last3[last3.length-1].id : null);
      if (pickId) {
        const idx = g.discard.findIndex(b => b.id === pickId);
        if (idx>=0) { p.hand.push(g.discard.splice(idx,1)[0]); E.logAdd(g, `${p.name} recycles a card from the discard.`); }
      }
      p._actedBuild = true; break;
    }
    case 'gambit': {
      bin(takeCard(act.id));
      const top = [];
      for (let i=0;i<3;i++){ const c=E.drawCard(g); if(c) top.push(c); }
      let keep = act.keepId ? top.find(c=>c.id===act.keepId) : top[0];
      if (!keep && top.length) keep = top[0];
      // the two NOT kept go back on top (they'll draw — and WD fire — normally later)
      for (const c of top) { if (c !== keep) g.deck.push(c); }
      // the kept card resolves as a real draw: a kept WD fires now, a kept rat
      // enters the kitchen, a normal card goes to hand.
      if (keep) resolveDraw(g, p, keep, false);
      p._actedBuild = true;
      E.logAdd(g, `${p.name} plays Gambit and digs through the deck.`); break;
    }
    case 'inherit': { bin(takeCard(act.id)); t._inheritBy = p.id; p._actedBuild = true; E.logAdd(g, `${p.name} places Inheritance on ${t.name}.`); break; }
    case 'breed': {
      const b = E.takeFromAlley(g, ratId);
      if (b && E.ratEnters(g, p, b.rat)) {
        p._ratsIn++; p._playedRat = true;
        E.logAdd(g, `${p.name}'s Breeder takes a ${b.rat.name} from the alley.`);
      }
      p._bredThisTurn = true; p._actedBuild = true; break;
    }
    case 'feed': {
      // pay 1 Food
      let paid = false;
      p.hand = p.hand.filter(c => { if (!paid && c.card === 'food') { paid = true; g.discard.push(c); return false; } return true; });
      if (!paid) break;
      const fr = p.rats.find(x => x.id === (act.ratId || ratId));
      if (!fr) break;
      p._fed = p._fed || {}; p._fed[fr.id] = true;
      if (act.feed === 'draw' || act.feed === 'draw2') {
        const n = act.feed === 'draw2' ? 2 : 1;
        for (let k = 0; k < n; k++) { const c = E.drawCard(g); if (c) resolveDraw(g, p, c, true); if (g.over || !p.alive) return; }
        E.logAdd(g, `${p.name} feeds the ${fr.name} — draws ${n}.`);
      } else if (act.feed === 'eat') {
        p.rats = p.rats.filter(x => x.id !== fr.id);
        g.bins.unshift({ id: fr.id, rat: fr });
        p.stars = Math.min(E.STARS, p.stars + 1);
        E.logAdd(g, `${p.name} feeds the ${fr.name}, then eats it — back to ${p.stars} stars.`);
      } else if (act.feed === 'spice') {
        const victim = p.rats.find(x => x._chilliBy);
        if (victim) { victim._chilliBy = null; E.logAdd(g, `${p.name} feeds the Spice Rat — the chilli on their ${victim.name} is smothered.`); }
      }
      p._actedBuild = true; break;
    }
    case 'fire_wait': case 'fire_blocked': break;   // display-only hints
    case 'end': break;
  }
  E.checkWin(g, p);
}

function endTurn(g) {
  const p = g.players[g.active];
  while (p.hand.length > HAND) { const c = p.hand.shift(); if (c.rat) g.bins.unshift(c); else g.discard.push(c); }
  if (!g.players.some(x => x.alive)) { g.over = true; g.winner = null; return; }   // no one left (simultaneous KO)
  // v4.1: warn the table about anyone holding Rat King weight
  for (const q of g.players) if (q.alive && E.weight(q) >= E.THRESHOLD)
    E.logAdd(g, `⚠ ${q.name} holds ${E.weight(q)} weight — Rat King at the start of their turn unless someone stops them!`);
  do { g.active = (g.active + 1) % g.players.length; } while (!g.players[g.active].alive);
  g.turn++;
}

// ── SMART BOT (ported from tuned sim) ────────────────────────────────────────
function botTurn(g) {
  const p = g.players[g.active];
  let guard = 0;
  while (!g.over && guard++ < 8) {
    const acts = legalActions(g, p);
    const choice = botChoose(g, p, acts);
    if (!choice || choice.type === 'end') break;
    let target = null, ratId = null;
    if (choice.needsTarget) target = botTarget(g, p, choice);
    if (choice.needsAlleyRat) ratId = botAlleyPick(g);
    if (choice.type === 'delivery') { const d = botDelivery(g, p, choice); target = d.target; ratId = d.ratId; }
    if (choice.needsRat) {
      // for Exterminator the rat comes from the TARGET kitchen; otherwise from own rats
      if (choice.type === 'exterm') {
        const kitchen = target ? g.players.find(x => x.id === target) : p;
        const r = kitchen && kitchen.rats.slice().sort((a, b) => (kitchen.id===p.id ? b.heat-a.heat : b.w-a.w))[0];
        ratId = r && r.id;
      } else if (choice.type === 'hotratato') {
        // dump your biggest LIABILITY (hottest, lightest), not your best rat
        const r = p.rats.slice().sort((a, b) => (b.heat - a.heat) || (a.w - b.w))[0];
        ratId = r && r.id;
      } else {
        // Cat / Last Resort: act on the most valuable rat
        const r = p.rats.slice().sort((a, b) => b.w - a.w)[0]; ratId = r && r.id;
      }
    }
    apply(g, p, choice, target, ratId);
    if (false) {   // unlimited card play — bot plays until no useful move (guard-capped)
      // still allow firing an armed inspection (free)
      const fire = legalActions(g, p).find(a => a.type === 'fire');
      if (fire) { apply(g, p, fire, botTarget(g, p, fire)); }
      break;
    }
  }
}

function topColours(t, n) {
  const byCol = {};
  for (const r of t.rats) if (r.col) byCol[r.col] = (byCol[r.col]||0) + r.heat;
  return Object.entries(byCol).sort((x,y)=>y[1]-x[1]).slice(0, n).map(e=>e[0]);
}

function threatTo(g, p) {
  let d = 0;
  for (const o of E.opponents(g, p)) {
    if (o.armed && o.armed.age >= 1) {
      // fixed colours now — threat is your heat in exactly those colours
      const cols = o.armed.cols || [];
      d += E.heatOf(p, cols);
    }
  }
  return d;
}

function botChoose(g, p, acts) {
  const opps = E.opponents(g, p);
  const lead = opps.slice().sort((a, b) => E.weight(b) - E.weight(a))[0];
  const alphaThreat = opps.find(o => o.rats.some(r => r.kind === 'alpha') && o.rats.length >= 2);
  const rivalClose = (lead && (THRESHOLD - E.weight(lead)) <= 2) || !!alphaThreat;
  const gap = THRESHOLD - E.weight(p);
  const iLead = !lead || E.weight(p) >= E.weight(lead);
  const threat = threatTo(g, p);
  const has = (type) => acts.find(a => a.type === type && !a.disabled);
  // Special Delivery is only worth playing if we can keep the rat, or there is a
  // weight-0 rat to dump on a rival.
  const okDeliv = () => { const a = has('delivery'); return a && (a.targets.includes(p.id) || g.alley.some(c => c.rat.w === 0)) ? a : null; };

  // 1. fire armed inspection if it hits someone dangerous
  if (has('fire')) return has('fire');
  // 2. defend: heal / board up if under lethal threat
  if (threat >= p.stars) {
    if (has('food_heal')) return has('food_heal');
    if (has('eat_lastresort')) return has('eat_lastresort');
    if (has('boardup')) return has('boardup');
  }
  // 2b. top up when wounded even if not facing lethal damage right now —
  // otherwise Food/Last Resort effectively never get played.
  if (p.stars < E.STARS && (threat > 0 || p.stars <= E.STARS - 2)) {
    if (has('food_heal')) return has('food_heal');
    // Last Resort is a real cost (you lose the rat), so only when properly hurt
    if (p.stars <= 2 && has('eat_lastresort')) return has('eat_lastresort');
  }
  // 2c. shield your most valuable rat while it's safe to do so
  if (has('cat') && p.rats.length) return has('cat');
  // 3. strip a rival about to win (prioritise an Alpha holder)
  if (rivalClose) {
    for (const t of ['poach', 'switch', 'chilli', 'hotratato', 'mole', 'sched2', 'sched1', 'territorial']) if (has(t)) return has(t);
  }
  // 4. race if safe and close
  if (gap <= 2 && threat === 0) {
    if (okDeliv()) return okDeliv();
    if (has('breed')) return has('breed');
    if (has('feed')) return has('feed');
    if (has('desperate') && threat === 0 && p.stars >= 3 && E.weight(p) < E.THRESHOLD - 1) return has('desperate');
    if (has('poach')) return has('poach');
  }
  // 5. productive plays first — grow your own kitchen
  if (okDeliv()) return okDeliv();
  if (has('breed')) return has('breed');
  if (has('feed')) return has('feed');
  if (has('desperate') && threat === 0 && p.stars >= 3 && E.weight(p) < E.THRESHOLD - 1) return has('desperate');
  if (has('poach')) return has('poach');
  // 6. grease a genuinely threatening armed rival
  if (has('grease')) return has('grease');
  // 7. arm an inspection ONLY when a rival is worth inspecting (holds >=2 rats) and
  //    not every turn — keeps the board from being wall-to-wall inspectors.
  const worthInspecting = opps.some(o => o.rats.length >= 2);
  if (worthInspecting && Math.random() < 0.5) {
    if (has('sched2')) return has('sched2');
    if (has('sched1')) return has('sched1');
    if (has('mole')) return has('mole');
  }
  // 8. otherwise do a small build or just end
  if (has('hotratato') && p.rats.length) return has('hotratato');
  if (has('play_ratato')) return has('play_ratato');
  if (has('exterm') && (p.heat >= 3 || (lead && E.weight(lead) > E.weight(p) && lead.rats.length))) return has('exterm');
  if (has('recycle')) return has('recycle');
  if (has('inherit') && lead) return has('inherit');
  if (has('gambit')) return has('gambit');
  if (has('klepto')) return has('klepto');
  if (has('shakedown')) return has('shakedown');
  if (has('rattrap')) return has('rattrap');
  if (has('pelican')) return has('pelican');
  return has('end');
}

// Special Delivery (v4.1): keep the best rat, or dump a weight-0 rat on the
// leader when it matches an inspection we hold and nothing heavy is on offer.
function botDelivery(g, p, act) {
  const self = act.targets.includes(p.id);
  const rivals = act.targets.filter(id => id !== p.id).map(id => g.players.find(x => x.id === id));
  const junk = g.alley.filter(c => c.rat.w === 0);
  const bestW = Math.max(...g.alley.map(c => c.rat.w));
  const myCols = [];
  if (p.armed) myCols.push(...(p.armed.cols || []));
  p.hand.forEach(c => { if (c.card === 'sched1' || c.card === 'sched2') myCols.push(...(c.cols || [])); });
  const match = junk.find(c => myCols.includes(c.rat.col));
  const give = (match && bestW <= 1) ? match : ((bestW === 0 || !self) ? junk[0] : null);
  if (give && rivals.length) {
    const tgt = rivals.sort((x, y) => E.weight(y) - E.weight(x))[0];
    return { target: tgt.id, ratId: give.rat.id };
  }
  if (self) return { target: p.id, ratId: botAlleyPick(g) };
  return { target: null, ratId: null };   // botChoose (okDeliv) never gets here
}
function botAlleyPick(g) {
  const best = g.alley.slice().sort((a, b) => (b.rat.w - a.rat.w) || (a.rat.heat - b.rat.heat))[0];
  return best ? best.rat.id : null;
}
function botTarget(g, p, act) {
  const cands = act.targets.map(id => g.players.find(x => x.id === id)).filter(Boolean);
  if (!cands.length) return null;
  // Shuffle first so ties break at random. Without this the stable sorts below
  // always picked the lowest seat among equals, so bots piled onto the host.
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  if (act.type === 'exterm') {
    // if a rival is ahead and reachable, remove their heaviest rat; else self-cool
    const rivals = cands.filter(x => x.id !== p.id);
    const leader = rivals.slice().sort((a, b) => E.weight(b) - E.weight(a))[0];
    if (leader && E.weight(leader) >= E.weight(p) && leader.rats.length) return leader.id;
    return p.id;   // cool own heat
  }
  if (act.type === 'play_ratato' || act.type === 'territorial' || act.type === 'chilli')
    return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id; // hurt the leader
  if (act.type === 'rattrap') return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id;
  // steal/inspect: prefer close-to-win, then biggest hoard
  return cands.sort((a, b) => (E.weight(b) - E.weight(a)))[0].id;
}

module.exports = { startTurn, legalActions, apply, endTurn, botTurn };
