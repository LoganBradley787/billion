'use strict';
// ---------- state ----------
let state='hub',P=null,R=null,lastSum=null,hubAt=0;
let enemies=[],bullets=[],ebullets=[],gems=[],parts=[],texts=[],fx=[],zones=[];

// the first dozen levels are discounted so a new run gets its first picks quickly
const xpFor=l=>Math.floor(4+2*l+XP_K*Math.pow(l,XP_P)*Math.min(1,l/12));
const cardCount=()=>Object.keys(P.cards).filter(id=>!CARDS[id].free).length;

function calcWeapon(w){
  const m=w.m,first=Object.keys(P.weapons)[0]===w.id;
  w.s={
    dm:RANK_DM[w.rank-1]*(1+MOD_DMG*w.mods.length)*Math.pow(1.2,w.over)*(m.heavy?1.8:1)*(m.rapid?.9:1)*(P.cards.onetrick&&first?2:1),
    rm:(m.heavy?.8:1)*(m.rapid?1.6:1),am:m.big?1.35:1,size:m.big?1.35:1,kb:m.conc?2:1,
    el:m.burn?'burn':m.chill?'chill':m.poison?'poison':m.shock?'shock':null};
}
function recalc(){
  const t=id=>P.train[id]||0,c=id=>P.cards[id]||0;
  P.might=(1+.1*mlv('might')+.06*mlv('over'))*Math.pow(1.15,t('might'))*(c('glass')?1.7:1)*(c('arsenal')?.92:1);
  P.haste=1+.1*t('haste');
  P.area=1+.1*t('area');
  P.speed=215*(1+.04*mlv('speed'))*(1+.06*t('speed'))*(c('boots')?.88:1)*(c('cold')?.92:1);
  P.magnet=110*(1+.2*mlv('magnet'))*(c('magnetic')?2:1);
  P.maxhp=Math.max(20,(100+15*mlv('hp')+25*t('vigor')+(c('boots')?80:0)-(c('mirror')?25:0))*(c('glass')?.7:1));
  P.regen=.6*t('regen')*(c('berserk')?.5:1);
  P.crit=.05+.08*t('crit');
  P.greed=(1+.15*mlv('greed'))*(c('greed')?1.5:1);
  P.xpMult=(1+.04*mlv('xp'))*(c('ring')?1.3:1);
  P.shieldMax=c('bubble');P.shieldCd=(8-c('bubble'))*(c('spiked')?1.5:1);
  P.wslots=Math.min(c('onetrick')?2:99,4+mlv('wslot')+mlv('wslot2')+(c('arsenal')?1:0));
  P.cslots=5+mlv('cslot');
  P.hp=Math.min(P.hp,P.maxhp);
  for(const id in P.weapons)calcWeapon(P.weapons[id]);
}
const newWeapon=id=>({id,rank:1,mods:[],m:{},evo:null,over:0,cd:.3,a:0,pc:.5});
function newRun(){
  enemies=[];bullets=[];ebullets=[];gems=[];parts=[];texts=[];fx=[];zones=[];
  P={x:0,y:0,r:13,hp:1e9,inv:0,face:0,level:1,xp:0,xpNext:xpFor(1),dead:false,still:0,moving:false,rate:1,
    weapons:{},cards:{},train:{},ban:{},rerolls:mlv('reroll'),revives:mlv('revive'),banish:mlv('banish'),shield:0,shT:0,flinchT:0};
  if(!mlv('pickw'))P.weapons.blaster=newWeapon('blaster');
  recalc();P.hp=P.maxhp;
  R={t:0,fp:0,kills:0,combo:0,comboT:0,maxCombo:0,acc:0,nextSwarm:30,swarms:0,nextElite:40,nextBoss:150,bosses:0,nextPig:55,
    shake:0,flash:0,hurt:0,banner:null,queue:[],offer:null,banMode:false,timers:[],dmg:{},near:0,siph:0,vamp:0,
    heat:Math.min(save.heat,save.maxHeat),finalDone:false,cleared:false,clearT:0,newHeat:0,picks:0,xpGot:0};
  if(mlv('pickw'))R.queue.push({title:'CHOOSE YOUR WEAPON',type:'loadout'});
  for(let i=0;i<mlv('head');i++)R.queue.push({title:'HEAD START'});
}
const comboMult=()=>(1+Math.log10(1+R.combo)*1.2)*(P.cards.roller?1.5:1);
// after the final boss falls the run goes into overtime: everything escalates until you drop
const overtime=()=>R.cleared?(R.t-R.clearT)/60:0;
const fpMult=()=>Math.pow(SPICE_FP,R.heat);
function banner(s){R.banner={s,t:0}}
function later(d,fn){R.timers.push({t:R.t+d,fn})}
function heal(v){if(!P.dead)P.hp=Math.min(P.maxhp,P.hp+v)}
function playerEls(){const s=[];for(const id in P.weapons){const el=P.weapons[id].s.el;if(el&&!s.includes(el))s.push(el)}return s}

// ---------- spatial grid ----------
const CELL=72,grid=new Map();
function buildGrid(){
  grid.clear();
  for(const e of enemies){
    const k=(Math.floor(e.x/CELL)+5000)*10000+Math.floor(e.y/CELL)+5000;
    let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(e);
  }
}
function query(x,y,r,fn){
  const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),y0=Math.floor((y-r)/CELL),y1=Math.floor((y+r)/CELL);
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
    const a=grid.get((cx+5000)*10000+cy+5000);
    if(a)for(let i=0;i<a.length;i++)if(!a[i].dead)fn(a[i]);
  }
}
function nearest(x,y,maxd,skip){
  let best=null,bd=maxd*maxd;
  for(const e of enemies){
    if(e.dead||(skip&&skip.includes(e)))continue;
    const d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;best=e}
  }
  return best;
}
function inRange(maxd,test){
  const c=[];for(const e of enemies)if(!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<maxd&&(!test||test(e)))c.push(e);
  return c;
}
const randomEnemy=maxd=>{const c=inRange(maxd);return c.length?pickRand(c):null};
const statused=e=>e.burn>0||e.chill>0||e.frozen>0||e.poison>0||e.shock>0;
function toughest(maxd){let b=null;for(const e of inRange(maxd))if(!b||e.hp>b.hp)b=e;return b}
// the enemy with the most neighbours, from a random sample, so area weapons land on crowds
function densest(maxd){
  const c=shuffle(inRange(maxd)).slice(0,10);let best=null,bn=-1;
  for(const e of c){let n=0;query(e.x,e.y,110,()=>n++);if(n>bn){bn=n;best=e}}
  return best;
}

