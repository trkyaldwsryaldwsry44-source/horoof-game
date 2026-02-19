const socket = io();

let ROOM = null;
let IS_HOST = false;
let MY_TEAM = null;

function createRoom() {
  IS_HOST = true;
  socket.emit("createRoom");
}

function joinRoom() {
  const code = document.getElementById("roomCode").value.toUpperCase();
  const name = document.getElementById("playerName").value;
  const team = document.querySelector('input[name="team"]:checked').value;

  MY_TEAM = team;
  socket.emit("joinRoom", { code, name, team });
  ROOM = code;
}

socket.on("roomCreated", (code) => {
  ROOM = code;
  document.getElementById("roomDisplay").innerText = code;
});

socket.on("playersUpdate", (players) => {
  const list = document.getElementById("players");
  list.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `${p.name} (${p.team})`;
    list.appendChild(li);
  });
});

function startRound() {
  socket.emit("startRound", ROOM);
}

function buzz() {
  socket.emit("buzz", { code: ROOM, team: MY_TEAM });
}

socket.on("buzzUpdate", (team) => {
  document.body.classList.remove("redWin", "greenWin");
  document.body.classList.add(team === "red" ? "redWin" : "greenWin");
});

socket.on("scoreUpdate", (score) => {
  document.getElementById("redScore").innerText = score.red;
  document.getElementById("greenScore").innerText = score.green;
});

socket.on("gameFinished", (team) => {
  alert(`الفريق الفائز: ${team}`);
});

function declareWinner(team) {
  socket.emit("roundWinner", { code: ROOM, team });
}

function nextRound() {
  socket.emit("nextRound", ROOM);
}

socket.on("resetRound", () => {
  document.body.classList.remove("redWin", "greenWin");
});
