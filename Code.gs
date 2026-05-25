/**
 * Jay Capital — LINE OA Lead Form (Backend)
 * Google Apps Script Web App
 *
 * รับ POST จาก LIFF form → บันทึก Sheet → ส่ง Email + LINE push ไปแอดมิน
 *
 * Deploy: Deploy → New deployment → type: Web app
 *   - Execute as: Me (your account)
 *   - Who has access: Anyone
 *
 * Properties Service (Project Settings → Script Properties):
 *   LINE_CHANNEL_ACCESS_TOKEN  = (จาก Messaging API channel)
 *   ADMIN_LINE_USER_IDS        = "Uxxx,Uyyy,Uzzz" (comma-separated)
 *   ADMIN_EMAILS               = "admin1@jc.co.th,admin2@jc.co.th"
 *   SHEET_ID                   = (Google Sheet ID จาก URL)
 */

const SHEET_NAME = 'Leads';
const HEADERS = [
  'timestamp', 'lineUserId', 'displayName',
  'name', 'phone', 'email',
  'company', 'position',
  'purpose', 'revenueRange', 'profitRange',
  'note', 'source',
  'status', 'assignedTo'
];

// ----------- HTTP entry -----------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const errors = validate(data);
    if (errors.length) return jsonResponse({ ok: false, error: errors[0] });

    appendToSheet(data);

    // best-effort: ถ้า notify fail ไม่ทำให้ submit fail
    try { emailAdmins(data); } catch (err) { console.error('email failed', err); }
    try { pushLineAdmins(data); } catch (err) { console.error('LINE push failed', err); }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'JC Lead Form', time: new Date().toISOString() });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------- Validation -----------

function validate(d) {
  const errors = [];
  if (!d || typeof d !== 'object') { errors.push('invalid payload'); return errors; }
  if (!d.name || !String(d.name).trim()) errors.push('missing name');
  if (!/^0[0-9]{8,9}$/.test(String(d.phone || ''))) errors.push('invalid phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ''))) errors.push('invalid email');
  if (!d.company || !String(d.company).trim()) errors.push('missing company');
  if (!d.position || !String(d.position).trim()) errors.push('missing position');
  if (!d.purpose) errors.push('missing purpose');
  if (!d.revenueRange) errors.push('missing revenueRange');
  if (!d.profitRange) errors.push('missing profitRange');
  if (!d.pdpa) errors.push('PDPA consent required');
  return errors;
}

// ----------- Sheet -----------

function getSheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendToSheet(d) {
  const sheet = getSheet();
  const row = [
    new Date(),
    d.lineUserId || '', d.displayName || '',
    d.name, d.phone, d.email,
    d.company, d.position,
    d.purpose, d.revenueRange, d.profitRange,
    d.note || '', d.source || 'direct',
    'New', ''
  ];
  sheet.appendRow(row);
}

// ----------- Email -----------

function emailAdmins(d) {
  const emails = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  const recipients = emails.split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) return;

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const subject = `🔔 Lead ใหม่: ${d.name} (${d.purpose})`;
  const body = [
    '<div style="font-family:Sarabun,Arial,sans-serif;font-size:14px;color:#1a2233">',
    '<h2 style="color:#0b2545;margin:0 0 12px">🔔 Lead ใหม่จาก LINE OA</h2>',
    '<table cellpadding="6" style="border-collapse:collapse">',
    row('ชื่อ', d.name),
    row('เบอร์', `<a href="tel:${d.phone}">${d.phone}</a>`),
    row('อีเมล', `<a href="mailto:${d.email}">${d.email}</a>`),
    row('บริษัท', `${d.company} (${d.position})`),
    row('วัตถุประสงค์', `<strong>${d.purpose}</strong>`),
    row('รายได้', d.revenueRange + ' ล้านบาท'),
    row('กำไร', d.profitRange === 'loss' ? 'ขาดทุน' : d.profitRange + ' ล้านบาท'),
    row('หมายเหตุ', d.note || '-'),
    row('ที่มา', d.source),
    row('LINE userId', d.lineUserId || '-'),
    '</table>',
    `<p style="margin-top:16px"><a href="${sheetUrl}" style="background:#0b2545;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">เปิด Google Sheet</a></p>`,
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    htmlBody: body
  });
}

function row(label, value) {
  return `<tr><td style="color:#5b6478;border-bottom:1px solid #eee">${label}</td>` +
         `<td style="border-bottom:1px solid #eee">${value}</td></tr>`;
}

// ----------- LINE Push -----------

function pushLineAdmins(d) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const ids = PropertiesService.getScriptProperties().getProperty('ADMIN_LINE_USER_IDS') || '';
  const userIds = ids.split(',').map(s => s.trim()).filter(Boolean);
  if (!token || !userIds.length) return;

  const profitText = d.profitRange === 'loss' ? 'ขาดทุน' : d.profitRange + ' ลบ.';
  const text = [
    '🔔 Lead ใหม่จาก LINE OA',
    '',
    `👤 ${d.name}`,
    `🏢 ${d.company} (${d.position})`,
    `🎯 ${d.purpose}`,
    `💰 รายได้ ${d.revenueRange} ลบ. / กำไร ${profitText}`,
    `📞 ${d.phone}`,
    `📧 ${d.email}`,
    d.note ? `📝 ${d.note}` : '',
    '',
    `via: ${d.source}`
  ].filter(Boolean).join('\n');

  userIds.forEach(userId => {
    const payload = {
      to: userId,
      messages: [{ type: 'text', text: text }]
    };
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 200) console.error('LINE push failed', userId, code, res.getContentText());
  });
}

// ----------- One-time setup helper -----------

/**
 * รันครั้งเดียวเพื่อ initialize header ของ sheet
 * Run → setupSheet
 */
function setupSheet() {
  const sheet = getSheet();
  Logger.log('Sheet ready: ' + sheet.getName());
}

/**
 * Test ส่ง email + LINE push โดยไม่ต้อง submit form
 * Run → testNotify
 */
function testNotify() {
  const sample = {
    lineUserId: 'Utest1234',
    displayName: 'Test User',
    name: 'ทดสอบ ระบบ',
    phone: '0812345678',
    email: 'test@example.com',
    company: 'JC Test Co., Ltd.',
    position: 'CFO',
    purpose: 'IPO',
    revenueRange: '500-1000',
    profitRange: '50-100',
    note: 'ทดสอบระบบจาก Apps Script',
    source: 'test',
    pdpa: true
  };
  emailAdmins(sample);
  pushLineAdmins(sample);
  Logger.log('Test notifications sent');
}
