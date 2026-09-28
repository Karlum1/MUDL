import "server-only";

import { createVerify } from "node:crypto";

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type Header = { alg?: string; kid?: string };
type Payload = { aud?: string; iss?: string; sub?: string; exp?: number };

let certs: { keys: Record<string, string>; expiresAt: number } | null = null;

function projectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

function decodeJson<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function googleCerts() {
  if (certs && certs.expiresAt > Date.now()) return certs.keys;
  const response = await fetch(CERT_URL);
  if (!response.ok) throw new Error("CERT_FETCH_FAILED");
  const keys = (await response.json()) as Record<string, string>;
  const cache = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cache.match(/max-age=(\d+)/)?.[1] ?? 3600);
  certs = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

export async function verifyFirebaseIdToken(token: string) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("BAD_TOKEN");
  const header = decodeJson<Header>(headerPart);
  const payload = decodeJson<Payload>(payloadPart);
  if (header.alg !== "RS256" || !header.kid) throw new Error("BAD_TOKEN");

  const expectedProject = projectId();
  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || !expectedProject) throw new Error("BAD_TOKEN");
  if (payload.aud !== expectedProject) throw new Error("BAD_TOKEN");
  if (payload.iss !== `https://securetoken.google.com/${expectedProject}`) throw new Error("BAD_TOKEN");
  if (!payload.exp || payload.exp <= now) throw new Error("BAD_TOKEN");

  const keys = await googleCerts();
  const cert = keys[header.kid];
  if (!cert) throw new Error("BAD_TOKEN");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  const valid = verifier.verify(cert, Buffer.from(signaturePart, "base64url"));
  if (!valid) throw new Error("BAD_TOKEN");
  return payload.sub;
}
