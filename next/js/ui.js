'use strict';
// ---------- pick tray ----------
const RANK_NOTE={
  blaster:['','Bullets pierce one enemy.'],orbit:['+1 orb.','+1 orb.'],lightning:['+1 chain.','+1 chain and +1 strike.'],
  saw:['','+1 blade.'],rocket:['','+1 rocket.'],aura:['+15% radius.','+15% radius.'],mine:['+1 mine.','+1 mine.'],
};
function optView(o){
  if(o.k==='w'){const d=WEAPONS[o.id];return{icon:d.icon,name:d.name,tag:'NEW WEAPON · '+d.role.toUpperCase(),desc:d.desc,cls:'neww'}}
  if(o.k==='rank'){
    const w=P.weapons[o.id],note=(RANK_NOTE[o.id]||[])[w.rank-1]||'';
    return{icon:WEAPONS[o.id].icon,name:weaponName(w),tag:'RANK '+w.rank+' → '+(w.rank+1),desc:(w.rank===1?'+50% damage. ':'+40% damage. ')+note};
  }
  if(o.k==='mod'){
    const M=MODS[o.m],w=P.weapons[o.id];
    return{icon:M.icon,name:M.name,tag:'MOD FOR '+WEAPONS[o.id].icon+' '+weaponName(w).toUpperCase()+' · '+(w.mods.length+1)+'/3',desc:M.desc,cost:M.cost,cls:M.el?'el-'+M.el:'mod'};
  }
  if(o.k==='evo'){const d=WEAPONS[o.id],e=d.evo[o.f];return{icon:d.icon,name:e.name,tag:'EVOLVE '+d.name.toUpperCase(),desc:e.desc,cls:'evo'}}
  if(o.k==='over'){const w=P.weapons[o.id];return{icon:WEAPONS[o.id].icon,name:weaponName(w),tag:'OVERCLOCK +'+(w.over+1),desc:'×1.2 damage for this weapon. Stacks multiply.',cls:'oc'}}
  if(o.k==='card'){const c=CARDS[o.id],have=P.cards[o.id]||0;return{icon:c.icon,name:c.name,tag:have?'CARD · RANK '+(have+1):'CARD',desc:c.gain,cost:c.cost,cls:'cardk'}}
  const t=TRAIN[o.id];return{icon:t.icon,name:t.name,tag:'TRAINING',desc:t.desc,cls:'oc'};
}
function renderTray(){
  if(!R||!R.offer||(state!=='play'&&state!=='choice')){tray.className='';return}
  const head=R.queue[0],load=head.type==='loadout',more=R.queue.length-1;
  const hints=[];
  if(!load){
    if(P.rerolls>0)hints.push('R reroll ('+P.rerolls+')');
    if(P.banish>0)hints.push('B banish ('+P.banish+')');
    if(state==='play')hints.push('hold Tab to slow time');
  }
  tray.innerHTML=`<div class="thead"><b>${R.banMode?'BANISH WHICH ONE?':head.title}</b>${more>0?`<span class="more">+${more} waiting</span>`:''}
    <span class="tk">${hints.join(' · ')}</span></div>
    <div class="tcards">${R.offer.map((o,i)=>{const v=optView(o);
      return`<div class="tc ${v.cls||''}" data-act="pick" data-i="${i}"><div class="ic">${v.icon}</div>
        <div class="nm"><span class="k">${i+1}</span>${v.name}</div><div class="tg">${v.tag}</div>
        <div class="ds">${v.desc}</div>${v.cost?`<div class="ct">${v.cost}</div>`:''}</div>`}).join('')}</div>`;
  tray.className='on'+(state==='choice'?' modal':'')+(R.banMode?' ban':'');
}

