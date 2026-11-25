// Deck use per game: market-deck reshuffles, rat-deck size, Market Day cycles; plus balance line.
const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||300;
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
for(const P of [3,4,5,6]){let G=0,last=0;const R=[],RS=[],minRat=[],deck0=[];
 for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));deck0.push(g.deck.length+g.players.reduce((s,p)=>s+p.hand.length,0));
  let gu=0,rs=0,mr=99,prev=g.deck.length;
  while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);
   if(g.deck.length>prev+1)rs++;prev=g.deck.length;mr=Math.min(mr,g.bins.length+g.alley.length);}
  if(!g.over||!g.winner)continue;G++;const r=g.turn/P;R.push(r);RS.push(rs);minRat.push(mr);
  const w=g.players.find(x=>x.id===g.winner);if(E.weight(w)<E.THRESHOLD)last++;}
 console.log(`${P}P: last-standing ${Math.round(100*last/G)}% | rounds ${med(R).toFixed(1)} | market reshuffles ${(RS.reduce((a,b)=>a+b,0)/G).toFixed(1)} (max ${Math.max(...RS)}) | Market Day cycles ${(med(R)/5).toFixed(1)} | rats left in rat deck at lowest ${med(minRat)}`);}
