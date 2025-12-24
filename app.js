// =========================
// CONFIG
// =========================
const LOCATION_UPDATE_MS = 25000; // 25s
const ORLANDO_FINAL_PERCENT = 0.90; // only show Orlando after 90%
const GIFTS_PER_SEC = 4200;

// Friendly story stops (simulated)
const stops = [
  { name: "North Pole", blurb: "Filling the sleigh with presents…" },
  { name: "Auckland", blurb: "Dodging cloud-puff dragons ☁️🐉" },
  { name: "Sydney", blurb: "Reindeer snack break 🥕" },
  { name: "Tokyo", blurb: "Waving at rooftops 🏙️" },
  { name: "Dubai", blurb: "Turbo-boost over the desert 🌙" },
  { name: "Paris", blurb: "Flying past twinkly lights ✨" },
  { name: "London", blurb: "Cookies detected 🍪" },
  { name: "New York", blurb: "City lights are sparkling 🌟" },
  { name: "Orlando", blurb: "Shhh… landing soon. Find your chimney! 🏠" },
];

// =========================
// Helpers: Time to 1:00 AM ET
// =========================
function getNext1amET() {
  // Use Intl to compute "now" in America/New_York, then target next 1:00 AM in that zone.
  const tz = "America/New_York";
  const now = new Date();

  // Get NY date parts
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const hh = Number(parts.hour);
  const mm = Number(parts.minute);
  const ss = Number(parts.second);

  // Build a Date representing 1:00 AM ET "today"
  // We can’t directly construct a Date in ET without a library, so we:
  // 1) Create a UTC date for the target, then
  // 2) Adjust by comparing what ET time it resolves to.
  // Practical approach: iterate by hour until ET is 01:00.
  const base = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  function isTarget(dt) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(dt).reduce((acc, x) => (acc[x.type] = x.value, acc), {});
    return Number(p.hour) === 1 && Number(p.minute) === 0 && Number(p.second) === 0;
  }

  // Find the next occurrence of 1:00:00 ET starting from base day
  let candidate = base;
  for (let i = 0; i < 48 * 60 * 60; i += 60) { // step minute up to 48 hours
    const dt = new Date(base.getTime() + i * 1000);
    if (isTarget(dt)) {
      candidate = dt;
      break;
    }
  }

  // If NY time is already past 1:00 AM today, shift to tomorrow’s 1:00 AM ET
  const past1amToday = (hh > 1) || (hh === 1 && (mm > 0 || ss > 0));
  if (past1amToday) {
    const tomorrowBase = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
    for (let i = 0; i < 48 * 60 * 60; i += 60) {
      const dt = new Date(tomorrowBase.getTime() + i * 1000);
      if (isTarget(dt)) {
        candidate = dt;
        break;
      }
    }
  }

  return candidate;
}

function pad2(n){ return String(n).padStart(2,"0"); }
function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

// =========================
// UI Elements
// =========================
const etaEl = document.getElementById("eta");
const giftsEl = document.getElementById("gifts");
const nextStopEl = document.getElementById("nextStop");
const storyLineEl = document.getElementById("storyLine");
const meterFill = document.getElementById("meterFill");

const santaWrap = document.getElementById("santaWrap");
const speech = document.getElementById("speech");
const sparkle = document.getElementById("sparkle");

const cheerBtn = document.getElementById("cheerBtn");
const shareBtn = document.getElementById("shareBtn");
const soundBtn = document.getElementById("soundBtn");

// =========================
// Countdown & Progress
// =========================
const targetET = getNext1amET();
let start = Date.now();

function getProgress() {
  const now = Date.now();
  const total = Math.max(1, (targetET.getTime() - start));
  const remaining = Math.max(0, targetET.getTime() - now);
  return 1 - (remaining / total); // 0..1
}

function tickCountdown() {
  etaEl.textContent = formatHMS(targetET.getTime() - Date.now());
  requestAnimationFrame(tickCountdown);
}
tickCountdown();

