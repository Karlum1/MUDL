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
