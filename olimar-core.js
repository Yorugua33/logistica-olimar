
const K='olimar_moto_v1',BASE={lat:-37.1667,lng:-56.9};
const def={cfg:{base:BASE,bajada:1500,km:900,min:2500,com:20,pin:'1234',demo:false},
 drivers:[{id:1,n:'Carlos Pérez',tel:'2255 000001',moto:'Honda Wave 110',pat:'AB123CD',pin:'1111',on:false,lat:BASE.lat,lng:BASE.lng},{id:2,n:'Lucía Gómez',tel:'2255 000002',moto:'Yamaha YBR 125',pat:'CD456EF',pin:'2222',on:false,lat:BASE.lat+.004,lng:BASE.lng-.004}],
 clients:[],rides:[],caja:null,cierres:[],seq:1,did:3,cid:1,lastBackup:0};
let S,me=null,tab='desp',Q={pay:'Efectivo'},MAP,LG,DM={},PV={};
try{me=JSON.parse(localStorage.getItem('om_me_'+ROLE)||'null');if(me&&me.role!=ROLE)me=null}catch(e){}
const load=()=>{try{S=Object.assign({},def,JSON.parse(localStorage.getItem(K)||'{}'));S.cfg=Object.assign({},def.cfg,S.cfg)}catch(e){S=JSON.parse(JSON.stringify(def))}};
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){toast('Almacenamiento lleno')}};
const tx=f=>{load();const r=f();save();return r};
load();
const $=n=>'$ '+Math.round(n).toLocaleString('es-AR');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hora=t=>new Date(t).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'});
const q=s=>document.querySelector(s),isToday=t=>new Date(t).toDateString()==new Date().toDateString();
const ST={busca:'Buscando',acept:'Moto en camino',espera:'Esperando',viaje:'En viaje',fin:'Finalizado',canc:'Cancelado'},ACT=['busca','acept','espera','viaje'],RUN=['acept','espera','viaje'];
function toast(m){const t=q('#toast');t.style.display='none';void t.offsetWidth;t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',2800)}
q('#yr').textContent=new Date().getFullYear();
const hav=(a,b,c,d)=>{const r=x=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(h))};
const quote=km=>Math.max(S.cfg.min,Math.round((S.cfg.bajada+km*S.cfg.km)/10)*10);
const dur=km=>Math.max(4000,km/28*3600000/(S.cfg.demo?20:1));
const drv=()=>S.drivers.find(d=>d.id==me.id),cli=()=>S.clients.find(c=>c.id==me.id),dOf=id=>S.drivers.find(d=>d.id==id);
const act=did=>S.rides.find(r=>r.did==did&&RUN.includes(r.st));
const rat=d=>{const a=S.rides.filter(r=>r.did==d.id&&r.rt);return a.length?(a.reduce((s,r)=>s+r.rt,0)/a.length).toFixed(1):'—'};
const mine=did=>S.rides.filter(r=>r.did==did&&r.st=='fin');
const bal=did=>mine(did).filter(r=>!r.liq).reduce((a,r)=>a+(r.pay=='Efectivo'?-r.price*r.cp/100:r.price*(1-r.cp/100)),0);
/* ---- rutas y posiciones ---- */
const RC={};
async function route(a,b){const key=[a.lat,a.lng,b.lat,b.lng].map(x=>x.toFixed(5)).join();if(RC[key])return RC[key];let out;
 try{const j=await (await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`,{signal:AbortSignal.timeout(4500)})).json(),c=j.routes[0].geometry.coordinates,st=Math.ceil(c.length/150);
  out={km:j.routes[0].distance/1000,path:c.filter((_,i)=>i%st==0||i==c.length-1).map(x=>[x[1],x[0]])}}
 catch(e){out={km:Math.max(.3,hav(a.lat,a.lng,b.lat,b.lng)*1.3),path:[[a.lat,a.lng],[b.lat,b.lng]]}}
 return RC[key]=out}
function along(p,k){if(p.length<2||k<=0)return p[0];if(k>=1)return p[p.length-1];const L=[0];for(let i=1;i<p.length;i++)L[i]=L[i-1]+hav(p[i-1][0],p[i-1][1],p[i][0],p[i][1]);const T=L[L.length-1]*k;let i=1;while(L[i]<T)i++;const u=(T-L[i-1])/((L[i]-L[i-1])||1);return[p[i-1][0]+(p[i][0]-p[i-1][0])*u,p[i-1][1]+(p[i][1]-p[i-1][1])*u]}
function drvPos(d){const r=act(d.id);if(!r)return{p:[d.lat,d.lng],r:null,k:0};if(r.st=='espera')return{p:[r.o.lat,r.o.lng],r,k:1};const k=Math.min(1,(Date.now()-r.leg.t0)/r.leg.dur);return{p:along(r.leg.path,k),r,k}}
/* ---- acciones de viaje ---- */
async function accept(id,did){const r0=S.rides.find(x=>x.id==id),f=drvPos(dOf(did)).p,rt=await route({lat:f[0],lng:f[1]},r0.o);
 const ok=tx(()=>{const r=S.rides.find(x=>x.id==id);if(!r||r.st!='busca'||act(did))return false;r.did=did;r.st='acept';r.ts.acc=Date.now();r.leg={t0:Date.now(),dur:dur(rt.km),path:rt.path};return true});
 toast(ok?'Viaje asignado':'Ya no está disponible');refresh(1)}
const step=(id,fn)=>{tx(()=>{const r=S.rides.find(x=>x.id==id);r&&fn(r)});refresh(1)};
const arrive=id=>step(id,r=>{r.st='espera';r.ts.esp=Date.now()});
const start=id=>step(id,r=>{r.st='viaje';r.ts.ini=Date.now();r.leg={t0:Date.now(),dur:dur(r.km),path:r.rp.path}});
function finish(id){step(id,r=>{r.st='fin';r.ts.fin=Date.now();const d=dOf(r.did);d.lat=r.d.lat;d.lng=r.d.lng});burst();toast('Viaje finalizado ✔')}
const cancel=id=>{if(confirm('¿Cancelar el viaje?'))step(id,r=>{r.st='canc';r.cb=me.role;r.ts.can=Date.now()})};
function rate(id,n){step(id,r=>r.rt=n);burst();toast('¡Gracias por calificar!')}
function pedir(){if(!Q.o||!Q.d||!Q.km)return toast('Elegí origen y destino');
 const c=me.role=='c'?cli():{id:0,n:(q('#on')?.value.trim())||'Cliente telefónico',tel:q('#ot')?.value.trim()||''};
 tx(()=>{S.rides.push({id:S.seq++,cid:c.id,cn:c.n,ctel:c.tel,o:Q.o,d:Q.d,km:Q.km,rp:{path:Q.path},price:quote(Q.km),pay:Q.pay,cp:S.cfg.com,st:'busca',ts:{req:Date.now()}})});
 Q={pay:Q.pay};window.pk=0;toast('Buscando moto cercana…');refresh(1)}
function setOn(on){tx(()=>{dOf(me.id).on=on});refresh(1)}
/* ---- selección de puntos ---- */
async function rev(p){try{const j=await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}`,{signal:AbortSignal.timeout(4000)})).json();return(j.display_name||'').split(',').slice(0,2).join(',')||'Punto en el mapa'}catch(e){return'Punto en el mapa'}}
async function setPt(k,p){Q[k]={lat:p.lat,lng:p.lng,t:'Punto en el mapa'};window.pk=(k=='o'&&!Q.d)?'d':0;document.body.classList.toggle('pk',!!window.pk);refresh(1);calcQ();rev(p).then(t=>{if(Q[k]){Q[k].t=t;refresh()}})}
async function calcQ(){if(!Q.o||!Q.d)return;const r=await route(Q.o,Q.d);Q.km=r.km;Q.path=r.path;refresh(1)}
function pickM(k){window.pk=k;document.body.classList.add('pk');toast('Tocá el mapa para elegir '+(k=='o'?'el origen':'el destino'))}
async function geoQ(k){const v=q('#q'+k).value.trim();if(!v)return;toast('Buscando…');const b=S.cfg.base;
 try{const j=await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=${b.lng-.6},${b.lat+.6},${b.lng+.6},${b.lat-.6}&q=`+encodeURIComponent(v),{signal:AbortSignal.timeout(5000)})).json();
 if(!j.length)return toast('No la encontré: sumá la localidad o usá el mapa');const p={lat:+j[0].lat,lng:+j[0].lon};Q[k]={...p,t:v};if(MAP)MAP.flyTo([p.lat,p.lng],15);refresh(1);calcQ()}catch(e){toast('Sin internet: usá el mapa')}}
function gps(){navigator.geolocation?.getCurrentPosition(p=>{if(me.role=='d'){tx(()=>{const d=dOf(me.id);d.lat=p.coords.latitude;d.lng=p.coords.longitude});refresh(1)}else setPt('o',{lat:p.coords.latitude,lng:p.coords.longitude})},()=>toast('No pude obtener tu ubicación'))}
function mapClick(e){const p={lat:e.latlng.lat,lng:e.latlng.lng};
 if(window.pk=='base'){tx(()=>{S.cfg.base=p});window.pk=0;document.body.classList.remove('pk');toast('Base fijada');return refresh(1)}
 if(window.pk=='o'||window.pk=='d')return setPt(window.pk,p);
 if(me.role=='d'&&!act(me.id)){tx(()=>{const d=dOf(me.id);d.lat=p.lat;d.lng=p.lng});toast('Ubicación actualizada');refresh(1)}}
/* ---- audio / efectos ---- */
function beep(){try{const a=new(window.AudioContext||webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.setValueAtTime(.15,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.5);o.start();o.stop(a.currentTime+.5)}catch(e){}}
function burst(){const cs=['#6ff0dd','#ffb43a','#ff6b5b','#fff'];for(let i=0;i<40;i++){const s=document.createElement('i');s.className='cf';s.style.cssText=`left:${40+Math.random()*20}%;background:${cs[i%4]};--dx:${(Math.random()-.5)*700}px;--dr:${Math.random()*720}deg;animation-delay:${Math.random()*.15}s`;document.body.appendChild(s);setTimeout(()=>s.remove(),1800)}}
function countUp(){const red=matchMedia('(prefers-reduced-motion:reduce)').matches;document.querySelectorAll('[data-n]').forEach(el=>{const to=+el.dataset.n,k=el.dataset.k,from=PV[k]||0,m=el.dataset.m,f=v=>m?$(v):Math.round(v);PV[k]=to;if(red||from==to){el.textContent=f(to);return}
 const t0=performance.now();(function s(t){const u=Math.min(1,(t-t0)/700),e=1-Math.pow(1-u,3);el.textContent=f(from+(to-from)*e);if(u<1)requestAnimationFrame(s)})(t0)})}
function tilt(){document.querySelectorAll('.role').forEach(c=>{c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*14}deg) rotateX(${-y*14}deg)`};c.onmouseleave=()=>c.style.transform=''})}
/* ---- ingreso ---- */
const LOGO='<div class="lw" style="margin:auto;transform:scale(2)"><div class="logo"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>';
function roles(){const lr=ROLE;q('#scr').innerHTML=`${LOGO}<h1 style="margin-top:44px;font-size:34px">${TITLE}</h1><p class="mut">${SUB}</p>
 <div class="login" id="lg" style="margin-top:24px">${lr=='c'?`<label>Nombre</label><input id="ln" autocomplete="name"><label>Teléfono</label><input id="lt" type="tel"><button class="btn big am" onclick="inC()">Entrar</button>`:lr=='d'?`<label>Chofer</label><select id="ls">${S.drivers.map(d=>`<option value="${d.id}">${esc(d.n)}</option>`).join('')}</select><label>PIN</label><input id="lp" type="password" inputmode="numeric"><button class="btn big am" onclick="inD()">Entrar</button><p class="mut">Demo: Carlos 1111 · Lucía 2222</p>`:`<label>PIN del operador</label><input id="lp" type="password" inputmode="numeric"><button class="btn big am" onclick="inO()">Entrar</button><p class="mut">PIN inicial: 1234 (cambialo en Tarifas)</p>`}</div>`}
