/* ==========================================================
   Jay Capital — LINE OA Lead Form (LIFF client)
   ========================================================== */

// ▼▼▼ ตั้งค่า 2 ค่านี้ก่อน deploy ▼▼▼
const LIFF_ID = "2010190214-q9gj5n1x";
const ENDPOINT = "https://script.google.com/macros/s/AKfycbzmAX5vq5XY1_cBQNnzDBR3DFN475cDjMIU2RKfZpmHHhfoG91GZk_BK1RcsfvCobUF/exec";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const $ = (sel) => document.querySelector(sel);

let liffProfile = null; // { userId, displayName }

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindUI();
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
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
  $("#lead-form").addEventListener("submit", onSubmit);
  $("#close-btn").addEventListener("click", () => {
    try { liff.closeWindow(); } catch (_) { window.close(); }
  });

  // Live phone format cleanup
  $("#phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
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

  if (!payload.name.trim()) { errors.push("กรุณากรอกชื่อ"); mark("name"); }
  if (!/^0[0-9]{8,9}$/.test(payload.phone)) { errors.push("เบอร์โทรไม่ถูกต้อง"); mark("phone"); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { errors.push("อีเมลไม่ถูกต้อง"); mark("email"); }
  if (!payload.company.trim()) { errors.push("กรุณากรอกชื่อบริษัท"); mark("company"); }
  if (!payload.position.trim()) { errors.push("กรุณากรอกตำแหน่ง"); mark("position"); }
  if (!payload.purpose) errors.push("กรุณาเลือกวัตถุประสงค์");
  if (!payload.revenueRange) { errors.push("กรุณาเลือกช่วงรายได้"); mark("revenueRange"); }
  if (!payload.profitRange) { errors.push("กรุณาเลือกช่วงกำไร"); mark("profitRange"); }
  if (!payload.pdpa) errors.push("กรุณายอมรับนโยบายความเป็นส่วนตัว");

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

  // Submit
  const btn = $("#submit-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".btn-loader");
  btn.disabled = true;
  btnText.textContent = "กำลังส่ง...";
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
    banner.textContent = "ส่งข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อทีมงานโดยตรง";
    banner.hidden = false;
    btn.disabled = false;
    btnText.textContent = "ส่งข้อมูล";
    btnLoader.hidden = true;
  }
}
