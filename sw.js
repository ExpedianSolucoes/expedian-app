/* ═══════════════════════════════
   EXPEDIAN — Service Worker v3
   Cache-first para o app,
   network-only para APIs externas
═══════════════════════════════ */
const CACHE_NAME = 'expedian-v3';

const APP_SHELL = [
  '/expedian-app/',
  '/expedian-app/index.html',
];

// Instalar: cacheia o shell do app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Ativar: remove caches antigas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first para o app, ignora APIs externas
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Nunca interceptar chamadas a APIs externas
  if (
    url.includes('sharepoint.com') ||
    url.includes('microsoftonline.com') ||
    url.includes('graph.microsoft.com') ||
    url.includes('login.microsoft') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('api.anthropic.com')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>EXPEDIAN — Offline</title>
            <style>
              body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
                min-height:100vh;margin:0;background:#f4f7f4;color:#333}
              .box{text-align:center;padding:40px;max-width:340px}
              .icon{font-size:3rem;margin-bottom:16px}
              h2{font-size:1.2rem;margin:0 0 8px}
              p{font-size:.88rem;color:#666;line-height:1.5}
              button{margin-top:20px;padding:10px 24px;background:#6bbf6b;color:#fff;
                border:none;border-radius:8px;font-size:.9rem;cursor:pointer}
            </style></head><body>
            <div class="box">
              <div class="icon">📵</div>
              <h2>Sem conexão</h2>
              <p>O app EXPEDIAN está offline.<br>
              Os dados preenchidos foram salvos localmente e serão sincronizados ao reconectar.</p>
              <button onclick="location.reload()">🔄 Tentar novamente</button>
            </div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        )
      )
  );
});

// Mensagem para forçar atualização
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
