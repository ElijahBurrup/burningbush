/* Burning Bush — service worker.
   Deliberately does NOT cache the app shell: index.html is one ~550KB file and a stale
   cached copy would silently pin users to an old release. Its only job is notifications,
   which is the one path an installed iOS PWA has (iOS Safari has no Notification
   constructor — only ServiceWorkerRegistration.showNotification). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Tapping a reminder focuses an open Burning Bush tab, or opens one.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
