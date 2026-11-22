/* Service worker : un petit "gardien" qui garde une copie de l'appli sur le téléphone.
   Résultat : l'appli peut s'installer, et elle s'ouvre même sans internet.
   Quand il y a internet, on prend toujours la dernière version (utile pour la V2, V3…). */
const CACHE = 'plan-etude-v1';
const FICHIERS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(FICHIERS.map(f => cache.add(new Request(f, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n.startsWith('plan-etude-') && n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const reseau = fetch(req, { cache: 'no-cache' }).then(rep => {
    if (rep && rep.ok) {
      const copie = rep.clone();  // à faire tout de suite, avant que la page ne lise la réponse
      caches.open(CACHE).then(c => c.put(req, copie));
    }
    return rep;
  });
  event.waitUntil(reseau.catch(() => {}));
  event.respondWith(
    // Internet d'abord (4 s max), sinon la copie gardée sur le téléphone.
    Promise.race([reseau, new Promise((_, rejeter) => setTimeout(rejeter, 4000))]).catch(async () => {
      const copie = await caches.match(req, { ignoreSearch: true }) || await caches.match('./index.html');
      return copie || reseau;
    })
  );
});
