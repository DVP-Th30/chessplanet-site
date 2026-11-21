// Service worker minimal (D-104) : uniquement Web Push.
// Volontairement AUCUN gestionnaire « fetch » et AUCUN cache : le site est toujours servi
// par le réseau, une vieille version ne peut jamais rester collée sur un téléphone.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Textes de secours si le serveur n'envoie pas de titre (charge utile attendue :
// { title?, body?, url?, board_id?, type? }, voir docs/ARCHITECTURE.md, section Front-end).
const FALLBACK = {
  title: 'Échecs en Ville',
  win: 'Ton équipe a gagné une partie !',
  draw: 'Une de tes parties s’est terminée par une nulle.',
  loss: 'Une de tes parties est terminée.',
};

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || FALLBACK.title;
  const body = data.body || FALLBACK[data.type] || '';
  const url = data.url || (data.board_id ? `plateau/${data.board_id}` : 'moi');
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: data.board_id || 'chess',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const target = new URL((event.notification.data && event.notification.data.url) || 'moi', scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(scope) && 'focus' in client) {
          try {
            if ('navigate' in client) await client.navigate(target);
            return client.focus();
          } catch {
            // client non contrôlé : on ouvre une nouvelle fenêtre
          }
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
