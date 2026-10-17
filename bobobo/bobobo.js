/* ボーボボ 2D RIG / Vanilla Canvas runtime
   Reference art: supplied by user. Original character art is never replaced with a proxy.
   All sprites were extracted from the reference and remain individually replaceable.
   API: BoboboAnimator.create({target,assets,autoplay,style,speed,onAction}); instance.play(id), .start(), .stop(), .setStyle(), .setJoint(), .destroy()
*/
(function(global){
'use strict';
const DIM={
head:[158,0,192,250],body:[154,177,200,365],
upper_arm_l:[7,204,182,338],lower_arm_l:[9,496,111,265],hand_l:[16,676,105,84],
upper_arm_r:[312,204,182,338],lower_arm_r:[380,496,110,256],hand_r:[379,676,105,84],
upper_leg_l:[144,494,120,434],lower_leg_l:[116,861,93,311],foot_l:[39,1121,157,129],
upper_leg_r:[237,494,113,434],lower_leg_r:[292,861,87,311],foot_r:[305,1121,138,129]
};
// Crops for hand are corrected at runtime from an automatically generated manifest if present.
const JOINTS=['head','torso','leftShoulder','leftElbow','leftWrist','rightShoulder','rightElbow','rightWrist','leftHip','leftKnee','leftAnkle','rightHip','rightKnee','rightAnkle'];
const JOINTKEY={head:'head',torso:'torso',leftShoulder:'shL',leftElbow:'elL',leftWrist:'wrL',rightShoulder:'shR',rightElbow:'elR',rightWrist:'wrR',leftHip:'hipL',leftKnee:'kneeL',leftAnkle:'ankL',rightHip:'hipR',rightKnee:'kneeR',rightAnkle:'ankR'};
const DEFAULT={x:0,y:0,rot:0,sx:1,sy:1,head:0,torso:0,shL:0,elL:0,wrL:0,shR:0,elR:0,wrR:0,hipL:0,kneeL:0,ankL:0,hipR:0,kneeR:0,ankR:0,fx:0};
const PI=Math.PI;const sin=Math.sin;const cos=Math.cos;const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const mix=(a,b,t)=>a+(b-a)*t;const smooth=t=>t*t*(3-2*t);const rnd=(a,b)=>a+Math.random()*(b-a);
const K=(t,pose)=>({t,...pose});
// keyframe poses: values in degrees and original illustration units (500x1250).
const ACTIONS={
 idle:{name:'待機',d:2800,type:'basic',frames:[K(0,{}),K(.5,{y:-6,shL:3,shR:-3,head:3}),K(1,{})]},
 look:{name:'キョロキョロ',d:2500,type:'basic',frames:[K(0,{}),K(.3,{head:-17,torso:-3}),K(.62,{head:18,torso:4}),K(1,{})]},
 swagger:{name:'偉そうに歩く',d:3900,type:'basic',frames:[K(0,{}),K(.2,{x:-54,y:-20,hipL:23,hipR:-22,shL:18,shR:-17,head:7}),K(.45,{x:12,hipL:-19,hipR:18,shL:-20,shR:15}),K(.75,{x:52,y:-14,hipL:22,hipR:-22,shL:17,shR:-16}),K(1,{})]},
 walk:{name:'歩く',d:3400,type:'basic',frames:[K(0,{}),K(.2,{x:-65,hipL:17,hipR:-20,shL:-18,shR:18,y:-9}),K(.45,{x:0,hipL:-20,hipR:21,shL:18,shR:-17}),K(.7,{x:65,hipL:20,hipR:-20,shL:-17,shR:18,y:-8}),K(1,{})]},
 dash:{name:'超速ダッシュ',d:2350,type:'fight',frames:[K(0,{x:-35}),K(.18,{x:-80,rot:11,torso:18,shL:-32,shR:41,hipL:34,hipR:-30,y:-18}),K(.38,{x:115,y:-65,rot:18,torso:19,shL:56,shR:-56,hipL:-37,hipR:40}),K(.72,{x:-110,y:-30,rot:-10,shL:-42,shR:53,hipL:35,hipR:-43}),K(1,{})]},
 jump:{name:'大ジャンプ',d:2600,type:'basic',frames:[K(0,{}),K(.16,{y:36,sy:.90,sx:1.10,hipL:19,hipR:-17}),K(.42,{y:-280,hipL:38,hipR:-38,kneeL:-62,kneeR:65,shL:-105,shR:105}),K(.68,{y:-240,rot:6,hipL:42,hipR:-44,shL:-116,shR:120}),K(.86,{y:18,sy:.83,sx:1.18}),K(1,{})]},
 punch:{name:'豪快パンチ',d:1950,type:'fight',frames:[K(0,{}),K(.22,{rot:-9,torso:-21,shR:-26,elR:-115,shL:19,elL:45}),K(.44,{rot:14,torso:22,shR:117,elR:-8,shL:-29,elL:40,fx:1}),K(.60,{shR:103,elR:-6,fx:1}),K(1,{})]},
 barrage:{name:'超連撃ラッシュ',d:3900,type:'fight',frames:[K(0,{}),K(.16,{rot:-8,shL:-40,shR:72,elL:77,elR:-30}),K(.30,{rot:9,shL:-121,elL:-12,shR:13,elR:95,fx:1}),K(.43,{rot:-12,shL:42,elL:85,shR:125,elR:3,fx:1}),K(.57,{rot:12,shL:-121,elL:-10,shR:-12,elR:95,fx:1}),K(.70,{rot:-13,shL:27,elL:80,shR:123,elR:0,fx:1}),K(.84,{shL:-118,shR:115,fx:1}),K(1,{})]},
 uppercut:{name:'昇天アッパー',d:2250,type:'fight',frames:[K(0,{}),K(.22,{sy:.84,sx:1.13,rot:-11,shR:-46,elR:70}),K(.46,{y:-115,rot:20,shR:-173,elR:-10,shL:-25,fx:1}),K(.66,{y:-190,shR:-174,fx:1}),K(1,{})]},
 kick:{name:'超高空キック',d:2200,type:'fight',frames:[K(0,{}),K(.17,{rot:-10,shL:-48,shR:68,hipR:-16}),K(.46,{rot:-25,y:-94,hipR:144,kneeR:-13,hipL:-15,shL:-83,shR:56,fx:1}),K(.64,{rot:-20,y:-74,hipR:139,fx:1}),K(1,{})]},
 roundhouse:{name:'回し蹴り',d:2750,type:'fight',frames:[K(0,{}),K(.22,{rot:-21,hipL:35,hipR:-26,shL:-55,shR:48}),K(.46,{rot:45,y:-135,hipL:134,kneeL:-30,hipR:-44,fx:1}),K(.66,{rot:170,y:-160,hipL:130,hipR:-40,fx:1}),K(.88,{rot:360,y:-18,fx:1}),K(1,{rot:360})]},
 backflip:{name:'空中バク転',d:2950,type:'fight',frames:[K(0,{}),K(.18,{y:31,sy:.85,shL:-80,shR:80}),K(.36,{y:-225,rot:-95,hipL:48,hipR:-48,kneeL:-60,kneeR:65}),K(.56,{y:-365,rot:-207,shL:-115,shR:115}),K(.78,{y:-156,rot:-315,hipL:30,hipR:-35}),K(.92,{rot:-360,y:14,sy:.83}),K(1,{rot:-360})]},
 spin:{name:'全身コマ回転',d:3000,type:'fight',frames:[K(0,{}),K(.2,{rot:50,y:-70,shL:-85,shR:85,hipL:38,hipR:-40}),K(.5,{rot:540,y:-130,shL:-145,shR:145}),K(.82,{rot:1040,y:-80}),K(1,{rot:1080})]},
 dance:{name:'意味不明ダンス',d:5200,type:'gag',frames:[K(0,{}),K(.12,{x:-55,rot:-15,shL:-130,shR:42,elL:30,hipL:25,hipR:-22}),K(.25,{x:48,rot:15,shL:37,shR:140,elR:-30,hipL:-21,hipR:29}),K(.40,{x:-42,rot:-16,y:-36,shL:-170,shR:-174,hipL:38,hipR:-27}),K(.55,{x:55,rot:17,shL:37,shR:143,elR:70,hipL:-26,hipR:35}),K(.70,{x:-40,y:-80,rot:-10,shL:-175,shR:175,hipL:43,hipR:-40}),K(.85,{x:55,rot:17,shL:130,shR:-131,hipL:-23,hipR:24}),K(1,{})]},
 robot:{name:'カクカクロボダンス',d:4400,type:'gag',step:true,frames:[K(0,{}),K(.15,{head:-25,shL:-90,elL:90,shR:70,elR:-80}),K(.3,{x:-42,shL:48,elL:-88,shR:-120,elR:50}),K(.47,{head:28,rot:12,shL:-154,shR:147}),K(.63,{x:44,rot:-12,shL:70,shR:-70,elL:100,elR:-100}),K(.8,{head:-33,shL:165,shR:-157}),K(1,{})]},
 moonwalk:{name:'月面ウォーク',d:3450,type:'gag',frames:[K(0,{}),K(.28,{x:95,rot:-12,hipL:36,kneeL:-55,hipR:-22,shL:32,shR:-25}),K(.54,{x:-45,rot:12,hipR:-37,kneeR:65,hipL:24}),K(.78,{x:-120,rot:-15,hipL:30,kneeL:-60}),K(1,{})]},
 bow:{name:'突然の土下座',d:3250,type:'gag',frames:[K(0,{}),K(.17,{rot:-12,head:15}),K(.38,{rot:75,y:70,head:25,hipL:-60,hipR:60,kneeL:116,kneeR:-116,shL:-74,shR:75,fx:.5}),K(.70,{rot:85,y:112,head:30,hipL:-75,hipR:75,kneeL:135,kneeR:-135}),K(.83,{rot:83,y:114}),K(1,{})]},
 fall:{name:'突然大転倒',d:3650,type:'gag',frames:[K(0,{}),K(.24,{rot:-24,x:-65,shL:-40,shR:55}),K(.42,{rot:90,x:80,y:220,shL:-150,shR:150,hipL:45,hipR:-35,fx:1}),K(.67,{rot:100,x:100,y:235,head:30,hipL:46,hipR:-22}),K(.83,{rot:70,x:40,y:200}),K(1,{})]},
 selfdestruct:{name:'自爆ギャグ',d:4400,type:'gag',frames:[K(0,{}),K(.22,{shL:-160,shR:160,y:-35,fx:1}),K(.40,{y:-230,rot:110,hipL:70,hipR:-80,shL:-110,shR:120,fx:1}),K(.56,{y:-250,rot:265,fx:1}),K(.75,{rot:455,y:230,fx:1,head:20}),K(.90,{rot:390,y:160}),K(1,{rot:360})]},
 roar:{name:'謎の雄叫び',d:3000,type:'gag',frames:[K(0,{}),K(.18,{y:15,sy:.91}),K(.38,{y:-55,sy:1.12,sx:1.06,head:-15,shL:-130,shR:130,fx:1}),K(.68,{y:-45,sy:1.13,shL:-135,shR:135,fx:1}),K(1,{})]},
 flex:{name:'筋肉自慢',d:3300,type:'gag',frames:[K(0,{}),K(.20,{shL:-65,elL:95,shR:75,elR:-95,sx:1.13}),K(.56,{shL:-90,elL:120,shR:90,elR:-125,sx:1.20,fx:.5}),K(.83,{shL:-86,elL:112,shR:85,elR:-113}),K(1,{})]},
 victory:{name:'勝利宣言',d:2600,type:'gag',frames:[K(0,{}),K(.28,{y:-48,shL:-168,shR:35,wrL:-30,rot:-8,fx:1}),K(.70,{y:-26,shL:-175,shR:45,fx:1}),K(1,{})]},
 panic:{name:'意味不明な大暴れ',d:4000,type:'gag',frames:[K(0,{}),K(.16,{rot:23,x:-45,shL:-135,shR:-32,hipL:-36,hipR:34}),K(.33,{rot:-29,x:55,shL:32,shR:144,hipL:40,hipR:-42,y:-30}),K(.50,{rot:38,x:-65,shL:-165,shR:160,hipL:-35,hipR:42}),K(.68,{rot:-35,x:71,y:-55,shL:43,shR:-145,hipL:42,hipR:-45}),K(.85,{rot:39,x:-66,shL:-152,shR:137,hipL:-33,hipR:36}),K(1,{})]},
 nosewhip:{name:'鼻毛神拳・一閃',d:3450,type:'nose',frames:[K(0,{}),K(.18,{shL:-80,shR:85,rot:-8,head:14}),K(.38,{shL:-142,shR:142,rot:12,head:-8,fx:1}),K(.70,{shL:-145,shR:148,rot:9,head:-9,fx:1}),K(.85,{head:12,shL:30,shR:-20}),K(1,{})]},
 noseburst:{name:'鼻毛神拳・爆裂',d:4100,type:'nose',frames:[K(0,{}),K(.18,{y:35,sy:.88,sx:1.1,head:-12,shL:-72,shR:68}),K(.42,{y:-74,head:9,shL:-175,shR:175,fx:1}),K(.77,{y:-74,shL:-170,shR:165,fx:1}),K(1,{})]},
 noseweb:{name:'鼻毛神拳・乱舞',d:4650,type:'nose',frames:[K(0,{}),K(.16,{rot:-12,shL:-90,shR:90}),K(.35,{rot:14,y:-80,shL:-140,shR:142,fx:1}),K(.55,{rot:-15,y:-120,shL:42,shR:152,fx:1}),K(.78,{rot:16,y:-50,shL:-150,shR:43,fx:1}),K(1,{})]},
 nosecannon:{name:'鼻毛神拳・超砲撃',d:4850,type:'nose',frames:[K(0,{}),K(.22,{rot:-12,y:30,shL:-48,shR:51,sy:.88}),K(.39,{rot:18,y:-140,shL:-167,shR:168,fx:1}),K(.69,{rot:18,y:-180,shL:-167,shR:168,fx:1}),K(.82,{rot:-6,y:65,sy:.88,fx:1}),K(1,{})]},
 meditation:{name:'奇妙な瞑想',d:3800,type:'gag',frames:[K(0,{}),K(.25,{y:-100,hipL:48,hipR:-51,kneeL:-100,kneeR:105,shL:60,shR:-60,elL:90,elR:-90}),K(.7,{y:-130,hipL:50,hipR:-50,kneeL:-95,kneeR:95,shL:65,shR:-65}),K(1,{})]},
 hyper:{name:'究極の無駄奥義',d:6100,type:'ultimate',frames:[K(0,{}),K(.16,{y:45,sx:1.17,sy:.82,head:-11,shL:47,shR:-49}),K(.33,{y:-180,sx:1.06,sy:1.10,shL:-178,shR:178,head:14,fx:1}),K(.55,{y:-300,rot:360,shL:-160,shR:160,hipL:44,hipR:-44,fx:1}),K(.74,{y:-90,rot:700,head:-20,fx:1}),K(.88,{y:80,rot:730,sx:1.23,sy:.79,fx:1}),K(1,{rot:720})]},
};
const GROUPS={basic:['idle','look','walk','swagger','jump'],fight:['punch','barrage','uppercut','kick','roundhouse','dash','backflip','spin'],nose:['nosewhip','noseburst','noseweb','nosecannon'],gag:['dance','robot','moonwalk','bow','fall','selfdestruct','roar','flex','victory','panic','meditation'],ultimate:['hyper']};
const STYLE={classic:{name:'原画モード',pace:1,exaggeration:1,fx:1},impact:{name:'超激闘モード',pace:1.24,exaggeration:1.20,fx:1.55},chaos:{name:'カオス暴走モード',pace:1.1,exaggeration:1.28,fx:1.35},cinema:{name:'シネマ演出モード',pace:.80,exaggeration:1.08,fx:1.6}};
const SPEECH={nosewhip:'鼻毛神拳!!',noseburst:'鼻毛神拳・爆裂!!',noseweb:'何本あるんだ!?',nosecannon:'最終奥義ィィ!!',punch:'オラァ!!',barrage:'怒涛の連打!!',uppercut:'天まで届け!!',kick:'うおおお!!',roundhouse:'回転じゃー!!',backflip:'見たかッ!!',dash:'速すぎる!!',spin:'止まれない!!',dance:'なぜ踊る!?',robot:'カクカク!!',moonwalk:'なんで後退!?',bow:'誠に申し訳!!',fall:'なんでやねん!!',selfdestruct:'自分に直撃ー!!',roar:'ウオオオ!!',flex:'筋肉こそ正義',victory:'大勝利!!',panic:'誰か止めろ!!',hyper:'これは何の技だ!?!',meditation:'無の境地…'};
const coords={head:[250,211],shL:[151,290],elL:[65,522],wrL:[69,691],shR:[349,290],elR:[435,522],wrR:[431,691],hipL:[216,529],kneeL:[174,895],ankL:[147,1150],hipR:[284,529],kneeR:[326,895],ankR:[353,1150]};
function interpolate(frames,t,stepped){if(t<=0)return {...DEFAULT,...frames[0]};let i=0;while(i<frames.length-2&&frames[i+1].t<t)i++;const a=frames[i],b=frames[i+1];let u=clamp((t-a.t)/(b.t-a.t||1),0,1);u=stepped?(u>=.88?1:0):smooth(u);const o={...DEFAULT}; for(const key of Object.keys(o)){o[key]=mix((a[key]??DEFAULT[key]),(b[key]??DEFAULT[key]),u)}return o}
// interpolate retains previous keyframe settings through omission only for keys specified at each frame? Each new keyframe represents a new pose; unspecified keys reset to neutral deliberately.
class BoboboRig{
 constructor(opts={}){
  this.options=opts;
  this.el=typeof opts.target==='string'?document.querySelector(opts.target):opts.target;
  if(!this.el)throw new Error('BoboboAnimator: target element not found');
  this.el.classList.add('bb-stage');
  this.canvas=document.createElement('canvas');this.canvas.className='bb-canvas';this.canvas.setAttribute('aria-label','ボーボボの関節アニメーション');this.el.append(this.canvas);
  this.ctx=this.canvas.getContext('2d',{alpha:true});this.imgs={};this.manifest={...DIM};this.ready=false;this.running=true;this.autoplay=opts.autoplay!==false;this.style=STYLE[opts.style]?opts.style:'classic';this.speed=opts.speed||1;this.actionId='idle';this.started=performance.now();this.nextAt=0;this.previous=[];this.manual={};this.manualMode=false;this.sound=false;this.partsDebug=false;this.lastEffect=0;this.particles=[];this.actionCount=0;this.onAction=opts.onAction||(()=>{});this.onLoaded=opts.onLoaded||(()=>{});this.w=0;this.h=0;this.cameraZoom=1;
  this._resize=()=>this.resize();this.resize();window.addEventListener('resize',this._resize);
  this._visibility=()=>{this.started=performance.now();};document.addEventListener('visibilitychange',this._visibility);
  this.load(opts.assets||'./assets/');this.tick=this.tick.bind(this);this.raf=requestAnimationFrame(this.tick);
 }
 async load(path){
  const inline=global.__BOBOBO_ASSETS__;
  if(inline&&inline.sprites){
    this.manifest=inline.manifest||this.manifest;
    await Promise.all(Object.keys(DIM).map(key=>new Promise(resolve=>{const img=new Image();img.onload=()=>{this.imgs[key]=img;resolve()};img.onerror=()=>resolve();img.src=inline.sprites[key]||''})));
    this.ready=Object.keys(DIM).every(k=>!!this.imgs[k]);this.onLoaded({ready:this.ready,loaded:Object.keys(this.imgs).length,total:Object.keys(DIM).length});return;
  }
  let dir=path.endsWith('/')?path:path+'/';
  try { const res=await fetch(dir+'manifest.json');if(res.ok)this.manifest=await res.json();}catch(e){}
  const keys=Object.keys(DIM);
  let n=0;
  await Promise.all(keys.map(key=>new Promise(resolve=>{
   let img=new Image();img.onload=()=>{this.imgs[key]=img;n++;resolve()};img.onerror=()=>{n++;resolve()};img.src=dir+key+'.png';
  })));
  this.ready=keys.every(k=>!!this.imgs[k]);this.onLoaded({ready:this.ready,loaded:n,total:keys.length});
 }
 resize(){const r=this.el.getBoundingClientRect();this.w=Math.max(200,r.width||400);this.h=Math.max(220,r.height||600);const dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.dpr=dpr;}
 play(id){if(!ACTIONS[id])return false;this.actionId=id;this.started=performance.now();this.manualMode=false;this.actionCount++;this.previous.unshift(id);this.previous=this.previous.slice(0,5);this.onAction({id,name:ACTIONS[id].name,category:ACTIONS[id].type,count:this.actionCount});return true}
 start(){this.autoplay=true;this.manualMode=false;this.nextAt=0;return this}
 stop(){this.autoplay=false;return this}
 setStyle(s){if(STYLE[s])this.style=s;return this}
 setSpeed(speed){this.speed=clamp(Number(speed)||1,.25,2.5);return this}
 setSound(on){this.sound=!!on;return this}
 setJoint(name,deg){const k=JOINTKEY[name]||name;if(!Object.prototype.hasOwnProperty.call(DEFAULT,k))return false;this.autoplay=false;this.manualMode=true;this.manual[k]=clamp(Number(deg)||0,-180,180);return true}
 resetJoints(){this.manual={};this.manualMode=true;this.autoplay=false;return this}
 showRig(on){this.partsDebug=!!on;return this}
 getActions(){return Object.keys(ACTIONS).map(id=>({id,name:ACTIONS[id].name,duration:ACTIONS[id].d,category:ACTIONS[id].type}))}
 destroy(){cancelAnimationFrame(this.raf);window.removeEventListener('resize',this._resize);document.removeEventListener('visibilitychange',this._visibility);this.canvas.remove()}
 sample(t){if(this.manualMode)return {...DEFAULT,...this.manual};let action=ACTIONS[this.actionId];const d=action.d/(this.speed*STYLE[this.style].pace);const f=clamp((t-this.started)/d,0,1);if(f>=1&&this.autoplay){const roll=Math.random();let group=roll<.15?'basic':roll<.48?'gag':roll<.80?'fight':roll<.97?'nose':'ultimate';let pool=GROUPS[group].filter(id=>!this.previous.slice(0,3).includes(id));this.play(pool[Math.floor(Math.random()*pool.length)]||'dance');action=ACTIONS[this.actionId];return {...DEFAULT}}
 if(f>=1)return {...DEFAULT};let p=interpolate(action.frames,f,action.step);const ex=STYLE[this.style].exaggeration;for(const key of ['head','shL','elL','wrL','shR','elR','wrR','hipL','kneeL','ankL','hipR','kneeR','ankR'])p[key]*=ex;
 if(this.actionId==='idle'){p.head+=2*sin(t/660);p.shL+=1.5*sin(t/520);p.shR-=1.5*sin(t/520)}
 if(['walk','swagger','dance','panic','barrage'].includes(this.actionId)){p.y+=7*sin(f*PI*10);}
 if(this.actionId==='barrage'){p.shL+=22*sin(f*PI*22);p.shR+=22*sin(f*PI*22+PI);p.rot+=3*sin(f*PI*24)}
 if(this.actionId==='dance'){p.shL+=12*sin(f*PI*16);p.shR-=12*sin(f*PI*16);p.head+=10*sin(f*PI*8)}
 if(this.actionId==='spin'){p.rot=1080*smooth(f)}
 return p;
 }
 tick(now){this.raf=requestAnimationFrame(this.tick);if(document.hidden)return;const ctx=this.ctx;if(!ctx)return;ctx.clearRect(0,0,this.w,this.h);this.drawBackground(ctx,now);if(!this.ready){this.drawLoading(ctx);return;}const pose=this.sample(now);this.pose=pose;const z=this.manualMode?1:((['idle','look','walk','swagger'].includes(this.actionId))?1:(['hyper','backflip','spin','selfdestruct','roundhouse','dance','panic','noseburst','noseweb','nosecannon'].includes(this.actionId)?0.78:0.86));this.cameraZoom=mix(this.cameraZoom,z,0.10);this.drawShadow(ctx,pose);this.drawCharacter(ctx,pose,now);this.drawEffects(ctx,pose,now);this.drawParticles(ctx,now);this.drawOverlay(ctx,now);}
 drawLoading(ctx){ctx.fillStyle='#f5cb51';ctx.textAlign='center';ctx.font='bold 16px system-ui';ctx.fillText('ボーボボの素材を読み込み中…',this.w/2,this.h/2);}
 drawBackground(ctx,now){if(this.options.transparent)return;const w=this.w,h=this.h;let gr=ctx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#101e3a');gr.addColorStop(.52,'#192d4d');gr.addColorStop(1,'#11182d');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
 const pulse=.08+.05*sin(now/1000);let halo=ctx.createRadialGradient(w*.5,h*.45,15,w*.5,h*.45,w*.85);halo.addColorStop(0,`rgba(255,211,62,${.18+pulse})`);halo.addColorStop(.46,'rgba(31,113,190,.07)');halo.addColorStop(1,'transparent');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
 const ground=h*.88;ctx.save();ctx.strokeStyle='rgba(112,156,204,.12)';ctx.lineWidth=1;for(let i=-12;i<14;i++){ctx.beginPath();ctx.moveTo(w*.5,ground-4);ctx.lineTo(w*.5+i*82,h);ctx.stroke()}for(let i=0;i<6;i++){const yy=ground+((i+1)/6)**2*(h-ground);ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke()}ctx.restore();
 let topgrad=ctx.createLinearGradient(0,0,0,50);topgrad.addColorStop(0,'rgba(2,4,15,.45)');topgrad.addColorStop(1,'rgba(2,4,15,0)');ctx.fillStyle=topgrad;ctx.fillRect(0,0,w,50);
 }
 drawShadow(ctx,p){const s=this.scale()*this.cameraZoom;const ground=this.h*.88;ctx.save();ctx.translate(this.w/2+p.x*s,ground+3);ctx.scale(1+Math.max(0,-p.y/550),1);ctx.fillStyle=`rgba(0,0,0,${clamp(.30+p.y/1400,.07,.4)})`;ctx.beginPath();ctx.ellipse(0,0,125*s,20*s,0,0,2*PI);ctx.fill();ctx.restore()}
 // 鼻の画面位置（CSS px、キャンバス左上基準）
 nosePoint(){const ctx=this.ctx,p=this.pose||DEFAULT;if(!ctx)return null;ctx.save();this.setupModel(ctx,p);ctx.translate(250,517);ctx.rotate(p.torso*PI/180);ctx.translate(-250,-517);ctx.translate(...coords.head);ctx.rotate(p.head*PI/180);ctx.translate(-coords.head[0],-coords.head[1]);const m=ctx.getTransform();ctx.restore();const q=new DOMPoint(250,172).matrixTransform(m);const d=this.dpr||1;return {x:q.x/d,y:q.y/d}}
 scale(){return Math.min(this.w/630,this.h/1450,.60)}
 // Returns model -> screen transform for on-character attack effects.
 setupModel(ctx,p,shake=0){const s=this.scale()*this.cameraZoom;const ground=this.h*.88;let x=this.w/2+p.x*s,y=ground+p.y*s;ctx.translate(x+shake*sin(performance.now()*.071),y+shake*cos(performance.now()*.054));ctx.scale(s*p.sx,s*p.sy);ctx.translate(-250,-1250);ctx.translate(250,525);ctx.rotate(p.rot*PI/180);ctx.translate(-250,-525);}
 sprite(ctx,key){const a=this.manifest[key]||DIM[key],img=this.imgs[key];if(img&&a)ctx.drawImage(img,a[0],a[1],a[2],a[3]);}
 limb(ctx,points,keys,values){const [joint1,joint2,joint3]=points;const [part1,part2,part3]=keys;const [r1,r2,r3]=values;ctx.save();ctx.translate(joint1[0],joint1[1]);ctx.rotate(r1*PI/180);ctx.translate(-joint1[0],-joint1[1]);this.sprite(ctx,part1);
 ctx.save();ctx.translate(joint2[0],joint2[1]);ctx.rotate(r2*PI/180);ctx.translate(-joint2[0],-joint2[1]);this.sprite(ctx,part2);
 ctx.save();ctx.translate(joint3[0],joint3[1]);ctx.rotate(r3*PI/180);ctx.translate(-joint3[0],-joint3[1]);this.sprite(ctx,part3);ctx.restore();ctx.restore();ctx.restore();}
 drawCharacter(ctx,p,now){let shake=(p.fx>0.7 && this.style!=='classic')?1.8:0;ctx.save();this.setupModel(ctx,p,shake);
 // joints are hierarchical: hip->knee->ankle; shoulder->elbow->wrist. Each part uses pixels from the reference artwork.
 this.limb(ctx,[coords.hipL,coords.kneeL,coords.ankL],['upper_leg_l','lower_leg_l','foot_l'],[p.hipL,p.kneeL,p.ankL]);
 this.limb(ctx,[coords.hipR,coords.kneeR,coords.ankR],['upper_leg_r','lower_leg_r','foot_r'],[p.hipR,p.kneeR,p.ankR]);
 ctx.save();ctx.translate(250,517);ctx.rotate(p.torso*PI/180);ctx.translate(-250,-517);
 this.sprite(ctx,'body');
 this.limb(ctx,[coords.shL,coords.elL,coords.wrL],['upper_arm_l','lower_arm_l','hand_l'],[p.shL,p.elL,p.wrL]);
 this.limb(ctx,[coords.shR,coords.elR,coords.wrR],['upper_arm_r','lower_arm_r','hand_r'],[p.shR,p.elR,p.wrR]);
 ctx.save();ctx.translate(...coords.head);ctx.rotate(p.head*PI/180);ctx.translate(-coords.head[0],-coords.head[1]);this.sprite(ctx,'head');ctx.restore();
 if(this.partsDebug)this.drawSkeleton(ctx,p);
 ctx.restore();ctx.restore();}
 drawSkeleton(ctx,p){ctx.save();ctx.fillStyle='#fc3d78';ctx.strokeStyle='rgba(91,249,244,.8)';ctx.lineWidth=3;let pairs=[[coords.shL,coords.elL],[coords.elL,coords.wrL],[coords.shR,coords.elR],[coords.elR,coords.wrR],[coords.hipL,coords.kneeL],[coords.kneeL,coords.ankL],[coords.hipR,coords.kneeR],[coords.kneeR,coords.ankR]];for(const [a,b] of pairs){ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()}for(const a of Object.values(coords)){ctx.beginPath();ctx.arc(a[0],a[1],7,0,2*PI);ctx.fill()}ctx.restore()}
 drawEffects(ctx,p,now){const a=this.actionId;if(this.manualMode)return;const dur=ACTIONS[a].d/(this.speed*STYLE[this.style].pace);const f=clamp((now-this.started)/dur,0,1);const eff=STYLE[this.style].fx;if(f>=1)return;
 if(ACTIONS[a].type==='nose'&&f>.20&&f<.85)this.drawNose(ctx,p,now,f,eff);
 if(['punch','barrage','uppercut','kick','roundhouse','hyper','selfdestruct','dash'].includes(a)&&f>.22&&f<.83)this.drawSpeed(ctx,p,now,eff);
 if(['hyper','nosecannon','noseburst','selfdestruct'].includes(a)&&f>.36&&f<.76)this.drawShock(ctx,now,f,eff);
 if(f>.28&&f<.69&&['punch','kick','uppercut','nosewhip','noseburst','noseweb','barrage','hyper'].includes(a)){this.spawn(now,2.5*eff)}
 }
 drawNose(ctx,p,now,f,eff){ctx.save();this.setupModel(ctx,p);ctx.translate(...coords.head);ctx.rotate(p.head*PI/180);ctx.translate(-coords.head[0],-coords.head[1]);let prog=clamp((f-.20)/.19,0,1);let release=clamp((.90-f)/.16,0,1);const ext=smooth(prog)*smooth(release);let count=this.actionId==='nosewhip'?3:this.actionId==='noseburst'?11:this.actionId==='noseweb'?17:22;const variation=this.actionId==='noseweb'?1.35:1;
 for(let i=0;i<count;i++){let direction=(i/count)*PI*2 + sin(now*.0011+i)*.18; if(this.actionId==='nosewhip')direction=-.56+i*.52; if(this.actionId==='nosecannon')direction=-.54+(i-count/2)*.035;let length=(210+(i%4)*51+(this.actionId==='nosecannon'?300:0))*ext*eff;let sx=250+(i%2?8:-7),sy=169;
 const vx=cos(direction)*length,vy=sin(direction)*length,tw=sin(now*.012+i*1.4)*50*ext;
 ctx.save();ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+vx*.19-tw,sy+vy*.18+tw,sx+vx*.69+tw,sy+vy*.71-tw,sx+vx,sy+vy);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#ffe74c';ctx.shadowBlur=9*eff;ctx.strokeStyle='rgba(224,108,13,.92)';ctx.lineWidth=(10+i%3)*ext;ctx.stroke();ctx.shadowBlur=3;ctx.strokeStyle='#ffe731';ctx.lineWidth=(6+i%2)*ext;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fff7a9';ctx.lineWidth=(2.1)*ext;ctx.stroke();ctx.restore();
 if(i%4===0){ctx.fillStyle='rgba(255,243,92,.8)';ctx.beginPath();ctx.arc(sx+vx,sy+vy,3.6*ext,0,2*PI);ctx.fill()}}
 ctx.restore();ctx.restore();}
 drawSpeed(ctx,p,now,eff){ctx.save();let cx=this.w/2,cy=this.h*.42;ctx.translate(cx,cy);for(let i=0;i<13;i++){let a=(i/13)*2*PI+now*.0003;let r=this.w*(.15+.07*(i%3));let x=cos(a)*r,y=sin(a)*r;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+cos(a)*(42+16*(i%5))*eff,y+sin(a)*(42+16*(i%5))*eff);ctx.lineWidth=i%3===0?3:1.5;ctx.strokeStyle=i%3===0?'rgba(255,215,98,.68)':'rgba(172,213,255,.32)';ctx.stroke()}ctx.restore()}
 drawShock(ctx,now,f,eff){ctx.save();let t=(f-.36)/.4,r=(20+t*this.w*.60)*eff;ctx.translate(this.w*.50,this.h*.41);ctx.beginPath();ctx.arc(0,0,r,0,2*PI);ctx.strokeStyle=`rgba(255,219,95,${(1-t)*.60})`;ctx.lineWidth=9*(1-t)+1;ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.74,0,2*PI);ctx.strokeStyle=`rgba(255,255,255,${(1-t)*.40})`;ctx.lineWidth=4;ctx.stroke();ctx.restore()}
 spawn(now,num){if(now-this.lastEffect<70)return;this.lastEffect=now;for(let i=0;i<num;i++){this.particles.push({x:this.w*.5+rnd(-48,48),y:this.h*.43+rnd(-66,66),vx:rnd(-4,4),vy:rnd(-8,-1),life:rnd(16,37),max:37,r:rnd(2,6),c:['#fff19b','#36b6ff','#ff8e48','#fff'][Math.floor(Math.random()*4)]})}if(this.particles.length>115)this.particles.splice(0,30)}
 drawParticles(ctx,now){for(let i=this.particles.length-1;i>=0;i--){let p=this.particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.21;p.life--;if(p.life<=0){this.particles.splice(i,1);continue}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(p.life/p.max),0,2*PI);ctx.fill()}ctx.globalAlpha=1}
 drawOverlay(ctx,now){if(this.options.noLabel)return;const a=this.actionId;let dur=ACTIONS[a].d/(this.speed*STYLE[this.style].pace),f=clamp((now-this.started)/dur,0,1);if(this.manualMode||f>.82||f<.14||!SPEECH[a])return;const label=SPEECH[a];ctx.save();ctx.font=`900 ${Math.min(22,this.w*.054)}px system-ui,sans-serif`;const tw=ctx.measureText(label).width,pad=21;let x=(this.w-tw)/2-pad,y=this.h*.095-16;ctx.fillStyle='rgba(7,16,31,.88)';ctx.strokeStyle='#ffe36a';ctx.lineWidth=2;this.roundRect(ctx,x,y,tw+pad*2,46,12);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(label,this.w/2,y+30);ctx.restore()}
 roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
}
const API={create:(opts)=>new BoboboRig(opts),actions:Object.keys(ACTIONS).map(id=>({id,name:ACTIONS[id].name,type:ACTIONS[id].type,duration:ACTIONS[id].d})),joints:JOINTS,styles:STYLE};
global.BoboboAnimator=API;
})(window);
