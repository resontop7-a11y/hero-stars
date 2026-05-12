// ====== ЗАГРУЗКА ======
let lp=0;
(function tick(){
  lp+=3;if(lp>100)lp=100;
  let bar=document.getElementById('loadbar');if(!bar){setTimeout(tick,100);return;}
  bar.style.width=lp+'%';
  if(lp<100)setTimeout(tick,50);
  else{
    let sub=document.getElementById('loadsub');if(sub)sub.textContent='Готово!';
    setTimeout(()=>{
      let ld=document.getElementById('loading'),lb=document.getElementById('lobby');
      if(ld)ld.style.display='none';if(lb)lb.style.display='flex';
    },400);
  }
})();

// ====== ДАННЫЕ ======
const SVR='wss://hero-stars.onrender.com';
let ws=null,pid=null,trophies=0,maxTrophies=0,nick='Огонёк',tag='',coins=500,gems=0;
let fame=0,hours=0,logins=1,elo=0,rank='БРОНЗА 1';
let inMatch=false,alive=true,hp=100;
let enemy=null,mx=0,my=0,me={x:480,y:270},bullets=[],particles=[];
let keys={},phone=/Android|iPhone|iPad/i.test(navigator.userAgent);
const C=document.getElementById('c'),ctx=C?.getContext('2d'),W=960,H=540;
let selectedMode='showdown',myRoomCode='',claimedRewards=[];
let lang='ru',region='RU';
let clubName='',friends=[],clubMembers=[],friendRequests=[],blocked=[];
let allHeroTrophies={};

let heroes=[
  {id:1,name:'Огонёк',emoji:'🔥',owned:true,rarity:'Обычный'},
  {id:2,name:'Ледяной',emoji:'❄️',owned:true,rarity:'Обычный'},
  {id:3,name:'Громила',emoji:'💪',owned:false,rarity:'Редкий'},
  {id:4,name:'Тень',emoji:'🌑',owned:false,rarity:'Эпический'},
  {id:5,name:'Молния',emoji:'⚡',owned:false,rarity:'Легендарный'},
  {id:6,name:'Целитель',emoji:'💚',owned:false,rarity:'Редкий'}
],cur=heroes[0];

let modes=[
  {id:'showdown',name:'Столкновение',icon:'💀',desc:'Выживи и уничтожь всех'},
  {id:'brawlball',name:'Броуболл',icon:'⚽',desc:'Забей 2 гола'},
  {id:'gemgrab',name:'Захват кристаллов',icon:'💎',desc:'Собери 10 кристаллов'},
  {id:'knockout',name:'Нокаут',icon:'🥊',desc:'Победи в 2 раундах'}
];

let allRewards={};
for(let i=100;i<=10000;i+=100){
  let r=['Монеты','Гемы','Ящик','XP','Карта','Скин','Билеты','Усилитель'][Math.floor(Math.random()*8)];
  let ic={'Монеты':'🪙','Гемы':'💎','Ящик':'🎁','XP':'🎫','Карта':'🃏','Скин':'✨','Билеты':'🎟️','Усилитель':'⚡'};
  allRewards[i]={name:r,icon:ic[r]||'🎁'};
}

function genTag(){let c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let t='';for(let i=0;i<8;i++)t+=c[Math.floor(Math.random()*c.length)];return t;}

let saved=null;
try{saved=JSON.parse(localStorage.getItem('hs_data')||'{}');}catch(e){saved={};}
if(saved&&saved.tag){
  trophies=saved.trophies||0;maxTrophies=saved.maxTrophies||0;nick=saved.nick||'Огонёк';tag=saved.tag;
  fame=saved.fame||0;hours=saved.hours||0;logins=(saved.logins||0)+1;elo=saved.elo||0;
  rank=saved.rank||'БРОНЗА 1';selectedMode=saved.mode||'showdown';claimedRewards=saved.claimedRewards||[];
  lang=saved.lang||'ru';region=saved.region||'RU';coins=saved.coins||500;gems=saved.gems||0;
  clubName=saved.clubName||'';friends=saved.friends||[];clubMembers=saved.clubMembers||[];
  friendRequests=saved.friendRequests||[];blocked=saved.blocked||[];
  allHeroTrophies=saved.allHeroTrophies||{};
  cur=heroes.find(h=>h.emoji===saved.avatar)||heroes[0];
}else{tag=genTag();logins=1;}
if(!myRoomCode)myRoomCode='HS'+tag;
if(!allHeroTrophies[cur.emoji])allHeroTrophies[cur.emoji]=0;
saveData();
let ls=document.getElementById('lang-select');if(ls)ls.value=lang;
let rs=document.getElementById('region-select');if(rs)rs.value=region;