// =========================
// Gifts Counter
// =========================
let giftsBase = 7423725346289; // big + fun
function tickGifts() {
  const elapsed = (Date.now() - start) / 1000;
  const val = Math.floor(giftsBase + elapsed * GIFTS_PER_SEC);
  giftsEl.textContent = val.toLocaleString();
  requestAnimationFrame(tickGifts);
}
tickGifts();

// =========================
// Location rotation (slow)
// =========================
function updateLocation() {
  const p = getProgress();

  // Keep Orlando hidden until final stretch
  const usableStops = (p >= ORLANDO_FINAL_PERCENT)
    ? stops
    : stops.slice(0, stops.length - 1);

  // Choose index by progress
  const idx = Math.min(usableStops.length - 1, Math.floor(p * usableStops.length));
  const current = usableStops[idx];
  const next = usableStops[Math.min(usableStops.length - 1, idx + 1)];

  nextStopEl.textContent = next ? next.name.toUpperCase() : current.name.toUpperCase();
  storyLineEl.textContent = current.blurb;

  setTimeout(updateLocation, LOCATION_UPDATE_MS);
}
updateLocation();

// =========================
// Snow Canvas
// =========================
const canvas = document.getElementById("snow");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  W = canvas.width = Math.floor(rect.width);
  H = canvas.height = Math.floor(rect.height);
}
window.addEventListener("resize", resize);
resize();

const flakes = Array.from({length: 140}, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 2.2 + 0.6,
  v: Math.random() * 0.8 + 0.3,
  d: Math.random() * 0.6 + 0.2
}));

function drawSnow() {
  ctx.clearRect(0,0,W,H);

  // faint vignette
  const g = ctx.createRadialGradient(W*0.5, H*0.45, 40, W*0.5, H*0.45, Math.max(W,H)*0.75);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // stars
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i=0;i<70;i++){
    const x = (i*97 % W);
    const y = (i*53 % H);
    ctx.fillRect(x, y, 2, 2);
  }

  // flakes
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  flakes.forEach(f => {
    f.y += f.v;
    f.x += Math.sin((Date.now()/800) + f.y*0.01) * f.d;

    if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }

    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(drawSnow);
}
drawSnow();

// =========================
// Interactions: Santa tap / Cheer / Share / Sound
// =========================
const phrases = [
  "Ho ho ho! 🎅",
  "Cookies spotted! 🍪",
  "More sparkle! ✨",
  "Reindeer say hi! 🦌",
  "Almost time! ⏳"
];

let speechTimer = null;
function showSpeech(text){
  speech.textContent = text;
  speech.classList.add("show");
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speech.classList.remove("show"), 1400);
}

function popSparkle(){
  sparkle.textContent = "✨";
  sparkle.style.opacity = "1";
  sparkle.style.transform = "translate(-50%,-50%) scale(1)";
  setTimeout(() => {
    sparkle.style.opacity = "0";
    sparkle.style.transform = "translate(-50%,-50%) scale(1.35)";
  }, 220);
}

function onSantaTap(){
  const msg = phrases[Math.floor(Math.random()*phrases.length)];
  showSpeech(msg);
  popSparkle();
}

santaWrap.addEventListener("click", onSantaTap);
santaWrap.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") onSantaTap();
});

// Cheer meter
let meter = 0; // 0..100
function setMeter(v){
  meter = Math.max(0, Math.min(100, v));
  meterFill.style.width = `${meter}%`;
}
cheerBtn.addEventListener("click", () => {
  setMeter(meter + 12);
  popSparkle();
  if (meter >= 100){
    showSpeech("SLEIGH BOOST!! 🚀");
    setMeter(0);
    santaWrap.animate(
      [{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-53%) scale(1.06)" }, { transform: "translate(-50%,-50%) scale(1)" }],
      { duration: 520, easing: "ease-out" }
    );
  }
});

// Share button copies the current page URL
shareBtn.addEventListener("click", async () => {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showSpeech("Link copied! 📎");
  } catch {
    showSpeech("Copy failed 😅");
  }
});

// Sound toggle (placeholder: no audio in v1)
let soundOn = false;
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
  showSpeech(soundOn ? "Sound on! 🔊" : "Sound off 🔇");
});