// ---------- spawning ----------
function spawn(type,x,y){
  const T=ET[type],m=R.t/60,C=P.cards;
  const hm=(1+m*.4)*Math.pow(HPG,m)*Math.pow(1.2+(SPICE_HP-1.2)*Math.min(1,m/4),R.heat)*Math.pow(4,overtime())*(C.greed?1.12:1);
  const e={type,x,y,r:T.r,hp:T.hp*hm,spd:T.spd*(1+Math.min(.5,m*.03)+.5*overtime())*(C.magnetic?1.08:1)*rand(.9,1.1),
    dmg:T.dmg*(1+m*.15)*Math.pow(1.2,R.heat)*Math.pow(2,overtime()),
    kx:0,ky:0,flash:0,shot:rand(1.5,3),orbT:-9,sawT:-9,dead:false};
  e.maxhp=e.hp;enemies.push(e);return e;
}
const edgeDist=()=>Math.hypot(W,H)/Z/2+70;
function spawnAtEdge(type,ang){
  const a=ang===undefined?rand(0,TAU):ang,d=edgeDist()+rand(0,60);
  return spawn(type,P.x+Math.cos(a)*d,P.y+Math.sin(a)*d);
}
function rollType(t){
  const w=[['grunt',10]];
  if(t>30)w.push(['runner',4]);
  if(t>75)w.push(['splitter',3]);
  if(t>120)w.push(['tank',2+t/240]);
  if(t>150)w.push(['shooter',2]);
  let sum=0;for(const x of w)sum+=x[1];
  let r=Math.random()*sum;
  for(const x of w){r-=x[1];if(r<=0)return x[0]}
  return'grunt';
}
function director(dt){
  const t=R.t,m=t/60;
  R.acc+=(1.1+t*.035+m*m*.15)*(P.cards.ring?1.2:1)*dt;
  const cap=Math.min(340,60+t*1.4)*(P.cards.ring?1.2:1);
  while(R.acc>=1){R.acc-=1;if(enemies.length<cap)spawnAtEdge(rollType(t))}
  if(t>=R.nextSwarm){
    R.nextSwarm+=25;if(R.swarms++<4)banner('SWARM!');
    const a=rand(0,TAU),n=Math.floor(14+m*5);
    for(let i=0;i<n&&enemies.length<480;i++)spawnAtEdge('runner',a+rand(-.35,.35));
  }
  if(t>=R.nextElite){R.nextElite+=75;spawnAtEdge('elite')}
  if(t>=R.nextBoss&&R.bosses<BOSSES.length){
    const B=BOSSES[R.bosses],b=spawnAtEdge('boss');
    b.kind=R.bosses;b.col=B.col;b.sides=B.sides;b.name=B.name;
    R.nextBoss+=150;R.bosses++;
    banner(B.name);sfx('boss');
  }
  if(rich()&&t>=R.nextPig){
    R.nextPig+=70;const a=rand(0,TAU),e=spawn('piggy',P.x+Math.cos(a)*300,P.y+Math.sin(a)*300);
    e.left=18;e.spd=180;banner('PIGGY BANK!');sfx('chest');
  }
  if(t>=FINAL_AT&&!R.finalDone){
    R.finalDone=true;const b=spawnAtEdge('final');b.kind=0;b.name=FINAL_NAME;
    banner('FINAL BOSS: '+FINAL_NAME);sfx('boss');
  }
}

// ---------- damage ----------
function burst(x,y,col,n,sp){
  for(let i=0;i<n&&parts.length<420;i++){
    const a=rand(0,TAU),s=rand(.3,1)*sp;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:rand(.25,.6),c:col,s:rand(2,4.5)});
  }
}
// card effects that depend on who is being hit, from where, and what you are doing
function cardMul(e,w){
  const C=P.cards;let m=1;
  if(C.sniper||C.brawler||C.tunnel){
    const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy);
    if(C.sniper)m*=d>300?1.6:d<150?.85:1;
    if(C.brawler)m*=d<180?1.6:d>300?.85:1;
    if(C.tunnel){const a=Math.atan2(dy,dx)-P.face,da=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));m*=da<1?1.5:da>2.1?.8:1}
  }
  if(C.stand)m*=P.still>.5?1.4:.9;
  if(C.berserk)m*=2-P.hp/P.maxhp;
  if(C.mob)m*=e.r>40?.85:1+Math.min(.6,.02*R.near);
  if(C.giant)m*=e.r>24?2:.9;
  if(C.elemental)m*=.85;
  if(C.cold&&e.frozen>0)m*=2;
  if(e.weakT>R.t)m*=1.2;
  if(e.markT>R.t&&w&&w.id!=='laser')m*=1.3;
  return m;
}
function knock(e,nx,ny,kb){
  // in overtime the horde stops being pushed around, so no wall holds forever
  const res=(e.r>40?.08:e.type==='elite'?.3:e.type==='tank'?.5:1)*Math.pow(.5,overtime());
  e.kx+=nx*kb*res;e.ky+=ny*kb*res;
}
// a weapon's direct hit: cards, crits, then the weapon's element. Returns the damage dealt.
function hit(e,dmg,w,nx,ny,kb){
  if(e.dead)return 0;
  const c=Math.random()<P.crit,d=dmg*P.might*cardMul(e,w)*(c?2:1)*rand(.92,1.08);
  if(w)R.dmg[w.id]=(R.dmg[w.id]||0)+Math.min(d,e.hp);
  e.hp-=d;e.flash=.09;
  if(kb)knock(e,nx,ny,kb*(w?w.s.kb:1));
  if(texts.length<70)texts.push({x:e.x+rand(-8,8),y:e.y-e.r,s:''+Math.round(d),t:0,c:c?'#ffd23f':'#ffffff',big:c});
  if(w){
    if(e.shock>0){e.shock=0;arc(e,d*.4,w.id)}
    if(w.s.el&&e.hp>0)applyStatus(e,w.s.el,d,w);
  }
  if(e.hp<=0)kill(e,w);else sfx('hit');
  return d;
}
// damage that is already final: burn and poison ticks, arcs, shatters, combustion
function dealRaw(e,d,src,col,quiet){
  if(e.dead)return;
  if(src)R.dmg[src]=(R.dmg[src]||0)+Math.min(d,e.hp);
  e.hp-=d;
  if(d>=1&&(!quiet||Math.random()<.25)&&texts.length<70)texts.push({x:e.x+rand(-8,8),y:e.y-e.r,s:''+Math.round(d),t:0,c:col});
  if(e.hp<=0)kill(e,null);
}
function blastRaw(x,y,r,d,src,col,skip){
  query(x,y,r+MAXR,e=>{if(e!==skip&&Math.hypot(e.x-x,e.y-y)<r+e.r)dealRaw(e,d,src,col)});
  fx.push({type:'ring',x,y,r,t:0,dur:.3,col});
}
function arc(e,d,src){
  const c=[];
  query(e.x,e.y,150,o=>{if(o!==e)c.push(o)});
  for(const o of c.slice(0,2)){
    dealRaw(o,d,src,ELEMENTS.shock.col);
    fx.push({type:'bolt',pts:[{x:e.x,y:e.y},{x:o.x,y:o.y}],t:0,dur:.12,col:ELEMENTS.shock.col});
  }
}
// burn and chill cancel; burn meeting poison combusts; shock meeting ice shatters
function applyStatus(e,el,d,w){
  const boss=e.r>40,k=P.cards.elemental?2:1,pc=w.pc||.5,D=d/pc*(k>1?1.5:1);   // D: that weapon's damage per second on one target
  if(el==='burn'){
    if(e.chill>0||e.frozen>0){e.chill=0;e.frozen=0;e.frost=0;return}
    e.burn=4*k;e.burnD=Math.max(e.burnD||0,D*.5);e.burnS=w.id;
    if(e.poison>0)combust(e);
  }else if(el==='chill'){
    if(e.burn>0){e.burn=0;e.burnD=0;return}
    e.chill=2*k;
    if(!boss&&!(e.frostImm>R.t)){
      e.frost=(e.frost||0)+Math.max(.2,Math.min(1,pc));e.frostD=(e.frostD||0)+d;
      if(e.frost>=1){
        e.shatD=e.frostD*4;e.frostD=0;
        e.frost=0;e.frozen=1.5*k;e.frostImm=R.t+1.5*k+2.5;e.frozenS=w.id;sfx('freeze');
        if(e.shock>0){e.shock=0;shatter(e,w.id,false)}
      }
    }
  }else if(el==='poison'){
    e.poison=Math.min(30*(k>1?1.5:1),(e.poison||0)+3*pc);
    e.poisonD=Math.max(e.poisonD||0,D*.04);e.poisonT=4*k;e.poisonS=w.id;
    if(e.burn>0)combust(e);
  }else if(e.frozen>0)shatter(e,w.id,false);
  else e.shock=3*k;
}
function combust(e){
  const d=e.poison*e.poisonD*3;e.poison=0;
  blastRaw(e.x,e.y,85,d,e.poisonS,ELEMENTS.poison.col);
}
// a frozen enemy bursts for four times the damage it took to freeze it; killing it does the same
function shatter(e,src,dead){
  const d=e.shatD||0;e.frozen=0;
  burst(e.x,e.y,ELEMENTS.chill.col,10,220);
  blastRaw(e.x,e.y,95,d,src,ELEMENTS.chill.col,e);
  if(!dead)dealRaw(e,d,src,ELEMENTS.chill.col);
}
function kill(e,w){
  if(e.dead)return;
  e.dead=true;R.kills++;R.combo++;R.comboT=2.5;
  if(R.combo>R.maxCombo)R.maxCombo=Math.floor(R.combo);
  const T=ET[e.type],m=R.t/60;
  let gain=T.fp*(1+m*.15)*P.greed*comboMult()*fpMult();
  const mw=P.weapons.money;
  if(mw&&mw.m.counterfeit)gain*=.9;
  if(w&&w.id==='money'&&w.m.tips)gain*=1.25;
  R.fp+=gain;
  burst(e.x,e.y,e.col||T.col,e.r>40?60:e.r>18?16:7,e.r>18?260:170);
  sfx('kill');
  if(e.r>24||e.type==='piggy'||Math.random()<.06)texts.push({x:e.x,y:e.y-e.r-10,s:'+'+cash(gain),t:0,c:'#ffd23f',big:true,slow:true});
  dropGem(e.x,e.y,T.xp*(1+Math.floor(m/3)));
  const r=Math.random();
  if(r<.012)gems.push({x:e.x,y:e.y,kind:'heart'});
  else if(r<.017)gems.push({x:e.x,y:e.y,kind:'vac'});
  else if(r<.02)gems.push({x:e.x,y:e.y,kind:'bomb'});
  if(P.cards.vampire&&R.vamp>=1){R.vamp--;heal(.5)}
  if(w&&w.m.siphon&&R.siph>=1){R.siph--;heal(1)}
  if(w&&w.id==='lightning'&&w.m.overload)blastRaw(e.x,e.y,75,18*w.s.dm*P.might,'lightning','#a8e6ff',e);
  if(e.frozen>0)shatter(e,e.frozenS,true);
  if(e.type==='splitter')for(let i=0;i<2;i++){const s=spawn('mini',e.x+rand(-10,10),e.y+rand(-10,10));s.kx=rand(-200,200);s.ky=rand(-200,200)}
  // no more chests once the run is cleared: overtime is supposed to end
  if((e.type==='elite'||e.type==='piggy')&&!R.cleared)gems.push({x:e.x,y:e.y,kind:'chest',n:1});
  if(e.type==='piggy'){banner('JACKPOT  +'+cash(gain));R.flash=.25}
  if(e.type==='boss'){
    gems.push({x:e.x,y:e.y,kind:'chest',n:1});ebullets.length=0;
    R.shake=22;R.flash=.35;banner('BOSS DOWN');sfx('boom');
  }
  if(e.type==='final'){
    const bonus=R.fp*.25;R.fp+=bonus;R.cleared=true;R.clearT=R.t;
    gems.push({x:e.x,y:e.y,kind:'chest',n:2});ebullets.length=0;
    R.shake=30;R.flash=.5;banner('RUN CLEARED  +'+cash(bonus));sfx('evo');
    if(R.heat>=save.maxHeat&&save.maxHeat<MAXHEAT){save.maxHeat=R.heat+1;R.newHeat=save.maxHeat;persist()}
  }
}
function dropGem(x,y,v){
  if(gems.length>350){
    for(let i=0;i<8;i++){const g=pickRand(gems);if(g.kind==='xp'){g.v+=v;return}}
  }
  gems.push({x:x+rand(-6,6),y:y+rand(-6,6),kind:'xp',v});
}
// kb below zero pulls toward the centre. bigMul is extra damage to elites and bosses.
function explode(x,y,r,dmg,w,kb,col,bigMul){
  query(x,y,r+MAXR,e=>{
    const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy)||1;
    if(d<r+e.r)hit(e,dmg*(bigMul&&e.r>24?bigMul:1),w,dx/d,dy/d,kb);
  });
  fx.push({type:'ring',x,y,r,t:0,dur:.3,col});
  R.shake=Math.max(R.shake,Math.min(7,r/40));sfx('boom');
}
// armoured bullets (the final boss fires a few) cannot be eaten
function eatBullets(x,y,r,mirrorW){
  for(const b of ebullets){
    if(b.life<=0||b.armor||Math.hypot(b.x-x,b.y-y)>r+b.r)continue;
    b.life=0;
    if(parts.length<400)parts.push({x:b.x,y:b.y,vx:rand(-60,60),vy:rand(-60,60),t:0,life:.3,c:'#ff4d6d',s:3});
    if(mirrorW)bolt(mirrorW,b.x,b.y,Math.atan2(b.y-P.y,b.x-P.x),20*mirrorW.s.dm,{});
  }
}
// heavy hits (a boss mid-dash) pop every bubble charge at once
function hurt(d,heavy){
  if(P.inv>0||P.dead)return;
  const nv=P.weapons.nova;
  if(nv&&nv.m.flinch&&R.t>P.flinchT){P.flinchT=R.t+.6;novaBlast(nv,.7)}
  if(P.shield>0){
    P.shield=heavy?0:P.shield-1;P.shT=P.shieldCd;P.inv=.5;
    fx.push({type:'ring',x:P.x,y:P.y,r:46,t:0,dur:.3,col:'#7fd8ff'});sfx('block');
    if(P.cards.spiked)blastRaw(P.x,P.y,170,60*P.might*(1+R.t/60),'','#7fd8ff');
    if(P.cards.mirror)for(let i=0;i<12;i++)bullets.push({kind:'bolt',w:null,x:P.x,y:P.y,vx:Math.cos(i*TAU/12)*560,vy:Math.sin(i*TAU/12)*560,r:6,dmg:25*(1+R.t/60),pierce:2,life:.9,hit:[]});
    return;
  }
  P.hp-=d;P.inv=.6;R.shake=Math.max(R.shake,11);R.hurt=.3;R.combo=P.cards.roller?0:Math.floor(R.combo*.5);sfx('hurt');
  if(P.hp<=0){
    if(P.revives>0){
      P.revives--;P.hp=P.maxhp*.5;P.inv=2.5;banner('NOT TODAY');
      blastRaw(P.x,P.y,380,400*(1+R.t/30),'','#ffffff');R.flash=.4;
    }else die();
  }
}
function addXP(v){
  // experience dries up in overtime, so the escalation always wins in the end
  v*=P.xpMult*Math.pow(.6,overtime());
  P.xp+=v;R.xpGot+=v;
  while(P.xp>=P.xpNext){P.xp-=P.xpNext;P.level++;P.xpNext=xpFor(P.level);R.queue.push({title:'LEVEL UP'})}
}

