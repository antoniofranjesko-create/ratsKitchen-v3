// RAT'S KITCHEN v3 — GAME ENGINE
// Pure logic, no I/O. Server drives it; bots use the same API as humans.
// Rules locked per RATS_KITCHEN_V3_SPEC. Three stats: COUNT / WEIGHT / HEAT.
// Win: WEIGHT >= 5. Lose: 0 Stars. Inspections fine (never remove rats).

'use strict';

const COLOURS = ['red', 'blue', 'green'];
const THRESHOLD = 5;   // Rat King win at weight 5 (was 6) — pairs with unlimited card play   // weight to win
const STARS = 3;
const HAND = 7;
const ALPHA_COLOURS = 4;   // Alpha shows on all 4 colours (big inspection target)


// ── rat catalogue ────────────────────────────────────────────────────────
// weight, heat, prop, colourable
const RATS = {
  plain:  { name: 'Street Rat', w: 1, heat: 1, prop: null,          col: true,  desc: 'Plain stock. A small inspection risk.' },
  runner: { name: 'Runner Rat', w: 1, heat: 1, prop: 'draw_again',  col: true,  desc: 'Draw a card the moment it enters your kitchen.' },
  fat:    { name: 'Fat Rat',    w: 2, heat: 2, prop: 'no_cat',      col: true,  desc: 'Heavy stock — weight 2. Cannot be shielded by a Cat.' },
  sow:    { name: 'Sow Rat',    w: 2, heat: 2, prop: 'draw_or_play',col: true,  desc: 'While held, once per turn you may draw a card instead of playing.' },
  alpha:  { name: 'Alpha Rat',  w: 2, heat: 2, prop: 'alpha_guard', col: true,  desc: 'While Alpha is in your kitchen, none of your rats can be Poached. Cannot be Cat-shielded.' },
  sewer:  { name: 'Sewer Rat',  w: 1, heat: 0, prop: null,          col: false, desc: 'Colourless and heat 0 — invisible to inspection.' },
  toll:   { name: 'Toll Rat',   w: 1, heat: 1, prop: 'tax',         col: true,  desc: 'If inspected while you hold it, the inspector gives you a card.' },
  feral:  { name: 'Feral Rat',  w: 1, heat: 1, prop: 'no_dump',     col: true,  desc: 'Cannot be moved by sabotage or dump effects.' },
  spice:  { name: 'Spice Rat',  w: 1, heat: 1, prop: 'no_explode',  col: true,  desc: 'Cannot be Hot Chilli-d.' },
  boiler: { name: 'Boiler Rat', w: 1, heat: 1, prop: 'no_steal',    col: true,  desc: 'Cannot be Poached.' },
  larder: { name: 'Larder Rat', w: 1, heat: 1, prop: 'free_eat',    col: true,  desc: 'May eat itself for free — stars equal to its weight.' },
  grub:   { name: 'Grub Rat',   w: 1, heat: 2, prop: null,          col: true,  desc: 'Cheap stock but runs hot — weight 1, heat 2. A liability when the inspector calls.' },
  ratato: { name: 'Ratato Rat', w: 0, heat: 1, prop: 'sabotage',    col: true,  desc: 'No weight — worthless as stock, but carries heat. Play it into a RIVAL kitchen to draw the inspector eye. Never your own.' },
};