function setMe(o){me=o;localStorage.setItem('om_me_'+ROLE,JSON.stringify(o));Q={pay:'Efectivo'};tab='desp';window.pk=0;show()}
function inC(){const n=q('#ln').value.trim(),t=q('#lt').value.trim();if(!n||!t)return toast('Completá nombre y teléfono');const id=tx(()=>{let c=S.clients.find(x=>x.tel==t);if(!c){c={id:S.cid++,n,tel:t};S.clients.push(c)}return c.id});setMe({role:'c',id})}
function inD(){const d=dOf(+q('#ls').value);if(d.pin!=q('#lp').value)return toast('PIN incorrecto');setMe({role:'d',id:d.id})}
function inO(){if(q('#lp').value!=S.cfg.pin)return toast('PIN incorrecto');setMe({role:'o',id:0})}
function salir(){me=null;localStorage.removeItem('om_me_'+ROLE);window._lr=0;show()}
const TABS=[['desp','Despacho'],['ch','Choferes'],['cl','Clientes'],['caja','Caja'],['tar','Tarifas'],['resp','Respaldo']];
function show(){load();if(!me){q('#app').hidden=true;q('#scr').hidden=false;roles();return}
 q('#scr').hidden=true;q('#app').hidden=false;
 q('#nav').innerHTML=(me.role=='o'?TABS.map(([k,n])=>`<button class="${k==tab?'on':''}" onclick="tab='${k}';show()">${n}</button>`).join(''):'')+`<span class="chip">${{c:'Cliente',d:'Chofer',o:'Operador'}[me.role]}</span><button onclick="salir()">Salir</button>`;
 mapInit();refresh(1);if(MAP&&me.role=='c'&&!Q.o)gps()}
