export const ALMOST_LEAD_MS = 15 * 60 * 1000;
export const FINISHED_STALE_MS = 5 * 60 * 1000;
export const FINISHED_STALE_MINUTES = Math.round(FINISHED_STALE_MS / 60_000);

export function remainingCycleMinutes(endsAt: number, now = Date.now()) {
  return Math.max(1, Math.ceil((endsAt - now) / 60_000));
}
