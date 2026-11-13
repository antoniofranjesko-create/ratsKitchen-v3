// RAT'S KITCHEN v3 — GAME ENGINE
// Pure logic, no I/O. Server drives it; bots use the same API as humans.
// Rules locked per RATS_KITCHEN_V3_SPEC. Three stats: COUNT / WEIGHT / HEAT.
// Win: WEIGHT >= 5. Lose: 0 Stars. Inspections fine (never remove rats).

'use strict';

const COLOURS = ['red', 'blue', 'green'];
const THRESHOLD = 7;   // Rat King win at weight 7 (raised from 6: the Alley and feeding made accumulation faster)
const STARS = 4;
const HAND = 7;


// ── rat catalogue ────────────────────────────────────────────────────────
// weight, heat, prop, colourable
const RATS = {
  plain:  { name: 'Street Rat', w: 1, heat: 1, prop: null,          col: true,  desc: 'Plain stock. A small inspection risk.' },
  runner: { name: 'Runner Rat', w: 1, heat: 1, prop: 'feed_draw',   col: true,  desc: 'FEED 1 Food: draw a card. Once per turn.' },
  fat:    { name: 'Fat Rat',    w: 2, heat: 2, prop: 'no_cat',      col: true,  desc: 'Heavy stock — weight 2. Cannot be shielded by a Cat.' },
  sow:    { name: 'Sow Rat',    w: 2, heat: 2, prop: 'feed_draw2',  col: true,  desc: 'FEED 1 Food: draw 2 cards. Once per turn.' },
  alpha:  { name: 'Alpha Rat',  w: 2, heat: 2, prop: 'alpha_guard', col: true,  desc: 'While Alpha is in your kitchen, none of your rats can be Poached. Cannot be Cat-shielded.' },
  sewer:  { name: 'Sewer Rat',  w: 1, heat: 0, prop: null,          col: false, desc: 'Colourless and heat 0 — invisible to inspection.' },
  toll:   { name: 'Toll Rat',   w: 1, heat: 1, prop: 'tax',         col: true,  desc: 'If inspected while you hold it, the inspector gives you a card.' },
  feral:  { name: 'Feral Rat',  w: 1, heat: 1, prop: 'no_dump',     col: true,  desc: 'Cannot be moved by sabotage or dump effects.' },
  spice:  { name: 'Spice Rat',  w: 1, heat: 1, prop: 'no_explode',  col: true,  desc: 'Cannot be Hot Chilli-d. FEED 1 Food: clear a Hot Chilli from any of your rats. Once per turn.' },
  boiler: { name: 'Boiler Rat', w: 1, heat: 1, prop: 'no_steal',    col: true,  desc: 'Cannot be Poached.' },
  larder: { name: 'Larder Rat', w: 1, heat: 1, prop: 'feed_eat',    col: true,  desc: 'FEED 1 Food: eat this rat and regain 1 star. Once per turn.' },
  grub:   { name: 'Grub Rat',   w: 1, heat: 2, prop: null,          col: true,  desc: 'Cheap stock but runs hot — weight 1, heat 2. A liability when the inspector calls.' },
  breeder:{ name: 'Breeder Rat',w: 1, heat: 1, prop: 'breed',       col: true,  desc: 'FREE, once per turn: take any rat from the alley. The engine you build around.' },
  ratato: { name: 'Ratato Rat', w: 0, heat: 1, prop: null,        col: true,  desc: 'Weight 0, heat 1. Drawn straight into YOUR kitchen — worthless stock that still draws the inspector eye.' },
  hotrat: { name: 'Hot Ratato', w: 0, heat: 1, prop: 'sabotage',  col: true,  desc: 'Weight 0, heat 1. Held in hand, then thrown into a RIVAL kitchen — all heat, no value. Never your own.' },
};