// ---------- hub ----------
function nextGoal(){
  let best=null;
  const scan=(set,kind)=>{for(const id in set){const d=set[id];if((d.unlock||0)>save.life&&(!best||d.unlock<best.at))best={at:d.unlock,text:d.icon+' '+d.name+' ('+kind+')'}}};
  scan(WEAPONS,'weapon');scan(MODS,'mod');scan(CARDS,'card');
  if(best)return`Next unlock: <b>${best.text}</b> at ${fmt(best.at)} lifetime fun points`;
  let need=99,names=[];
  const scan2=(list)=>{for(const d of list){const n=d.need||0;if(n>save.maxHeat){if(n<need){need=n;names=[]}if(n===need)names.push((d.icon?d.icon+' ':'')+d.name)}}};
  scan2(Object.values(CARDS));scan2(META);
  if(names.length)return`Clear spice ${need-1} to unlock <b>${names.join(', ')}</b>`;
  return'Everything is unlocked. Only the spice ladder is left.';
}
// four equal segments between milestones, filled linearly inside each, so the bar means what it shows
function progress(){
  const T=rich()?[1e9,1e10,1e11,1e12]:[0,1e6,1e7,1e8,1e9];
  if(T.length===4)T.unshift(0);
  let i=0;while(i<3&&save.life>=T[i+1])i++;
  const pct=Math.min(100,(i+(save.life-T[i])/(T[i+1]-T[i]))*25);
  return{pct,labels:T.slice(1).map(v=>(rich()?'$':'')+fmt(v))};
}
function showHub(sum){
  lastSum=sum||null;hubAt=performance.now();
  if(rich()&&!save.secret)return showSecret();
  state='hub';
  const pr=progress();
  ov.innerHTML=`<div class="panel">
    <h1>${rich()?'BILLIONAIRE':'BILLION'}</h1><div class="sub">${rich()?'Survive the horde. Spend it well.':'Survive the horde. Earn one billion fun points.'}</div>
    ${sum?`<div class="sum"><div class="big">+${cash(sum.earned)} ${sum.cleared?'<em>CLEARED</em> ':''}${sum.pb?'<em>NEW BEST</em>':''}</div>
      <div>Survived ${clock(sum.t)} · ${sum.kills} kills · level ${sum.lvl} · max combo ${sum.combo}</div>
      ${sum.unl.map(n=>`<div class="unl">UNLOCKED: ${n}</div>`).join('')}
      ${sum.dmg&&sum.dmg.length?`<div class="dmg">${sum.dmg.map(d=>`<div><span>${d.name}</span><i style="width:${Math.max(2,d.pct*2.2)}px"></i><u>${d.pct.toFixed(0)}% of damage</u></div>`).join('')}</div>`:''}</div>`:''}
    <div class="bar"><div class="fill" style="width:${pr.pct}%"></div><div class="tick" style="left:25%"></div><div class="tick" style="left:50%"></div><div class="tick" style="left:75%"></div>
      <span>${rich()?'$'+fmt(save.life)+' lifetime':fmt(save.life)+' lifetime fun points'}</span></div>
    <div class="ticks">${pr.labels.map(l=>`<i>${l}</i>`).join('')}</div>
    <div class="next">${nextGoal()}</div>
    ${save.maxHeat>0?`<div class="heat">🌶️ Spice <button class="ghost sm" data-act="heat" data-d="-1">◀</button><b>${save.heat}</b><button class="ghost sm" data-act="heat" data-d="1">▶</button>
      <span>enemy health ×${fmt(Math.pow(SPICE_HP,save.heat))} · fun points ×${fmt(Math.pow(SPICE_FP,save.heat))}</span></div>`:''}
    <div class="row"><button class="go" data-act="go">${save.runs?'RUN AGAIN':'PLAY'} <small>[space]</small></button>
      <div class="bank">Bank: <b>${cash(save.bank)}</b></div></div>
    <div class="shop">${META.map(m=>{
      const l=mlv(m.id),maxed=l>=m.max,c=metaCost(m),locked=save.maxHeat<(m.need||0);
      return`<div class="item${locked?' cant lock':maxed||save.bank<c?' cant':''}" data-act="buy" data-id="${m.id}">
        <div class="n"><span>${m.name}</span><span>${l}/${m.max>99?'∞':m.max}</span></div><div class="d">${m.desc}</div>
        <div class="c">${locked?'Clear spice '+(m.need-1):maxed?'MAXED':cash(c)}</div></div>`}).join('')}</div>
    <div class="help">WASD or arrows to move · attacks are automatic · number keys take a pick · Esc pauses and shows your build · M mutes<br>
      Weapons take three mods and then evolve one of two ways. Cards always cost something. Beat the final boss at ${clock(FINAL_AT)} to clear the run.<br>
      <a data-act="pausepick">Pause on level-up: <b>${save.pausePick?'on':'off'}</b></a> · <a data-act="reset">Reset all progress</a></div></div>`;
  ov.className='on';
}
// shown once, the first time the hub opens with a billion lifetime points on the books
function showSecret(){
  state='secret';
  let conf='';
  for(let i=0;i<70;i++)conf+=`<div class="conf" style="left:${rand(0,100)}%;background:${['#ffd23f','#5de0a0','#ff5d73','#b06cff','#5de0ff'][i%5]};animation-duration:${rand(2.5,6)}s;animation-delay:${rand(0,2.5)}s"></div>`;
  ov.innerHTML=`${conf}<div class="panel secret">
    <h1>$1,000,000,000</h1>
    <p>You asked for a billion dollars. We settled on fun points instead.</p>
    <p>The exchange rate just came in. It is one to one.</p>
    <p class="gain">Every fun point you own is now a dollar.<br>💸 The Money Printer is yours.<br>🐷 Something worth chasing has started turning up mid-run.</p>
    <button class="go" data-act="collect">COLLECT <small>[space]</small></button></div>`;
  ov.className='on';
  initAudio();sfx('evo');
}
function collectSecret(){save.secret=true;persist();showHub(lastSum)}
function resetSave(){
  if(!confirm('Wipe all progress and start again from zero?'))return;
  const rev=save.rev,mute=save.mute;
  Object.assign(save,freshSave(),{rev,mute});persist();showHub();
}
function buy(id){
  const m=META.find(x=>x.id===id),c=metaCost(m);
  if(mlv(id)>=m.max||save.bank<c||save.maxHeat<(m.need||0))return;
  save.bank-=c;save.meta[id]=mlv(id)+1;persist();initAudio();sfx('pick');
  const y=ov.scrollTop;showHub(lastSum);ov.scrollTop=y;
}
// the pause screen doubles as the build sheet
function pause(){
  if(state!=='play')return;
  state='pause';renderTray();
  const ws=Object.values(P.weapons).map(w=>`<div class="bw"><b>${WEAPONS[w.id].icon} ${weaponName(w)}</b> <span>rank ${w.rank}${w.over?' +'+w.over:''}</span>
    <div>${w.mods.map(m=>`<span class="chip">${MODS[m].icon} ${MODS[m].name}</span>`).join('')||'<span class="chip dim">no mods yet</span>'}</div></div>`).join('');
  const cs=Object.keys(P.cards).map(id=>{const c=CARDS[id];return`<div class="bw"><b>${c.icon} ${c.name}${P.cards[id]>1?' ×'+P.cards[id]:''}</b>
    <div><span class="chip">${c.gain}</span>${c.cost?`<span class="chip bad">${c.cost}</span>`:''}</div></div>`}).join('');
  const tr=Object.keys(P.train).map(id=>`<span class="chip">${TRAIN[id].icon} ${TRAIN[id].name} ×${P.train[id]}</span>`).join('');
  ov.innerHTML=`<div class="panel"><h2>PAUSED</h2>
    <div class="build"><div><h3>Weapons ${Object.keys(P.weapons).length}/${P.wslots}</h3>${ws}</div>
      <div><h3>Cards ${cardCount()}/${P.cslots}</h3>${cs||'<div class="bw dim">none yet</div>'}${tr?`<h3>Training</h3><div class="bw">${tr}</div>`:''}</div></div>
    <button class="go" data-act="resume">RESUME <small>[esc]</small></button><br>
    <button class="ghost" data-act="quit">End run and bank ${cash(R.fp)}</button></div>`;
  ov.className='on';
}
function resume(){if(state==='pause'){state='play';ov.className='';renderTray()}}

