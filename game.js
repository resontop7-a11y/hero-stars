// ====== ЗАГРУЗКА ======
let lp=0;
(function tick(){
  lp+=3;if(lp>100)lp=100;
  document.getElementById('loadbar').style.width=lp+'%';
  if(lp<100)setTimeout(tick,50);
  else{
    document.getElementById('loadsub').textContent='Готово!';
    setTimeout(()=>{
      document.getElementById('loading').style.display='none';
      document.getElementById('lobby').style.display='block';
    },400);
  }
})();

// ====== ДАННЫЕ ======
const SVR='wss://hero-stars.onrender.com';
let ws,pid,trophies=0,maxTrophies=0,nick='Огонёк',tag='HERO123';
let fame=0,hours=0,logins=1,elo=0,rank='БРОНЗА 1';
let inMatch=false,alive=true,hp=100;
let enemy=null,mx=0,my=0,me={x:480,y:270},bullets=[],particles=[];
let keys={},phone=/Android|iPhone|iPad/i.test(navigator.userAgent);
const C=document.getElementById('c'),ctx=C.getContext('2d'),W=960,H=540;
let selectedMode='showdown';

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

// Загрузка
if(localStorage.getItem('hs_data')){
  let d=JSON.parse(localStorage.getItem('hs_data'));
  trophies=d.trophies||0;maxTrophies=d.maxTrophies||0;nick=d.nick||'Огонёк';
  tag=d.tag||'HERO123';fame=d.fame||0;hours=d.hours||0;logins=d.logins||1;
  elo=d.elo||0;rank=d.rank||'БРОНЗА 1';selectedMode=d.mode||'showdown';
  cur=heroes.find(h=>h.emoji===d.avatar)||heroes[0];
}
logins++;
saveData();

function saveData(){
  localStorage.setItem('hs_data',JSON.stringify({
    trophies,maxTrophies,nick,tag,fame,hours,logins,elo,rank,avatar:cur.emoji,mode:selectedMode
  }));
}

function updateUI(){
  document.getElementById('hbox').textContent=cur.emoji;
  document.getElementById('hname').textContent=nick;
  document.getElementById('avatar-btn').textContent=cur.emoji;
  document.getElementById('fpfill').style.width=fame+'%';
  document.getElementById('fptext').textContent=fame+'/100';
}
updateUI();

// ====== РЕЖИМЫ ======
function openModes(){
  let ml=document.getElementById('mode-list');
  ml.innerHTML='';
  modes.forEach(m=>{
    let sel=m.id===selectedMode?' selected':'';
    ml.innerHTML+=`<div class="mode-card${sel}" onclick="selectMode('${m.id}')">
      <span class="mc-icon">${m.icon}</span>
      <div class="mc-info"><div class="mc-name">${m.name}</div><div class="mc-desc">${m.desc}</div></div>
      <span class="mc-check">✅</span>
    </div>`;
  });
  updateSelectedText();
  document.getElementById('modes-panel').style.display='block';
}
function selectMode(id){
  selectedMode=id;saveData();
  openModes();
}
function updateSelectedText(){
  let m=modes.find(x=>x.id===selectedMode);
  document.getElementById('selected-mode').textContent='Выбрано: '+m.icon+' '+m.name;
}
function closeModes(){document.getElementById('modes-panel').style.display='none';}

// ====== ПРОФИЛЬ ======
function openProfile(){
  document.getElementById('prof-avatar').textContent=cur.emoji;
  document.getElementById('prof-tag').textContent='#'+tag;
  document.getElementById('prof-nick').textContent=nick;
  document.getElementById('stat-max').textContent=maxTrophies;
  document.getElementById('stat-hours').textContent=Math.floor(hours);
  document.getElementById('stat-logins').textContent=logins;
  document.getElementById('rank-badge').textContent='🥉 '+rank;
  document.getElementById('rank-elo').textContent=elo+' ELO';
  document.getElementById('avatar-picker').style.display='none';
  document.getElementById('nick-changer').style.display='none';
  document.getElementById('profile-panel').style.display='block';
}
function closeProfile(){document.getElementById('profile-panel').style.display='none';}

