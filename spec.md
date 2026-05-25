# LINE OA Lead Form (Pilot, Free Tier) — Design Spec

**Owner:** Jay Capital (JC)
**Status:** Pilot
**Date:** 2026-05-25
**Final spec location (post-approval):** `C:\Users\jayca\Documents\Claude Project\line-oa-form\spec.md`

---

## Context

JC อยากเก็บ lead ลูกค้าผ่าน LINE OA แบบ pilot โดยไม่จ่ายเงินสำหรับเครื่องมือใดๆ
- **Use case:** บริการ FA (IPO / M&A / Refinance / Restructuring) — ไม่ใช่มุม Wealth
- **เป้าหมาย:** เก็บข้อมูลพอ qualify lead, ส่งให้ทีม sales follow-up ใน 24 ชม., เก็บไว้ใน Google Sheet
- **ข้อจำกัด:** Free tier ทุกอย่าง (ไม่จ่าย LINE plan, ไม่จ่าย hosting, ไม่จ่าย CRM)
- **มีอยู่แล้ว:** LINE OA ของ JC
- **ยังไม่มี:** LINE Developers Channel, LIFF, backend, sheet, PDPA policy

---

## Tech Stack (ฟรีทั้งหมด)

| Layer | Tool | Notes |
|---|---|---|
| Frontend | LIFF (HTML/CSS/JS) hosted on **GitHub Pages** | ฟรี + HTTPS + ดึง userId/displayName ผ่าน `liff.getProfile()` |
| Backend | **Google Apps Script Web App** (doPost) | ฟรี, deploy ได้ทันที, ไม่ต้องดูแล server |
| Database | **Google Sheet** | Sales เปิดดูได้, filter/sort ได้, export CSV ได้ |
| User confirmation | **Success screen ใน LIFF** (ไม่ใช้ push) | ประหยัด quota — ขอบคุณ + ปุ่มปิด |
| Admin alert (primary) | **Email** ผ่าน Apps Script `MailApp.sendEmail()` | ฟรี 100/day (Gmail) หรือ 1,500/day (Workspace), unlimited audit trail |
| Admin alert (real-time) | **LINE Messaging API push** ไป admin userId | 500/เดือน — noti real-time บนมือถือ |
| PDPA policy page | static HTML บน **GitHub Pages** | ใช้ template ทั่วไป |

**หมายเหตุ:** LINE Notify ปิดบริการตั้งแต่ มี.ค. 2025 → ใช้ Messaging API push แทน

---

## Form Fields (8 ช่อง — ตัดเพื่อ minimize drop-off)

| # | Field | Required | Type | Notes |
|---|---|---|---|---|
| 1 | ชื่อ-นามสกุล | ✅ | text | prefill จาก LINE `displayName` |
| 2 | เบอร์โทร | ✅ | tel | regex ไทย 10 หลัก |
| 3 | อีเมล | ✅ | email | |
| 4 | บริษัท + ตำแหน่ง | ✅ | 2 text เล็ก inline | |
| 5 | วัตถุประสงค์ | ✅ | radio (single) | IPO / M&A / Refinance / Restructuring / อื่นๆ |
| 6 | ช่วงรายได้ปีล่าสุด | ✅ | dropdown | <100 / 100–500 / 500–1,000 / 1,000+ ลบ. |
| 7 | ช่วงกำไรปีล่าสุด | ✅ | dropdown | ขาดทุน / <10 / 10–50 / 50–100 / 100+ ลบ. |
| 8 | ข้อความเพิ่มเติม | ⬜ | textarea | optional — sector / ข้อมูลอื่นๆ |

**PDPA:** checkbox "ยินยอมให้ JC เก็บข้อมูลตาม [นโยบายความเป็นส่วนตัว]" → link ไป policy page

---

## User Flow

```
ENTRY POINTS
  A) Add friend → Greeting message พร้อมปุ่ม "ลงทะเบียนรับคำปรึกษาฟรี"
  B) Admin paste LIFF URL ใน LINE group chat
  C) YouTube video description / pinned comment / QR ใน outro
                                  │
                                  ▼
                       LIFF opens inside LINE app
                                  │
            liff.init() → liff.getProfile() → {userId, displayName}
                                  │
                       Form prefilled (name) — user fills rest
                                  │
                              [Submit]
                                  │
                                  ▼
                  POST → Apps Script Web App (/exec)
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
   Append to Google Sheet   Email to admin        LINE push to admin
   (timestamp + userId)     (audit trail)         (real-time noti)
                                  │
                                  ▼
                  Show "ขอบคุณ 🙏" success screen ใน LIFF
                                  │
                          [ปุ่ม "ปิด"] → liff.closeWindow()
```

---

## Google Sheet Schema

Sheet name: `Leads`

| Column | Type | Source |
|---|---|---|
| timestamp | datetime | Apps Script `new Date()` |
| lineUserId | string | LIFF profile |
| displayName | string | LIFF profile |
| name | string | form |
| phone | string | form |
| email | string | form |
| company | string | form |
| position | string | form |
| purpose | string | form (enum) |
| revenueRange | string | form (enum) |
| profitRange | string | form (enum) |
| note | string | form (optional) |
| source | string | form (?source=greeting/group/youtube) |
| status | string | **manual** — sales กรอก (New/Contacted/Qualified/Dead) |
| assignedTo | string | **manual** — RM ที่รับ |

---

