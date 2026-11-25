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
  rival: ['At a rival', '#b8322a'], you: ['On you', '#2e8a55'], either: ['Rival or you', '#7a4ea3'],
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
add(6, { key: 'delivery', side: 'either', title: 'Special Delivery', icon: '🚚', text: 'Put the top rat of the rat deck into <b>any</b> kitchen. Counts as At a rival or On you, by where it goes.' });
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
for (let i = 0; i < 21; i++) MINI.push({ key: 'food', side: 'food', title: 'Food', icon: '🍜', food: true });
for (let i = 0; i < 6; i++) MINI.push({ key: 'kind3', side: 'token', title: 'Three of a kind', icon: '🐀🐀🐀', token: true });

// ---------- rendering ----------
const artFor = key => { for (const ext of ['png', 'jpg', 'jpeg', 'webp']) { const f = path.join(ART, `${key}.${ext}`); if (fs.existsSync(f)) return 'file://' + f; } return null; };
const nestBadge = n => `<span class="nest" style="background:${NEST[n][2]}">${NEST[n][0]} ${NEST[n][1]}</span>`;
const artBox = (c, h) => { const a = artFor(c.key + (c.breed ? '_' + c.breed : '')) || artFor(c.key), v = a ? null : art(c.key, { breed: c.breed });
  if (v) return `<div class="art vec" style="height:${h}mm">${v}</div>`;
  return a ? `<div class="art" style="height:${h}mm;background-image:url('${a}')"></div>`
    : `<div class="art ph" style="height:${h}mm"><span class="emo">${c.icon || '🐀'}</span><span class="artkey">art: ${c.key}</span></div>`; };

function poker(c) {
  const [label, col] = SIDE[c.side];
  if (c.ref) return `<div class="card poker" style="--c:${col}"><div class="band">${label}</div><div class="title">Your turn</div>
    <ol class="ref"><li><b>Rat King check:</b> 10+ rat weight now = you win.</li><li>A Hot Chilli on your rat goes off.</li>
    <li><b>Draw 1</b> market card (a Snap fires on you).</li>
    <li><b>One choice:</b><br>• play up to 2 cards: <span style="color:${SIDE.rival[1]}">1 at a rival</span> + <span style="color:${SIDE.you[1]}">1 on you</span><br>• or take the top rat<br>• or draw another card<br>• or take 1 Food</li>
    <li><b>Discard to 7</b> (Food counts). A Territorial on you ends.</li></ol>
    <div class="small"><b>Free any time on your turn:</b> fire your armed inspection; feed rats (each once). <b>Heal:</b> 3 Food = 1 star (your On-you card).<br><b>Stars:</b> ${STARS}.</div></div>`;
  const nests = c.nests ? `<div class="nests">${c.nests.map(nestBadge).join(c.nests.length > 1 ? '<span class="or">or</span>' : '')}</div>` : '';
  const stats = c.stats ? `<div class="stats">${stat('Weight', c.stats[0])}${stat('Heat', c.stats[1])}</div>` : '';
  return `<div class="card poker" style="--c:${col}"><div class="band">${label}</div><div class="title">${c.title}</div>${c.sub ? `<div class="sub">${c.sub}</div>` : ''}
    ${artBox(c, c.nests || c.stats ? 34 : 40)}${nests}${stats}<div class="text">${c.text}</div><div class="foot">Rat's Kitchen · long mode</div></div>`;
}
const stat = (l, v) => `<div class="stat"><div class="sv">${v}</div><div class="sl">${l}</div></div>`;
function mini(c) {
  if (c.rat) {
    const col = c.nest ? NEST[c.nest][2] : '#6b6b6b';
    return `<div class="card mini" style="--c:${col}"><div class="mband"><span>${c.title}</span><span>${c.nest ? NEST[c.nest][0] : '🚫'}</span></div>
      ${artBox({ key: c.key, icon: '🐀', breed: c.nest }, 20)}<div class="mnest">${c.nest ? NEST[c.nest][1] : 'No breed'}</div>
      <div class="stats m">${stat('Weight', c.w)}${stat('Heat', c.h)}${stat('Teeth', c.teeth)}</div><div class="mtext">${c.text}</div></div>`;
  }
  const [label, col] = SIDE[c.side];
  const body = c.food ? 'Spend for <b>feeding</b> rats, or <b>3 Food = 1 star</b>. Counts towards your 7-card hand. Spent Food goes back to the Food pile.'
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
.text{font-size:8pt;line-height:1.3;flex:1}.foot{font-size:5pt;color:#aaa;text-align:right}
.stats{display:flex;gap:1.2mm;margin-bottom:1.2mm}.stat{flex:1;border:.3mm solid var(--c);border-radius:1mm;text-align:center;padding:.4mm 0}
.sv{font:600 11pt/1 Poppins,sans-serif}.sl{font-size:5pt;text-transform:uppercase;letter-spacing:.06em;color:#555}
.mini{padding:0 2.2mm 1.6mm;border-top:0}.mband{margin:0 -2.2mm;background:var(--c);color:#fff;font:600 7pt Poppins,sans-serif;padding:1mm 2.2mm;display:flex;justify-content:space-between;align-items:center}
.mband span:last-child{font-family:'Noto Color Emoji',Poppins;font-size:7pt}.mini .art{margin:1.2mm 0 .8mm}.mnest{font:600 6pt Poppins,sans-serif;color:var(--c);margin-bottom:.8mm}
.stats.m .sv{font-size:9.5pt}.mtext{font-size:6.2pt;line-height:1.22}.mtext.big{font-size:6.6pt}
.ref{font-size:7.2pt;line-height:1.3;padding-left:4mm;margin:1.5mm 0}.ref li{margin-bottom:.6mm}.small{font-size:6.4pt;line-height:1.28;color:#333}`;
const pages = [...sheets(POKER, 'poker'), ...sheets(MINI, 'mini')];
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rat's Kitchen long mode — print-and-play</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
fs.writeFileSync(path.join(OUT, 'cards.html'), html);
console.log(`poker ${POKER.length} cards (${Math.ceil(POKER.length / 9)} sheets), mini ${MINI.length} cards (${Math.ceil(MINI.length / 16)} sheets), market ${M.length}`);

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