function saveData(){
  localStorage.setItem('hs_data',JSON.stringify({trophies,maxTrophies,nick,tag,fame,hours,logins,elo,rank,avatar:cur.emoji,mode:selectedMode,claimedRewards,lang,region,coins,gems,clubName,friends,clubMembers,friendRequests,blocked,allHeroTrophies}));
}

function updateUI(){
  let hb=document.getElementById('hbox');if(hb)hb.textContent=cur.emoji;
  let hn=document.getElementById('hname');if(hn)hn.textContent=nick;
  let ab=document.getElementById('avatar-btn');if(ab)ab.textContent=cur.emoji;
  let pa=document.getElementById('prof-avatar');if(pa)pa.textContent=cur.emoji;
  let pct=Math.min(100,Math.round((trophies/10000)*100));
  let ff=document.getElementById('fpfill');if(ff)ff.style.width=pct+'%';
  let ft=document.getElementById('fptext');if(ft)ft.textContent=trophies+'/10K';
  let cd=document.getElementById('coins-display');if(cd)cd.textContent=coins;
  let gd=document.getElementById('gems-display');if(gd)gd.textContent=gems;
  let rpct=Math.min(100,Math.round((elo/1250)*100));
  let rf=document.getElementById('hero-rank-fill');if(rf)rf.style.width=rpct+'%';
  let rt=document.getElementById('hero-rank-text');if(rt)rt.textContent=rank;
}
updateUI();

function safeSend(d){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(d));}
function t(ru,en){return lang==='ru'?ru:en;}

// ====== ЯЗЫК ======
function changeLanguage(v){lang=v;saveData();}
function changeRegion(v){region=v;saveData();}

// ====== НАГРАДЫ ======
function checkRewards(){
  let ms=Object.keys(allRewards).map(Number).sort((a,b)=>a-b);
  for(let m of ms){if(trophies>=m&&!claimedRewards.includes(m)){claimedRewards.push(m);showReward('🎉 '+m+' кубков! '+allRewards[m].icon+' '+allRewards[m].name);if(allRewards[m].name==='Монеты')coins+=50;if(allRewards[m].name==='Гемы')gems+=5;}}
  saveData();
}
function showReward(msg){let d=document.createElement('div');d.className='reward-popup';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),2100);}

// ====== ПУТЬ К СЛАВЕ ======
function openFameRewards(){
  let p=document.getElementById('fame-panel'),s=document.getElementById('fame-scroll');
  let ms=Object.keys(allRewards).map(Number).sort((a,b)=>a-b);s.innerHTML='';
  ms.forEach(m=>{let r=allRewards[m],done=trophies>=m,got=claimedRewards.includes(m);
    let cls=got?'claimed':(done?'reached':'locked'),icon=got?'✅':(done?r.icon:'🔒');
    s.innerHTML+=`<div class="fame-item ${cls}"><div class="fame-icon">${icon}</div><div style="font-size:9px;color:#aaa">${r.name}</div><div style="color:#ffd700;font-size:10px">${m}🏆</div></div>`;});
  document.getElementById('fame-track-fill').style.width=Math.min(100,Math.round((trophies/10000)*100))+'%';
  if(p)p.style.display='block';
}
function closeFame(){let p=document.getElementById('fame-panel');if(p)p.style.display='none';}

