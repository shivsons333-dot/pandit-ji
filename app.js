import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "hi";
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const show = (el, on = true) => el.classList.toggle("hidden", !on);
const setMsg = (el, text, type = "") => { el.textContent = text; el.className = "msg " + type; };

// ---------- Disclaimer (every time the module opens) ----------
$("agree").addEventListener("change", e => $("agreeBtn").disabled = !e.target.checked);
let disclaimerAccepted = false;
$("agreeBtn").addEventListener("click", () => {
  disclaimerAccepted = true;
  show($("disclaimer"), false);
  render(auth.currentUser);
});

// ---------- Mobile OTP login ----------
let recaptcha, confirmation;
function getRecaptcha() {
  if (!recaptcha) recaptcha = new RecaptchaVerifier(auth, "recaptcha", { size: "invisible" });
  return recaptcha;
}

$("sendOtpBtn").addEventListener("click", async () => {
  const num = $("phone").value.trim();
  if (!/^[6-9]\d{9}$/.test(num)) return setMsg($("loginMsg"), "कृपया सही 10 अंकों का मोबाइल नंबर डालें।", "err");
  $("sendOtpBtn").disabled = true;
  setMsg($("loginMsg"), "OTP भेजा जा रहा है...");
  try {
    confirmation = await signInWithPhoneNumber(auth, "+91" + num, getRecaptcha());
    show($("phoneStep"), false); show($("otpStep"));
    setMsg($("loginMsg"), "OTP आपके मोबाइल पर भेजा गया है।", "ok");
    $("otp").focus();
  } catch (err) {
    console.error(err);
    setMsg($("loginMsg"), "OTP नहीं भेजा जा सका: " + (err.code || err.message), "err");
    try { recaptcha?.clear(); } catch {} recaptcha = null;
  } finally { $("sendOtpBtn").disabled = false; }
});

$("verifyOtpBtn").addEventListener("click", async () => {
  const code = $("otp").value.trim();
  if (!/^\d{6}$/.test(code)) return setMsg($("loginMsg"), "6 अंकों का OTP डालें।", "err");
  $("verifyOtpBtn").disabled = true;
  try {
    await confirmation.confirm(code);
    setMsg($("loginMsg"), "");
  } catch (err) {
    setMsg($("loginMsg"), "गलत OTP। कृपया दोबारा प्रयास करें।", "err");
  } finally { $("verifyOtpBtn").disabled = false; }
});

$("changeNumBtn").addEventListener("click", () => {
  show($("otpStep"), false); show($("phoneStep")); setMsg($("loginMsg"), "");
});
$("logoutBtn").addEventListener("click", () => signOut(auth));

// ---------- Screens ----------
let unsubHistory = null;
onAuthStateChanged(auth, user => render(user));

function render(user) {
  if (!disclaimerAccepted) return;
  if (!user) {
    unsubHistory?.(); unsubHistory = null;
    show($("appBox"), false); show($("loginBox"));
    show($("otpStep"), false); show($("phoneStep"));
    return;
  }
  show($("loginBox"), false); show($("appBox"));
  $("userPhone").textContent = user.phoneNumber;
  if (!unsubHistory) listenHistory(user.phoneNumber);
}

// Tabs
document.querySelectorAll(".tabs button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b === btn));
  ["ask", "kundli", "history"].forEach(t => show($("tab-" + t), t === btn.dataset.tab));
}));

// ---------- Submit requests ----------
async function submitRequest(form, type, msgEl) {
  const user = auth.currentUser;
  if (!user) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "requests"), {
      type,                       // "problem" | "kundli"
      phone: user.phoneNumber,    // history is stored against the mobile number
      uid: user.uid,
      details: data,
      status: "pending",
      answer: "",
      answerLink: "",
      createdAt: serverTimestamp()
    });
    form.reset();
    setMsg(msgEl, "✅ आपका अनुरोध पंडित जी को भेज दिया गया है। उत्तर 'मेरा इतिहास' में दिखेगा।", "ok");
  } catch (err) {
    console.error(err);
    setMsg(msgEl, "भेजने में त्रुटि: " + (err.code || err.message), "err");
  } finally { btn.disabled = false; }
}
$("askForm").addEventListener("submit", e => { e.preventDefault(); submitRequest(e.target, "problem", $("askMsg")); });
$("kundliForm").addEventListener("submit", e => { e.preventDefault(); submitRequest(e.target, "kundli", $("kundliMsg")); });

// ---------- History by mobile number ----------
function listenHistory(phone) {
  const q = query(collection(db, "requests"), where("phone", "==", phone));
  unsubHistory = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $("historyList").innerHTML = items.length ? items.map(historyCard).join("")
      : "<p>अभी तक कोई अनुरोध नहीं। ऊपर से समस्या पूछें या जन्म पत्रिका माँगें।</p>";
  }, err => { $("historyList").textContent = "इतिहास लोड नहीं हो सका: " + err.code; });
}

function fmt(ts) {
  return ts?.toDate ? ts.toDate().toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" }) : "अभी";
}

function historyCard(r) {
  const d = r.details || {};
  const title = r.type === "kundli" ? "📜 जन्म पत्रिका" : "❓ " + esc(d.category || "समस्या");
  const body = r.type === "kundli"
    ? `नाम: ${esc(d.personName)} · जन्म: ${esc(d.dob)} ${esc(d.tob)} · स्थान: ${esc(d.pob)}${d.note ? "<br>प्रश्न: " + esc(d.note) : ""}`
    : `<b>${esc(d.personName)}</b>: ${esc(d.problem)}`;
  const status = r.status === "answered"
    ? '<span class="badge answered">उत्तर मिला</span>' : '<span class="badge pending">प्रतीक्षा में</span>';
  const link = r.answerLink && /^https?:\/\//.test(r.answerLink)
    ? `<br><a href="${esc(r.answerLink)}" target="_blank" rel="noopener">📎 दस्तावेज़ / पत्रिका देखें</a>` : "";
  const answer = r.status === "answered"
    ? `<div class="answer"><b>पंडित जी का उत्तर (${fmt(r.answeredAt)}):</b>\n${esc(r.answer)}${link}</div>` : "";
  return `<div class="item"><div class="meta"><b>${title}</b> ${status} <span>${fmt(r.createdAt)}</span></div>
    <div class="pre" style="margin-top:6px">${body}</div>${answer}</div>`;
}
