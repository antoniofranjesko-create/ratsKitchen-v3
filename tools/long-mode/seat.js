const E=require('../../game/engine'),A=require('../../game/actions');const N=+process.argv[2]||600,P=+process.argv[3]||4;let w0=0,G=0;
for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));g.active=Math.floor(Math.random()*P);let gu=0;
while(!g.over&&gu++<1500){A.startTurn(g);if(g.over)break;A.botTurn(g);if(g.over)break;A.endTurn(g);}if(g.over&&g.winner){G++;if(g.winner==='p0')w0++;}}
console.log(`${P}P: seat-0 bot wins ${Math.round(100*w0/G)}% (fair share ${Math.round(100/P)}%)`);