// ---------- input ----------
function onAct(e){
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='pick')takePick(+el.dataset.i);
  else if(a==='go')startRun();
  else if(a==='buy')buy(el.dataset.id);
  else if(a==='heat'){save.heat=Math.max(0,Math.min(save.maxHeat,save.heat+ +el.dataset.d));persist();showHub(lastSum)}
  else if(a==='resume')resume();
  else if(a==='collect')collectSecret();
  else if(a==='reset')resetSave();
  else if(a==='pausepick'){save.pausePick=!save.pausePick;persist();showHub(lastSum)}
  else if(a==='quit'){state='dying';endRun()}
}
ov.addEventListener('click',onAct);tray.addEventListener('click',onAct);
addEventListener('keydown',e=>{
  initAudio();keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='KeyM'){save.mute=!save.mute;persist()}
  if(state==='hub'){if((e.code==='Space'||e.code==='Enter')&&performance.now()-hubAt>400)startRun()}
  else if(state==='secret'){if((e.code==='Space'||e.code==='Enter')&&performance.now()-hubAt>1500)collectSecret()}
  else if(state==='play'||state==='choice'){
    const d=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if(d)takePick(d[1]-1);
    else if(e.code==='KeyR')reroll();
    else if(e.code==='KeyB')toggleBan();
    else if(state==='play'&&(e.code==='Escape'||e.code==='KeyP'))pause();
  }else if(state==='pause'){if(e.code==='Escape'||e.code==='KeyP')resume()}
});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.x=joy.y=0;joy.id=null;pause()});
cv.addEventListener('pointerdown',e=>{
  initAudio();if(e.pointerType==='mouse')return;
  joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerId!==joy.id)return;
  let dx=(e.clientX-joy.ox)/50,dy=(e.clientY-joy.oy)/50;const l=Math.hypot(dx,dy);
  if(l>1){dx/=l;dy/=l}
  joy.x=dx;joy.y=dy;
});
const joyEnd=e=>{if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0}};
cv.addEventListener('pointerup',joyEnd);cv.addEventListener('pointercancel',joyEnd);

