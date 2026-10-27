// Service worker SansFile : celui d'Angular (cache, mises à jour, affichage des notifications push), plus
// l'accusé de réception des alertes. Tant que le téléphone confirme avoir reçu la notification, le serveur
// n'envoie pas le SMS de secours (payant).
importScripts('./ngsw-worker.js');

self.addEventListener('push', (event) => {
  let token = null;
  try {
    token = event.data ? event.data.json()?.notification?.data?.receiptToken : null;
  } catch {
    // contenu illisible : la notification reste gérée par Angular
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return;
  event.waitUntil(
    fetch(`/api/push/receipts/${token}`, { method: 'POST', keepalive: true }).catch(() => undefined),
  );
});
