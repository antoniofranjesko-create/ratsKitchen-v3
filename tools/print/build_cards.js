// Rat's Kitchen long mode (L1.5) — print-and-play card sheets.
// Poker cards (63 x 88 mm) 9 per A4, mini cards (44 x 63 mm) 16 per A4, edge to edge with crop marks.
// Art: drop an image named <key>.png / .jpg / .webp into tools/print/art/ (keys printed on each placeholder), then rerun.
// Usage: node tools/print/build_cards.js   -> tools/print/out/cards.html + cards.pdf
const fs = require('fs'), path = require('path');
const { art } = require('./art');
const ART = path.join(__dirname, 'art'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(ART, { recursive: true });

const NEST = { grill: ['➰', 'Rex', '#c4552f'], cold: ['🥚', 'Hairless', '#c75c8a'], pantry: ['👂', 'Dumbo', '#3a74b0'] };
const SIDE = {
  rival: ['Attack', '#b8322a'], you: ['Defend', '#2e8a55'], either: ['Attack or Defend', '#7a4ea3'],
  react: ['Reaction · free', '#2b62a0'], snap: ['Fires when drawn', '#7d4a1e'], day: ['Market Day', '#5b5b5b'],
  ref: ['Reference', '#333'], food: ['Pile', '#4f8a2e'], token: ['Token', '#555'],
};
const STARS = '3 players 7 · 4 players 6 · 5 players 5 · 6 players 4';

// ---------- market deck (81 + 4 Hot Ratato) ----------
const M = [];
const add = (n, c) => { for (let i = 0; i < n; i++) M.push({ ...c }); };
for (const n of ['grill', 'cold', 'pantry']) add(2, { key: 'sched1', side: 'rival', title: 'Scheduled Inspection', nests: [n], icon: '🦅',
  text: '<b>Arm it</b> in front of you. On your <b>next</b> turn, fire it at a rival for free: they lose stars equal to the total heat of their rats of this breed. Not fired that turn → it expires. One armed at a time.' });
for (const pair of [['grill', 'cold'], ['cold', 'pantry'], ['pantry', 'grill']]) add(2, { key: 'sched2', side: 'rival', title: 'Scheduled Inspection', nests: pair, icon: '🦅',
  text: '<b>Arm it</b> in front of you. On your <b>next</b> turn, fire it at a rival for free and <b>pick one</b> of its two breeds: they lose stars equal to the heat of their rats of that breed. Expires if not fired.' });
add(3, { key: 'mole', side: 'rival', title: 'Health Inspection', sub: 'Naked Mole Rat', icon: '🦫', text: 'A rival loses <b>1 star</b>, whatever their rats.' });
for (const n of ['grill', 'cold', 'pantry']) add(2, { key: 'snap', side: 'snap', title: 'Snap Inspection', nests: [n], icon: '🦅',
  text: 'Fires on <b>you</b> the moment you draw it: lose stars equal to the heat of your rats of this breed. Then discard it.' });
add(2, { key: 'snapmole', side: 'snap', title: 'Snap Inspection', sub: 'Mole', icon: '🦫', text: 'Fires on <b>you</b> the moment you draw it: lose <b>1 star</b>. Then discard it.' });
add(5, { key: 'poach', side: 'rival', title: 'Poach', icon: '🎣', text: 'Steal a <b>weight-1</b> rat from a rival\'s kitchen. You choose which.' });
add(2, { key: 'fight', side: 'rival', title: 'Scrap Fight', icon: '🥊', text: 'Challenge a rival (you both need a rat). Each secretly picks one of their own rats; reveal together. <b>Longer Teeth wins</b>; the winning rat goes back into the rat deck. If <b>you</b> win, they lose 1 star.' });
add(3, { key: 'klepto', side: 'rival', title: 'Kleptomaniac', icon: '🧤', text: 'Take a random card from a rival\'s hand.' });
add(4, { key: 'quente', side: 'rival', title: 'Ratata Quente', icon: '🌡️', text: 'Dump one of <b>your</b> rats into a rival\'s kitchen.' });
add(4, { key: 'hotratato', side: 'rival', title: 'Hot Ratato', icon: '🥔', stats: [0, 1, null], text: 'Throw this junk rat into a rival\'s kitchen, where it stays as a rat (weight 0, heat 1, no breed).' });
add(3, { key: 'muzzle', side: 'rival', title: 'Muzzle', icon: '🤐', text: 'Tuck under a rival\'s rat: it <b>loses its ability</b> while the Muzzle stays.' });
add(4, { key: 'disease', side: 'rival', title: 'Disease', icon: '🦠', text: 'Tuck under a rival\'s rat: <b>+1 heat</b>.' });
add(4, { key: 'chilli', side: 'rival', title: 'Hot Chilli', icon: '🌶️', text: 'Place on a rival\'s rat. At the start of <b>their</b> next turn it goes off: the rat goes back into the rat deck.' });
add(3, { key: 'territorial', side: 'rival', title: 'Territorial', icon: '🚧', text: 'Place on a rival\'s kitchen: it <b>can\'t receive rats</b> until the end of their next turn. They discard it then.' });
add(3, { key: 'inherit', side: 'rival', title: 'Inheritance', icon: '📜', text: 'Place on a rival. If they\'re shut down, <b>take 2 of their cards</b> first.' });
add(4, { key: 'boardup', side: 'you', title: 'Board Up', icon: '🔨', text: 'Your kitchen <b>can\'t be attacked</b> until your next turn.' });
add(4, { key: 'lastresort', side: 'you', title: 'Last Resort', icon: '🍽️', text: 'Put one of your rats back into the rat deck; <b>regain stars</b> equal to its weight.' });
add(4, { key: 'backdoor', side: 'you', title: 'Back Door', icon: '🚪', text: 'Shuffle one of your rats (and anything tucked under it) back into the rat deck, then <b>take the top rat</b>. Not while a Territorial is on you.' });
add(3, { key: 'cat', side: 'you', title: 'Cat', icon: '🐱', text: 'Place on one of your rats: it\'s <b>shielded</b> from the next card aimed at it.' });
add(6, { key: 'delivery', side: 'either', title: 'Special Delivery', icon: '🚚', text: 'Put the top rat of the rat deck into <b>any</b> kitchen. Counts as Attack or Defend, by where it goes.' });
add(3, { key: 'grease', side: 'react', title: 'Grease the Palm', icon: '💰', text: 'On another player\'s turn: <b>cancel one inspection</b> aimed at you.' });
add(3, { key: 'wok', side: 'react', title: 'Wok Block', icon: '🍳', text: 'On another player\'s turn: <b>cancel any other attack</b> aimed at you.' });

// ---------- other poker cards ----------
const P2 = [];
const day = (key, title, text, icon) => P2.push({ key, side: 'day', title, icon, text });
day('day_release', 'Rat Release', 'The player with the <b>fewest rats</b> takes the top rat of the rat deck. Tie: fewest cards. Still tied: they all draw a market card instead.', '🐀');
day('day_frenzy', 'Frenzy', 'Everyone draws a market card.', '🎉');
day('day_blackout', 'Blackout', 'Everyone discards a card.', '🌑');
day('day_piper', 'Pied Piper', 'Everyone secretly picks one of their own rats, then all pass them left at once.', '🪈');
day('day_roulette', 'Russian Roulette', 'Everyone puts 1 card face-down. Shuffle in the spare Mole, deal one back to each player, bin the leftover unseen. Whoever gets the Mole is inspected (−1 star).', '🎲');
day('day_dayoff', "Inspector's Day Off", 'No inspection can be armed this round. Already-armed ones still fire.', '🏖️');
P2.push({ key: 'sparemole', side: 'day', title: 'Spare Mole', sub: 'for Russian Roulette', icon: '🦫', text: 'Keep beside the Market Day pile. Used only by Russian Roulette.' });
for (let i = 0; i < 6; i++) P2.push({ key: 'ref', side: 'ref', title: 'Your turn', ref: true });
const POKER = [...M, ...P2];

// ---------- rat deck (37) ----------
const RATS = [
  ['plain', 'Street Rat', 1, 1, [10, 15, 18, 21], 'None.'],
  ['fat', 'Fat Rat', 2, 2, [1, 2, 8, 12, 13, 30], 'None.'],
  ['hog', 'Hog Rat', '1–3', 1, [6, 9, 19], '<b>Feed 1:</b> tuck the Food under it for +1 weight (max 3).'],
  ['runner', 'Runner Rat', 1, 1, [7, 16, 31], '<b>Feed 1:</b> draw a market card.'],
  ['breeder', 'Breeder Rat', 1, 1, [20, 27], '<b>Feed 3:</b> take the top rat of the rat deck.'],
  ['scav', 'Scavenger Rat', 1, 1, [33, 34], '<b>Feed 1:</b> take a random card from a closed stall.'],
  ['toll', 'Toll Rat', 1, 1, [11, 17, 28], 'When a rival inspects your kitchen, they give you a card from their hand.'],
  ['alpha', 'Alpha Rat', 2, 2, [24], 'When a rival poaches from you, pay 1 Food to stop it.'],
  ['feral', 'Feral Rat', 1, 1, [25, 39], 'Rivals can\'t Poach it or Hot Chilli it.'],
  ['spice', 'Spice Rat', 1, 1, [14, 32], 'Can\'t be debuffed (Hot Chilli, Muzzle, Disease).'],
  ['grub', 'Grub Rat', 1, 2, [35, 36, 37], 'None: cheap but runs hot.'],
  ['sewer', 'Sewer Rat', 1, 0, [26, 38], 'No breed (a mongrel): no inspection can touch it.'],
  ['ratato', 'Ratato', 0, 1, [3, 5, 23, 29], 'None: junk.'],
];
const NESTS = ['grill', 'cold', 'pantry']; let rot = 0;
const MINI = [];
for (const [key, title, w, h, teeth, text] of RATS) for (const t of teeth)
  MINI.push({ key, rat: true, title, w, h, teeth: t, text, nest: key === 'sewer' ? null : NESTS[rot++ % 3] });
for (let i = 0; i < 27; i++) MINI.push({ key: 'food', side: 'food', title: 'Food', icon: '🍜', food: true });

// ---------- rendering ----------
const artFor = key => { for (const ext of ['png', 'jpg', 'jpeg', 'webp']) { const f = path.join(ART, `${key}.${ext}`); if (fs.existsSync(f)) return 'file://' + f; } return null; };
const nestBadge = n => `<span class="nest" style="background:${NEST[n][2]}">${NEST[n][0]} ${NEST[n][1]}</span>`;
let WEB = false;
const artFile = c => c.key === 'sewer' ? 'sewer' : c.breed ? `${c.key}_${c.breed}` : c.key;
const artBox = (c, h) => {
  if (WEB) { const v = art(c.key, { breed: c.breed }); return `<div class="art vec" data-art="${artFile(c)}" style="height:${h}mm">${v || ''}</div>`; }
  const a = artFor(c.key + (c.breed ? '_' + c.breed : '')) || artFor(c.key), v = a ? null : art(c.key, { breed: c.breed });
  if (v) return `<div class="art vec" style="height:${h}mm">${v}</div>`;
  return a ? `<div class="art" style="height:${h}mm;background-image:url('${a}')"></div>`
    : `<div class="art ph" style="height:${h}mm"><span class="emo">${c.icon || '🐀'}</span><span class="artkey">art: ${c.key}</span></div>`; };

function poker(c) {
  const [label, col] = SIDE[c.side];
  if (c.ref) return `<div class="card poker" style="--c:${col}"><div class="band">${label}</div><div class="title">Your turn</div>
    <ol class="ref"><li><b>Rat King check:</b> 10+ rat weight = you win.</li><li>Cards on your rats or kitchen <b>resolve</b> (Hot Chilli goes off).</li>
    <li><b>Draw 1</b> market card.</li>
    <li><b>One choice:</b> play up to 2 cards (<span style="color:${SIDE.rival[1]}">1 Attack</span> + <span style="color:${SIDE.you[1]}">1 Defend</span>) · or take the top rat · or draw another card · or take 1 Food.</li>
    <li><b>End:</b> a Territorial on you ends.</li></ol>
    <div class="small"><b>Free on your turn:</b> fire your armed inspection; feed rats (each once). <b>Heal:</b> 3 Food = 1 star (your Defend card).<br>
    <b>Three of a kind:</b> first time you hold 3 rats of one breed, take 1 Food, then turn this card over (once per game).<br><b>Stars:</b> ${STARS}.</div></div>`;
  const nests = c.nests ? `<div class="nests">${c.nests.map(nestBadge).join(c.nests.length > 1 ? '<span class="or">or</span>' : '')}</div>` : '';
  const stats = c.stats ? `<div class="stats">${stat('Weight', c.stats[0])}${stat('Heat', c.stats[1])}</div>` : '';
  return `<div class="card poker" style="--c:${col}"><div class="band">${label}</div><div class="title">${c.title}</div>${c.sub ? `<div class="sub">${c.sub}</div>` : ''}
    ${artBox(c, c.nests || c.stats ? 28 : 33)}${nests}${stats}<div class="text">${c.text}</div><div class="foot">Rat's Kitchen · long mode</div></div>`;
}
const stat = (l, v) => `<div class="stat"><div class="sv">${v}</div><div class="sl">${l}</div></div>`;
function mini(c) {
  if (c.rat) {
    const col = c.nest ? NEST[c.nest][2] : '#6b6b6b';
    return `<div class="card mini" style="--c:${col}"><div class="mband"><span>${c.title}</span><span>${c.nest ? NEST[c.nest][0] : '🚫'}</span></div>
      ${artBox({ key: c.key, icon: '🐀', breed: c.nest }, 17)}<div class="mnest">${c.nest ? NEST[c.nest][1] : 'No breed'}</div>
      <div class="stats m">${stat('Weight', c.w)}${stat('Heat', c.h)}${stat('Teeth', c.teeth)}</div><div class="mtext">${c.text}</div></div>`;
  }
  const [label, col] = SIDE[c.side];
  const body = c.food ? 'Spend for <b>feeding</b> rats, or <b>3 Food = 1 star</b>. Spent Food goes back to the Food pile.'
    : 'The first time you hold <b>3 rats of one breed</b>, hand this in and take 1 Food. Once per game.';
  return `<div class="card mini" style="--c:${col}"><div class="mband"><span>${c.title}</span><span>${label}</span></div>${artBox(c, 24)}<div class="mtext big">${body}</div></div>`;
}
function sheets(cards, kind) {
  const cols = kind === 'poker' ? 3 : 4, rows = kind === 'poker' ? 3 : 4, W = kind === 'poker' ? 63 : 44, H = kind === 'poker' ? 88 : 63;
  const per = cols * rows, gw = cols * W, gh = rows * H, ml = (210 - gw) / 2, mt = (297 - gh) / 2, out = [];
  for (let s = 0; s < cards.length; s += per) {
    const chunk = cards.slice(s, s + per), cells = chunk.map(c => kind === 'poker' ? poker(c) : mini(c)).join('');
    let marks = '';
    for (let i = 0; i <= cols; i++) { const x = ml + i * W; marks += `<i class="v" style="left:${x}mm;top:${mt - 6}mm"></i><i class="v" style="left:${x}mm;top:${mt + gh + 1}mm"></i>`; }
    for (let j = 0; j <= rows; j++) { const y = mt + j * H; marks += `<i class="h" style="top:${y}mm;left:${ml - 6}mm"></i><i class="h" style="top:${y}mm;left:${ml + gw + 1}mm"></i>`; }
    out.push(`<section class="page">${marks}<div class="grid" style="left:${ml}mm;top:${mt}mm;grid-template-columns:repeat(${cols},${W}mm);grid-auto-rows:${H}mm">${cells}</div>
      <div class="pnote">${kind === 'poker' ? 'Poker 63 × 88 mm' : 'Mini 44 × 63 mm'} · sheet ${s / per + 1} of ${Math.ceil(cards.length / per)} · print at 100% (no scaling)</div></section>`);
  }
  return out;
}
const css = `@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'DejaVu Sans Condensed','DejaVu Sans',sans-serif;color:#1d1d1d}
.page{position:relative;width:210mm;height:297mm;page-break-after:always;overflow:hidden}.grid{position:absolute;display:grid}
i.v{position:absolute;width:0;height:5mm;border-left:.2mm solid #000}i.h{position:absolute;height:0;width:5mm;border-top:.2mm solid #000}
.pnote{position:absolute;bottom:6mm;width:100%;text-align:center;font-size:7pt;color:#888}
.card{position:relative;border:.25mm solid #bbb;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.poker{padding:0 3.2mm 2.2mm;border-top:0}.band{margin:0 -3.2mm;background:var(--c);color:#fff;font:600 6.8pt Poppins,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:1.2mm 3.2mm}
.title{font:600 11pt/1.1 Poppins,sans-serif;margin-top:1.6mm}.sub{font-size:6.8pt;color:#666;margin-top:.3mm}
.art{margin:1.6mm 0 1.2mm;border-radius:1.5mm;background-size:cover;background-position:center;border:.3mm solid var(--c)}
.vec{overflow:hidden;line-height:0}.vec svg{display:block}.ph{display:flex;flex-direction:column;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#fafafa 0 2mm,#f1f1f1 2mm 4mm)}
.emo{font-family:'Noto Color Emoji';font-size:28pt;line-height:1}.mini .emo{font-size:15pt}.artkey{font-size:5pt;color:#aaa;margin-top:.8mm}
.nests{display:flex;align-items:center;gap:1mm;margin-bottom:1.2mm}.nest{color:#fff;border-radius:1mm;padding:.5mm 1.5mm;font:600 7pt Poppins,sans-serif}.or{font-size:6.5pt;color:#666}
.text{font-size:9.2pt;line-height:1.28;flex:1}.foot{font-size:5pt;color:#aaa;text-align:right}
.stats{display:flex;gap:1.2mm;margin-bottom:1.2mm}.stat{flex:1;border:.3mm solid var(--c);border-radius:1mm;text-align:center;padding:.4mm 0}
.sv{font:600 11pt/1 Poppins,sans-serif}.sl{font-size:5pt;text-transform:uppercase;letter-spacing:.06em;color:#555}
.mini{padding:0 2.2mm 1.6mm;border-top:0}.mband{margin:0 -2.2mm;background:var(--c);color:#fff;font:600 7pt Poppins,sans-serif;padding:1mm 2.2mm;display:flex;justify-content:space-between;align-items:center}
.mband span:last-child{font-family:'Noto Color Emoji',Poppins;font-size:7pt}.mini .art{margin:1.2mm 0 .8mm}.mnest{font:600 6pt Poppins,sans-serif;color:var(--c);margin-bottom:.8mm}
.stats.m .sv{font-size:9.5pt}.mtext{font-size:7.2pt;line-height:1.2}.mtext.big{font-size:7.6pt}
.rules{padding:12mm 13mm}.rcols{columns:2;column-gap:7mm;font-size:8.4pt;line-height:1.32}.rcols h1{column-span:all;font:600 16pt Poppins,sans-serif;margin:0 0 2mm}.rcols h2{font:600 10.5pt Poppins,sans-serif;margin:3mm 0 1mm;color:#b8322a;break-after:avoid}.rcols p,.rcols li{margin:0 0 1.2mm}.rcols ol,.rcols ul{margin:0 0 1.5mm;padding-left:4.5mm}.rcols ul ul{margin-top:.8mm}.tag{text-align:center;margin-top:3mm!important}
.ref{font-size:7.9pt;line-height:1.26;padding-left:4mm;margin:1.2mm 0}.ref li{margin-bottom:.5mm}.small{font-size:7pt;line-height:1.25;color:#333}`;

// ---------- full instructions (last pages) ----------
const RULES = `<section class="page rules"><div class="rcols">
<h1>Rat's Kitchen · Long mode rules</h1>
<p>A 30-minute game for 3–6 players. You run a stall in the night market, build up your rats, and bring the Health Inspector down on everyone else.</p>
<h2>Winning</h2>
<p><b>Rat King:</b> start your own turn with <b>10 or more rat weight</b> in your kitchen. Reaching 10 isn't enough on its own: you must still hold it when your next turn begins, so everyone gets one round to knock you down.<br>
<b>Last stall standing:</b> every other stall has been shut down.</p>
<h2>Components</h2>
<p>Market deck: 81 cards + 4 Hot Ratato · Rat deck: 37 rats · Market Day: 6 cards + 1 spare Mole · Food pile: 27 Food cards · 6 reference cards. <b>Also needed:</b> star tokens (coins or beads; up to 7 per player) and a first-player marker.</p>
<h2>Setup</h2>
<ol><li>Shuffle the <b>market deck</b> and the <b>rat deck</b> separately, side by side.</li>
<li>Each player takes stars: <b>${STARS}</b>.</li>
<li>Each player takes a reference card and <b>2 Food</b>.</li>
<li>Deal each player <b>6 market cards</b>. Any Snap Inspection or Hot Ratato dealt is set aside and shuffled back in afterwards.</li>
<li>Put the <b>Market Day</b> cards in a face-up pile, the spare Mole beside it, and the Food pile in the middle.</li>
<li>Give the starting player the first-player marker. Play passes left.</li></ol>
<h2>The table</h2>
<ul><li><b>Your kitchen</b> (your rats and anything on them) is public. <b>Your hand</b> is secret. There is <b>no hand limit</b>.</li>
<li><b>Breeds:</b> every rat is a <b>Rex</b> ➰, <b>Hairless</b> 🥚 or <b>Dumbo</b> 👂. Sewer Rats have no breed. Inspections check one breed.</li>
<li><b>Rat deck:</b> face-down. Any rat leaving play is shuffled back into it, and anything on it is discarded.</li>
<li><b>Closed stalls:</b> a shut-down stall's hand stays on the table as a face-down pile.</li>
<li><b>Food</b> is a card in your hand. Spent Food goes back to the Food pile.</li>
<li><b>Touch rule:</b> you can affect each rival's kitchen only once per turn.</li></ul>
<h2>Your turn</h2>
<ol><li><b>Rat King check:</b> 10+ rat weight now, you win.</li>
<li><b>Resolve</b> cards on your rats or kitchen: a Hot Chilli on your rat goes off (the rat goes back into the rat deck).</li>
<li><b>Draw 1</b> market card. A Snap Inspection fires on you straight away.</li>
<li><b>Make one choice:</b>
 <ul><li><b>Play cards:</b> up to 2, <b>1 Attack</b> (aimed at a rival: their kitchen, rats or hand) and <b>1 Defend</b> (on your own kitchen). Arming a Scheduled Inspection is your Attack. Special Delivery counts as whichever kitchen the rat goes to. The table can agree 1 card instead.</li>
 <li><b>Take a rat:</b> the top rat of the rat deck goes into your kitchen.</li>
 <li><b>Draw</b> another market card.</li>
 <li><b>Take 1 Food</b> from the Food pile.</li></ul></li>
<li><b>End:</b> a Territorial on your kitchen ends; discard it.</li></ol>
<p><b>Free at any point in your turn:</b> fire an inspection you armed last turn; feed rats (each rat once per turn). <b>Healing</b> (3 Food for 1 star) counts as your Defend card.</p>
<p><b>Reactions</b> are played free on someone else's turn: <b>Grease the Palm</b> cancels an inspection aimed at you; <b>Wok Block</b> cancels any other attack aimed at you.</p>
<p><b>Three of a kind:</b> the first time you hold 3 rats of the same breed, take 1 Food, then turn your reference card over. Once per game.</p>
<p><b>A round</b> is one pass round the table. At the start of each round, flip the next <b>Market Day</b>; it lasts that round.</p>
<h2>Rats</h2>
<p>Every rat has a <b>breed</b>, a <b>weight</b> (counts towards Rat King), a <b>heat</b> (damage when its breed is inspected) and <b>Teeth</b> (for Scrap Fights; every rat has a different number, so fights never tie). Some have an ability.<br>
<b>Feeding:</b> pay the Food shown to use a Feed ability. Each rat can be fed once per turn: turn it sideways, and straighten it at the start of your next turn.</p>
<h2>Inspections</h2>
<p>An inspection names a breed. The target loses stars equal to the <b>total heat of their rats of that breed</b>; no rats of that breed, nothing happens. Rats are never removed by an inspection.</p>
<ul><li><b>Scheduled Inspection:</b> arm it in front of you (your Attack). On your <b>next</b> turn fire it at a rival for free; if you don't, it expires at the end of that turn. Two-breed cards: pick one breed when you fire. Only one armed at a time.</li>
<li><b>Health Inspection:</b> a rival loses 1 star, whatever their rats.</li>
<li><b>Snap Inspections</b> fire on <b>you</b> the moment you draw them.</li>
<li>You can't fire at a boarded-up kitchen, or one you've already touched this turn.</li></ul>
<h2>Card types</h2>
<p>The band at the top of each card says how it's played: <b style="color:${SIDE.rival[1]}">Attack</b> (aimed at a rival), <b style="color:${SIDE.you[1]}">Defend</b> (on your own kitchen), <b style="color:${SIDE.either[1]}">Attack or Defend</b> (by where it goes), <b style="color:${SIDE.react[1]}">Reaction</b> (free, on others' turns), <b style="color:${SIDE.snap[1]}">Fires when drawn</b>. Each card's own text gives its effect.</p>
<h2>Scrap Fight</h2>
<ol><li>Challenge a rival who has a rat; you need one too.</li>
<li>Both secretly choose one of your own rats and reveal together.</li>
<li><b>Longer Teeth wins.</b> The winning rat grabs the scrap and bolts: it goes back into the rat deck.</li>
<li>If <b>you</b> (the challenger) win, your rival loses 1 star. If they win, nobody loses a star.</li></ol>
<p>Sending a heavy rat to win costs you Rat King weight, so bluffing pays both ways.</p>
<h2>Shutting down</h2>
<p>Lose your last star and your stall is shut down. Your rats go back into the rat deck. If someone placed Inheritance on you, they take 2 of your cards; the rest of your hand stays on the table face-down as a closed stall (Scavenger Rats can take from it).</p>
<p class="tag"><i>Rats can't be killed. They only ever move somewhere else.</i></p>
</div></section>`;

const pages = [...sheets(POKER, 'poker'), ...sheets(MINI, 'mini'), RULES];
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rat's Kitchen long mode — print-and-play</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
fs.writeFileSync(path.join(OUT, 'cards.html'), html);
console.log(`poker ${POKER.length} cards (${Math.ceil(POKER.length / 9)} sheets), mini ${MINI.length} cards (${Math.ceil(MINI.length / 16)} sheets), market ${M.length}`);

// ---------- web version for phones: public/art.html (served at /art) ----------
WEB = true;
const webPages = [...sheets(POKER, 'poker'), ...sheets(MINI, 'mini'), RULES];
const files = require('./prompts').jobs.map(j => j.file);
const webCss = `@media screen{body{background:#ddd}#sheets{transform-origin:0 0}.page{background:#fff;margin:0 auto 8mm;box-shadow:0 1mm 4mm #0003}}
#bar{position:sticky;top:0;z-index:9;background:#1d1b19;color:#fff;font:14px/1.35 system-ui,sans-serif;padding:10px 12px}
#bar h1{font-size:16px;margin:0 0 6px}#bar button{font:600 14px system-ui;border:0;border-radius:8px;padding:9px 12px;margin:6px 6px 0 0;background:#f2c43d;color:#1d1b19}
#bar button:disabled{opacity:.4}#prog{height:8px;background:#444;border-radius:4px;margin-top:8px;overflow:hidden}#prog i{display:block;height:100%;width:0;background:#7cc04b}
#msg{font-size:12.5px;opacity:.85;margin-top:6px}.art img{width:100%;height:100%;object-fit:cover;display:block}
@media print{#bar{display:none}body{background:#fff}#sheets{transform:none!important;height:auto!important}}`;
const webJs = `const FILES=${JSON.stringify(files)};const got={};let running=false,lock=null;
const $=id=>document.getElementById(id);
function fit(){const s=Math.min(1,(innerWidth-8)/document.querySelector('.page').offsetWidth);const sh=$('sheets');sh.style.transform='scale('+s+')';sh.style.height=(sh.scrollHeight*s)+'px';}
addEventListener('resize',fit);addEventListener('load',fit);
function show(f,url){document.querySelectorAll('[data-art="'+f+'"]').forEach(d=>{d.innerHTML='<img src="'+url+'">';d.classList.remove('vec');});}
function status(){const n=Object.keys(got).length;$('prog').firstChild.style.width=(100*n/FILES.length)+'%';$('count').textContent=n+' of '+FILES.length+' pictures';$('zip').disabled=!n;}
async function wake(){try{if('wakeLock' in navigator){lock=await navigator.wakeLock.request('screen');}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(running&&document.visibilityState==='visible')wake();});
async function start(){if(running)return;running=true;$('go').disabled=true;await wake();
 for(const f of FILES){if(got[f])continue;$('msg').textContent='Drawing '+f.replace(/_/g,' ')+'… keep this screen open.';
  let ok=false;for(let t=0;t<4&&!ok;t++){try{const r=await fetch('/artimg/'+f+'.jpg');if(!r.ok)throw 0;const b=await r.blob();got[f]=b;show(f,URL.createObjectURL(b));ok=true;}catch(e){$('msg').textContent='Retrying '+f+'…';await new Promise(r=>setTimeout(r,8000));}}
  status();}
 running=false;$('msg').textContent='All done. Download the art, or Print → Save as PDF (A4, scale 100%, no margins).';try{lock&&lock.release();}catch(e){}}
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
async function zip(){const parts=[],cent=[];let off=0;const enc=new TextEncoder();
 for(const f of FILES){if(!got[f])continue;const d=new Uint8Array(await got[f].arrayBuffer()),nm=enc.encode('art/'+f+'.jpg'),c=crc(d);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);
  parts.push(h.buffer,nm,d);const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint32(16,c,true);e.setUint32(20,d.length,true);e.setUint32(24,d.length,true);e.setUint16(28,nm.length,true);e.setUint32(42,off,true);
  cent.push(e.buffer,nm);off+=30+nm.length+d.length;}
 const cs=cent.reduce((a,b)=>a+(b.byteLength||b.length),0),n=cent.length/2,z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,n,true);z.setUint16(10,n,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([...parts,...cent,z.buffer],{type:'application/zip'}));a.download='ratskitchen-art.zip';a.click();}
function printIt(){$('sheets').style.transform='none';$('sheets').style.height='auto';print();setTimeout(fit,500);}
(async()=>{for(const f of FILES){try{const r=await fetch('/artimg/'+f+'.jpg?cached=1');if(r.ok){const b=await r.blob();got[f]=b;show(f,URL.createObjectURL(b));}}catch(e){}}status();})();`;
const webHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rat's Kitchen — card art</title><style>${css}${webCss}</style></head><body>
<div id="bar"><h1>Rat's Kitchen · print-and-play</h1><div id="count">0 pictures</div><div id="prog"><i></i></div>
<button id="go" onclick="start()">Make the art (≈20 min)</button><button id="zip" onclick="zip()" disabled>Download art (zip)</button><button onclick="printIt()">Print / Save PDF</button>
<div id="msg">Press “Make the art” and keep this screen open. Pictures already made load straight away. The drawings shown now are stand-ins.</div></div>
<div id="sheets">${webPages.join('')}</div><script>${webJs}</script></body></html>`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'public', 'art.html'), webHtml);
console.log('wrote public/art.html (' + files.length + ' pictures)');

(async () => {
  const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + path.join(OUT, 'cards.html')); await pg.waitForTimeout(500);
  // overflow check: any card whose text runs past its box
  const over = await pg.$$eval('.card', cs => cs.filter(c => c.scrollHeight > c.clientHeight + 1).map(c => c.querySelector('.title,.mband span')?.innerText));
  if (over.length) console.log('OVERFLOW:', [...new Set(over)].join(', '));
  await pg.pdf({ path: path.join(OUT, 'cards.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close(); console.log('wrote', path.join(OUT, 'cards.pdf'));
})();