// ---------- weapons ----------
function bolt(w,x,y,a,dmg,o){
  const sp=o.sp||640;
  bullets.push(Object.assign({kind:'bolt',w,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5*(w?w.s.size:1),dmg,pierce:0,life:1.1,hit:[]},o));
}
function novaBlast(w,k){
  const m=w.m,E=w.evo;
  const r=130*P.area*w.s.am*(m.focus?.7:1)*(E==='a'?1.5:E==='b'?1.2:1);
  const dmg=30*w.s.dm*k*(m.focus?2:1)*(m.implode?1.4:1)*(E==='a'?1.5:E==='b'?1.3:1);
  explode(P.x,P.y,r,dmg,w,m.implode?-240:280,E==='a'?'#ffd23f':'#7fd8ff');
  if(m.implode)query(P.x,P.y,r+MAXR,e=>{if(e.r<=40&&Math.hypot(e.x-P.x,e.y-P.y)<r+e.r)e.stunT=R.t+1});
  eatBullets(P.x,P.y,r,null);
  if(E==='b'&&k===1)zones.push({kind:'quake',w,x:P.x,y:P.y,r,t:0,dur:3,dmg:dmg*.25,tick:0});
}
function zapHit(w,e,dmg){hit(e,dmg*(w.m.conductor&&statused(e)?1.5:1),w,0,0,0)}
// pulls everything in range toward a point; on a tick it also grinds them. Returns who is inside.
function holeTick(w,x,y,r,dmg,tk,dt){
  const m=w.m,inside=[];
  query(x,y,r+MAXR,e=>{
    const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;
    if(d>r+e.r)return;
    const pull=Math.min(d,230*(e.r>40?.1:e.r>24?.35:1)*dt);
    e.x+=dx/d*pull;e.y+=dy/d*pull;inside.push(e);
  });
  if(tk){
    const k=m.spag?Math.min(3,1+.06*inside.length):1,els=m.carrier?playerEls():null;
    for(const e of inside){
      const d=hit(e,dmg*k,w,0,0,0);
      if(els&&!e.dead)for(const el of els)if(el!==w.s.el)applyStatus(e,el,d,w);
    }
  }
  return inside;
}
function updateWeapons(dt){
  for(const id in P.weapons){
    const w=P.weapons[id],S=w.s,m=w.m,E=w.evo,dm=S.dm,area=P.area*S.am;
    let rate=P.rate*S.rm;
    switch(id){
      case'blaster':{
        const cdB=E==='a'?.1:E==='b'?1:.5;w.pc=cdB/rate;
        w.cd-=dt;if(w.cd>0)break;
        const t=nearest(P.x,P.y,E==='b'?760:540);if(!t){w.cd=.1;break}
        w.cd=cdB/rate;
        const a=Math.atan2(t.y-P.y,t.x-P.x),dmg=14*dm*(m.split?.85:1)*(E==='a'?.55:E==='b'?7:1);
        for(const off of fan(1+(m.split?2:0),.14))
          bolt(w,P.x,P.y,a+off+(E==='a'?rand(-.07,.07):0),dmg,{pierce:E==='b'?99:w.rank>=3?1:0,bounce:m.ricochet?2:0,hollow:m.hollow,
            sp:E==='b'?1500:640,rail:E==='b',r:(E==='b'?12:5)*S.size});
        sfx('shoot');break;
      }
      case'orbit':{
        w.a+=dt*2.6*Math.min(2,rate);
        // more area means more orbs, so a wider orbit never opens gaps
        const n=(2+w.rank)*(E==='a'?2:1)+Math.floor((area-1)*4),rad=100*area*(m.grinder?.75:1),cdh=m.grinder?.1:.2;
        const dmg=22*dm*(E==='a'?1.4:E==='b'?.6:1);
        w.orbR=(12+(E==='a'?4:0))*S.size;
        // seconds between orb passes over the same spot, which is how often one enemy really gets hit
        w.pc=Math.max(cdh,TAU/(2.6*Math.min(2,rate)*n));
        w.rings=[{n,rad,dir:1,dmg}];if(m.ring2)w.rings.push({n,rad:rad*1.6,dir:-1,dmg:dmg*.5});
        for(const g of w.rings)for(let i=0;i<g.n;i++){
          if(g.dir>0&&w.out&&w.out[i])continue;
          const a=w.a*g.dir+i*TAU/g.n,ox=P.x+Math.cos(a)*g.rad,oy=P.y+Math.sin(a)*g.rad;
          query(ox,oy,w.orbR+MAXR,e=>{
            const dx=e.x-ox,dy=e.y-oy,rr=w.orbR+e.r;
            if(dx*dx+dy*dy<rr*rr&&R.t-e.orbT>cdh){
              e.orbT=R.t;const px=e.x-P.x,py=e.y-P.y,pd=Math.hypot(px,py)||1;
              hit(e,g.dmg,w,px/pd,py/pd,260*(m.bumper?3:1));
            }
          });
          eatBullets(ox,oy,w.orbR+3,m.mirrororb?w:null);
        }
        if(E==='b'){
          w.cd-=dt;
          if(w.cd<=0){
            // one of the ring's own orbs breaks off for the thickest crowd, bursts there and flies home; at least two always stay
            w.out=w.out||{};
            const t=densest(560);let idx=-1,bd=9;
            if(t){const ta=Math.atan2(t.y-P.y,t.x-P.x);
              for(let i=0;i<n;i++){if(w.out[i])continue;const da=Math.abs(Math.atan2(Math.sin(w.a+i*TAU/n-ta),Math.cos(w.a+i*TAU/n-ta)));if(da<bd){bd=da;idx=i}}}
            if(idx<0||Object.keys(w.out).length>n-3){w.cd=.15;break}
            w.cd=.5/rate;w.out[idx]=true;const oa=w.a+idx*TAU/n;
            bullets.push({kind:'comet',w,idx,n,rad,x:P.x+Math.cos(oa)*rad,y:P.y+Math.sin(oa)*rad,tx:t.x,ty:t.y,back:false,r:w.orbR*1.15,dmg:44*dm,er:75*area,life:3,hcd:.25});
          }
        }
        break;
      }
      case'nova':{
        const cdB=E==='a'?1.5:3;w.pc=cdB/rate;
        w.cd-=dt;if(w.cd>0)break;
        w.cd=cdB/rate;novaBlast(w,1);
        if(m.after)later(.4,()=>novaBlast(w,.6));
        break;
      }
      case'lightning':{
        if(m.storm)rate*=P.moving?1.6:.85;
        if(E==='b'){
          w.pc=.25/rate;w.cd-=dt;if(w.cd>0)break;
          w.cd=.25/rate;
          const c=[];
          query(P.x,P.y,230+MAXR,e=>{const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<230+e.r)c.push([d,e])});
          c.sort((a,b)=>a[0]-b[0]);
          for(const[,e]of c.slice(0,3)){
            fx.push({type:'bolt',pts:[{x:P.x,y:P.y},{x:e.x,y:e.y}],t:0,dur:.12,col:'#ffe95d'});
            zapHit(w,e,13.5*dm);
          }
          if(c.length)sfx('zap');
          break;
        }
        w.pc=1.3/rate;w.cd-=dt;if(w.cd>0)break;
        w.cd=1.3/rate;
        const strikes=1+(w.rank>=3)+(E==='a'?3:0),chain=(3+w.rank)*(m.fork?2:1),dmg=26*dm*(E==='a'?1.3:1);
        for(let s=0;s<strikes;s++){
          let t=null;
          if(m.conductor){const c=inRange(480,statused);if(c.length)t=pickRand(c)}
          t=t||randomEnemy(480);if(!t)break;
          const done=[],pts=[{x:t.x+rand(-40,40),y:t.y-460}];
          for(let c=0;c<chain&&t;c++){
            done.push(t);pts.push({x:t.x,y:t.y});zapHit(w,t,dmg);
            t=nearest(t.x,t.y,m.fork?230:190,done);
          }
          fx.push({type:'bolt',pts,t:0,dur:.2,col:E==='a'?'#ffd23f':'#a8e6ff'});
        }
        sfx('zap');break;
      }
      case'saw':{
        w.pc=1;w.cd-=dt;if(w.cd>0)break;
        w.cd=(E==='b'?2.5:2)/rate;
        const t=nearest(P.x,P.y,500),a0=t?Math.atan2(t.y-P.y,t.x-P.x):P.face;
        const angs=fan(1+(w.rank>=3)+(E?1:0),.5).map(o=>a0+o);
        if(m.twin)angs.push(a0+Math.PI);
        for(const a of angs)bullets.push({kind:'saw',w,x:P.x,y:P.y,dx:Math.cos(a),dy:Math.sin(a),sp:780,t:0,rot:0,
          r:18*area*(E==='a'?2:1),dmg:30*dm*(m.arc?1.3:1)*(E==='a'?1.6:E==='b'?1.2:1),life:E==='b'?5:m.lodged?3.5:1.5,hcd:m.serr?.14:.28,
          lodged:m.lodged&&E!=='b',arc:m.arc&&E!=='b',storm:E==='b',vortex:m.vortex,
          ox:P.x,oy:P.y,reach:Math.max(240,Math.min(400,t?Math.hypot(t.x-P.x,t.y-P.y):300))});
        break;
      }
      case'rocket':{
        const nuke=E==='b',cdB=nuke?6:1.4*(m.bigone?1.67:1);w.pc=cdB/rate;
        w.cd-=dt;if(w.cd>0)break;
        w.cd=cdB/rate;
        const n=nuke||m.bigone?1:1+(w.rank>=3),tgs=[];
        // the first rocket takes the thickest knot of enemies close to you, the rest the nearest ones: the stuff about to hurt you
        for(let i=0;i<n;i++){
          const tg=m.seeker?toughest(600):(!i&&densest(300))||nearest(P.x,P.y,560,tgs);if(tg)tgs.push(tg);
          const aim=tg?Math.atan2(tg.y-P.y,tg.x-P.x):P.face;
          bullets.push({kind:'rocket',w,x:P.x,y:P.y,a:aim+(m.carpet?rand(-.2,.2):rand(-.7,.7)),sp:m.carpet?420:260,
          tg,carpet:m.carpet,r:nuke?12:6,dmg:36*dm*(m.bigone?(nuke?1.5:3):1)*(nuke?5:1),
          er:85*area*(m.bigone?(nuke?1.2:2):1)*(m.carpet?1.4:1)*(nuke?3.2:1),life:m.carpet?.65:2.6,cluster:E==='a',nuke,big:m.seeker?1.5:0});
        }
        break;
      }
      case'aura':{
        const rad=150*area*(1+.15*(w.rank-1))*(E==='a'?1.5:E==='b'?1.2:1);w.rad=rad;w.pc=.4/rate;
        w.cd-=dt;if(w.cd>0)break;
        w.cd=.4/rate;
        const dmg=8*dm*(E==='a'?1.5:E==='b'?1.3:1);let cnt=0;
        query(P.x,P.y,rad+MAXR,e=>{
          const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;
          if(d>rad+e.r)return;
          cnt++;e.slowT=R.t+.6;e.slowF=e.r>40?.85:E==='a'?.4:.65;
          if(m.weaken)e.weakT=R.t+.6;
          let k=1;
          if(m.intens){e.auraN=R.t-(e.auraL||0)<1?(e.auraN||0)+1:1;e.auraL=R.t;k=1+Math.min(2,e.auraN*.12)}
          if(E==='b'&&e.hp<e.maxhp*.15){
            if(e.r<=40){R.dmg.aura=(R.dmg.aura||0)+e.hp;kill(e,w);return}
            k*=2;
          }
          hit(e,dmg*k,w,dx/d,dy/d,m.repel?150:30);
        });
        if(m.leech&&cnt)heal(Math.min(1.2,.12*cnt));
        break;
      }
      case'hole':{
        w.pc=.25;
        if(E==='b'){
          w.pa=(w.pa||0)+dt;w.pt=(w.pt||0)-dt;
          const tk=w.pt<=0;if(tk)w.pt=.25;
          w.pet={x:P.x+Math.cos(w.pa)*150,y:P.y+Math.sin(w.pa)*150,r:75*area};
          holeTick(w,w.pet.x,w.pet.y,w.pet.r,7*dm,tk,dt);
        }
        w.cd-=dt;if(w.cd>0)break;
        const t=densest(450);if(!t){w.cd=.3;break}
        w.cd=5/rate;
        zones.push({kind:'hole',w,x:t.x,y:t.y,r:120*area*(m.horizon?1.4:1),t:0,dur:2.6*(m.horizon?1.5:1),dmg:9*dm,tick:0});
        break;
      }
      case'laser':{
        w.pc=.1;w.pr=null;
        if(m.overheat){w.oh=((w.oh||0)+dt)%4;if(w.oh>3){w.on=false;break}}
        if(w.tg&&(w.tg.dead||Math.hypot(w.tg.x-P.x,w.tg.y-P.y)>700)){w.tg=null;w.wait=.5/rate}
        if(!w.tg){
          w.on=false;w.wait=(w.wait||0)-dt;if(w.wait>0)break;
          w.tg=E==='b'?toughest(640):nearest(P.x,P.y,640);if(!w.tg)break;
          w.ramp=0;
        }
        const t=w.tg;
        w.on=true;w.ramp=Math.min(1,(w.ramp||0)+dt/(m.lens?1:2));
        w.ang=Math.atan2(t.y-P.y,t.x-P.x);w.len=E==='a'?950:Math.hypot(t.x-P.x,t.y-P.y);w.wd=(4+5*w.ramp)*S.size*(E==='a'?2.2:1);
        if(m.prism){
          const c=[];query(t.x,t.y,200,e=>{if(e!==t)c.push(e)});
          w.pr=c.slice(0,2);
        }
        w.cd-=dt;if(w.cd>0)break;
        w.cd=.1;
        // fire rate turns into damage: the beam itself never blinks
        const dmg=16*dm*rate*(1+3*w.ramp)*(m.overheat?2:1)*(E==='a'?1.3:E==='b'?1.5:1),cx=Math.cos(w.ang),sy=Math.sin(w.ang);
        const burn=(e,k)=>{if(m.painter)e.markT=R.t+.5;hit(e,dmg*k*(E==='b'&&e.r>24?3:1),w,cx,sy,6)};
        if(E==='a'){
          for(const e of enemies){
            if(e.dead)continue;
            const dx=e.x-P.x,dy=e.y-P.y,along=dx*cx+dy*sy;
            if(along>0&&along<w.len&&Math.abs(dx*sy-dy*cx)<w.wd+e.r)burn(e,1);
          }
        }else burn(t,1);
        if(w.pr)for(const e of w.pr)burn(e,.5);
        break;
      }
      case'mine':{
        w.pc=1.8/rate;w.cd-=dt;if(w.cd>0)break;
        w.cd=1.8/rate;
        for(let i=0;i<w.rank+(E==='a'?3:0);i++){
          const t=i?randomEnemy(320):densest(320);let tx,ty;
          if(t){const dx=t.x-P.x,dy=t.y-P.y,d=Math.hypot(dx,dy)||1,k=Math.max(70,d*.7)/d;tx=P.x+dx*k+rand(-25,25);ty=P.y+dy*k+rand(-25,25)}
          else{const a=rand(0,TAU);tx=P.x+Math.cos(a)*110;ty=P.y+Math.sin(a)*110}
          bullets.push({kind:'mine',w,x:P.x,y:P.y,sx:P.x,sy:P.y,tx,ty,t:0,r:9,dmg:50*dm,er:95*area*(E==='a'?1.25:1),life:10,sentry:E==='b',st:0,cm:1});
        }
        break;
      }
      case'money':{
        const cdB=E?.56:.9;w.pc=cdB/rate;
        w.cd-=dt;if(w.cd>0)break;
        const t=nearest(P.x,P.y,560);if(!t){w.cd=.15;break}
        w.cd=cdB/rate;
        // bills grow with the combo, and so does what they do
        const k=1+Math.log10(1+R.combo)*.6,a=Math.atan2(t.y-P.y,t.x-P.x);
        for(const off of fan(3+(m.counterfeit?2:0)+(E?2:0),.2))
          bolt(w,P.x,P.y,a+off,16*dm*k*(E?1.3:1),{pierce:99,bill:k,sp:520,r:9*S.size,life:1.3});
        sfx('shoot');break;
      }
    }
  }
}
function updateBullets(dt){
  const hw=W/Z/2-20,hh=H/Z/2-20;
  for(const b of bullets){
    b.life-=dt;const w=b.w;
    if(b.kind==='mine'){
      b.t+=dt;
      if(b.t<.35){const k=b.t/.35;b.x=b.sx+(b.tx-b.sx)*k;b.y=b.sy+(b.ty-b.sy)*k;continue}
      let boom=b.life<=0;
      if(b.det>0){b.det-=dt;if(b.det<=0)boom=true}
      if(b.stick){
        if(b.stick.dead)boom=true;else{b.x=b.stick.x;b.y=b.stick.y}
        b.fuse-=dt;if(b.fuse<=0)boom=true;
      }else{
        if(w.m.bait)query(b.x,b.y,200,e=>{if(e.r<=40){const dx=b.x-e.x,dy=b.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*40*dt;e.y+=dy/d*40*dt}});
        query(b.x,b.y,30+MAXR,e=>{
          const dx=e.x-b.x,dy=e.y-b.y,rr=30+e.r;
          if(dx*dx+dy*dy>=rr*rr||b.stick)return;
          if(w.m.stickym){b.stick=e;b.fuse=1.2}else boom=true;
        });
        if(b.sentry){
          b.st-=dt;
          if(b.st<=0){const t=nearest(b.x,b.y,260);b.st=.6;if(t)bolt(w,b.x,b.y,Math.atan2(t.y-b.y,t.x-b.x),15*w.s.dm,{})}
        }
      }
      if(boom){
        b.life=0;explode(b.x,b.y,b.er,b.dmg*b.cm*(b.stick?1.5:1),w,220,'#ff8a3f');
        if(w.m.chain)for(const o of bullets)if(o!==b&&o.kind==='mine'&&o.life>0&&!o.det&&o.t>=.35&&Math.hypot(o.x-b.x,o.y-b.y)<b.er*1.3){o.det=.09;o.cm=b.cm*1.25}
      }
      continue;
    }
    if(b.kind==='comet'){
      // out to the crowd, burst, then home to its own slot in the ring
      const oa=w.a+b.idx*TAU/b.n,gx=b.back?P.x+Math.cos(oa)*b.rad:b.tx,gy=b.back?P.y+Math.sin(oa)*b.rad:b.ty;
      const dx=gx-b.x,dy=gy-b.y,d=Math.hypot(dx,dy)||1,st=1150*dt;
      if(d<=st){
        b.x=gx;b.y=gy;
        if(b.back)b.life=0;else{b.back=true;explode(b.x,b.y,b.er,b.dmg,w,180,'#9fb4ff')}
      }else{b.x+=dx/d*st;b.y+=dy/d*st}
      query(b.x,b.y,b.r+MAXR,e=>{
        const ex=e.x-b.x,ey=e.y-b.y,rr=b.r+e.r;
        if(R.t-e.sawT>b.hcd&&ex*ex+ey*ey<rr*rr){e.sawT=R.t;hit(e,b.dmg*.5,w,dx/d,dy/d,120)}
      });
      eatBullets(b.x,b.y,b.r+3,w.m.mirrororb?w:null);
      if(b.life<=0&&w.out)delete w.out[b.idx];
      continue;
    }
    if(b.kind==='saw'){
      b.t+=dt;b.rot+=dt*18;
      if(b.storm){
        if(b.vx===undefined){b.vx=b.dx*520;b.vy=b.dy*520}
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(Math.abs(b.x-P.x)>hw)b.vx=-Math.sign(b.x-P.x)*Math.abs(b.vx);
        if(Math.abs(b.y-P.y)>hh)b.vy=-Math.sign(b.y-P.y)*Math.abs(b.vy);
      }else{
        // out and back along one line; a lodged blade holds at the far end for two seconds
        let tt=b.t;
        if(b.lodged)tt=tt<.75?tt:tt<2.75?.75:tt-2;
        if(b.arc){
          // a boomerang loop: leaves your side, crosses the target at its far point, and comes home to wherever you are now
          const u=Math.min(1,tt/1.5),th=u*TAU,k=Math.max(0,u*2-1),bx=b.ox+(P.x-b.ox)*k,by=b.oy+(P.y-b.oy)*k;
          const al=b.reach/2*(1-Math.cos(th)),lt=b.reach*.45*Math.sin(th);
          b.x=bx+b.dx*al-b.dy*lt;b.y=by+b.dy*al+b.dx*lt;
        }else{
          const s=b.sp*(1-tt/.75);
          b.x+=b.dx*s*dt;b.y+=b.dy*s*dt;
        }
      }
      if(b.vortex)query(b.x,b.y,b.r+110+MAXR,e=>{
        const dx=b.x-e.x,dy=b.y-e.y,d=Math.hypot(dx,dy)||1;
        if(e.r<=40&&d<b.r+110+e.r){const pull=Math.min(d,(e.r>24?90:260)*dt);e.x+=dx/d*pull;e.y+=dy/d*pull}
      });
      query(b.x,b.y,b.r+MAXR,e=>{
        const dx=e.x-b.x,dy=e.y-b.y,rr=b.r+e.r;
        if(R.t-e.sawT>b.hcd&&dx*dx+dy*dy<rr*rr){e.sawT=R.t;hit(e,b.dmg,w,b.dx,b.dy,60)}
      });
      continue;
    }
    if(b.kind==='rocket'){
      if(!b.carpet){
        if(!b.tg||b.tg.dead)b.tg=nearest(b.x,b.y,650);
        if(b.tg){
          const want=Math.atan2(b.tg.y-b.y,b.tg.x-b.x),da=Math.atan2(Math.sin(want-b.a),Math.cos(want-b.a));
          b.a+=Math.max(-7*dt,Math.min(7*dt,da));
        }
        b.sp=Math.min(540,b.sp+650*dt);
      }
      b.x+=Math.cos(b.a)*b.sp*dt;b.y+=Math.sin(b.a)*b.sp*dt;
      if(parts.length<400)parts.push({x:b.x,y:b.y,vx:rand(-20,20),vy:rand(-20,20),t:0,life:.25,c:'#ffa040',s:b.nuke?6:3});
      let boom=b.life<=0;
      query(b.x,b.y,b.r+MAXR,e=>{const dx=e.x-b.x,dy=e.y-b.y,rr=b.r+e.r;if(dx*dx+dy*dy<rr*rr)boom=true});
      if(boom){
        b.life=0;explode(b.x,b.y,b.er,b.dmg,w,200,'#ffa040',b.big);
        if(b.nuke){R.flash=.3;R.shake=20}
        if(b.cluster){const o=rand(0,TAU);for(let i=0;i<4;i++){const a=o+i*TAU/4;explode(b.x+Math.cos(a)*b.er*.9,b.y+Math.sin(a)*b.er*.9,b.er*.7,b.dmg*.5,w,120,'#ffd23f')}}
      }
      continue;
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    query(b.x,b.y,b.r+MAXR,e=>{
      if(b.life<=0||b.hit.includes(e))return;
      const dx=e.x-b.x,dy=e.y-b.y,rr=b.r+e.r;
      if(dx*dx+dy*dy>=rr*rr)return;
      b.hit.push(e);const v=Math.hypot(b.vx,b.vy);
      hit(e,b.dmg*(b.hollow&&e.hp>e.maxhp*.8?2:1),w,b.vx/v,b.vy/v,90);
      if(b.bounce>0){
        const n=nearest(e.x,e.y,240,b.hit);
        if(n){b.bounce--;const a=Math.atan2(n.y-b.y,n.x-b.x);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;b.life=Math.max(b.life,.5);return}
      }
      if(b.pierce--<=0)b.life=0;
    });
  }
  compact(bullets,b=>b.life<=0);
}
function updateZones(dt){
  for(const z of zones){
    z.t+=dt;z.tick-=dt;const w=z.w;
    if(z.kind==='quake'){
      // lingering ground: light damage plus every status you own
      if(z.tick<=0){
        z.tick=.5;const els=playerEls();
        query(z.x,z.y,z.r+MAXR,e=>{
          if(Math.hypot(e.x-z.x,e.y-z.y)>z.r+e.r)return;
          const d=hit(e,z.dmg,w,0,0,0);
          if(!e.dead)for(const el of els)if(el!==w.s.el)applyStatus(e,el,d,w);
        });
      }
      continue;
    }
    const tk=z.tick<=0;if(tk)z.tick=.25;
    const inside=holeTick(w,z.x,z.y,z.r,z.dmg,tk,dt);
    if(z.t>=z.dur){
      if(w.m.sticky)for(const e of inside){e.slowT=R.t+3;e.slowF=.5}
      if(w.evo==='a')explode(z.x,z.y,z.r*1.3,z.dmg*10,w,300,'#b06cff');
    }
  }
  compact(zones,z=>z.t>=z.dur);
}

// ---------- enemies ----------
function updateEnemies(dt){
  const far=edgeDist()+500,view=edgeDist(),dec=Math.exp(-8*dt),C=P.cards,pad=C.pyro?45:5;
  let near=0,hot=0;
  for(const e of enemies){
    if(e.dead)continue;
    // statuses
    if(e.burn>0){e.burn-=dt;if(e.burn<=0)e.burnD=0}
    if(e.poison>0){e.poisonT-=dt;if(e.poisonT<=0){e.poison=0;e.poisonD=0}}
    if(e.chill>0)e.chill-=dt;
    if(e.frozen>0)e.frozen-=dt;
    if(e.shock>0)e.shock-=dt;
    if(e.frost>0)e.frost-=dt*.5;
    e.dotT=(e.dotT||0)-dt;
    if(e.dotT<=0){
      e.dotT=.25;
      // fire also eats a slice of max health, so it never stops mattering as the horde toughens
      if(e.burn>0)dealRaw(e,(e.burnD+e.maxhp*(e.r>40?.01:e.r>24?.025:.04))*.25,e.burnS,ELEMENTS.burn.col,true);
      if(e.poison>0)dealRaw(e,e.poison*e.poisonD*.25,e.poisonS,ELEMENTS.poison.col,true);
      if(e.dead)continue;
    }
    const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;
    if(d<view)near++;
    if(e.burn>0&&d<80+e.r)hot++;
    let sp=e.spd;
    if(e.type==='piggy'){
      // runs from you and escapes if you take too long
      sp=-sp;e.left-=dt;
      if(e.left<=0||d>far){e.dead=true;banner('IT GOT AWAY');continue}
    }
    if(e.frozen>0||e.stunT>R.t)sp=0;
    else if(e.type==='shooter'){
      if(d<230)sp=-sp*.6;else if(d<290)sp=0;
      e.shot-=dt;
      if(e.shot<=0&&d<560){e.shot=2.6;ebullets.push({x:e.x,y:e.y,vx:dx/d*190,vy:dy/d*190,r:6,dmg:e.dmg,life:5})}
    }else if(e.r>40){
      const fin=e.type==='final',k=e.kind;
      if(e.dash>0){e.dash-=dt;sp=0;e.x+=e.dvx*dt;e.y+=e.dvy*dt}
      else if(e.wind>0){
        e.wind-=dt;sp=0;
        if(e.wind<=0){e.dash=.55;e.dvx=dx/d*640;e.dvy=dy/d*640}
      }else e.shot-=dt;
      if(k===2&&!fin&&d<260)sp=-sp*.5;
      if(k===3){
        e.spin=(e.spin||0)+dt*(fin?1.5:2.2);e.st=(e.st||0)-dt;
        if(e.st<=0){
          e.st=.15;
          for(let i=0;i<2;i++){const a=e.spin+i*Math.PI;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,r:7,dmg:e.dmg*.5,life:6,armor:fin&&i===0})}
        }
      }
      if(e.shot<=0){
        if(k===0){
          e.shot=fin?2:3.2;const n=fin?22:16,o=rand(0,TAU);
          for(let i=0;i<n;i++){const a=o+i*TAU/n;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,r:7,dmg:e.dmg*.5,life:6,armor:fin&&i%3===0})}
        }else if(k===1){e.shot=fin?1.6:2.4;e.wind=.7}
        else if(k===2){
          e.shot=fin?2.5:3.5;
          for(let i=0;i<(fin?10:7)&&enemies.length<480;i++){const a=rand(0,TAU),s=spawn(fin?'runner':'mini',e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);s.kx=Math.cos(a)*260;s.ky=Math.sin(a)*260}
        }else e.shot=fin?3:9;
        // the final boss rotates through every pattern
        if(fin)e.kind=(k+1)%4;
      }
    }
    if(e.chill>0)sp*=e.r>40?.85:.7;
    if(e.slowT>R.t)sp*=1-(1-e.slowF)*Math.pow(.5,overtime());
    e.x+=(dx/d*sp+e.kx)*dt;e.y+=(dy/d*sp+e.ky)*dt;
    e.kx*=dec;e.ky*=dec;e.flash-=dt;
    // keep the horde from stacking into a single dot; touching is also how fire spreads
    query(e.x,e.y,e.r+22+pad,o=>{
      if(o===e)return;
      const ox=e.x-o.x,oy=e.y-o.y,od=Math.hypot(ox,oy)||1,ov2=e.r+o.r-od;
      if(ov2>0){const push=ov2*(o.r>=e.r?.5:.15)*Math.min(1,dt*12);e.x+=ox/od*push;e.y+=oy/od*push}
      if(ov2>-pad&&o.burn>0&&!(e.burn>0)&&!(e.chill>0)&&!(e.frozen>0)&&o.burnD>.5){
        e.burn=2.5;e.burnD=o.burnD*.8;e.burnS=o.burnS;
        if(e.poison>0)combust(e);
      }
    });
    if(e.dead)continue;
    if(d>far&&e.type!=='piggy'){const a=rand(0,TAU),dd=edgeDist();e.x=P.x+Math.cos(a)*dd;e.y=P.y+Math.sin(a)*dd}
    if(e.dmg&&!(e.frozen>0)&&!(e.stunT>R.t)&&d<e.r+P.r)hurt(e.dmg*(C.boots?.7:1),e.dash>0);
  }
  R.near=near;
  if(C.pyro&&hot&&!P.dead)P.hp=Math.max(1,P.hp-.75*dt);
  compact(enemies,e=>e.dead);
}
function updateEBullets(dt){
  for(const b of ebullets){
    b.life-=dt;if(b.life<=0)continue;
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(Math.hypot(b.x-P.x,b.y-P.y)<b.r+P.r){b.life=0;hurt(b.dmg)}
  }
  compact(ebullets,b=>b.life<=0);
}
function updateGems(dt){
  for(const g of gems){
    const dx=P.x-g.x,dy=P.y-g.y,d=Math.hypot(dx,dy)||1;
    if(g.kind!=='chest'&&d<P.magnet)g.pull=true;
    if(g.pull){g.sp=Math.min(900,(g.sp||200)+1400*dt);g.x+=dx/d*g.sp*dt;g.y+=dy/d*g.sp*dt}
    if(d<P.r+(g.kind==='chest'?22:12)){
      g.got=true;
      switch(g.kind){
        case'xp':addXP(g.v);sfx('gem');break;
        case'heart':{const v=P.cards.vampire?12:25;heal(v);texts.push({x:P.x,y:P.y-24,s:'+'+v+' HP',t:0,c:'#5de0a0',big:true,slow:true});sfx('pick');break}
        case'vac':for(const o of gems)if(o.kind==='xp')o.pull=true;sfx('pick');break;
        case'bomb':
          R.flash=.35;R.shake=18;sfx('boom');
          for(const e of enemies){
            if(e.dead||Math.hypot(e.x-P.x,e.y-P.y)>edgeDist())continue;
            if(e.r>40)dealRaw(e,e.maxhp*.08,'','#ffffff');else kill(e,null);
          }
          break;
        case'chest':{
          const bonus=120*(1+R.t/60)*P.greed*fpMult();R.fp+=bonus;
          texts.push({x:P.x,y:P.y-30,s:'+'+cash(bonus)+'  +'+g.n+(g.n>1?' picks':' pick'),t:0,c:'#ffd23f',big:true,slow:true});
          for(let i=0;i<g.n;i++)R.queue.push({title:'CHEST'});sfx('chest');break;
        }
      }
    }
  }
  compact(gems,g=>g.got);
}
function updateFx(dt){
  for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94}
  compact(parts,p=>p.t>=p.life);
  for(const t of texts){t.t+=dt;t.y-=(t.slow?28:46)*dt}
  compact(texts,t=>t.t>=(t.slow?1.1:.55));
  for(const f of fx)f.t+=dt;
  compact(fx,f=>f.t>=f.dur);
  R.shake*=Math.exp(-10*dt);if(R.shake<.3)R.shake=0;
  R.flash=Math.max(0,R.flash-dt);R.hurt=Math.max(0,R.hurt-dt);
  if(R.banner){R.banner.t+=dt;if(R.banner.t>2)R.banner=null}
}

