/* 超次元バレー（ユーザー提供モジュール）: ng-motion + volleyball-story。VolleyStory() で初回起動 */
/* Nobita & Gian motion engine — standalone SVG bone-animation runtime, no dependencies. */
(function(global){'use strict';
const TWO=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const pulse=(t,p=1)=>Math.sin(t*Math.PI*p);
const htmlEscape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const KEY=['head','torso','ls','le','lw','rs','re','rw','lh','lk','la','rh','rk','ra'];
const LABEL={head:'頭・首',torso:'胴体',ls:'左肩',le:'左肘',lw:'左手首',rs:'右肩',re:'右肘',rw:'右手首',lh:'左股関節',lk:'左膝',la:'左足首',rh:'右股関節',rk:'右膝',ra:'右足首'};
const CHAR={n:{name:'のび太',scale:1.08,ground:540},g:{name:'ジャイアン',scale:1.34,ground:540}};
const MOTIONS=[
['idle','待機','base',2.6],['look','キョロキョロ','base',2.4],['walk','歩く','base',3.2],['run','走る','base',3.1],['jump','ジャンプ','base',2.1],['tiptoe','忍び足','base',3.3],['wave','手を振る','base',2.8],['bow','おじぎ','base',2.8],
['dance','変なダンス','fun',4.6],['spin','高速回転','fun',2.8],['flip','バク転','fun',3.4],['stumble','つまずく','fun',2.9],['fall','大転倒','fun',3.2],['sneeze','くしゃみ','fun',2.1],['sleep','居眠り','fun',3.4],['apology','土下座','fun',3.4],['victory','ドヤ顔','fun',2.8],
['punch','連続パンチ','emote',3.3],['kick','回し蹴り','emote',3],['stomp','地団駄','emote',3.1],['cry','大泣き','emote',3.4],['angry','激怒','emote',3.5],['shock','びっくり','emote',2.5],['laugh','大笑い','emote',3.2],['sing','熱唱','emote',4.4],['clap','拍手','emote',3.1],
['chase','追いかけっこ','duo',6.6],['scold','ジャイアンが説教','duo',5.1],['singpanic','歌で大混乱','duo',5.6],['highfive','ハイタッチ','duo',4.0],['duodance','2人で謎ダンス','duo',5.3],['duotumble','2人で転倒','duo',4.8],['surprise','背後から驚かす','duo',4.7],['tug','引っ張り合い','duo',4.8]
].map(([id,label,category,duration])=>({id,label,category,duration}));
const BY_ID=Object.fromEntries(MOTIONS.map(m=>[m.id,m]));
const CATEGORIES=[['all','すべて'],['base','基本'],['fun','ギャグ'],['emote','表情・技'],['duo','2人イベント']];
const BG_LIST=[['neighborhood','住宅街'],['park','公園'],['room','教室'],['sunset','夕暮れ']];
function noseHead(){return `<g data-p="head" transform="translate(0 -132)">
<path d="M-37,-11 Q-54,-29 -45,-53 Q-30,-80 6,-78 Q41,-79 50,-48 L47,-12" fill="#231c1d" stroke="#171c28" stroke-width="3"/>
<ellipse cx="-43" cy="2" rx="9" ry="14" fill="#f7c594" stroke="#243047" stroke-width="3"/><ellipse cx="42" cy="2" rx="9" ry="14" fill="#f7c594" stroke="#243047" stroke-width="3"/>
<path d="M-45,-33 Q-42,-57 -15,-59 L34,-56 Q48,-37 44,11 Q35,48 -1,50 Q-38,43 -46,13 Z" fill="url(#skin-n)" stroke="#202835" stroke-width="3.4"/>
<path d="M-44,-31 Q-50,-48 -41,-59 Q-23,-78 9,-77 Q38,-76 47,-51 L46,-30 Q23,-40 3,-42 L-41,-39 Z" fill="#241d20" stroke="#191d29" stroke-width="3"/>
<path d="M-32,-43 Q-24,-50 -19,-42 M14,-43 Q23,-50 32,-43" stroke="#191d28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<g data-eyes="open"><ellipse cx="-19" cy="-3" rx="22" ry="26" fill="#fff" stroke="#202835" stroke-width="3.3"/><ellipse cx="21" cy="-3" rx="22" ry="26" fill="#fff" stroke="#202835" stroke-width="3.3"/><g data-pupils><ellipse cx="-13" cy="4" rx="5" ry="7" fill="#1b1e2b"/><ellipse cx="15" cy="4" rx="5" ry="7" fill="#1b1e2b"/><circle cx="-15" cy="1" r="1.6" fill="#fff"/><circle cx="13" cy="1" r="1.6" fill="#fff"/></g></g>
<g data-eyes="closed" style="display:none"><path d="M-38,-3 Q-20,10 -2,-3 M4,-3 Q24,10 42,-3" fill="none" stroke="#242333" stroke-width="4" stroke-linecap="round"/></g>
<path d="M1,9 Q6,13 1,15" stroke="#b98963" stroke-width="2" fill="none"/>
<g data-mouth="neutral"><path d="M-11,26 Q4,32 18,22" fill="none" stroke="#663c35" stroke-width="3" stroke-linecap="round"/></g>
<g data-mouth="smile" style="display:none"><path d="M-17,18 Q1,48 23,18 Q4,25 -17,18Z" fill="#8e2d45" stroke="#512e35" stroke-width="2"/><path d="M-3,32 Q8,24 17,31" fill="none" stroke="#f88a8d" stroke-width="3"/></g>
<g data-mouth="shout" style="display:none"><ellipse cx="4" cy="27" rx="15" ry="19" fill="#57263a" stroke="#4f3030" stroke-width="2.5"/><ellipse cx="5" cy="36" rx="9" ry="6" fill="#fd8691"/></g>
<g data-mouth="cry" style="display:none"><path d="M-12,37 Q4,7 19,37" fill="none" stroke="#663c35" stroke-width="4" stroke-linecap="round"/><path d="M-37,17 Q-47,34 -40,41 M38,17 Q51,32 42,40" stroke="#44b5ef" stroke-width="5" stroke-linecap="round" fill="none"/></g>
<g data-mouth="flat" style="display:none"><path d="M-15,27 L19,27" stroke="#6f4536" stroke-width="3.5" stroke-linecap="round"/></g>
<g data-brows="angry" style="display:none"><path d="M-36,-30 L-6,-17 M11,-17 L40,-30" stroke="#292029" stroke-width="5" stroke-linecap="round"/></g>
<ellipse cx="-27" cy="-56" rx="17" ry="4" fill="#fff" opacity=".12"/></g>`}
function gianHead(){return `<g data-p="head" transform="translate(0 -133)">
<ellipse cx="-50" cy="1" rx="11" ry="17" fill="#efae79" stroke="#202536" stroke-width="3"/><ellipse cx="50" cy="1" rx="11" ry="17" fill="#efae79" stroke="#202536" stroke-width="3"/>
<path d="M-50,-38 Q-48,-69 -21,-72 Q0,-79 27,-70 Q48,-60 51,-31 L51,12 Q45,53 2,57 Q-41,52 -49,10 Z" fill="url(#skin-g)" stroke="#1e2732" stroke-width="3.5"/>
<path d="M-50,-29 Q-59,-66 -24,-76 L-15,-87 L-2,-75 L12,-89 L19,-73 L39,-77 Q56,-66 53,-29 L40,-47 L25,-38 L17,-56 L6,-43 L-3,-57 L-14,-38 L-27,-51 L-42,-33Z" fill="#27272a" stroke="#1e2330" stroke-width="3" stroke-linejoin="round"/>
<g data-eyes="open"><ellipse cx="-19" cy="-7" rx="8" ry="14" fill="#fff" stroke="#242833" stroke-width="2.3"/><ellipse cx="20" cy="-7" rx="8" ry="14" fill="#fff" stroke="#242833" stroke-width="2.3"/><g data-pupils><ellipse cx="-17" cy="-4" rx="3.1" ry="6.7" fill="#212027"/><ellipse cx="21" cy="-4" rx="3.1" ry="6.7" fill="#212027"/></g></g>
<g data-eyes="closed" style="display:none"><path d="M-29,-5 Q-19,4 -11,-5 M12,-5 Q21,4 30,-5" stroke="#29242a" stroke-width="3.7" fill="none"/></g>
<ellipse cx="1" cy="12" rx="16" ry="11" fill="#e6a171" stroke="#754b3c" stroke-width="2.4"/><path d="M-6,22 Q0,26 7,22" fill="none" stroke="#9b6345" stroke-width="2"/>
<g data-mouth="neutral"><path d="M-25,32 Q-1,46 25,32" fill="none" stroke="#713f31" stroke-width="3.3" stroke-linecap="round"/></g>
<g data-mouth="smile" style="display:none"><path d="M-29,27 Q-4,61 30,26 Q0,31 -29,27Z" fill="#822b43" stroke="#482c32" stroke-width="2"/><path d="M-14,44 Q5,38 18,47" stroke="#f8908a" stroke-width="4" fill="none"/></g>
<g data-mouth="shout" style="display:none"><path d="M-30,23 Q0,18 32,24 Q33,55 2,65 Q-26,59 -30,23Z" fill="#5c293a" stroke="#4c262a" stroke-width="3"/><path d="M-22,27 Q0,36 25,27" stroke="#fff8e9" stroke-width="6" fill="none"/><ellipse cx="0" cy="54" rx="16" ry="7" fill="#f77c85"/></g>
<g data-mouth="cry" style="display:none"><ellipse cx="0" cy="43" rx="14" ry="10" fill="#653147" stroke="#4c262a" stroke-width="2"/><path d="M-38,10 L-45,30 M39,10 L46,30" stroke="#59c5f2" stroke-width="6"/></g>
<g data-mouth="flat" style="display:none"><path d="M-20,38 L23,38" stroke="#713f31" stroke-width="4" stroke-linecap="round"/></g>
<g data-brows="angry" style="display:none"><path d="M-32,-26 L-7,-14 M11,-14 L36,-26" stroke="#26232b" stroke-width="6" stroke-linecap="round"/></g>
</g>`}
function armMarkup(c,side){const skin=c==='n'?'url(#skin-n)':'url(#skin-g)',shirt=c==='n'?'url(#shirt-n)':'url(#shirt-g)',sw=c==='n'?33:45;
const attr=side==='l'?['ls','le','lw'] : ['rs','re','rw'];
return `<g data-p="${attr[0]}" transform="translate(${side==='l'?-sw:sw} -79)">
<path d="M-14,-4 Q-28,11 -19,42 Q-11,59 10,52 Q24,38 18,7 Q12,-7 -14,-4Z" fill="${shirt}" stroke="#202839" stroke-width="3.5"/><path d="M-18,36 Q-5,40 16,36" stroke="#d18c35" stroke-width="2" opacity=".75" fill="none"/>
<g data-p="${attr[1]}" transform="translate(0 48)"><path d="M-10,-2 Q-19,17 -13,40 Q-9,51 4,52 Q17,47 13,35 L11,2Z" fill="${skin}" stroke="#232936" stroke-width="3.3"/>
<g data-p="${attr[2]}" transform="translate(0 45)"><path d="M-13,-5 Q-24,3 -19,22 Q-12,35 2,35 Q17,33 19,19 Q22,6 10,-4 Z" fill="${skin}" stroke="#232936" stroke-width="3"/><path d="M-15,9 Q-5,6 11,11" stroke="#b97d56" stroke-width="2" fill="none"/></g></g></g>`}
function legMarkup(c,side){const isN=c==='n',pants=isN?'url(#shorts-n)':'url(#pants-g)',skin=isN?'url(#skin-n)':'url(#pants-g)',boot=isN?'url(#shoe-n)':'url(#shoe-g)';const attr=side==='l'?['lh','lk','la']:['rh','rk','ra'];return `<g data-p="${attr[0]}" transform="translate(${side==='l'?-21:21} -112)">
<path d="M-16,-6 Q-21,23 -13,59 Q0,67 16,57 L17,0Z" fill="${pants}" stroke="#22283b" stroke-width="3.2"/>
<g data-p="${attr[1]}" transform="translate(0 55)"><path d="M-12,-5 Q-14,24 -11,49 Q-6,59 10,54 Q15,30 11,-4Z" fill="${skin}" stroke="#25273a" stroke-width="3.2"/>
${isN?'<path d="M-13,37 Q0,40 12,36 L11,51 Q0,55 -11,51Z" fill="#f8fcff" stroke="#29354b" stroke-width="2"/>':''}
<g data-p="${attr[2]}" transform="translate(0 51)"><path d="M-14,-7 Q-8,-14 7,-9 L18,-2 Q29,1 30,10 Q18,18 -13,14 Q-20,9 -14,-7Z" fill="${boot}" stroke="#222b3b" stroke-width="3"/><path d="M-8,3 Q7,5 20,3" stroke="#f7f9fb" stroke-width="3.5" fill="none" stroke-linecap="round"/></g></g></g>`}
function bodyMarkup(c){const isN=c==='n',shirt=isN?'url(#shirt-n)':'url(#shirt-g)';return `<g data-p="torso" transform="translate(0 -112)">
<path d="M-19,-11 Q-5,-4 19,-11 L22,8 L-21,8Z" fill="${isN?'#f8b535':'#16324c'}" stroke="#2a2e3f" stroke-width="3"/>
<path d="M-39,-88 Q-17,-102 0,-91 Q19,-102 41,-88 Q49,-66 41,-29 L35,1 Q0,10 -35,1 L-42,-29 Q-48,-64 -39,-88Z" fill="${shirt}" stroke="#202a3b" stroke-width="3.7"/>
${isN?'<path d="M-17,-90 L0,-65 L-2,-83Z" fill="#fff" stroke="#202d40" stroke-width="2.7"/><path d="M17,-90 L0,-65 L2,-83Z" fill="#fff" stroke="#202d40" stroke-width="2.7"/><path d="M0,-65 L0,-8" stroke="#ce8e24" stroke-width="2"/>':'<path d="M-43,-53 Q-4,-50 43,-53 L40,-29 Q0,-31 -40,-29Z" fill="#f4d376" stroke="#b66d28" stroke-width="1.5"/><path d="M-18,-88 Q0,-81 18,-88" fill="none" stroke="#de782e" stroke-width="3"/>'}
<path d="M-33,-4 Q0,4 33,-4" stroke="#fff" opacity=".18" stroke-width="4" fill="none"/>
${armMarkup(c,'l')}${armMarkup(c,'r')}
${isN?noseHead():gianHead()}</g>`}
function actorMarkup(c){return `<g id="ng-actor-${c}" class="ng-character" style="filter:url(#actor-shadow)">${legMarkup(c,'l')}${legMarkup(c,'r')}${bodyMarkup(c)}</g>`}
function bgSvg(){const house=(x,y,s,col,roof)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0,-110 L90,-172 L185,-110Z" fill="${roof}" stroke="#728198" stroke-width="3"/><rect x="12" y="-112" width="160" height="130" rx="6" fill="${col}" stroke="#7e8d99" stroke-width="2"/><rect x="25" y="-85" width="48" height="49" rx="3" fill="#9ee3ff" stroke="#fff" stroke-width="7"/><path d="M49,-88 L49,-36 M22,-61 L76,-61" stroke="#8cabc1" stroke-width="3"/><rect x="106" y="-72" width="45" height="90" rx="4" fill="#c98b64"/><circle cx="141" cy="-27" r="3" fill="#fff6bf"/></g>`;
const tree=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-122" width="17" height="128" rx="8" fill="#9e683a"/><circle cx="0" cy="-130" r="60" fill="#50996b"/><circle cx="-36" cy="-149" r="40" fill="#63b77d"/><circle cx="36" cy="-162" r="43" fill="#60af76"/><circle cx="6" cy="-183" r="38" fill="#78bf86"/><path d="M-37,-153 Q-9,-187 13,-164" stroke="#adf1a2" stroke-width="9" opacity=".25" fill="none"/></g>`;
return `<defs><linearGradient id="skin-n" x2="1" y2="1"><stop stop-color="#ffe7b8"/><stop offset=".7" stop-color="#f4c796"/><stop offset="1" stop-color="#d9a178"/></linearGradient><linearGradient id="skin-g" x2="1" y2="1"><stop stop-color="#ffce96"/><stop offset=".7" stop-color="#efae79"/><stop offset="1" stop-color="#cd8353"/></linearGradient>
<linearGradient id="shirt-n" x2=".85" y2="1"><stop stop-color="#ffdd55"/><stop offset=".7" stop-color="#ffc13a"/><stop offset="1" stop-color="#e9a523"/></linearGradient><linearGradient id="shirt-g" x2=".9" y2="1"><stop stop-color="#ffb057"/><stop offset=".7" stop-color="#f38b38"/><stop offset="1" stop-color="#d96c27"/></linearGradient><linearGradient id="shorts-n" x2="1" y2=".5"><stop stop-color="#22599b"/><stop offset="1" stop-color="#154078"/></linearGradient><linearGradient id="pants-g" x2="1" y2="1"><stop stop-color="#316188"/><stop offset="1" stop-color="#152f50"/></linearGradient><linearGradient id="shoe-n" x2="1" y2=".8"><stop stop-color="#76d9ef"/><stop offset="1" stop-color="#2673ba"/></linearGradient><linearGradient id="shoe-g" x2="1" y2=".7"><stop stop-color="#5b91a1"/><stop offset="1" stop-color="#275772"/></linearGradient>
<linearGradient id="sky-day" x2="0" y2="1"><stop stop-color="#86c6fb"/><stop offset="1" stop-color="#ebfbff"/></linearGradient><linearGradient id="sky-sunset" x2="0" y2="1"><stop stop-color="#766bc4"/><stop offset=".6" stop-color="#fcb48a"/><stop offset="1" stop-color="#ffe4a0"/></linearGradient>
<filter id="actor-shadow" x="-45%" y="-30%" width="200%" height="180%"><feDropShadow dx="1" dy="4" stdDeviation="2.5" flood-color="#2c4266" flood-opacity=".27"/></filter>
</defs>
<g id="ng-bg-neighborhood"><rect width="1000" height="610" fill="url(#sky-day)"/><circle cx="794" cy="113" r="58" fill="#fff5b7" opacity=".9"/><g fill="#fff" opacity=".9"><ellipse cx="127" cy="108" rx="88" ry="25"/><ellipse cx="167" cy="93" rx="48" ry="34"/><ellipse cx="524" cy="99" rx="84" ry="23"/><ellipse cx="493" cy="87" rx="46" ry="32"/></g><path d="M0,390 Q100,335 230,370 T550,351 T1000,381 L1000,550 L0,550Z" fill="#a2d9bf"/>${house(10,352,1.12,'#f5e7d7','#91abc9')}${house(420,368,.9,'#fff1d6','#c3a2ab')}${house(760,371,1.12,'#dae8fc','#8eacd6')}${tree(335,457,1.08)}${tree(693,477,.97)}<path d="M0,518 Q500,512 1000,520 L1000,610 L0,610Z" fill="#e7d6ac"/><path d="M0,548 H1000" stroke="#fff8d6" stroke-width="6" opacity=".6"/><path d="M0,563 H1000" stroke="#c3a983" stroke-width="2"/></g>
<g id="ng-bg-park" style="display:none"><rect width="1000" height="610" fill="url(#sky-day)"/><circle cx="823" cy="122" r="50" fill="#fff5c8"/><path d="M0,376 Q190,296 460,385 T1000,339 L1000,610 L0,610Z" fill="#96d3a2"/><path d="M0,434 Q260,392 500,448 T1000,418 L1000,610 L0,610Z" fill="#60b578"/>${tree(111,474,1.48)}${tree(879,474,1.39)}<path d="M0,540 H1000 V610 H0Z" fill="#d2b88b"/><path d="M0,531 Q470,535 1000,531" stroke="#b5a177" stroke-width="8"/><g stroke="#f9eac0" stroke-width="7" stroke-linecap="round"><path d="M708,514 V420 L800,420 V514"/><path d="M707,445 L745,501 M800,445 L762,501"/></g></g>
<g id="ng-bg-room" style="display:none"><rect width="1000" height="610" fill="#f4e5c6"/><rect x="0" y="0" width="1000" height="407" fill="#f7e9cf"/><path d="M0,389 H1000" stroke="#c9ab8b" stroke-width="17"/><rect x="74" y="56" width="380" height="253" rx="8" fill="#fdf7e7" stroke="#c9aa7e" stroke-width="15"/><rect x="93" y="73" width="342" height="220" fill="#a8dcf7"/><path d="M263,74 V293 M93,182 H435" stroke="#fdfbf4" stroke-width="12"/>${tree(180,315,.52)}<rect x="570" y="82" width="352" height="224" rx="8" fill="#437b67" stroke="#c9ab7a" stroke-width="16"/><path d="M602,132 L752,132" stroke="#e3f3d7" stroke-width="5" stroke-linecap="round" opacity=".6"/><path d="M0,398 H1000 V610 H0Z" fill="#cfaa82"/><path d="M0,534 H1000" stroke="#af8a6d" stroke-width="4"/></g>
<g id="ng-bg-sunset" style="display:none"><rect width="1000" height="610" fill="url(#sky-sunset)"/><circle cx="755" cy="235" r="107" fill="#fff0a3" opacity=".75"/><path d="M0,377 Q170,350 360,379 T750,365 T1000,370 L1000,610 L0,610Z" fill="#976c85"/>${house(20,362,1.16,'#e7b0a0','#94587b')}${house(421,382,.91,'#e1b298','#9a6f9b')}${house(770,368,1.08,'#d4acb5','#70578d')}${tree(347,484,1.03)}${tree(684,484,.93)}<path d="M0,522 H1000 V610 H0Z" fill="#ba8885"/><path d="M0,545 H1000" stroke="#f0d2a6" stroke-width="6"/></g>`;
}
function stageSvg(){return `<svg class="ng-stage-svg" viewBox="0 0 1000 610" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-label="のび太とジャイアンが動くアニメーション"><g id="ng-backgrounds">${bgSvg()}</g><ellipse id="ng-shadow-n" cx="324" cy="542" rx="75" ry="13" fill="#324757" opacity=".18"/><ellipse id="ng-shadow-g" cx="702" cy="542" rx="86" ry="15" fill="#324757" opacity=".2"/>${actorMarkup('g')}${actorMarkup('n')}<g id="ng-effects" pointer-events="none"></g><g id="ng-caption" style="display:none"><rect x="310" y="22" width="380" height="67" rx="19" fill="#fffdf8" stroke="#21334d" stroke-width="5"/><text x="500" y="65" font-size="30" font-weight="900" fill="#26364e" text-anchor="middle"></text></g></svg>`}
function defaultPose(c){return {x:c==='n'?330:707,y:0,scale:CHAR[c].scale,flip:c==='n'?1:-1,rot:0,torso:0,head:0,ls:8,le:-5,lw:0,rs:-8,re:5,rw:0,lh:0,lk:0,la:0,rh:0,rk:0,ra:0,face:'neutral',eyes:'open'};}
function renderPose(actor,pose,shadow){const tf=(name,x,y,rot)=>{const el=actor.querySelector(`[data-p="${name}"]`);if(el)el.setAttribute('transform',`translate(${x} ${y}) rotate(${rot||0})`)};
const mobile=window.innerWidth<=760;const renderX=mobile?500+(pose.x-500)*.64:pose.x;const renderScale=mobile?pose.scale*.81:pose.scale;
actor.setAttribute('transform',`translate(${renderX.toFixed(2)} ${(CHAR[actor.id.at(-1)].ground+pose.y).toFixed(2)}) scale(${(renderScale*pose.flip).toFixed(4)} ${renderScale.toFixed(4)}) rotate(${pose.rot.toFixed(2)} 0 -108)`);
tf('torso',0,-112,pose.torso);tf('head',0,-132,pose.head);for(const [k,x,y] of [['ls',- (actor.id.endsWith('n')?33:45),-79],['rs',actor.id.endsWith('n')?33:45,-79],['le',0,48],['re',0,48],['lw',0,45],['rw',0,45],['lh',-21,-112],['rh',21,-112],['lk',0,55],['rk',0,55],['la',0,51],['ra',0,51]])tf(k,x,y,pose[k]);
actor.querySelectorAll('[data-mouth]').forEach(m=>m.style.display=m.getAttribute('data-mouth')===pose.face?'':'none');actor.querySelectorAll('[data-eyes]').forEach(m=>m.style.display=m.getAttribute('data-eyes')===pose.eyes?'':'none');actor.querySelectorAll('[data-brows]').forEach(m=>m.style.display=(pose.face==='shout'||pose.face==='angry')?'':'none');
shadow.setAttribute('cx',renderX);shadow.setAttribute('rx',Math.max(25,74*(mobile?.81:1)*Math.abs(Math.cos(pose.rot*Math.PI/180))));shadow.setAttribute('opacity',clamp(.20+pose.y/700,.04,.22));}
function createNGActors(options={}){
const host=typeof options.container==='string'?document.querySelector(options.container):options.container;
if(!host)throw Error('NGActors: container element not found');
host.classList.add('ng-app');if(options.stageOnly)host.classList.add('ng-stage-only');
host.innerHTML=`<div class="ng-header"><div><h1 class="ng-title">のび太 <strong>×</strong> ジャイアン</h1><div class="ng-subtitle">2Dボーンアニメーション・モーションスタジオ</div></div><span class="ng-pill">SVG / 関節14か所 × 2人</span></div>
<div class="ng-stage-frame">${stageSvg()}<div class="ng-stage-status"><span class="ng-chip bright">LIVE</span><span class="ng-chip" data-status>読み込み完了</span></div><div class="ng-now" data-now>待機中</div></div>
<div class="ng-controls"><section class="ng-panel"><div class="ng-flex"><div class="ng-label">アニメーション</div><div class="ng-meter" data-count></div></div><div class="ng-tabbar" data-tabs></div><div class="ng-motion-list" data-motions></div></section>
<section class="ng-panel"><div class="ng-label">キャラクター・再生操作</div><div class="ng-segment" data-select><button class="ng-btn" data-who="both">2人で</button><button class="ng-btn" data-who="n">のび太</button><button class="ng-btn" data-who="g">ジャイアン</button></div><div class="ng-toggles"><button class="ng-btn ok" data-play="random">ランダム再生</button><button class="ng-btn" data-play="stop">一時停止</button><button class="ng-btn" data-sound>音 OFF</button></div><div class="ng-label" style="margin-top:18px">再生スピード <span data-speed-num>1.0×</span></div><div class="ng-slider-row"><span style="font-size:11px">0.5×</span><input data-speed type="range" min="0.5" max="2" step="0.1" value="1" aria-label="再生速度"><span style="font-size:11px">2.0×</span></div><div class="ng-label" style="margin-top:15px">背景</div><div class="ng-segment" data-backgrounds></div></section></div>
<div class="ng-subgrid"><section class="ng-panel"><div class="ng-flex"><div class="ng-label">関節ごとの手動操作</div><div class="ng-segment"><button class="ng-btn" data-edit="n">のび太</button><button class="ng-btn" data-edit="g">ジャイアン</button></div></div><div class="ng-joint-grid" data-joints></div><div class="ng-toggles"><button class="ng-btn alt" data-reset>ポーズを初期化</button><button class="ng-btn" data-save>ポーズ値をコピー</button></div></section>
<section class="ng-panel"><div class="ng-label">HTMLから呼び出すAPI</div><div class="ng-code">NGActors.play('chase') <span class="ng-decor">// 追いかけっこ</span></div><div class="ng-code" style="margin-top:7px">NGActors.play('dance','n')</div><div class="ng-code" style="margin-top:7px">NGActors.setJoint('g','rs',-75)</div><p style="font-size:12px;line-height:1.8;color:#c1d2e9;margin:11px 0 0">好きな動作をボタンで選べます。<b>2人イベント</b>はどちらの選択中でも両方が動きます。関節スライダーを動かすと再生を止めてポーズを直接調整できます。</p><div class="ng-label" style="margin-top:13px">動作状態</div><div class="ng-code" data-debug>待機中</div></section></div>
<p class="ng-footnote">個人鑑賞用の非公式ファン制作アニメーションです。既存作品の公式素材や公式音声は収録していません。SVGによる2D関節制御で、3Dモデルではありません。音はiPhoneの操作後に有効になります。</p>`;
const $=s=>host.querySelector(s);const actors={n:$('#ng-actor-n'),g:$('#ng-actor-g')};const shadows={n:$('#ng-shadow-n'),g:$('#ng-shadow-g')};
const smoothed={n:defaultPose('n'),g:defaultPose('g')};
const s={filter:'all',who:'both',edit:'n',speed:1,auto:!!options.autoplay,sound:false,background:'neighborhood',action:null,start:performance.now(),last:performance.now(),pauses:false,manual:null,steps:0,next:0,motionHistory:[],seed:4,forced:null};
const status=$('[data-status]'),nowLabel=$('[data-now]');
const random=()=>{s.seed=(s.seed*16807)%2147483647;return (s.seed-1)/2147483646};
const tabbar=$('[data-tabs]'),motionList=$('[data-motions]');
CATEGORIES.forEach(([id,label])=>{const b=document.createElement('button');b.className='ng-btn'+(id==='all'?' active':'');b.textContent=label;b.onclick=()=>{s.filter=id;tabbar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));paintButtons()};tabbar.appendChild(b)});
function paintButtons(){motionList.innerHTML='';const entries=MOTIONS.filter(m=>s.filter==='all'||m.category===s.filter);$('[data-count]').textContent=`${entries.length} / ${MOTIONS.length} 種類`;entries.forEach(m=>{const b=document.createElement('button');b.className='ng-btn'+(s.action?.id===m.id?' active':'');b.textContent=m.label;b.dataset.action=m.id;b.onclick=()=>play(m.id);motionList.appendChild(b)})};paintButtons();
$('[data-select]').querySelectorAll('button').forEach(b=>b.onclick=()=>{s.who=b.dataset.who;syncSelect()});function syncSelect(){host.querySelectorAll('[data-who]').forEach(b=>b.classList.toggle('active',b.dataset.who===s.who))};syncSelect();
BG_LIST.forEach(([id,label])=>{const b=document.createElement('button');b.className='ng-btn';b.textContent=label;b.dataset.bg=id;b.onclick=()=>setBackground(id);$('[data-backgrounds]').appendChild(b)});
function setBackground(id){if(!BG_LIST.find(x=>x[0]===id))return; s.background=id;BG_LIST.forEach(([name])=>{const e=$(`#ng-bg-${name}`);e.style.display=name===id?'':'none'});host.querySelectorAll('[data-bg]').forEach(b=>b.classList.toggle('active',b.dataset.bg===id))}setBackground('neighborhood');
$('[data-speed]').oninput=e=>{s.speed=+e.target.value;$('[data-speed-num]').textContent=s.speed.toFixed(1)+'×'};
let audio=null;function sound(freq=320,dur=.12,type='triangle',vol=.04){if(!s.sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=freq;osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.62),audio.currentTime+dur);gain.gain.setValueAtTime(vol,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+dur)}catch(e){}};
$('[data-sound]').onclick=()=>{s.sound=!s.sound;$('[data-sound]').textContent='音 '+(s.sound?'ON':'OFF');$('[data-sound]').classList.toggle('active',s.sound);sound(480)};
$('[data-play="random"]').onclick=()=>{s.auto=true;s.pauses=false;s.manual=null;s.action=null;s.next=0;updateAuto();sound(400)};
$('[data-play="stop"]').onclick=()=>{s.auto=false;s.pauses=true;s.action=null;s.manual=null;status.textContent='停止中';syncPlay()};function syncPlay(){host.querySelector('[data-play="random"]').classList.toggle('active',s.auto);host.querySelector('[data-play="stop"]').classList.toggle('active',s.pauses)};
const jointInputs={};function paintJointPanel(){const box=$('[data-joints]');box.innerHTML='';KEY.forEach(k=>{const div=document.createElement('div');div.className='ng-joint-control';const id='ng-slider-'+k;div.innerHTML=`<label for="${id}"><span>${LABEL[k]}</span><b data-value>0°</b></label><input id="${id}" type="range" min="-150" max="150" step="1" value="0" aria-label="${LABEL[k]}">`;const inp=div.querySelector('input');inp.oninput=()=>{s.auto=false;s.pauses=true;s.action=null;if(!s.manual)s.manual={n:defaultPose('n'),g:defaultPose('g')};s.manual[s.edit][k]=+inp.value;div.querySelector('[data-value]').textContent=inp.value+'°';syncPlay();status.textContent='関節の手動調整';};jointInputs[k]=inp;box.appendChild(div)});syncJointInputs()}
function syncJointInputs(){for(const k of KEY){const val=Math.round((s.manual?.[s.edit]||defaultPose(s.edit))[k]||0);jointInputs[k].value=val;jointInputs[k].parentElement.querySelector('[data-value]').textContent=val+'°'}};
host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{s.edit=b.dataset.edit;host.querySelectorAll('[data-edit]').forEach(a=>a.classList.toggle('active',a===b));syncJointInputs()});paintJointPanel();host.querySelector('[data-edit="n"]').classList.add('active');
$('[data-reset]').onclick=()=>{s.manual={n:defaultPose('n'),g:defaultPose('g')};s.pauses=true;s.action=null;s.auto=false;syncPlay();syncJointInputs();status.textContent='ポーズ初期化'};
$('[data-save]').onclick=()=>{const str=JSON.stringify(s.manual?.[s.edit]||defaultPose(s.edit),null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(str).then(()=>{status.textContent='ポーズ値をコピーしました'}).catch(()=>{status.textContent='コピーできませんでした'});else status.textContent=str};
function updateAuto(){syncPlay();if(s.auto&&!s.action)startAction(choose())};
function choose(){let list=MOTIONS.filter(m=>m.id!=='idle');if(s.who!=='both')list=list.filter(m=>m.category!=='duo');const past=s.motionHistory.slice(-5);list=list.filter(m=>!past.includes(m.id));return list[Math.floor(random()*list.length)]?.id||'dance'};
function play(id,who){if(!BY_ID[id])return false;if(who&&['n','g','both'].includes(who)){s.who=who;syncSelect()}s.auto=false;s.pauses=false;s.manual=null;s.next=0;startAction(id);syncPlay();return true}
function startAction(id){s.action={...BY_ID[id],who:BY_ID[id].category==='duo'?'both':s.who};s.start=performance.now();s.steps++;s.motionHistory.push(id);if(s.motionHistory.length>15)s.motionHistory.shift();status.textContent=s.action.who==='both'?'2人の掛け合い':s.action.who==='n'?'のび太のアクション':'ジャイアンのアクション';nowLabel.textContent=s.action.label;paintButtons();if(['jump','punch','highfive'].includes(id))sound(580,.13);if(['stomp','fall','duotumble'].includes(id))sound(140,.23,'sawtooth');}
function setJoint(ch,joint,value){if(!CHAR[ch]||!KEY.includes(joint))return false;s.auto=false;s.pauses=true;s.action=null;if(!s.manual)s.manual={n:defaultPose('n'),g:defaultPose('g')};s.manual[ch][joint]=clamp(+value,-150,150);if(s.edit===ch)syncJointInputs();syncPlay();return true}
function interpolatePose(a,b,f){const p={...a};for(const k of KEY.concat(['x','y','rot']))p[k]=lerp(a[k],b[k]??a[k],f);if(b.face)p.face=b.face;if(b.eyes)p.eyes=b.eyes;if(b.flip)p.flip=b.flip;return p}
function animateSolo(id,c,u,time){let p=defaultPose(c);const sin=(cycles,phase=0)=>Math.sin((u*cycles+phase)*TWO), cos=cycles=>Math.cos(u*cycles*TWO), rise=Math.sin(Math.PI*clamp(u,0,1)),tri=x=>1-Math.abs(((x*2)%2)-1);const t=u;
if(id==='idle'){p.y=-1.8*sin(2);p.head=4*sin(1);p.torso=1.5*sin(1);p.eyes=u>.44&&u<.5?'closed':'open';p.face=u>.5&&u<.8?'smile':'neutral'}
if(id==='look'){p.head=20*sin(1.5);p.torso=5*sin(1);p.ls=17;p.rs=-15;p.face='flat'}
if(id==='walk'||id==='run'||id==='chase'){let run=id!=='walk', cyc=run?4:3.5,a=run?54:29;let q=sin(cyc);p.lh=a*q;p.rh=-a*q;p.lk=Math.max(0,-q)* (run?68:42);p.rk=Math.max(0,q)*(run?68:42);p.ls=-a*.72*q;p.rs=a*.72*q;p.le=run?-47:-15;p.re=run?47:15;p.torso=run?-12:5;p.head=run?9:-3;p.y=run?-(12+Math.abs(q)*12):-(Math.abs(q)*5);p.face=run?'shout':'smile';p.x+=(c==='n'?-1:1)*u*56;}
if(id==='jump'){p.y=-155*Math.pow(Math.sin(Math.PI*u),1.2);p.lh=-34*rise;p.rh=34*rise;p.lk=42*rise;p.rk=42*rise;p.ls=-165*rise;p.rs=165*rise;p.face='shout';p.head=-6*rise;}
if(id==='tiptoe'){p.lh=15*sin(3);p.rh=-15*sin(3);p.lk=22+15*sin(3);p.rk=22-15*sin(3);p.y=-6;p.torso=18;p.head=-15;p.ls=50;p.rs=-55;p.le=-85;p.re=85;p.face='flat';}
if(id==='wave'){p.rs=-155+12*sin(3);p.re=44*sin(5);p.head=-6;p.face='smile';}
if(id==='bow'){p.torso=63*rise;p.head=-26*rise;p.ls=-10;p.rs=10;p.face='smile'}
if(id==='dance'||id==='duodance'){const a=sin(4),b=sin(2,0.25);p.x+=38*sin(1.5);p.y=-18*Math.abs(a);p.torso=23*b;p.head=-24*b;p.ls=125*a;p.rs=-125*a;p.le=-50+25*sin(4,.25);p.re=50-25*sin(4,.25);p.lh=40*a;p.rh=-40*a;p.lk=Math.abs(a)*43;p.rk=Math.abs(a)*43;p.rot=6*b;p.face='smile';}
if(id==='spin'){p.rot=1080*ease(t);p.y=-35*rise;p.ls=125;p.rs=-125;p.lh=-25;p.rh=25;p.face='shout'}
if(id==='flip'){p.rot=360*ease(t);p.y=-130*Math.sin(Math.PI*t);p.lh=-30*rise;p.rh=30*rise;p.lk=30*rise;p.rk=30*rise;p.ls=-80;p.rs=80;p.face='shout'}
if(id==='stumble'){const st=t<.4?t/.4:1;p.x+=100*t;p.torso=clamp((t-.1)*125,0,83);p.head=-25;p.rs=-100*st;p.ls=140*st;p.lh=-35*rise;p.rh=55*rise;p.face='shout';if(t>.71){p.rot=86*ease((t-.71)/.25);p.y=23;}}
if(id==='fall'){p.torso=40*rise;p.rot=90*ease(clamp((t-.12)/.58,0,1));p.y=19*ease((t-.12)/.8);p.x+=47*t;p.ls=-135;p.rs=135;p.lh=30;p.rh=-30;p.face='shout';}
if(id==='sneeze'){p.torso=-16*ease(t/.38)+76*pulse(clamp((t-.3)/.22,0,1));p.head=-31*rise;p.rs=-60;p.re=-95;p.face=t<.4?'flat':'shout';}
if(id==='sleep'){p.torso=12+15*sin(1);p.head=24+15*sin(2);p.y=3*sin(2);p.eyes='closed';p.face='flat';p.ls=10;p.rs=-12;}
if(id==='apology'){p.torso=105*ease(t/.5);p.head=35;p.lh=-12;p.rh=15;p.lk=72;p.rk=72;p.ls=-50;p.rs=50;p.face='cry';p.y=14*rise;}
if(id==='victory'){p.rs=-165*rise;p.ls=125*rise;p.torso=-14*rise;p.y=-18*rise;p.face='smile';}
if(id==='punch'){const q=sin(6);p.torso=-13+7*q;p.ls=q>0?-98:-20;p.rs=q<0?98:20;p.le=q>0?-18:-120;p.re=q<0?18:120;p.lh=-20;p.rh=22;p.face='shout';p.x+=18*rise;}
if(id==='kick'){p.torso=-18;p.rh=-132*rise;p.rk=38*rise;p.ls=110*rise;p.rs=-120*rise;p.rot=-23*rise;p.face='shout';}
if(id==='stomp'){p.lh=-55*Math.abs(sin(3));p.rh=55*Math.abs(sin(3));p.lk=38*Math.abs(sin(3));p.y=-22*Math.abs(sin(3));p.torso=-10;p.ls=55;p.rs=-55;p.face='shout';}
if(id==='cry'){p.torso=20;p.head=15;p.ls=-75+16*sin(3);p.rs=75-16*sin(3);p.le=-65;p.re=65;p.y=-5*Math.abs(sin(5));p.face='cry';}
if(id==='angry'){p.torso=-17;p.head=-11;p.ls=-40+35*sin(4);p.rs=40-35*sin(4);p.le=-100;p.re=100;p.y=-5*Math.abs(sin(5));p.face='shout';}
if(id==='shock'){p.ls=-145*rise;p.rs=145*rise;p.torso=-20*rise;p.head=-15*rise;p.y=-30*rise;p.face='shout'}
if(id==='laugh'){p.torso=10*sin(4);p.head=-15+14*sin(3);p.ls=-47;p.rs=47;p.le=-60;p.re=60;p.y=-8*Math.abs(sin(4));p.face='smile';}
if(id==='sing'){p.rs=-135+16*sin(1);p.ls=85+20*sin(2);p.head=-25;p.torso=-10+15*sin(2);p.y=-8*Math.abs(sin(5));p.face='shout';}
if(id==='clap'){p.ls=-65+25*sin(5);p.rs=65-25*sin(5);p.le=-80;p.re=80;p.face='smile';}
return p;}
function animateDuo(id,u){let n=defaultPose('n'),g=defaultPose('g');n.x=350;g.x=676;n.flip=1;g.flip=-1;const rise=Math.sin(Math.PI*u),phase=Math.sin(u*20*Math.PI);
if(id==='chase'){n=animateSolo('run','n',u,0);g=animateSolo('run','g',u,0);n.x=265+480*u;g.x=75+470*u;n.flip=1;g.flip=1;n.face='cry';g.face='shout';g.rs=50+20*phase;g.re=55;}
if(id==='scold'){g.x=645;n.x=380;g=Object.assign(g,animateSolo('angry','g',u,0));g.x=645;g.flip=-1;g.rs=-125+18*phase;g.re=75;g.face='shout';n=Object.assign(n,animateSolo('cry','n',u,0));n.x=370;n.flip=1;n.torso=15*rise;n.face='cry';}
if(id==='singpanic'){g=animateSolo('sing','g',u,0);g.x=642;g.flip=-1;n=animateSolo('shock','n',u,0);n.x=361;n.ls=-98;n.rs=98;n.le=-110;n.re=110;n.head=26*phase;n.face='cry';}
if(id==='highfive'){n=animateSolo('wave','n',u,0);g=animateSolo('wave','g',u,0);n.x=300+130*rise;g.x=675-122*rise;g.flip=-1;n.rs=-136*rise;g.ls=136*rise;g.rs=23;g.face='smile';n.face='smile';n.y=-30*rise;g.y=-20*rise;}
if(id==='duodance'){n=animateSolo('dance','n',u,0);g=animateSolo('dance','g',u+.12,0);n.x=350;g.x=650;g.flip=-1;}
if(id==='duotumble'){n=animateSolo('fall','n',u,0);g=animateSolo('fall','g',u>.2?clamp((u-.2)/.8,0,1):0,0);n.x=370+120*u;g.x=660-100*u;n.flip=1;g.flip=-1;g.rot=-g.rot;}
if(id==='surprise'){n.x=360;n=Object.assign(n,animateSolo(u<.6?'tiptoe':'shock','n',u,0));n.x=280+110*u;g.x=680;g=Object.assign(g,animateSolo(u>.6?'shock':'idle','g',u,0));g.x=690;n.flip=1;g.flip=-1;n.face=u>.6?'shout':'smile';g.face=u>.6?'shout':'neutral';}
if(id==='tug'){n.x=383-18*Math.sin(u*4*Math.PI);g.x=630+18*Math.sin(u*4*Math.PI);n.torso=-24;n.rs=-108;n.re=-78;n.rh=-20;n.face='shout';g.torso=24;g.ls=108;g.le=78;g.rh=20;g.face='shout';}
return {n,g};}
const FX=$('#ng-effects'),CAP=$('#ng-caption'),CAPTEXT=CAP.querySelector('text');function effect(id,u,poses){if(!id){FX.innerHTML='';CAP.style.display='none';return}const add=[];const label=BY_ID[id]?.label||'';
const actionCaption={scold:'コラァーッ！',singpanic:'ボエ〜〜！',chase:'まてぇぇ！',highfive:'イェーイ！',surprise:'わっ！',duotumble:'ドテーン！',tug:'ぐぬぬ…',cry:'うわ〜ん！',angry:'ムキーッ！',shock:'ええっ!?',victory:'やったー！',sing:'ボエ〜♪',stumble:'あっ！',punch:'ドドドド！',kick:'シュバッ！',fall:'ドテッ！',sneeze:'ハックション！',clap:'パチパチ！',jump:'ぴょーん！',dance:'♪ ♫ ♪',spin:'ぐるぐる〜',flip:'くるりん！'};
const title=actionCaption[id]||'';if(title&&u>.1&&u<.83){CAP.style.display='';CAPTEXT.textContent=title;CAP.setAttribute('transform',`translate(0 ${8*Math.sin(u*6*Math.PI)})`)}else CAP.style.display='none';
const center=id==='chase'?poses.n.x:(poses.g.x+poses.n.x)/2;
if(['run','chase','fall','duotumble','stumble','stomp','spin','flip'].includes(id))for(let i=0;i<14;i++){const x=160+i*47;const bob=Math.sin(u*17+i*.72);const opacity=.18+.3*Math.abs(bob);add.push(`<path d="M${x},${533+i%3*3} q${8*bob},-24 ${16*bob},-17" fill="none" stroke="#fffbe8" stroke-width="${2+i%3}" opacity="${opacity}" stroke-linecap="round"/>`)}
if(['shock','surprise','highfive','punch','kick','angry'].includes(id)&&u>.22&&u<.8){const bursts=16;const rad=70+190*Math.sin(Math.PI*((u-.22)/.58));for(let i=0;i<bursts;i++){const ang=i*TWO/bursts;const xx=center+Math.cos(ang)*rad,yy=300+Math.sin(ang)*rad*.54;add.push(`<path d="M${xx},${yy} l${Math.cos(ang)*35},${Math.sin(ang)*30}" stroke="${i%2?'#fffce8':'#ffcc52'}" stroke-width="${i%3+3}" stroke-linecap="round" opacity=".76"/>`)}}
if(['sing','singpanic'].includes(id))for(let i=0;i<8;i++){const x=660+60*Math.cos(u*5+i*2);const y=190+i*32-45*u;add.push(`<text x="${x}" y="${y}" font-size="${22+i%3*9}" fill="${i%2?'#f94a8a':'#3685bc'}" stroke="#fff" stroke-width="1.5">${i%2?'♫':'♪'}</text>`)}
if(['cry','scold'].includes(id))for(let i=0;i<5;i++){const p=poses.n;const x=p.x+25+i*18, y=215+(u*330+i*40)%300;add.push(`<path d="M${x} ${y}q-10 14 0 22q12-6 0-22" fill="#3ca6e7" opacity=".8"/>`)}
if(['dance','duodance','victory','highfive'].includes(id))for(let i=0;i<14;i++){const x=70+i*64, y=170+(Math.sin(u*7+i)*100)+i%3*38;const color=['#ffd348','#f36b88','#65dacc','#fff'][i%4];add.push(`<circle cx="${x}" cy="${y}" r="${3+i%4}" fill="${color}" opacity=".8"/>`)}
if(id==='tug'&&u>.2){add.push(`<path d="M485 350 Q505 ${300+10*Math.sin(u*30)} 523 350" stroke="#c6804a" fill="none" stroke-width="11" stroke-linecap="round"/>`)}
FX.innerHTML=add.join('');}
function tick(time){let delta=Math.min(70,time-s.last);s.last=time;
if(s.auto&&!s.action&&!s.pauses&&time>=s.next)startAction(choose());
let n=defaultPose('n'),g=defaultPose('g'),u=0,action=s.action;
if(s.manual){n={...n,...s.manual.n};g={...g,...s.manual.g}}
else if(action){u=clamp((time-s.start)/1000*s.speed/action.duration,0,1);if(action.category==='duo'){({n,g}=animateDuo(action.id,u))}else{for(const c of ['n','g']){const who=action.who==='both'||action.who===c;const base=who?animateSolo(action.id,c,u,time):animateSolo('idle',c,u,time);if(c==='n')n=base;else g=base}}
if(u>=1){s.action=null;if(s.auto){s.next=time+380+random()*870;status.textContent='次の行動を選択中'}else{s.pauses=false;status.textContent='動作完了';nowLabel.textContent='待機中'}paintButtons()}}
else if(!s.pauses&&!s.manual){n=animateSolo('idle','n',(time/2200)%1,time);g=animateSolo('idle','g',((time/2400)+.3)%1,time)}
for(const [ch,target] of [['n',n],['g',g]]){const old=smoothed[ch];const alpha=1-Math.exp(-Math.max(delta,1)/75);for(const k of KEY.concat(['x','y','rot','scale']))old[k]=lerp(old[k],target[k],alpha);old.flip=target.flip;old.face=target.face;old.eyes=target.eyes;}
renderPose(actors.n,smoothed.n,shadows.n);renderPose(actors.g,smoothed.g,shadows.g);effect(action?.id||null,u,{n,g});

$('[data-debug]').textContent=`${action?.id||'idle'} ｜ ${s.auto?'ランダム再生':'手動'} ｜ ${s.steps} 回実行 ｜ ${Math.round(time)}ms`;
s.raf=requestAnimationFrame(tick)}
s.raf=requestAnimationFrame(tick);if(options.autoplay){s.auto=true;syncPlay()}else {syncPlay()}
function stop(){s.auto=false;s.pauses=true;s.action=null;s.manual=null;syncPlay();status.textContent='停止中'}
function destroy(){cancelAnimationFrame(s.raf);host.innerHTML=''}
const publicApi={setScenePoses(n,g){s.auto=false;s.pauses=true;s.action=null;if(!s.manual)s.manual={n:defaultPose('n'),g:defaultPose('g')};Object.assign(s.manual.n,n);Object.assign(s.manual.g,g);return true},play,start(){s.auto=true;s.pauses=false;s.action=null;s.next=0;syncPlay()},stop,destroy,setJoint,setBackground,setPose(ch,values){if(!CHAR[ch]||!values||typeof values!=='object')return false;s.auto=false;s.pauses=true;s.action=null;if(!s.manual)s.manual={n:defaultPose('n'),g:defaultPose('g')};const p=s.manual[ch];for(const key of KEY){if(Number.isFinite(values[key]))p[key]=clamp(values[key],-150,150)}for(const key of ['x','y','rot']){if(Number.isFinite(values[key]))p[key]=values[key]}if(['neutral','smile','shout','cry','flat'].includes(values.face))p.face=values.face;if(s.edit===ch)syncJointInputs();syncPlay();return true},setSpeed(n){s.speed=clamp(+n,.5,2);$('[data-speed]').value=s.speed;$('[data-speed-num]').textContent=s.speed.toFixed(1)+'×'},select(who){if(['both','n','g'].includes(who)){s.who=who;syncSelect()}},motions:MOTIONS.map(m=>({...m})),getState(){return {action:s.action?.id||'idle',auto:s.auto,who:s.who,background:s.background,manual:s.manual}},snapshot(){const svg=$('.ng-stage-svg');return new XMLSerializer().serializeToString(svg)}};
return publicApi;
}
global.createNGActors=createNGActors;
})(window);