// action card catalogue: type -> {name, cls}
const CARDS = {
  mole:        { name: 'Health Inspection', sub: 'Naked Mole Rat', cls: 'attack', desc: 'Snap inspection. Any rival, flat -1 star, immediately. Colour-agnostic (the mole is blind).' },
  sched1:      { name: 'Health Inspection', sub: 'Scheduled — 1 Colour', cls: 'attack', desc: 'Has one fixed colour. Arm it, then on a later turn fire at a rival — damage = their heat in that colour. Whiffs if they hold none.' },
  sched2:      { name: 'Health Inspection', sub: 'Scheduled — 2 Colour', cls: 'attack', desc: 'Has two fixed colours. Arm it, then on a later turn fire at a rival — damage = their heat in those two colours. Whiffs if they hold neither.' },
  poach:       { name: 'Poach',           cls: 'attack', desc: 'Steal one weight-1 rat from a rival. Blocked by Boiler, and by any rat in an Alpha-guarded kitchen.' },
  switch:      { name: 'Switcheroo',      cls: 'attack', desc: 'Swap one of your rats for a rival-s, regardless of weight.' },
  chilli:      { name: 'Hot Chilli',      cls: 'attack', desc: 'Place on a rival-s rat (not Spice). It explodes at the start of your next turn — rat to the bins.' },
  hotratato:   { name: 'Ratata Quente',   cls: 'attack', desc: 'Dump any one of your rats into a rival kitchen — offload its heat onto them.' },
  grease:      { name: 'Grease the Palm', cls: 'attack', desc: 'Discard a rival-s armed Scheduled inspection before it fires.' },
  klepto:      { name: 'Kleptomaniac',    cls: 'attack', desc: 'Steal one card at random from any opponent-s hand.' },
  shakedown:   { name: 'Shakedown',       cls: 'attack', desc: 'Name a card. If that opponent holds it, they must give you one.' },
  territorial: { name: 'Territorial',     cls: 'control', desc: 'Place on a rival kitchen. Until your next turn it cannot receive rats; rats it would gain go to the bins.' },
  wok:         { name: 'Wok Block',       cls: 'defence', desc: 'Reactive. Cancel one inspection aimed at you.' },
  boardup:     { name: 'Board Up',        cls: 'defence', desc: 'Your kitchen cannot be attacked for one turn.' },
  food:        { name: 'Food',            cls: 'buff', desc: 'Spend 2 Food to regain 1 star. Powers builds that need feeding.' },
  cat:         { name: 'Cat',             cls: 'buff', desc: 'Play on one of your rats (not Fat or Alpha) to shield it — blocks the next single attack on that rat.' },
  lastresort:  { name: 'Last Resort',     cls: 'buff', desc: 'Eat any one of your rats and regain stars equal to its weight.' },
  delivery:    { name: 'Special Delivery',cls: 'engine', desc: 'Take the TOP rat of the bins into your kitchen. Never choose.' },
  pelican:     { name: 'Pelican Delivery',cls: 'engine', desc: 'Place in YOUR kitchen. At the start of your next turn the pelican drops the TOP rat of the bins into it — a delayed Special Delivery.' },
  recycle:     { name: 'Recycle Day',     cls: 'engine', desc: 'Take any one of the last 3 discarded action cards back into your hand.' },
  rattrap:     { name: 'Rat Trap',        cls: 'engine', desc: 'Place on a rival kitchen. The next rat to enter it is caught — and YOU take it into your kitchen. Springs once; expires at your next turn if nothing walks in.' },
  exterm:      { name: 'Exterminator',    cls: 'engine', desc: 'Remove any one rat — yours or a rival-s — to the bins. Cool your own heat, or set a rival back.' },
  inherit:     { name: 'Inheritance',     cls: 'engine', desc: 'Place on a rival. If THAT rival is later shut down, you take 2 of their cards at random.' },
  wd_snap:     { name: 'Snap Inspection',  cls: 'drawn', desc: 'WHEN DRAWN, reveal at once — it fires on YOU. Has one fixed colour: you lose 1 star per rat you hold of that colour. Hold none of it and the inspector walks past. Cannot be held or played.' },
  wd_snap2:    { name: 'Snap Inspection',  sub: 'Two Colour', cls: 'drawn', desc: 'WHEN DRAWN, reveal at once — it fires on YOU. Has two fixed colours: you lose 1 star per rat you hold of EITHER. Harder to dodge than the one-colour version. Cannot be held or played.' },
  wd_mole:     { name: 'Snap Inspection',  sub: 'Naked Mole Rat', cls: 'drawn', desc: 'WHEN DRAWN, reveal at once — it fires on YOU. The mole is blind to colour: a flat -1 star, no matter what you hold. Cannot be held or played.' },
  desperate:   { name: 'Dodgy Inspector', cls: 'engine', desc: 'He docks your rating — lose 1 star — but he is on the take, and looks the other way while you help yourself to any rat from the alley.' },
  gambit:      { name: 'Gambit',          cls: 'engine', desc: 'Look at the top 3 cards of the deck. Keep 1; put the other 2 back on top (you know what they are).' },
};

