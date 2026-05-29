# SME Decode LINE OA Lead Form — Setup Guide

ฟอร์มเก็บ lead ลูกค้า FA (IPO / M&A / Refi / Restructuring) ผ่าน LINE OA + LIFF

**Stack ฟรีล้วน:** LIFF (GitHub Pages) → Google Apps Script → Google Sheet + Email + LINE push

---

## Files

| File | Purpose |
|---|---|
| `index.html` | LIFF form (UI) |
| `style.css` | Styles (mobile-first, SME Decode teal/navy) |
| `script.js` | LIFF SDK init + form submit |
| `policy.html` | PDPA policy page |
| `Code.gs` | Google Apps Script backend |
| `spec.md` | Design spec |

---

## Setup (one-time, ~30 นาที)

### 1) Google Sheet
1. สร้าง Google Sheet ใหม่ → ตั้งชื่อ `SME Decode Leads`
2. Copy **Sheet ID** จาก URL: `docs.google.com/spreadsheets/d/`**`<SHEET_ID>`**`/edit`

### 2) Google Apps Script
1. ใน Sheet → **Extensions → Apps Script**
2. ลบโค้ดเดิม → paste เนื้อหาจาก `Code.gs`
3. **Project Settings (⚙️) → Script Properties → Add property:**
   | Property | Value |
   |---|---|
   | `SHEET_ID` | (จากขั้นตอน 1) |
   | `ADMIN_EMAILS` | `you@jaycapital.co.th,rm2@jaycapital.co.th` |
   | `LINE_CHANNEL_ACCESS_TOKEN` | (จากขั้นตอน 4) — เติมทีหลังก็ได้ |
   | `ADMIN_LINE_USER_IDS` | (จากขั้นตอน 5) — เติมทีหลังก็ได้ |
4. Run → `setupSheet` (อนุญาตสิทธิ์ครั้งแรก) → ดูว่า sheet `Leads` ถูกสร้าง + มี header
5. **Deploy → New deployment** → Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy **Web app URL** → ใส่ใน `script.js` ตัวแปร `ENDPOINT`

### 3) LINE Developers Console
1. ไป https://developers.line.biz → ล็อกอินด้วย LINE account ที่เป็นแอดมิน OA
2. **Create a new provider** (ถ้ายังไม่มี) — ชื่ออะไรก็ได้ เช่น "SME Decode"
3. ใน Provider → **Create channel → Messaging API**
   - ผูกกับ LINE OA ที่มีอยู่ของ SME Decode
   - Channel name / description กรอกตามจริง
4. ใน Messaging API channel:
   - แท็บ **Messaging API** → **Channel access token (long-lived)** → **Issue** → copy ค่ามาใส่ Script Properties `LINE_CHANNEL_ACCESS_TOKEN`
   - แท็บ **Messaging API** → **Use webhook**: ปิดได้ (pilot นี้ไม่ใช้ webhook)
   - แท็บ **Messaging API** → **Auto-reply messages**: ปิด (ใช้ greeting + push เอง)

### 4) LIFF App
1. ใน Provider (เดิม) → **Create channel → LINE Login** (ถ้ายังไม่มี) — หรือใช้ Messaging API channel ที่สร้างไปก็ได้ (แท็บ LIFF)
2. แท็บ **LIFF → Add**
   - LIFF app name: `SME Decode Lead Form`
   - Size: **Tall**
   - Endpoint URL: `https://<your-github-username>.github.io/line-oa-form/` (ดูขั้นตอน 6)
   - Scope: ติ๊ก **profile**, **openid**
   - Bot link feature: **On (Aggressive)** ← สำคัญ! เพื่อให้ user add OA เป็นเพื่อนตอนเปิด LIFF จากนอก LINE
3. Copy **LIFF ID** → ใส่ใน `script.js` ตัวแปร `LIFF_ID`
4. Copy **LIFF URL** (`https://liff.line.me/<liff-id>`) → ใช้ใน greeting/chat/YouTube