// action card catalogue: type -> {name, cls}
const CARDS = {
  mole:        { name: 'Health Inspection', sub: 'Naked Mole Rat', cls: 'attack', desc: 'Snap inspection. Any rival, flat -1 star, immediately. Colour-agnostic (the mole is blind).' },
  sched1:      { name: 'Health Inspection', sub: 'Scheduled — 1 Colour', cls: 'attack', desc: 'Has one fixed colour. Arm it, then on a later turn fire at a rival — damage = their heat in that colour. Whiffs if they hold none.' },
  sched2:      { name: 'Health Inspection', sub: 'Scheduled — 2 Colour', cls: 'attack', desc: 'Has two fixed colours. Arm it, then on a later turn fire at a rival — damage = their heat in those two colours. Whiffs if they hold neither.' },
  poach:       { name: 'Poach',           cls: 'attack', desc: 'Steal one weight-1 rat from a rival. Blocked by Boiler, and by any rat in an Alpha-guarded kitchen.' },
  switch:      { name: 'Switcheroo',      cls: 'attack', desc: 'Swap one of your rats for a rival-s, regardless of weight.' },
  chilli:      { name: 'Hot Chilli',      cls: 'attack', desc: 'Place on a rival-s rat (not Spice). It explodes at the start of your next turn — rat to the bins.' },
  hotratato:   { name: 'Hot Ratato',      cls: 'attack', desc: 'Dump any one of your rats into a rival kitchen — offload its heat onto them.' },
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
  recycle:     { name: 'Recycle Day',     cls: 'engine', desc: 'Take any one of the last 3 discarded action cards back into your hand.' },
  rattrap:     { name: 'Rat Trap',        cls: 'engine', desc: 'The next rat that would enter the trapped kitchen is caught and sent to the bins.' },
  exterm:      { name: 'Exterminator',    cls: 'engine', desc: 'Remove any one rat — yours or a rival-s — to the bins. Cool your own heat, or set a rival back.' },
  inherit:     { name: 'Inheritance',     cls: 'engine', desc: 'Place on a rival. If THAT rival is later shut down, you take 2 of their cards at random.' },
  gambit:      { name: 'Gambit',          cls: 'engine', desc: 'Look at the top 3 cards of the deck. Keep 1; put the other 2 back on top (you know what they are). Boost: keep 2.' },
};

// per-player-count deck config — LOCKED numbers (balance-confirmed via sim).
function deckConfig(P) {
  // Inspections: only the MOLE (colourless snap) scales with player count, and
  // it scales on a flattened curve (√ of P/6) so high-P games aren't flooded.
  // The coloured Scheduled cards are FIXED at sched1=9, sched2=6 so their
  // colour-slots total 9 + 12 = 21 = exactly 7 per colour (red/blue/green).
  // Scaling the coloured cards would break that even split.
  const inspScale = Math.pow(P / 6, 0.5);
  const HI_MULT = 0.85;                                    // overall inspection dial
  const mole   = Math.max(2, Math.round(8 * inspScale * HI_MULT));
  const sched1 = 9;                                        // FIXED, colour-balanced
  const sched2 = 6;                                        // FIXED, colour-balanced
  const actions = {
    mole, sched1, sched2,
    poach: 5, switch: 3, chilli: 4, hotratato: 4, grease: 3, klepto: 3, shakedown: 3,
    territorial: 3, wok: 2, boardup: 4,
    food: 12, cat: 3, lastresort: 3,
    delivery: 4, recycle: 3, rattrap: 5, exterm: 3, inherit: 3,
    gambit: 6,                                             // normal Engine card (was WD x3)
  };
  const ratatoRats = 5;
  const actionTotal = Object.values(actions).reduce((s, x) => s + x, 0);
  const TARGET_DENSITY = 0.22;    // deck rat density (plain+fat+ability sprinkle)
  const totalRats = Math.round(TARGET_DENSITY * actionTotal / (1 - TARGET_DENSITY));
  const deckRats = Math.max(6, totalRats - ratatoRats);
  const binSeed = 15;             // deliberate excess — some bin rats never get drawn
  const reshuffleRats = 7;        // plain/fat rats reclaimed from bins at each reshuffle
  const fatShare = 0.15;          // deck rat mix: 30% plain / 15% fat / 55% ability
  const plainShare = 0.30;
  return { actions, deckRats, ratatoRats, binSeed, reshuffleRats, fatShare, plainShare };
}