// per-player-count deck config — LOCKED numbers (balance-confirmed via sim).
function deckConfig(P) {
  // Inspections: only the MOLE (colourless snap) scales with player count, and
  // it scales on a flattened curve (√ of P/6). The coloured Scheduled cards are
  // FIXED at sched1=10, sched2=4 so their colour-slots total 10 + 8 = 18 =
  // exactly 6 per colour (red/blue/green). Changing these off this balanced
  // pair (or scaling them) would break the even split.
  // Inspections: only the MOLE (colourless snap) scales with player count, and
  // it scales on a flattened curve (√ of P/6). The coloured Scheduled cards are
  // FIXED at sched1=9, sched2=3 so their colour-slots total 9 + 6 = 15 =
  // exactly 5 per colour (red/blue/green). NOTE: the divisibility test is on
  // colour SLOTS, not card count — each 2-colour card carries two slots.
  // Changing these off a balanced pair (or scaling them) breaks the even split.
  // ── INSPECTION MIX ────────────────────────────────────────────────────────
  // Split between WHEN-DRAWN (random, self-inflicted, builds draw tension) and
  // SCHEDULED (aimed, arm-then-fire, the tactical layer).
  //   WD snap   — coloured, fires on the drawer, 2 of each colour = 6
  //   WD mole   — colourless, fires on the drawer, flat -1 star = 3
  //   sched1/2  — armed and aimed. 3 single + 3 double = 9 colour-slots = 3/colour
  //   mole      — the playable snap, the only count that scales with players
  const inspScale = Math.pow(P / 6, 0.5);
  const HI_MULT = 0.85;
  const mole    = Math.max(2, Math.round(4 * inspScale * HI_MULT));
  const sched1  = 6;
  const sched2  = 6;
  const wd_snap = 6;      // 2 per colour (was 3) — more draw-tension
  const wd_snap2 = 0;     // built but unused — see potential mechanics
  const wd_mole = 2;
  const actions = {
    mole, sched1, sched2,
    wd_snap, wd_snap2, wd_mole,
    poach: 5, switch: 6, chilli: 4, hotratato: 4, grease: 3, klepto: 3, shakedown: 3,
    territorial: 3, wok: 3, boardup: 4,
    food: 12, cat: 3, lastresort: 4,
    delivery: 4, pelican: 3, recycle: 3, rattrap: 3, exterm: 4, inherit: 3, desperate: 3,
    gambit: 6,                                             // normal Engine card (was WD x3)
  };
  // ── RATS ─────────────────────────────────────────────────────────────────
  // ONE canonical set of physical rat cards (fixed counts — no percentages).
  // 37 colourable + 8 Ratato/Hot Ratato = 45 = exactly 15 per colour.
  // Sewer (2) is colourless and sits outside the colour split.
  // Ratato/Hot Ratato are counted separately (4 + 4).
  const ratMaster = {
    plain: 4, fat: 6,
    runner: 3, sow: 3, toll: 3, feral: 3, spice: 3,
    boiler: 3, larder: 3, grub: 3, breeder: 2,
    alpha: 1, sewer: 2,
  };
  const ratatoRats = 4;   // drawn straight into your own kitchen
  const hotratRats = 4;   // held in hand, thrown into a rival's
  // Deck rat count scales DOWN with players: dealing opening hands removes
  // ~HAND*P action cards from the deck (rats divert to bins), so a bigger table
  // leaves a smaller, rat-denser deck. Seeding fewer rats holds the in-play
  // density constant at ~19%. Everything not dealt into the deck goes to bins,
  // so every rat stays reachable.
  const actionTotal = Object.values(actions).reduce((s, x) => s + x, 0);
  const TARGET_DENSITY = 0.19;
  const afterDeal = Math.max(20, actionTotal - HAND * P);
  const deckRats = Math.max(6, Math.round(TARGET_DENSITY * afterDeal / (1 - TARGET_DENSITY)));
  const reshuffleRats = 7;        // rats reclaimed from bins at each reshuffle
  return { actions, ratMaster, deckRats, ratatoRats, hotratRats, reshuffleRats };
}