// ====== ЛИДЕРЫ ======
function openLeaderboardP(){closeBurger();openLeaderboard();}
function openLeaderboard(){
  let tabs=document.getElementById('lb-tabs');
  tabs.innerHTML=`<button class="active" onclick="showLBtab('global')">🌍 Мир</button><button onclick="showLBtab('local')">📍 Местный</button><button onclick="showLBtab('club')">👥 Клуб</button><button onclick="showLBtab('hero')">⚔️ Боец</button>`;
  showLBtab('global');
  document.getElementById('leaderboard-panel').style.display='block';
}
function closeLeaderboard(){document.getElementById('leaderboard-panel').style.display='none';}

function showLBtab(tab){
  document.querySelectorAll('#lb-tabs button').forEach(b=>b.classList.remove('active'));
  if(event&&event.target)event.target.classList.add('active');
  let list=document.getElementById('lb-list');list.innerHTML='';
  let data=[];
  if(tab==='global')data=[{nickname:nick,avatar:cur.emoji,trophies}];
  else if(tab==='local')data=[{nickname:nick,avatar:cur.emoji,trophies}];
  else if(tab==='club')data=clubMembers.length>0?clubMembers.map(m=>({nickname:m,avatar:'👤',trophies:0})):[{nickname:nick,avatar:cur.emoji,trophies}];
  else if(tab==='hero'){heroes.filter(h=>h.owned).forEach(h=>{data.push({nickname:h.name,avatar:h.emoji,trophies:allHeroTrophies[h.emoji]||0});});}
  if(data.length===0){list.innerHTML='<p style="color:#aaa;text-align:center">Нет данных</p>';return;}
  data.slice(0,50).forEach((x,i)=>{list.innerHTML+=`<div class="lb-row" onclick="openProfileByTag('${x.nickname}')"><span class="lb-rank">${i+1}</span><span class="lb-avatar">${x.avatar||'🔥'}</span><span class="lb-name">${x.nickname||'Игрок'}</span><span class="lb-score">${x.trophies||0} 🏆</span></div>`;});
}
function openProfileByTag(name){closeLeaderboard();openProfile();}

// ====== КЛУБ ======
function openClub(){
  let h='<h3 style="color:#ffd700">👥 КЛУБ</h3>';
  if(clubName){
    h+=`<p style="color:#fff;font-size:16px"><b>${clubName}</b></p><p style="color:#aaa">Участников: ${clubMembers.length+1}</p>`;
    h+='<div style="text-align:left;max-height:150px;overflow-y:auto">';
    [nick,...clubMembers].forEach(m=>h+=`<div class="friend-card" onclick="openProfileByTag('${m}')"><span>👤</span><span>${m}</span></div>`);
    h+='</div>';
  }else{
    h+=`<p style="color:#aaa">Нет клуба</p><p style="color:#ffd700">Создать: 🪙 1000</p>`;
    h+=`<button style="margin:5px;padding:6px 16px;background:#ffd700;color:#000;border:none;border-radius:12px;font-weight:bold;cursor:pointer" onclick="createClub()">Создать</button>`;
  }
  h+=`<br><button class="close-btn" onclick="closePanel()">ЗАКРЫТЬ</button>`;
  document.getElementById('ptitle').textContent='';document.getElementById('pbody').innerHTML=h;
  document.getElementById('panel').style.display='block';
}
function createClub(){if(coins<1000){alert('Не хватает монет!');return;}let name=prompt('Название:');if(name&&name.length>=3){coins-=1000;clubName=name;saveData();closePanel();openClub();}}

