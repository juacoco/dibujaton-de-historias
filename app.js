/*
  Sketch Duel — estático (GitHub Pages)
  3 rondas + timer + sonidos (WebAudio) + final con 3 dibujos + descarga.

  PERSONALIZA AQUÍ:
*/
const CONFIG = {
  title: "Sketch Duel",

  // Acceso simple por interfaz:
  // "" = desactivado.
  // Si pones un texto (ej: "globo2026"), pedirá ese código en el menú.
  // OJO: no es seguridad real.
  accessCode: "",

  rounds: [
    { prompt: "Ronda 1: Dibuja tu escena 1.", seconds: 45, note: "Tip: usa líneas simples." },
    { prompt: "Ronda 2: Dibuja tu escena 2.", seconds: 45, note: "Tip: agrega un detalle clave." },
    { prompt: "Ronda 3: Dibuja tu escena 3.", seconds: 45, note: "Tip: cuida la composición." },
  ],

  finalTitle: "Final",
  finalText: "¿Quieres ser mi San Valentín?",
  loadingMs: 900,

  sound: {
    enabled: true,
    warnAt: 10,
    drawEveryMs: 160,
  },
};

const $ = (id) => document.getElementById(id);

// Screens
const screens = {
  menu: $("screenMenu"),
  play: $("screenPlay"),
  loading: $("screenLoading"),
  final: $("screenFinal"),
};
function showScreen(name){
  for (const k of Object.keys(screens)) screens[k].classList.remove("show");
  screens[name].classList.add("show");
}

// Title
$("gameTitle").textContent = CONFIG.title;
document.title = CONFIG.title;
$("menuTitle").textContent = CONFIG.title;
$("finalTitle").textContent = CONFIG.finalTitle;
$("finalText").textContent = CONFIG.finalText;
$("roundsHint").textContent = String(CONFIG.rounds.length);
$("timeHint").textContent = (CONFIG.rounds[0]?.seconds ?? 45) + "s";

// --- Simple WebAudio beeps (sin archivos externos) ---
let audioUnlocked = false;
let audioCtx = null;

function unlockAudio(){
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (!CONFIG.sound.enabled) return;
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }catch(_){
    audioCtx = null;
  }
}

function beep(freq=880, duration=0.08, volume=0.06){
  if (!CONFIG.sound.enabled || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function soundTick(){ beep(950, 0.06, 0.05); }
function soundWarn(){ beep(700, 0.12, 0.06); }
function soundReveal(){ beep(523.25, 0.18, 0.08); }
function soundDraw(){ beep(1200, 0.03, 0.02); }

// --- Name ---
let myName = localStorage.getItem("sd_name") || "";
function defaultName(){
  const pool = ["Pixel","Pincel","Doodle","Sketch","Chispa","Nube","Línea","Globo"];
  return pool[Math.floor(Math.random()*pool.length)] + Math.floor(10 + Math.random()*90);
}
function setName(n){
  myName = (n||"").trim();
  if (!myName) myName = defaultName();
  localStorage.setItem("sd_name", myName);
  $("nameInput").value = myName;
  $("playerName").textContent = myName;
  $("miniName").textContent = myName;
  $("avatar").textContent = myName.slice(0,1).toUpperCase();
}
$("btnSaveName").addEventListener("click", ()=>{ unlockAudio(); setName($("nameInput").value); });
$("nameInput").addEventListener("keydown", (e)=>{ if (e.key==="Enter"){ unlockAudio(); setName($("nameInput").value); } });
$("nameInput").value = myName;
setName(myName);

// --- Status pill ---
function setStatus(text){ $("statusPill").textContent = text; }

// --- Canvas drawing ---
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
let drawing = false;
let lastX=0, lastY=0;
let lastDrawSoundAt = 0;

// Store drawings per round
const drawings = Array(CONFIG.rounds.length).fill(null);
let roundIndex = 0;

function resizeCanvasForHiDPI(){
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 900;
  const cssH = Math.floor(cssW * 0.6);

  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));

  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#0f1422";
  ctx.fillRect(0,0,cssW,cssH);

  const dataUrl = drawings[roundIndex];
  if (dataUrl){
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
    img.src = dataUrl;
  }
}

function clearCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 900;
  const cssH = Math.floor(cssW * 0.6);

  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#0f1422";
  ctx.fillRect(0,0,cssW,cssH);

  drawings[roundIndex] = null;
}

function getPos(e){
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
}

