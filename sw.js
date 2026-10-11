/* Dungeon Studies' service worker.
 *
 * The game was always one file you could open from disk, and installing it as
 * an app must not cost that. So this caches the shell and nothing clever: the
 * page, the icons, the manifest. Everything the game needs is already inside
 * index.html, which is why there is no asset list to keep in step.
 *
 * Bump CACHE_V on release. The old cache is deleted on activate.
 *
 * What this deliberately does NOT do is take over on its own. It used to call
 * skipWaiting() the moment it installed, the page reloaded itself when the
 * controller changed, and the result was that deploying an update SHUT THE
 * GAME DOWN AND REOPENED IT under whoever was playing. Mid-run that is rude;
 * mid-arena it is destructive, because a match is never written to the save
 * and an online one takes everybody else down with it. So a new worker waits,
 * the page offers the update when the player is somewhere safe, and nothing
 * moves until they say so.
 */
const CACHE_V = 'dungeon-studies-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_V)
      /* one miss must not fail the whole install, so they go in one at a time */
      .then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{}))))
  );
  /* no skipWaiting: this one waits until the page asks for it */
});

/* The page asking. Sent only when the player taps Reload. */
self.addEventListener('message', e=>{
  if(e.data && e.data.t === 'skip') self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE_V).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Never touch the API. A cached answer from Anthropic would be wrong and a
     cached failure would be worse. */
  if(url.origin !== self.location.origin) return;

  /* Network-first for the page itself, so a deployed update is picked up as
     soon as there is a connection, and the cache is the fallback rather than
     the source of truth. Everything else is cache-first: the icons never
     change without a version bump. */
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if(isPage){
    e.respondWith(
      fetch(req)
        .then(res=>{ const copy = res.clone();
                     caches.open(CACHE_V).then(c=>c.put(req, copy)).catch(()=>{});
                     return res; })
        .catch(()=>caches.match(req).then(r=>r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=>r || fetch(req)));
});