// ── Market Day event pool (start-of-round events) ──────────────────────────
// 6 events, 1 copy each. Health Scare CUT (too swingy/silly per design call).
// Curfew CUT to hit 6 — it's a pure social-layer no-op vs bots anyway.
// Cheese Glut and Rat Boom remain parked from the prior pass.
const MARKET_EVENTS = [
  { event: 'rat_release',  name: 'Rat Release',       desc: 'The player holding the fewest rats takes 1 rat from the alley. Tied? Fewest cards. Still tied? They each draw from the deck.' },
  { event: 'frenzy',       name: 'Frenzy',            desc: 'Every player draws 1 card.' },
  { event: 'blackout',     name: 'Blackout',          desc: 'Every player discards 1 card.' },
  { event: 'pied_piper',   name: 'Pied Piper',        desc: 'Every player passes one of their own rats one seat to the left, simultaneously.' },
  { event: 'roulette',     name: 'Russian Roulette',  desc: 'Everyone antes a card; one Naked Mole Rat is shuffled in and dealt back. Whoever draws it is inspected (-1 star).' },
  { event: 'day_off',      name: "Inspector's Day Off",desc: 'No Health Inspection may be armed this round. Already-armed inspections still fire.' },
];
function buildMarketDeck() { return MARKET_EVENTS.map(e => ({ id: rid(), ...e })); }

function rid() { return Math.random().toString(36).slice(2, 9); }

function makeRat(kind, colour) {
  const d = RATS[kind];
  return {
    id: rid(), kind, name: d.name, w: d.w, heat: d.heat,
    prop: d.prop, col: d.col ? colour : null,
  };
}

// Build a colour-balanced rat pool (heat balanced 4/4/4/4 per spec 5.3).
// Assign FIXED colours to Scheduled cards so every colour appears an equal
// number of times across all of them (matches the rat heat-balance — no colour
// is safer to hold rats in). 1-colour card = 1 appearance; 2-colour = 2.
function assignScheduledColours(cards) {
  // Build an EXACT balanced pool of colour slots. Total slots = (#sched1 ×1) +
  // (#sched2 ×2). With counts chosen so this is divisible by 3, each colour
  // gets exactly total/3 slots. We then deal slots to cards, giving each sched2
  // two DIFFERENT colours. This guarantees a perfectly even colour spread every
  // game (the previous cycling approach desynced whenever a duplicate 2-colour
  // pair forced an extra colour off the cycle).
  const nc = COLOURS.length;
  const sched1s = cards.filter(c => c.card === 'sched1');
  const sched2s = cards.filter(c => c.card === 'sched2');
  const totalSlots = sched1s.length + sched2s.length * 2;
  const per = Math.floor(totalSlots / nc);
  const slots = [];
  for (const col of COLOURS) for (let i = 0; i < per; i++) slots.push(col);
  // distribute any remainder slots (when not perfectly divisible) round-robin
  let rem = totalSlots - slots.length, ci = Math.floor(Math.random() * nc);
  while (rem-- > 0) { slots.push(COLOURS[ci % nc]); ci++; }
  // shuffle slots
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [slots[i],slots[j]]=[slots[j],slots[i]]; }

  // 1-colour cards: one slot each
  for (const c of sched1s) c.cols = [slots.pop()];
  // 2-colour cards: two DIFFERENT slots each; if the two drawn match, swap the
  // second with a non-matching slot further down the pool
  for (const c of sched2s) {
    const a = slots.pop();
    let bi = slots.length - 1;
    while (bi >= 0 && slots[bi] === a) bi--;
    let b;
    if (bi >= 0) { b = slots.splice(bi, 1)[0]; } else { b = slots.pop(); }   // fallback if all remaining equal a
    c.cols = [a, b];
  }
}

