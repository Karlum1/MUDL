import { readLocale, type Locale } from "@/lib/i18n";

const TH: Record<string, string> = {
  MACHINE_BUSY: "เครื่องนี้กำลังถูกใช้หรือยังมีผ้าอยู่",
  NOT_FINISHED: "ยังซักไม่เสร็จ ไม่สามารถเคลียร์ผ้าได้",
  MACHINE_NOT_FOUND: "ไม่พบเครื่องนี้",
  NOT_OWNER: "รอบนี้ไม่ใช่ของคุณ — ยกเลิกหรือเอาผ้าออกได้เฉพาะคนที่ตั้งเวลา",
  NOT_IN_USE: "เครื่องนี้ไม่ได้กำลังซักอยู่",
  NOT_YOUR_TURN: "ยังไม่ถึงคิวคุณ ดูเลขคิวที่แดชบอร์ดหรือจอคิว",
  MACHINES_FREE: "ยังมีเครื่องว่าง เริ่มซักได้เลย",
  NAME_REQUIRED: "ใส่ชื่อก่อนเริ่มซัก (ใส่ชื่ออะไรก็ได้)",
  INVALID_MINUTES: "ใส่เวลาเป็นจำนวนนาทีระหว่าง 1–180",
  MACHINE_MAINTENANCE: "เครื่องนี้ปิดปรับปรุงชั่วคราว กรุณาใช้เครื่องอื่น",
  ANNOUNCEMENT_REQUIRED: "พิมพ์ข้อความประกาศก่อนส่ง",
  ADMIN_PIN_REQUIRED: "ใส่รหัสผู้ดูแลไม่ถูกต้อง",
  ADMIN_PIN_NOT_SET: "ยังไม่ได้ตั้ง ADMIN_PIN หรือ CRON_SECRET ใน .env.local",
  ADMIN_HTML_RESPONSE:
    "เซิร์ฟเวอร์ยังไม่มี /api/admin — หยุด next dev แล้วรันใหม่ แล้วรีเฟรชหน้านี้",
  FIREBASE_ADMIN_NOT_CONFIGURED: "ยังไม่ได้ตั้ง Firebase Admin ในเซิร์ฟเวอร์",
  AUTH_DISABLED: "ยังไม่ได้เปิด Anonymous Auth ใน Firebase Console",
  QUOTA_EXCEEDED:
    "ที่เก็บข้อมูลในเบราว์เซอร์เต็ม — ล้างแคชหรือปิดแท็บเก่า แล้วลองเริ่มซักอีกครั้ง",
  AUTH_TIMEOUT: "เข้าสู่ระบบช้า — ล้างข้อมูลไซต์นี้ในเบราว์เซอร์ แล้วสแกน QR ใหม่",
  START_TIMEOUT: "เริ่มซักไม่สำเร็จ — ถ้าทุกเครื่องค้างแบบนี้ โควต้า Firebase อาจเต็ม รอสักครู่แล้วลองใหม่",
  "resource-exhausted":
    "โควต้า Firebase เต็มชั่วคราว — รอสักครู่แล้วลองใหม่ หรือเช็ค Usage ใน Console",
  SCAN_REQUIRED: "สแกน QR ที่เครื่องก่อนตั้งเวลา",
  "permission-denied":
    "Firestore ปฏิเสธการเขียน — Publish กฎใน Console แล้วเปิด Anonymous Auth",
  "failed-precondition": "Firestore ยังสร้าง index ไม่เสร็จ ลองอีกครั้งในอีกสักครู่",
};

const EN: Record<string, string> = {
  MACHINE_BUSY: "This machine is in use or still has clothes in it",
  NOT_FINISHED: "The cycle is not finished yet",
  MACHINE_NOT_FOUND: "Machine not found",
  NOT_OWNER: "This cycle is not yours — only the person who started it can cancel or collect",
  NOT_IN_USE: "This machine is not running",
  NOT_YOUR_TURN: "Not your turn yet",
  MACHINES_FREE: "Machines are free — start a cycle",
  NAME_REQUIRED: "Enter a name before starting",
  INVALID_MINUTES: "Enter a time between 1 and 180 minutes",
  MACHINE_MAINTENANCE: "This machine is out of order. Please use another one.",
  ANNOUNCEMENT_REQUIRED: "Type an announcement first",
  ADMIN_PIN_REQUIRED: "Wrong staff PIN",
  ADMIN_PIN_NOT_SET: "ADMIN_PIN or CRON_SECRET is not set",
  ADMIN_HTML_RESPONSE: "The server has no /api/admin — restart next dev and refresh",
  FIREBASE_ADMIN_NOT_CONFIGURED: "Firebase Admin is not set on the server",
  AUTH_DISABLED: "Anonymous Auth is not enabled in Firebase Console",
  QUOTA_EXCEEDED: "Browser storage is full — clear cache or close old tabs, then try again",
  AUTH_TIMEOUT: "Sign-in was slow — clear this site’s data, then scan the QR again",
  START_TIMEOUT:
    "Start failed — if every machine hangs like this, Firebase quota may be exhausted. Wait a bit and try again.",
  "resource-exhausted":
    "Firebase quota is exhausted — wait a bit and try again, or check Usage in the Console",
  SCAN_REQUIRED: "Scan the machine QR before starting",
  "permission-denied":
    "Firestore blocked the write — publish rules and enable Anonymous Auth",
  "failed-precondition": "A Firestore index is still building. Try again shortly.",
};

export function actionErrorMessage(err: unknown, locale?: Locale) {
  const lang = locale ?? (typeof document === "undefined" ? "th" : readLocale());
  const map = lang === "en" ? EN : TH;
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    map[message] ||
    map[code] ||
    (message.includes("not valid JSON") || message.includes("<!DOCTYPE")
      ? map.ADMIN_HTML_RESPONSE
      : null) ||
    (code.includes("permission") || message.includes("permission")
      ? map["permission-denied"]
      : null) ||
    (code.includes("resource-exhausted") || /resource-exhausted/i.test(message)
      ? map["resource-exhausted"]
      : null) ||
    (/quota exceeded|QuotaExceededError/i.test(message) ||
    code.includes("quota") ||
    (err && typeof err === "object" && "name" in err && String((err as { name: string }).name) === "QuotaExceededError")
      ? map.QUOTA_EXCEEDED
      : null) ||
    message ||
    (lang === "en" ? "That did not work. Try again." : "ทำรายการไม่สำเร็จ ลองอีกครั้ง")
  );
}
