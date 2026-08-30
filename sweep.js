const E=require('./game/engine'); const A=require('./game/actions');
function run(P,games){
  let last=0,rk=0,none=0,ko=0,winTurns=[],gameRounds=[],firstElim=[],firstElimUnder6=0,elimGames=0;
  for(let n=0;n<games;n++){
    const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));let guard=0;
    while(!g.over&&guard++<3000){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}
    if(!g.over){none++;continue;}
    gameRounds.push(g.turn/P);
    if(g._firstElimTurn!=null){ const fe=g._firstElimTurn/P; firstElim.push(fe); elimGames++; if(fe<6) firstElimUnder6++; }
    if(g.winner===null){ko++;last++;continue;}
    const w=g.players.find(p=>p.id===g.winner);
    if(w&&E.weight(w)>=E.THRESHOLD){rk++;winTurns.push(w.turns);}else{last++;if(w)winTurns.push(w.turns);}
  }
  const med = a => { const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]||0; };
  return {
    attr:Math.round(100*last/(rk+last||1)),
    winMed:med(winTurns).toFixed(1),
    roundsMed:med(gameRounds).toFixed(1),
    firstElimMed: elimGames? med(firstElim).toFixed(1):'-',
    pctUnder6: elimGames? Math.round(100*firstElimUnder6/elimGames):0,
    stale:(100*none/games).toFixed(1), ko
  };
}
const label=process.env.CFG||'';
console.log('--- '+label+' ---');
for(const P of (process.env.PC||'3,4,5,6,7,8').split(',').map(Number)){
  const r=run(P, +(process.env.G||400));
  console.log('  P='+P+': attr '+r.attr+'% | winner-med '+r.winMed+' | rounds-med '+r.roundsMed+' | firstElim-med '+r.firstElimMed+' | %elim<r6 '+r.pctUnder6+'% | stale '+r.stale+'% | simKO '+r.ko);
}