// ── Market Day event pool (start-of-round events) ──────────────────────────
// 6 events, 1 copy each. Health Scare CUT (too swingy/silly per design call).
// Curfew CUT to hit 6 — it's a pure social-layer no-op vs bots anyway.
// Cheese Glut and Rat Boom remain parked from the prior pass.
const MARKET_EVENTS = [
  { event: 'rat_release',  name: 'Rat Release',       desc: 'The player holding the fewest rats draws 1 rat from the bins.' },
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
  const r = {
    id: rid(), kind, name: d.name, w: d.w, heat: d.heat,
    prop: d.prop, col: d.col ? colour : null,
  };
  if (kind === 'alpha') {
    const shuf = COLOURS.slice().sort(() => Math.random() - 0.5);
    r.cols = shuf.slice(0, ALPHA_COLOURS);
    r.col = r.cols[0];
  }
  return r;
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

function buildRatPool(n, opts) {
  opts = opts || {};
  // ── mix selection ──────────────────────────────────────────────────────
  // 'deck': 30% Street / 15% Fat / 55% ability rats — the shuffled main deck.
  // 'bins': a heavier ability concentration plus the deck-excluded exclusives
  //         (Sewer; Alpha is added separately, guaranteed exactly once). Pulling
  //         from the bins therefore stays a genuine bonus over a deck draw.
  //         'all': legacy full mix, kept only for isolation testing.
  let mix;
  if (opts.mixSource === 'deck') {
    // Deck rat mix (Koko-specified): ~30% Street (plain), ~15% Fat, the
    // remaining ~55% spread across the ability rats. The bins still hold a
    // heavier ability concentration plus the deck-excluded exclusives
    // (Sewer, Alpha), so pulling from the bins stays a genuine bonus.
    const plainShare = opts.plainShare != null ? opts.plainShare : 0.30;
    const fatShare = opts.fatShare != null ? opts.fatShare : 0.15;
    const abilityShare = Math.max(0, 1 - plainShare - fatShare);
    const ability = [
      ['runner', 1], ['sow', 1], ['toll', 1], ['feral', 1],
      ['spice', 1], ['boiler', 1], ['larder', 1], ['grub', 1],
    ];
    const aTot = ability.reduce((s, [, w]) => s + w, 0);
    mix = [['plain', plainShare], ['fat', fatShare],
           ...ability.map(([k, w]) => [k, abilityShare * w / aTot])];
  } else if (opts.mixSource === 'bins') {
    const raw = [
      ['runner', 0.15], ['sow', 0.05], ['sewer', 0.12], ['toll', 0.10],
      ['feral', 0.10], ['spice', 0.08], ['boiler', 0.08], ['larder', 0.07], ['grub', 0.13],
    ];
    const tot = raw.reduce((s, [, w]) => s + w, 0);
    mix = raw.map(([k, w]) => [k, w / tot]);
  } else {
    // legacy 'all' mix (pre-split; isolation-test only)
    mix = [
      ['plain', 0.22], ['runner', 0.15], ['fat', 0.12], ['sow', 0.04],
      ['alpha', 0.06], ['sewer', 0.10], ['toll', 0.08], ['feral', 0.08],
      ['spice', 0.06], ['boiler', 0.05], ['larder', 0.04], ['grub', 0.10],
    ];
  }
  // 1) pick types
  const picked = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random(), pick = 'plain';
    for (const [k, wgt] of mix) { r -= wgt; if (r <= 0) { pick = k; break; } }
    picked.push(pick);
  }
  // 2) assign colours to EQUALISE total heat per colour (§5.2).
  //    Colourless rats (Sewer) skip. Greedily place each coloured rat on the
  //    colour with the least heat so far — random tie-break — so heat is even
  //    but which rats land where is effectively random.
  const heatByCol = { red:0, blue:0, green:0, yellow:0 };
  const pool = [];
  // shuffle order so assignment isn't type-ordered
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [picked[i],picked[j]]=[picked[j],picked[i]]; }
  for (const kind of picked) {
    const d = RATS[kind];
    if (d.col === false) { pool.push(makeRat(kind, null)); continue; }
    // choose the lowest-heat colour, random among ties
    let min = Infinity; for (const c of COLOURS) min = Math.min(min, heatByCol[c]);
    const cands = COLOURS.filter(c => heatByCol[c] === min);
    const colour = cands[Math.floor(Math.random()*cands.length)];
    heatByCol[colour] += d.heat;
    pool.push(makeRat(kind, colour));
  }
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
    boardup: 0, territorial: 0,
    alive: true, turns: 0,
  }));

  // deck = action cards + deck rats
  const deck = [];
  // Collect Scheduled cards separately so we can assign fixed colours with
  // EQUAL colour-appearances across all of them (no colour safer than another).
  const scheduledCards = [];
  for (const [type, count] of Object.entries(cfg.actions)) {
    for (let i = 0; i < count; i++) {
      if (type === 'sched1' || type === 'sched2') scheduledCards.push({ id: rid(), card: type });
      else deck.push({ id: rid(), card: type });
    }
  }
  assignScheduledColours(scheduledCards);
  for (const c of scheduledCards) deck.push(c);
  // ── DECK rats: plain + fat ONLY. Every ability rat lives in the bins —
  // pulling from the bins (Special Delivery, the Rat Release market event)
  // is a genuine bonus over a plain deck draw, not just a shortcut.
  for (const r of buildRatPool(cfg.deckRats, { mixSource: 'deck', fatShare: cfg.fatShare, plainShare: cfg.plainShare })) deck.push({ id: r.id, rat: r });
  // Ratato Rats (0 weight, 1 heat) — held in hand, not "kitchen stock" in the
  // plain/fat sense, so they stay in the shuffled deck alongside action cards.
  for (let i = 0; i < cfg.ratatoRats; i++) deck.push({ id: rid(), rat: makeRat('ratato', COLOURS[i % COLOURS.length]) });
  shuffle(deck);

  // ── BINS: every ability rat (runner/sow/sewer/toll/feral/spice/boiler/
  // larder/grub) seeded here, never in the shuffled deck.
  const bins = buildRatPool(cfg.binSeed, { mixSource: 'bins' }).map(r => ({ id: r.id, rat: r }));

  const g = {
    players, deck, bins, discard: [], P,
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

  // Alpha Rat: guaranteed exactly one copy, placed in the BINS (not the deck —
  // it's an ability rat like the rest). Reached via Special Delivery / Rat
  // Release, same as every other special rat.
  {
    const strip = arr => arr.filter(x => !(x.rat && x.rat.kind === 'alpha'));
    g.deck = strip(g.deck); g.bins = strip(g.bins);
    const alpha = makeRat('alpha', COLOURS[Math.floor(Math.random()*COLOURS.length)]);
    const at = Math.floor(Math.random() * (g.bins.length + 1));
    g.bins.splice(at, 0, { id: alpha.id, rat: alpha });
  }

  // deal hands (guarantee 1 Food each, rest from deck non-rats)
  for (const p of players) {
    p.hand.push({ id: rid(), card: 'food' });
    let dealt = 0;
    while (dealt < HAND - 1) {
      const c = drawCard(g);
      if (!c) break;
      if (c.rat) { g.bins.push(c); }
      else { p.hand.push(c); dealt++; }
    }
  }
  logAdd(g, `Game start — ${P} players, first to weight ${THRESHOLD} wins.`);
  return g;
}