/* ---- mapa ---- */
function mapInit(){if(MAP||typeof L=='undefined'){if(typeof L=='undefined')q('#map').innerHTML='<div class="mut" style="padding:40px">El mapa necesita internet (Leaflet + OpenStreetMap). Revisá la conexión y recargá.</div>';else setTimeout(()=>MAP.invalidateSize(),60);return}
 MAP=L.map('map',{zoomControl:false}).setView([S.cfg.base.lat,S.cfg.base.lng],14);L.control.zoom({position:'bottomright'}).addTo(MAP);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(MAP);LG=L.layerGroup().addTo(MAP);MAP.on('click',mapClick)}
const ic=(n,h)=>L.divIcon({className:'',html:h,iconSize:[n,n],iconAnchor:[n/2,n/2]});
function pinAt(p,c,t,tip,n=36){const m=L.marker([p.lat,p.lng],{icon:ic(n,`<div class="pin ${c}">${t}</div>`)}).addTo(LG);tip&&m.bindTooltip(esc(tip));return m}
function dMark(d){const m=L.marker(drvPos(d).p,{icon:ic(44,`<div class="pin m ${act(d.id)?'busy':''}">🏍️</div>`),zIndexOffset:900}).addTo(LG).bindTooltip(esc(d.n));DM[d.id]=m}
function drawRide(r){pinAt(r.o,'o','A',r.o.t);pinAt(r.d,'d','B',r.d.t);const pth=r.leg&&r.st!='busca'?r.leg.path:(r.rp?.path||[[r.o.lat,r.o.lng],[r.d.lat,r.d.lng]]);L.polyline(pth,{color:'#6ff0dd',weight:4,className:'route'}).addTo(LG)}
function layers(){if(!MAP)return;LG.clearLayers();DM={};pinAt(S.cfg.base,'base','🏠','Base Olimar',34);let pts=[],key='';
 if(me.role=='c'){const r=S.rides.filter(x=>x.cid==me.id).slice(-1)[0];
  if(r&&ACT.includes(r.st)){drawRide(r);pts=[[r.o.lat,r.o.lng],[r.d.lat,r.d.lng]];key=r.id+r.st;if(r.did)dMark(dOf(r.did))}
  else{Q.o&&pinAt(Q.o,'o','A');Q.d&&pinAt(Q.d,'d','B');Q.path&&L.polyline(Q.path,{color:'#ffb43a',weight:4,className:'route'}).addTo(LG);pts=[Q.o,Q.d].filter(Boolean).map(p=>[p.lat,p.lng]);key='q'+pts.length;
   S.drivers.filter(d=>d.on&&!act(d.id)).forEach(dMark)}}
 if(me.role=='d'){const d=drv(),a=act(d.id);dMark(d);if(a){drawRide(a);pts=[drvPos(d).p,[a.o.lat,a.o.lng],[a.d.lat,a.d.lng]];key=a.id+a.st}
  else if(d.on){S.rides.filter(r=>r.st=='busca').forEach(r=>pinAt(r.o,'q','!',r.o.t));key='d'}}
 if(me.role=='o'){S.drivers.filter(d=>d.on).forEach(dMark);S.rides.filter(r=>ACT.includes(r.st)).forEach(drawRide);Q.o&&pinAt(Q.o,'o','A');Q.d&&pinAt(Q.d,'d','B');key='o'}
 if(key&&key!=window._fit&&pts.length){window._fit=key;const w=innerWidth>800;MAP.fitBounds(pts,{paddingTopLeft:[w?430:40,60],paddingBottomRight:[40,w?60:290],maxZoom:16,animate:true,duration:1})}}
