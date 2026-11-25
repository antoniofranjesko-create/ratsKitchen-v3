// Stand-in vector art for every card. Flat colours, thick ink outlines, one tinted wash per card side.
// art(key, opts) -> SVG string. Rats take opts.breed: 'grill' (Rex), 'cold' (Hairless), 'pantry' (Dumbo).
const INK = '#1d1b19', W = 300, H = 180;
const sw = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const svg = (bg, body, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
<defs><pattern id="g" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#000" opacity=".06"/></pattern></defs>
<rect width="${W}" height="${h}" fill="${bg}"/><rect width="${W}" height="${h}" fill="url(#g)"/>${body}</svg>`;
const ground = (y = 150, c = '#00000014') => `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${c}"/><line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${INK}" stroke-width="2" opacity=".35"/>`;
const WASH = { rival: '#f6d9d3', you: '#d7eedf', either: '#e6dcf1', react: '#d6e3f3', snap: '#efdfcc', day: '#e6e3dc', food: '#e3efd2', token: '#e4e2df' };

// ---------- the rat ----------
// x,y = centre of body at belly line; s = scale; facing right.
function rat({ x = 150, y = 120, s = 1, breed = 'grill', fat = 1, fur, eye = INK, extra = '', spiky = false, flip = false, legs = 'stand' } = {}) {
  const skin = '#f0b2ae', bald = breed === 'cold';
  const body = fur || (bald ? skin : breed === 'grill' ? '#9a7a62' : '#8f8c88');
  const bx = 0, by = -38, rx = 48 * fat, ry = 26 * (0.9 + 0.1 * fat);
  const hx = rx * 0.95 + 18, hy = by - 6;
  let g = '';
  // tail
  g += `<path d="M${-rx + 4} ${by + 8} C ${-rx - 40} ${by + 20}, ${-rx - 50} ${by - 30}, ${-rx - 80} ${by - 14}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`;
  g += `<path d="M${-rx + 4} ${by + 8} C ${-rx - 40} ${by + 20}, ${-rx - 50} ${by - 30}, ${-rx - 80} ${by - 14}" fill="none" stroke="${skin}" stroke-width="4.5" stroke-linecap="round"/>`;
  // legs
  const lp = legs === 'run' ? [[-rx * .6, 10, -25], [-rx * .3, 10, 20], [rx * .4, 10, -20], [rx * .7, 10, 25]] : [[-rx * .55, 0, 0], [-rx * .25, 0, 0], [rx * .35, 0, 0], [rx * .62, 0, 0]];
  for (const [lx, , rot] of lp) g += `<g transform="translate(${lx} ${by + ry - 6}) rotate(${rot})"><rect x="-5" y="0" width="10" height="18" rx="5" fill="${skin}" ${sw}/></g>`;
  // body
  g += `<ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="${body}" ${sw}/>`;
  if (fat > 1.15) g += `<ellipse cx="${bx + 6}" cy="${by + ry * .45}" rx="${rx * .6}" ry="${ry * .38}" fill="#ffffff" opacity=".22"/>`;
  // breed marks on body
  if (breed === 'grill') for (let i = 0; i < 9; i++) { const px = -rx * .7 + (i % 5) * rx * .32 + (i > 4 ? rx * .16 : 0), py = by - ry * .35 + (i > 4 ? ry * .45 : 0);
    g += `<path d="M${px} ${py} q 6 -9 12 0 q -6 9 -12 0" fill="none" stroke="${INK}" stroke-width="2" opacity=".55"/>`; }
  if (bald) for (let i = 0; i < 4; i++) g += `<path d="M${-rx * .5 + i * rx * .3} ${by - ry * .55} q 6 8 0 16" fill="none" stroke="#b86e6a" stroke-width="2.2"/>`;
  if (spiky) { let d = `M${-rx * .85} ${by - ry * .55}`; for (let i = 0; i < 8; i++) d += ` l ${rx * .11} -14 l ${rx * .11} 14`; g += `<path d="${d}" fill="${body}" ${sw}/>`; }
  // head
  g += `<path d="M${hx - 30} ${hy - 20} Q ${hx + 4} ${hy - 26} ${hx + 34} ${hy + 4} Q ${hx + 8} ${hy + 22} ${hx - 26} ${hy + 18} Z" fill="${body}" ${sw}/>`;
  g += `<circle cx="${hx + 34}" cy="${hy + 3}" r="5" fill="#e67f86" ${sw}/>`;
  // ears
  if (breed === 'pantry') g += `<ellipse cx="${hx - 14}" cy="${hy + 2}" rx="17" ry="19" fill="${body}" ${sw}/><ellipse cx="${hx - 14}" cy="${hy + 3}" rx="10" ry="12" fill="${skin}"/>`;
  else g += `<ellipse cx="${hx - 14}" cy="${hy - 22}" rx="10" ry="12" fill="${body}" ${sw}/><ellipse cx="${hx - 14}" cy="${hy - 22}" rx="5" ry="7" fill="${skin}"/>`;
  // eye + whiskers
  g += `<circle cx="${hx + 8}" cy="${hy - 6}" r="4.2" fill="${eye}"/><circle cx="${hx + 9.5}" cy="${hy - 7.5}" r="1.3" fill="#fff"/>`;
  g += `<path d="M${hx + 28} ${hy + 8} l 22 -4 M${hx + 28} ${hy + 10} l 22 4 M${hx + 26} ${hy + 12} l 18 10" stroke="${INK}" stroke-width="1.5" fill="none"/>`;
  g += extra;
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${g}</g>`;
}

// ---------- props ----------
const heron = (x, y, s = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})">
 <path d="M-8 0 L-14 40 M8 0 L12 40" stroke="${INK}" stroke-width="4" fill="none"/>
 <ellipse cx="0" cy="-20" rx="30" ry="24" fill="#b9c7d3" ${sw}/><path d="M-22 -30 Q -40 -10 -30 8 Q -10 -4 -22 -30" fill="#8fa3b5" ${sw}/>
 <path d="M10 -38 Q 14 -70 4 -86" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M10 -38 Q 14 -70 4 -86" fill="none" stroke="#b9c7d3" stroke-width="8" stroke-linecap="round"/>
 <circle cx="6" cy="-92" r="15" fill="#d5e0e8" ${sw}/><path d="M18 -96 L 62 -88 L 18 -86 Z" fill="#e8b24a" ${sw}/>
 <circle cx="10" cy="-95" r="5" fill="#fff" ${sw}/><circle cx="11" cy="-95" r="2.2" fill="${INK}"/><path d="M-6 -104 q -12 -8 -20 -2" stroke="${INK}" stroke-width="3" fill="none"/>${extra}</g>`;
const clipboard = (x, y, r = -8) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-16" y="-22" width="32" height="42" rx="3" fill="#c79b62" ${sw}/><rect x="-11" y="-15" width="22" height="30" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
 <path d="M-7 -8 h14 M-7 -2 h14 M-7 4 h9" stroke="${INK}" stroke-width="1.6"/><rect x="-7" y="-26" width="14" height="7" rx="2" fill="#777" ${sw}/></g>`;
const mole = (x, y, s = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})">
 <ellipse cx="0" cy="0" rx="46" ry="30" fill="#f1b9b0" ${sw}/><path d="M-30 -6 q 8 6 0 12 M-14 -14 q 8 6 0 12 M4 -16 q 8 6 0 12" stroke="#c47e77" stroke-width="2" fill="none"/>
 <ellipse cx="40" cy="-14" rx="24" ry="20" fill="#f1b9b0" ${sw}/><circle cx="44" cy="-20" r="2.2" fill="${INK}"/><circle cx="62" cy="-12" r="5" fill="#d77b84" ${sw}/>
 <rect x="52" y="-6" width="5" height="12" fill="#fff8e6" ${sw}/><rect x="58" y="-6" width="5" height="12" fill="#fff8e6" ${sw}/>
 <rect x="-34" y="22" width="12" height="12" rx="5" fill="#f1b9b0" ${sw}/><rect x="16" y="22" width="12" height="12" rx="5" fill="#f1b9b0" ${sw}/>${extra}</g>`;
const magnifier = (x, y) => `<g transform="translate(${x} ${y}) rotate(-30)"><rect x="-4" y="14" width="8" height="26" rx="3" fill="#6b4a2c" ${sw}/><circle cx="0" cy="0" r="16" fill="#cfe8f5" ${sw}/><path d="M-6 -6 q 4 -5 10 -4" stroke="#fff" stroke-width="3" fill="none"/></g>`;
const burst = (x, y, r, c = '#ffe27a') => { let d = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .55 : r; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `; } return `<path d="${d}Z" fill="${c}" ${sw}/>`; };
const chilli = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-30 -6 Q 0 -22 34 -4 Q 46 4 40 14 Q 10 0 -26 10 Q -40 4 -30 -6 Z" fill="#d93b2b" ${sw}/><path d="M-28 -4 q -12 -14 -2 -22" stroke="#3d8a3a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-10 -10 q 14 -6 30 0" stroke="#fff" stroke-width="3" opacity=".5" fill="none"/></g>`;
const potato = (x, y, s = 1, face = true) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 4 Q -44 -26 -8 -30 Q 36 -34 44 -6 Q 48 22 6 26 Q -36 30 -40 4 Z" fill="#c9995b" ${sw}/>
 <circle cx="-18" cy="-12" r="2.5" fill="#8c6538"/><circle cx="14" cy="12" r="2.5" fill="#8c6538"/><circle cx="-4" cy="14" r="2" fill="#8c6538"/>
 ${face ? `<ellipse cx="18" cy="-30" rx="8" ry="10" fill="#c9995b" ${sw}/><ellipse cx="0" cy="-32" rx="8" ry="10" fill="#c9995b" ${sw}/><circle cx="22" cy="-10" r="3.6" fill="${INK}"/><circle cx="6" cy="-10" r="3.6" fill="${INK}"/><circle cx="42" cy="0" r="4" fill="#e67f86" ${sw}/>
 <path d="M-40 6 C -60 10 -66 -12 -84 -2" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-40 6 C -60 10 -66 -12 -84 -2" fill="none" stroke="#f0b2ae" stroke-width="4" stroke-linecap="round"/>` : ''}</g>`;
const steam = (x, y, n = 3, c = '#ffffff') => Array.from({ length: n }, (_, i) => `<path d="M${x + i * 16} ${y} q -8 -10 0 -20 q 8 -10 0 -20" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".9"/>`).join('');
const flames = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 0 Q -34 -26 -16 -40 Q -14 -24 -4 -22 Q -8 -46 12 -58 Q 12 -34 24 -28 Q 32 -40 30 -50 Q 46 -26 32 0 Z" fill="#f08a2a" ${sw}/><path d="M-14 0 Q -16 -16 -4 -24 Q 0 -12 8 -12 Q 10 -26 18 -30 Q 26 -14 18 0 Z" fill="#ffd34d"/></g>`;
const card = (x, y, r, c = '#fff') => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-16" y="-22" width="32" height="44" rx="4" fill="${c}" ${sw}/><rect x="-10" y="-16" width="20" height="32" rx="2" fill="none" stroke="#c0392b" stroke-width="2"/></g>`;
const coin = (x, y, r = 12) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#f2c43d" ${sw}/><circle cx="${x}" cy="${y}" r="${r * .62}" fill="none" stroke="#b8860b" stroke-width="2"/></g>`;
const germ = (x, y, r = 10) => { let sp = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; sp += `<line x1="${x + Math.cos(a) * r}" y1="${y + Math.sin(a) * r}" x2="${x + Math.cos(a) * (r + 6)}" y2="${y + Math.sin(a) * (r + 6)}" stroke="${INK}" stroke-width="2"/><circle cx="${x + Math.cos(a) * (r + 7)}" cy="${y + Math.sin(a) * (r + 7)}" r="2.4" fill="#7cc04b" stroke="${INK}" stroke-width="1.5"/>`; }
  return sp + `<circle cx="${x}" cy="${y}" r="${r}" fill="#7cc04b" ${sw}/><circle cx="${x - 3}" cy="${y - 2}" r="2" fill="${INK}"/><circle cx="${x + 4}" cy="${y - 2}" r="2" fill="${INK}"/>`; };
const cat = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
 <path d="M30 20 C 70 20 74 -20 52 -26" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M30 20 C 70 20 74 -20 52 -26" fill="none" stroke="#e59a4b" stroke-width="8" stroke-linecap="round"/>
 <path d="M-34 24 Q -40 -30 0 -32 Q 40 -30 34 24 Z" fill="#e59a4b" ${sw}/><path d="M-12 -24 q 12 8 24 0 M-18 -6 q 6 4 12 0" stroke="#b8692a" stroke-width="3" fill="none"/>
 <circle cx="0" cy="-52" r="27" fill="#e59a4b" ${sw}/><path d="M-24 -62 L -22 -90 L -4 -76 Z M24 -62 L 22 -90 L 4 -76 Z" fill="#e59a4b" ${sw}/><path d="M-19 -68 L -19 -82 L -10 -75 Z M19 -68 L 19 -82 L 10 -75 Z" fill="#f3b8b2"/>
 <ellipse cx="-10" cy="-54" rx="5" ry="7" fill="#9ccf55" ${sw}/><ellipse cx="10" cy="-54" rx="5" ry="7" fill="#9ccf55" ${sw}/><rect x="-11" y="-58" width="2" height="8" fill="${INK}"/><rect x="9" y="-58" width="2" height="8" fill="${INK}"/>
 <path d="M-4 -44 l 4 4 l 4 -4 Z" fill="#e67f86" ${sw}/><path d="M0 -40 q -5 6 -10 3 M0 -40 q 5 6 10 3" stroke="${INK}" stroke-width="2" fill="none"/>
 <path d="M-14 -42 l -24 -4 M-14 -38 l -24 4 M14 -42 l 24 -4 M14 -38 l 24 4" stroke="${INK}" stroke-width="1.5"/>
 <ellipse cx="-14" cy="24" rx="11" ry="7" fill="#f6d2a6" ${sw}/><ellipse cx="14" cy="24" rx="11" ry="7" fill="#f6d2a6" ${sw}/></g>`;
const bowl = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${steam(-18, -30, 3)}<path d="M-50 -12 h100 Q 46 34 0 34 Q -46 34 -50 -12 Z" fill="#c0392b" ${sw}/><path d="M-40 6 h80" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>
 <path d="M-44 -12 q 10 -14 20 0 q 10 -14 20 0 q 10 -14 20 0 q 10 -14 20 0" fill="#f5d77e" ${sw}/><path d="M24 -40 L 60 -4 M34 -46 L 66 -10" stroke="#8c6538" stroke-width="5" stroke-linecap="round"/></g>`;

// ---------- scenes ----------
const S = {};
S.sched1 = S.sched2 = () => svg(WASH.rival, ground(156) + heron(120, 118, 1, clipboard(48, -36)) + `<g opacity=".9">${rat({ x: 236, y: 156, s: .55, breed: 'pantry' })}</g><text x="214" y="88" font-size="28" font-weight="700" fill="${INK}">?</text>`);
S.snap = () => svg(WASH.snap, ground(156) + burst(220, 70, 46) + heron(150, 120, 1, `<rect x="30" y="-62" width="34" height="24" rx="4" fill="#444" ${sw}/><circle cx="47" cy="-50" r="7" fill="#9fd3ec" ${sw}/>`) + `<text x="196" y="80" font-size="22" font-weight="800" fill="${INK}">SNAP!</text>`);
S.mole = () => svg(WASH.rival, ground(150) + mole(130, 118, 1.1) + magnifier(214, 98) + clipboard(56, 92, 10));
S.snapmole = () => svg(WASH.snap, ground(150) + burst(220, 60, 40) + mole(120, 120, 1.05) + `<text x="190" y="68" font-size="20" font-weight="800" fill="${INK}">SNAP!</text>`);
S.sparemole = () => svg(WASH.day, ground(150) + mole(140, 120, 1.1));
S.poach = () => svg(WASH.rival, `<path d="M300 0 Q 240 10 200 40 L 200 40" stroke="#6b4a2c" stroke-width="8" fill="none"/><line x1="200" y1="40" x2="190" y2="96" stroke="${INK}" stroke-width="2"/>
 <path d="M190 96 q 0 16 -12 16 q -10 0 -10 -10" fill="none" stroke="#888" stroke-width="5" stroke-linecap="round"/>` + ground(160) + `<g transform="rotate(-18 160 120)">${rat({ x: 150, y: 150, s: .8, breed: 'grill' })}</g>`);
S.fight = () => svg(WASH.rival, ground(156) + `<ellipse cx="150" cy="132" rx="44" ry="22" fill="#e8dccb" ${sw}/>` + rat({ x: 70, y: 156, s: .6, breed: 'pantry' }) + rat({ x: 230, y: 156, s: .6, breed: 'grill', flip: true }) + burst(150, 70, 22) + `<text x="140" y="44" font-size="20">★ ★</text>`);
S.klepto = () => svg(WASH.rival, card(110, 96, -18) + card(140, 90, 0) + card(170, 96, 18) + `<g transform="translate(210 40) rotate(30)"><path d="M-22 -10 h44 v40 q -22 12 -44 0 Z" fill="#4a4a4a" ${sw}/><path d="M-22 30 q -4 26 10 30 q 4 -18 2 -30 M-6 32 v32 M8 32 v30 M20 28 q 10 18 2 30" fill="#4a4a4a" ${sw}/></g>`);
S.quente = () => svg(WASH.rival, ground(160) + `<path d="M40 150 Q 140 -10 250 120" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="7 7"/>` + `<g transform="rotate(25 170 70)">${rat({ x: 170, y: 100, s: .65, breed: 'cold' })}</g>` + flames(250, 160, .8) + steam(150, 40, 2));
S.hotratato = () => svg(WASH.rival, ground(160) + flames(150, 162, 1.3) + potato(152, 96, 1.05) + steam(130, 50, 3));
S.muzzle = () => svg(WASH.rival, ground(156) + rat({ x: 140, y: 156, s: .8, breed: 'pantry', extra: `<g><path d="M70 -46 q 40 -6 52 20 q -30 20 -52 10 Z" fill="none" stroke="#5a3d22" stroke-width="5"/><path d="M76 -48 v40 M92 -48 v42 M108 -40 v32" stroke="#5a3d22" stroke-width="4"/><path d="M60 -44 Q 52 -60 34 -52" stroke="#5a3d22" stroke-width="5" fill="none"/></g>` }));
S.disease = () => svg(WASH.rival, ground(156) + rat({ x: 150, y: 156, s: .8, breed: 'cold', fur: '#b7c98a', eye: '#7a2a2a' }) + germ(60, 50) + germ(250, 60, 12) + germ(220, 120, 8) + germ(40, 120, 7));
S.chilli = () => svg(WASH.rival, ground(156) + chilli(140, 100, 2) + `<path d="M232 92 q 18 -18 10 -40" stroke="${INK}" stroke-width="3" fill="none"/>` + burst(244, 46, 14, '#ffb43a'));
S.territorial = () => svg(WASH.rival, ground(150) + `<g ${sw}><rect x="60" y="62" width="180" height="30" fill="#ffd34d"/><path d="M80 62 l -20 30 M110 62 l -20 30 M140 62 l -20 30 M170 62 l -20 30 M200 62 l -20 30 M230 62 l -20 30" stroke="${INK}" stroke-width="8"/>
 <rect x="76" y="92" width="10" height="56" fill="#888"/><rect x="214" y="92" width="10" height="56" fill="#888"/></g><circle cx="70" cy="56" r="8" fill="#ff6b3d" ${sw}/><circle cx="230" cy="56" r="8" fill="#ff6b3d" ${sw}/>
 <text x="104" y="174" font-size="16" fill="${INK}" opacity=".6">🐾 🐾 🐾</text>`);
S.inherit = () => svg(WASH.rival, `<g ${sw}><rect x="74" y="40" width="152" height="100" fill="#f3e2b8"/><rect x="62" y="30" width="20" height="120" rx="10" fill="#e3c88a"/><rect x="218" y="30" width="20" height="120" rx="10" fill="#e3c88a"/></g>
 <path d="M98 66 h104 M98 84 h104 M98 102 h70" stroke="${INK}" stroke-width="3" opacity=".6"/><circle cx="196" cy="118" r="16" fill="#b8322a" ${sw}/><path d="M188 132 l -6 18 M204 132 l 6 18" stroke="#b8322a" stroke-width="6"/>`);
S.boardup = () => svg(WASH.you, `<rect x="70" y="20" width="160" height="140" fill="#3a3a48" ${sw}/><rect x="84" y="34" width="132" height="112" fill="#1c1c26"/>
 <g ${sw}><rect x="50" y="52" width="200" height="22" fill="#c08a52" transform="rotate(-12 150 63)"/><rect x="50" y="100" width="200" height="22" fill="#b37c46" transform="rotate(10 150 111)"/><rect x="60" y="74" width="180" height="20" fill="#c99560"/></g>
 <circle cx="62" cy="62" r="3" fill="#555"/><circle cx="238" cy="104" r="3" fill="#555"/><circle cx="70" cy="84" r="3" fill="#555"/>`);
S.lastresort = () => svg(WASH.you, ground(150) + `<ellipse cx="150" cy="130" rx="96" ry="22" fill="#fff" ${sw}/><ellipse cx="150" cy="128" rx="70" ry="14" fill="#f1f1f1"/>
 <path d="M86 122 Q 150 30 214 122 Z" fill="#c9ccd1" ${sw}/><circle cx="150" cy="70" r="7" fill="#9da1a8" ${sw}/><path d="M214 122 C 240 118 252 98 270 108" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M214 122 C 240 118 252 98 270 108" fill="none" stroke="#f0b2ae" stroke-width="3.5" stroke-linecap="round"/>
 <path d="M40 92 v52 M34 92 v18 M46 92 v18 M34 110 q 6 8 12 0" stroke="${INK}" stroke-width="3" fill="none"/>`);
S.backdoor = () => svg(WASH.you, ground(160) + `<rect x="110" y="18" width="96" height="142" fill="#1f1d28" ${sw}/><path d="M110 18 L 70 30 L 70 168 L 110 160 Z" fill="#7a5233" ${sw}/><circle cx="80" cy="96" r="4" fill="#e8b24a" ${sw}/>
 <path d="M206 140 C 236 146 246 120 270 134" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M206 140 C 236 146 246 120 270 134" fill="none" stroke="#f0b2ae" stroke-width="3.5" stroke-linecap="round"/>
 <circle cx="150" cy="104" r="4" fill="#ffd34d"/><circle cx="164" cy="104" r="4" fill="#ffd34d"/><text x="214" y="64" font-size="26" font-weight="700" fill="${INK}">?</text>`);
S.cat = () => svg(WASH.you, ground(150) + cat(150, 128, 1));
S.delivery = () => svg(WASH.either, ground(156) + `<g ${sw}><path d="M80 80 L 220 80 L 220 152 L 80 152 Z" fill="#c99560"/><path d="M80 80 L 60 58 L 200 58 L 220 80" fill="#d9a873"/><path d="M220 80 L 244 60 L 230 58" fill="#b37c46"/></g>
 <rect x="138" y="80" width="24" height="72" fill="#e8d6a8" opacity=".7"/><ellipse cx="130" cy="56" rx="10" ry="12" fill="#8f8c88" ${sw}/><ellipse cx="170" cy="56" rx="10" ry="12" fill="#8f8c88" ${sw}/>
 <circle cx="138" cy="70" r="4" fill="${INK}"/><circle cx="162" cy="70" r="4" fill="${INK}"/><text x="94" y="128" font-size="14" font-weight="700" fill="${INK}">THIS WAY UP</text>`);
S.grease = () => svg(WASH.react, heron(90, 130, .9) + `<g transform="translate(205 92)"><path d="M-40 10 q 20 -26 60 -10 l 20 8 l -6 14 l -22 -6 q -30 18 -52 -6 Z" fill="#f0c9a0" ${sw}/></g>` + coin(196, 70, 13) + coin(220, 58, 11) + `<path d="M246 120 q 6 12 0 18 q -6 -6 0 -18 Z" fill="#4a3a20"/>`);
S.wok = () => svg(WASH.react, `<g transform="rotate(-10 150 90)"><ellipse cx="150" cy="90" rx="78" ry="62" fill="#2e2e33" ${sw}/><ellipse cx="140" cy="80" rx="40" ry="26" fill="#55555c"/><rect x="226" y="80" width="64" height="16" rx="8" fill="#7a5233" ${sw}/></g>
 <path d="M50 40 l -26 -12 M44 70 l -30 0 M50 100 l -26 12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><text x="196" y="170" font-size="24" font-weight="800" fill="${INK}">CLANG!</text>`);
// market days
S.stink = () => svg(WASH.rival, ground(156) + rat({ x: 150, y: 156, s: .8, breed: 'pantry' }) + `<g fill="none" stroke="#7a9a3a" stroke-width="5" stroke-linecap="round" opacity=".85"><path d="M70 90 q -10 -14 0 -28 q 10 -14 0 -28"/><path d="M120 80 q -10 -14 0 -28 q 10 -14 0 -28"/><path d="M170 84 q -10 -14 0 -28 q 10 -14 0 -28"/></g><circle cx="236" cy="128" r="16" fill="#3a3a3a" ${sw}/><path d="M240 112 q 8 -10 18 -6" stroke="${INK}" stroke-width="3" fill="none"/>` + burst(262, 104, 8, '#ffb43a'));
S.eartag = () => svg(WASH.rival, ground(156) + rat({ x: 140, y: 156, s: .85, breed: 'grill', extra: `<g transform="translate(52 -40) rotate(15)"><rect x="-8" y="0" width="22" height="16" rx="3" fill="#ffd34d" ${sw}/><circle cx="-2" cy="8" r="3" fill="${INK}"/><path d="M2 8 h8" stroke="${INK}" stroke-width="2"/></g>` }));
S.day_stink = () => svg(WASH.day, ground(156) + heron(120, 130, .85, `<path d="M40 -100 q 12 -6 18 4" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="60" cy="-92" r="6" fill="#f3a3a8" ${sw}/>`) + `<g fill="none" stroke="#7a9a3a" stroke-width="5" stroke-linecap="round"><path d="M210 140 q -10 -14 0 -28 q 10 -14 0 -28"/><path d="M240 140 q -10 -14 0 -28 q 10 -14 0 -28"/></g>`);
S.day_pest = () => svg(WASH.day, ground(156) + `<g ${sw}><rect x="60" y="70" width="120" height="70" rx="8" fill="#c9ccd1"/><rect x="170" y="86" width="60" height="54" rx="6" fill="#9da1a8"/><circle cx="90" cy="146" r="14" fill="#444"/><circle cx="200" cy="146" r="14" fill="#444"/></g><text x="76" y="112" font-size="18" font-weight="800" fill="${INK}">PEST CTRL</text><g transform="translate(250 60) rotate(15)"><rect x="-10" y="0" width="26" height="18" rx="3" fill="#ffd34d" ${sw}/><circle cx="-3" cy="9" r="3" fill="${INK}"/></g>`);
S.deepclean = () => svg(WASH.you, ground(156) + `<g ${sw}><rect x="110" y="70" width="70" height="50" rx="8" fill="#ffd34d"/><rect x="110" y="60" width="70" height="14" rx="5" fill="#3a9a5a"/></g>` + [[70,60,14],[210,50,18],[240,110,12],[60,120,10],[160,40,9]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#e6f6ff" ${sw}/><path d="M${x-r*.4} ${y-r*.4} q 3 -3 6 -2" stroke="#fff" stroke-width="2" fill="none"/>`).join('') + `<text x="196" y="150" font-size="22">✨</text>`);
S.day_release = () => svg(WASH.day, ground(156) + `<g ${sw} fill="none"><path d="M60 150 V 70 Q 110 30 160 70 V 150 Z" fill="#cfd4d9"/><path d="M76 150 V 62 M94 150 V 50 M112 150 V 46 M130 150 V 50 M146 150 V 60"/></g><path d="M160 150 L 200 120 L 200 150" fill="#cfd4d9" ${sw}/>` + rat({ x: 244, y: 156, s: .55, breed: 'grill', legs: 'run' }));
S.day_frenzy = () => svg(WASH.day, ground(156) + rat({ x: 84, y: 156, s: .5, breed: 'pantry' }) + rat({ x: 220, y: 156, s: .5, breed: 'cold', flip: true }) + card(150, 70, -14) + card(110, 50, 20) + card(196, 46, 8) + `<text x="40" y="40" font-size="18">✦</text><text x="250" y="96" font-size="18">✦</text>`);
S.day_blackout = () => svg('#2b2b3a', `<circle cx="210" cy="60" r="30" fill="#f4f0c8" ${sw}/><circle cx="224" cy="52" r="28" fill="#2b2b3a"/><circle cx="110" cy="110" r="5" fill="#ffd34d"/><circle cx="126" cy="110" r="5" fill="#ffd34d"/><circle cx="60" cy="40" r="2" fill="#fff"/><circle cx="150" cy="30" r="2" fill="#fff"/><circle cx="270" cy="130" r="2" fill="#fff"/>`);
S.day_piper = () => svg(WASH.day, ground(156) + `<g transform="rotate(-20 120 70)"><rect x="40" y="62" width="150" height="18" rx="9" fill="#c08a52" ${sw}/><circle cx="90" cy="71" r="4" fill="${INK}"/><circle cx="116" cy="71" r="4" fill="${INK}"/><circle cx="142" cy="71" r="4" fill="${INK}"/></g>
 <text x="190" y="50" font-size="30" fill="${INK}">♪ ♫</text>` + rat({ x: 160, y: 156, s: .42, breed: 'grill' }) + rat({ x: 250, y: 156, s: .42, breed: 'pantry' }));
S.day_roulette = () => svg(WASH.day, `<circle cx="150" cy="88" r="66" fill="#2f6b3a" ${sw}/>` + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M150 88 L ${150 + Math.cos(a) * 66} ${88 + Math.sin(a) * 66}" stroke="#f4f0c8" stroke-width="2"/>`; }).join('') + `<circle cx="150" cy="88" r="18" fill="#c08a52" ${sw}/><circle cx="196" cy="50" r="6" fill="#fff" ${sw}/>`);
S.day_dayoff = () => svg(WASH.day, ground(140, '#f2d999') + `<path d="M100 140 L 120 40" stroke="${INK}" stroke-width="4"/><path d="M60 56 Q 120 0 180 30 Z" fill="#e85d4a" ${sw}/>` + heron(210, 150, .75, `<rect x="-2" y="-100" width="26" height="9" rx="3" fill="${INK}"/>`));
S.food = () => svg(WASH.food, bowl(150, 108, 1.2), 150);
S.kind3 = () => svg(WASH.token, ground(120) + rat({ x: 75, y: 120, s: .4, breed: 'grill' }) + rat({ x: 160, y: 120, s: .4, breed: 'cold' }) + rat({ x: 245, y: 120, s: .4, breed: 'pantry' }), 150);

// rats: one picture per type, drawn in the card's breed
const RATART = {
  plain: o => rat(o),
  fat: o => rat({ ...o, fat: 1.35 }),
  hog: o => rat({ ...o, fat: 1.2, extra: `<ellipse cx="${1.2 * 48 * .95 + 52}" cy="-30" rx="10" ry="8" fill="#f3a3a8" ${sw}/><circle cx="${1.2 * 48 * .95 + 49}" cy="-30" r="1.8" fill="${INK}"/><circle cx="${1.2 * 48 * .95 + 55}" cy="-30" r="1.8" fill="${INK}"/>` }) + bowl(250, 150, .4),
  runner: o => `<path d="M30 70 h50 M20 92 h60 M40 114 h40" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".5"/>` + rat({ ...o, legs: 'run' }),
  breeder: o => rat({ ...o, x: 130 }) + rat({ ...o, x: 238, y: 140, s: .32 }) + rat({ ...o, x: 270, y: 150, s: .28 }),
  scav: o => rat({ ...o, extra: card(98, -18, 20) }),
  toll: o => rat({ ...o, x: 128 }) + coin(250, 128, 14) + coin(268, 112, 11),
  alpha: o => rat({ ...o, fat: 1.25, extra: `<path d="M${1.25 * 48 * .95 + 12} -54 l 14 16" stroke="#b8322a" stroke-width="3"/>` }) + `<text x="30" y="44" font-size="26">★</text>`,
  feral: o => rat({ ...o, spiky: true, eye: '#c0392b' }),
  spice: o => rat({ ...o, x: 132 }) + chilli(250, 120, .6, -30),
  grub: o => rat(o) + `<g>${[40, 70, 240, 262].map((x, i) => `<path d="M${x} ${140 + (i % 2) * 8} q 6 -8 12 0 q 6 8 12 0" fill="none" stroke="#f3e7c2" stroke-width="6" stroke-linecap="round"/>`).join('')}</g><text x="236" y="40" font-size="16">✕ ✕</text>`,
  sewer: o => `<rect x="0" y="0" width="${W}" height="${H}" fill="#9db08a" opacity=".5"/><g stroke="${INK}" stroke-width="5" opacity=".4">${[40, 80, 120, 160, 200, 240].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`).join('')}</g>` + rat({ ...o, fur: '#7d8a6a' }),
  ratato: o => potato(160, 110, 1.15),
};
function art(key, o = {}) {
  if (RATART[key]) {
    const bg = { grill: '#f3dccf', cold: '#f5d9e6', pantry: '#d9e6f3' }[o.breed] || '#dfe3da';
    return svg(bg, ground(134) + RATART[key]({ x: 172, y: 142, s: 1.3, breed: o.breed || 'none' }), 150);
  }
  return S[key] ? S[key]() : null;
}
module.exports = { art };
