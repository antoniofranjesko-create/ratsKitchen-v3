const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||300,P=+process.argv[3]||4;
const orig=E.fireScheduled;const hits=[],sizes=[];let whiff=0;
E.fireScheduled=function(g,o,t,cols){const d=E.heatOf(t,cols);if(d>0){hits.push(d);sizes.push(t.rats.length);}else whiff++;return orig.apply(this,arguments);};
let rk=0,G=0;const r=[];for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;
while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}if(g.over&&g.winner){G++;r.push(g.turn/P);const w=g.players.find(x=>x.id===g.winner);if(E.weight(w)>=E.THRESHOLD)rk++;}}
const avg=a=>(a.reduce((s,x)=>s+x,0)/a.length).toFixed(1);r.sort((a,b)=>a-b);
console.log(`${P}P: inspection hit avg ${avg(hits)} stars on a kitchen of ${avg(sizes)} rats (whiff ${Math.round(100*whiff/(whiff+hits.length))}%) | last-standing ${100-Math.round(100*rk/G)}% | rounds ${r[r.length>>1].toFixed(1)}`);