function update(dt){
  R.t+=dt;
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x;
  let my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joy.y;
  const ml=Math.hypot(mx,my),C=P.cards;
  if(ml>1){mx/=ml;my/=ml}
  P.moving=ml>.05;
  if(P.moving){P.x+=mx*P.speed*dt;P.y+=my*P.speed*dt;P.face=Math.atan2(my,mx);P.still=0}else P.still+=dt;
  P.rate=P.haste*(C.stand&&P.still>.5?1.3:1)*(C.hitrun?(P.moving?1.4:.85):1);
  P.inv-=dt;
  if(P.regen&&P.hp<P.maxhp)P.hp=Math.min(P.maxhp,P.hp+P.regen*dt);
  if(P.shield<P.shieldMax){P.shT-=dt;if(P.shT<=0){P.shield++;P.shT=P.shieldCd}}
  R.siph=Math.min(8,R.siph+8*dt);R.vamp=Math.min(6,R.vamp+6*dt);
  R.comboT-=dt;if(R.comboT<=0&&R.combo>0)R.combo=Math.max(0,R.combo-(20+R.combo*.15)*dt);
  for(const t of R.timers)if(R.t>=t.t&&!P.dead){t.done=true;t.fn()}
  compact(R.timers,t=>t.done);
  director(dt);buildGrid();
  updateWeapons(dt);updateBullets(dt);updateZones(dt);updateEnemies(dt);updateEBullets(dt);updateGems(dt);updateFx(dt);
  if(R.queue.length&&!R.offer&&state==='play')openOffer();
}