function showAvatarPicker(){
  let ap=document.getElementById('avatar-picker');
  let html='<div class="avatar-pick">';
  heroes.forEach(h=>{
    if(!h.owned)return;
    let sel=h.emoji===cur.emoji?' selected':'';
    html+=`<div class="ap${sel}" onclick="pickAvatar('${h.emoji}')">${h.emoji}</div>`;
  });
  html+='</div>';
  ap.innerHTML=html;
  ap.style.display='block';
  document.getElementById('nick-changer').style.display='none';
}
function pickAvatar(emoji){
  let h=heroes.find(x=>x.emoji===emoji);
  if(h){cur=h;updateUI();saveData();openProfile();}
}

function showNickChange(){
  document.getElementById('avatar-picker').style.display='none';
  let nc=document.getElementById('nick-changer');
  nc.innerHTML=`<input id="nick-input" placeholder="Новый никнейм" maxlength="16" value="${nick}"><br><button class="change-btn" onclick="saveNick()">💾 Сохранить</button>`;
  nc.style.display='block';
}
function saveNick(){
  let val=document.getElementById('nick-input').value.trim();
  if(val.length>0&&val.length<=16){
    nick=val;updateUI();saveData();openProfile();
    if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'set_nickname',nickname:nick}));
  }
}

// ====== ПАНЕЛИ ======
function openBurger(){document.getElementById('burger-panel').style.display='block';}
function closeBurger(){document.getElementById('burger-panel').style.display='none';}
function openInvite(){document.getElementById('invite-panel').style.display='block';}
function closeInvite(){document.getElementById('invite-panel').style.display='none';}

function openPanel(t){
  if(t==='shop'){
    document.getElementById('ptitle').textContent='🛒 Магазин';
    document.getElementById('pbody').innerHTML='<p style="color:#aaa">Скины, ящики, золото — скоро!</p>';
  }
  if(t==='heroes'){
    document.getElementById('ptitle').textContent='👥 Герои';
    let h='<div class="hero-grid">';
    heroes.forEach(x=>h+=`<div class="hc ${x.owned?'owned':'locked'}" onclick="pickHero(${x.id})"><div class="he">${x.emoji}</div><div class="hn">${x.name}</div></div>`);
    h+='</div>';document.getElementById('pbody').innerHTML=h;
  }
  if(t==='news'){
    document.getElementById('ptitle').textContent='📰 Новости';
    document.getElementById('pbody').innerHTML='<p style="color:#aaa">🔥 Новый сезон!</p><p style="color:#aaa">🏆 Герой недели: Огонёк</p>';
  }
  document.getElementById('panel').style.display='block';
}
function closePanel(){document.getElementById('panel').style.display='none';}

function pickHero(id){
  let h=heroes.find(x=>x.id===id);if(!h.owned)return;
  cur=h;updateUI();saveData();closePanel();
}

function showLB(){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'get_leaderboard'}));}
function openSettings(){
  document.getElementById('ptitle').textContent='⚙️ Настройки';
  document.getElementById('pbody').innerHTML='<p style="color:#aaa">Громкость</p><p style="color:#aaa">Язык: Русский</p>';
  document.getElementById('panel').style.display='block';closeBurger();
}
function openNotifications(){
  document.getElementById('ptitle').textContent='🔔 Уведомления';
  document.getElementById('pbody').innerHTML='<p style="color:#aaa">Нет новых уведомлений</p>';
  document.getElementById('panel').style.display='block';closeBurger();
}
function inviteFriend(){
  let code='HS'+Math.random().toString(36).slice(2,8).toUpperCase();
  prompt('📤 Отправь код другу:',code);closeInvite();
}
function joinByCode(){
  let code=prompt('📥 Введи код:');
  if(code)alert('Подключение: '+code);closeInvite();
}

// ====== ЗАПУСК ======
function go(mode){
  selectedMode=mode;saveData();closeModes();
  if(ws&&ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify({type:'join_queue',mode}));
    document.getElementById('lobby').style.display='none';
    document.getElementById('game').style.display='flex';
    document.getElementById('gs').textContent='Поиск...';
    if(phone){document.getElementById('js').style.display='block';document.getElementById('atk').style.display='flex';}
  }
}