window.VolleyStory=(() => {
'use strict';
const $=s=>document.querySelector(s), NS='http://www.w3.org/2000/svg';
const scenes=[
{id:'opening',title:'第1幕　謎のバレー大会',sec:6.5,bg:'park',line:'ジャイアン「今日は絶対に勝つぞ！」'},
{id:'rally',title:'第2幕　超次元ラリー',sec:7,bg:'park',line:'のび太「普通のバレーじゃないよぉ！」'},
{id:'mistake',title:'第3幕　のび太、痛恨のミス',sec:5,bg:'park',line:'のび太「うわあ！ 手がすべった！」'},
{id:'impact',title:'第4幕　顔面ホームラン',sec:4.6,bg:'park',line:'ドゴォォン！！　……しーん。'},
{id:'rage',title:'第5幕　怒りが物理化',sec:6,bg:'sunset',line:'ジャイアン「のォォびィィ太ァァ！！」'},
{id:'chase',title:'第6幕　恐怖の追跡劇',sec:5.7,bg:'neighborhood',line:'のび太「ドラえも〜〜ん！！」'},
{id:'drag',title:'第7幕　家まで強制連行',sec:6,bg:'neighborhood',line:'ジャイアン「お前はこっちに来い！」'},
{id:'portal',title:'第8幕　家の中がおかしい',sec:5,bg:'room',line:'のび太「えっ、なんでここに……？」'},
{id:'capture',title:'第9幕　ボーボボ、突然の乱入',sec:6.7,bg:'room',line:'ボーボボ「鼻毛神拳！！」'},
{id:'launch',title:'第10幕　謎の打ち上げ',sec:5.5,bg:'sunset',line:'のび太「ここ、家の中だったよね！？」'},
{id:'drop',title:'第11幕　公園に落下',sec:6.4,bg:'park',line:'のび太「ただいま……公園……」'},
{id:'ending',title:'最終幕　まだ終わっていない',sec:4.6,bg:'park',line:'そしてボールは、再びジャイアンへ。'}
];
let sum=0;scenes.forEach((s,i)=>{s.start=sum;s.index=i;sum+=s.sec});const TOTAL=sum;
const S={time:0,playing:false,autoloop:false,speed:1,sound:false,last:0,active:-1,dragging:false,triggered:-1};
window.storyDebug={scenes,TOTAL};
const actors=createNGActors({container:'#actorhost',stageOnly:true,autoplay:false});
const root=$('#actorhost .ng-stage-svg');root.setAttribute('aria-label','のび太とジャイアンの超次元バレー');
const prop=document.createElementNS(NS,'g');prop.setAttribute('id','scene-props');root.insertBefore(prop,root.querySelector('#ng-shadow-n'));
const fg=document.createElementNS(NS,'g');fg.setAttribute('id','story-special-fx');root.appendChild(fg);
const bb=BoboboAnimator.create({target:'#bobobo-holder',transparent:true,noLabel:true,autoplay:false,style:'impact',onLoaded:()=>{}});bb.stop();
// Only load once and use previously provided character art for Bobobo.
const poseKeys=['x','y','rot','head','torso','ls','le','lw','rs','re','rw','lh','lk','la','rh','rk','ra'];
const base=(c)=>({x:c==='n'?270:745,y:0,rot:0,head:0,torso:0,ls:8,le:-5,lw:0,rs:-8,re:5,rw:0,lh:0,lk:0,la:0,rh:0,rk:0,ra:0,face:'neutral',eyes:'open'});
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v)},spike=(v,at,w)=>Math.max(0,1-Math.abs(v-at)/w),easeOut=v=>1-Math.pow(1-clamp(v),3);
function frames(k,u){if(u<=k[0][0])return k[0][1];for(let i=1;i<k.length;i++){if(u<=k[i][0]){const [ta,a]=k[i-1],[tb,b]=k[i];let f=ease((u-ta)/(tb-ta));const out={...a};for(const key of Object.keys(b)){out[key]=typeof b[key]==='number'?mix(typeof a[key]==='number'?a[key]:0,b[key],f):(f>.55?b[key]:(a[key]??b[key]));}return out;}}return k[k.length-1][1]}
function withBase(c,over){return {...base(c),...over}}
function wobble(p,sec,amp=5){p.head+=(Math.sin(sec*4.8)*amp);p.y+=Math.sin(sec*5.6)*2;return p}
function renderPose(sc,u,t){let n=base('n'),g=base('g'),ball=null,fx='',props='';
const wob=Math.sin(t*16),ring=Math.sin(t*23);
if(sc.id==='opening'){
 n=withBase('n',frames([[0,{x:225,rs:-38,ls:80,face:'flat'}],[.25,{x:252,rs:-105,ls:23,face:'smile'}],[.47,{x:260,y:-18,rs:-155,ls:155,face:'shout'}],[.71,{x:267,y:0,rs:17,ls:-20,face:'shout'}],[1,{x:270,rs:-60,face:'smile'}]],u));
 g=withBase('g',{x:764,rs:-80+20*Math.sin(t*4),ls:40,le:-90,re:30,torso:-9,face:'smile'});
 ball={x:mix(273,450,ease(clamp((u-.4)/.6))),y:280-105*Math.sin(clamp((u-.4)/.6)*Math.PI),rot:t*3};
 props=net();
}
if(sc.id==='rally'){
 n=withBase('n',{x:285+22*Math.sin(t*2.8),y:-25*Math.abs(Math.sin(t*6)),ls:65*Math.sin(t*6),rs:-130*Math.sin(t*6),lh:42*Math.sin(t*6),rh:-40*Math.sin(t*6),face:'shout'});
 g=withBase('g',{x:735-32*Math.sin(t*3),y:-29*Math.abs(Math.sin(t*5.2)),ls:-105*Math.sin(t*5),rs:100*Math.sin(t*5),lh:-45*Math.sin(t*5),rh:42*Math.sin(t*5),face:'shout'});
 let q=(u*4.5)%2,dir=q<=1?q:2-q;ball={x:mix(300,703,ease(dir)),y:365-160*Math.sin(dir*Math.PI),rot:t*11};props=net();
 fx=smallSpeed(t,10);
}
if(sc.id==='mistake'){
 n=withBase('n',frames([[0,{x:278,face:'smile',rs:-130,ls:50}],[.25,{x:300,y:-83,rs:-170,ls:160,lh:50,rh:-44,face:'shout'}],[.45,{x:320,y:-110,rot:15,rs:140,ls:-115,face:'shout'}],[.65,{x:322,y:-35,rot:35,rs:70,ls:-130,face:'cry'}],[1,{x:326,y:2,rot:-12,face:'cry',rs:140}]],u));
 g=withBase('g',{x:715,head:-6,ls:-35,face:'neutral'});
 let q=clamp((u-.2)/.8),bx=mix(320,721,easeOut(q));ball={x:bx,y:310-100*Math.sin(q*Math.PI*1.4),rot:t*20,scale:1+q*.28};props=net();
 fx=u>.5?smallSpeed(t,22):'';
}
if(sc.id==='impact'){
 n=withBase('n',{x:300,ls:-120,rs:110,head:-20,face:'cry',y:5*Math.sin(t*10)});
 g=withBase('g',{x:708+10*Math.sin(t*24)*Math.exp(-u*6),head:45*Math.sin(t*18)*Math.exp(-u*2),rot:13*spike(u,.3,.3),ls:-70,rs:74,face:u<.65?'shout':'flat'});
 ball={x:715+115*ease(clamp((u-.22)/.8)),y:320+110*ease(u),rot:t*25,scale:1+2*spike(u,.17,.16)};
 props=net(); if(u>.12)fx=burst(712,317,t,40+440*ease(u),u<.45?1:.6)+'<text x="714" y="233" text-anchor="middle" fill="#fff" stroke="#bb2647" stroke-width="8" paint-order="stroke" font-weight="1000" font-size="83" transform="rotate(-10 714 233)">ドゴォン!</text>';
}
if(sc.id==='rage'){
 n=withBase('n',{x:300-60*u,head:25,torso:26,ls:-126,rs:121,face:'cry',y:6*Math.sin(t*14)});
 g=withBase('g',{x:715+22*Math.sin(t*34)*Math.exp(-u*3),y:-24*Math.abs(Math.sin(t*15)),ls:-150+35*Math.sin(t*9),rs:152-37*Math.sin(t*9),le:-70,re:69,torso:-21,head:-14,face:'shout'});
 const r=150+220*Math.abs(Math.sin(t*4));fx=`<g opacity="${(.35+.6*ease(u)).toFixed(2)}">${Array.from({length:15},(_,i)=>{let x=705+Math.sin(i*8.7+t*1.1)*105,y=311+Math.cos(i*5.4+t*1.8)*100;return `<path d="M${x-24} ${y+100}Q${x-51} ${y+8} ${x} ${y-95}Q${x+27} ${y-10} ${x+30} ${y+81}Z" fill="${i%2?'#ffb32b':'#f83950'}" opacity=".53"/>`}).join('')}</g>${burst(715,315,t,r,.36)}<text x="695" y="122" font-size="57" text-anchor="middle" fill="#ff433a" stroke="#fff5a4" stroke-width="5" paint-order="stroke" font-weight="1000">怒</text>`;
}
if(sc.id==='chase'){
 const k=clamp(u); n=withBase('n',{x:mix(180,760,k),y:-18*Math.abs(Math.sin(t*11)),ls:95*Math.sin(t*11),rs:-92*Math.sin(t*11),lh:54*Math.sin(t*11),rh:-55*Math.sin(t*11),lk:35*Math.abs(Math.sin(t*11)),rk:35*Math.abs(Math.cos(t*11)),torso:16,face:'cry'});
 g=withBase('g',{x:mix(80,635,k),y:-17*Math.abs(Math.sin(t*10)),ls:75*Math.sin(t*10),rs:-75*Math.sin(t*10),lh:43*Math.sin(t*10),rh:-43*Math.sin(t*10),lk:30*Math.abs(Math.sin(t*10)),rk:30*Math.abs(Math.cos(t*10)),torso:18,face:'shout'});
 fx=smallSpeed(t,36);
}
if(sc.id==='drag'){
 n=withBase('n',frames([[0,{x:535,face:'cry',rs:-120,ls:75,head:28}],[.4,{x:485,y:5,torso:27,rot:13,rs:-142,ls:77,face:'cry'}],[.8,{x:450,y:13,torso:32,rot:18,rs:-110,ls:-68,face:'cry'}],[1,{x:449,y:13,torso:28,face:'cry'}]],u));
 g=withBase('g',frames([[0,{x:680,face:'shout',ls:85,le:-87}],[.5,{x:615,face:'shout',ls:115,le:-90,torso:-13}],[1,{x:570,ls:107,le:-70,face:'flat'}]],u));
 props=houseDoor(u);fx=`<path d="M${mapx(n.x+49)} ${365+n.y} Q${mapx(560)} ${322+n.y} ${mapx(g.x-38)} 356" stroke="#663e3b" stroke-width="13" stroke-linecap="round" fill="none" opacity=".7"/>`;
}
if(sc.id==='portal'){
 n=withBase('n',frames([[0,{x:350,face:'shout',ls:-95,rs:90}],[.5,{x:393,head:-26,face:'cry',ls:-135,rs:130}],[1,{x:418,y:-18,head:-14,face:'cry',ls:-145,rs:145}]],u));
 g=withBase('g',{x:840+350*ease(u),face:'shout',ls:55,rs:-42});props=portal(u,t);
 fx=portalFX(t,u);
}
if(sc.id==='capture'){
 n=withBase('n',frames([[0,{x:415,ls:-130,rs:125,face:'shout'}],[.28,{x:404,y:-38,rot:-15,ls:-150,rs:150,face:'cry'}],[.65,{x:505,y:-120,rot:25,lh:60,rh:-60,rs:-175,ls:172,face:'cry'}],[1,{x:574,y:-140,rot:23,rs:-158,ls:145,face:'cry'}]],u));
 g=withBase('g',{x:1110,face:'shout'});props=portal(1,t); fx=hairTentacles(n.x,n.y,t,u)+portalFX(t,u);
}
if(sc.id==='launch'){
 n=withBase('n',frames([[0,{x:585,y:-170,rot:10,ls:-140,rs:140,face:'shout'}],[.27,{x:640,y:-390,rot:180,ls:140,rs:-140,lh:60,rh:-60,face:'cry'}],[.60,{x:365,y:-480,rot:590,ls:-150,rs:145,face:'cry'}],[1,{x:170,y:-530,rot:975,ls:90,rs:-90,face:'shout'}]],u));
 g=withBase('g',{x:1110,face:'shout'}); fx=smallSpeed(t,44)+burst(690,270,t,450*u,.6);props=portal(1,t);
}
if(sc.id==='drop'){
 n=withBase('n',frames([[0,{x:485,y:-490,rot:815,face:'shout',ls:-110,rs:108}],[.3,{x:500,y:-300,rot:1015,face:'cry',ls:-130,rs:120}],[.52,{x:505,y:8,rot:1080,torso:40,lh:80,rh:-80,face:'shout'}],[.66,{x:510,y:65,rot:1080,torso:95,head:30,ls:-170,rs:173,face:'cry'}],[.84,{x:510,y:12,rot:1080,torso:45,face:'cry'}],[1,{x:505,y:0,rot:1080,torso:10,face:'flat'}]],u));
 g=withBase('g',{x:752,head:18,ls:40,face:'flat'});
 if(u>.49&&u<.9){fx=smoke(510,530,t,(u-.49)/.41)+burst(506,521,t,200*spike(u,.56,.2),.55);} else if(u<.5)fx=smallSpeed(t,23);
}
if(sc.id==='ending'){
 n=withBase('n',{x:357,face:'flat',head:12,ls:55,rs:-20,torso:15});g=withBase('g',{x:716,face:u>.6?'shout':'smile',head:(u>.62?30*Math.sin(t*24):0),ls:20,rs:70});props=net();
 ball={x:mix(380,711,ease(clamp((u-.1)/.75))),y:300-80*Math.sin(u*Math.PI),rot:t*17};if(u>.7)fx=burst(719,316,t,320*spike(u,.82,.22),.8);
}
 n=wobble(n,t,n.face==='cry'?6:2);g=wobble(g,t,g.face==='shout'?4:1);
 if(S.editorActive){Object.assign(n,editor.n);Object.assign(g,editor.g)}
 if(n.rot!==undefined && Math.abs(n.rot)>360)n.rot=n.rot%360;
 actors.setScenePoses(n,g);
 prop.innerHTML=props;
 fg.innerHTML=fx+(ball?ballMarkup(ball,t):'')+decor(sc,t,u);
 return {n,g};
}
function mapx(x){return innerWidth<=720?500+(x-500)*.64:x}
function net(){return `<g opacity=".92"><path d="M500 525V335" stroke="#59677f" stroke-width="10"/><path d="M500 331V520" stroke="#e6f1ff" stroke-width="4"/><path d="M498 345H504V511H498Z" fill="#fff"/>${Array.from({length:13},(_,i)=>`<path d="M${500-i*3} ${350+i*12}h${i%2?21:-18}" stroke="#fff" stroke-width="2" opacity=".4"/>`).join('')}<ellipse cx="500" cy="534" rx="15" ry="6" fill="#19344c" opacity=".3"/></g>`}
function houseDoor(u){return `<g><path d="M370 482V205H630V482" stroke="#4c3a37" stroke-width="13" fill="#e9ba8c"/><rect x="407" y="240" width="179" height="242" rx="7" fill="#68404e" stroke="#ead7ab" stroke-width="10"/><rect x="422" y="252" width="142" height="225" rx="3" fill="#3a274c"/><circle cx="550" cy="371" r="9" fill="#ffd86e"/><path d="M396 242L585 242" stroke="#fff5d0" stroke-width="6"/><text x="505" y="200" fill="#fff" stroke="#68355d" stroke-width="5" paint-order="stroke" font-size="23" font-weight="900" text-anchor="middle">ジャイアンの家…？</text></g>`}
function portal(u,t){let k=ease(u);return `<g opacity="${k}"><rect x="555" y="98" width="355" height="425" rx="21" fill="#27103f" stroke="#ae7bff" stroke-width="16"/><rect x="578" y="123" width="310" height="376" rx="12" fill="#261f5b"/><ellipse cx="735" cy="310" rx="${145*k}" ry="${172*k}" fill="#1c145e" stroke="#ffeb77" stroke-width="10"/><ellipse cx="735" cy="310" rx="${120*k}" ry="${145*k}" fill="none" stroke="#c46dff" stroke-width="21" stroke-dasharray="31 15" transform="rotate(${t*36} 735 310)"/><ellipse cx="735" cy="310" rx="${75*k}" ry="${104*k}" fill="#412d8a" stroke="#5deaff" stroke-width="13" stroke-dasharray="22 9" transform="rotate(${-t*46} 735 310)"/><text x="735" y="173" font-size="31" font-weight="900" text-anchor="middle" fill="#fff" stroke="#412453" stroke-width="4" paint-order="stroke">異次元・居間</text></g>`}
function portalFX(t,u){return `<g opacity="${.3+.6*u}">${Array.from({length:16},(_,i)=>{let a=t*2+i*2.4,x=735+168*Math.cos(a),y=298+165*Math.sin(a);return `<circle cx="${x}" cy="${y}" r="${3+i%4}" fill="${i%2?'#fff8a5':'#5cf7ff'}"/>`}).join('')}</g>`}
function smallSpeed(t,count){return `<g opacity=".49">${Array.from({length:count},(_,i)=>{let x=(i*137.3+t*1200)%1100-50,y=(i*81.2)%490+25;return `<path d="M${x} ${y}l-${34+i%5*25} -${2+i%3*2}" stroke="${i%2?'#fef0a0':'#ffffff'}" stroke-width="${1+i%4}"/>`}).join('')}</g>`}
function hairTentacles(x,y,t,u){const k=ease(clamp((u-.08)/.48));const targetX=mapx(x), bx=mapx(704);return `<g>${Array.from({length:9},(_,i)=>{let oy=(i-4)*11,ctrlY=150+Math.sin(t*8+i*1.5)*115,tx=bx+(targetX-bx)*k,ty=320-110*k+y*.25+oy;return `<path d="M${bx} ${240+i%3*7}Q${bx-120*Math.sin(t+i)} ${ctrlY} ${tx} ${ty}" fill="none" stroke="#874209" stroke-width="${12-i%3*2}" stroke-linecap="round"/><path d="M${bx} ${240+i%3*7}Q${bx-120*Math.sin(t+i)} ${ctrlY} ${tx} ${ty}" fill="none" stroke="#f9dd27" stroke-width="${8-i%3*2}" stroke-linecap="round"/><path d="M${bx} ${240+i%3*7}Q${bx-120*Math.sin(t+i)} ${ctrlY} ${tx} ${ty}" fill="none" stroke="#fff4b0" stroke-width="2.5"/>`}).join('')}</g>`}
function burst(x,y,t,r,opacity){return `<g opacity="${opacity}">${Array.from({length:20},(_,i)=>{let a=i*Math.PI/10+t*.15,x1=x+Math.cos(a)*(r*.43),x2=x+Math.cos(a)*r,y1=y+Math.sin(a)*r*.3,y2=y+Math.sin(a)*r*.65;return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${i%2?'#ffd64c':'#fff'}" stroke-width="${i%4+3}" stroke-linecap="round"/>`}).join('')}</g>`}
function smoke(x,y,t,k){return `<g>${Array.from({length:17},(_,i)=>{let ang=i*2.399+12.2,r=k*(30+i*10),cx=x+Math.cos(ang)*r,cy=y+Math.sin(ang)*r*.6-30*k,rad=(13+i%5*7)*(1-k*.65);return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#f3f1eb" stroke="#c1c0b3" stroke-width="3" opacity="${.8-k*.65}"/>`}).join('')}</g>`}
function ballMarkup(b,t){let x=mapx(b.x),s=b.scale||1;return `<g transform="translate(${x} ${b.y}) rotate(${(b.rot||t)*38}) scale(${s})"><circle r="27" fill="#fffdf2" stroke="#242e51" stroke-width="5"/><path d="M-24,-10Q0,-5 6,25 M5,-24Q18,-3 23,15 M-17,22Q-4,0 25,-5" stroke="#2d90df" stroke-width="6" fill="none"/><circle cx="-10" cy="-13" r="6" fill="#fff" opacity=".82"/></g>`}
function decor(sc,t,u){if(['portal','capture','launch'].includes(sc.id))return `<g opacity=".5">${Array.from({length:13},(_,i)=>{let x=(100+i*91)%980,y=(i*83+t*48)%540;return `<text x="${x}" y="${y}" font-size="${18+i%4*9}" fill="${i%2?'#ef9fff':'#fff58a'}" transform="rotate(${Math.sin(t+i)*35} ${x} ${y})">${['!?','★','✕','◎'][i%4]}</text>`}).join('')}</g>`;return ''}
function getScene(time){let v=((time%TOTAL)+TOTAL)%TOTAL;if(time>=TOTAL&&!S.autoloop)v=TOTAL-.000001;const i=scenes.findIndex(s=>v>=s.start&&v<s.start+s.sec);return {sc:scenes[Math.max(0,i)],u:clamp((v-scenes[Math.max(0,i)].start)/scenes[Math.max(0,i)].sec),local:v-scenes[Math.max(0,i)].start};}
const format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function audioCue(sc){if(!S.sound)return;let actx;try{actx=window.__ctx||(window.__ctx=new (window.AudioContext||window.webkitAudioContext)());if(actx.state==='suspended')actx.resume();const notes=sc.id==='impact'?[90,63,49]:sc.id==='rage'?[190,140,90]:sc.id==='capture'?[630,450,790]:sc.id==='drop'?[320,140,74]:[430,550];notes.forEach((note,j)=>{const osc=actx.createOscillator(),gain=actx.createGain();osc.type=sc.id==='rage'?'sawtooth':'triangle';osc.frequency.setValueAtTime(note,actx.currentTime+j*.10);gain.gain.setValueAtTime(.0001,actx.currentTime+j*.10);gain.gain.linearRampToValueAtTime(.06,actx.currentTime+j*.10+.016);gain.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+j*.10+.18);osc.connect(gain).connect(actx.destination);osc.start(actx.currentTime+j*.1);osc.stop(actx.currentTime+j*.1+.2)});}catch(e){}}
const controls={btn:$('#playBtn'),bar:$('#seekbar'),time:$('#timecode'),title:$('#sceneTitle'),count:$('#counter'),dialog:$('#dialogText'),flash:$('#flash'),shade:$('#shade'),sceneRow:$('#sceneRow')};
scenes.forEach(sc=>{let el=document.createElement('button');el.className='scene-btn';el.innerHTML=`<span class="num">${String(sc.index+1).padStart(2,'0')} / ${scenes.length}</span>${sc.title.split('　').slice(1).join('　')||sc.title}`;el.onclick=()=>{seek(sc.start);play()};sc.el=el;controls.sceneRow.appendChild(el)});
controls.bar.max=TOTAL.toFixed(3);controls.bar.step='.01';
function activate(sc){if(S.active===sc.index)return;S.active=sc.index;actors.setBackground(sc.bg);controls.title.textContent=sc.title;controls.count.textContent=`${sc.index+1} / ${scenes.length}`;controls.dialog.textContent=sc.line;scenes.forEach(s=>s.el.classList.toggle('active',s===sc));sc.el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});audioCue(sc);const reveal=['portal','capture','launch'].includes(sc.id);$('#bobobo-holder').classList.toggle('visible',reveal);if(sc.id==='capture')bb.play('noseweb');if(sc.id==='launch')bb.play('nosecannon');if(sc.id==='portal')bb.play('roar');S.triggered=sc.index;}
function tick(now){requestAnimationFrame(tick);if(!S.last)S.last=now;let dt=Math.min((now-S.last)/1000,.09);S.last=now;if(S.playing&&!S.dragging){S.time+=dt*S.speed;if(S.time>=TOTAL){if(S.autoloop)S.time%=TOTAL;else{S.time=TOTAL;pause()}}}
 const {sc,u}=getScene(S.time);activate(sc);renderPose(sc,u,S.time);controls.time.textContent=format(S.time)+' / '+format(TOTAL);if(!S.dragging)controls.bar.value=S.time;controls.flash.style.opacity= (sc.id==='impact'?(.55*spike(u,.20,.11)):(sc.id==='launch'?.5*spike(u,.2,.10):(sc.id==='drop'?.45*spike(u,.55,.10):0))).toFixed(3);
 controls.shade.style.opacity=sc.id==='rage'?(.4+.25*Math.sin(now*.016)**2).toFixed(2):0;
 $('.screen').style.filter=sc.id==='impact'||sc.id==='rage'?`hue-rotate(${6*Math.sin(now*.04)}deg)`:'';
}
function play(){S.editorActive=false;S.playing=true;controls.btn.textContent='⏸ 一時停止';controls.btn.classList.remove('primary');S.last=performance.now()}
function pause(){S.playing=false;controls.btn.textContent='▶ 再生';controls.btn.classList.add('primary')}
function seek(t){S.time=clamp(Number(t)||0,0,TOTAL);if(getScene(S.time).sc.index!==S.active)S.active=-1;S.last=performance.now()}
controls.btn.onclick=()=>S.playing?pause():play();$('#restartBtn').onclick=()=>{seek(0);play()};$('#nextBtn').onclick=()=>{const {sc}=getScene(S.time);seek(scenes[(sc.index+1)%scenes.length].start);play()};$('#soundBtn').onclick=()=>{S.sound=!S.sound;$('#soundBtn').textContent=S.sound?'♪ 音 ON':'♪ 音 OFF';$('#soundBtn').classList.toggle('on',S.sound);if(S.sound)audioCue(scenes[S.active]||scenes[0])};$('#speed').onchange=e=>{S.speed=+e.target.value};$('#loopBtn').onclick=()=>{S.autoloop=!S.autoloop;$('#loopBtn').textContent=S.autoloop?'↻ ループ ON':'↻ ループ OFF';$('#loopBtn').classList.toggle('on',S.autoloop)};
controls.bar.addEventListener('input',e=>{S.dragging=true;seek(e.target.value)});controls.bar.addEventListener('change',e=>{S.dragging=false;seek(e.target.value)});
// Bone editor remains available while pausing to avoid overwriting adjustments.
const JOINTS=[['head','頭'],['torso','胴体'],['ls','左肩'],['le','左肘'],['lw','左手首'],['rs','右肩'],['re','右肘'],['rw','右手首'],['lh','左股'],['lk','左膝'],['la','左足首'],['rh','右股'],['rk','右膝'],['ra','右足首']];let edit='n',editor={n:{},g:{}};const jgrid=$('#jointGrid');function buildEditor(){jgrid.innerHTML='';for(const [key,label] of JOINTS){const row=document.createElement('div');row.className='jitem';row.innerHTML=`<label>${label}<span data-value>0°</span></label><input type="range" min="-150" max="150" value="${editor[edit][key]||0}" data-id="${key}" aria-label="${label}">`;const input=row.querySelector('input');input.oninput=()=>{pause();S.editorActive=true;editor[edit][key]=Number(input.value);row.querySelector('[data-value]').textContent=input.value+'°';actors.setScenePoses(edit==='n'?editor.n:{},edit==='g'?editor.g:{})};jgrid.append(row)}}buildEditor();$('#who').onchange=e=>{edit=e.target.value;buildEditor()};$('#resetJoint').onclick=()=>{editor={n:{},g:{}};S.editorActive=false;buildEditor()};
window.StoryApp={play,pause,seek,restart(){seek(0);play()},next(){const {sc}=getScene(S.time);seek(scenes[(sc.index+1)%scenes.length].start)},setSpeed(v){S.speed=clamp(v,.5,2)},setSound(v){S.sound=!!v},scenes:scenes.map(({id,title,sec,start})=>({id,title,sec,start})),total:TOTAL,getState(){return {time:S.time,playing:S.playing,scene:getScene(S.time).sc.id}},getNGActors(){return actors},getBobobo(){return bb}};
requestAnimationFrame(tick);
});
