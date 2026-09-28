export type MachineStatus = "available" | "in_use" | "finished" | "maintenance";

export type Machine = {
  id: string;
  label: string;
  floor: number;
  dormId: string;
  dormName: string;
  halls: string;
  kind: "washer" | "dryer" | "combo";
  look: "white" | "combo" | "black" | "grey" | "dryer";
  number: number;
  status: MachineStatus;
  cycleMinutes: number | null;
  cycleMode: "wash" | "dry" | null;
  finishTime: number | null;
  cycleEndsAt: number | null;
  almostAt: number | null;
  almostAlertSent: boolean;
  ownerUid: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  maintenanceNote: string | null;
};

export type Announcement = {
  id: string;
  messageTh: string;
  createdAt: number;
  active: boolean;
};

export type MaintenanceLog = {
  id: string;
  machineId: string;
  action: string;
  note: string;
  category: string;
  createdAt: number;
};

export type AlertKind = "almost_done" | "finished" | "available";

export type AlertEvent = {
  id: string;
  kind: AlertKind;
  machineId: string;
  messageTh: string;
  messageEn: string;
  createdAt: number;
};

export const MY_CYCLE_KEY = "wm-my-cycle-v1";
export const SCAN_SESSION_PREFIX = "wm-scan-v1:";
export const SCAN_TTL_MS = 3 * 60 * 1000;

export type MyCycle = {
  uid: string;
  machineId: string;
  ownerName: string;
  finishTime: number | null;
  startedAt: number;
};
