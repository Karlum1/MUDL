export const LOCALE_KEY = "wm-locale-v1";
export type Locale = "th" | "en";

const TH = {
  subtitle: "สถานะเครื่องซักผ้า",
  scanQr: "สแกน QR",
  board: "จอสถานะ",
  live: "สด",
  connecting: "กำลังเชื่อม",
  homeLead: "ไม่ต้องสมัคร · สแกน QR ที่เครื่องเพื่อเริ่มซัก",
  homeTitle: "สถานะเครื่องซักผ้าหอพัก",
  waitingFirestore: "รอข้อมูลจาก Firestore",
  firebaseMissingTitle: "ยังไม่ได้ตั้งค่า Firebase",
  firebaseMissingBody: "คัดลอก .env.example เป็น .env.local",
  firestoreFail: "เชื่อม Firestore ไม่ได้",
  dorms: "หอ",
  allDorms: "ทุกหอ",
  kinds: "ชนิดเครื่อง",
  allKinds: "ทุกชนิด",
  kindWasher: "ซักผ้า",
  kindDryer: "อบแห้ง",
  kindCombo: "ซักและอบ",
  freeOf: "ว่าง",
  filterEmpty: "ไม่พบเครื่องตามตัวกรอง",
  loadingMachines: "กำลังโหลดสถานะเครื่องซักผ้า...",
  myCycle: "รอบของฉัน",
  readyScan: "สแกน QR ที่เครื่องเพื่อตั้งเวลา",
  usedBy: "ใช้โดย",
  pleaseCollect: "กรุณาเอาผ้าออก",
  call: "โทร",
  viewMine: "ดูรอบของฉัน →",
  manageMine: "จัดการรอบของฉัน →",
  cancelCycle: "ยกเลิกเวลาซัก",
  cancelConfirm: "ยกเลิกเวลาของเครื่องนี้ และปล่อยเครื่องว่าง?",
  backDash: "← กลับแดชบอร์ด",
  machineMissing: "ไม่พบเครื่องนี้ ตรวจ QR อีกครั้ง",
  setupFirebaseFirst: "ตั้งค่า Firebase ใน .env.local ก่อน",
  loadingMachine: "กำลังโหลดเครื่อง...",
  ownerName: "ชื่อคนที่ใช้เครื่อง",
  ownerNameHint: "ไม่บังคับใส่ชื่อ — ถ้าเว้นว่างจะแสดงเป็น «ไม่ระบุตัวตน» ใส่ชื่ออะไรก็ได้",
  ownerNamePh: "เช่น บี, ห้อง 302",
  phone: "เบอร์โทร",
  phoneHint: "ไม่บังคับ — จะโชว์เบอร์เมื่อซักเสร็จแล้ว ให้คนถัดไปโทรขอก่อนเอาผ้าออก",
  scanOnlyTitle: "ตั้งเวลาได้เฉพาะหลังสแกน QR ที่เครื่อง",
  scanOnlyBody: "ไม่สามารถกดจับเวลาจากมือถือที่ห่างจากเครื่องได้",
  goScan: "ไปสแกน QR",
  wash: "ซักผ้า",
  dry: "อบผ้า",
  startWash: "เริ่มซัก",
  startDry: "เริ่มอบ",
  cancelTime: "ยกเลิกเวลา",
  othersUsing: "เครื่องนี้มีคนใช้อยู่ รอให้เสร็จและเอาผ้าออก",
  collected: "เอาผ้าออกแล้ว · ปล่อยเครื่องว่าง",
  waitCollect: "แล้วเครื่องจะว่าง",
  waitingFor: "รอ",
  dialHint: "หมุนหน้าปัดเพื่อตั้งเวลา",
  dialDrag: "ลากวงล้อ · 1–180 นาที",
  dialAria: "เวลาที่กำหนดเอง",
  news: "ประกาศหอ",
  pushTitle: "แจ้งเตือน · Web Push",
  pushBody: "เตือนก่อนผ้าเสร็จ และตอนผ้าเสร็จ แม้ปิดแอป (ต้องเปิด Web Push)",
  iosHint: "บน iPhone: แชร์ → เพิ่มไปยังหน้าจอโฮม แล้วเปิดจากไอคอนนั้น แล้วค่อยกดเปิดแจ้งเตือน",
  pushOn: "เปิดการแจ้งเตือนแล้ว",
  pushPending: "กำลังเปิด...",
  pushEnable: "เปิด Web Push บนเครื่องนี้",
  pushWaitSession: "รอเชื่อมเซสชันสักครู่ แล้วกดอีกครั้ง",
  pushDenied: "เบราว์เซอร์บล็อกการแจ้งเตือน — เปิดอนุญาตในการตั้งค่าไซต์แล้วลองใหม่",
  noAlerts: "ยังไม่มีแจ้งเตือน",
  scanTitle: "สแกน QR เครื่องซักผ้า",
  scanLead: "ส่องไปที่สติ๊กเกอร์เครื่อง แล้วตั้งเวลาได้ทันที — เปิดหน้าเครื่องจากแอปโดยไม่สแกนจะตั้งเวลาไม่ได้",
  scanning: "กำลังสแกน QR...",
  openCamera: "เปิดกล้องสแกน",
  cameraUnsupported: "อุปกรณ์นี้เปิดกล้องสแกนไม่ได้ — ส่องสติ๊กเกอร์ QR ด้วยแอปกล้องแล้วเปิดลิงก์",
  cameraNeedTap: "แตะปุ่มเพื่ออนุญาตกล้อง แล้วส่องไปที่สติ๊กเกอร์ QR บนเครื่อง",
  boardTitle: "จอสถานะ",
  backApp: "กลับแอป",
  closedRepair: "ปิดซ่อม",
  free: "ว่าง",
  usingNow: "กำลังใช้โดย",
  themeDay: "โหมดกลางวัน",
  themeNight: "โหมดกลางคืน",
  themeAuto: "โหมดอัตโนมัติ",
  langToEn: "Switch to English",
  langToTh: "เปลี่ยนเป็นภาษาไทย",
  report: "แจ้งเครื่องเสีย",
  reportRepair: "แจ้งซ่อม",
  reportPickMachine: "เลือกเครื่อง",
  reportNeedMachine: "เลือกเครื่องก่อนส่ง",
  reportHint: "ส่งถึงผู้ดูแล — เครื่องยังไม่ปิดเองจนกว่าแอดมินจะกดปิดปรับปรุง",
  reportNotePh: "เช่น ไม่หมุน, น้ำไม่เข้า, มีกลิ่นไหม้",
  reportSend: "ส่งเรื่อง",
  reportCancel: "ยกเลิก",
  reportThanks: "ส่งเรื่องแล้ว ผู้ดูแลจะเห็นในบันทึกซ่อม",
  readyPrefix: "พร้อม",
  waitOwnerCollect: "รอให้เจ้าของเอาผ้าออก",
  remaining: "เหลือเวลา",
  done: "เสร็จแล้ว",
  watch: "เฝ้าเครื่องว่าง",
  watching: "กำลังเฝ้า — จะเตือนเมื่อว่าง",
  watchHint: "ได้แจ้งเตือนเมื่อเครื่องนี้กลับมาว่าง ต้องเปิด Web Push ด้วยถ้าอยากให้ดังตอนปิดแอป",
  sfxOn: "เสียงเรียกเข้าเมื่อผ้าเสร็จ: เปิด",
  sfxOff: "เสียงเรียกเข้าเมื่อผ้าเสร็จ: ปิด",
} as const;