// ---------- picks ----------
function modChoices(w){
  return[...UNIVERSAL,...WEAPONS[w.id].mods].filter(id=>{
    const M=MODS[id];
    return!w.m[id]&&!P.ban[id]&&unlocked(M)&&!(M.el&&w.s.el)&&!(M.not&&w.m[M.not]);
  });
}
function cardOK(id){
  const c=CARDS[id],have=P.cards[id]||0;
  if(P.ban[id]||!unlocked(c))return false;
  if(have)return!!c.max&&have<c.max;
  if(c.req&&!P.cards[c.req])return false;
  if(c.not&&P.cards[c.not])return false;
  if(c.ok&&!c.ok())return false;
  return c.free||cardCount()<P.cslots;
}
// builds one offer: an evolution shows both forms, at most one new weapon, the rest by weight
function genOffer(){
  const n=3+mlv('opt4')+(P.cards.blood?1:0),out=[],pool=[],ws=Object.values(P.weapons);
  const ready=ws.find(w=>w.rank>=3&&w.mods.length>=3&&!w.evo);
  if(ready)WEAPONS[ready.id].evo.forEach((_,f)=>out.push({k:'evo',id:ready.id,f}));
  if(ws.length<P.wslots){
    const c=Object.keys(WEAPONS).filter(id=>!P.weapons[id]&&!P.ban[id]&&unlocked(WEAPONS[id]));
    if(c.length)pool.push({k:'w',id:pickRand(c),wt:ws.length<2?8:3});
  }
  for(const w of ws){
    if(w.rank<3)pool.push({k:'rank',id:w.id,wt:3});
    else pool.push({k:'over',id:w.id,wt:w.evo?1.5:.6});
    if(w.mods.length<3)for(const m of shuffle(modChoices(w)).slice(0,2))pool.push({k:'mod',id:w.id,m,wt:3});
  }
  for(const id of shuffle(Object.keys(CARDS).filter(cardOK)).slice(0,3))pool.push({k:'card',id,wt:2.2});
  for(const id of shuffle(Object.keys(TRAIN).filter(id=>!TRAIN[id].cap||(P.train[id]||0)<TRAIN[id].cap)).slice(0,2))pool.push({k:'train',id,wt:1});
  while(out.length<n&&pool.length){
    let sum=0;for(const o of pool)sum+=o.wt;
    let r=Math.random()*sum,i=0;
    for(;i<pool.length-1;i++){r-=pool[i].wt;if(r<=0)break}
    out.push(pool.splice(i,1)[0]);
  }
  // never a hand where every option carries a downside
  const costly=o=>(o.k==='mod'&&MODS[o.m].cost)||(o.k==='card'&&CARDS[o.id].cost);
  if(out.length&&out.every(costly)){const i=pool.findIndex(o=>!costly(o));if(i>=0)out[out.length-1]=pool[i]}
  return out;
}
function applyPick(o){
  if(o.k==='w')P.weapons[o.id]=newWeapon(o.id);
  else if(o.k==='rank')P.weapons[o.id].rank++;
  else if(o.k==='mod'){const w=P.weapons[o.id];w.mods.push(o.m);w.m[o.m]=true}
  else if(o.k==='evo'){
    P.weapons[o.id].evo=o.f?'b':'a';
    banner(WEAPONS[o.id].evo[o.f].name.toUpperCase()+'!');R.flash=.3;sfx('evo');
  }
  else if(o.k==='over')P.weapons[o.id].over++;
  else if(o.k==='card')P.cards[o.id]=(P.cards[o.id]||0)+1;
  else P.train[o.id]=(P.train[o.id]||0)+1;
  recalc();
  if(o.k==='card'&&o.id==='bubble')P.shield=P.shieldMax;
  if(o.k==='train'&&o.id==='vigor')heal(40);
  if(o.k!=='evo')sfx('pick');
  R.picks++;
}
// most picks sit in the tray while the game runs; the loadout choice and the pause setting stop time
function openOffer(){
  const head=R.queue[0],load=head.type==='loadout';
  R.offer=load?Object.keys(WEAPONS).filter(id=>unlocked(WEAPONS[id])).map(id=>({k:'w',id})):genOffer();
  R.banMode=false;
  if(!R.offer.length){R.queue.shift();R.offer=null;return}
  if(head.title==='LEVEL UP')sfx('level');
  state=load||save.pausePick?'choice':'play';
  renderTray();
}
function takePick(i){
  const o=R.offer&&R.offer[i];if(!o)return;
  const load=R.queue[0].type==='loadout';
  if(R.banMode){
    if(P.banish>0&&!load&&(o.k==='w'||o.k==='mod'||o.k==='card')){
      P.ban[o.k==='mod'?o.m:o.id]=true;P.banish--;R.offer=genOffer();
    }
    R.banMode=false;renderTray();return;
  }
  applyPick(o);
  if(P.cards.blood&&!load)P.hp=Math.max(1,P.hp-5);
  R.queue.shift();R.offer=null;
  if(R.queue.length)openOffer();
  if(!R.offer){state='play';renderTray()}
}
function reroll(){
  if(!R.offer||P.rerolls<=0||R.queue[0].type==='loadout')return;
  P.rerolls--;R.offer=genOffer();R.banMode=false;renderTray();
}
function toggleBan(){
  if(!R.offer||P.banish<=0||R.queue[0].type==='loadout')return;
  R.banMode=!R.banMode;renderTray();
}

