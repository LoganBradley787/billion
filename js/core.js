'use strict';
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),ov=document.getElementById('ov'),tray=document.getElementById('tray');
let W=0,H=0,DPR=1,Z=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;Z=Math.max(.55,Math.min(1.25,Math.min(W,H)/760));
}
addEventListener('resize',resize);resize();

const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a);
const pickRand=a=>a[Math.random()*a.length|0];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function fmt(n){
  n=Math.floor(n);if(n<1e3)return''+n;
  const u=['K','M','B','T','Q'];let i=-1;
  while(n>=1e3&&i<u.length-1){n/=1e3;i++}
  return(n<10?n.toFixed(2):n<100?n.toFixed(1):n.toFixed(0))+u[i];
}
const clock=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function compact(a,dead){let j=0;for(let i=0;i<a.length;i++){const o=a[i];if(!dead(o))a[j++]=o}a.length=j}
// angles for n shots in a fan; with an even count the fan shifts so one shot still flies dead centre
function fan(n,spread){const out=[];for(let i=0;i<n;i++)out.push((i-(n-1)/2)*spread+(n%2?0:spread/2));return out}

// ---------- save ----------
const SAVE_KEY='billion-save-v3';
const freshSave=()=>({bank:0,life:0,best:0,bestTime:0,runs:0,meta:{},mute:false,heat:0,maxHeat:0,rev:0,secret:false,pausePick:false});
const save=freshSave();
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
const storeLocal=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}};
// when served by server.js the save also lives in save.json on disk, so it follows you
// across browsers and devices; localStorage alone is the fallback
const REMOTE=location.protocol.startsWith('http');
let pushT=0;
function pushSave(){
  if(!REMOTE)return;
  clearTimeout(pushT);
  pushT=setTimeout(()=>{fetch('save',{method:'PUT',body:JSON.stringify(save)}).catch(()=>{})},300);
}
const persist=()=>{save.rev=(save.rev||0)+1;storeLocal();pushSave()};
const mlv=id=>save.meta[id]||0;
const metaCost=m=>Math.floor(m.cost*Math.pow(m.g||1,mlv(m.id)));
const rich=()=>save.life>=GOAL;
const cash=n=>rich()?'$'+fmt(n):fmt(n)+' FP';
const unlocked=d=>save.life>=(d.unlock||0)&&save.maxHeat>=(d.need||0)&&(!d.secret||rich());

// ---------- audio ----------
let AC=null;const sndT={};let gemStreak=0,gemT=0;
function initAudio(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}}
function tone(f,d,type,v,slide,delay){
  const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02);
}
function sfx(id){
  if(save.mute||!AC)return;
  const now=AC.currentTime;if(now-(sndT[id]||-1)<.045)return;sndT[id]=now;
  switch(id){
    case'shoot':tone(680,.05,'square',.012,-300);break;
    case'hit':tone(210,.04,'square',.018,-80);break;
    case'kill':tone(rand(300,380),.08,'triangle',.05,-180);break;
    case'gem':if(now-gemT>.5)gemStreak=0;gemT=now;gemStreak=Math.min(24,gemStreak+1);
      tone(520*Math.pow(2,gemStreak/12),.07,'sine',.04);break;
    case'level':[523,659,784,1047].forEach((f,i)=>tone(f,.14,'triangle',.06,0,i*.07));break;
    case'pick':tone(660,.1,'triangle',.06,400);break;
    case'block':tone(980,.14,'triangle',.06,-600);break;
    case'hurt':tone(140,.2,'sawtooth',.08,-90);break;
    case'boom':tone(110,.25,'sawtooth',.06,-80);break;
    case'zap':tone(1400,.09,'sawtooth',.025,-1100);break;
    case'freeze':tone(1800,.12,'sine',.03,-900);break;
    case'chest':[784,988,1175,1568].forEach((f,i)=>tone(f,.16,'square',.035,0,i*.06));break;
    case'evo':[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.2,'sawtooth',.04,0,i*.06));break;
    case'boss':tone(70,.9,'sawtooth',.1,-30);break;
    case'die':tone(300,.8,'sawtooth',.09,-260);break;
  }
}

const keys={},joy={x:0,y:0,id:null,ox:0,oy:0};
