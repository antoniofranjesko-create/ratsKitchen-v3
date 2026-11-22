// Per player count: stars, last-standing, early end, first knockout timing, rounds.
const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||400;
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN};
const out=[];
for(const P of [3,4,5,6]){let G=0,last=0,early=0,ko5=0,over15=0,stale=0;const first=[],R=[];let stars=null;
 for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));stars=g.players[0].stars;let gu=0,fo=null;
  while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);if(fo==null&&g.players.some(q=>!q.alive))fo=g.turn/P;}
  if(!g.over||!g.winner){stale++;continue;}G++;const r=g.turn/P;R.push(r);if(fo==null&&g.players.some(q=>!q.alive))fo=r;
  const w=g.players.find(x=>x.id===g.winner);if(E.weight(w)<E.THRESHOLD)last++;if(r<6)early++;if(r>15)over15++;if(fo!=null){first.push(fo);if(fo<5)ko5++;}}
 out.push(`${P}P stars ${stars}: last-standing ${Math.round(100*last/G)}% | ends <r6 ${Math.round(100*early/G)}% | knockout before r5 ${Math.round(100*ko5/G)}% | first knockout r${med(first).toFixed(1)} | rounds ${med(R).toFixed(1)} | >15r ${Math.round(100*over15/G)}%`);}
console.log(out.join('\n'));
