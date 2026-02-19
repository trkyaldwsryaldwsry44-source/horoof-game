// لاحقًا بنستخدم io() فعليًا للـ Host/Guest/Screen
// const socket = io();

const boardEl = document.getElementById("hexBoard");
const resetBtn = document.getElementById("resetBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

// توزيع قريب من شكل الصورة (5 صفوف: 5/5/5/5/5 مع offset متناوب)
const ROWS = 5;
const COLS = 5;

// حروف عربية (بدون تكرار قدر الإمكان). تقدر تغيرها على مزاجك.
const LETTERS_POOL = [
  "ا","ب","ت","ث","ج","ح","خ","د","ذ","ر",
  "ز","س","ش","ص","ض","ط","ظ","ع","غ","ف",
  "ق","ك","ل","م","ن","ه","و","ي"
];

function pickRandomLetters(count){
  const arr = [...LETTERS_POOL];
  // shuffle
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  // إذا العدد أكثر من الباقي، نكمّل بتكرار
  const out = [];
  for(let i=0;i<count;i++){
    out.push(arr[i % arr.length]);
  }
  return out;
}

function createBoard(){
  boardEl.innerHTML = "";

  const letters = pickRandomLetters(ROWS * COLS);
  let idx = 0;

  for(let r=0; r<ROWS; r++){
    const row = document.createElement("div");
    row.className = "hexRow" + (r % 2 === 1 ? " offset" : "");

    for(let c=0; c<COLS; c++){
      const btn = document.createElement("button");
      btn.className = "hex";
      btn.type = "button";
      btn.dataset.state = "neutral";
      btn.dataset.letter = letters[idx];
      btn.textContent = letters[idx];
      idx++;

      btn.addEventListener("click", () => {
        // محايد -> أحمر -> أخضر -> محايد
        const s = btn.dataset.state;
        if (s === "neutral"){
          btn.dataset.state = "red";
          btn.classList.add("red");
          btn.classList.remove("green");
        } else if (s === "red"){
          btn.dataset.state = "green";
          btn.classList.add("green");
          btn.classList.remove("red");
        } else {
          btn.dataset.state = "neutral";
          btn.classList.remove("red","green");
        }

        // لاحقًا: نرسل للسيرفر تغيير اللون والـ letter
        // socket.emit("colorLetter", { roomCode, letter: btn.dataset.letter, color: btn.dataset.state });
      });

      row.appendChild(btn);
    }

    boardEl.appendChild(row);
  }
}

resetBtn.addEventListener("click", () => {
  document.querySelectorAll(".hex").forEach(h => {
    h.dataset.state = "neutral";
    h.classList.remove("red","green");
  });
});

shuffleBtn.addEventListener("click", () => createBoard());

createBoard();
