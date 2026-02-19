const socket = io();

const el = (id) => document.getElementById(id);

const screenLanding = el("screenLanding");
const screenGame = el("screenGame");

const btnCreate = el("btnCreate");
const btnJoinGuest = el("btnJoinGuest");
const btnJoinScreen = el("btnJoinScreen");
const btnLeave = el("btnLeave");

const hostName = el("hostName");
const guestName = el("guestName");
const joinCode1 = el("joinCode1");
const joinCode2 = el("joinCode2");

const roomPill = el("roomPill");
const roleBadge = el("roleBadge");

const board = el("board");

const buzzerBox = el("buzzerBox");
const btnBuzzRed = el("btnBuzzRed");
const btnBuzzGreen = el("btnBuzzGreen");

const hostTools = el("hostTools");
const btnClearBuzz = el("btnClearBuzz");
const btnReset = el("btnReset");

const lastQ = el("lastQ");
const lastA = el("lastA");
const buzzWho = el("buzzWho");

const modal = el("modal");
const modalClose = el("modalClose");
const modalLetter = el("modalLetter");
const modalQ = el("modalQ");
const modalA = el("modalA");
const btnShowA = el("btnShowA");
const modalHostOnly = el("modalHostOnly");
const btnColorRed = el("btnColorRed");
const btnColorGreen = el("btnColorGreen");
const btnColorNone = el("btnColorNone");
const btnAnotherQ = el("btnAnotherQ");

let STATE = null;
let ROOM = null;
let ROLE = null;
let USED = new Set();     // used questions keys
let CURRENT = null;       // current {letter,q,a}

function showLanding() {
  screenLanding.classList.remove("hidden");
  screenGame.classList.add("hidden");
  roomPill.textContent = "—";
  roleBadge.textContent = "—";
  ROOM = null;
  ROLE = null;
  STATE = null;
  USED = new Set();
  CURRENT = null;
}

function showGame() {
  screenLanding.classList.add("hidden");
  screenGame.classList.remove("hidden");
}

function openModal() {
  modal.classList.remove("hidden");
}
function closeModal() {
  modal.classList.add("hidden");
  modalA.classList.add("hidden");
  btnShowA.textContent = "إظهار الجواب";
}

function setRoleUI() {
  roleBadge.textContent = `الدور: ${ROLE}`;
  if (ROLE === "host") {
    hostTools.classList.remove("hidden");
    modalHostOnly.classList.remove("hidden");
    buzzerBox.classList.add("hidden"); // الحكم ما يحتاج يضغط زر
  } else if (ROLE === "guest") {
    hostTools.classList.add("hidden");
    modalHostOnly.classList.add("hidden");
    buzzerBox.classList.remove("hidden");
  } else {
    // screen
    hostTools.classList.add("hidden");
    modalHostOnly.classList.add("hidden");
    buzzerBox.classList.add("hidden");
  }
}

function renderBoard() {
  board.innerHTML = "";

  // 5x5
  const letters = STATE.boardLetters;

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = letter;

    // row shift to mimic honeycomb
    const row = Math.floor(i / 5);
    if (row === 1 || row === 3) cell.classList.add("rowShift1");
    if (row === 2) cell.classList.add("rowShift2");

    // fill color
    const c = STATE.colors[letter] || "none";
    if (c === "red") cell.classList.add("redFill");
    if (c === "green") cell.classList.add("greenFill");

    cell.addEventListener("click", () => onLetterClick(letter));
    board.appendChild(cell);
  }
}

function onLetterClick(letter) {
  if (ROLE !== "host") return;

  // pick a question for that letter
  const { q, a } = window.pickQuestion(letter, USED);

  CURRENT = { letter, q, a };
  socket.emit("hostAsk", { code: ROOM, letter, q, a });

  // show modal immediately
  modalLetter.textContent = `حرف: ${letter}`;
  modalQ.textContent = q;
  modalA.textContent = a;
  openModal();
}

function applyStatePatch(patch) {
  if (!STATE) return;
  if (patch.colors) STATE.colors = patch.colors;
  renderBoard();
}

function setBuzzUI(buzz) {
  if (!buzz) {
    buzzWho.textContent = "—";
    return;
  }
  const teamName = buzz.team === "red" ? "🔴 الأحمر" : "🟢 الأخضر";
  buzzWho.textContent = `${teamName} — ${buzz.name}`;
}