// ---------- run flow ----------
function startRun(){initAudio();newRun();state='play';ov.className='';renderTray();if(R.queue.length)openOffer()}
function die(){
  state='dying';P.dead=true;sfx('die');burst(P.x,P.y,'#ffffff',70,420);R.shake=24;R.offer=null;renderTray();
  setTimeout(endRun,1100);
}
function endRun(){
  const earned=Math.floor(R.fp),before=save.life,heatBefore=save.maxHeat-(R.newHeat?1:0);
  save.bank+=earned;save.life+=earned;save.runs++;
  const pb=earned>save.best&&save.runs>1;
  if(earned>save.best)save.best=earned;
  save.bestTime=Math.max(save.bestTime,R.t);persist();
  // anything whose lifetime threshold or spice requirement was just crossed
  const unl=[];
  const scan=(set,kind)=>{for(const id in set){const d=set[id];
    if(((d.unlock||0)>before&&d.unlock<=save.life&&save.maxHeat>=(d.need||0))||((d.need||0)>heatBefore&&d.need<=save.maxHeat&&save.life>=(d.unlock||0)))unl.push(d.icon+' '+d.name+' ('+kind+')')}};
  scan(WEAPONS,'weapon');scan(MODS,'mod');scan(CARDS,'card');
  if(R.newHeat){
    unl.unshift('🌶️ Spice level '+R.newHeat+' (fun points ×'+fmt(Math.pow(SPICE_FP,R.newHeat))+')');
    for(const m of META)if(m.need===R.newHeat)unl.push(m.name+' (shop)');
  }
  let total=0;for(const k in R.dmg)total+=R.dmg[k];
  const dmg=Object.keys(R.dmg).filter(k=>P.weapons[k]).sort((a,b)=>R.dmg[b]-R.dmg[a])
    .map(k=>({name:WEAPONS[k].icon+' '+weaponName(P.weapons[k]),pct:R.dmg[k]/(total||1)*100}));
  R.offer=null;renderTray();
  showHub({earned,dmg,t:R.t,kills:R.kills,lvl:P.level,combo:R.maxCombo,pb,unl,cleared:R.cleared});
}
const weaponName=w=>w.evo?WEAPONS[w.id].evo[w.evo==='b'?1:0].name:WEAPONS[w.id].name;
