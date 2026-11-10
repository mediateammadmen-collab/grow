
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const nf=new Intl.NumberFormat('en-IN',{maximumFractionDigits:2});
const money=n=>(n<0?'−':'')+'৳'+nf.format(Math.round(Math.abs(n)*100)/100);
function compact(n,sym){
  const a=Math.abs(n); let s;
  if(a>=1e7) s=(a/1e7).toFixed(2).replace(/\.?0+$/,'')+'Cr';
  else if(a>=1e5) s=(a/1e5).toFixed(1).replace(/\.0$/,'')+'L';
  else if(a>=1e3) s=(a/1e3).toFixed(a>=1e4?0:1).replace(/\.0$/,'')+'k';
  else s=String(Math.round(a));
  return (n<0?'−':'')+(sym===false?'':'৳')+s;
}
const nowKey=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)};
function shiftMonth(mk,delta){const p=mk.split('-').map(Number);const d=new Date(p[0],p[1]-1+delta,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function monthLabel(mk,short){const p=mk.split('-').map(Number);return new Date(p[0],p[1]-1,1).toLocaleString('en-GB',short?{month:'short'}:{month:'long',year:'numeric'})}
const dayLabel=iso=>new Date(iso.slice(0,10)+'T00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const nowLocal=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
const uid=()=>'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const ICONS={
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  daily:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.9A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  send:'<path d="M5 12l14-7-5 14-3-6z"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  loan:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/>',
  chart:'<path d="M4 20V4M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
  chev:'<path d="M9 6l6 6-6 6"/>'
};
const ic=n=>'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>';

/* ---------- data model ---------- */
const CATS={
  expense:{
    'Household':{c:'#f05d5e',subs:['Rent','Utilities','Maintenance','Supplies']},
    'Food':{c:'#f79140',subs:['Groceries','Dining out','Snacks','Tea & coffee']},
    'Apparel':{c:'#fbbf3b',subs:['Clothes','Shoes','Accessories']},
    'Social Life':{c:'#e2c400',subs:['Friends','Family','Events']},
    'Gift':{c:'#a8d336',subs:['Gifts','Donations']},
    'Health':{c:'#56c26a',subs:['Medicine','Doctor','Fitness']},
    'Education':{c:'#3dcfc0',subs:['Books','Courses','Tuition']},
    'Transport':{c:'#38b6e8',subs:['Rickshaw / CNG','Ride share','Bus','Fuel']},
    'Other':{c:'#8a7cf0',subs:['Other']}
  },
  income:{
    'Salary':{c:'#2bb47f',subs:['Monthly salary','Bonus']},
    'Freelance':{c:'#3dcfc0',subs:['Project','Retainer']},
    'Business':{c:'#56c26a',subs:['Sales','Commission']},
    'Interest':{c:'#38b6e8',subs:['Savings interest','Dividend']},
    'Gift':{c:'#a8d336',subs:['Gift']},
    'Other':{c:'#8a7cf0',subs:['Other']}
  }
};
const HTYPES={'Stocks':'#f79140','Mutual funds':'#38b6e8','Savings certificates':'#2bb47f','Fixed deposit':'#56c26a','Gold':'#fbbf3b','Crypto':'#8a7cf0','Other':'#9aa8a1'};
const BUCKET={'Stocks':'Stocks','Mutual funds':'Mutual funds','Savings certificates':'Fixed income','Fixed deposit':'Fixed income','Gold':'Gold','Crypto':'Other','Other':'Other'};
const BUCKET_COLOR={'Cash':'#9aa8a1','Fixed income':'#2bb47f','Mutual funds':'#38b6e8','Stocks':'#f79140','Gold':'#fbbf3b','Other':'#8a7cf0'};
const catColor=(t)=>t.type==='transfer'?'#9aa8a1':((CATS[t.type][t.cat]||{}).c||'#9aa8a1');

const KEY='grow.v1';
function makeSeed(){
  const now=new Date(), Y=now.getFullYear(), M=now.getMonth(), td=now.getDate();
  const txs=[]; let n=0;
  const add=(y,m,d,r,f)=>{
    let amt=r[4];
    if(f!==1&&r[1]==='expense'&&r[3]!=='Rent') amt=Math.round(amt*f/10)*10;
    txs.push({id:'s'+(n++),type:r[1],date:y+'-'+pad(m+1)+'-'+pad(d)+'T'+pad(19)+':'+pad(15),account:r[6],to:r[7]||'',cat:r[2],sub:r[3],amount:amt,note:r[5]});
  };
  const T=[
    [1,'income','Salary','Monthly salary',90000,'Salary','bank'],
    [1,'transfer','','',20000,'Cash withdrawal','bank','cash'],
    [2,'expense','Household','Rent',22000,'House rent','bank'],
    [4,'expense','Food','Groceries',3650,'Weekly bazar','cash'],
    [5,'expense','Household','Utilities',3100,'Electricity, gas and wifi','bkash'],
    [6,'expense','Transport','Rickshaw / CNG',420,'Office commute','bkash'],
    [8,'expense','Health','Medicine',1260,'Pharmacy','cash'],
    [9,'expense','Food','Dining out',1100,'Dinner with family','cash'],
    [11,'expense','Food','Groceries',4150,'Weekly bazar','cash'],
    [12,'expense','Education','Books',880,'Books','cash'],
    [13,'expense','Transport','Ride share',380,'Pathao ride','bkash'],
    [14,'expense','Apparel','Clothes',4200,'Shirts','bank'],
    [16,'expense','Social Life','Friends',1850,'Friends hangout','cash'],
    [18,'income','Freelance','Project',7500,'Freelance design project','bkash'],
    [18,'expense','Food','Groceries',3820,'Weekly bazar','cash'],
    [20,'expense','Transport','Rickshaw / CNG',460,'Commute','bkash'],
    [21,'expense','Food','Dining out',600,'Lunch','cash'],
    [23,'expense','Gift','Gifts',1500,'Birthday gift','cash'],
    [23,'expense','Food','Groceries',3980,'Weekly bazar','cash'],
    [27,'expense','Transport','Rickshaw / CNG',359,'Commute','bkash']
  ];
  [[3,1.06],[2,0.94],[1,1]].forEach(function(p){
    const d=new Date(Y,M-p[0],1);
    T.forEach(function(r){
      if(p[0]===3&&r[2]==='Freelance') return;
      add(d.getFullYear(),d.getMonth(),r[0],r,p[1]);
    });
  });
  const C=[
    [1,'income','Salary','Monthly salary',90000,'Salary','bank'],
    [1,'transfer','','',20000,'Cash withdrawal','bank','cash'],
    [2,'expense','Household','Rent',22000,'House rent','bank'],
    [3,'expense','Food','Groceries',3720,'Weekly bazar','cash'],
    [4,'expense','Transport','Rickshaw / CNG',340,'Office commute','bkash'],
    [5,'expense','Household','Utilities',2850,'Electricity, gas and wifi','bkash'],
    [6,'expense','Food','Dining out',780,'Lunch with team','cash'],
    [6,'expense','Transport','Ride share',290,'Pathao ride','bkash']
  ];
  C.forEach(function(r){ if(r[0]<=td) add(Y,M,r[0],r,1); });
  return {
    v:1, sample:true, hide:false,
    accounts:[{id:'cash',name:'Cash',open:60000},{id:'bkash',name:'bKash',open:25000},{id:'bank',name:'Bank account',open:400000}],
    txs:txs,
    holdings:[
      {id:'h1',name:'DSE blue-chip stocks',type:'Stocks',invested:120000,value:134500},
      {id:'h2',name:'Equity mutual fund',type:'Mutual funds',invested:60000,value:64200},
      {id:'h3',name:'Savings certificates',type:'Savings certificates',invested:200000,value:214000},
      {id:'h4',name:'Gold (physical)',type:'Gold',invested:90000,value:98000}
    ],
    budgets:{'Household':26000,'Food':18000,'Apparel':4000,'Social Life':2500,'Gift':1500,'Health':2000,'Education':1500,'Transport':2000,'Other':2000}
  };
}
const CFG=window.GROW_CONFIG||{};
const NATIVE=!!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform());
const Plug=function(n){try{return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins[n]:null}catch(e){return null}};
function makeEmpty(){
  return {v:1,sample:false,hide:false,entered:false,aiOk:false,
    accounts:[{id:'cash',name:'Cash',open:0},{id:'bkash',name:'bKash',open:0},{id:'bank',name:'Bank account',open:0}],
    txs:[],holdings:[],budgets:{}};
}
function fixShape(){ S.holdings=Array.isArray(S.holdings)?S.holdings:[]; S.budgets=(S.budgets&&typeof S.budgets==='object')?S.budgets:{}; }
let S=null, hadLocal=false;
try{ const raw=localStorage.getItem(KEY); if(raw){ S=JSON.parse(raw); hadLocal=true; } }catch(e){}
if(!S||!Array.isArray(S.txs)||!Array.isArray(S.accounts)||!S.accounts.length) S=makeEmpty();
fixShape();
function save(){
  let raw='';
  try{ raw=JSON.stringify(S); localStorage.setItem(KEY,raw); }catch(e){}
  if(NATIVE&&raw){ const P=Plug('Preferences'); if(P&&P.set) P.set({key:KEY,value:raw}).catch(function(){}); }
}

/* ---------- derived data ---------- */
const monthTx=mk=>S.txs.filter(t=>t.date.slice(0,7)===mk);
const sum=(arr,type)=>arr.filter(t=>t.type===type).reduce((a,t)=>a+t.amount,0);
function catMap(arr,type){const m={};arr.filter(t=>t.type===type).forEach(t=>{m[t.cat]=(m[t.cat]||0)+t.amount});return m}
const catTotals=(arr,type)=>Object.entries(catMap(arr,type)).sort((a,b)=>b[1]-a[1]);
const accName=id=>{const a=S.accounts.find(x=>x.id===id);return a?a.name:'Account'};
function balances(){
  const b={}; S.accounts.forEach(a=>{b[a.id]=Number(a.open)||0});
  S.txs.forEach(t=>{
    if(!(t.account in b)) b[t.account]=0;
    if(t.type==='income') b[t.account]+=t.amount;
    else if(t.type==='expense') b[t.account]-=t.amount;
    else{ b[t.account]-=t.amount; if(t.to){ if(!(t.to in b)) b[t.to]=0; b[t.to]+=t.amount; } }
  });
  return b;
}
const liquid=()=>Object.values(balances()).reduce((a,b)=>a+b,0);
function invTotals(){
  const invested=S.holdings.reduce((a,h)=>a+(+h.invested||0),0), value=S.holdings.reduce((a,h)=>a+(+h.value||0),0);
  return {invested:invested,value:value,gain:value-invested,pct:invested?(value-invested)/invested*100:0};
}
const netWorth=()=>liquid()+invTotals().value;
function avgMonthly(){
  const keys=[1,2,3].map(k=>shiftMonth(nowKey(),-k)).filter(k=>monthTx(k).length);
  const use=keys.length?keys:[nowKey()];
  let i=0,e=0; use.forEach(k=>{const t=monthTx(k); i+=sum(t,'income'); e+=sum(t,'expense');});
  return {income:i/use.length,expense:e/use.length,saving:(i-e)/use.length};
}
function monthsTo(target,nw,saving,rate){
  if(nw>=target) return 0;
  const r=(rate||0.07)/12; let v=nw,m=0;
  while(v<target&&m<720){ v=v*(1+r)+Math.max(0,saving); m++; }
  return m<720?m:null;
}
function lastMonths(n){const out=[];for(let i=n-1;i>=0;i--) out.push(shiftMonth(nowKey(),-i));return out}
function niceMax(v){const p=Math.pow(10,Math.floor(Math.log10(v)));for(const k of [1,2,2.5,5,10]) if(k*p>=v) return k*p;return 10*p}

/* ---------- charts ---------- */
function donut(items,total,center,sub){
  let off=0;
  const segs=items.map(function(it){
    const p=total?it.v/total*100:0;
    const s='<circle r="15.9155" cx="21" cy="21" fill="none" stroke="'+it.c+'" stroke-width="6.5" stroke-dasharray="'+p.toFixed(3)+' '+(100-p).toFixed(3)+'" stroke-dashoffset="'+(25-off).toFixed(3)+'"/>';
    off+=p; return s;
  }).join('');
  return '<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Breakdown chart"><circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--surface2)" stroke-width="6.5"/>'+segs+
    '<text x="21" y="21.2" class="dc">'+esc(center)+'</text><text x="21" y="25.6" class="ds">'+esc(sub||'')+'</text></svg>';
}
function barChart(months){
  const max=niceMax(Math.max(1000,...months.flatMap(m=>[m.inc,m.exp])));
  const W=340,H=176,l=36,b=22,t=10,r=4,ph=H-t-b, gw=(W-l-r)/months.length, bw=Math.min(15,gw/2-3);
  let g='';
  for(let i=0;i<=3;i++){
    const y=t+ph*(1-i/3);
    g+='<line class="gl" x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'"/><text class="ax" x="'+(l-5)+'" y="'+(y+3.5)+'" text-anchor="end">'+compact(max*i/3,false)+'</text>';
  }
  months.forEach(function(m,i){
    const cx=l+gw*(i+.5), hi=m.inc/max*ph, he=m.exp/max*ph;
    g+='<rect class="b-inc" x="'+(cx-bw-1)+'" y="'+(t+ph-hi)+'" width="'+bw+'" height="'+Math.max(hi,0)+'" rx="3"/>'+
       '<rect class="b-exp" x="'+(cx+1)+'" y="'+(t+ph-he)+'" width="'+bw+'" height="'+Math.max(he,0)+'" rx="3"/>'+
       '<text class="ax" x="'+cx+'" y="'+(H-6)+'" text-anchor="middle">'+monthLabel(m.mk,true)+'</text>';
  });
  return '<svg class="bars" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Income and expenses by month">'+g+'</svg>'+
    '<div class="key"><span><i style="background:var(--inc)"></i>Income</span><span><i style="background:var(--exp)"></i>Expenses</span></div>';
}
function monthSeries(keys){return keys.map(function(k){const t=monthTx(k);return {mk:k,inc:sum(t,'income'),exp:sum(t,'expense')}})}

/* ---------- UI state ---------- */
const ui={screen:S.entered?'app':'launch',tab:'home',homeSeg:'cash',month:nowKey(),dseg:'tx',statsType:'expense',hist:{month:'all',type:'all',q:'',limit:80},chat:[]};
let SAMPLE=null, DL=null, BACKEND=false, noAI=false, pendingAsk='', restoreObj=null, busy=false, ctl=null, draft=null, hdraft=null;
const vis=n=>S.hide?'৳ ••••••':money(n);

function txRow(t,showDate){
  const name=t.note||t.sub||t.cat||'Transfer';
  const sub=t.type==='transfer'?accName(t.account)+' → '+accName(t.to):t.cat+(t.sub&&t.sub!==t.cat?' · '+t.sub:'')+' · '+accName(t.account);
  const cls=t.type==='income'?'inc':t.type==='expense'?'exp':'';
  const sign=t.type==='income'?'+':t.type==='expense'?'−':'';
  const sw=t.type==='transfer'?'<span class="sw" style="background:#c8d3cd">'+ic('swap')+'</span>':'<span class="sw" style="background:'+catColor(t)+'">'+esc((t.cat||'?').charAt(0))+'</span>';
  return '<button class="row" data-a="edit" data-id="'+esc(t.id)+'">'+sw+'<span class="mid"><span class="t" style="display:block">'+esc(name)+'</span><span class="s" style="display:block">'+(showDate?esc(dayLabel(t.date))+' · ':'')+esc(sub)+'</span></span><span class="amt num '+cls+'">'+sign+money(t.amount).replace('−','')+'</span></button>';
}

/* ---------- HOME ---------- */
const MS=[[5e5,'5L'],[1e6,'10L'],[2.5e6,'25L'],[5e6,'50L'],[1e7,'1Cr']];
function trackHtml(nw){
  const pts=[0].concat(MS.map(m=>m[0])); let pos=0;
  if(nw>=pts[pts.length-1]) pos=pts.length-1;
  else for(let i=0;i<pts.length-1;i++){ if(nw>=pts[i+1]) pos=i+1; else{ pos=i+Math.max(0,(nw-pts[i])/(pts[i+1]-pts[i])); break; } }
  const pct=Math.min(100,pos/(pts.length-1)*100);
  const ticks=MS.map(function(m,i){
    const left=(i+1)/MS.length*100, last=i===MS.length-1;
    return '<div class="tick'+(nw>=m[0]?' done':'')+(last?' last':'')+'" style="left:'+left+'%"><b>'+m[1]+'</b>'+(nw>=m[0]?'reached':'')+'</div>';
  }).join('');
  return '<div class="track"><div class="track-bar"><i style="width:'+pct+'%"></i></div><span class="dot" style="left:'+pct+'%"></span>'+ticks+'</div>';
}
function nextMilestone(nw){
  if(nw<=0&&!S.txs.length) return '<p class="next-ms muted">Add your balances and first entries to see your path to \u09f35L.</p>';
  const nx=MS.find(m=>nw<m[0]); if(!nx) return '<p class="next-ms muted">You have passed every milestone on this track.</p>';
  const a=avgMonthly(), mo=monthsTo(nx[0],nw,a.saving);
  const when=mo===null?'more than 60 years':(mo<12?mo+' months':(mo/12).toFixed(1)+' years');
  return '<p class="next-ms"><b>Next: '+nx[1]+'</b> <span class="muted">· '+(S.hide?'':money(nx[0]-nw)+' to go · ')+'about '+when+' at your recent saving pace and 7% yearly growth (an estimate).</span></p>';
}
function allocation(){
  const b={'Cash':Math.max(0,liquid())};
  S.holdings.forEach(h=>{const k=BUCKET[h.type]||'Other'; b[k]=(b[k]||0)+(+h.value||0)});
  return b;
}
function viewHome(){
  const mk=nowKey(), cur=monthTx(mk), inc=sum(cur,'income'), exp=sum(cur,'expense'), flow=inc-exp;
  const nw=netWorth(), inv=invTotals(), bal=balances();
  const banner=S.sample?'<div class="banner"><span><b>Example data.</b> These numbers are made up so you can look around. Open Settings to clear them and start with your own.</span></div>':'';
  const first=(!S.txs.length&&!S.holdings.length)?'<section class="card"><h3>Let\u2019s set up Grow</h3><div class="list" style="margin-top:6px">'+
    '<button class="row" data-a="settings"><span class="sw" style="background:#8ee3bf">1</span><span class="mid"><span class="t" style="display:block">Set your account balances</span><span class="s" style="display:block">What your cash, bKash and bank hold today</span></span>'+ic('chev')+'</button>'+
    '<button class="row" data-a="add"><span class="sw" style="background:#f2bd10">2</span><span class="mid"><span class="t" style="display:block">Add your first entry</span><span class="s" style="display:block">An expense or income takes ten seconds</span></span>'+ic('chev')+'</button>'+
    '<button class="row" data-a="tab" data-v="ai"><span class="sw" style="background:#7cc0ff">3</span><span class="mid"><span class="t" style="display:block">Ask Grow about money</span><span class="s" style="display:block">Budgeting, saving, loans, cards and investing</span></span>'+ic('chev')+'</button></div>'+
    '<button class="link" data-a="trySample" style="margin-top:8px">Or look around with example data</button></section>':'';
  const hero='<section class="card nw"><div class="lbl">Net worth <button class="eye" data-a="hide" aria-label="'+(S.hide?'Show amounts':'Hide amounts')+'">'+ic(S.hide?'eyeoff':'eye')+'</button></div>'+
    '<div class="nw-v num">'+vis(nw)+'</div>'+
    '<div class="nw-d '+(flow>=0?'inc':'exp')+'">'+(flow>=0?'▲ ':'▼ ')+money(Math.abs(flow))+' cash flow in '+monthLabel(mk,true)+'</div>'+
    trackHtml(nw)+nextMilestone(nw)+'</section>';
  const tiles='<div class="grid2">'+
    '<div class="tile"><div class="lbl">Income</div><div class="v inc num">'+money(inc)+'</div><div class="s">'+monthLabel(mk)+'</div></div>'+
    '<div class="tile"><div class="lbl">Expenses</div><div class="v exp num">'+money(exp)+'</div><div class="s">'+(inc?Math.round(exp/inc*100)+'% of income':'')+'</div></div>'+
    '<div class="tile"><div class="lbl">Cash flow</div><div class="v num '+(flow>=0?'inc':'exp')+'">'+(flow>=0?'+':'')+money(flow)+'</div><div class="s">'+(inc?'Saved '+Math.round(flow/inc*100)+'%':'No income yet')+'</div></div>'+
    '<div class="tile"><div class="lbl">Investments</div><div class="v num">'+vis(inv.value)+'</div><div class="s '+(inv.gain>=0?'inc':'exp')+'">'+(S.hide?'':(inv.gain>=0?'+':'')+inv.pct.toFixed(1)+'% overall')+'</div></div></div>';
  const seg='<div class="seg" role="group" aria-label="Section"><button data-a="homeSeg" data-v="cash" aria-pressed="'+(ui.homeSeg==='cash')+'">Cash flow</button><button data-a="homeSeg" data-v="inv" aria-pressed="'+(ui.homeSeg==='inv')+'">Investments</button></div>';
  let panel='';
  if(ui.homeSeg==='cash'){
    const ms=monthSeries(lastMonths(6));
    const top=catTotals(cur,'expense').slice(0,4);
    const topH=top.length?top.map(function(c){const col=(CATS.expense[c[0]]||{}).c||'#999';return '<div class="row"><span class="sw" style="background:'+col+'">'+esc(c[0].charAt(0))+'</span><span class="mid"><span class="t" style="display:block">'+esc(c[0])+'</span><div class="bar" style="margin-top:6px"><i style="width:'+(exp?c[1]/exp*100:0)+'%;background:'+col+'"></i></div></span><span class="amt num">'+money(c[1])+'</span></div>'}).join(''):'<p class="muted small" style="padding:8px 0">No expenses recorded this month.</p>';
    const accs=S.accounts.map(a=>'<div class="row"><span class="mid"><span class="t" style="display:block">'+esc(a.name)+'</span></span><span class="amt num">'+vis(bal[a.id]||0)+'</span></div>').join('');
    panel='<section class="card"><h3>Last 6 months</h3><div style="margin-top:10px">'+barChart(ms)+'</div></section>'+
      '<section class="card"><h3>Where it went in '+monthLabel(mk,true)+'</h3><div class="list" style="margin-top:6px">'+topH+'</div><button class="link" data-a="goDaily" style="margin-top:8px">See all categories</button></section>'+
      '<section class="card"><h3>Accounts</h3><div class="list" style="margin-top:6px">'+accs+'</div></section>';
  }else{
    const al=allocation(), tot=Object.values(al).reduce((a,b)=>a+b,0);
    const items=Object.entries(al).filter(e=>e[1]>0).map(e=>({v:e[1],c:BUCKET_COLOR[e[0]]||'#999',n:e[0]}));
    const leg=items.map(i=>'<span><i style="background:'+i.c+'"></i>'+esc(i.n)+' <b>'+(tot?Math.round(i.v/tot*100):0)+'%</b></span>').join('');
    const hold=S.holdings.length?S.holdings.map(function(h){
      const g=(+h.value||0)-(+h.invested||0), gp=h.invested?g/h.invested*100:0;
      return '<button class="row" data-a="holdEdit" data-id="'+esc(h.id)+'"><span class="sw" style="background:'+(HTYPES[h.type]||'#999')+'">'+esc(h.type.charAt(0))+'</span><span class="mid"><span class="t" style="display:block">'+esc(h.name)+'</span><span class="s" style="display:block">'+esc(h.type)+(S.hide?'':' · invested '+money(+h.invested||0))+'</span></span><span style="text-align:right"><span class="amt num" style="display:block">'+vis(+h.value||0)+'</span>'+(S.hide?'':'<span class="small '+(g>=0?'inc':'exp')+'">'+(g>=0?'+':'')+gp.toFixed(1)+'%</span>')+'</span></button>';
    }).join(''):'<div class="empty"><b>No investments yet</b>Add stocks, funds, savings certificates or gold to see your whole portfolio here.</div>';
    panel='<section class="card"><h3>Portfolio mix</h3><div class="chart-wrap" style="margin-top:10px">'+donut(items,tot,S.hide?'••••':compact(tot),'incl. cash')+'<div class="legend">'+leg+'</div></div></section>'+
      '<section class="card"><div class="sec-h" style="margin:0 0 4px"><h3>Holdings</h3><button class="link" data-a="holdAdd">+ Add</button></div><div class="list">'+hold+'</div></section>';
  }
  const rec=S.txs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const recent='<section class="card"><div class="sec-h" style="margin:0 0 4px"><h3>Recent</h3><button class="link" data-a="tab" data-v="history">See all</button></div><div class="list">'+(rec.length?rec.map(t=>txRow(t,true)).join(''):'<div class="empty"><b>Nothing here yet</b>Tap + to add your first income or expense.</div>')+'</div></section>';
  return '<div class="stack"><header class="head" style="margin-bottom:0"><div class="brand"><span class="logo">'+ic('chart')+'</span><h1>Grow</h1></div><div class="head-actions"><button class="iconbtn" data-a="settings" aria-label="Settings">'+ic('gear')+'</button><button class="iconbtn solid" data-a="add" aria-label="Add entry">'+ic('plus')+'</button></div></header>'+banner+first+hero+tiles+seg+panel+recent+'</div>';
}

/* ---------- DAILY ---------- */
function viewDaily(){
  const mk=ui.month, arr=monthTx(mk), inc=sum(arr,'income'), exp=sum(arr,'expense');
  const head='<header class="head"><h1>Daily</h1><button class="btn sm" data-a="add">'+ic('plus')+' Add entry</button></header>'+
    '<div class="mnav"><button data-a="mPrev" aria-label="Previous month">'+ic('chev').replace('<svg','<svg style="transform:scaleX(-1)"')+'</button><strong>'+monthLabel(mk)+'</strong><button data-a="mNext" '+(mk>=nowKey()?'disabled':'')+' aria-label="Next month">'+ic('chev')+'</button></div>'+
    '<div class="sumbar"><div><span class="lbl">Income</span><b class="inc num">'+money(inc)+'</b></div><div><span class="lbl">Expenses</span><b class="exp num">'+money(exp)+'</b></div><div><span class="lbl">Balance</span><b class="num">'+money(inc-exp)+'</b></div></div>'+
    '<div class="seg" role="group" aria-label="View" style="margin-bottom:12px"><button data-a="dseg" data-v="tx" aria-pressed="'+(ui.dseg==='tx')+'">Transactions</button><button data-a="dseg" data-v="stats" aria-pressed="'+(ui.dseg==='stats')+'">Stats</button><button data-a="dseg" data-v="budget" aria-pressed="'+(ui.dseg==='budget')+'">Budget</button></div>';
  let body='';
  if(ui.dseg==='tx'){
    if(!arr.length) body='<div class="empty card"><b>No entries in '+monthLabel(mk)+'</b>Add what you spent or earned today. It takes about ten seconds.<div style="margin-top:14px"><button class="btn" data-a="add">Add entry</button></div></div>';
    else{
      const days={}; arr.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(t=>{const d=t.date.slice(0,10);(days[d]=days[d]||[]).push(t)});
      body='<div class="card" style="padding-top:2px">'+Object.keys(days).map(function(d){
        const di=sum(days[d],'income'), de=sum(days[d],'expense');
        return '<div class="dayh"><span>'+esc(dayLabel(d))+'</span><span>'+(di?'<span class="inc">+'+money(di)+'</span> ':'')+(de?'<span class="exp">−'+money(de)+'</span>':'')+'</span></div><div class="list">'+days[d].map(t=>txRow(t,false)).join('')+'</div>';
      }).join('')+'</div>';
    }
  }else if(ui.dseg==='stats'){
    const type=ui.statsType, tot=type==='income'?inc:exp, rows=catTotals(arr,type);
    const tabs='<div class="seg" style="margin-bottom:12px"><button data-a="stype" data-v="income" aria-pressed="'+(type==='income')+'">Income '+compact(inc)+'</button><button data-a="stype" data-v="expense" aria-pressed="'+(type==='expense')+'">Expenses '+compact(exp)+'</button></div>';
    if(!rows.length) body=tabs+'<div class="empty card"><b>No '+type+' this month</b>Entries you add will be grouped by category here.</div>';
    else{
      const items=rows.map(r=>({v:r[1],c:(CATS[type][r[0]]||{}).c||'#999'}));
      body=tabs+'<div class="card"><div class="chart-wrap">'+donut(items,tot,compact(tot),type==='income'?'earned':'spent')+'</div><div class="list" style="margin-top:10px">'+rows.map(function(r){
        const col=(CATS[type][r[0]]||{}).c||'#999';
        return '<div class="row"><span class="pct" style="background:'+col+'">'+Math.round(r[1]/tot*100)+'%</span><span class="mid"><span class="t">'+esc(r[0])+'</span></span><span class="amt num">'+money(r[1])+'</span></div>';
      }).join('')+'</div></div>';
    }
  }else{
    const spent=catMap(arr,'expense'), cats=Object.keys(CATS.expense);
    const tb=cats.reduce((a,c)=>a+(+S.budgets[c]||0),0), ts=cats.reduce((a,c)=>a+(spent[c]||0),0);
    const left=tb-ts;
    body='<div class="card" style="margin-bottom:12px"><div class="lbl">Monthly budget</div><div style="font:500 26px var(--display);margin-top:4px" class="num">'+money(ts)+' <span class="muted" style="font-size:16px">of '+money(tb)+'</span></div><div class="'+(left<0?'exp':'inc')+' small" style="margin-top:2px">'+(left>=0?money(left)+' left to spend':money(-left)+' over budget')+'</div></div>'+
      '<div class="card" style="padding-top:4px">'+cats.map(function(c){
        const lim=+S.budgets[c]||0, sp=spent[c]||0, p=lim?sp/lim*100:(sp?100:0), cls=p>100?'bad':p>85?'warn':'';
        return '<div class="bud"><div class="bud-top"><span class="t" style="font-weight:600">'+esc(c)+'</span><input type="number" inputmode="numeric" min="0" step="100" value="'+(lim||'')+'" placeholder="Limit" data-budget="'+esc(c)+'" aria-label="'+esc(c)+' monthly limit"></div><div class="bar '+cls+'"><i style="width:'+Math.min(100,p)+'%"></i></div><div class="small muted">'+money(sp)+' spent'+(lim?' · '+(lim-sp>=0?money(lim-sp)+' left':'<span class="exp">'+money(sp-lim)+' over</span>'):' · set a limit')+'</div></div>';
      }).join('')+'</div><p class="note" style="margin-top:8px">Limits repeat every month. Change a number and it saves when you leave the field.</p>';
  }
  return head+body;
}

/* ---------- HISTORY ---------- */
function histFiltered(){
  const h=ui.hist, q=h.q.trim().toLowerCase();
  return S.txs.filter(function(t){
    if(h.month!=='all'&&t.date.slice(0,7)!==h.month) return false;
    if(h.type!=='all'&&t.type!==h.type) return false;
    if(q){ const hay=(t.note+' '+t.cat+' '+t.sub+' '+accName(t.account)).toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));
}
function histListHtml(){
  const rows=histFiltered(), h=ui.hist;
  const inc=sum(rows,'income'), exp=sum(rows,'expense');
  if(!rows.length) return '<div class="empty card"><b>Nothing matches</b>Try another month, type or search word.</div>';
  const shown=rows.slice(0,h.limit); const groups={};
  shown.forEach(t=>{const k=t.date.slice(0,7);(groups[k]=groups[k]||[]).push(t)});
  let out='<div class="sumbar"><div><span class="lbl">Entries</span><b class="num">'+rows.length+'</b></div><div><span class="lbl">Income</span><b class="inc num">'+money(inc)+'</b></div><div><span class="lbl">Expenses</span><b class="exp num">'+money(exp)+'</b></div></div>';
  out+=Object.keys(groups).map(function(k){
    const all=monthTx(k);
    return '<div class="card" style="padding-top:2px;margin-bottom:12px"><div class="dayh"><span style="font:500 17px var(--display);color:var(--ink)">'+monthLabel(k)+'</span><span><span class="inc">+'+compact(sum(all,'income'))+'</span> <span class="exp">−'+compact(sum(all,'expense'))+'</span></span></div><div class="list">'+groups[k].map(t=>txRow(t,true)).join('')+'</div></div>';
  }).join('');
  if(rows.length>h.limit) out+='<button class="btn ghost full" data-a="histMore">Show more ('+(rows.length-h.limit)+' left)</button>';
  return out;
}
function viewHistory(){
  const keys=Array.from(new Set(S.txs.map(t=>t.date.slice(0,7)))).sort().reverse();
  const h=ui.hist;
  let span=3;
  if(keys.length){ const a=keys[keys.length-1].split('-').map(Number), b=nowKey().split('-').map(Number); span=(b[0]-a[0])*12+(b[1]-a[1])+1; }
  const ms=monthSeries(lastMonths(Math.min(12,Math.max(3,span))));
  return '<header class="head"><h1>History</h1>'+(DL?'<button class="btn ghost sm" data-a="csv">Export CSV</button>':'')+'</header>'+
    '<section class="card" style="margin-bottom:12px"><h3>Month by month</h3><div style="margin-top:10px">'+barChart(ms)+'</div></section>'+
    '<div class="stack" style="gap:10px;margin-bottom:12px">'+
    '<div class="f" style="grid-template-columns:70px 1fr"><label for="h-month">Month</label><select id="h-month"><option value="all">All time</option>'+keys.map(k=>'<option value="'+k+'"'+(h.month===k?' selected':'')+'>'+monthLabel(k)+'</option>').join('')+'</select></div>'+
    '<div class="chips" role="group" aria-label="Type">'+['all','income','expense','transfer'].map(v=>'<button class="chip" data-a="htype" data-v="'+v+'" aria-pressed="'+(h.type===v)+'">'+(v==='all'?'All':v.charAt(0).toUpperCase()+v.slice(1))+'</button>').join('')+'</div>'+
    '<div class="f" style="grid-template-columns:70px 1fr"><label for="h-q">Search</label><input id="h-q" type="search" placeholder="Note, category or account" value="'+esc(h.q)+'"></div></div>'+
    '<div id="histOut">'+histListHtml()+'</div>';
}

/* ---------- AI ---------- */
function checkup(){
  const a=avgMonthly(), cur=catMap(monthTx(nowKey()),'expense');
  let over=0,cnt=0; Object.keys(S.budgets).forEach(function(c){const l=+S.budgets[c]; if(l>0){cnt++; if((cur[c]||0)>l) over++;}});
  return {a:a,em:a.expense>0?liquid()/a.expense:null,rate:a.income>0?(a.income-a.expense)/a.income:null,over:over,cnt:cnt};
}
function checkRow(label,val,pct,level,note){
  const pill={good:'Good',ok:'Okay',low:'Needs work'}[level];
  return '<div class="check"><div><b>'+label+'</b> <span class="muted small">'+note+'</span></div><span class="pill '+level+'">'+pill+'</span><div class="bar '+(level==='low'?'bad':level==='ok'?'warn':'')+'"><i style="width:'+Math.max(3,Math.min(100,pct))+'%"></i></div></div>';
}
function checkupHtml(){
  const c=checkup(); let out='';
  if(c.em!==null){ const l=c.em>=6?'good':c.em>=3?'ok':'low'; out+=checkRow('Emergency fund',c.em,c.em/6*100,l,c.em.toFixed(1)+' months of spending in cash and accounts (aim for 6)'); }
  if(c.rate!==null){ const l=c.rate>=.2?'good':c.rate>=.1?'ok':'low'; out+=checkRow('Savings rate',c.rate,c.rate/.3*100,l,Math.round(c.rate*100)+'% of income kept (aim for 20%+)'); }
  if(c.cnt){ const l=c.over===0?'good':c.over<=2?'ok':'low'; out+=checkRow('Budget',0,(c.cnt-c.over)/c.cnt*100,l,c.over===0?'Every category is within its limit this month':c.over+' of '+c.cnt+' categories over limit this month'); }
  return out||'<p class="muted small">Add a few entries and your check-up appears here.</p>';
}
function viewAI(){
  return '<header class="head" style="margin-bottom:10px"><h1>Ask Grow</h1></header>'+
    '<div class="stack">'+
    '<p class="hi">How can I help with your money today?</p>'+
    '<div class="chips">'+['Where did my money go this month?','How can I save more?','How should I invest my savings?','What should I check before taking a loan?'].map(q=>'<button class="chip" data-a="ask" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>'+
    '<div class="tools"><button class="tool" data-a="tool" data-v="loan"><span class="ti">'+ic('loan')+'</span><b>Loan finder</b><span>Compare offers by real cost</span></button>'+
    '<button class="tool" data-a="tool" data-v="card"><span class="ti">'+ic('card')+'</span><b>Card matcher</b><span>Find a card that fits your spending</span></button>'+
    '<button class="tool" data-a="tool" data-v="invest"><span class="ti">'+ic('chart')+'</span><b>Invest planner</b><span>See your mix against a target</span></button></div>'+
    '<section class="card"><h3>Money check-up</h3><div style="margin-top:8px">'+checkupHtml()+'</div></section>'+
    '<p class="note">Tip: type things like “spent 450 on lunch” or “received 7500 freelance” and I will offer to add them for you.</p>'+
    '<div class="chat" id="chatLog" aria-live="polite"></div></div>'+
    '<form class="composer" id="chatForm"><input id="chatIn" type="text" autocomplete="off" placeholder="Ask, or add “spent 450 on lunch”" aria-label="Message"><button class="btn" id="chatBtn" type="submit" aria-label="Send">'+ic('send')+'</button></form>';
}
function mdLite(t){
  let h=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'), out='', ul=false;
  h.split('\n').forEach(function(ln){
    ln=ln.replace(/^#{1,6}\s*/,'');
    const m=ln.match(/^\s*[-•*]\s+(.*)/);
    if(m){ if(!ul){out+='<ul>';ul=true;} out+='<li>'+m[1]+'</li>'; }
    else{ if(ul){out+='</ul>';ul=false;} if(ln.trim()) out+='<p>'+ln+'</p>'; }
  });
  if(ul) out+='</ul>'; return out;
}
function updateChat(scroll){
  const el=$('#chatLog'); if(!el) return;
  el.innerHTML=ui.chat.map(function(m,i){
    if(m.role==='user') return '<div class="msg user">'+esc(m.text)+'</div>';
    let inner=m.pending&&!m.text?'<span class="think" aria-label="Thinking"><i></i><i></i><i></i></span>':mdLite(m.text);
    if(m.quick){
      const q=m.quick;
      inner+='<div class="quick"><div class="lbl">'+(q.type==='income'?'Income':'Expense')+' · '+esc(q.cat)+' · '+esc(accName(q.account))+'</div><div class="qv num '+(q.type==='income'?'inc':'exp')+'">'+money(q.amount)+'</div><div class="small muted">'+esc(q.note)+'</div>'+
        (m.done?'<div class="inc small"><b>Added.</b></div>':'<div class="qa"><button class="btn sm" data-a="quickAdd" data-i="'+i+'">Add it</button><button class="btn ghost sm" data-a="quickEdit" data-i="'+i+'">Edit first</button></div>')+'</div>';
    }
    return '<div class="msg ai">'+inner+'</div>';
  }).join('');
  const b=$('#chatBtn'); if(b){ b.innerHTML=ic(busy?'stop':'send'); b.setAttribute('aria-label',busy?'Stop':'Send'); }
  if(scroll){ const v=$('#view'); v.scrollTop=v.scrollHeight; }
}
const KW=[[/rent/i,'Household','Rent'],[/electric|gas bill|wifi|internet|utility|bill/i,'Household','Utilities'],[/bazar|bazaar|grocer|vegetable|fish|rice/i,'Food','Groceries'],[/lunch|dinner|breakfast|restaurant|cafe|biryani|meal/i,'Food','Dining out'],[/tea|coffee|snack/i,'Food','Snacks'],[/rickshaw|cng|bus|metro/i,'Transport','Rickshaw / CNG'],[/uber|pathao|ride/i,'Transport','Ride share'],[/fuel|petrol|octane|diesel/i,'Transport','Fuel'],[/medicine|pharmacy|doctor|hospital/i,'Health','Medicine'],[/shirt|cloth|dress|shoes|panjabi|saree/i,'Apparel','Clothes'],[/book|course|tuition|school/i,'Education','Books'],[/gift|present/i,'Gift','Gifts'],[/friends|party|hangout|movie/i,'Social Life','Friends']];
function pickAcc(pref){const a=S.accounts.find(x=>x.id===pref)||S.accounts[0];return a?a.id:'cash'}
function parseQuick(t){
  if(t.length>100||/\?|^(how|what|why|where|should|can|is|are)\b/i.test(t.trim())) return null;
  const m=t.match(/(\d[\d,]*(?:\.\d+)?)/); if(!m) return null;
  const amount=parseFloat(m[1].replace(/,/g,'')); if(!(amount>0)) return null;
  const isInc=/\b(earned|received|got paid|salary|income|bonus|freelance)\b/i.test(t);
  const isExp=/\b(spent|spend|paid|bought|buy|expense|purchased)\b/i.test(t);
  if(!isInc&&!isExp) return null;
  const type=isInc?'income':'expense'; let cat='Other',sub='Other';
  if(isInc){ if(/salary/i.test(t)){cat='Salary';sub='Monthly salary'} else if(/freelance|project/i.test(t)){cat='Freelance';sub='Project'} else if(/bonus/i.test(t)){cat='Salary';sub='Bonus'} }
  else{ for(const k of KW){ if(k[0].test(t)){cat=k[1];sub=k[2];break;} } }
  const note=t.trim().replace(/\s+/g,' ').slice(0,60);
  return {type:type,amount:amount,cat:cat,sub:sub,note:note.charAt(0).toUpperCase()+note.slice(1),account:pickAcc(isInc?'bank':'cash')};
}
function snapshot(){
  const mk=nowKey(), cur=monthTx(mk), prev=monthTx(shiftMonth(mk,-1)), a=avgMonthly(), inv=invTotals(), bal=balances();
  const r=n=>Math.round(n);
  const toObj=arr=>Object.fromEntries(catTotals(arr,'expense').map(e=>[e[0],r(e[1])]));
  return JSON.stringify({today:new Date().toDateString(),thisMonth:{income:r(sum(cur,'income')),expenses:r(sum(cur,'expense')),expensesByCategory:toObj(cur)},
    lastMonth:{income:r(sum(prev,'income')),expenses:r(sum(prev,'expense')),expensesByCategory:toObj(prev)},
    averageMonthly:{income:r(a.income),expenses:r(a.expense),saving:r(a.saving)},
    accounts:S.accounts.map(x=>({name:x.name,balance:r(bal[x.id]||0)})),
    investments:S.holdings.map(h=>({name:h.name,type:h.type,invested:r(h.invested),value:r(h.value)})),
    netWorth:r(netWorth()),monthlyBudgets:S.budgets,exampleData:!!S.sample});
}
function rules(){
  return 'You are Grow, a friendly money coach inside a personal finance app used in Bangladesh. All amounts are in BDT (৳). Use the user\'s own data below and cite specific numbers from it. Keep answers short (under 170 words), in plain language, with short "-" bullet lists when helpful. For investing, loans and credit cards, explain how to compare options and what the risks are. You may name general instrument types common in Bangladesh (savings certificates, fixed deposits, treasury bonds, mutual funds, DSE stocks, gold) but you cannot see live rates, offers or product terms, so never state a current interest rate or a specific product as fact; tell the user to check current rates with each bank. You are not a licensed financial adviser; end any investing or borrowing advice with one short reminder to check details before deciding. If the user wants to log a transaction, tell them to write it like "spent 450 on lunch". If exampleData is true, mention once that the numbers are examples. USER DATA: '+snapshot();
}
function localAnswer(q){
  const mk=nowKey(), cur=monthTx(mk), exp=sum(cur,'expense');
  if(/where|spend|spent|breakdown|go(ing)? /i.test(q)&&!/invest|loan|card/i.test(q)){
    const top=catTotals(cur,'expense').slice(0,4);
    if(!top.length) return 'You have no expenses recorded for '+monthLabel(mk)+' yet. Add a few entries and I can break them down.';
    return 'So far in '+monthLabel(mk)+' you spent **'+money(exp)+'**. The biggest categories:\n'+top.map(c=>'- **'+c[0]+'**: '+money(c[1])+' ('+Math.round(c[1]/exp*100)+'%)').join('\n');
  }
  if(/save|saving|cut|reduce/i.test(q)){
    const c=checkup(), flex=['Food','Apparel','Social Life','Gift'].map(k=>[k,catMap(cur,'expense')[k]||0]).sort((a,b)=>b[1]-a[1])[0];
    return '- Your recent saving rate is **'+(c.rate===null?'unknown':Math.round(c.rate*100)+'%')+'**. Many people aim for 20% or more.\n- The flexible category with the most spending this month is **'+flex[0]+'** ('+money(flex[1])+'). A 10% trim there is the easiest start.\n- Move savings out on salary day so you do not rely on what is left over.';
  }
  if(/invest|portfolio/i.test(q)){
    const al=allocation(), tot=Object.values(al).reduce((a,b)=>a+b,0);
    return 'Your money is spread like this:\n'+Object.entries(al).map(e=>'- **'+e[0]+'**: '+Math.round(e[1]/tot*100)+'%').join('\n')+'\nOpen **Invest planner** below to compare it with a target mix. This is general education, not personal advice.';
  }
  if(/loan|emi|borrow/i.test(q)) return 'Before borrowing, compare the **total cost** (interest plus fees), not only the rate, and keep the monthly payment under about 40% of income. The **Loan finder** below does that math for up to three offers. Check each bank for its current rate.';
  if(/card|credit/i.test(q)) return 'A card is only worth it if the rewards beat the annual fee and you pay the full bill each month. Use the **Card matcher** below to compare two cards on your own spending.';
  return 'I can break down your spending, suggest where to save, compare loans and cards, and check your investment mix. Try one of the questions above. Smart answers from Claude need your permission to use Claude in this page.';
}
async function send(text){
  text=text.trim(); if(!text||busy) return;
  if(BACKEND&&SAMPLE&&!S.aiOk&&!noAI&&!parseQuick(text)){ pendingAsk=text; openConsent(); return; }
  ui.chat.push({role:'user',text:text});
  const q=parseQuick(text);
  if(q){ ui.chat.push({role:'ai',text:'Got it. Should I add this?',quick:q,local:true}); updateChat(true); return; }
  const m={role:'ai',text:'',pending:true}; ui.chat.push(m); busy=true; updateChat(true);
  try{
    if(!SAMPLE||noAI) throw {code:'unavailable'};
    ctl=new AbortController();
    const turns=ui.chat.filter(x=>!x.local&&x!==m&&!x.err).slice(-6).map(x=>({role:x.role==='user'?'user':'assistant',content:x.text}));
    const res=await SAMPLE([{role:'user',content:rules()}].concat(turns),{cache:false,signal:ctl.signal,onText:function(u){m.text=u.text;m.pending=false;updateChat(true)}});
    m.text=res.text; m.pending=false;
  }catch(e){
    const code=e&&e.code;
    if(code==='cancelled') m.text=(e.text||'')||'Stopped.';
    else if(e&&e.text) m.text=e.text+'\n\n(The answer was interrupted.)';
    else if(code==='rate_limited'){ m.text='Too many requests right now. Wait a minute and try again.'; m.err=true; }
    else{ m.text=localAnswer(text); m.local=true; }
    m.pending=false;
  }finally{ busy=false; ctl=null; updateChat(true); }
  if(/loan|emi/i.test(text)&&m.local) openLoan();
}

/* ---------- sheets ---------- */
function openSheet(title,body){
  $('#sheet-root').innerHTML='<div class="scrim" data-a="closeSheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="grab"></div><div class="sheet-h"><h2>'+esc(title)+'</h2><button class="iconbtn" data-a="closeSheet" aria-label="Close">'+ic('x')+'</button></div>'+body+'</section>';
  document.body.classList.add('noscroll');
}
function closeSheet(){ $('#sheet-root').innerHTML=''; document.body.classList.remove('noscroll'); draft=null; hdraft=null; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(function(){t.hidden=true},2200); }

function txSheet(){
  const d=draft, tr=d.type==='transfer';
  const cats=tr?[]:Object.keys(CATS[d.type]);
  if(!tr&&!CATS[d.type][d.cat]) d.cat=cats[0];
  const subs=tr?[]:CATS[d.type][d.cat].subs;
  if(!tr&&subs.indexOf(d.sub)<0) d.sub=subs[0];
  const accOpts=sel=>S.accounts.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===sel?' selected':'')+'>'+esc(a.name)+'</option>').join('');
  const body='<form id="txForm" novalidate>'+
    '<div class="tt" role="group" aria-label="Entry type">'+['income','expense','transfer'].map(v=>'<button type="button" data-a="txType" data-v="'+v+'" aria-pressed="'+(d.type===v)+'">'+v.charAt(0).toUpperCase()+v.slice(1)+'</button>').join('')+'</div>'+
    '<div class="f"><label for="f-date">Date</label><input id="f-date" type="datetime-local" value="'+esc(d.date)+'" max="'+nowLocal()+'"></div>'+
    '<div class="f"><label for="f-acc">'+(tr?'From':'Account')+'</label><select id="f-acc">'+accOpts(d.account)+'</select></div>'+
    (tr?'<div class="f"><label for="f-to">To</label><select id="f-to">'+accOpts(d.to||(S.accounts.find(a=>a.id!==d.account)||{}).id)+'</select></div>':
    '<div class="f"><label for="f-cat">Category</label><select id="f-cat">'+cats.map(c=>'<option'+(c===d.cat?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div>'+
    '<div class="f"><label for="f-sub">Subcategory</label><select id="f-sub">'+subs.map(c=>'<option'+(c===d.sub?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div>')+
    '<div class="f"><label for="f-amt">Amount (৳)</label><input id="f-amt" class="big" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" value="'+(d.amount||'')+'"></div>'+
    '<div class="f"><label for="f-note">Note</label><input id="f-note" type="text" placeholder="What was it for?" value="'+esc(d.note)+'"></div>'+
    '<div class="err" id="f-err" role="alert"></div>'+
    '<div class="actions"><button class="btn full" type="submit">Save</button>'+(d.id?'<button class="btn danger full" type="button" data-a="txDelete">'+(d.confirm?'Tap again to delete':'Delete entry')+'</button>':'')+'</div></form>';
  openSheet(d.id?'Edit entry':'Add entry',body);
}
function syncDraft(){
  const g=id=>{const e=$('#'+id);return e?e.value:undefined};
  const d=draft; if(!d) return;
  if(g('f-date')!==undefined) d.date=g('f-date'); if(g('f-acc')!==undefined) d.account=g('f-acc'); if(g('f-to')!==undefined) d.to=g('f-to');
  if(g('f-cat')!==undefined) d.cat=g('f-cat'); if(g('f-sub')!==undefined) d.sub=g('f-sub');
  if(g('f-amt')!==undefined) d.amount=g('f-amt'); if(g('f-note')!==undefined) d.note=g('f-note');
}
function openTx(t){
  draft=t?Object.assign({},t):{type:'expense',date:nowLocal(),account:pickAcc('cash'),to:'',cat:'Food',sub:'Groceries',amount:'',note:''};
  draft.amount=draft.amount||''; txSheet();
}
function saveTx(){
  syncDraft(); const d=draft, amt=parseFloat(d.amount), err=$('#f-err');
  if(!(amt>0)){ err.textContent='Enter an amount greater than zero.'; $('#f-amt').focus(); return; }
  if(!d.date){ err.textContent='Pick a date and time.'; return; }
  if(d.type==='transfer'&&(!d.to||d.to===d.account)){ err.textContent='Choose two different accounts for a transfer.'; return; }
  const rec={id:d.id||uid(),type:d.type,date:d.date.slice(0,16),account:d.account,to:d.type==='transfer'?d.to:'',cat:d.type==='transfer'?'':d.cat,sub:d.type==='transfer'?'':d.sub,amount:Math.round(amt*100)/100,note:(d.note||'').trim()};
  const i=S.txs.findIndex(x=>x.id===rec.id);
  if(i>=0) S.txs[i]=rec; else S.txs.push(rec);
  save(); const mk=rec.date.slice(0,7); if(ui.tab==='daily') ui.month=mk;
  closeSheet(); render(true); toast(d.id?'Entry updated':'Entry added');
}
function holdSheet(){
  const h=hdraft;
  openSheet(h.id?'Edit investment':'Add investment','<form id="holdForm" novalidate>'+
    '<div class="f"><label for="h-name">Name</label><input id="h-name" type="text" placeholder="e.g. Equity mutual fund" value="'+esc(h.name)+'"></div>'+
    '<div class="f"><label for="h-type">Type</label><select id="h-type">'+Object.keys(HTYPES).map(t=>'<option'+(t===h.type?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
    '<div class="f"><label for="h-inv">Invested (৳)</label><input id="h-inv" class="big" type="number" inputmode="decimal" min="0" value="'+(h.invested||'')+'"></div>'+
    '<div class="f"><label for="h-val">Value now (৳)</label><input id="h-val" class="big" type="number" inputmode="decimal" min="0" value="'+(h.value||'')+'"></div>'+
    '<div class="err" id="h-err" role="alert"></div><div class="actions"><button class="btn full" type="submit">Save</button>'+(h.id?'<button class="btn danger full" type="button" data-a="holdDelete">'+(h.confirm?'Tap again to delete':'Remove investment')+'</button>':'')+'</div></form>');
}
function saveHold(){
  const name=$('#h-name').value.trim(), inv=parseFloat($('#h-inv').value), val=parseFloat($('#h-val').value);
  if(!name){ $('#h-err').textContent='Give this investment a name.'; return; }
  if(!(inv>=0)||!(val>=0)){ $('#h-err').textContent='Enter the amount invested and its value today.'; return; }
  const rec={id:hdraft.id||uid(),name:name,type:$('#h-type').value,invested:inv,value:val};
  const i=S.holdings.findIndex(x=>x.id===rec.id); if(i>=0) S.holdings[i]=rec; else S.holdings.push(rec);
  save(); closeSheet(); render(true); toast('Investment saved');
}
function openSettings(confirm){
  const ver=esc(CFG.version||'1.0.0');
  const acc=S.accounts.map(a=>'<div class="f"><label for="ob-'+esc(a.id)+'">'+esc(a.name)+'</label><input id="ob-'+esc(a.id)+'" class="big" type="number" inputmode="decimal" value="'+(+a.open||0)+'"></div>').join('');
  const sampleBtn=S.sample?'<button class="btn ghost full" data-a="clearSample">'+(confirm==='sample'?'Tap again: remove example data':'Clear example data')+'</button>':'<button class="btn ghost full" data-a="loadSample">'+(confirm==='load'?'Tap again: replace my data with examples':'Load example data')+'</button>';
  const aiRow=BACKEND?'<div class="f" style="grid-template-columns:1fr auto;margin-top:8px"><span>AI manager <span class="muted small">'+(S.aiOk?'\u00b7 allowed':'\u00b7 asks before first use')+'</span></span>'+(S.aiOk?'<button type="button" class="link" data-a="aiOff">Turn off</button>':'')+'</div>':'';
  openSheet('Settings','<p class="note">Your data is saved on this device only. Back it up before you switch phones or clear app data.</p>'+
    '<div class="lbl" style="margin:14px 0 2px">Opening balances</div>'+acc+
    '<p class="note" style="margin-top:6px">What each account held before your first entry. Balances and net worth are built from these plus your entries.</p>'+
    '<div class="actions"><button class="btn full" data-a="saveOB">Save balances</button></div>'+
    '<div class="lbl" style="margin:22px 0 8px">Your data</div>'+
    '<div class="actions"><button class="btn ghost full" data-a="backup">Back up to a file</button>'+
    '<label class="btn ghost full" for="restoreFile">Restore from a backup</label><input id="restoreFile" type="file" accept=".json,application/json" hidden>'+
    (DL?'<button class="btn ghost full" data-a="csv">Export entries as CSV</button>':'')+sampleBtn+'</div>'+
    aiRow+
    '<div class="lbl" style="margin:22px 0 2px">Account</div><div class="f" style="grid-template-columns:1fr auto"><span>Not signed in <span class="muted small">\u00b7 accounts coming soon</span></span><button type="button" class="link" data-a="welcome">Welcome screen</button></div>'+
    '<div class="lbl" style="margin:22px 0 4px">About</div><p class="note">Grow '+ver+'. Grow gives general information, not financial, tax or legal advice. <a class="link" href="'+esc(CFG.privacyUrl||'privacy.html')+'" target="_blank" rel="noopener">Privacy policy</a></p>'+
    '<div class="actions" style="margin-top:18px"><button class="btn danger full" data-a="eraseAll">'+(confirm==='erase'?'Tap again: erase everything':'Erase all my data')+'</button></div>');
}
function openConsent(){
  openSheet('Use the AI manager?','<p>To answer, Grow sends your question and a short summary of your numbers (monthly totals, category totals, account balances and investment values) to an AI service. Individual entries and notes are not sent, and Grow does not keep a copy on a server.</p>'+
    '<p class="note" style="margin-top:8px">You can use the rest of Grow without it. Answers are general guidance, not financial advice.</p>'+
    '<div class="actions"><button class="btn full" data-a="aiYes">Allow and ask</button><button class="btn ghost full" data-a="aiNo">Not now</button></div>');
}
function cleanBackup(o){
  const str=v=>String(v==null?'':v).slice(0,200), num=v=>{v=+v;return isFinite(v)?v:0};
  const okDate=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  const b={}; if(o.budgets&&typeof o.budgets==='object') Object.keys(o.budgets).slice(0,50).forEach(k=>{b[str(k)]=num(o.budgets[k])});
  return {v:1,sample:false,hide:!!o.hide,entered:true,aiOk:S.aiOk,
    accounts:o.accounts.filter(a=>a&&a.id).slice(0,20).map(a=>({id:str(a.id),name:str(a.name),open:num(a.open)})),
    txs:o.txs.filter(t=>t&&['income','expense','transfer'].indexOf(t.type)>=0&&okDate.test(String(t.date))).slice(0,50000).map(t=>({id:str(t.id)||uid(),type:t.type,date:str(t.date).slice(0,16),account:str(t.account),to:str(t.to),cat:str(t.cat),sub:str(t.sub),amount:Math.abs(num(t.amount)),note:str(t.note)})),
    holdings:(Array.isArray(o.holdings)?o.holdings:[]).slice(0,500).map(h=>({id:str(h&&h.id)||uid(),name:str(h&&h.name),type:HTYPES[h&&h.type]?h.type:'Other',invested:num(h&&h.invested),value:num(h&&h.value)})),
    budgets:b};
}
function readRestore(f){
  if(!f) return;
  const r=new FileReader();
  r.onload=function(){
    try{
      const o=JSON.parse(String(r.result));
      if(!o||!Array.isArray(o.txs)||!Array.isArray(o.accounts)||!o.accounts.length) throw new Error('shape');
      restoreObj=cleanBackup(o);
      openSheet('Restore this backup?','<p>This backup has <b>'+restoreObj.txs.length+'</b> entries and <b>'+restoreObj.holdings.length+'</b> investments. Restoring replaces everything now on this device.</p><div class="actions"><button class="btn full" data-a="restoreYes">Replace my data</button><button class="btn ghost full" data-a="closeSheet">Cancel</button></div>');
    }catch(e){ toast('That file is not a Grow backup'); }
  };
  r.onerror=function(){ toast('Could not read that file'); };
  r.readAsText(f);
}
function csvExport(){
  if(!DL) return;
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['Date','Type','Category','Subcategory','Account','To account','Amount','Note']].concat(S.txs.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date.replace('T',' '),t.type,t.cat,t.sub,accName(t.account),t.to?accName(t.to):'',t.amount,t.note]));
  DL.save({filename:'grow-transactions.csv',data:rows.map(r=>r.map(q).join(',')).join('\n')}).then(()=>toast('CSV ready')).catch(e=>{ if(e&&e.code!=='declined') toast('Could not save the file'); });
}

/* tools */
function emi(p,rate,years){
  const n=Math.round(years*12), r=rate/100/12;
  if(n<=0) return 0; if(r===0) return p/n;
  return p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
}
function openLoan(){
  const a=avgMonthly();
  openSheet('Loan finder','<p class="note">Enter the quotes you have received. The three rows below hold example rates. Replace them with what each bank actually offers you.</p>'+
    '<div class="f" style="margin-top:8px"><label for="l-amt">Amount (৳)</label><input id="l-amt" class="big" type="number" inputmode="numeric" value="500000"></div>'+
    '<div class="f"><label for="l-yrs">Years</label><input id="l-yrs" class="big" type="number" inputmode="decimal" step="0.5" value="3"></div>'+
    '<div class="f"><label for="l-fee">Fee (%)</label><input id="l-fee" type="number" inputmode="decimal" step="0.1" value="1"></div>'+
    '<div style="margin-top:12px">'+[['Option A','10.5'],['Option B','11.5'],['Option C','12.5']].map((o,i)=>'<div class="loanrow"><input id="l-n'+i+'" type="text" value="'+o[0]+'" aria-label="Offer '+(i+1)+' name"><input id="l-r'+i+'" type="number" inputmode="decimal" step="0.05" value="'+o[1]+'" aria-label="Offer '+(i+1)+' yearly rate, percent" placeholder="Rate % a year"></div>').join('')+'</div>'+
    '<div class="res" id="loanOut" data-income="'+Math.round(a.income)+'"></div>');
  calcLoan();
}
function calcLoan(){
  const out=$('#loanOut'); if(!out) return;
  const p=parseFloat($('#l-amt').value), y=parseFloat($('#l-yrs').value), fee=parseFloat($('#l-fee').value)||0, inc=+out.dataset.income;
  if(!(p>0)||!(y>0)){ out.innerHTML='<p class="note">Enter an amount and a number of years.</p>'; return; }
  const offers=[0,1,2].map(i=>({n:$('#l-n'+i).value||'Option '+(i+1),r:parseFloat($('#l-r'+i).value)})).filter(o=>o.r>=0).map(function(o){
    const m=emi(p,o.r,y), n=Math.round(y*12), interest=m*n-p, f=p*fee/100; return {n:o.n,r:o.r,m:m,interest:interest,fee:f,total:interest+f};
  }).sort((a,b)=>a.total-b.total);
  if(!offers.length){ out.innerHTML='<p class="note">Enter at least one yearly rate.</p>'; return; }
  out.innerHTML=offers.map((o,i)=>'<div class="opt'+(i===0?' best':'')+'"><b>'+esc(o.n)+' · '+o.r+'%</b><b class="num">'+money(o.m)+'<span class="muted small"> / month</span></b><span class="small muted">Interest '+money(o.interest)+' + fee '+money(o.fee)+'</span><span class="small num">Total cost '+money(o.total)+(i===0?' · lowest':'')+'</span></div>').join('')+
    (inc?'<p class="note">'+(offers[0].m/inc>0.4?'<b class="exp">Heads up:</b> ':'')+'The lowest payment is about <b>'+Math.round(offers[0].m/inc*100)+'%</b> of your average monthly income. Lenders and planners often like to see debt payments under roughly 40%.</p>':'')+
    '<p class="note">Ask each bank: is the rate fixed or floating, what are the processing and early-repayment fees, and what is the all-in cost per year. Rates change, so confirm today\'s quote before deciding. Figures use the standard monthly installment formula.</p>';
}
function openCard(){
  const a=avgMonthly(), top=catTotals(monthTx(shiftMonth(nowKey(),-1)).length?monthTx(shiftMonth(nowKey(),-1)):monthTx(nowKey()),'expense')[0];
  const def=top&&top[0]==='Transport'?'fuel':top&&top[0]==='Food'?'dining':'online';
  openSheet('Card matcher','<div class="f"><label for="c-use">Mostly for</label><select id="c-use"><option value="dining"'+(def==='dining'?' selected':'')+'>Dining and groceries</option><option value="online"'+(def==='online'?' selected':'')+'>Online shopping</option><option value="travel">Travel</option><option value="fuel"'+(def==='fuel'?' selected':'')+'>Fuel and transport</option></select></div>'+
    '<div class="f"><label for="c-spend">Card spend / month (৳)</label><input id="c-spend" class="big" type="number" inputmode="numeric" value="'+(Math.max(5000,Math.round(a.expense*0.4/1000)*1000))+'"></div>'+
    '<div class="f"><label for="c-fee">Fee tolerance</label><select id="c-fee"><option value="0">No annual fee</option><option value="2000" selected>Up to ৳2,000</option><option value="5000">Up to ৳5,000</option><option value="99999">Fee is fine if rewards are strong</option></select></div>'+
    '<div id="cardOut" class="res"></div>'+
    '<div class="lbl" style="margin:16px 0 6px">Compare two cards you are considering</div>'+
    '<div class="cmp"><span></span><b>Card A</b><b>Card B</b><span>Reward %</span><input id="c-ra" type="number" step="0.1" inputmode="decimal" value="1" aria-label="Card A reward percent"><input id="c-rb" type="number" step="0.1" inputmode="decimal" value="2" aria-label="Card B reward percent">'+
    '<span>Fee ৳/yr</span><input id="c-fa" type="number" inputmode="numeric" value="0" aria-label="Card A annual fee"><input id="c-fb" type="number" inputmode="numeric" value="3000" aria-label="Card B annual fee"></div>'+
    '<div class="res" id="cmpOut"></div><p class="note" style="margin-top:10px">The reward and fee boxes hold example numbers. Use the real terms from each issuer.</p>');
  calcCard();
}
function calcCard(){
  const out=$('#cardOut'); if(!out) return;
  const use=$('#c-use').value, fee=+$('#c-fee').value, spend=parseFloat($('#c-spend').value)||0;
  const P={dining:['Dining or restaurant partner discounts','Cashback on grocery and supermarket spend','Low or waived annual fee when you reach a spend target'],
    online:['Cashback or points on online purchases','Instalment plans at 0% with partner merchants','Strong fraud protection and easy dispute handling'],
    travel:['Airport lounge access','Miles or travel points with a transfer option','Travel insurance and no foreign-currency markup if you travel abroad'],
    fuel:['Fuel surcharge waiver or fuel cashback','Rewards on ride-sharing and transport apps','Simple flat cashback, since this spend is steady']}[use];
  out.innerHTML='<div class="card flat" style="background:var(--accent-soft);border-color:transparent"><div class="lbl" style="color:var(--accent)">Look for</div><ul style="margin:6px 0 0;padding-left:18px">'+P.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>'+
    '<p class="note">'+(fee===0?'You want no annual fee, so look for lifetime-free cards and check how reward rates are lower.':'Your fee limit is '+(fee>=99999?'open':money(fee))+'. Divide the annual fee by your yearly spend ('+money(spend*12)+') to see what reward rate you need to break even.')+' Pay the full bill every month: card interest costs far more than most rewards earn.</p>';
  const A=[+$('#c-ra').value||0,+$('#c-fa').value||0], B=[+$('#c-rb').value||0,+$('#c-fb').value||0];
  const na=spend*12*A[0]/100-A[1], nb=spend*12*B[0]/100-B[1], win=na>=nb?'A':'B';
  $('#cmpOut').innerHTML='<div class="opt'+(win==='A'?' best':'')+'"><b>Card A</b><b class="num '+(na>=0?'inc':'exp')+'">'+money(na)+' / year</b><span class="small muted">'+money(spend*12*A[0]/100)+' rewards − '+money(A[1])+' fee</span></div>'+
    '<div class="opt'+(win==='B'?' best':'')+'"><b>Card B</b><b class="num '+(nb>=0?'inc':'exp')+'">'+money(nb)+' / year</b><span class="small muted">'+money(spend*12*B[0]/100)+' rewards − '+money(B[1])+' fee</span></div>';
}
const PROFILES={Cautious:{'Cash':20,'Fixed income':50,'Mutual funds':12,'Stocks':5,'Gold':10,'Other':3},Balanced:{'Cash':10,'Fixed income':35,'Mutual funds':25,'Stocks':20,'Gold':10,'Other':0},Growth:{'Cash':5,'Fixed income':20,'Mutual funds':30,'Stocks':35,'Gold':10,'Other':0}};
function openInvest(){
  openSheet('Invest planner','<div class="f"><label for="i-risk">Comfort with ups and downs</label><select id="i-risk"><option>Cautious</option><option selected>Balanced</option><option>Growth</option></select></div>'+
    '<div class="f"><label for="i-hor">Money needed in</label><select id="i-hor"><option value="s">Under 3 years</option><option value="m">3 to 7 years</option><option value="l" selected>7 years or more</option></select></div>'+
    '<div class="res" id="invOut"></div>');
  calcInvest();
}
function calcInvest(){
  const out=$('#invOut'); if(!out) return;
  const risk=$('#i-risk').value, hor=$('#i-hor').value, T=Object.assign({},PROFILES[risk]);
  if(hor==='s'){ const sh=Math.min(T['Stocks'],15); T['Stocks']-=sh; T['Fixed income']+=sh; }
  const al=allocation(), tot=Object.values(al).reduce((a,b)=>a+b,0)||1;
  const keys=Object.keys(BUCKET_COLOR);
  const rows=keys.map(k=>({k:k,cur:(al[k]||0)/tot*100,tar:T[k]||0}));
  const gaps=rows.filter(r=>Math.abs(r.cur-r.tar)>=8).sort((a,b)=>Math.abs(b.cur-b.tar)-Math.abs(a.cur-a.tar)).slice(0,3);
  out.innerHTML='<div class="card flat">'+rows.map(r=>'<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><b>'+r.k+'</b><span class="num">'+Math.round(r.cur)+'% now · '+r.tar+'% target</span></div><div class="bar" style="margin-top:5px;position:relative"><i style="width:'+Math.min(100,r.cur)+'%;background:'+BUCKET_COLOR[r.k]+'"></i></div><div class="bar" style="height:4px;margin-top:3px;opacity:.6"><i style="width:'+r.tar+'%;background:var(--ink)"></i></div></div>').join('')+'<div class="key"><span><i style="background:var(--accent)"></i>Now</span><span><i style="background:var(--ink)"></i>Target</span></div></div>'+
    (gaps.length?'<p><b>Biggest gaps</b></p><ul style="margin:0;padding-left:18px">'+gaps.map(g=>'<li>'+g.k+' is '+Math.round(g.cur)+'% against a '+g.tar+'% target ('+(g.cur>g.tar?'above':'below')+').</li>').join('')+'</ul>':'<p>Your mix is close to this target.</p>')+
    '<p class="note">Cash counts every account balance. Targets are simple rules of thumb for learning, not advice for your situation. Check fees, taxes, lock-in periods and risks of each product, and consider speaking with a licensed adviser.</p>';
}

/* ---------- WELCOME + LOGIN ---------- */
function pix(kind){
  const P={
    plus:[[1,0,'#1fc98a'],[0,1,'#8ee3bf'],[1,1,'#1fc98a'],[2,1,'#8ee3bf'],[1,2,'#1fc98a']],
    stairs:[[2,0,'#e8830c'],[1,1,'#f2b985'],[2,1,'#f2b985'],[0,2,'#e8830c'],[1,2,'#e8830c'],[2,2,'#f2b985']],
    blocks:[[0,0,'#f7e08a'],[1,0,'#f2bd10'],[2,0,'#f2bd10'],[2,1,'#f7e08a'],[0,2,'#f2bd10'],[2,2,'#f2bd10']]
  };
  return '<svg viewBox="0 0 3 3" width="34" height="34" aria-hidden="true" shape-rendering="crispEdges">'+P[kind].map(r=>'<rect x="'+r[0]+'" y="'+r[1]+'" width="1" height="1" fill="'+r[2]+'"/>').join('')+'</svg>';
}
function viewLaunch(){
  return '<div class="onb-wrap"><div class="deco" aria-hidden="true"><i class="dia d1"></i><i class="dia d2"></i><i class="dia d3"></i></div>'+
    '<div><div class="brandrow"><span class="logo big">'+ic('chart')+'</span>Grow</div>'+
    '<h1 class="hero-h">We help you achieve <em>Financial Freedom</em></h1>'+
    '<p class="hero-p">Track every taka you earn and spend, watch your whole portfolio in one place, and get guidance from your AI finance manager.</p></div>'+
    '<div class="feat"><div>'+pix('plus')+'<b>Manage money</b></div><div>'+pix('stairs')+'<b>Invest smarter</b></div><div>'+pix('blocks')+'<b>Track everything</b></div></div>'+
    '<div class="aicard"><span class="ti">'+ic('ai')+'</span>All in one app, powered by your AI finance manager</div>'+
    '<div><button class="btn dark full" data-a="toLogin">Get started</button><p class="note center" style="margin-top:12px">Free to use. No account needed for now.</p></div></div>';
}
function viewLogin(){
  return '<div class="onb-wrap"><div><button class="iconbtn" data-a="back" aria-label="Back">'+ic('chev').replace('<svg','<svg style="transform:scaleX(-1)"')+'</button></div>'+
    '<div><span class="logo big">'+ic('chart')+'</span><h1 class="hero-h sm">Welcome to Grow</h1><p class="hero-p">Accounts will let you sync your money across devices. They are coming soon.</p></div>'+
    '<section class="card"><div class="banner" style="margin-bottom:10px"><span><b>Login is not open yet.</b> For now Grow works on this device without an account.</span></div>'+
    '<form class="dis" aria-disabled="true"><div class="f"><label for="lg-e">Email</label><input id="lg-e" type="email" placeholder="you@example.com" disabled></div>'+
    '<div class="f"><label for="lg-p">Password</label><input id="lg-p" type="password" placeholder="••••••••" disabled></div></form>'+
    '<button class="btn ghost full" style="margin-top:12px" disabled>Log in <span class="soon">Soon</span></button>'+
    '<div class="or">or</div>'+
    '<div class="grid2"><button class="btn ghost" disabled>Google <span class="soon">Soon</span></button><button class="btn ghost" disabled>Apple <span class="soon">Soon</span></button></div></section>'+
    '<div><button class="btn dark full" data-a="guest">Continue without login</button><p class="note center" style="margin-top:12px">Your entries stay on this device. You can sign in later once accounts open.</p></div></div>';
}

/* ---------- render + events ---------- */
const NAV=[['home','Home','home'],['daily','Daily','daily'],['ai','Ask AI','ai'],['history','History','history']];
function render(keep){
  const v=$('#view'), st=v.scrollTop, onb=ui.screen!=='app';
  document.body.classList.toggle('onb',onb);
  $('#nav').hidden=onb;
  if(onb){ $('#fab').hidden=true; v.innerHTML=ui.screen==='login'?viewLogin():viewLaunch(); v.scrollTop=0; return; }
  v.innerHTML=({home:viewHome,daily:viewDaily,ai:viewAI,history:viewHistory})[ui.tab]();
  $('#nav').innerHTML=NAV.map(n=>'<button data-a="tab" data-v="'+n[0]+'"'+(ui.tab===n[0]?' aria-current="page"':'')+'>'+ic(n[2])+n[1]+'</button>').join('');
  $('#fab').hidden=(ui.tab!=='daily'&&ui.tab!=='history');
  if(ui.tab==='ai') updateChat(false);
  v.scrollTop=keep?st:0;
}
const H={
  toLogin:()=>{ ui.screen='login'; render(); },
  back:()=>{ ui.screen='launch'; render(); },
  guest:()=>{ S.entered=true; save(); ui.screen='app'; ui.tab='home'; render(); },
  welcome:()=>{ closeSheet(); ui.screen='launch'; render(); },
  tab:el=>{ ui.tab=el.dataset.v; render(); },
  homeSeg:el=>{ ui.homeSeg=el.dataset.v; render(true); },
  hide:()=>{ S.hide=!S.hide; save(); render(true); },
  goDaily:()=>{ ui.tab='daily'; ui.dseg='stats'; ui.month=nowKey(); render(); },
  add:()=>openTx(null),
  edit:el=>{ const t=S.txs.find(x=>x.id===el.dataset.id); if(t) openTx(t); },
  mPrev:()=>{ ui.month=shiftMonth(ui.month,-1); render(true); },
  mNext:()=>{ if(ui.month<nowKey()){ ui.month=shiftMonth(ui.month,1); render(true); } },
  dseg:el=>{ ui.dseg=el.dataset.v; render(true); },
  stype:el=>{ ui.statsType=el.dataset.v; render(true); },
  htype:el=>{ ui.hist.type=el.dataset.v; ui.hist.limit=80; render(true); },
  histMore:()=>{ ui.hist.limit+=80; $('#histOut').innerHTML=histListHtml(); },
  closeSheet:closeSheet,
  txType:el=>{ syncDraft(); const t=el.dataset.v; draft.type=t; if(t!=='transfer'){ draft.cat=Object.keys(CATS[t])[0]; draft.sub=CATS[t][draft.cat].subs[0]; if(t==='income') draft.account=pickAcc('bank'); else draft.account=pickAcc('cash'); } txSheet(); },
  txDelete:()=>{ if(!draft.confirm){ syncDraft(); draft.confirm=true; txSheet(); return; } S.txs=S.txs.filter(x=>x.id!==draft.id); save(); closeSheet(); render(true); toast('Entry deleted'); },
  holdAdd:()=>{ hdraft={name:'',type:'Stocks',invested:'',value:''}; holdSheet(); },
  holdEdit:el=>{ const h=S.holdings.find(x=>x.id===el.dataset.id); if(h){ hdraft=Object.assign({},h); holdSheet(); } },
  holdDelete:()=>{ if(!hdraft.confirm){ hdraft.confirm=true; const f={name:$('#h-name').value,type:$('#h-type').value,invested:$('#h-inv').value,value:$('#h-val').value}; Object.assign(hdraft,f); holdSheet(); return; } S.holdings=S.holdings.filter(x=>x.id!==hdraft.id); save(); closeSheet(); render(true); toast('Investment removed'); },
  settings:()=>openSettings(),
  saveOB:()=>{ S.accounts.forEach(a=>{ const e=$('#ob-'+a.id); if(e) a.open=parseFloat(e.value)||0; }); save(); closeSheet(); render(true); toast('Balances saved'); },
  clearSample:el=>{ if(!H.clearSample.armed){ H.clearSample.armed=true; openSettings('sample'); return; } H.clearSample.armed=false; const keep={hide:S.hide,entered:true,aiOk:S.aiOk}; S=Object.assign(makeEmpty(),keep); save(); closeSheet(); render(); toast('Example data cleared'); },
  loadSample:()=>{ if(!H.loadSample.armed){ H.loadSample.armed=true; openSettings('load'); return; } H.loadSample.armed=false; const keep={hide:S.hide,entered:true,aiOk:S.aiOk}; S=Object.assign(makeSeed(),keep); save(); closeSheet(); render(); toast('Example data loaded'); },
  csv:csvExport,
  backup:()=>{ if(!DL) return; const d=new Date(); DL.save({filename:'grow-backup-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json',data:JSON.stringify(S)}).then(()=>toast('Backup ready')).catch(e=>{ if(e&&e.code!=='declined'&&e.code!=='cancelled') toast('Could not save the file'); }); },
  restoreYes:()=>{ if(!restoreObj) return; S=restoreObj; restoreObj=null; fixShape(); save(); ui.screen='app'; ui.tab='home'; closeSheet(); render(); toast('Backup restored'); },
  trySample:()=>{ const keep={hide:S.hide,entered:true,aiOk:S.aiOk}; S=Object.assign(makeSeed(),keep); save(); render(); },
  aiYes:()=>{ S.aiOk=true; save(); closeSheet(); const t=pendingAsk; pendingAsk=''; if(t) send(t); },
  aiNo:()=>{ noAI=true; closeSheet(); const t=pendingAsk; pendingAsk=''; if(t) send(t); },
  aiOff:()=>{ S.aiOk=false; noAI=false; save(); openSettings(); },
  eraseAll:()=>{ if(!H.eraseAll.armed){ H.eraseAll.armed=true; openSettings('erase'); return; } H.eraseAll.armed=false; const keep={entered:true,aiOk:S.aiOk,hide:S.hide}; S=Object.assign(makeEmpty(),keep); save(); closeSheet(); render(); toast('All data erased'); },
  ask:el=>{ send(el.dataset.q); },
  tool:el=>{ ({loan:openLoan,card:openCard,invest:openInvest})[el.dataset.v](); },
  quickAdd:el=>{ const m=ui.chat[+el.dataset.i]; if(!m||!m.quick||m.done) return; const q=m.quick; S.txs.push({id:uid(),type:q.type,date:nowLocal(),account:q.account,to:'',cat:q.cat,sub:q.sub,amount:q.amount,note:q.note}); m.done=true; save(); updateChat(false); toast(q.type==='income'?'Income added':'Expense added'); },
  quickEdit:el=>{ const m=ui.chat[+el.dataset.i]; if(!m||!m.quick) return; const q=m.quick; m.done=true; openTx({type:q.type,date:nowLocal(),account:q.account,to:'',cat:q.cat,sub:q.sub,amount:q.amount,note:q.note}); updateChat(false); }
};
document.addEventListener('click',function(e){
  const el=e.target.closest('[data-a]'); if(!el) return;
  const a=el.dataset.a;
  if(a!=='clearSample'&&a!=='loadSample'&&a!=='eraseAll'){ H.clearSample.armed=false; H.loadSample.armed=false; H.eraseAll.armed=false; }
  if(H[a]){ if(el.tagName==='A') e.preventDefault(); H[a](el,e); }
});
document.addEventListener('submit',function(e){
  e.preventDefault();
  const id=e.target.id;
  if(id==='txForm') saveTx();
  else if(id==='holdForm') saveHold();
  else if(id==='chatForm'){
    if(busy&&ctl){ ctl.abort(); return; }
    const inp=$('#chatIn'), v=inp.value; if(!v.trim()) return; inp.value=''; send(v);
  }
});
document.addEventListener('change',function(e){
  const t=e.target;
  if(t.id==='f-cat'&&draft){ syncDraft(); draft.sub=CATS[draft.type][draft.cat].subs[0]; txSheet(); }
  else if(t.id==='f-acc'&&draft&&draft.type==='transfer'){ syncDraft(); }
  else if(t.id==='restoreFile'){ readRestore(t.files&&t.files[0]); t.value=''; }
  else if(t.id==='h-month'){ ui.hist.month=t.value; ui.hist.limit=80; $('#histOut').innerHTML=histListHtml(); }
  else if(t.dataset&&t.dataset.budget){ const v=parseFloat(t.value); S.budgets[t.dataset.budget]=v>0?v:0; save(); render(true); }
  else if(t.id==='i-risk'||t.id==='i-hor') calcInvest();
  else if(t.id==='c-use'||t.id==='c-fee') calcCard();
});
document.addEventListener('input',function(e){
  const t=e.target;
  if(t.id==='h-q'){ ui.hist.q=t.value; ui.hist.limit=80; $('#histOut').innerHTML=histListHtml(); }
  else if(t.id&&t.id.indexOf('l-')===0) calcLoan();
  else if(t.id&&t.id.indexOf('c-')===0&&t.id!=='c-use'&&t.id!=='c-fee') calcCard();
  else if(t.id==='c-spend') calcCard();
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&$('#sheet-root').firstChild) closeSheet(); });

/* ---------- platform: AI backend, downloads, native shell ---------- */
function backendAI(){
  return async function(input,opts){
    opts=opts||{};
    let r;
    try{
      r=await fetch((CFG.apiBase||'')+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:input}),signal:opts.signal});
    }catch(e){
      if(e&&e.name==='AbortError') throw {code:'cancelled',message:'cancelled'};
      throw {code:'unavailable',message:'offline'};
    }
    let j=null; try{ j=await r.json(); }catch(e){}
    if(!r.ok||!j||!j.text) throw {code:r.status===429?'rate_limited':(r.status===404||r.status===503)?'unavailable':'upstream_error',message:(j&&j.error)||'failed'};
    if(opts.onText) opts.onText({text:j.text,delta:j.text});
    return {text:j.text,truncated:false};
  };
}
function localDownloader(){
  return {save:async function(o){
    if(NATIVE){
      const FS=Plug('Filesystem'), SH=Plug('Share');
      if(!FS||!SH) throw {code:'unavailable'};
      const w=await FS.writeFile({path:o.filename,data:String(o.data),directory:'CACHE',encoding:'utf8'});
      await SH.share({title:o.filename,url:w.uri,dialogTitle:'Save or share'});
      return {status:'saved'};
    }
    const mime=/\.json$/i.test(o.filename)?'application/json':'text/csv';
    const url=URL.createObjectURL(new Blob([o.data],{type:mime+';charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download=o.filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},4000);
    return {status:'saved'};
  }};
}
SAMPLE=backendAI(); BACKEND=true; DL=localDownloader();

render();

/* inside the Claude viewer the page can use Claude directly; elsewhere the backend above is used */
(async function(){
  try{
    if(window.claude&&window.claude.use){
      const s=await window.claude.use('sample'); const d=await window.claude.use('downloads');
      if(s){ SAMPLE=s; BACKEND=false; } if(d) DL=d;
    }
  }catch(e){}
})();

if(NATIVE){
  const A=Plug('App');
  if(A&&A.addListener) A.addListener('backButton',function(){
    if($('#sheet-root').firstChild){ closeSheet(); return; }
    if(ui.screen==='login'){ H.back(); return; }
    if(ui.screen==='app'&&ui.tab!=='home'){ ui.tab='home'; render(); return; }
    if(A.exitApp) A.exitApp();
  });
  const SB=Plug('StatusBar');
  if(SB){
    const dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(SB.setStyle) SB.setStyle({style:dark?'DARK':'LIGHT'}).catch(function(){});
    if(SB.setBackgroundColor) SB.setBackgroundColor({color:dark?'#0c1511':'#f2f6f3'}).catch(function(){});
  }
  if(!hadLocal){
    const P=Plug('Preferences');
    if(P&&P.get) P.get({key:KEY}).then(function(r){
      if(!(r&&r.value)||S.txs.length||S.entered) return;
      try{
        const o=JSON.parse(r.value);
        if(o&&Array.isArray(o.txs)&&Array.isArray(o.accounts)&&o.accounts.length){
          S=o; fixShape(); ui.screen=S.entered?'app':'launch';
          try{ localStorage.setItem(KEY,r.value); }catch(e){}
          render();
        }
      }catch(e){}
    }).catch(function(){});
  }
}else if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
})();
