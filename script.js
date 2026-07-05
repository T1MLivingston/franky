const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

// Word lists are ordered shortest-to-longest so easier difficulties get the shorter words.
const WORD_BANKS = {
  wetlands: {
    title: "Wetland Inhabitant",
    titleSpan: "Word Search",
    subtitle: "Search for the types of animals found in wetlands, with Franky the Frog!",
    words: [
      { key: "clam", label: "Clam" },
      { key: "crab", label: "Crab" },
      { key: "bear", label: "Bear" },
      { key: "frog", label: "Frog" },
      { key: "mink", label: "Mink" },
      { key: "heron", label: "Heron" },
      { key: "egret", label: "Egret" },
      { key: "beaver", label: "Beaver" },
      { key: "turtle", label: "Turtle" },
      { key: "shrimp", label: "Shrimp" },
      { key: "raccoon", label: "Raccoon" },
      { key: "sunfish", label: "Sunfish" },
      { key: "flounder", label: "Flounder" },
      { key: "woodduck", label: "Wood Duck" },
      { key: "crayfish", label: "Crayfish" },
      { key: "mosquito", label: "Mosquito" },
      { key: "dragonfly", label: "Dragonfly" },
      { key: "salamander", label: "Salamander" },
    ],
  },
  pond: {
    title: "Pond & Marsh",
    titleSpan: "Plant Search",
    subtitle: "Explore the plants growing all around Franky's pond!",
    words: [
      { key: "reed", label: "Reed" },
      { key: "moss", label: "Moss" },
      { key: "rush", label: "Rush" },
      { key: "fern", label: "Fern" },
      { key: "iris", label: "Iris" },
      { key: "sedge", label: "Sedge" },
      { key: "algae", label: "Algae" },
      { key: "cattail", label: "Cattail" },
      { key: "bulrush", label: "Bulrush" },
      { key: "duckweed", label: "Duckweed" },
      { key: "pondweed", label: "Pondweed" },
      { key: "waterlily", label: "Water Lily" },
      { key: "arrowhead", label: "Arrowhead" },
      { key: "watercress", label: "Watercress" },
    ],
  },
  bugs: {
    title: "Backyard Bug",
    titleSpan: "Word Search",
    subtitle: "Hunt for the little critters buzzing around the wetland!",
    words: [
      { key: "ant", label: "Ant" },
      { key: "moth", label: "Moth" },
      { key: "wasp", label: "Wasp" },
      { key: "gnat", label: "Gnat" },
      { key: "aphid", label: "Aphid" },
      { key: "beetle", label: "Beetle" },
      { key: "cicada", label: "Cicada" },
      { key: "hornet", label: "Hornet" },
      { key: "spider", label: "Spider" },
      { key: "weevil", label: "Weevil" },
      { key: "mantis", label: "Mantis" },
      { key: "cricket", label: "Cricket" },
      { key: "firefly", label: "Firefly" },
      { key: "termite", label: "Termite" },
      { key: "ladybug", label: "Ladybug" },
      { key: "caterpillar", label: "Caterpillar" },
    ],
  },
};

const DIFFICULTIES = {
  easy: { size: 10, count: 8, cellFont: "clamp(0.75rem, 2.3vw, 1.35rem)" },
  medium: { size: 13, count: 12, cellFont: "clamp(0.6rem, 1.8vw, 1.05rem)" },
  hard: { size: 16, count: null, cellFont: "clamp(0.5rem, 1.3vw, 0.82rem)" },
};

const FOUND_COLORS = ["#4ED341", "#41A2EE", "#FF8E23", "#FFAA3B", "#EA401E"];

const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("word-list");
const progressFillEl = document.getElementById("progress-fill");
const progressLabelEl = document.getElementById("progress-label");
const winBannerEl = document.getElementById("win-banner");
const winMessageEl = document.getElementById("win-message");
const titleMainEl = document.getElementById("title-main");
const titleSubEl = document.getElementById("title-sub");
const subtitleEl = document.getElementById("subtitle-text");
const bankSelectEl = document.getElementById("bank-select");
const difficultyButtonsEl = document.getElementById("difficulty-buttons");
const timerDisplayEl = document.getElementById("timer-display");
const mascotFeedbackEl = document.getElementById("mascot-feedback");

