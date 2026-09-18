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
    NOT_OWNER: "รอบนี้ไม่ใช่ของคุณ — รอเจ้าของเอาผ้าออก",
    NOT_YOUR_TURN: "ยังไม่ถึงคิวคุณ ดูเลขคิวที่แดชบอร์ดหรือจอคิว",
    MACHINES_FREE: "ยังมีเครื่องว่าง เริ่มซักได้เลย",
    AUTH_DISABLED: "ยังไม่ได้เปิด Anonymous Auth ใน Firebase Console",
    "permission-denied":
      "Firestore ปฏิเสธการเขียน — Publish กฎใน Console แล้วเปิด Anonymous Auth",
    "failed-precondition": "Firestore ยังสร้าง index ไม่เสร็จ ลองอีกครั้งในอีกสักครู่",
  };
  return (
    map[message] ||
    map[code] ||
    (code.includes("permission") || message.includes("permission")
      ? map["permission-denied"]
      : null) ||
    message ||
    "ทำรายการไม่สำเร็จ ลองอีกครั้ง"
  );
}