function stroke(from, to, size){
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e9ecf2";
  ctx.lineWidth = size;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function startDraw(e){
  drawing = true;
  const p = getPos(e);
  lastX = p.x; lastY = p.y;
}
function moveDraw(e){
  if (!drawing) return;
  const p = getPos(e);
  const size = Number($("brushSize").value || 6);

  const from = {x:lastX, y:lastY};
  stroke(from, p, size);

  lastX = p.x; lastY = p.y;

  const now = Date.now();
  if (now - lastDrawSoundAt > CONFIG.sound.drawEveryMs){
    soundDraw();
    lastDrawSoundAt = now;
  }
}
function endDraw(){ drawing = false; }

canvas.addEventListener("pointerdown", (e)=>{ unlockAudio(); canvas.setPointerCapture(e.pointerId); startDraw(e); });
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointercancel", endDraw);
canvas.addEventListener("pointerleave", endDraw);

$("btnClear").addEventListener("click", ()=>{ unlockAudio(); clearCanvas(); });

// --- Timer ---
let timer = null;
let timeLeft = 0;

function updateTimerUI(){
  $("timerText").textContent = Math.max(0, timeLeft);
  const el = document.querySelector(".timer");
  if (!el) return;
  if (timeLeft <= 10) el.classList.add("danger");
  else el.classList.remove("danger");
}

function startTimer(seconds){
  stopTimer();
  timeLeft = seconds;
  updateTimerUI();

  timer = setInterval(()=>{
    timeLeft -= 1;
    updateTimerUI();

    if (timeLeft === CONFIG.sound.warnAt) soundWarn();
    if (timeLeft <= 5 && timeLeft > 0) soundTick();

    if (timeLeft <= 0){
      stopTimer();
      finishRound(true);
    }
  }, 1000);
}

function stopTimer(){
  if (timer) { clearInterval(timer); timer = null; }
}

// --- Flow ---
function setRoundUI(){
  const total = CONFIG.rounds.length;
  $("roundPill").textContent = `Ronda ${roundIndex+1}/${total}`;
  $("promptText").textContent = CONFIG.rounds[roundIndex].prompt;
  $("miniNote").textContent = CONFIG.rounds[roundIndex].note || "";
}

function startGame(){
  if (CONFIG.accessCode){
    const code = ($("codeInput").value || "").trim();
    if (code !== CONFIG.accessCode){
      alert("Código incorrecto.");
      return;
    }
  }

  roundIndex = 0;
  for (let i=0;i<drawings.length;i++) drawings[i] = null;

  setStatus("Ronda 1");
  setRoundUI();
  showScreen("play");
  setTimeout(resizeCanvasForHiDPI, 0);
  clearCanvas();
  startTimer(CONFIG.rounds[0].seconds);
}

function saveCurrentDrawing(){
  drawings[roundIndex] = canvas.toDataURL("image/png");
}

function finishRound(auto=false){
  saveCurrentDrawing();

  showScreen("loading");
  $("loadingTitle").textContent = auto ? "¡Tiempo! Guardando…" : "Guardando…";
  $("loadingSub").textContent = "Preparando la siguiente ronda…";

  setTimeout(()=> nextRoundOrFinal(), CONFIG.loadingMs);
}

function nextRoundOrFinal(){
  if (roundIndex < CONFIG.rounds.length - 1){
    roundIndex += 1;
    setStatus(`Ronda ${roundIndex+1}`);
    setRoundUI();
    showScreen("play");
    setTimeout(resizeCanvasForHiDPI, 0);
    clearCanvas();
    startTimer(CONFIG.rounds[roundIndex].seconds);
  } else {
    setStatus("Final");
    stopTimer();
    renderFinal();
    soundReveal();
    showScreen("final");
  }
}

$("btnDone").addEventListener("click", ()=>{ unlockAudio(); stopTimer(); finishRound(false); });
$("btnStart").addEventListener("click", ()=>{ unlockAudio(); setName($("nameInput").value); startGame(); });

$("btnHome").addEventListener("click", ()=>{
  unlockAudio();
  stopTimer();
  showScreen("menu");
  setStatus("Menú");
});

$("btnPlayAgain").addEventListener("click", ()=>{
  unlockAudio();
  stopTimer();
  showScreen("menu");
  setStatus("Menú");
});

// --- Final rendering + download story ---
async function renderFinal(){
  const grid = $("storyGrid");
  grid.innerHTML = "";

  for (let i=0;i<CONFIG.rounds.length;i++){
    const panel = document.createElement("div");
    panel.className = "storyPanel";

    const img = document.createElement("img");
    img.alt = `Dibujo ${i+1}`;
    img.src = drawings[i] || emptyPanelDataUrl(i+1);

    const title = document.createElement("div");
    title.className = "panelTitle";
    title.textContent = `Escena ${i+1}: ${CONFIG.rounds[i].prompt}`;

    panel.appendChild(img);
    panel.appendChild(title);
    grid.appendChild(panel);
  }

  const storyPng = await buildStoryImage(drawings, CONFIG.finalText);
  $("btnDownloadStory").href = storyPng;
}

function emptyPanelDataUrl(n){
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 750;
  const g = c.getContext("2d");

  g.fillStyle = "#0f1422";
  g.fillRect(0,0,c.width,c.height);

  g.strokeStyle = "rgba(124,92,255,.7)";
  g.lineWidth = 8;
  roundRect(g, 60, 60, c.width-120, c.height-120, 28);
  g.stroke();

  g.fillStyle = "#e9ecf2";
  g.textAlign = "center";
  g.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.fillText(`Escena ${n}`, c.width/2, c.height/2 - 10);

  g.fillStyle = "rgba(170,179,197,1)";
  g.font = "500 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.fillText("No se guardó dibujo", c.width/2, c.height/2 + 38);

  return c.toDataURL("image/png");
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function loadImg(dataUrl){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>resolve(null);
    img.src = dataUrl;
  });
}

async function buildStoryImage(draws, askText){
  const w = 1200;
  const hPanel = 750;
  const gap = 18;
  const top = 24;
  const bottom = 120;
  const totalH = top + draws.length*hPanel + (draws.length-1)*gap + bottom;

  const c = document.createElement("canvas");
  c.width = w;
  c.height = totalH;
  const g = c.getContext("2d");

  g.fillStyle = "#0b0e14";
  g.fillRect(0,0,w,totalH);

  let y = top;
  for (let i=0;i<draws.length;i++){
    const url = draws[i] || emptyPanelDataUrl(i+1);
    const img = await loadImg(url);
    if (img) g.drawImage(img, 0, y, w, hPanel);
    y += hPanel + gap;
  }

  g.fillStyle = "#e9ecf2";
  g.textAlign = "center";
  g.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.fillText(askText, w/2, totalH - 52);

  return c.toDataURL("image/png");
}

// Resize
window.addEventListener("resize", ()=>{
  if (screens.play.classList.contains("show")) resizeCanvasForHiDPI();
});

// Init
setStatus("Menú");
showScreen("menu");
