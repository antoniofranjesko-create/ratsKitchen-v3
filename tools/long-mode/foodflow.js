// Food economy flow: where Food comes from, where it goes, how much players hold. Bot games, long-mode defaults.
const LD={V5:'1',V5TURN:'cat3',IMM:'2',FOODINC:'NONE',NOFOODCARDS:'1',HEALCOST:'3',THRESH:'10',STARSBYP:'7,6,5,4',KIND3:'1',FOODCARD:'1',FOODSTART:'2',FOODOPT:'1',PLAYCAP:'2',SHEET:'1',NERFS:'1',FIGHT:'1',FIGHTCH:'1',FIGHTN:'2',CUT:'exterm,gambit',BLOCKSWAP:'1',CATFAT:'1',TARGETTIMING:'1',NOBOILER:'1'};
for(const[k,v]of Object.entries(LD))if(process.env[k]===undefined)process.env[k]=v;
const E=require('../../game/engine'),A=require('../../game/actions');
const N=+process.argv[2]||600,P=+process.argv[3]||4;
const ft=p=>(p.food||0)+p.hand.reduce((s,c)=>s+E.foodVal(c),0);
const sink={},src={};let turns=0,held=0,zero=0,handFoodShare=0,handN=0,G=0,rounds=0,startFood=0;
global.__v5={};
global.__applyHook={pre:(g,p,act)=>({p,act,f0:ft(p)}),post:({p,act,f0})=>{const d=ft(p)-f0;if(d<0){const k=act.type+(act.feed?':'+act.feed:'');sink[k]=(sink[k]||0)-d;}}};
for(let n=0;n<N;n++){const g=E.newGame(Array.from({length:P},(_,i)=>({id:'p'+i,name:'B'+i,bot:true})));
 startFood+=g.players.reduce((s,p)=>s+ft(p),0);let gu=0;
 while(!g.over&&gu++<1500){const p=g.players[g.active];A.startTurn(g);if(g.over)break;
  if(p&&p.alive){turns++;const f=ft(p);held+=f;if(f===0)zero++;if(p.hand.length){handFoodShare+=p.hand.filter(c=>c.card==='food').length/p.hand.length;handN++;}}
  A.botTurn(g);if(g.over)break;A.endTurn(g);}
 G++;rounds+=g.roundCounter||0;}
const V=global.__v5;
console.log(JSON.stringify({P,games:G,turnsPerPlayer:+(turns/G/P).toFixed(1),
 perPlayerPerGame:{startFood:+(startFood/G/P).toFixed(2),tookFoodChoice:+((V.food||0)/G/P).toFixed(2),kind3:+((V.k3||0)/G/P).toFixed(2),alphaPaid:+((V.alpha||0)/G/P).toFixed(2)},
 sinksPerPlayerPerGame:Object.fromEntries(Object.entries(sink).map(([k,v])=>[k,+(v/G/P).toFixed(2)])),
 avgFoodHeldAtTurnStart:+(held/turns).toFixed(2),pctTurnsWithZeroFood:Math.round(100*zero/turns),foodShareOfHand:Math.round(100*handFoodShare/handN)}));
