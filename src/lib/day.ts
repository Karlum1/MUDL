const BANGKOK = "Asia/Bangkok";

export function bangkokDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function bangkokDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${day}/${month}/${year}`;
}

export function bangkokMonthKey(now = new Date()) {
  return bangkokDateKey(now).slice(0, 7);
}

export function bangkokMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

export function bangkokDaysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function bangkokClockLabel(at = Date.now()) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(at));
}

export function bangkokHour(now = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart ?? 0);
  return hour === 24 ? 0 : hour;
}

export function bangkokMinute(now = new Date()) {
  const minutePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    minute: "2-digit",
  })
    .formatToParts(now)
    .find((part) => part.type === "minute")?.value;
  return Number(minutePart ?? 0);
}