// ====== ДРУЗЬЯ ======
function openFriends(){
  let h='<h3 style="color:#ffd700">👫 ДРУЗЬЯ</h3>';
  h+='<div class="friends-layout">';
  h+='<div class="friends-left"><b style="color:#aaa;font-size:12px">Добавить</b>';
  h+=`<input id="add-friend-input" placeholder="#Тэг" style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.5);color:#fff;font-size:12px;margin:4px 0">`;
  h+=`<button onclick="addFriend()" style="padding:4px 10px;background:#0c8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px">Добавить</button>`;
  if(friendRequests.length>0){h+='<div style="margin-top:8px"><b style="color:#ffd700;font-size:11px">Заявки</b></div>';friendRequests.forEach(f=>h+=`<div class="friend-card"><span>👤</span><span>${f}</span><button onclick="acceptFriend('${f}')" style="margin-left:auto;background:#0c8;color:#fff;border:none;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">✓</button></div>`);}
  h+='</div>';
  h+='<div class="friends-right"><b style="color:#aaa;font-size:12px">Друзья</b>';
  if(friends.length===0)h+='<p style="color:#aaa;font-size:11px">Нет друзей</p>';
  else friends.forEach(f=>h+=`<div class="friend-card"><span>👤</span><span>${f}</span><button onclick="blockFriend('${f}')" style="margin-left:auto;background:red;color:#fff;border:none;border-radius:6px;padding:2px 6px;font-size:10px;cursor:pointer">🚫</button></div>`);
  h+='</div></div>';
  h+=`<br><button class="close-btn" onclick="closePanel()">ЗАКРЫТЬ</button>`;
  document.getElementById('ptitle').textContent='';document.getElementById('pbody').innerHTML=h;
  document.getElementById('panel').style.display='block';
}

function addFriend(){
  let inp=document.getElementById('add-friend-input');if(!inp)return;
  let val=inp.value.trim().replace('#','');
  if(!val){alert('Введите тэг!');return;}
  if(val===tag){alert('Нельзя добавить себя!');return;}
  if(friends.includes(val)){alert('Уже в друзьях!');return;}
  if(friendRequests.includes(val)){alert('Заявка уже отправлена!');return;}
  safeSend({type:'friend_request',toTag:val,from:nick,fromTag:tag,fromAvatar:cur.emoji});
  alert('📤 Заявка отправлена игроку #'+val);
  closePanel();
}
function acceptFriend(f){
  friendRequests=friendRequests.filter(x=>x!==f);
  if(!friends.includes(f))friends.push(f);
  safeSend({type:'friend_accepted',toTag:f,from:nick});
  saveData();closePanel();openFriends();
}
function blockFriend(f){
  friends=friends.filter(x=>x!==f);
  if(!blocked.includes(f))blocked.push(f);
  saveData();closePanel();openFriends();
}

// ====== НАСТРОЙКИ ======
function openSettings(){document.getElementById('settings-panel').style.display='block';closeBurger();}
function closeSettings(){document.getElementById('settings-panel').style.display='none';}
function openNotifications(){document.getElementById('ptitle').textContent='🔔 Уведомления';document.getElementById('pbody').innerHTML='<p style="color:#aaa">Нет новых</p>';document.getElementById('panel').style.display='block';closeBurger();}

// ====== ПРОФИЛЬ ======
function openProfile(){
  let pa=document.getElementById('prof-avatar');if(pa)pa.textContent=cur.emoji;
  let pt=document.getElementById('prof-tag');if(pt)pt.textContent='#'+tag;
  let pn=document.getElementById('prof-nick');if(pn)pn.textContent=nick;
  let sm=document.getElementById('stat-max');if(sm)sm.textContent=maxTrophies;
  let sh=document.getElementById('stat-hours');if(sh)sh.textContent=Math.floor(hours);
  let sl=document.getElementById('stat-logins');if(sl)sl.textContent=logins;
  let rb=document.getElementById('rank-badge');if(rb)rb.textContent='🥉 '+rank;
  let re=document.getElementById('rank-elo');if(re)re.textContent=elo+' ELO';
  let ap=document.getElementById('avatar-picker');if(ap)ap.style.display='none';
  let nc=document.getElementById('nick-changer');if(nc)nc.style.display='none';
  document.getElementById('profile-panel').style.display='block';
}
function closeProfile(){document.getElementById('profile-panel').style.display='none';}
function showAvatarPicker(){
  let ap=document.getElementById('avatar-picker'),h='<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">';
  heroes.filter(x=>x.owned).forEach(x=>{h+=`<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid ${x.emoji===cur.emoji?'#ffd700':'transparent'};display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer" onclick="pickAvatar('${x.emoji}')">${x.emoji}</div>`;});
  h+='</div>';ap.innerHTML=h;ap.style.display='block';
  let nc=document.getElementById('nick-changer');if(nc)nc.style.display='none';
}
function pickAvatar(e){let h=heroes.find(x=>x.emoji===e);if(h){cur=h;updateUI();saveData();openProfile();}}
function showNickChange(){
  let nc=document.getElementById('nick-changer');let ap=document.getElementById('avatar-picker');if(ap)ap.style.display='none';
  nc.innerHTML=`<input id="nick-input" placeholder="Новый ник" maxlength="16" value="${nick}" style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.5);color:#fff;font-size:13px;text-align:center;margin:4px 0"><br><button class="change-btn" onclick="saveNick()">💾 Сохранить</button>`;
  nc.style.display='block';
}
function saveNick(){let v=document.getElementById('nick-input').value.trim();if(v.length>0&&v.length<=16){nick=v;updateUI();saveData();openProfile();safeSend({type:'set_nickname',nickname:nick});}}

