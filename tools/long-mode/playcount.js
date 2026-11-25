// Plays per game of every card/option, per player count, with long-mode defaults from server.js.
const src=require('fs').readFileSync(__dirname+'/../../server.js','utf8');const m=src.match(/const LONG_DEFAULTS = (\{[\s\S]*?\});/);
const LD=eval('('+m[1]+')');for(const[k,v]of Object.entries(LD))if(process.env[k]===undefined)process.env[k]=v;
const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||300;
const NAME={sched1:'Scheduled Insp. (arm, 1 breed)',sched2:'Scheduled Insp. (arm, 2 breeds)',fire:'Fire an armed inspection',mole:'Health Inspection',poach:'Poach',fight:'Scrap Fight',klepto:'Kleptomaniac',hotratato:'Ratata Quente',play_ratato:'Hot Ratato',muzzle:'Muzzle',disease:'Disease',stink:'Stink Bomb',eartag:'Ear Tag',chilli:'Hot Chilli',territorial:'Territorial',inherit:'Inheritance',boardup:'Board Up',eat_lastresort:'Last Resort',backdoor:'Back Door',cat:'Cat',deepclean:'Deep Clean',delivery:'Special Delivery',v5rat:'Take a rat',v5card:'Draw a card',v5food:'Take Food',feed:'Feed a rat',breed:'Breeder'};
const out={};const extra={};
for(const P of [3,4,5,6]){const c={};let G=0;global.__v5=null;
 global.__applyHook={pre:(g,p,act)=>{c[act.type]=(c[act.type]||0)+1;return null},post:()=>{}};
 for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}G++;}
 const V=global.__v5||{};for(const k in c)(out[k]=out[k]||{})[P]=(c[k]/G).toFixed(1);
 extra[P]={wok:((V.wok||0)/G).toFixed(1),stinkHit:((V.stinkHit||0)/G).toFixed(1),tagHit:((V.tagHit||0)/G).toFixed(1),dc:((V.deepcleanCards||0)/G).toFixed(1)};}
const rows=Object.keys(NAME).filter(k=>out[k]);
console.log('| Card / option | 3P | 4P | 5P | 6P |\n|---|---|---|---|---|');
for(const k of rows)console.log(`| ${NAME[k]} | ${[3,4,5,6].map(P=>out[k][P]||'0.0').join(' | ')} |`);
console.log('extras',JSON.stringify(extra));