function refresh(f){if(!me)return;const a=document.activeElement,typing=a&&/INPUT|SELECT/.test(a.tagName)&&a.closest('#panel,#page');if(f||!typing)ui();layers()}
function ui(){const m=me.role,page=m=='o'&&tab!='desp';q('#mapwrap').hidden=page;q('#page').hidden=!page;
 if(page)q('#page').innerHTML=pageOp();else{q('#panel').innerHTML=m=='c'?pC():m=='d'?pD():pO();MAP&&MAP.invalidateSize()}countUp()}
/* ---- loop de animación ---- */
let last=0;function loop(t){requestAnimationFrame(loop);if(!me||!MAP)return;S.drivers.forEach(d=>{const m=DM[d.id];if(m)m.setLatLng(drvPos(d).p)});if(t-last>400){last=t;domTick()}}
function domTick(){document.querySelectorAll('[data-rid]').forEach(el=>{const r=S.rides.find(x=>x.id==el.dataset.rid);if(!r||!r.leg)return;const k=r.st=='espera'?1:Math.min(1,(Date.now()-r.leg.t0)/r.leg.dur),t=el.dataset.t;
 if(t=='eta')el.textContent=r.st=='espera'?'Llegó':k>=1?'Llegando':Math.max(1,Math.ceil(r.leg.dur*(1-k)/60000))+' min';
 if(t=='bar')el.style.width=(k*100)+'%';if(t=='btn')el.disabled=k<.98})}