export type MessageKey = keyof typeof TH;

const EN: Record<MessageKey, string> = {
  subtitle: "Laundry status",
  scanQr: "Scan QR",
  board: "Status board",
  live: "Live",
  connecting: "Connecting",
  homeLead: "No sign-up · Scan the QR on the machine to start",
  homeTitle: "Dorm laundry status",
  waitingFirestore: "Waiting for Firestore…",
  firebaseMissingTitle: "Firebase is not configured",
  firebaseMissingBody: "Copy .env.example to .env.local",
  firestoreFail: "Could not connect to Firestore",
  dorms: "Halls",
  allDorms: "All halls",
  kinds: "Machine type",
  allKinds: "All types",
  kindWasher: "Washer",
  kindDryer: "Dryer",
  kindCombo: "Washer + dryer",
  freeOf: "free",
  filterEmpty: "No machines match these filters",
  loadingMachines: "Loading machines…",
  myCycle: "My cycle",
  readyScan: "Scan the QR on the machine to set a timer",
  usedBy: "Used by",
  pleaseCollect: "Please collect the clothes",
  call: "Call",
  viewMine: "View my cycle →",
  manageMine: "Manage my cycle →",
  cancelCycle: "Cancel timer",
  cancelConfirm: "Cancel this cycle and free the machine?",
  backDash: "← Back to dashboard",
  machineMissing: "Machine not found. Check the QR again.",
  setupFirebaseFirst: "Set Firebase in .env.local first",
  loadingMachine: "Loading machine…",
  ownerName: "Name",
  ownerNameHint: "Optional — blank shows as “Anonymous”. Any nickname is fine.",
  ownerNamePh: "e.g. Bee, room 302",
  phone: "Phone",
  phoneHint: "Optional — shown only after the cycle finishes, so the next person can call first.",
  scanOnlyTitle: "Start a cycle only after scanning the machine QR",
  scanOnlyBody: "You cannot start a timer from far away.",
  goScan: "Scan QR",
  wash: "Wash",
  dry: "Dry",
  startWash: "Start wash",
  startDry: "Start dry",
  cancelTime: "Cancel timer",
  othersUsing: "Someone is using this machine. Wait until they finish and collect.",
  collected: "Clothes collected · Free the machine",
  waitCollect: "then it will be free",
  waitingFor: "Waiting for",
  dialHint: "Turn the dial to set time",
  dialDrag: "Drag the wheel · 1–180 min",
  dialAria: "Custom time",
  news: "Hall notice",
  pushTitle: "Alerts · Web Push",
  pushBody: "Get a ping before the cycle ends and when it finishes, even if the app is closed.",
  iosHint: "On iPhone: Share → Add to Home Screen, open that icon, then enable alerts.",
  pushOn: "Alerts are on",
  pushPending: "Turning on…",
  pushEnable: "Enable Web Push on this device",
  pushWaitSession: "Wait for the session, then try again",
  pushDenied: "The browser blocked notifications — allow them in site settings.",
  noAlerts: "No alerts yet",
  scanTitle: "Scan a machine QR",
  scanLead: "Point at the sticker, then set a timer. Opening a machine from the app without scanning will not start a cycle.",
  scanning: "Scanning QR…",
  openCamera: "Open camera",
  cameraUnsupported: "This device cannot open the scanner — use the camera app on the sticker instead.",
  cameraNeedTap: "Tap to allow the camera, then point at the sticker.",
  boardTitle: "Status board",
  backApp: "Back to app",
  closedRepair: "Out of order",
  free: "Free",
  usingNow: "In use by",
  themeDay: "Day mode",
  themeNight: "Night mode",
  themeAuto: "Auto mode",
  langToEn: "Switch to English",
  langToTh: "Switch to Thai",
  report: "Report broken machine",
  reportRepair: "Report repair",
  reportPickMachine: "Choose a machine",
  reportNeedMachine: "Pick a machine first",
  reportHint: "Goes to staff. The machine stays listed until they take it offline.",
  reportNotePh: "e.g. not spinning, no water, burning smell",
  reportSend: "Send report",
  reportCancel: "Cancel",
  reportThanks: "Sent. Staff will see it in the maintenance log.",
  readyPrefix: "Ready to ",
  waitOwnerCollect: "Waiting for the owner to collect clothes",
  remaining: "left",
  done: "Done",
  watch: "Notify when free",
  watching: "Watching — ping when free",
  watchHint: "Get an alert when this machine is free. Turn on Web Push to hear it with the app closed.",
  sfxOn: "Finish ringtone: on",
  sfxOff: "Finish ringtone: off",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { th: TH, en: EN };

function isLocale(value: string | null): value is Locale {
  return value === "th" || value === "en";
}

export const LOCALE_BOOT = `(function(){try{var p=localStorage.getItem("${LOCALE_KEY}");if(p!=="en"&&p!=="th")p="th";document.documentElement.setAttribute("data-locale",p);document.documentElement.lang=p;}catch(e){document.documentElement.setAttribute("data-locale","th");document.documentElement.lang="th";}})();`;

export function applyLocale(locale: Locale) {
  document.documentElement.setAttribute("data-locale", locale);
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* quota */
  }
  return locale;
}

export function readLocale(): Locale {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-locale");
    if (isLocale(attr)) return attr;
  }
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "th";
}

export function t(locale: Locale, key: MessageKey) {
  return MESSAGES[locale][key];
}

export function statusLabel(
  copy: { th: string; en: string },
  locale: Locale,
) {
  return locale === "en" ? copy.en : copy.th;
}
