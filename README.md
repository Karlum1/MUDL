# Dorm washing machine queue

Anonymous QR laundry board: live machine status, daily queue tickets, a TV board, and Web Push.

## Setup

1. Firebase Console → Authentication → เปิด **Anonymous**.
2. Deploy rules/indexes: `firestore.rules` + `firestore.indexes.json`.
3. Authorized domains ใส่ `localhost` และ `washing-machine-queue.vercel.app`.
4. Copy `.env.example` → `.env.local` แล้วใส่ `DORM_ADMIN_PASSWORD` สำหรับหน้า `/admin`
5. Web Push ตอนปิดแอป:
   - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Project settings → Cloud Messaging → Web Push certificates)
   - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` จาก service account
   - `CRON_SECRET` แล้วตั้ง cron เรียก `GET /api/cron/tick` ทุกนาที (Vercel Hobby จำกัด cron เป็นรายวัน — ใช้ [cron-job.org](https://cron-job.org) หรือ Vercel Pro)

เลขคิวนับคนใช้ทั้งวันตามเวลาไทย แล้วเริ่มใหม่วันถัดไป. จอคิว `/board` · แอดมิน `/admin`

ถ้ามีคนถือบัตรรอ เครื่องว่างจะจองให้คิวนั้นก่อน (ห้ามตัดคิว) ไม่มาใน 5 นาทีจะข้ามอัตโนมัติ

## Scripts

```bash
npm run dev
```