requestAnimationFrame(loop);
/* ---- panel CLIENTE ---- */
const steps=r=>{const i=ACT.indexOf(r.st);return`<div class="steps">${['Buscando','En camino','Llegó','En viaje'].map((s,j)=>`<div class="${j<i?'done':j==i?'now':''}"><i></i>${s}</div>`).join('')}</div>`};
const ptTxt=r=>`<div class="line"><span class="mut">A</span><span>${esc(r.o.t)}</span></div><div class="line"><span class="mut">B</span><span>${esc(r.d.t)}</span></div>`;
function pC(){const c=cli(),r=S.rides.filter(x=>x.cid==me.id).slice(-1)[0];
 if(r&&ACT.includes(r.st)){const d=r.did&&dOf(r.did);return`<h2>${ST[r.st]}</h2>${steps(r)}
  ${r.st=='busca'?'<div class="radar">🏍️</div><p class="mut" style="text-align:center">Buscando la moto más cercana…</p>':`<div class="drv"><div class="av">${esc(d.n[0])}</div><div style="flex:1"><b>${esc(d.n)}</b><div class="mut">${esc(d.moto)} · ${esc(d.pat)} · ⭐ ${rat(d)}</div></div><span class="tag w" data-rid="${r.id}" data-t="eta">…</span></div><div class="bar"><i data-rid="${r.id}" data-t="bar"></i></div>`}
  ${ptTxt(r)}<div class="line"><span>Total (${esc(r.pay)})</span><b class="in">${$(r.price)}</b></div>
  <div class="row" style="margin-top:12px">${d?`<a class="btn sm gh" style="text-decoration:none" href="tel:${esc(d.tel)}">📞 Llamar</a>`:''}${r.st!='viaje'?`<button class="btn sm rd" onclick="cancel(${r.id})">Cancelar viaje</button>`:''}</div>`}
 if(r&&r.st=='fin'&&!r.rt)return`<h2>¡Llegaste! 🎉</h2><p class="mut">Total ${$(r.price)} · ${esc(r.pay)}</p><h3>Calificá a ${esc(dOf(r.did).n)}</h3><div class="stars" style="text-align:center">${[1,2,3,4,5].map(n=>`<button onclick="rate(${r.id},${n})">⭐</button>`).join('')}</div>`;
 return`<h2>¿A dónde vas, ${esc(c.n.split(' ')[0])}?</h2>${formQ()}
  <h3>Mis viajes</h3>${S.rides.filter(x=>x.cid==me.id&&['fin','canc'].includes(x.st)).slice(-4).reverse().map(x=>`<div class="line"><span>${esc(x.d.t)}<div class="mut">${hora(x.ts.req)}</div></span><span class="${x.st=='fin'?'in':'out'}">${x.st=='fin'?$(x.price):'Cancelado'}</span></div>`).join('')||'<span class="mut">Todavía no hiciste viajes.</span>'}`}
function formQ(op){return`<label>Origen</label><div class="row"><input id="qo" placeholder="Dirección o 📍" value="${esc(Q.o?.t||'')}" onkeydown="event.key=='Enter'&&geoQ('o')"><button class="btn sm" onclick="gps()">📍</button><button class="btn sm gh" onclick="pickM('o')">Mapa</button></div>
 <label>Destino</label><div class="row"><input id="qd" placeholder="Dirección de destino" value="${esc(Q.d?.t||'')}" onkeydown="event.key=='Enter'&&geoQ('d')"><button class="btn sm" onclick="geoQ('d')">Buscar</button><button class="btn sm gh" onclick="pickM('d')">Mapa</button></div>
 ${Q.km?`<div class="quote"><span>${Q.km.toFixed(1)} km · ~${Math.max(1,Math.round(Q.km/28*60))} min</span><b data-n="${quote(Q.km)}" data-m="1" data-k="qt">$ 0</b></div>`:''}
 <label>Pago</label><select onchange="Q.pay=this.value">${['Efectivo','Transferencia','Mercado Pago'].map(m=>`<option ${Q.pay==m?'selected':''}>${m}</option>`).join('')}</select>
 <button class="btn am big ${Q.km?'pulse':''}" onclick="pedir()" ${Q.km?'':'disabled'}>${op?'Crear y despachar':'Pedir moto'}</button>`}
/* ---- panel CHOFER ---- */
function pD(){const d=drv(),a=act(d.id),h=mine(d.id).filter(r=>isToday(r.ts.fin)),gan=h.reduce((s,r)=>s+r.price*(1-r.cp/100),0),b=bal(d.id);
 const head=`<div class="row"><div class="av">${esc(d.n[0])}</div><div style="flex:1"><b>${esc(d.n)}</b><div class="mut">${esc(d.moto)} · ⭐ ${rat(d)}</div></div><label class="sw" style="margin:0"><input type="checkbox" ${d.on?'checked':''} ${a?'disabled':''} onchange="setOn(this.checked)"><span></span></label></div>`;
 if(a){const need=a.st=='acept'?['Llegué',`arrive(${a.id})`]:a.st=='espera'?['Iniciar viaje',`start(${a.id})`]:['Finalizar viaje',`finish(${a.id})`];
  return head+`<h3>Viaje #${a.id}</h3>${steps(a)}<div class="drv"><div style="flex:1"><b>${esc(a.cn)}</b><div class="mut">${esc(a.ctel)}</div></div><span class="tag w" data-rid="${a.id}" data-t="eta">…</span></div><div class="bar"><i data-rid="${a.id}" data-t="bar"></i></div>${ptTxt(a)}
  <div class="line"><span>Cobrar (${esc(a.pay)})</span><b class="in">${$(a.price)}</b></div>
  <button class="btn am big" ${a.st=='espera'?'':`data-rid="${a.id}" data-t="btn" disabled`} onclick="${need[1]}">${need[0]}</button>${a.st!='viaje'?`<button class="btn rd big" style="margin-top:8px" onclick="cancel(${a.id})">Cancelar</button>`:''}`}
 const reqs=d.on?S.rides.filter(r=>r.st=='busca').map(r=>({r,k:hav(d.lat,d.lng,r.o.lat,r.o.lng)})).sort((x,y)=>x.k-y.k):[];
 return head+`<div class="kpis" style="margin-top:12px"><div class="kpi"><b data-n="${h.length}" data-k="dh">0</b><span>Viajes hoy</span></div><div class="kpi"><b data-n="${gan}" data-m="1" data-k="dg">$ 0</b><span>Ganancia hoy</span></div><div class="kpi"><b class="${b<0?'out':'in'}">${$(b)}</b><span>${b<0?'Debés a la central':'La central te debe'}</span></div></div>
 ${!d.on?'<p class="mut">Estás fuera de línea. Activá el interruptor para recibir viajes.</p>':`<h3>Pedidos cercanos</h3>${reqs.map(({r,k})=>`<div class="req"><div class="row"><b>${$(r.price*(1-r.cp/100))}</b><span class="mut">ganás · ${r.km.toFixed(1)} km</span><span class="tag w" style="margin-left:auto">a ${k.toFixed(1)} km</span></div><div class="mut">${esc(r.o.t)} → ${esc(r.d.t)}</div><button class="btn am sm" style="margin-top:8px" onclick="accept(${r.id},${d.id})">Aceptar viaje</button></div>`).join('')||'<div class="radar" style="width:80px;height:80px;font-size:28px">📡</div><p class="mut" style="text-align:center">Esperando pedidos…</p>'}`}
 <p class="mut" style="margin-top:10px">Tocá el mapa (sin viaje) para mover tu posición o <a href="#" onclick="gps();return false" style="color:var(--mint)">usá tu GPS</a>.</p>`}
