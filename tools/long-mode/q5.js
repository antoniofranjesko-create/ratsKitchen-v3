const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||400;
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0};const out=[];
for(const P of [3,4,5,6]){global.__v5=null;let rk=0,G=0,early=0,late=0,stale=0;const wt=[],r=[];
 for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;
  while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}
  if(!g.over||!g.winner){stale++;continue;}G++;const w=g.players.find(x=>x.id===g.winner);if(E.weight(w)>=E.THRESHOLD)rk++;wt.push(w.turns);const R=g.turn/P;r.push(R);if(R<6)early++;if(R>15)late++;}
 const S=global.__v5;const mix=S?` | per turn: rat ${(S.rat/S.turns).toFixed(2)} card ${(S.card/S.turns).toFixed(2)} att ${(S.att/S.turns).toFixed(2)} def ${(S.def/S.turns).toFixed(2)}`:'';
 out.push(`  ${P}P: last-standing ${100-Math.round(100*rk/G)}% | winner turns ${med(wt)} | rounds ${med(r).toFixed(1)} | <6r ${Math.round(100*early/G)}% | >15r ${Math.round(100*late/G)}%${stale?' | stalled '+stale:''}${mix}`);}
console.log(out.join('\n'));
