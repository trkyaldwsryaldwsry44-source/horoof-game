const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve /public
app.use(express.static(path.join(__dirname, "public")));

// In-memory rooms (simple)
const rooms = {}; // roomCode -> { boardLetters: [], colors: {letter: "red|green|none"}, current: {letter, q, a}, buzz: {team,name,time} }

function makeCode(len = 5) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// 25 letters (same idea as الصورة)
const DEFAULT_BOARD = [
  "و","ي","ط","ك","ج",
  "ث","أ","ق","ع","د",
  "ه","ش","خ","ل","ن",
  "ف","ص","ت","ر","م",
  "ض","ب","ز","غ","س"
];

function newRoomState() {
  const colors = {};
  for (const ch of DEFAULT_BOARD) colors[ch] = "none";
  return {
    boardLetters: [...DEFAULT_BOARD],
    colors,
    current: null,
    buzz: null
  };
}

function roomExists(code) {
  return !!rooms[code];
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }) => {
    let code = makeCode();
    while (roomExists(code)) code = makeCode();

    rooms[code] = newRoomState();

    socket.data.role = "host";
    socket.data.name = name || "Host";
    socket.data.room = code;

    socket.join(code);

    socket.emit("roomCreated", { code, state: rooms[code] });
    io.to(code).emit("systemMsg", { text: `تم إنشاء الجلسة: ${code}` });
  });

  socket.on("joinRoom", ({ code, role, name }) => {
    code = (code || "").toUpperCase().trim();
    if (!roomExists(code)) {
      socket.emit("joinError", { message: "الكود غير صحيح أو الجلسة غير موجودة." });
      return;
    }

    socket.data.role = role || "guest";
    socket.data.name = name || "Guest";
    socket.data.room = code;

    socket.join(code);
    socket.emit("joined", { code, state: rooms[code], role: socket.data.role });
    io.to(code).emit("systemMsg", { text: `${socket.data.name} دخل (${socket.data.role})` });
  });

  // HOST: pick a letter + question (client sends q/a)
  socket.on("hostAsk", ({ code, letter, q, a }) => {
    if (socket.data.role !== "host") return;
    code = (code || socket.data.room || "").toUpperCase().trim();
    if (!roomExists(code)) return;

    rooms[code].current = { letter, q, a };
    rooms[code].buzz = null; // reset buzzer each question

    io.to(code).emit("question", rooms[code].current);
    io.to(code).emit("buzzUpdate", rooms[code].buzz);
  });

  // GUEST: buzzer
  socket.on("buzz", ({ code, team }) => {
    code = (code || socket.data.room || "").toUpperCase().trim();
    if (!roomExists(code)) return;

    if (rooms[code].buzz) return; // already someone buzzed
    const name = socket.data.name || "Guest";
    rooms[code].buzz = { team, name, time: Date.now() };

    io.to(code).emit("buzzUpdate", rooms[code].buzz);
  });

  // HOST: clear buzzer
  socket.on("clearBuzz", ({ code }) => {
    if (socket.data.role !== "host") return;
    code = (code || socket.data.room || "").toUpperCase().trim();
    if (!roomExists(code)) return;

    rooms[code].buzz = null;
    io.to(code).emit("buzzUpdate", rooms[code].buzz);
  });

  // HOST: set color
  socket.on("setColor", ({ code, letter, color }) => {
    if (socket.data.role !== "host") return;
    code = (code || socket.data.room || "").toUpperCase().trim();
    if (!roomExists(code)) return;

    if (!rooms[code].colors.hasOwnProperty(letter)) return;
    rooms[code].colors[letter] = color;

    io.to(code).emit("statePatch", { colors: rooms[code].colors });
  });

  // HOST: reset game
  socket.on("resetGame", ({ code }) => {
    if (socket.data.role !== "host") return;
    code = (code || socket.data.room || "").toUpperCase().trim();
    if (!roomExists(code)) return;

    rooms[code] = newRoomState();
    io.to(code).emit("stateFull", rooms[code]);
    io.to(code).emit("systemMsg", { text: "تمت إعادة ضبط اللعبة." });
  });

  socket.on("disconnect", () => {
    // (اختياري) ما نحذف الغرفة عشان لا تنهار لو انقطع النت
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