/* ---- panel OPERADOR (despacho) ---- */
function pO(){const on=S.drivers.filter(d=>d.on),ac=S.rides.filter(r=>ACT.includes(r.st)),hoy=S.rides.filter(r=>r.st=='fin'&&isToday(r.ts.fin));
 return`<div class="kpis"><div class="kpi"><b data-n="${on.length}" data-k="o1">0</b><span>Choferes online</span></div><div class="kpi"><b data-n="${ac.length}" data-k="o2">0</b><span>Viajes activos</span></div><div class="kpi"><b data-n="${hoy.reduce((s,r)=>s+r.price,0)}" data-m="1" data-k="o3">$ 0</b><span>Facturado hoy</span></div></div>
 <h3>Viajes activos</h3>${ac.slice().reverse().map(r=>{const d=r.did&&dOf(r.did),libres=on.filter(x=>!act(x.id));return`<div class="req"><div class="row"><b>#${r.id} ${esc(r.cn)}</b><span class="tag ${r.st=='busca'?'w':''}" style="margin-left:auto">${ST[r.st]}</span></div><div class="mut">${esc(r.o.t)} → ${esc(r.d.t)} · ${$(r.price)} · ${esc(r.pay)}</div>
  <div class="row" style="margin-top:8px">${d?`<span>🏍️ ${esc(d.n)} <span class="tag w" data-rid="${r.id}" data-t="eta"></span></span>`:`<select id="as${r.id}"><option value="">Asignar chofer…</option>${libres.map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join('')}</select><button class="btn sm" onclick="asg(${r.id})">OK</button>`}<button class="btn sm rd" onclick="cancel(${r.id})">✕</button></div></div>`}).join('')||'<span class="mut">Sin viajes activos.</span>'}
 <h3>Nuevo viaje telefónico</h3><div class="row"><input id="on" placeholder="Cliente"><input id="ot" placeholder="Teléfono"></div>${formQ(1)}`}
function asg(id){const v=+q('#as'+id).value;if(!v)return toast('Elegí un chofer');accept(id,v)}
/* ---- páginas del operador ---- */
function pageOp(){return{ch:pCh,cl:pCl,caja:pCaja,tar:pTar,resp:pResp}[tab]()}
function pCh(){return`<div class="card"><h2>Nuevo chofer</h2><div class="row wrap"><input id="cn" placeholder="Nombre"><input id="ct" placeholder="Teléfono"><input id="cm" placeholder="Moto"><input id="cp" placeholder="Patente"><input id="ck" placeholder="PIN (4 dígitos)"><button class="btn" onclick="addD()">Agregar</button></div></div>
 <div class="card tbl"><h2>Choferes</h2><table><tr><th>Chofer</th><th>Moto</th><th>Estado</th><th>Viajes</th><th>⭐</th><th>Saldo</th><th></th></tr>${S.drivers.map(d=>{const b=bal(d.id);return`<tr><td><b>${esc(d.n)}</b><div class="mut">${esc(d.tel)} · PIN ${esc(d.pin)}</div></td><td>${esc(d.moto)}<div class="mut">${esc(d.pat)}</div></td><td><span class="tag ${d.on?'':'r'}">${act(d.id)?'En viaje':d.on?'Online':'Offline'}</span></td><td>${mine(d.id).length}</td><td>${rat(d)}</td><td class="${b<0?'out':'in'}">${$(b)}<div class="mut">${b<0?'debe':'se le debe'}</div></td><td>${Math.round(b)?`<button class="btn sm am" onclick="liq(${d.id})">Liquidar</button> `:''}<button class="btn sm rd" onclick="delD(${d.id})">✕</button></td></tr>`}).join('')}</table></div>`}
