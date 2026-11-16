/* Unique Ads Admin service worker.
 * Privacy: do not cache authenticated pages, API responses, images or user data.
 * Navigation requests always go to the network and keep server-side auth intact.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(fetch(event.request));
  }
});