function setLastQA(qObj) {
  if (!qObj) {
    lastQ.textContent = "—";
    lastA.textContent = "—";
    return;
  }
  lastQ.textContent = `[${qObj.letter}] ${qObj.q}`;
  lastA.textContent = qObj.a;
}

// Buttons
btnCreate.addEventListener("click", () => {
  socket.emit("createRoom", { name: hostName.value.trim() || "Host" });
});

btnJoinGuest.addEventListener("click", () => {
  const code = joinCode1.value.trim().toUpperCase();
  if (!code) return alert("حط كود الجلسة");
  const name = guestName.value.trim() || "Guest";
  socket.emit("joinRoom", { code, role: "guest", name });
});

btnJoinScreen.addEventListener("click", () => {
  const code = joinCode2.value.trim().toUpperCase();
  if (!code) return alert("حط كود الجلسة");
  socket.emit("joinRoom", { code, role: "screen", name: "Screen" });
});

btnLeave.addEventListener("click", () => {
  // أبسط شيء: ريفرش يرجع للصفحة الرئيسية
  location.reload();
});

// Guest buzz
btnBuzzRed.addEventListener("click", () => socket.emit("buzz", { code: ROOM, team: "red" }));
btnBuzzGreen.addEventListener("click", () => socket.emit("buzz", { code: ROOM, team: "green" }));

// Host tools
btnClearBuzz.addEventListener("click", () => socket.emit("clearBuzz", { code: ROOM }));
btnReset.addEventListener("click", () => {
  if (confirm("متأكد Reset؟")) socket.emit("resetGame", { code: ROOM });
});

// Modal controls
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

btnShowA.addEventListener("click", () => {
  if (modalA.classList.contains("hidden")) {
    modalA.classList.remove("hidden");
    btnShowA.textContent = "إخفاء الجواب";
  } else {
    modalA.classList.add("hidden");
    btnShowA.textContent = "إظهار الجواب";
  }
});

function setColor(color) {
  if (ROLE !== "host" || !CURRENT) return;
  socket.emit("setColor", { code: ROOM, letter: CURRENT.letter, color });
  closeModal();
}

btnColorRed.addEventListener("click", () => setColor("red"));
btnColorGreen.addEventListener("click", () => setColor("green"));
btnColorNone.addEventListener("click", () => setColor("none"));

btnAnotherQ.addEventListener("click", () => {
  if (ROLE !== "host" || !CURRENT) return;
  const letter = CURRENT.letter;
  const { q, a } = window.pickQuestion(letter, USED);
  CURRENT = { letter, q, a };
  socket.emit("hostAsk", { code: ROOM, letter, q, a });

  modalQ.textContent = q;
  modalA.textContent = a;
  modalA.classList.add("hidden");
  btnShowA.textContent = "إظهار الجواب";
});

// Socket events
socket.on("roomCreated", ({ code, state }) => {
  ROOM = code;
  ROLE = "host";
  STATE = state;

  roomPill.textContent = `ROOM: ${ROOM}`;
  setRoleUI();
  showGame();
  renderBoard();
  setLastQA(null);
  setBuzzUI(null);
});

socket.on("joined", ({ code, state, role }) => {
  ROOM = code;
  ROLE = role;
  STATE = state;

  roomPill.textContent = `ROOM: ${ROOM}`;
  setRoleUI();
  showGame();
  renderBoard();
  setLastQA(state.current);
  setBuzzUI(state.buzz);
});

socket.on("joinError", ({ message }) => {
  alert(message || "تعذر الدخول");
});

socket.on("stateFull", (state) => {
  STATE = state;
  renderBoard();
  setLastQA(state.current);
  setBuzzUI(state.buzz);
});

socket.on("statePatch", (patch) => {
  applyStatePatch(patch);
});

socket.on("question", (qObj) => {
  STATE.current = qObj;
  CURRENT = qObj;

  setLastQA(qObj);

  // Screen/Guest يشوفون السؤال بمودال (بس بدون أزرار تثبيت اللون)
  modalLetter.textContent = `حرف: ${qObj.letter}`;
  modalQ.textContent = qObj.q;
  modalA.textContent = qObj.a;

  if (ROLE !== "host") {
    modalHostOnly.classList.add("hidden");
  } else {
    modalHostOnly.classList.remove("hidden");
  }

  openModal();
});

socket.on("buzzUpdate", (buzz) => {
  STATE.buzz = buzz;
  setBuzzUI(buzz);
});

// Start
showLanding();
