export type MachineStatus = "available" | "reserved" | "in_use" | "finished";

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
  ticketNumber: number | null;
  reservedUntil: number | null;
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

export type MyCycle = {
  uid: string;
  machineId: string;
  ticketNumber: number;
  finishTime: number | null;
  startedAt: number;
};
