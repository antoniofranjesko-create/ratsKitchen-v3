// Matrix: every rival-targeting card vs every protection. Shows: not offered / blocked / hits.
const E=require('../../game/engine'),A=require('../../game/actions');
const cards=['poach','chilli','hotratato','play_ratato','muzzle','disease','fight','klepto','territorial','inherit','delivery','mole','fire'];
const prot={none:()=>{},boardup:(t)=>{t.boardup=1},cat:(t,r)=>{r._catShield=true},wok:(t)=>{t.hand.push({id:'wk',card:'wok'})},grease:(t)=>{t.hand.push({id:'gr',card:'grease'})},
 spice:(t,r)=>{r.prop='no_explode';r.kind='spice'},boiler:(t,r)=>{r.prop='no_steal';r.kind='boiler'},feral:(t,r)=>{r.prop='no_move';r.kind='feral'},alpha:(t,r)=>{t.rats.push(E.makeRat('alpha','blue'));t.hand.push({id:'fd',card:'food'})},territorial:(t)=>{t.territorial=1}};
const out={};
for(const c of cards){out[c]={};for(const [pn,pf] of Object.entries(prot)){
  const g=E.newGame([0,1,2].map(i=>({id:'p'+i,name:'P'+i,bot:false})));A.startTurn(g);
  const p=g.players[g.active], t=g.players.find(x=>x.id!==p.id);
  p.hand=[];t.hand=[];p.rats=[E.makeRat('plain','red'),E.makeRat('grub','red')];t.rats=[];
  const r=E.makeRat(c==='muzzle'?'toll':'plain','red');t.rats.push(r);t.rats.push(E.makeRat('fat','red'));
  pf(t,r);
  if(c==='fire'){p.armed={cols:['red'],age:1,card:'sched1'};}
  else if(c==='play_ratato') p.hand.push({id:'X',rat:E.makeRat('hotrat','red')});
  else p.hand.push({id:'X',card:c});
  const acts=A.legalActions(g,p).filter(a=>a.id==='X'||(c==='fire'&&a.type==='fire'));
  const a=acts.find(a=>(a.targets||[t.id]).includes(t.id));
  if(!a){out[c][pn]='-';continue;}
  const sig=()=>JSON.stringify([t.stars,t.rats.map(x=>x.id+(x._chilliBy?'c':'')+(x._muzzled?'m':'')+(x._dis?'d':'')),t.territorial,t._inheritBy||t._inherit||null,c==='klepto'?t.hand.filter(h=>!['wok','grease'].includes(h.card)).length:0]);const bl=()=>t.hand.filter(h=>['wok','grease','food'].includes(h.card)).length;const b0=bl();const before=sig();const _x=JSON.stringify([t.stars,t.rats.map(x=>x.id+(x._chilliBy?'c':'')+(x._muzzled?'m':'')+(x._dis?'d':'')),t.hand.length,t.territorial,t._inheritBy||t._inherit||null]);
  try{A.apply(g,p,a,t.id,r.id);}catch(e){out[c][pn]='ERR '+e.message;continue;}
  const after=sig();const _y=JSON.stringify([t.stars,t.rats.map(x=>x.id+(x._chilliBy?'c':'')+(x._muzzled?'m':'')+(x._dis?'d':'')),t.hand.length,t.territorial,t._inheritBy||t._inherit||null]);
  out[c][pn]=before===after?(bl()<b0?'blk:card':'BLOCKED'):'hit';
}}
const cols=Object.keys(prot);console.log('card'.padEnd(12)+cols.map(c=>c.padEnd(9)).join(''));
for(const c of cards)console.log(c.padEnd(12)+cols.map(k=>String(out[c][k]).slice(0,8).padEnd(9)).join(''));
