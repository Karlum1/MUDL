import { getPublicFirebaseConfig } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export function GET() {
  const config = getPublicFirebaseConfig();
  const body = `
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const title = payload.data?.title || payload.notification?.title || "ซักผ้าหอพัก";
  const body = payload.data?.body || payload.notification?.body || "";
  const tag = payload.data?.tag || "laundry";
  return self.registration.showNotification(title, {
    body,
    tag,
    data: { url: payload.data?.url || "/" },
  });
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-store",
    },
  });
}