// ====== ПАНЕЛИ ======
function openBurger(){document.getElementById('burger-panel').style.display='block';}
function closeBurger(){document.getElementById('burger-panel').style.display='none';}
function openInvite(){document.getElementById('invite-panel').style.display='block';}
function closeInvite(){document.getElementById('invite-panel').style.display='none';}
function openShop(){document.getElementById('ptitle').textContent='🛒 Магазин';document.getElementById('pbody').innerHTML=`<p style="color:#ffd700">💎 ${gems} | 🪙 ${coins}</p><p style="color:#aaa">Скоро!</p>`;document.getElementById('panel').style.display='block';}
function openHeroes(){document.getElementById('ptitle').textContent='👥 Герои';let h='<div class="hero-grid">';heroes.forEach(x=>h+=`<div class="hc ${x.owned?'owned':'locked'}" onclick="pickHero(${x.id})"><div class="he">${x.emoji}</div><div class="hn">${x.name}</div></div>`);h+='</div>';document.getElementById('pbody').innerHTML=h;document.getElementById('panel').style.display='block';}
function openNews(){document.getElementById('ptitle').textContent='📰 Новости';document.getElementById('pbody').innerHTML='<p style="color:#aaa">Новый сезон!</p>';document.getElementById('panel').style.display='block';}
function closePanel(){document.getElementById('panel').style.display='none';}
function pickHero(id){let h=heroes.find(x=>x.id===id);if(h&&h.owned){cur=h;updateUI();saveData();closePanel();}}
// ====== ПРИГЛАШЕНИЕ ======
function inviteFriend(){
  if(!myRoomCode)myRoomCode='HS'+tag;
  safeSend({type:'create_room',code:myRoomCode,nickname:nick,avatar:cur.emoji});
  prompt('📤 Код:',myRoomCode);closeInvite();
}
function joinByCode(){
  let code=prompt('📥 Введи код:');
  if(code&&code.trim().length>0){
    safeSend({type:'join_room',code:code.trim(),nickname:nick,avatar:cur.emoji});
    closeInvite();
    alert('✅ Подключение к комнате: '+code);
  }
}
function showGuest(data){
  if(!data)return;let gb=document.getElementById('guest-badge');
  gb.innerHTML=`<span style="font-size:18px">${data.avatar}</span> <span style="color:#0c8">${data.nickname}</span> в лобби!`;gb.style.display='flex';
  if(data.nickname&&!friends.includes(data.nickname)&&!friendRequests.includes(data.nickname)){friendRequests.push(data.nickname);saveData();}
}

// ====== РЕЖИМЫ ======
function openModes(){let ml=document.getElementById('mode-list');ml.innerHTML='';modes.forEach(m=>{let sel=m.id===selectedMode?' selected':'';ml.innerHTML+=`<div class="mode-card${sel}" onclick="selectMode('${m.id}')"><span class="mc-icon">${m.icon}</span><div class="mc-info"><div class="mc-name">${m.name}</div><div class="mc-desc">${m.desc}</div></div><span class="mc-check">✅</span></div>`;});updateSelectedText();document.getElementById('modes-panel').style.display='block';}
function selectMode(id){selectedMode=id;saveData();openModes();}
function updateSelectedText(){let m=modes.find(x=>x.id===selectedMode);document.getElementById('selected-mode').textContent='Выбрано: '+m.icon+' '+m.name;}
function closeModes(){document.getElementById('modes-panel').style.display='none';}