for (const [id, bank] of Object.entries(WORD_BANKS)) {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = `${bank.title} ${bank.titleSpan}`;
  bankSelectEl.appendChild(opt);
}

let state = {
  bankId: "wetlands",
  difficulty: "medium",
  size: 0,
  words: [],
  grid: [],
  placements: {},
  found: new Set(),
};

let cellEls = [];
let dragging = false;
let startCell = null;
let currentPath = [];

let timerInterval = null;
let timerStart = 0;
let timerRunning = false;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerStart = Date.now();
  timerInterval = setInterval(() => {
    timerDisplayEl.textContent = formatTime((Date.now() - timerStart) / 1000);
  }, 250);
}

function stopTimer() {
  timerRunning = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  timerDisplayEl.textContent = "00:00";
}

function tryPlaceAll(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = {};
  const order = [...words].sort((a, b) => b.norm.length - a.norm.length);
  for (const w of order) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const len = w.norm.length;
      const r0 = Math.floor(Math.random() * size);
      const c0 = Math.floor(Math.random() * size);
      const endR = r0 + dir[0] * (len - 1);
      const endC = c0 + dir[1] * (len - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      let ok = true;
      for (let k = 0; k < len; k++) {
        const rr = r0 + dir[0] * k, cc = c0 + dir[1] * k;
        if (grid[rr][cc] !== null && grid[rr][cc] !== w.norm[k]) { ok = false; break; }
      }
      if (!ok) continue;
      const path = [];
      for (let k = 0; k < len; k++) {
        const rr = r0 + dir[0] * k, cc = c0 + dir[1] * k;
        grid[rr][cc] = w.norm[k];
        path.push([rr, cc]);
      }
      placements[w.key] = path;
      placed = true;
    }
    if (!placed) return null;
  }
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = ALPHA[Math.floor(Math.random() * 26)];
    }
  }
  return { grid, placements };
}

function generatePuzzle(words, initialSize) {
  let size = initialSize;
  for (let grow = 0; grow < 6; grow++) {
    for (let tries = 0; tries < 40; tries++) {
      const result = tryPlaceAll(words, size);
      if (result) return { ...result, size };
    }
    size += 2;
  }
  throw new Error("Could not generate a valid puzzle layout");
}

function renderGrid() {
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;
  gridEl.style.aspectRatio = "1 / 1";
  gridEl.style.setProperty("--cell-font", DIFFICULTIES[state.difficulty].cellFont);

  cellEls = [];
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.textContent = state.grid[r][c];
      div.dataset.r = String(r);
      div.dataset.c = String(c);
      gridEl.appendChild(div);
      cellEls.push(div);
    }
  }
}

function cellAt(r, c) {
  return cellEls[r * state.size + c];
}

function renderWordList() {
  wordListEl.innerHTML = "";
  for (const word of state.words) {
    const li = document.createElement("li");
    li.textContent = word.label;
    li.id = `word-${word.key}`;
    wordListEl.appendChild(li);
  }
}

function updateProgress() {
  const pct = Math.round((state.found.size / state.words.length) * 100);
  progressFillEl.style.width = `${pct}%`;
  progressLabelEl.textContent = `${state.found.size} / ${state.words.length} found`;
}

function clearSelecting() {
  for (const el of currentPath) el.classList.remove("selecting");
  currentPath = [];
}

function pointFromEvent(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.classList.contains("cell")) return null;
  return { r: Number(el.dataset.r), c: Number(el.dataset.c) };
}

function computePath(start, end) {
  const dr = end.r - start.r;
  const dc = end.c - start.c;
  if (dr === 0 && dc === 0) return [start];
  const angle = Math.atan2(dr, dc);
  let best = DIRS[0];
  let bestDiff = Infinity;
  for (const [ddr, ddc] of DIRS) {
    const a = Math.atan2(ddr, ddc);
    let diff = Math.abs(a - angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [ddr, ddc];
    }
  }
  const steps = Math.round(Math.max(Math.abs(dr), Math.abs(dc)));
  const path = [];
  for (let k = 0; k <= steps; k++) {
    const rr = start.r + best[0] * k;
    const cc = start.c + best[1] * k;
    if (rr < 0 || rr >= state.size || cc < 0 || cc >= state.size) break;
    path.push({ r: rr, c: cc });
  }
  return path;
}

