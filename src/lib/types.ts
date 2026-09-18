export type MachineStatus = "available" | "in_use" | "finished";

export type Machine = {
  id: string;
  label: string;
  floor: number;
  status: MachineStatus;
  cycleMinutes: number | null;
  /** Milliseconds since epoch from Firestore `finishTime`. */
  finishTime: number | null;
  cycleEndsAt: number | null;
  almostAt: number | null;
  almostAlertSent: boolean;
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
