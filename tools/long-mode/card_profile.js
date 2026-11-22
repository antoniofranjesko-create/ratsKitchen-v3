// Per-card effect profile: for every play, the change in actor's and target's stars, rat weight and hand,
// measured right after the play resolves. 4-player L1.2 bot games.
const E=require('../../game/engine'),A=require('../../game/actions');
const N=+process.argv[2]||1500, P=+process.argv[3]||4;
const prof={};const snap=q=>q?{s:q.stars,w:E.weight(q),h:q.hand.length,r:q.rats.length,heat:q.rats.reduce((a,r)=>a+r.heat,0)}:null;
const wins={}, plays={}, games={};
global.__applyHook={pre:(g,p,act,targetId)=>{const t=targetId&&targetId!==p.id?g.players.find(x=>x.id===targetId):null;return {g,p,act,t,a0:snap(p),t0:snap(t)};},
 post:({g,p,act,t,a0,t0})=>{const a1=snap(p),t1=snap(t);const k=act.type;if(['end','fire_wait','fire_blocked'].includes(k))return;
  const d=prof[k]=prof[k]||{n:0,sS:0,sW:0,sH:0,sHeat:0,tS:0,tW:0,tH:0,tHeat:0,tn:0};
  d.n++;d.sS+=a1.s-a0.s;d.sW+=a1.w-a0.w;d.sH+=a1.h-a0.h;d.sHeat+=a1.heat-a0.heat;
  if(t0){d.tn++;d.tS+=t1.s-t0.s;d.tW+=t1.w-t0.w;d.tH+=t1.h-t0.h;d.tHeat+=t1.heat-t0.heat;}
  (g._pl=g._pl||{})[p.id]=(g._pl[p.id]||{});g._pl[p.id][k]=(g._pl[p.id][k]||0)+1;}};
// A.botTurn calls the internal apply, so wrap the export used by botTurnV5 too
let G=0;
for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;
 while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}
 if(!g.over||!g.winner)continue;G++;
 for(const [pid,m] of Object.entries(g._pl||{})) for(const k in m){games[k]=(games[k]||0)+1; if(pid===g.winner) wins[k]=(wins[k]||0)+1; plays[k]=(plays[k]||0)+m[k];}
}
const rows=Object.entries(prof).filter(([k,d])=>d.n>=50).map(([k,d])=>({k,n:d.n,perGame:(d.n/G).toFixed(2),
 me:{stars:+(d.sS/d.n).toFixed(2),weight:+(d.sW/d.n).toFixed(2),hand:+(d.sH/d.n).toFixed(2),heat:+(d.sHeat/d.n).toFixed(2)},
 rival:d.tn?{stars:+(d.tS/d.tn).toFixed(2),weight:+(d.tW/d.tn).toFixed(2),hand:+(d.tH/d.tn).toFixed(2),heat:+(d.tHeat/d.tn).toFixed(2)}:null,
 winWhenPlayed:games[k]?Math.round(100*(wins[k]||0)/games[k]):null}));
console.log(JSON.stringify({games:G,P,rows}));
