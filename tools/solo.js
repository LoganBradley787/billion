// One weapon at a time against the standard horde, so weapons can be compared like for like.
//   node tools/solo.js w=saw mins=8 runs=2 bot=kite|charge
// The player has no shop upgrades, takes no picks and cannot be hurt; the bot kites as usual.
// Each weapon is measured at five stages: rank 1, rank 3, rank 3 with its first three mods, and each evolution.
// Output per stage: kills by the halfway mark, kills by the end, enemies still alive at the end, damage dealt.
const fs=require('fs'),path=require('path');
const arg=Object.fromEntries(process.argv.slice(2).map(a=>a.split('=')));
const noop=()=>{};
const ctxStub=new Proxy({},{get:(t,k)=>k in t?t[k]:noop,set:(t,k,v)=>{t[k]=v;return true}});
const el=()=>({getContext:()=>ctxStub,addEventListener:noop,style:{},dataset:{},innerHTML:'',className:'',scrollTop:0});
global.document={getElementById:el};global.window=global;global.innerWidth=1280;global.innerHeight=800;global.devicePixelRatio=1;
global.location={protocol:'file:'};global.confirm=()=>true;
global.addEventListener=noop;global.requestAnimationFrame=noop;global.setTimeout=noop;global.localStorage={getItem:()=>null,setItem:noop};
const src=['data','core','game','ui'].map(f=>fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8').replace("'use strict';",'')).join('\n');
console.log((0,eval)(src+`;(${run.toString()})(${JSON.stringify(arg)})`));

function run(arg){
  const MINS=+arg.mins||8,RUNS=+arg.runs||2,lines=[];
  save.life=2e9;save.secret=true;save.meta={};save.heat=0;
  for(const id of arg.w?arg.w.split(','):Object.keys(WEAPONS)){
    const D=WEAPONS[id],mods=D.mods.concat(['conc','big']).slice(0,3);
    const stages=[['rank 1',1,[],null],['rank 3',3,[],null],['rank 3 + mods',3,mods,null]];
    D.evo.forEach((e,f)=>stages.push([e.name,3,mods,f?'b':'a']));
    for(const[label,rank,ms,evo]of stages){
      let half=0,kills=0,left=0,dmg=0;
      for(let r=0;r<RUNS;r++){
        startRun();
        const w=newWeapon(id);w.rank=rank;w.evo=evo;for(const m of ms){w.mods.push(m);w.m[m]=true}
        P.weapons={[id]:w};recalc();
        for(let s=0;s<MINS*3600;s++){
          R.queue.length=0;R.offer=null;state='play';P.inv=9;
          let fx_=0,fy_=0;
          for(const e of enemies){if(e.type==='piggy')continue;const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;if(d<260){const k=(260-d)/d/260*(e.r/10);fx_+=dx*k*60;fy_+=dy*k*60}}
          let bg=null,bd=1e9;for(const g of gems){const d=Math.hypot(g.x-P.x,g.y-P.y);if(d<bd){bd=d;bg=g}}
          if(bg){fx_+=(bg.x-P.x)/bd*.8;fy_+=(bg.y-P.y)/bd*.8}
          // bot=charge walks into the nearest enemy instead: the fair test for close-range weapons
          if(arg.bot==='charge'){const t=nearest(P.x,P.y,2000);fx_=t?t.x-P.x:0;fy_=t?t.y-P.y:0}
          const l=Math.hypot(fx_,fy_)||1;joy.x=fx_/l;joy.y=fy_/l;
          update(1/60);
          if(s===MINS*1800)half+=R.kills;
        }
        kills+=R.kills;left+=enemies.length;for(const k in R.dmg)dmg+=R.dmg[k];
      }
      lines.push([id,label,Math.round(half/RUNS),Math.round(kills/RUNS),Math.round(left/RUNS),fmt(dmg/RUNS)].join('\t'));
    }
  }
  return lines.join('\n');
}