// ====== ЗАПУСК ======
function go(mode){selectedMode=mode;saveData();closeModes();safeSend({type:'join_queue',mode,room:myRoomCode});document.getElementById('lobby').style.display='none';document.getElementById('game').style.display='flex';document.getElementById('gs').textContent='Поиск...';if(phone){document.getElementById('js').style.display='block';document.getElementById('atk').style.display='flex';}}

// ====== ДЖОЙСТИК ======
let aid=null;const js=document.getElementById('js'),jk=document.getElementById('jk');
if(phone){js.addEventListener('touchstart',e=>{e.preventDefault();aid=e.changedTouches[0].identifier;upd(e.touches[0]);});js.addEventListener('touchmove',e=>{e.preventDefault();for(let t of e.touches)if(t.identifier===aid)upd(t);});js.addEventListener('touchend',e=>{for(let t of e.changedTouches)if(t.identifier===aid){aid=null;jk.style.top='30px';jk.style.left='30px';mx=0;my=0;sendMove();}});document.getElementById('atk').addEventListener('touchstart',e=>{e.preventDefault();fire();});}
function upd(t){let r=js.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=t.clientX-cx,dy=t.clientY-cy,dist=Math.hypot(dx,dy),max=28;if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}jk.style.left=(30+dx)+'px';jk.style.top=(30+dy)+'px';mx=dx/max;my=dy/max;sendMove();}

// ====== КЛАВИАТУРА ======
document.addEventListener('keydown',e=>{if(!inMatch)return;keys[e.key]=true;upk();if(e.key===' '||e.key==='Enter'){e.preventDefault();fire();}});
document.addEventListener('keyup',e=>{keys[e.key]=false;upk();});
if(C)C.addEventListener('click',()=>{if(inMatch&&!phone)fire();});
function upk(){mx=0;my=0;if(keys['w']||keys['ArrowUp'])my=-1;if(keys['s']||keys['ArrowDown'])my=1;if(keys['a']||keys['ArrowLeft'])mx=-1;if(keys['d']||keys['ArrowRight'])mx=1;let m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m;}sendMove();}
function fire(){if(!alive||!inMatch)return;let a=enemy?Math.atan2(enemy.y-me.y,enemy.x-me.x):0;let vx=Math.cos(a)*10,vy=Math.sin(a)*10;bullets.push({x:me.x,y:me.y,vx,vy,life:50});safeSend({type:'shoot',x:me.x+vx*3,y:me.y+vy*3,vx,vy});}
function sendMove(){safeSend({type:'move',x:me.x,y:me.y});}

