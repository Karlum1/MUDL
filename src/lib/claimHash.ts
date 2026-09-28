import { createHash } from "node:crypto";

export function hashClaimSecret(secret: string) {
  return createHash("sha256").update(secret.trim().toLowerCase()).digest("hex");
}