function addD(){if(!cn.value.trim()||!ck.value.trim())return toast('Nombre y PIN obligatorios');tx(()=>{S.drivers.push({id:S.did++,n:cn.value.trim(),tel:ct.value.trim(),moto:cm.value.trim(),pat:cp.value.trim(),pin:ck.value.trim(),on:false,lat:S.cfg.base.lat,lng:S.cfg.base.lng})});refresh(1)}
function delD(id){if(confirm('¿Borrar chofer?')){tx(()=>{S.drivers=S.drivers.filter(d=>d.id!=id)});refresh(1)}}
function liq(id){const b=bal(id);if(!S.caja)return toast('Abrí la caja para liquidar');if(!confirm(`${b>0?'Pagar al chofer':'Cobrar al chofer'} ${$(Math.abs(b))} en efectivo?`))return;
 tx(()=>{mine(id).forEach(r=>{const x=S.rides.find(y=>y.id==r.id);x.liq=1});S.caja.movs.push({t:Date.now(),tipo:b>0?'out':'in',con:'Liquidación '+dOf(id).n,met:'Efectivo',m:Math.abs(b)})});toast('Liquidado');refresh(1)}
function pCl(){return`<div class="card tbl"><h2>Clientes (${S.clients.length})</h2><table><tr><th>Cliente</th><th>Teléfono</th><th>Viajes</th><th>Gastado</th></tr>${S.clients.map(c=>{const r=S.rides.filter(x=>x.cid==c.id&&x.st=='fin');return`<tr><td>${esc(c.n)}</td><td>${esc(c.tel)}</td><td>${r.length}</td><td>${$(r.reduce((s,x)=>s+x.price,0))}</td></tr>`}).join('')||'<tr><td colspan=4 class="mut">Se registran solos cuando ingresan.</td></tr>'}</table></div>
 <div class="card tbl"><h2>Últimos viajes</h2><table><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Chofer</th><th>Monto</th><th>Estado</th></tr>${S.rides.slice(-15).reverse().map(r=>`<tr><td>${r.id}</td><td>${hora(r.ts.req)}</td><td>${esc(r.cn)}</td><td>${r.did?esc(dOf(r.did)?.n||'—'):'—'}</td><td>${$(r.price)}</td><td>${ST[r.st]}</td></tr>`).join('')}</table></div>`}
function pCaja(){const c=S.caja,cs=S.cierres.slice(-5).reverse().map(x=>`<div class="line"><span>${hora(x.t)}</span><span>Esperado ${$(x.esp)} · Contado ${$(x.cont)}</span><b class="${x.cont-x.esp<0?'out':'in'}">${x.cont>=x.esp?'+':'−'}${$(Math.abs(x.cont-x.esp))}</b></div>`).join('')||'<span class="mut">Sin cierres.</span>';
 if(!c)return`<div class="card"><h2>Abrir caja</h2><label>Efectivo inicial</label><input id="ini" type="number" min="0" value="0"><button class="btn am big" onclick="tx(()=>{S.caja={t:Date.now(),ini:+ini.value||0,movs:[]}});refresh(1)">Abrir caja</button></div><div class="card"><h2>Cierres</h2>${cs}</div>`;
 const fin=S.rides.filter(r=>r.st=='fin'&&r.ts.fin>=c.t),fact=fin.reduce((s,r)=>s+r.price,0),com=fin.reduce((s,r)=>s+r.price*r.cp/100,0),sm=a=>a.reduce((s,m)=>s+m.m,0),efe=c.ini+sm(c.movs.filter(m=>m.tipo=='in'&&m.met=='Efectivo'))-sm(c.movs.filter(m=>m.tipo=='out'&&m.met=='Efectivo'));
 return`<div class="kpis"><div class="kpi"><b>${fin.length}</b><span>Viajes del turno</span></div><div class="kpi"><b>${$(fact)}</b><span>Facturado</span></div><div class="kpi"><b>${$(com)}</b><span>Comisión central</span></div><div class="kpi"><b class="in">${$(efe)}</b><span>Efectivo en caja</span></div></div>
 ${['Efectivo','Transferencia','Mercado Pago'].map(m=>`<div class="line"><span>Cobrado por ${m}</span><b>${$(fin.filter(r=>r.pay==m).reduce((s,r)=>s+r.price,0))}</b></div>`).join('')}
 <div class="card" style="margin-top:14px"><h2>Movimiento manual</h2><div class="row wrap"><select id="mt"><option value="out">Egreso</option><option value="in">Ingreso</option></select><input id="mc" placeholder="Concepto"><input id="ma" type="number" min="0" placeholder="Monto"><button class="btn" onclick="addM()">Registrar</button></div></div>
 <div class="card tbl"><h2>Movimientos</h2><table>${c.movs.slice().reverse().map(m=>`<tr><td>${hora(m.t)}</td><td>${esc(m.con)}</td><td class="${m.tipo}">${m.tipo=='in'?'+':'−'}${$(m.m)}</td></tr>`).join('')||'<tr><td class="mut">Sin movimientos</td></tr>'}</table></div>
 <div class="card"><h2>Cerrar caja</h2><div class="row"><input id="cnt" type="number" min="0" placeholder="Efectivo contado"><button class="btn rd" onclick="cerrar(${efe})">Cerrar</button></div><h3>Cierres</h3>${cs}</div>`}