// ---------- render ----------
function poly(x,y,r,n,rot){
  ctx.beginPath();
  for(let i=0;i<n;i++){const a=rot+i*TAU/n;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}
  ctx.closePath();
}
function beam(x1,y1,x2,y2,wd,col,fl){
  ctx.lineCap='round';ctx.globalAlpha=.22*fl;ctx.strokeStyle=col;ctx.lineWidth=wd*2;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.globalAlpha=.9*fl;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(2,wd*.4);ctx.stroke();
  ctx.globalAlpha=1;ctx.lineCap='butt';
}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#0c0e1a';ctx.fillRect(0,0,W,H);
  if(!P)return;
  const sh=R.shake;
  ctx.save();
  ctx.translate(W/2+(sh?rand(-sh,sh):0),H/2+(sh?rand(-sh,sh):0));ctx.scale(Z,Z);ctx.translate(-P.x,-P.y);
  const vw=W/Z/2+70,vh=H/Z/2+70;
  const vis=o=>Math.abs(o.x-P.x)<vw&&Math.abs(o.y-P.y)<vh;

  ctx.strokeStyle='#171b30';ctx.lineWidth=1;ctx.beginPath();
  for(let x=Math.floor((P.x-vw)/80)*80;x<P.x+vw;x+=80){ctx.moveTo(x,P.y-vh);ctx.lineTo(x,P.y+vh)}
  for(let y=Math.floor((P.y-vh)/80)*80;y<P.y+vh;y+=80){ctx.moveTo(P.x-vw,y);ctx.lineTo(P.x+vw,y)}
  ctx.stroke();

  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const g of gems){
    if(!vis(g))continue;
    if(g.kind==='xp'){
      ctx.fillStyle=g.v<3?'#5de0ff':g.v<10?'#5de0a0':'#ff6cf0';
      poly(g.x,g.y,g.v<3?5:g.v<10?7:9,4,0);ctx.fill();
    }else{
      ctx.font=(g.kind==='chest'?30:22)+'px system-ui';
      ctx.fillText(g.kind==='heart'?'❤️':g.kind==='vac'?'🧲':g.kind==='bomb'?'💣':'🎁',g.x,g.y+Math.sin(R.t*5)*3);
    }
  }

  const hole=(x,y,r,k,col,off)=>{
    ctx.globalAlpha=.75*k;ctx.fillStyle='#05050b';ctx.beginPath();ctx.arc(x,y,r*k,0,TAU);ctx.fill();
    ctx.globalAlpha=k;ctx.strokeStyle=col;ctx.lineWidth=3;ctx.setLineDash([14,10]);ctx.lineDashOffset=off;
    ctx.beginPath();ctx.arc(x,y,r*k,0,TAU);ctx.stroke();ctx.setLineDash([]);
  };
  for(const z of zones){
    const k=Math.min(1,z.t*5)*Math.min(1,(z.dur-z.t)*4);
    if(z.kind==='quake'){
      ctx.globalAlpha=.1*k;ctx.fillStyle='#c9a26b';ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();
      ctx.globalAlpha=.5*k;ctx.strokeStyle='#c9a26b';ctx.lineWidth=2;ctx.setLineDash([6,12]);ctx.stroke();ctx.setLineDash([]);
    }else hole(z.x,z.y,z.r,k,z.w.evo==='a'?'#ffd23f':'#b06cff',z.t*90);
  }
  const hw=P.weapons.hole;
  if(hw&&hw.pet&&!P.dead)hole(hw.pet.x,hw.pet.y,hw.pet.r,1,'#b06cff',R.t*90);
  ctx.globalAlpha=1;
  const aw=P.weapons.aura;
  if(aw&&aw.rad&&!P.dead){
    ctx.globalAlpha=.1+.03*Math.sin(R.t*6);ctx.fillStyle=aw.evo==='b'?'#b06cff':aw.evo?'#ffd23f':'#ff5d73';
    ctx.beginPath();ctx.arc(P.x,P.y,aw.rad,0,TAU);ctx.fill();
    ctx.globalAlpha=.45;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;
  }

  let boss=null,pig=null;
  for(const e of enemies){
    if(e.r>40)boss=e;
    if(e.type==='piggy')pig=e;
    if(!vis(e))continue;
    const T=ET[e.type];
    const sides=e.sides||T.sides;
    if(e.wind>0){
      const a=Math.atan2(P.y-e.y,P.x-e.x);
      ctx.globalAlpha=.35;ctx.strokeStyle='#ff4d6d';ctx.lineWidth=e.r*1.6;
      ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(a)*380,e.y+Math.sin(a)*380);ctx.stroke();ctx.globalAlpha=1;
    }
    ctx.fillStyle=e.flash>0||(e.wind>0&&Math.floor(R.t*16)%2)?'#ffffff':e.frozen>0?'#bfefff':e.col||T.col;
    if(sides){
      const rot=e.type==='runner'?Math.atan2(P.y-e.y,P.x-e.x):e.type==='tank'?Math.PI/4:e.r>24?R.t*(e.r>40?.6:1.2):0;
      if(e.r>24){
        ctx.beginPath();
        for(let i=0;i<sides*2;i++){const a=rot+i*Math.PI/sides,rr=i%2?e.r*.78:e.r*1.12;ctx.lineTo(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr)}
        ctx.closePath();
      }else poly(e.x,e.y,e.r*1.15,sides,rot);
    }else{ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,TAU)}
    ctx.fill();
    // one outline per enemy shows its strongest status at a glance
    const st=e.burn>0?'burn':e.poison>0?'poison':e.shock>0?'shock':e.chill>0?'chill':null;
    if(st){ctx.strokeStyle=ELEMENTS[st].col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+3,0,TAU);ctx.stroke()}
    const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1,ex=dx/d*e.r*.3,ey=dy/d*e.r*.3,px=-dy/d*e.r*.3,py=dx/d*e.r*.3,es=Math.max(2,e.r*.17);
    ctx.fillStyle='#0c0e1a';
    if(e.type==='piggy'){ctx.font='900 22px system-ui';ctx.fillText('$',e.x,e.y+1)}
    else{ctx.fillRect(e.x+ex+px-es/2,e.y+ey+py-es/2,es,es);ctx.fillRect(e.x+ex-px-es/2,e.y+ey-py-es/2,es,es)}
    // every wounded enemy shows its health, so you can see fire and poison working
    if(e.hp<e.maxhp&&e.r<=40){
      const bh=e.r>18?4:3,bw=Math.max(e.r,11);
      ctx.fillStyle='#000a';ctx.fillRect(e.x-bw,e.y-e.r-6-bh,bw*2,bh);
      ctx.fillStyle='#ff5d73';ctx.fillRect(e.x-bw,e.y-e.r-6-bh,bw*2*Math.max(0,e.hp/e.maxhp),bh);
    }
  }

  for(const b of ebullets){
    if(!vis(b))continue;
    ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
    if(b.armor){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke()}
  }

  for(const b of bullets){
    if(!vis(b))continue;
    if(b.kind==='saw'){
      ctx.fillStyle=b.comet?'#9fb4ff':'#dfe6ff';ctx.beginPath();
      if(b.comet)ctx.arc(b.x,b.y,b.r,0,TAU);
      else{for(let i=0;i<16;i++){const a=b.rot+i*TAU/16,rr=i%2?b.r*.7:b.r;ctx.lineTo(b.x+Math.cos(a)*rr,b.y+Math.sin(a)*rr)}ctx.closePath()}
      ctx.fill();
      if(!b.comet){ctx.fillStyle='#5a6390';ctx.beginPath();ctx.arc(b.x,b.y,b.r*.25,0,TAU);ctx.fill()}
    }else if(b.kind==='rocket'){
      ctx.fillStyle=b.nuke?'#ffffff':'#ffa040';poly(b.x,b.y,b.nuke?16:9,3,b.a);ctx.fill();
    }else if(b.kind==='mine'){
      const fly=b.t<.35,rr=b.r*(fly?1+Math.sin(b.t/.35*Math.PI)*.8:1);
      ctx.fillStyle='#3a4275';ctx.beginPath();ctx.arc(b.x,b.y,rr,0,TAU);ctx.fill();
      ctx.fillStyle=!fly&&(b.stick||b.det||Math.floor(R.t*4)%2)?'#ff4d6d':'#7a1f2f';ctx.beginPath();ctx.arc(b.x,b.y,3.5,0,TAU);ctx.fill();
    }else if(b.bill){
      const k=1+(b.bill-1)*.35;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));
      ctx.fillStyle='#5de0a0';ctx.fillRect(-10*k,-5*k,20*k,10*k);ctx.fillStyle='#1d6b47';ctx.fillRect(-3*k,-3*k,6*k,6*k);ctx.restore();
    }else if(b.rail){
      ctx.strokeStyle='#bfe3ff';ctx.lineWidth=b.r;ctx.lineCap='round';ctx.beginPath();
      ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.05,b.y-b.vy*.05);ctx.stroke();ctx.lineCap='butt';
    }else{
      const el=b.w&&b.w.s.el;
      ctx.fillStyle=el?ELEMENTS[el].col:'#fff7a8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
    }
  }

  const lw=P.weapons.laser;
  if(lw&&lw.on&&!P.dead){
    const fl=.8+.2*Math.sin(R.t*40),col=lw.s.el?ELEMENTS[lw.s.el].col:lw.evo?'#ffd23f':'#ff6cf0';
    const ex=P.x+Math.cos(lw.ang)*lw.len,ey=P.y+Math.sin(lw.ang)*lw.len;
    beam(P.x,P.y,ex,ey,lw.wd,col,fl);
    if(lw.pr&&lw.tg)for(const e of lw.pr)if(!e.dead)beam(lw.tg.x,lw.tg.y,e.x,e.y,lw.wd*.6,col,fl);
  }
  const ow=P.weapons.orbit;
  if(ow&&ow.rings&&!P.dead){
    ctx.fillStyle=ow.s.el?ELEMENTS[ow.s.el].col:ow.evo?'#ffd23f':'#9fb4ff';
    for(const g of ow.rings)for(let i=0;i<g.n;i++){
      const a=ow.a*g.dir+i*TAU/g.n;
      ctx.beginPath();ctx.arc(P.x+Math.cos(a)*g.rad,P.y+Math.sin(a)*g.rad,ow.orbR,0,TAU);ctx.fill();
    }
  }

  if(!P.dead&&(P.inv<=0||Math.floor(R.t*20)%2)){
    const gold=save.secret;
    ctx.shadowColor=gold?'#ffd23f':'#5de0ff';ctx.shadowBlur=18;
    ctx.fillStyle=gold?'#ffd23f':'#ffffff';ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle=gold?'#fff7c2':'#5de0ff';ctx.beginPath();ctx.arc(P.x+Math.cos(P.face)*6,P.y+Math.sin(P.face)*6,4,0,TAU);ctx.fill();
    if(gold){
      const y=P.y-P.r-3;ctx.fillStyle='#ffd23f';ctx.beginPath();
      ctx.moveTo(P.x-10,y);ctx.lineTo(P.x-10,y-10);ctx.lineTo(P.x-5,y-5);ctx.lineTo(P.x,y-12);ctx.lineTo(P.x+5,y-5);ctx.lineTo(P.x+10,y-10);ctx.lineTo(P.x+10,y);
      ctx.closePath();ctx.fill();
    }
  }
  if(!P.dead&&P.shieldMax){
    if(P.shield>0){
      ctx.globalAlpha=.75;ctx.strokeStyle='#7fd8ff';ctx.lineWidth=1+P.shield*1.5;
      ctx.beginPath();ctx.arc(P.x,P.y,P.r+9,0,TAU);ctx.stroke();
    }else{
      ctx.globalAlpha=.4;ctx.strokeStyle='#7fd8ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(P.x,P.y,P.r+9,-Math.PI/2,-Math.PI/2+TAU*(1-Math.max(0,P.shT)/P.shieldCd));ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  if(!P.dead&&P.hp<P.maxhp){
    ctx.fillStyle='#000a';ctx.fillRect(P.x-20,P.y+P.r+12,40,5);
    ctx.fillStyle=P.hp/P.maxhp<.3?'#ff5d73':'#5de0a0';ctx.fillRect(P.x-20,P.y+P.r+12,40*Math.max(0,P.hp/P.maxhp),5);
  }

  for(const f of fx){
    const k=f.t/f.dur;
    if(f.type==='ring'){
      ctx.globalAlpha=(1-k)*.9;ctx.strokeStyle=f.col;ctx.lineWidth=5*(1-k)+1;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.35+.65*Math.min(1,k*1.6)),0,TAU);ctx.stroke();
      ctx.globalAlpha=(1-k)*.12;ctx.fillStyle=f.col;ctx.fill();
    }else{
      ctx.globalAlpha=1-k;ctx.strokeStyle=f.col;ctx.lineWidth=3;ctx.beginPath();
      ctx.moveTo(f.pts[0].x,f.pts[0].y);
      for(let i=1;i<f.pts.length;i++){
        const a=f.pts[i-1],b=f.pts[i];
        for(let s=1;s<=4;s++){const q=s/4,j=s<4?14:0;ctx.lineTo(a.x+(b.x-a.x)*q+rand(-j,j),a.y+(b.y-a.y)*q+rand(-j,j))}
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha=1;

  for(const p of parts){ctx.globalAlpha=1-p.t/p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}
  for(const t of texts){
    ctx.globalAlpha=Math.max(0,1-t.t/(t.slow?1.1:.55));
    ctx.font=`800 ${t.big?18:13}px system-ui`;ctx.fillStyle=t.c;ctx.fillText(t.s,t.x,t.y);
  }
  ctx.globalAlpha=1;
  ctx.restore();

  if(R.hurt>0){ctx.fillStyle=`rgba(255,40,70,${R.hurt*.8})`;ctx.fillRect(0,0,W,H)}
  if(R.flash>0){ctx.fillStyle=`rgba(255,255,255,${R.flash})`;ctx.fillRect(0,0,W,H)}
  if(state==='hub'||state==='secret')return;
  if(state==='choice'){ctx.fillStyle='rgba(8,9,18,.6)';ctx.fillRect(0,0,W,H)}

  // HUD
  ctx.fillStyle='#161a2e';ctx.fillRect(0,0,W,10);
  ctx.fillStyle='#5de0ff';ctx.fillRect(0,0,W*Math.min(1,P.xp/P.xpNext),10);
  ctx.textBaseline='top';ctx.textAlign='left';
  ctx.font='800 15px system-ui';ctx.fillStyle='#e8ecff';ctx.fillText('LV '+P.level,14,20);
  ctx.fillStyle='#161a2e';ctx.fillRect(70,22,170,12);
  ctx.fillStyle=P.hp/P.maxhp<.3?'#ff5d73':'#5de0a0';ctx.fillRect(70,22,170*Math.max(0,P.hp/P.maxhp),12);
  ctx.textAlign='center';ctx.font='800 22px system-ui';ctx.fillStyle=R.cleared?'#ff5d73':'#e8ecff';
  ctx.fillText(clock(R.t)+(R.cleared?'  OVERTIME':R.heat?'  🌶️'+R.heat:''),W/2,18);
  ctx.textAlign='right';ctx.font='900 30px system-ui';ctx.fillStyle='#ffd23f';ctx.fillText(cash(R.fp),W-16,18);
  if(R.combo>=1){
    const cm=comboMult();
    ctx.font=`900 ${Math.min(34,14+cm*3)}px system-ui`;ctx.fillStyle=cm>5?'#ff5d73':cm>3.5?'#ffb347':'#e8ecff';
    ctx.fillText('x'+cm.toFixed(1)+'  ·  '+Math.floor(R.combo)+' combo',W-16,54);
    ctx.fillStyle='#ffd23f';ctx.fillRect(W-16-120*Math.max(0,R.comboT/2.5),92,120*Math.max(0,R.comboT/2.5),3);
  }
  if(boss){
    const bw=Math.min(520,W-40);
    ctx.fillStyle='#161a2e';ctx.fillRect((W-bw)/2,50,bw,12);
    ctx.fillStyle=boss.col||'#ffffff';ctx.fillRect((W-bw)/2,50,bw*Math.max(0,boss.hp/boss.maxhp),12);
    ctx.textAlign='center';ctx.font='800 12px system-ui';ctx.fillText(boss.name,W/2,66);
  }else if(!R.finalDone){
    const fin=R.bosses>=BOSSES.length,left=(fin?FINAL_AT:R.nextBoss)-R.t;
    ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.fillStyle=left<10?'#ff5d73':'#8a93c0';
    ctx.fillText((fin?'Final boss':'Boss '+(R.bosses+1)+' of '+BOSSES.length)+' in '+clock(Math.max(0,left)),W/2,46);
  }
  // the piggy bank is easy to lose, so point at it while it is off screen
  if(pig&&!vis(pig)){
    const a=Math.atan2(pig.y-P.y,pig.x-P.x),rx=W/2+Math.cos(a)*Math.min(W,H)*.38,ry=H/2+Math.sin(a)*Math.min(W,H)*.38;
    ctx.fillStyle='#ff8fd0';poly(rx,ry,14,3,a);ctx.fill();
    ctx.textAlign='center';ctx.font='800 12px system-ui';ctx.fillText(Math.ceil(pig.left)+'s',rx,ry+18);
  }
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font='700 11px system-ui';ctx.fillStyle='#8a93c0';
  ctx.fillText('WEAPONS '+Object.keys(P.weapons).length+'/'+P.wslots+'   CARDS '+cardCount()+'/'+P.cslots,14,H-70);
  ctx.textAlign='center';
  let ix=28;
  for(const id in P.weapons){
    const w=P.weapons[id];
    ctx.font='24px system-ui';ctx.fillStyle='#fff';ctx.fillText(WEAPONS[id].icon,ix,H-40);
    ctx.font='800 11px system-ui';ctx.fillStyle=w.evo?'#ff5d73':'#ffd23f';
    ctx.fillText((w.evo?'★':'I'.repeat(w.rank))+(w.over?'+'+w.over:''),ix,H-20);
    for(let i=0;i<3;i++){ctx.fillStyle=i<w.mods.length?(MODS[w.mods[i]].el?ELEMENTS[MODS[w.mods[i]].el].col:'#5de0a0'):'#2a3157';ctx.fillRect(ix-11+i*8,H-10,6,4)}
    ix+=42;
  }
  ix+=12;
  for(const id in P.cards){
    ctx.font='22px system-ui';ctx.fillStyle='#fff';ctx.fillText(CARDS[id].icon,ix,H-38);
    if(P.cards[id]>1){ctx.font='800 11px system-ui';ctx.fillStyle='#a79bff';ctx.fillText('×'+P.cards[id],ix,H-18)}
    ix+=34;
  }
  if(R.banner){
    const k=R.banner.t;
    ctx.globalAlpha=Math.min(1,k*5)*Math.max(0,Math.min(1,(2-k)*2));
    ctx.font=`900 ${Math.min(64,W/12)}px system-ui`;ctx.fillStyle='#ffd23f';ctx.fillText(R.banner.s,W/2,H*.26);
    ctx.globalAlpha=1;
  }
  if(joy.id!==null){
    ctx.strokeStyle='#ffffff44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,50,0,TAU);ctx.stroke();
    ctx.fillStyle='#ffffff66';ctx.beginPath();ctx.arc(joy.ox+joy.x*50,joy.oy+joy.y*50,18,0,TAU);ctx.fill();
  }
}

let last=performance.now();
function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  // holding Tab with picks waiting slows the world so the options can be read
  if(state==='play')update(dt*(keys.Tab&&R.offer?.25:1));else if(state==='dying')updateFx(dt);
  render();requestAnimationFrame(frame);
}
newRun();showHub();requestAnimationFrame(frame);
if(REMOTE)fetch('save').then(r=>r.ok?r.json():null).then(d=>{
  if(!d)return;
  const dr=d.rev===undefined?-1:d.rev,lr=save.rev||0;
  if(dr>lr||(dr===lr&&(d.life||0)>=save.life)){Object.assign(save,d);storeLocal();if(state==='hub')showHub(lastSum)}
  else pushSave();
}).catch(()=>{});
