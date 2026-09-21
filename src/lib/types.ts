export type MachineStatus =
  | "available"
  | "reserved"
  | "in_use"
  | "finished"
  | "maintenance";

export type Machine = {
  id: string;
  label: string;
  floor: number;
  status: MachineStatus;
  cycleMinutes: number | null;
  finishTime: number | null;
  cycleEndsAt: number | null;
  almostAt: number | null;
  almostAlertSent: boolean;
  ownerUid: string | null;
  ownerName: string | null;
  reservedUntil: number | null;
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
  createdAt: number;
};

export type TicketStatus =
  | "waiting"
  | "called"
  | "in_use"
  | "done"
  | "expired"
  | "cancelled";

export type QueueTicket = {
  id: string;
  dateKey: string;
  number: number;
  uid: string;
  status: TicketStatus;
  machineId: string | null;
  createdAt: number;
  calledAt: number | null;
};

export type AlertKind =
  | "almost_done"
  | "finished"
  | "available"
  | "your_turn"
  | "queue_joined";

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
export const SCAN_TTL_MS = 15 * 60 * 1000;

export type MyCycle = {
  uid: string;
  machineId: string;
  ownerName: string;
  finishTime: number | null;
  startedAt: number;
};
