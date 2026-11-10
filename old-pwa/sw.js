/* Grow service worker: offline-first for the app shell. Cache name is stamped by the build. */
const CACHE='grow-1.0.0-mw6ltu68';
const FILES=["./","app.js","config.js","fonts/instrument-sans-latin-400-normal.woff2","fonts/instrument-sans-latin-500-normal.woff2","fonts/instrument-sans-latin-600-normal.woff2","fonts/instrument-sans-latin-700-normal.woff2","fonts/newsreader-latin-400-italic.woff2","fonts/newsreader-latin-400-normal.woff2","fonts/newsreader-latin-500-normal.woff2","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest","privacy.html","styles.css"];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{
    if(res&&res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(r,copy)); }
    return res;
  }).catch(()=>r.mode==='navigate'?caches.match('index.html'):undefined)));
});
