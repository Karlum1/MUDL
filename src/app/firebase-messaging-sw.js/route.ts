import { getPublicFirebaseConfig } from "@/lib/firebase";

export const dynamic = "force-static";

export function GET() {
  const config = getPublicFirebaseConfig();
  const body = `
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "คิวเครื่องซักผ้า";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    tag: payload.data?.tag || "laundry",
    data: payload.data,
  });
});
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