function pathsMatch(a, b) {
  if (a.length !== b.length) return false;
  const forward = a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);
  if (forward) return true;
  const rev = [...b].reverse();
  return a.every((p, i) => p[0] === rev[i][0] && p[1] === rev[i][1]);
}

function markFound(word) {
  state.found.add(word.key);
  const color = FOUND_COLORS[state.found.size % FOUND_COLORS.length];
  for (const [r, c] of state.placements[word.key]) {
    const el = cellAt(r, c);
    el.classList.add("found");
    el.style.background = color;
  }
  document.getElementById(`word-${word.key}`).classList.add("found");
  updateProgress();
  if (state.found.size === state.words.length) {
    stopTimer();
    winMessageEl.textContent = `You found every word in ${timerDisplayEl.textContent}.`;
    winBannerEl.classList.remove("hidden");
  }
}

let missTimeout = null;

function showMiss() {
  mascotFeedbackEl.src = "franky_head_sad.png";
  mascotFeedbackEl.classList.remove("miss");
  void mascotFeedbackEl.offsetWidth;
  mascotFeedbackEl.classList.add("miss");
  clearTimeout(missTimeout);
  missTimeout = setTimeout(() => {
    mascotFeedbackEl.src = "frany_head_smile.png";
  }, 900);
}

function finalizeSelection() {
  const coords = currentPath.map((el) => [Number(el.dataset.r), Number(el.dataset.c)]);
  clearSelecting();
  if (coords.length < 2) return;
  for (const word of state.words) {
    if (state.found.has(word.key)) continue;
    const sol = state.placements[word.key];
    if (sol && pathsMatch(coords, sol)) {
      markFound(word);
      return;
    }
  }
  showMiss();
}

gridEl.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".cell");
  if (!target) return;
  startTimer();
  dragging = true;
  startCell = { r: Number(target.dataset.r), c: Number(target.dataset.c) };
  currentPath = [target];
  target.classList.add("selecting");
  gridEl.setPointerCapture(e.pointerId);
  e.preventDefault();
});

gridEl.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = pointFromEvent(e);
  if (!p) return;
  const path = computePath(startCell, p);
  for (const el of currentPath) el.classList.remove("selecting");
  currentPath = path.map(({ r, c }) => cellAt(r, c));
  for (const el of currentPath) el.classList.add("selecting");
});

function endDrag() {
  if (!dragging) return;
  dragging = false;
  finalizeSelection();
}

gridEl.addEventListener("pointerup", endDrag);
gridEl.addEventListener("pointercancel", () => {
  dragging = false;
  clearSelecting();
});

function loadPuzzle(bankId, difficulty) {
  state.bankId = bankId;
  state.difficulty = difficulty;

  const bank = WORD_BANKS[bankId];
  const cfg = DIFFICULTIES[difficulty];
  const count = cfg.count === null ? bank.words.length : cfg.count;
  const words = bank.words.slice(0, count);
  const normed = words.map((w) => ({ key: w.key, norm: w.key.toUpperCase() }));

  const { grid, placements, size } = generatePuzzle(normed, cfg.size);

  state.words = words;
  state.grid = grid;
  state.placements = placements;
  state.size = size;
  state.found = new Set();

  titleMainEl.childNodes[0].textContent = bank.title;
  titleSubEl.textContent = bank.titleSpan;
  subtitleEl.textContent = bank.subtitle;

  bankSelectEl.value = bankId;
  for (const btn of difficultyButtonsEl.children) {
    btn.classList.toggle("active", btn.dataset.difficulty === difficulty);
  }

  renderGrid();
  renderWordList();
  updateProgress();
  resetTimer();
  winBannerEl.classList.add("hidden");
  clearTimeout(missTimeout);
  mascotFeedbackEl.classList.remove("miss");
  mascotFeedbackEl.src = "frany_head_smile.png";
}

document.getElementById("reset-btn").addEventListener("click", () => {
  loadPuzzle(state.bankId, state.difficulty);
});
document.getElementById("play-again-btn").addEventListener("click", () => {
  loadPuzzle(state.bankId, state.difficulty);
});
bankSelectEl.addEventListener("change", () => {
  loadPuzzle(bankSelectEl.value, state.difficulty);
});
difficultyButtonsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-difficulty]");
  if (!btn) return;
  loadPuzzle(state.bankId, btn.dataset.difficulty);
});

loadPuzzle(state.bankId, state.difficulty);