### 5) หา Admin LINE User ID
วิธีง่ายสุด:
1. ใน Messaging API channel → **Your user ID** (แท็บ Basic settings ล่างสุด) — แต่อันนี้คือ user ID ของบัญชี developer
2. หรือ: ให้แอดมินแต่ละคน add OA เป็นเพื่อน + ส่งข้อความใดๆ → ดู logs (ต้องเปิด webhook ชั่วคราว) — pilot อาจจะใช้แค่ user ID ของเจ้าของ developer account ไปก่อน
3. ใส่ใน Script Properties `ADMIN_LINE_USER_IDS` แบบ comma-separated: `Uabc123,Uxyz456`

### 6) GitHub Pages (host LIFF)
1. สร้าง GitHub repo ใหม่ ชื่อ `line-oa-form` (public)
2. Push ไฟล์ `index.html`, `style.css`, `script.js`, `policy.html` ขึ้นไป
3. Repo settings → **Pages** → Source: `main` branch / root
4. รอ 1-2 นาที → URL จะเป็น `https://<username>.github.io/line-oa-form/`
5. กลับไปอัพเดต LIFF Endpoint URL ใน LINE Developers (ขั้นตอน 4.2) ให้ตรงกัน

### 7) Greeting Message ใน LINE OA Manager
1. ไป https://manager.line.biz → เลือก OA ของ SME Decode
2. **Home → Greeting message** → เปิดใช้งาน
3. ตั้งข้อความ เช่น:
   ```
   สวัสดีครับ 👋 ขอบคุณที่เพิ่ม SME Decode เป็นเพื่อน

   เราเป็นที่ปรึกษาทางการเงิน (FA) เชี่ยวชาญด้าน
   IPO · M&A · Refinance · Restructuring

   📋 ลงทะเบียนรับคำปรึกษาฟรี:
   https://liff.line.me/<your-liff-id>

   ทีม FA จะติดต่อกลับภายใน 24 ชั่วโมง
   ```

### 8) Test End-to-End
1. ใน Apps Script → Run → `testNotify` → check email + LINE push เข้ามาไหม
2. เปิด LIFF URL จาก LINE app ในมือถือ → กรอกข้อมูล → submit
3. Check:
   - Google Sheet มี row ใหม่ ✅
   - Email เข้า admin ✅
   - LINE push เข้า admin ✅
   - LIFF แสดง success screen ✅

---

## Channels to deploy

| ช่องทาง | วิธี |
|---|---|
| **Add friend → Greeting** | ตั้งใน OA Manager (ขั้นตอน 7) — auto |
| **LINE group chat** | Paste LIFF URL ใน chat |
| **YouTube description** | วาง LIFF URL ใน description / pinned comment |
| **YouTube end card** | QR code → LIFF URL |

---

## Quota & Limits

- **LINE push:** 500/เดือน (1 push/lead → รองรับ 500 lead/เดือน)
- **Gmail:** 100 email/day (Workspace: 1,500/day) — ไม่น่ามีปัญหา
- **Apps Script:** 6 นาที/run — มากกว่าพอ
- **GitHub Pages:** ฟรี ไม่จำกัด traffic ระดับ pilot

ถ้า lead เกิน 500/เดือน → ปิด LINE push ใน `Code.gs` (comment บรรทัด `pushLineAdmins(data)`) เหลือแค่ email

---

## Maintenance

- **เพิ่ม admin email:** แก้ Script Properties `ADMIN_EMAILS` (ไม่ต้อง redeploy)
- **เพิ่ม admin LINE userId:** แก้ Script Properties `ADMIN_LINE_USER_IDS`
- **แก้ form fields:** แก้ `index.html` + `script.js` (validate) + `Code.gs` (HEADERS) — push GitHub
- **แก้ greeting:** OA Manager — instant
- **Export leads:** Google Sheet → File → Download → CSV/XLSX
