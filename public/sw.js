// AgnelArena service worker — enables PWA installability and receives Web
// Push notifications (booking alerts for staff, slot reminders for
// customers). No offline caching/asset strategy on purpose: this app is
// dynamic on every page (live slot availability, auth-gated dashboards), so
// caching responses would risk serving stale booking data. The only jobs
// here are (1) exist, so the browser considers the site an installable PWA,
// and (2) handle push/notificationclick events.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'AgnelArena', body: event.data.text() };
  }

  const title = payload.title || 'AgnelArena';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = allClients.find((client) => new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname);
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