// Build the full canonical rat set from the master list. Counts are FIXED —
// no percentages. Colours are assigned to equalise BOTH count and heat per
// colour (33 colourable rats = exactly 11 each). Sewer is colourless.
function buildAllRats(ratMaster) {
  const kinds = [];
  for (const [kind, count] of Object.entries(ratMaster))
    for (let i = 0; i < count; i++) kinds.push(kind);
  shuffle(kinds);
  // Split colourable rats into an EXACT even colour allocation: build a pool of
  // colour slots (n/3 of each, remainder spread round-robin), shuffle it, and
  // deal one slot per rat. Guarantees the population is colour-balanced every
  // game, with heat evening out naturally since the kinds are shuffled first.
  const colourable = kinds.filter(k => RATS[k].col !== false);
  const colourless = kinds.filter(k => RATS[k].col === false);
  const nc = COLOURS.length;
  const per = Math.floor(colourable.length / nc);
  const slots = [];
  for (const c of COLOURS) for (let i = 0; i < per; i++) slots.push(c);
  let rem = colourable.length - slots.length, ci = Math.floor(Math.random() * nc);
  while (rem-- > 0) { slots.push(COLOURS[ci % nc]); ci++; }
  shuffle(slots);
  const pool = [];
  colourable.forEach((kind, i) => pool.push(makeRat(kind, slots[i])));
  for (const kind of colourless) pool.push(makeRat(kind, null));
  return pool;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── game construction ────────────────────────────────────────────────────
function newGame(playerDefs) {
  // playerDefs: [{id, name, bot}]
  const P = playerDefs.length;
  const cfg = deckConfig(P);

  const players = playerDefs.map((d, i) => ({
    id: d.id, name: d.name, bot: !!d.bot, seat: i,
    stars: STARS, rats: [], hand: [],
    armed: null,            // {cols:[], age:0} — one at a time
    boardup: 0, territorial: 0, _pelicanBy: null,
    alive: true, turns: 0,
  }));

  // deck = action cards + deck rats
  const deck = [];
  // Collect Scheduled cards separately so we can assign fixed colours with
  // EQUAL colour-appearances across all of them (no colour safer than another).
  const scheduledCards = [];
  const snapCards = [];
  const snap2Cards = [];
  for (const [type, count] of Object.entries(cfg.actions)) {
    for (let i = 0; i < count; i++) {
      if (type === 'sched1' || type === 'sched2') scheduledCards.push({ id: rid(), card: type });
      else if (type === 'wd_snap') snapCards.push({ id: rid(), card: type });
      else if (type === 'wd_snap2') snap2Cards.push({ id: rid(), card: type });
      else deck.push({ id: rid(), card: type });
    }
  }
  assignScheduledColours(scheduledCards);
  for (const c of scheduledCards) deck.push(c);
  // WD Snap: exactly equal copies of each colour (3/3/3 at 9 cards)
  snapCards.forEach((c, i) => { c.cols = [COLOURS[i % COLOURS.length]]; deck.push(c); });
  // WD Snap 2-colour: cyclic pairing (red/blue, blue/green, green/red, repeat)
  // gives each colour exactly 2 of every 3 cards — self-balanced regardless
  // of how many multiples of 3 you run.
  snap2Cards.forEach((c, i) => {
    c.cols = [COLOURS[i % COLOURS.length], COLOURS[(i + 1) % COLOURS.length]];
    deck.push(c);
  });
  // ── RATS: one master set, shuffled, then split ───────────────────────────
  // deckRats go into the shuffled deck; EVERYTHING ELSE goes to the bins, so
  // every rat in the set stays reachable. Which specific rats land in the deck
  // vs the bins is random each game — only the counts are fixed.
  // Ratato and Hot Ratato are folded into the same colour-balancing pass so
  // the whole rat population splits evenly across the three colours.
  const fullMaster = Object.assign({}, cfg.ratMaster,
    { ratato: cfg.ratatoRats, hotrat: cfg.hotratRats });
  const allRats = shuffle(buildAllRats(fullMaster));
  // Ratato/Hot Ratato always ride in the deck (they're drawn, not stocked);
  // the rest split deck/bins by the density-scaled count.
  const special = allRats.filter(r => r.kind === 'ratato' || r.kind === 'hotrat');
  const normal  = allRats.filter(r => r.kind !== 'ratato' && r.kind !== 'hotrat');
  for (const r of special) deck.push({ id: r.id, rat: r });
  for (const r of normal.slice(0, cfg.deckRats)) deck.push({ id: r.id, rat: r });
  shuffle(deck);

  const bins = normal.slice(cfg.deckRats).map(r => ({ id: r.id, rat: r }));

  const g = {
    players, deck, bins, discard: [], P,
    // THE ALLEY: 3 rats face-up beside the bins. Every card that reaches the
    // bins takes one of these three (a real choice). Refilled immediately.
    alley: [],
    reshuffleRats: cfg.reshuffleRats,
    turn: 0, active: 0, over: false, winner: null,
    log: [], pending: null,   // pending reaction window
    // ── Market Days ──────────────────────────────────────────────────────
    // Separate pool. One card flipped at the START of each round, applies that
    // round, then discards. 6 events, 1 copy each, cycling deck (reshuffled
    // when empty). g.market holds the currently-active round modifier.
    marketDeck: shuffle(buildMarketDeck()),
    marketDiscard: [],
    market: null,        // { event, ... } — the active round's modifier
    _roundCounter: 0,    // counts down alive-players; 0 → flip next market day
    _round: 0,            // total rounds elapsed (increments on each market flip)
    _firstElimTurn: null, // g.turn value at the first-ever elimination this game
  };

  // (Alpha is part of the master rat set — exactly 1 copy, landing in either
  // the deck or the bins at random like every other rat.)

  // deal hands (guarantee 1 Food each, rest from deck; rats and When-Drawn
  // cards can't sit in an opening hand — rats go to the bins, WD cards are set
  // aside and reshuffled back so they only ever fire when drawn in play).
  const setAside = [];
  for (const p of players) {
    p.hand.push({ id: rid(), card: 'food' });
    let dealt = 0;
    while (dealt < HAND - 1) {
      const c = drawCard(g);
      if (!c) break;
      if (c.rat) { g.bins.push(c); }
      else if (c.card === 'wd_snap' || c.card === 'wd_snap2' || c.card === 'wd_mole') { setAside.push(c); }
      else { p.hand.push(c); dealt++; }
    }
  }
  // shuffle the set-aside WD cards back into the deck
  for (const c of setAside) g.deck.push(c);
  shuffle(g.deck);
  refillAlley(g);
  logAdd(g, `Game start — ${P} players, first to weight ${THRESHOLD} wins.`);
  return g;
}

function drawCard(g) {
  if (g.deck.length === 0) {
    // Reshuffle: all spent cards from the discard, PLUS a fixed number of rats
    // pulled from the bins (lower density each cycle — rats grow scarce late game).
    const newDeck = g.discard.splice(0);
    const n = g.reshuffleRats || 7;
    // Take the top N rats off the bins, whatever type they are — no sorting.
    // (The deck already contains ability rats, so filtering by type served no
    // purpose and forced a manual sort at a physical table.)
    let take = 0;
    for (let i = 0; i < n; i++) {
      const idx = g.bins.findIndex(b => b.rat);
      if (idx < 0) break;
      newDeck.push(g.bins.splice(idx, 1)[0]);
      take++;
    }
    if (newDeck.length === 0) return null;   // nothing left anywhere
    g.deck = shuffle(newDeck);
    logAdd(g, `Deck reshuffled — ${take} rats return from the bins.`);
  }
  return g.deck.pop();
}

function logAdd(g, msg) { g.log.push(msg); if (g.log.length > 60) g.log.shift(); }

// ── stat helpers ───────────────────────────────────────────────────────────
const weight = p => p.rats.reduce((s, r) => s + r.w, 0);
const winWeight = (p) => weight(p);   // Alpha has no special win role; weight is weight
const heat   = p => p.rats.reduce((s, r) => s + r.heat, 0);
const ratOnCol = (r, cols) => r.cols ? r.cols.some(c => cols.includes(c)) : cols.includes(r.col);
const heatOf = (p, cols) => p.rats.reduce((s, r) => s + (ratOnCol(r, cols) ? r.heat : 0), 0);
const hasCol = (p, cols) => p.rats.some(r => ratOnCol(r, cols));

function opponents(g, p) { return g.players.filter(o => o.alive && o.id !== p.id); }

// ── rat entry (respects Territorial) ────────────────────────────────────────
function ratEnters(g, p, rat) {
  if (p.territorial > 0) { ratToBinsBottom(g, rat); return false; }
  if (p._rattrap) {
    // The trapper STEALS the rat that walks in. Trap is single-use: it springs
    // on the first rat to enter, then it's spent.
    const trapper = g.players.find(x => x.id === p._rattrap);
    p._rattrap = null;
    if (trapper && trapper.alive && trapper.id !== p.id) {
      trapper.rats.push(rat);
      logAdd(g, `${trapper.name}'s Rat Trap catches a ${rat.name} in ${p.name}'s kitchen — and takes it!`);
      checkWin(g, trapper);
    } else {
      ratToBinsBottom(g, rat);
      logAdd(g, `A Rat Trap catches a ${rat.name}!`);
    }
    return false;
  }
  
  p.rats.push(rat);
  return true;
}
// rats removed from play go to the BOTTOM of the rat-bin (recirculate)
function ratToBinsBottom(g, rat) { g.bins.unshift({ id: rat.id, rat }); }

// Keep the Alley topped up to 3 face-up rats from the bins.
const ALLEY_SIZE = 3;
function refillAlley(g) {
  while (g.alley.length < ALLEY_SIZE) {
    let idx = -1;
    for (let i = g.bins.length - 1; i >= 0; i--) { if (g.bins[i].rat) { idx = i; break; } }
    if (idx < 0) break;                       // bins exhausted
    g.alley.push(g.bins.splice(idx, 1)[0]);
  }
}
// Take a specific rat out of the Alley by id (or the first if unspecified).
function takeFromAlley(g, ratId) {
  let i = ratId ? g.alley.findIndex(c => c.rat && c.rat.id === ratId) : 0;
  if (i < 0) i = 0;
  const c = g.alley.splice(i, 1)[0];
  refillAlley(g);
  return c || null;
}
function ratToBins(g, p, rat) {
  p.rats = p.rats.filter(r => r.id !== rat.id);
  g.bins.push({ id: rat.id, rat });
}

// ── inspections ──────────────────────────────────────────────────────────────
function fireMole(g, owner, t) {
  if (tryWok(g, t)) { logAdd(g, `${t.name} wok-blocks the inspection.`); return; }
  damage(g, t, 1);
  logAdd(g, `Naked Mole Rat inspects ${t.name}: -1 star.`);
}
function fireScheduled(g, owner, t, cols) {
  if (tryWok(g, t)) { logAdd(g, `${t.name} wok-blocks the inspection.`); return; }
  const d = heatOf(t, cols);
  damage(g, t, d);
  logAdd(g, `Scheduled inspection hits ${t.name} for ${d} (${cols.join('/')}).`);
  // Toll Rat: inspector gives target a card
  if (t.alive && t.rats.some(r => r.prop === 'tax') && owner.hand.length) {
    const c = owner.hand.shift();
    t.hand.push(c);
    logAdd(g, `Toll Rat: ${owner.name} pays ${t.name} a card.`);
  }
}
function tryWok(g, t) {
  const i = t.hand.findIndex(c => c.card === 'wok');
  if (i >= 0) { g.discard.push(t.hand.splice(i, 1)[0]); return true; }
  return false;
}
function tryCat(g, t, rat) {
  // Cat is now a buff pre-placed on a rat. If that rat carries a shield, consume it.
  if (rat && rat._catShield) { rat._catShield = false; return true; }
  return false;
}

function damage(g, t, d, src) {
  if (d <= 0) return;
  t.stars -= d;
  if (t.stars <= 0) eliminate(g, t);
}
function eliminate(g, t) {
  if (g._firstElimTurn == null) g._firstElimTurn = g.turn;
  // Inheritance: whoever PLACED an Inheritance marker on this specific
  // player takes 2 of their cards at random when they fall.
  if (t._inheritBy) {
    const q = g.players.find(x => x.id === t._inheritBy);
    if (q && q.alive) {
      for (let k = 0; k < 2 && t.hand.length; k++) {
        const i = Math.floor(Math.random() * t.hand.length);
        q.hand.push(t.hand.splice(i, 1)[0]);
      }
      logAdd(g, `${q.name}'s Inheritance pays off — they take from ${t.name}'s fallen stall.`);
    }
  }
  t.alive = false;
  for (const r of t.rats) g.bins.push({ id: r.id, rat: r });   // rats to rat-bin
  t.rats = [];
  for (const c of t.hand) g.discard.push(c);   // spent/held cards to discard
  t.hand = [];
  t.armed = null;
  logAdd(g, `${t.name} is shut down!`);
}

// Alpha is a defensive rat only — no win condition. While it's in a kitchen,
// none of that kitchen's rats can be Poached (see ratEnters/poach handling).
function checkWin(g, p) {
  if (p.alive && winWeight(p, g.turn) >= THRESHOLD) {
    g.over = true; g.winner = p.id;
    logAdd(g, `${p.name} becomes RAT KING with weight ${weight(p)}!`);
    return true;
  }
  const alive = g.players.filter(x => x.alive);
  if (alive.length <= 1 && g.players.length > 1) {
    g.over = true; g.winner = alive[0] ? alive[0].id : null;
    if (alive[0]) {
      // Only call it "last kitchen standing" if eliminations actually happened.
      const anyElim = g._firstElimTurn != null;
      logAdd(g, anyElim
        ? `${alive[0].name} is the last kitchen standing — everyone else was shut down!`
        : `${alive[0].name} wins.`);
    }
    return true;
  }
  return false;
}

module.exports = {
  COLOURS, THRESHOLD, STARS, HAND, RATS, CARDS,
  newGame, drawCard, weight, winWeight, heat, heatOf, hasCol, opponents,
  refillAlley, takeFromAlley, ALLEY_SIZE,
  ratEnters, ratToBins, fireMole, fireScheduled, tryCat, damage,
  eliminate, checkWin, logAdd, shuffle, rid, makeRat, deckConfig,
  buildMarketDeck, MARKET_EVENTS,
};