function addM(){if(!mc.value.trim()||!(+ma.value>0))return toast('Completá concepto y monto');tx(()=>{S.caja.movs.push({t:Date.now(),tipo:mt.value,con:mc.value.trim(),met:'Efectivo',m:+ma.value})});refresh(1)}
function cerrar(e){if(cnt.value==='')return toast('Ingresá el efectivo contado');if(confirm('¿Cerrar caja?')){tx(()=>{S.cierres.push({t:Date.now(),esp:e,cont:+cnt.value,caja:S.caja});S.caja=null});refresh(1)}}
function pTar(){const c=S.cfg;return`<div class="card" style="max-width:560px"><h2>Tarifas y ajustes</h2><div class="row wrap"><div><label>Bajada de bandera ($)</label><input id="t1" type="number" value="${c.bajada}"></div><div><label>Precio por km ($)</label><input id="t2" type="number" value="${c.km}"></div></div>
 <div class="row wrap"><div><label>Mínimo ($)</label><input id="t3" type="number" value="${c.min}"></div><div><label>Comisión central (%)</label><input id="t4" type="number" value="${c.com}"></div></div>
 <label>PIN del operador</label><input id="t5" value="${esc(c.pin)}"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="t6" style="width:auto" ${c.demo?'checked':''}> Demo rápido (motos x20)</label>
 <div class="row" style="margin-top:12px"><button class="btn am" onclick="gTar()">Guardar</button><button class="btn gh" onclick="tab='desp';pickM('base');show()">Fijar base en el mapa</button></div></div>`}
function gTar(){tx(()=>{Object.assign(S.cfg,{bajada:+t1.value||0,km:+t2.value||0,min:+t3.value||0,com:+t4.value||0,pin:t5.value.trim()||'1234',demo:t6.checked})});toast('Guardado')}
function pResp(){return`<div class="card" style="max-width:560px"><h2>Respaldo</h2><p class="mut">Todo (choferes, clientes, viajes, caja) vive en este navegador. Descargá una copia seguido y guardala en otro lado.</p>
 <div class="line"><span>Último respaldo</span><b>${S.lastBackup?hora(S.lastBackup):'Nunca'}</b></div><div class="line"><span>Viajes</span><b>${S.rides.length}</b></div>
 <div class="row wrap" style="margin-top:12px"><button class="btn am" onclick="exp()">Descargar respaldo</button><button class="btn" onclick="q('#f').click()">Restaurar</button><button class="btn gh" onclick="csv()">Viajes a CSV</button></div><input type="file" id="f" accept=".json" hidden onchange="imp(this.files[0])">
 <h3>Instalar como programa</h3><p class="mut">En Chrome/Edge usá el botón de instalar de la barra (necesita https o localhost). En el celular: menú → Agregar a pantalla de inicio.</p><button class="btn rd" style="margin-top:14px" onclick="if(confirm('Se borra TODO. ¿Seguro?')){localStorage.removeItem(K);sessionStorage.clear();location.reload()}">Borrar todos los datos</button></div>`}
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()}
function exp(){tx(()=>{S.lastBackup=Date.now()});dl(new Blob([JSON.stringify(S)],{type:'application/json'}),'olimar-moto-respaldo-'+new Date().toISOString().slice(0,10)+'.json');refresh(1)}
function imp(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.rides)||!Array.isArray(d.drivers))throw 0;if(!confirm('Reemplaza los datos actuales. ¿Continuar?'))return;localStorage.setItem(K,JSON.stringify(d));load();toast('Respaldo restaurado');refresh(1)}catch(e){toast('Archivo inválido')}};r.readAsText(f)}
function csv(){const c=v=>'"'+String(v??'').replace(/"/g,'""')+'"';dl(new Blob(['\ufeff'+'ID,Fecha,Cliente,Telefono,Chofer,Origen,Destino,Km,Monto,Pago,Estado\n'+S.rides.map(r=>[r.id,hora(r.ts.req),r.cn,r.ctel,dOf(r.did)?.n||'',r.o.t,r.d.t,r.km.toFixed(2),r.price,r.pay,ST[r.st]].map(c).join(',')).join('\n')],{type:'text/csv'}),'viajes-olimar.csv')}
/* ---- sincronización entre pestañas ---- */
addEventListener('storage',e=>{if(e.key!=K||!me)return;const before=S.rides.filter(r=>r.st=='busca').length;load();
 if(me.role=='d'&&drv()?.on&&S.rides.filter(r=>r.st=='busca').length>before)beep();if(me.role=='c'||me.role=='d'||me.role=='o')refresh(0)});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
setTimeout(()=>{q('#splash')?.remove()},2500);
show();
