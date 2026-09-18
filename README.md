# Dorm washing machine queue

Anonymous QR laundry board for a dorm: live machine status, countdown timers, instant cycle start, and alerts. No login and no name.

Live data is **Firebase Firestore** (`machines` collection) via `onSnapshot`.

## Firebase setup

1. Create a Firebase project and a Firestore database.
2. Copy `.env.example` to `.env.local` and paste the web app config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

3. Publish rules from `firestore.rules` (demo allows anonymous read/write on `machines`).
4. Restart `npm run dev`. The first snapshot seeds six machines if the collection is empty.

The client SDK is initialized once in `src/lib/firebase.ts` (`getApps()` guards Next.js Fast Refresh). Dashboard and machine pages subscribe with `onSnapshot`. **เริ่มซัก 30 นาที** writes `status: "in_use"` and `finishTime` as a Firestore `Timestamp` 30 minutes ahead.

## Scripts

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Directory

```
src/
  lib/firebase.ts              # Firebase app + Firestore (env vars, no double init)
  lib/machines.ts              # onSnapshot, startMachine, collect
  hooks/useMachineLive.ts      # real-time machines + alerts
  app/page.tsx                 # dashboard
  app/scan/page.tsx
  app/qrs/page.tsx
  app/machine/[id]/page.tsx
  components/CountdownTimer.tsx
```