// ====== ДЖОЙСТИК ======
let aid=null;
const js=document.getElementById('js'),jk=document.getElementById('jk');
if(phone){
  js.addEventListener('touchstart',e=>{e.preventDefault();aid=e.changedTouches[0].identifier;upd(e.touches[0]);});
  js.addEventListener('touchmove',e=>{e.preventDefault();for(let t of e.touches)if(t.identifier===aid)upd(t);});
  js.addEventListener('touchend',e=>{for(let t of e.changedTouches)if(t.identifier===aid){aid=null;jk.style.top='30px';jk.style.left='30px';mx=0;my=0;send();}});
  document.getElementById('atk').addEventListener('touchstart',e=>{e.preventDefault();fire();});
}
function upd(t){
  let r=js.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=t.clientX-cx,dy=t.clientY-cy,dist=Math.hypot(dx,dy),max=28;
  if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}
  jk.style.left=(30+dx)+'px';jk.style.top=(30+dy)+'px';
  mx=dx/max;my=dy/max;send();
}

// ====== КЛАВИАТУРА ======
document.addEventListener('keydown',e=>{if(!inMatch)return;keys[e.key]=true;upk();if(e.key===' '||e.key==='Enter'){e.preventDefault();fire();}});
document.addEventListener('keyup',e=>{keys[e.key]=false;upk();});
C.addEventListener('click',()=>{if(inMatch&&!phone)fire();});
function upk(){
  mx=0;my=0;
  if(keys['w']||keys['ArrowUp'])my=-1;
  if(keys['s']||keys['ArrowDown'])my=1;
  if(keys['a']||keys['ArrowLeft'])mx=-1;
  if(keys['d']||keys['ArrowRight'])mx=1;
  let m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m;}send();
}
function fire(){
  if(!alive||!inMatch)return;
  let a=enemy?Math.atan2(enemy.y-me.y,enemy.x-me.x):0;
  let vx=Math.cos(a)*10,vy=Math.sin(a)*10;
  bullets.push({x:me.x,y:me.y,vx,vy,life:50});
  if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'shoot',x:me.x+vx*3,y:me.y+vy*3,vx,vy}));
}
function send(){if(ws&&ws.readyState===WebSocket.OPEN&&inMatch)ws.send(JSON.stringify({type:'move',x:me.x,y:me.y}));}

// ====== WEBSOCKET ======
function connect(){
  ws=new WebSocket(SVR);
  ws.onopen=()=>ws.send(JSON.stringify({type:'set_nickname',nickname:nick}));
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
      case 'enemy_respawned':if(enemy){enemy.x=d.x;enemy.y=d.y;enemy.alive=true;}break;
      case 'timer':document.getElementById('gm').textContent='⏱'+d.remaining+'с';break;
      case 'match_result':endMatch(d);break;
      case 'leaderboard':lbp(d.data);break;
    }
  };
  ws.onclose=()=>{if(inMatch)leave();setTimeout(connect,3000);};
}
function startMatch(d){
  inMatch=true;alive=true;hp=100;me.x=d.yourX||150;me.y=d.yourY||270;
  enemy={id:d.enemy.id,nickname:d.enemy.nickname,x:me.x===150?810:150,y:270,alive:true};
  document.getElementById('gs').textContent='⚔️ '+enemy.nickname;
  document.getElementById('gh').textContent='100';document.getElementById('gm').textContent='';
  bullets=[];particles=[];
}
function endMatch(d){
  inMatch=false;enemy=null;alive=true;hp=100;
  if(d.trophies!==undefined){
    trophies=d.trophies;
    if(trophies>maxTrophies)maxTrophies=trophies;
    document.getElementById('gt').textContent=trophies;
  }
  fame=Math.min(100,fame+10);hours+=0.05;
  elo=Math.max(0,elo+(d.result==='win'?15:-8));
  if(elo>=100)rank='БРОНЗА 2';else if(elo>=50)rank='БРОНЗА 1';
  updateUI();saveData();
  document.getElementById('lobby').style.display='block';document.getElementById('game').style.display='none';bullets=[];particles=[];
}
function leave(){
  if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'leave_queue'}));
  inMatch=false;enemy=null;document.getElementById('lobby').style.display='block';document.getElementById('game').style.display='none';
}
function lbp(data){
  document.getElementById('ptitle').textContent='🏆 Лидеры';let h='<ol style="text-align:left">';
  data.slice(0,20).forEach(x=>h+=`<li>${x.nickname} - ${x.trophies} 🏆</li>`);h+='</ol>';
  document.getElementById('pbody').innerHTML=h;document.getElementById('panel').style.display='block';
}
function spawnP(x,y,c,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:20,color:c});}

// ====== ОТРИСОВКА ======
function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#111827';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.03)';for(let i=0;i<W;i+=60){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke();}for(let i=0;i<H;i+=60){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(W,i);ctx.stroke();}
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

connect();loop();
