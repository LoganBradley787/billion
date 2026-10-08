// Headless bot runs for balance checks and crash hunting.
//   node tools/sim.js runs=5 save=max heat=0 build=firestorm bot=kite
// save: fresh | mid | max     bot: kite | clumsy | still     build: a name from BUILDS, "smart" or "random"
// With save=fresh the bot keeps its earnings between runs and spends them in the shop.
const fs=require('fs'),path=require('path');
const arg=Object.fromEntries(process.argv.slice(2).map(a=>a.split('=')));
const noop=()=>{};
const ctxStub=new Proxy({},{get:(t,k)=>k in t?t[k]:noop,set:(t,k,v)=>{t[k]=v;return true}});
const el=()=>({getContext:()=>ctxStub,addEventListener:noop,style:{},dataset:{},innerHTML:'',className:'',scrollTop:0});
global.document={getElementById:el};global.window=global;global.innerWidth=1280;global.innerHeight=800;global.devicePixelRatio=1;
global.location={protocol:'file:'};global.confirm=()=>true;
global.addEventListener=noop;global.requestAnimationFrame=noop;global.setTimeout=noop;global.localStorage={getItem:()=>null,setItem:noop};
const src=['data','core','game','ui'].map(f=>fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8').replace("'use strict';",'')).join('\n');

// what each scripted build wants, most wanted first; anything else falls back to the smart policy
const BUILDS={
  firestorm:{w:['saw','nova','hole','blaster'],mods:['burn','implode','carrier','lodged','twin','after','horizon'],cards:['pyro','ring','mob'],evo:{saw:0,nova:1,hole:0}},
  sniper:{w:['rocket','blaster','laser','hole'],mods:['hollow','heavy','painter','lens','sticky','ricochet','bigone'],cards:['sniper','giant','hitrun'],evo:{blaster:1,laser:1,rocket:1}},
  fortress:{w:['orbit','aura','nova'],mods:['bumper','ring2','weaken','leech','intens','focus','conc'],cards:['brawler','stand','bubble','boots'],evo:{orbit:0,aura:0,nova:0}},
  cryo:{w:['blaster','nova','lightning'],mods:['chill','conductor','fork','after','split','shock'],cards:['cold','elemental','ring'],evo:{blaster:0,nova:1,lightning:0}},
  plague:{w:['blaster','rocket','aura'],mods:['poison','burn','split','rapid','seeker','intens'],cards:['giant','elemental'],evo:{blaster:0,rocket:0,aura:1}},
  trapper:{w:['mine','hole','nova'],mods:['chain','bait','implode','spag','horizon','burn'],cards:['hitrun','ring','mob'],evo:{mine:0,hole:0}},
  onetrick:{w:['blaster'],mods:['split','ricochet','shock'],cards:['onetrick','glass','vampire'],evo:{blaster:0}},
  glass:{w:['lightning','nova','saw'],mods:['fork','overload','shock','after','twin'],cards:['glass','ring','mob'],evo:{lightning:0,nova:0}},
};
const out=(0,eval)(src+`;(${run.toString()})(${JSON.stringify(arg)},${JSON.stringify(BUILDS)})`);
console.log(out);

function run(arg,BUILDS){
  const RUNS=+arg.runs||4,B=BUILDS[arg.build],policy=arg.build||'smart',bot=arg.bot||'kite',lines=[];
  const preset=arg.save||'fresh';
  if(preset!=='fresh'){
    save.life=preset==='max'?2e9:3e6;save.secret=true;save.maxHeat=+arg.maxheat||(preset==='max'?4:0);
    // Overdrive has no real ceiling, so "max" means everything else maxed plus over=N (default 0)
    for(const m of META)if(save.maxHeat>=(m.need||0))save.meta[m.id]=m.id==='over'?+arg.over||0:preset==='max'?m.max:Math.min(m.max,m.max>3?4:1);
    if(preset==='mid'){save.meta.opt4=0;save.meta.cslot=0;save.meta.wslot=0;save.meta.pickw=1}
  }
  const score=o=>{
    if(policy==='random')return Math.random();
    if(o.k==='evo')return 100+(B&&B.evo[o.id]===o.f?5:Math.random());
    if(B){
      if(o.k==='w')return B.w.includes(o.id)?90-B.w.indexOf(o.id):Object.keys(P.weapons).length<2?20:1;
      if(o.k==='mod'){const i=B.mods.indexOf(o.m);return i>=0&&B.w.includes(o.id)?80-i:MODS[o.m].cost?2:10}
      if(o.k==='card'){const i=B.cards.indexOf(o.id);return i>=0?70-i:3}
      if(o.k==='rank')return B.w.includes(o.id)?60:15;
      if(o.k==='over')return B.w.includes(o.id)?30:8;
      return 12;
    }
    return{w:Object.keys(P.weapons).length<3?70:40,mod:MODS[o.m]&&MODS[o.m].cost?35:60,rank:65,card:CARDS[o.id]&&CARDS[o.id].cost?25:45,over:30,train:20}[o.k]+Math.random()*10;
  };
  const agg={},cnt={};let clears=0;
  for(let r=0;r<RUNS;r++){
    if(arg.heat!==undefined)save.heat=Math.min(+arg.heat,save.maxHeat);else save.heat=0;
    startRun();
    let steps=0,evoAt=null,done=null;const trace=[];
    while(state!=='dying'&&steps<60*60*22){
      if(R.offer){
        let best=0,bs=-1;R.offer.forEach((o,i)=>{const s=score(o);if(s>bs){bs=s;best=i}});
        if(B&&bs<50&&P.rerolls>0&&R.queue[0].type!=='loadout'){reroll();continue}
        if(!evoAt&&R.offer[best].k==='evo')evoAt=clock(R.t);
        takePick(best);
        if(!done&&Object.values(P.weapons).every(w=>w.evo)&&Object.keys(P.weapons).length>=Math.min(4,P.wslots))done=clock(R.t);
        continue;
      }
      if(state!=='play'){state='play'}
      let fx_=0,fy_=0;
      if(bot!=='still'){
        const aw=bot==='clumsy'?150:260;
        for(const e of enemies){if(e.type==='piggy')continue;const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;if(d<aw){const w=(aw-d)/d/aw*(e.r/10);fx_+=dx*w*60;fy_+=dy*w*60}}
        for(const b of ebullets){const dx=P.x-b.x,dy=P.y-b.y,d=Math.hypot(dx,dy)||1;if(d<(bot==='clumsy'?60:120)){fx_+=dx/d*2;fy_+=dy/d*2}}
        let bg=null,bd=1e9;for(const g of gems){const d=Math.hypot(g.x-P.x,g.y-P.y);if(d<bd){bd=d;bg=g}}
        if(bg){fx_+=(bg.x-P.x)/bd*.8;fy_+=(bg.y-P.y)/bd*.8}
      }
      const l=Math.hypot(fx_,fy_)||1;joy.x=bot==='still'?0:fx_/l;joy.y=bot==='still'?0:fy_/l;
      update(1/60);render();steps++;
      if(arg.trace&&steps%3600===0)trace.push(Math.round(R.t/60)+'m lv'+P.level+' xp'+fmt(R.xpGot)+' k'+R.kills+' '+fmt(R.fp));
    }
    let tot=0;for(const k in R.dmg)tot+=R.dmg[k];
    const ws=Object.values(P.weapons).map(w=>{const p=(R.dmg[w.id]||0)/(tot||1)*100;agg[w.id]=(agg[w.id]||0)+p;cnt[w.id]=(cnt[w.id]||0)+1;
      return weaponName(w)+'['+w.rank+(w.over?'+'+w.over:'')+' '+w.mods.join(',')+'] '+p.toFixed(0)+'%'}).join(' | ');
    if(R.cleared)clears++;
    lines.push(clock(R.t)+' spice'+R.heat+' lv'+P.level+' picks'+R.picks+' '+fmt(R.fp)+' combo'+R.maxCombo+(R.cleared?' CLEARED@'+clock(R.clearT):'')+' evo@'+evoAt+' built@'+done+
      '\n   '+ws+(trace.length?'\n   '+trace.join(' · '):'')+'\n   cards: '+Object.keys(P.cards).join(',')+'  train: '+Object.entries(P.train).map(([k,v])=>k+v).join(','));
    state='dying';endRun();if(state==='secret')collectSecret();
    if(preset==='fresh'){let b=true;while(b){b=false;for(const m of META)if(mlv(m.id)<m.max&&save.bank>=metaCost(m)&&save.maxHeat>=(m.need||0)){buy(m.id);b=true}}}
  }
  lines.push('clears '+clears+'/'+RUNS+'   avg damage share: '+Object.keys(agg).sort((a,b)=>agg[b]/cnt[b]-agg[a]/cnt[a]).map(k=>k+' '+(agg[k]/cnt[k]).toFixed(0)+'%').join(', '));
  if(preset==='fresh')lines.push('lifetime '+fmt(save.life)+'  shop '+JSON.stringify(save.meta));
  return lines.join('\n');
}