## Apps Script Web App — doPost flow

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  // 1) Validate (required fields, phone regex, PDPA checked)
  // 2) Append row to Sheet
  // 3) Email admin via MailApp.sendEmail()
  //    Subject: "🔔 Lead ใหม่: {name} ({purpose})"
  //    Body: full lead detail + link ไป Sheet
  // 4) Push LINE alert to each admin userId (Messaging API)
  //    "🔔 Lead ใหม่\nชื่อ: {name}\nบริการ: {purpose}\nรายได้: {revenueRange}\nเบอร์: {phone}"
  // 5) Return { ok: true } → LIFF แสดง success screen
}
```

**Secrets:** LINE channel access token + admin userId list เก็บใน Apps Script **Properties Service** (ไม่ commit code)

---

## Entry Points — Setup

| ช่องทาง | วิธี setup | ใช้เมื่อไหร่ |
|---|---|---|
| **Greeting (add friend)** | LINE OA Manager → Greeting message → ใส่ปุ่ม link ไปยัง LIFF URL | onboarding ลูกค้าใหม่ |
| **Group chat** | Copy LIFF URL paste ลง chat | ลากเพื่อนเข้ากลุ่มแล้วส่งฟอร์ม |
| **YouTube** | LIFF URL ใน description + pinned comment + QR ใน end-screen | passive traffic จากคลิป |

LIFF URL: `https://liff.line.me/{liffId}?source={greeting|group|youtube}`

---

## Out of Scope (Pilot นี้ไม่ทำ)

- Rich Menu (ทำทีหลังถ้า volume สูงพอ)
- Auto-tagging user ใน OA (ทำ manual จาก userId ใน OA Manager)
- CRM integration (export Sheet CSV เอง)
- Multi-language
- Audience segmentation / broadcast
- PDPA policy ที่เป็น formal version (pilot ใช้ template ทั่วไปก่อน — JC ยังไม่มี PDPA framework)

---

## Setup Checklist (สิ่งที่คุณต้องเตรียม / ทำ)

**ฝั่งคุณ:**
1. ✅ มี LINE OA ของ JC แล้ว
2. ⬜ สร้าง LINE Developers account → สร้าง **Provider** → สร้าง **Messaging API channel** + **LIFF app**
3. ⬜ ระบุ userId ของแอดมิน 1–3 คนที่จะรับแจ้ง lead (ดูจาก Apps Script ทดสอบ webhook ครั้งแรก)
4. ⬜ มี GitHub account สำหรับ host LIFF + policy page
5. ⬜ มี Google account สำหรับ Sheet + Apps Script

**ฝั่ง implementer:**
1. ⬜ Build LIFF page (HTML/CSS/JS) — push to GitHub Pages
2. ⬜ Sheet template + Apps Script Web App + deploy
3. ⬜ ตั้ง LIFF endpoint URL ใน LINE Developers Console
4. ⬜ Greeting message ใน OA Manager
5. ⬜ Policy page (static HTML)
6. ⬜ End-to-end test: ส่ง LIFF URL → กรอก → check Sheet + push msg

---

## Verification / Acceptance Criteria

| # | Test | Expected |
|---|---|---|
| 1 | เปิด LIFF URL จาก LINE chat | ฟอร์มเปิด, ชื่อ prefill ตรง LINE displayName |
| 2 | กรอกครบ + submit | Sheet มี row ใหม่ (ทุก column ครบ), LIFF close |
| 3 | กด submit (PDPA ไม่ติ๊ก) | block + error message |
| 4 | กรอกเบอร์ผิด format | block + error message |
| 5 | หลัง submit | LIFF แสดง success screen "ขอบคุณ" + ปุ่มปิด |
| 6 | หลัง submit | admin ได้ email + LINE push พร้อม lead summary |
| 7 | ดูจาก YouTube link (mobile) | LIFF เปิดใน LINE app ปกติ |
| 8 | ดูจาก desktop browser | fallback แสดงให้ใช้มือถือ (LIFF จำกัด context) |

---

## Critical Files (จะถูกสร้าง)

ในขั้น implementation จะมี:
- `index.html` (LIFF form)
- `style.css`
- `script.js` (LIFF SDK init + submit handler)
- `policy.html` (PDPA policy page)
- `Code.gs` (Apps Script doPost)
- `Leads` Sheet template

ไม่มี existing code ที่ต้องดู — pilot เริ่มจาก scratch

---

## Risks / Caveats

- **LINE Messaging API free quota:** 500 push/เดือน — design ใหม่ใช้ 1 push/lead (เฉพาะ admin alert) → รองรับ 500 lead/เดือน. ถ้าเกิน → ตัด LINE push ออก เหลือแค่ email (ฟรี unlimited)
- **Gmail send quota:** 100 email/day (Gmail) หรือ 1,500/day (Workspace) — ไม่น่ามีปัญหา
- **GitHub Pages SLA:** ฟรีแต่ไม่มี SLA — สำหรับ pilot acceptable
- **Apps Script execution time:** จำกัด 6 นาที/run — ไม่มีปัญหาสำหรับ form submit
- **PDPA:** ใช้ template ทั่วไปใน pilot — ก่อน scale ต้องให้ legal review
- **userId ที่ admin จะรับ alert:** ต้องให้แอดมิน add OA เป็นเพื่อน + ส่งข้อความครั้งแรก ก่อน Apps Script จะ push หาได้
