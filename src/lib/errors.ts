export function actionErrorMessage(err: unknown) {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    MACHINE_BUSY: "เครื่องนี้กำลังถูกใช้หรือยังมีผ้าอยู่",
    NOT_FINISHED: "ยังซักไม่เสร็จ ไม่สามารถเคลียร์ผ้าได้",
    MACHINE_NOT_FOUND: "ไม่พบเครื่องนี้",
    NOT_OWNER: "รอบนี้ไม่ใช่ของคุณ — ยกเลิกหรือเอาผ้าออกได้เฉพาะคนที่ตั้งเวลา",
    NOT_IN_USE: "เครื่องนี้ไม่ได้กำลังซักอยู่",
    NOT_YOUR_TURN: "ยังไม่ถึงคิวคุณ ดูเลขคิวที่แดชบอร์ดหรือจอคิว",
    MACHINES_FREE: "ยังมีเครื่องว่าง เริ่มซักได้เลย",
    NAME_REQUIRED: "ใส่ชื่อก่อนเริ่มซัก (ใส่ชื่ออะไรก็ได้)",
    SCAN_REQUIRED: "ต้องสแกน QR ที่เครื่องก่อนถึงจะตั้งเวลาได้",
    MACHINE_MAINTENANCE: "เครื่องนี้ปิดปรับปรุงชั่วคราว กรุณาใช้เครื่องอื่น",
    ANNOUNCEMENT_REQUIRED: "พิมพ์ข้อความประกาศก่อนส่ง",
    ADMIN_PIN_REQUIRED: "ใส่รหัสผู้ดูแลไม่ถูกต้อง",
    ADMIN_PIN_NOT_SET: "ยังไม่ได้ตั้ง ADMIN_PIN หรือ CRON_SECRET ใน .env.local",
    ADMIN_HTML_RESPONSE:
      "เซิร์ฟเวอร์ยังไม่มี /api/admin — หยุด next dev แล้วรันใหม่ แล้วรีเฟรชหน้านี้",
    FIREBASE_ADMIN_NOT_CONFIGURED: "ยังไม่ได้ตั้ง Firebase Admin ในเซิร์ฟเวอร์",
    AUTH_DISABLED: "ยังไม่ได้เปิด Anonymous Auth ใน Firebase Console",
    "permission-denied":
      "Firestore ปฏิเสธการเขียน — Publish กฎใน Console แล้วเปิด Anonymous Auth",
    "failed-precondition": "Firestore ยังสร้าง index ไม่เสร็จ ลองอีกครั้งในอีกสักครู่",
  };
  return (
    map[message] ||
    map[code] ||
    (message.includes("not valid JSON") || message.includes("<!DOCTYPE")
      ? map.ADMIN_HTML_RESPONSE
      : null) ||
    (code.includes("permission") || message.includes("permission")
      ? map["permission-denied"]
      : null) ||
    message ||
    "ทำรายการไม่สำเร็จ ลองอีกครั้ง"
  );
}
