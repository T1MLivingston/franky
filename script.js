const ROWS = [
  "AOOTXBZTDAQLXATLM",
  "THCUWOODDUCKXTSXC",
  "BELRACCSTCRABTFOR",
  "CRTTSMINKFGCGFBSA",
  "SONLTSSMOSQUITOUY",
  "BNTEOQRSTAOCUXNNF",
  "ELRTSOPXPPABEARFI",
  "ACCXTSHRIMPLLNAIS",
  "VDRAGONFLYNTSSCSH",
  "ETVVUQQRLUIVILCHO",
  "REGRETXOTVNZATOXO",
  "VXSGNAZGXTVMVSOAO",
  "XSALAMANDERNQXNNL",
  "NLTFLOUNDERLITTOL",
];

const WORDS = [
  { key: "beaver", label: "Beaver" },
  { key: "flounder", label: "Flounder" },
  { key: "woodduck", label: "Wood Duck" },
  { key: "clam", label: "Clam" },
  { key: "crab", label: "Crab" },
  { key: "crayfish", label: "Crayfish" },
  { key: "mosquito", label: "Mosquito" },
  { key: "raccoon", label: "Raccoon" },
  { key: "heron", label: "Heron" },
  { key: "bear", label: "Bear" },
  { key: "frog", label: "Frog" },
  { key: "egret", label: "Egret" },
  { key: "dragonfly", label: "Dragonfly" },
  { key: "sunfish", label: "Sunfish" },
  { key: "mink", label: "Mink" },
  { key: "turtle", label: "Turtle" },
  { key: "shrimp", label: "Shrimp" },
  { key: "salamander", label: "Salamander" },
];

const FOUND_COLORS = ["#4ED341", "#41A2EE", "#FF8E23", "#FFAA3B", "#EA401E"];
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const grid = ROWS.map((row) => row.split(""));
const R = grid.length;
const C = grid[0].length;

function solve(word) {
  const w = word.toUpperCase();
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c] !== w[0]) continue;
      for (const [dr, dc] of DIRS) {
        let ok = true;
        for (let k = 0; k < w.length; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= R || cc < 0 || cc >= C || grid[rr][cc] !== w[k]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const path = [];
          for (let k = 0; k < w.length; k++) path.push([r + dr * k, c + dc * k]);
          return path;
        }
      }
    }
  }
  return null;
}

const solutions = {};
for (const { key } of WORDS) solutions[key] = solve(key);

const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("word-list");
const progressFillEl = document.getElementById("progress-fill");
const progressLabelEl = document.getElementById("progress-label");
const winBannerEl = document.getElementById("win-banner");

gridEl.style.gridTemplateColumns = `repeat(${C}, 1fr)`;
gridEl.style.gridTemplateRows = `repeat(${R}, 1fr)`;

const cellEls = [];
for (let r = 0; r < R; r++) {
  for (let c = 0; c < C; c++) {
    const div = document.createElement("div");
    div.className = "cell";
    div.textContent = grid[r][c];
    div.dataset.r = String(r);
    div.dataset.c = String(c);
    gridEl.appendChild(div);
    cellEls.push(div);
  }
}
const cellAt = (r, c) => cellEls[r * C + c];

for (const word of WORDS) {
  const li = document.createElement("li");
  li.textContent = word.label;
  li.id = `word-${word.key}`;
  wordListEl.appendChild(li);
}

const found = new Set();
let dragging = false;
let startCell = null;
let currentPath = [];

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
    if (rr < 0 || rr >= R || cc < 0 || cc >= C) break;
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

function updateProgress() {
  const pct = Math.round((found.size / WORDS.length) * 100);
  progressFillEl.style.width = `${pct}%`;
  progressLabelEl.textContent = `${found.size} / ${WORDS.length} found`;
}

function markFound(word, path) {
  found.add(word.key);
  const color = FOUND_COLORS[found.size % FOUND_COLORS.length];
  for (const [r, c] of path) {
    const el = cellAt(r, c);
    el.classList.add("found");
    el.style.background = color;
  }
  document.getElementById(`word-${word.key}`).classList.add("found");
  updateProgress();
  if (found.size === WORDS.length) winBannerEl.classList.remove("hidden");
}

function finalizeSelection() {
  const coords = currentPath.map((el) => [Number(el.dataset.r), Number(el.dataset.c)]);
  clearSelecting();
  if (coords.length < 2) return;
  for (const word of WORDS) {
    if (found.has(word.key)) continue;
    const sol = solutions[word.key];
    if (sol && pathsMatch(coords, sol)) {
      markFound(word, sol);
      return;
    }
  }
}

gridEl.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".cell");
  if (!target) return;
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

function resetPuzzle() {
  found.clear();
  for (const el of cellEls) {
    el.classList.remove("found", "selecting");
    el.style.background = "";
  }
  for (const word of WORDS) {
    document.getElementById(`word-${word.key}`).classList.remove("found");
  }
  updateProgress();
  winBannerEl.classList.add("hidden");
}

document.getElementById("reset-btn").addEventListener("click", resetPuzzle);
document.getElementById("play-again-btn").addEventListener("click", resetPuzzle);

updateProgress();
