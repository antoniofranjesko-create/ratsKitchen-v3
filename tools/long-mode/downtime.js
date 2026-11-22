// Elimination downtime and market-deck run-out timing (bot games).
const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||400;
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null};
for(const P of [3,4,5,6]){const firstOut=[],waitR=[],outPerGame=[],deckOut=[],endR=[];let anyOut=0,G=0;
 for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let gu=0;const outAt={};let dk=null;
  while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);
   const R=g.turn/P;for(const q of g.players)if(!q.alive&&outAt[q.id]==null)outAt[q.id]=R;if(dk==null&&g.deck.length===0)dk=R;}
  if(!g.over)continue;G++;const R=g.turn/P;endR.push(R);const outs=Object.values(outAt);outPerGame.push(outs.length);
  if(outs.length){anyOut++;firstOut.push(Math.min(...outs));for(const o of outs)if(g.winner&&true)waitR.push(R-o);}
  if(dk!=null)deckOut.push(dk);}
 console.log(`${P}P: games with an elimination ${Math.round(100*anyOut/G)}% | first out round ${med(firstOut)?.toFixed(1)} | eliminated players sit out (median rounds) ${med(waitR)?.toFixed(1)} | eliminations/game ${(outPerGame.reduce((a,b)=>a+b,0)/G).toFixed(1)} | market deck first runs out round ${med(deckOut)?.toFixed(1)} (${Math.round(100*deckOut.length/G)}% of games) | game ends round ${med(endR).toFixed(1)}`);}
