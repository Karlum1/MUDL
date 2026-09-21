export function expectedAdminPin() {
  return process.env.ADMIN_PIN || process.env.CRON_SECRET || "";
}

export function adminPinConfigured() {
  return expectedAdminPin().length > 0;
}

export function adminPinMatches(input: unknown) {
  const expected = expectedAdminPin();
  if (!expected || typeof input !== "string" || input.length === 0) return false;
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
