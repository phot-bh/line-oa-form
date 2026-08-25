/* ==========================================================
   SME Decode — Lead Form (LIFF client)
   ========================================================== */

// ▼▼▼ ตั้งค่า 2 ค่านี้ก่อน deploy ▼▼▼
const LIFF_ID = "2010190214-q9gj5n1x";
const ENDPOINT = "https://script.google.com/macros/s/AKfycbwktYY9VQke-P_m0_J1fi7VbNxPs_M-BUd032ruIZ1OF8SAB-AtubHii1sZsauAkMCVAQ/exec";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const $ = (sel) => document.querySelector(sel);

let liffProfile = null;
let currentLang = "th";

// ─── Language toggle ───────────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  document.documentElement.setAttribute("data-lang", lang);

  // Swap text nodes with data-th / data-en attributes
  document.querySelectorAll("[data-th][data-en]").forEach((el) => {
    const val = el.getAttribute("data-" + lang);
    if (val !== null) el.innerHTML = val;
  });

  // Swap placeholder on textarea
  document.querySelectorAll("[data-placeholder-th]").forEach((el) => {
    el.placeholder = el.getAttribute("data-placeholder-" + lang) || "";
  });

  // Page title
  const titleEl = document.querySelector("title");
  const titleVal = titleEl?.getAttribute("data-" + lang);
  if (titleEl && titleVal) titleEl.textContent = titleVal;

  // Toggle slider position
  const sw = $("#lang-switch");
  if (sw) sw.setAttribute("data-active", lang);
}

// ─── Error messages per language ──────────────────────────
const ERRORS = {
  th: {
    name: "กรุณากรอกชื่อ",
    phone: "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้น 0)",
    email: "อีเมลไม่ถูกต้อง",
    company: "กรุณากรอกชื่อบริษัท",
    position: "กรุณากรอกตำแหน่ง",
    purpose: "กรุณาเลือกวัตถุประสงค์",
    purposeOther: "กรุณาระบุวัตถุประสงค์ที่ต้องการ",
    revenue: "กรุณาเลือกช่วงรายได้",
    profit: "กรุณาเลือกช่วงกำไร",
    pdpa: "กรุณายอมรับนโยบายความเป็นส่วนตัว",
    submitFail: "ส่งข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง",
    sending: "กำลังส่ง...",
    submit: "ส่งข้อมูล",
  },
  en: {
    name: "Please enter your full name",
    phone: "Invalid phone number (10 digits, starting with 0)",
    email: "Invalid email address",
    company: "Please enter your company name",
    position: "Please enter your position",
    purpose: "Please select a service",
    purposeOther: "Please specify your purpose",
    revenue: "Please select a revenue range",
    profit: "Please select a profit range",
    pdpa: "Please accept the privacy policy",
    submitFail: "Submission failed. Please try again.",
    sending: "Sending...",
    submit: "Submit",
  },
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindUI();
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      // Only auto-login inside the LINE app. In an external browser, liff.login()
      // does an OAuth redirect that returns "400 Bad Request" when redirect_uri
      // doesn't exactly match the registered LIFF Endpoint URL.
      if (liff.isInClient()) liff.login();
      return;
    }
    liffProfile = await liff.getProfile();
    const nameInput = $("#name");
    if (liffProfile && liffProfile.displayName && !nameInput.value) {
      nameInput.value = liffProfile.displayName;
    }
  } catch (err) {
    // LIFF init failed (เปิดนอก LINE app, network ฯลฯ) → form ยังใช้งานได้, แต่ไม่มี userId
    console.warn("LIFF init failed:", err);
  }
}

function bindUI() {
  document.querySelectorAll(".lang-switch .lang-option").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  $("#lead-form").addEventListener("submit", onSubmit);
  $("#close-btn").addEventListener("click", () => {
    try { liff.closeWindow(); } catch (_) { window.close(); }
  });

  // Live phone format cleanup
  $("#phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
  });

  // Show/hide "specify purpose" field when "อื่นๆ" is selected
  const otherWrap = $("#purpose-other-wrap");
  const otherInput = $("#purposeOther");
  document.querySelectorAll('input[name="purpose"]').forEach((r) => {
    r.addEventListener("change", () => {
      const isOther = r.checked && r.value === "อื่นๆ";
      otherWrap.hidden = !isOther;
      if (!isOther) otherInput.value = "";
    });
  });

  // Clear invalid state on edit
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("invalid"));
    el.addEventListener("change", () => el.classList.remove("invalid"));
  });
}

function validate(payload) {
  const errors = [];
  const mark = (id) => $("#" + id)?.classList.add("invalid");
  const t = ERRORS[currentLang];

  if (!payload.name.trim())                               { errors.push(t.name);     mark("name"); }
  if (!/^0[0-9]{8,9}$/.test(payload.phone))              { errors.push(t.phone);    mark("phone"); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { errors.push(t.email);    mark("email"); }
  if (!payload.company.trim())                            { errors.push(t.company);  mark("company"); }
  if (!payload.position.trim())                           { errors.push(t.position); mark("position"); }
  if (!payload.purpose)                                     errors.push(t.purpose);
  if (payload.purpose === "อื่นๆ" && !payload.purposeOther.trim()) { errors.push(t.purposeOther); mark("purposeOther"); }
  if (!payload.revenueRange)                              { errors.push(t.revenue);  mark("revenueRange"); }
  if (!payload.profitRange)                               { errors.push(t.profit);   mark("profitRange"); }
  if (!payload.pdpa)                                        errors.push(t.pdpa);

  return errors;
}

function getSource() {
  const p = new URLSearchParams(window.location.search);
  return p.get("source") || "direct";
}

async function onSubmit(e) {
  e.preventDefault();
  const banner = $("#error-banner");
  banner.hidden = true;

  const formData = new FormData(e.target);
  const payload = {
    name: (formData.get("name") || "").trim(),
    phone: (formData.get("phone") || "").trim(),
    email: (formData.get("email") || "").trim(),
    company: (formData.get("company") || "").trim(),
    position: (formData.get("position") || "").trim(),
    purpose: formData.get("purpose") || "",
    purposeOther: (formData.get("purposeOther") || "").trim(),
    revenueRange: formData.get("revenueRange") || "",
    profitRange: formData.get("profitRange") || "",
    note: (formData.get("note") || "").trim(),
    pdpa: formData.get("pdpa") === "on",
    source: getSource(),
    lineUserId: liffProfile?.userId || "",
    displayName: liffProfile?.displayName || "",
  };

  const errors = validate(payload);
  if (errors.length) {
    banner.textContent = errors[0]; // show first error
    banner.hidden = false;
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Merge "specify purpose" text into the purpose field so the backend column stays single-valued
  if (payload.purpose === "อื่นๆ" && payload.purposeOther) {
    payload.purpose = `อื่นๆ: ${payload.purposeOther}`;
  }
  delete payload.purposeOther;

  // Submit
  const btn = $("#submit-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".btn-loader");
  btn.disabled = true;
  btnText.textContent = ERRORS[currentLang].sending;
  btnLoader.hidden = false;

  try {
    // Apps Script Web App ต้องใช้ text/plain เพื่อหลีกเลี่ยง CORS preflight
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (!json.ok) throw new Error(json.error || "submit failed");

    // success
    $("#success-name").textContent = "คุณ " + payload.name.split(" ")[0];
    $("#form-view").hidden = true;
    $("#success-view").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    banner.textContent = ERRORS[currentLang].submitFail;
    banner.hidden = false;
    btn.disabled = false;
    btnText.textContent = ERRORS[currentLang].submit;
    btnLoader.hidden = true;
  }
}
