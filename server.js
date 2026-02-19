const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

function makeCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

io.on("connection", (socket) => {

  socket.on("createRoom", () => {
    const code = makeCode();
    rooms[code] = {
      host: socket.id,
      players: [],
      redScore: 0,
      greenScore: 0,
      currentTurn: null,
      playing: false
    };

    socket.join(code);
    socket.emit("roomCreated", code);
  });

  socket.on("joinRoom", ({ code, name, team }) => {
    if (!rooms[code]) return;

    rooms[code].players.push({
      id: socket.id,
      name,
      team
    });

    socket.join(code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  socket.on("startRound", (code) => {
    if (!rooms[code]) return;
    rooms[code].playing = true;
    rooms[code].currentTurn = null;
    io.to(code).emit("roundStarted");
  });

  socket.on("buzz", ({ code, team }) => {
    if (!rooms[code]) return;
    if (!rooms[code].playing) return;
    if (rooms[code].currentTurn) return;

    rooms[code].currentTurn = team;
    io.to(code).emit("buzzUpdate", team);
  });

  socket.on("roundWinner", ({ code, team }) => {
    if (!rooms[code]) return;

    if (team === "red") rooms[code].redScore++;
    if (team === "green") rooms[code].greenScore++;

    rooms[code].playing = false;

    io.to(code).emit("scoreUpdate", {
      red: rooms[code].redScore,
      green: rooms[code].greenScore
    });

    if (rooms[code].redScore === 2 || rooms[code].greenScore === 2) {
      io.to(code).emit("gameFinished", team);
      rooms[code].redScore = 0;
      rooms[code].greenScore = 0;
    }
  });

  socket.on("nextRound", (code) => {
    if (!rooms[code]) return;
    rooms[code].currentTurn = null;
    io.to(code).emit("resetRound");
  });

});
server.listen(PORT, () => console.log("Server running"));
