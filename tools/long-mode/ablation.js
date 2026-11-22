const E=require('../../game/engine'),A=require('../../game/actions');
const N=+process.argv[2]||600,P=+process.argv[3]||4,tag=process.argv[4]||'base';
let rk=0,G=0,early=0,late=0;const r=[],wt=[];
for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;
 while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}
 if(!g.over||!g.winner)continue;G++;const w=g.players.find(x=>x.id===g.winner);if(E.weight(w)>=E.THRESHOLD)rk++;const R=g.turn/P;r.push(R);wt.push(w.turns);if(R<6)early++;if(R>15)late++;}
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log(JSON.stringify({tag,P,G,ls:+(100-100*rk/G).toFixed(1),rounds:+avg(r).toFixed(2),wt:+avg(wt).toFixed(2),early:+(100*early/G).toFixed(1),late:+(100*late/G).toFixed(1)}));