// ====== WEBSOCKET ======
function connect(){
  ws=new WebSocket(SVR);
  ws.onopen=()=>{safeSend({type:'set_nickname',nickname:nick});if(myRoomCode)safeSend({type:'create_room',code:myRoomCode,nickname:nick,avatar:cur.emoji});};
  ws.onmessage=e=>{
    let d=JSON.parse(e.data);
    switch(d.type){
      case 'welcome':pid=d.playerId;break;
      case 'match_found':startMatch(d);break;
      case 'enemy_moved':if(enemy){enemy.x=d.x;enemy.y=d.y;}break;
      case 'bullet':if(d.shooterId!==pid)bullets.push({x:d.x,y:d.y,vx:d.vx,vy:d.vy,life:50,enemy:true});break;
      case 'hit':if(d.targetId===pid){hp=d.hp;document.getElementById('gh').textContent=hp;spawnP(d.x,d.y,'#f44');}break;
      case 'death':if(d.playerId===pid){alive=false;document.getElementById('gs').textContent='Убит!';spawnP(me.x,me.y,'#f00',25);}if(d.killerId===pid)spawnP(enemy?.x||480,enemy?.y||270,'#ffd700',15);break;
      case 'respawn':if(enemy){enemy.x=d.x;enemy.y=d.y;enemy.alive=true;}break;
      case 'timer':document.getElementById('gm').textContent='⏱'+d.remaining+'с';break;
      case 'match_result':endMatch(d);break;
      case 'leaderboard':openLeaderboard();break;
      case 'guest_joined':showGuest(d);break;
      case 'friend_request':if(!friendRequests.includes(d.from)&&!friends.includes(d.from)&&!blocked.includes(d.from)){friendRequests.push(d.from);saveData();alert('📨 '+d.from+' хочет добавить вас в друзья!');}break;
      case 'friend_accepted':if(!friends.includes(d.from)){friends.push(d.from);friendRequests=friendRequests.filter(f=>f!==d.from);saveData();alert('✅ '+d.from+' принял заявку!');}break;
    }
  };
  ws.onclose=()=>{if(inMatch)leave();setTimeout(connect,3000);};
}
function startMatch(d){inMatch=true;alive=true;hp=100;me.x=d.yourX||150;me.y=d.yourY||270;enemy={id:d.enemy.id,nickname:d.enemy.nickname,x:me.x===150?810:150,y:270,alive:true};document.getElementById('gs').textContent='⚔️ '+enemy.nickname;document.getElementById('gh').textContent='100';document.getElementById('gm').textContent='';bullets=[];particles=[];}
function endMatch(d){inMatch=false;enemy=null;alive=true;hp=100;if(d.trophies!==undefined){trophies=d.trophies;if(trophies>maxTrophies)maxTrophies=trophies;document.getElementById('gt').textContent=trophies;if(!allHeroTrophies[cur.emoji])allHeroTrophies[cur.emoji]=0;allHeroTrophies[cur.emoji]=Math.max(allHeroTrophies[cur.emoji],trophies);}coins+=10;checkRewards();hours+=0.05;elo=Math.max(0,elo+(d.result==='win'?25:-10));if(elo>=1250)rank='ЛЕГЕНДА';else if(elo>=750)rank='ЗОЛОТО';else if(elo>=250)rank='СЕРЕБРО';else rank='БРОНЗА 1';updateUI();saveData();document.getElementById('lobby').style.display='flex';document.getElementById('game').style.display='none';bullets=[];particles=[];}
function leave(){safeSend({type:'leave_queue'});inMatch=false;enemy=null;document.getElementById('lobby').style.display='flex';document.getElementById('game').style.display='none';}
function spawnP(x,y,c,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:20,color:c});}

// ====== ОТРИСОВКА ======
function draw(){
  if(!ctx)return;ctx.clearRect(0,0,W,H);ctx.fillStyle='#111827';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,.03)';
  for(let i=0;i<W;i+=60){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke();}
  for(let i=0;i<H;i+=60){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(W,i);ctx.stroke();}
  if(enemy&&enemy.alive){ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(enemy.x,enemy.y,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f87171';ctx.beginPath();ctx.arc(enemy.x,enemy.y,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(enemy.nickname,enemy.x,enemy.y-32);}
  if(alive){ctx.fillStyle='#06b6d4';ctx.beginPath();ctx.arc(me.x,me.y,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.arc(me.x,me.y,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(nick,me.x,me.y-32);}
  bullets.forEach(b=>{ctx.fillStyle=b.enemy?'#f87171':'#fbbf24';ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();});
  particles.forEach(p=>{ctx.fillStyle=p.color;ctx.globalAlpha=p.life/20;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}
function update(){
  if(alive&&inMatch){me.x+=mx*5;me.y+=my*5;me.x=Math.max(22,Math.min(W-22,me.x));me.y=Math.max(22,Math.min(H-22,me.y));}
  bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});bullets=bullets.filter(b=>b.life>0&&b.x>0&&b.x<W&&b.y>0&&b.y<H);
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});particles=particles.filter(p=>p.life>0);
}
function loop(){update();draw();requestAnimationFrame(loop);}
if(C)loop();
connect();