function drawCard(g) {
  if (g.deck.length === 0) {
    // Reshuffle: all spent cards from the discard, PLUS a fixed number of rats
    // pulled from the bins (lower density each cycle — rats grow scarce late game).
    const newDeck = g.discard.splice(0);
    const n = g.reshuffleRats || 7;
    // Only plain/fat-kind rats return to the deck at reshuffle — ability rats
    // (which only ever reach the bins via removal-from-play, since none are
    // seeded there) must stay bin-exclusive, or the "deck = plain/fat only"
    // rule quietly breaks after the first reshuffle.
    const ratsAvailable = g.bins.filter(b => b.rat && (b.rat.kind === 'plain' || b.rat.kind === 'fat'));
    const take = Math.min(n, ratsAvailable.length);
    for (let i = 0; i < take; i++) {
      // pull from the TOP of the rat-bin, skipping ability rats
      const idx = g.bins.findIndex(b => b.rat && (b.rat.kind === 'plain' || b.rat.kind === 'fat'));
      if (idx >= 0) newDeck.push(g.bins.splice(idx, 1)[0]);
    }
    if (newDeck.length === 0) return null;   // nothing left anywhere
    g.deck = shuffle(newDeck);
    logAdd(g, `Deck reshuffled — ${take} plain/fat rats return from the bins (ability rats stay buried).`);
  }
  return g.deck.pop();
}

function logAdd(g, msg) { g.log.push(msg); if (g.log.length > 60) g.log.shift(); }

// ── stat helpers ───────────────────────────────────────────────────────────
const weight = p => p.rats.reduce((s, r) => s + r.w, 0);
// Alpha must be held one full round before it can complete a win.
const winWeight = (p, turn) => p.rats.reduce((s, r) => {
  if (r.kind === 'alpha' && r._enteredTurn === turn) return s; // not yet counted
  return s + r.w;
}, 0);
const heat   = p => p.rats.reduce((s, r) => s + r.heat, 0);
const ratOnCol = (r, cols) => r.cols ? r.cols.some(c => cols.includes(c)) : cols.includes(r.col);
const heatOf = (p, cols) => p.rats.reduce((s, r) => s + (ratOnCol(r, cols) ? r.heat : 0), 0);
const hasCol = (p, cols) => p.rats.some(r => ratOnCol(r, cols));

function opponents(g, p) { return g.players.filter(o => o.alive && o.id !== p.id); }

// ── rat entry (respects Territorial) ────────────────────────────────────────
function ratEnters(g, p, rat) {
  if (p.territorial > 0) { ratToBinsBottom(g, rat); return false; }
  if (p._rattrap) { p._rattrap = null; ratToBinsBottom(g, rat); logAdd(g, `A Rat Trap catches a ${rat.name}!`); return false; }
  if (rat.kind === 'alpha') rat._enteredTurn = g.turn;
  p.rats.push(rat);
  return true;
}
// rats removed from play go to the BOTTOM of the rat-bin (recirculate)
function ratToBinsBottom(g, rat) { g.bins.unshift({ id: rat.id, rat }); }
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

function alphaWin(p, turn) {
  const alpha = p.rats.find(r => r.kind === 'alpha');
  if (!alpha) return false;
  if (alpha._enteredTurn === turn) return false;      // hold-one-round
  return p.rats.length >= 4;  // Alpha wins with 4 rats total (itself + 3), any weights
}

function checkWin(g, p) {
  if (p.alive && (winWeight(p, g.turn) >= THRESHOLD || alphaWin(p, g.turn))) {
    g.over = true; g.winner = p.id;
    logAdd(g, `${p.name} becomes RAT KING with weight ${weight(p)}!`);
    return true;
  }
  const alive = g.players.filter(x => x.alive);
  if (alive.length <= 1) {
    g.over = true; g.winner = alive[0] ? alive[0].id : null;
    if (alive[0]) logAdd(g, `${alive[0].name} is the last kitchen standing.`);
    return true;
  }
  return false;
}

module.exports = {
  COLOURS, THRESHOLD, STARS, HAND, RATS, CARDS,
  newGame, drawCard, weight, winWeight, alphaWin, heat, heatOf, hasCol, opponents,
  ratEnters, ratToBins, fireMole, fireScheduled, tryCat, damage,
  eliminate, checkWin, logAdd, shuffle, rid, makeRat, deckConfig,
  buildMarketDeck, MARKET_EVENTS,
};
