"use strict";

/* ------------------------------------------------------------------ *
 * Palettes (8-color pixel-art schemes, dark -> light)
 * ------------------------------------------------------------------ */

const PALETTES = {
  "NYX8": ["#08141e", "#0f2a3f", "#20394f", "#4e495f", "#816271", "#997577", "#c3a38a", "#f6d6bd"],
  "AMMO-8": ["#040c06", "#112318", "#1e3a29", "#305d42", "#4d8061", "#6f9c5b", "#a3c26b", "#dbe89b"],
  "WINTER WONDERLAND": ["#0b1e3b", "#1c3f6e", "#3768a5", "#5fa4d4", "#8dc6e8", "#a4d4f0", "#cde9f7", "#ffffff"],
  "BORKFEST": ["#1a1015", "#3b1f26", "#6b2b3a", "#a83b3b", "#d9622f", "#e8975a", "#f0c47a", "#e6dba0"],
  "SUBMERGED CHIMERA": ["#0c0a2b", "#241a4d", "#4a2a72", "#7a3a8f", "#b34a9c", "#e06ba0", "#f5a3c7", "#bdeee0"],
  "DREAMSCAPES": ["#241b2f", "#4d3b53", "#8a6a7a", "#c99a8e", "#e8c39e", "#a8d0c8", "#dff0e4", "#fdf6ec"],
  "COFFEE": ["#160f0a", "#2e1f17", "#4a3222", "#6f4d33", "#9c7048", "#c39a6b", "#e0c19c", "#f5e6cf"],
  "FUNKYFUTURES": ["#1a0b2e", "#3b1666", "#7b1fa2", "#d0299b", "#ff5e5e", "#ff9d3b", "#ffe14d", "#5ee6ff"],
  "POLLEN8": ["#2b1a3d", "#5c2a6e", "#9b3e8f", "#e0609e", "#f68fae", "#ffb997", "#ffe08a", "#fff6d9"],
  "RUST GOLD 8": ["#1c120b", "#3a2213", "#63341a", "#8f4c1e", "#bf7524", "#dba13a", "#e9c667", "#f6e6a8"],
};

let currentSchemeName = "NYX8";
let currentPalette = PALETTES[currentSchemeName].slice();
let editingSwatchIndex = -1;
let seed = Math.random() * 1000;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function randFloat(a, b) { return a + Math.random() * (b - a); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function hash(x, y, s) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h00 = hash(xi, yi, s), h10 = hash(xi + 1, yi, s);
  const h01 = hash(xi, yi + 1, s), h11 = hash(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h00, h10, u), lerp(h01, h11, u), v);
}

function fbm(x, y, s, octaves) {
  let total = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * freq, y * freq, s + i * 17.3) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function bayerThreshold(x, y) {
  return (BAYER4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
}

function passesCoverage(x, y, coverage, dithered) {
  if (coverage >= 1) return true;
  if (coverage <= 0) return false;
  const t = dithered ? bayerThreshold(x, y) : Math.random();
  return coverage > t;
}

/* ------------------------------------------------------------------ *
 * Pixel buffer
 * ------------------------------------------------------------------ */

class PixelBuffer {
  constructor(width, height, transparent) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    if (!transparent) {
      const [r, g, b] = hexToRgb(currentPalette[0]);
      for (let i = 0; i < width * height; i++) {
        this.data[i * 4] = r;
        this.data[i * 4 + 1] = g;
        this.data[i * 4 + 2] = b;
        this.data[i * 4 + 3] = 255;
      }
    }
  }

  setPixel(x, y, hex, alpha255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const [r, g, b] = hexToRgb(hex);
    const i = (y * this.width + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = Math.max(this.data[i + 3], alpha255);
  }

  darkenAll(factor) {
    const { width, height, data } = this;
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] === 0) continue;
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
        const f = 1 - factor * clamp(d, 0, 1) ** 1.5;
        data[i] *= f;
        data[i + 1] *= f;
        data[i + 2] *= f;
      }
    }
  }

  toImageData() {
    return new ImageData(this.data, this.width, this.height);
  }
}

/* ------------------------------------------------------------------ *
 * Wrapped stamping (for seamless tiling of multi-pixel shapes)
 * ------------------------------------------------------------------ */

function stampWrapped(buf, cx, cy, r, tile, drawLocal) {
  const { width, height } = buf;
  const offsets = [[0, 0]];
  if (tile) {
    const xs = [0];
    if (cx - r < 0) xs.push(width);
    if (cx + r >= width) xs.push(-width);
    const ys = [0];
    if (cy - r < 0) ys.push(height);
    if (cy + r >= height) ys.push(-height);
    offsets.length = 0;
    for (const ox of xs) for (const oy of ys) offsets.push([ox, oy]);
  }
  const rr = Math.ceil(r);
  for (let ly = -rr; ly <= rr; ly++) {
    for (let lx = -rr; lx <= rr; lx++) {
      const result = drawLocal(lx, ly);
      if (!result) continue;
      const [hex, alpha255] = result;
      for (const [ox, oy] of offsets) {
        buf.setPixel(cx + ox + lx, cy + oy + ly, hex, alpha255);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Layer generators
 * ------------------------------------------------------------------ */

function generateDust(buf, opts) {
  const { width, height, tile, dither } = opts;
  const dustColors = [currentPalette[1], currentPalette[2]];
  const density = 0.05;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = hash(x, y, seed + 500);
      if (n > 1 - density) {
        const local = (n - (1 - density)) / density;
        const coverage = 0.35 + local * 0.4;
        if (passesCoverage(x, y, coverage, dither)) {
          buf.setPixel(x, y, choice(dustColors), 255);
        }
      }
    }
  }
}

function generateNebulae(buf, opts) {
  const { width, height, tile, dither } = opts;
  const area = width * height;
  const count = clamp(Math.round(area / 9000) + randInt(2, 4), 2, 7);
  const nebulaColors = [currentPalette[2], currentPalette[3], currentPalette[4], currentPalette[5]];

  for (let n = 0; n < count; n++) {
    const cx = randInt(0, width - 1);
    const cy = randInt(0, height - 1);
    const R = randFloat(Math.min(width, height) * 0.12, Math.min(width, height) * 0.32);
    const colorA = choice(nebulaColors);
    const colorB = choice(nebulaColors);
    const nseed = seed + n * 91.7;

    stampWrapped(buf, cx, cy, R * 1.2, tile, (lx, ly) => {
      const d = Math.sqrt(lx * lx + ly * ly) / R;
      if (d > 1.15) return null;
      const wobble = fbm(lx * 0.12 + 50, ly * 0.12 + 50, nseed, 3);
      const coverage = clamp((1 - d) * 1.1 - 0.15, 0, 1) * (0.55 + 0.6 * wobble);
      if (coverage <= 0.02) return null;
      if (!passesCoverage(cx + lx, cy + ly, coverage, dither)) return null;
      const colorPick = fbm(lx * 0.2 - 30, ly * 0.2 - 30, nseed + 8.1, 2) > 0.5 ? colorA : colorB;
      return [colorPick, 255];
    });
  }
}

function generateStars(buf, opts) {
  const { width, height, tile, dither } = opts;
  const area = width * height;
  const starColors = [currentPalette[5], currentPalette[6], currentPalette[7]];
  const weights = [0.55, 0.3, 0.15];

  const count = Math.round(area * 0.012);
  for (let i = 0; i < count; i++) {
    const x = randInt(0, width - 1);
    const y = randInt(0, height - 1);
    const r = Math.random();
    let color = starColors[0];
    if (r > weights[0] + weights[1]) color = starColors[2];
    else if (r > weights[0]) color = starColors[1];
    buf.setPixel(x, y, color, 255);
  }

  const sparkleCount = Math.max(1, Math.round(area / 6000));
  for (let i = 0; i < sparkleCount; i++) {
    const cx = randInt(0, width - 1);
    const cy = randInt(0, height - 1);
    const bright = currentPalette[7];
    const dim = currentPalette[6];
    stampWrapped(buf, cx, cy, 2, tile, (lx, ly) => {
      if (lx === 0 && ly === 0) return [bright, 255];
      if ((Math.abs(lx) === 1 && ly === 0) || (Math.abs(ly) === 1 && lx === 0)) return [dim, 255];
      return null;
    });
  }
}

function generatePlanets(buf, opts) {
  const { width, height, tile } = opts;
  const minDim = Math.min(width, height);
  if (minDim < 12) return;
  const count = randInt(1, 2);
  const bandColors = [currentPalette[1], currentPalette[2], currentPalette[3], currentPalette[4], currentPalette[5], currentPalette[6]];
  const lightDir = { x: -0.55, y: -0.6, z: 0.58 };

  for (let p = 0; p < count; p++) {
    const R = randFloat(minDim * 0.08, minDim * 0.22);
    const cx = randInt(0, width - 1);
    const cy = randInt(0, height - 1);
    const hasRing = Math.random() < 0.35;
    const ringColor = currentPalette[6];

    if (hasRing) {
      const ringR = R * 1.7;
      const ringThickness = Math.max(1, R * 0.12);
      stampWrapped(buf, cx, cy, ringR + ringThickness, tile, (lx, ly) => {
        const ex = lx;
        const ey = ly / 0.38;
        const d = Math.sqrt(ex * ex + ey * ey);
        if (Math.abs(d - ringR) > ringThickness) return null;
        if (Math.sqrt(lx * lx + ly * ly) < R * 0.9) return null;
        return [ringColor, 255];
      });
    }

    stampWrapped(buf, cx, cy, R, tile, (lx, ly) => {
      const nx = lx / R, ny = ly / R;
      const distSq = nx * nx + ny * ny;
      if (distSq > 1) return null;
      const nz = Math.sqrt(1 - distSq);
      const shade = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
      const t = clamp((shade + 1) / 2, 0, 1);
      const idx = clamp(Math.floor(t * bandColors.length), 0, bandColors.length - 1);
      return [bandColors[idx], 255];
    });
  }
}

/* ------------------------------------------------------------------ *
 * Main generate pipeline
 * ------------------------------------------------------------------ */

let generatedCanvas = null;

function generate() {
  const width = clamp(parseInt(document.getElementById("width-input").value, 10) || 200, 8, 512);
  const height = clamp(parseInt(document.getElementById("height-input").value, 10) || 200, 8, 512);

  const opts = {
    width, height,
    stars: document.getElementById("opt-stars").checked,
    dust: document.getElementById("opt-dust").checked,
    nebulae: document.getElementById("opt-nebulae").checked,
    planets: document.getElementById("opt-planets").checked,
    tile: document.getElementById("opt-tile").checked,
    darken: document.getElementById("opt-darken").checked,
    transp: document.getElementById("opt-transp").checked,
    dither: document.getElementById("opt-dither").checked,
  };

  const buf = new PixelBuffer(width, height, opts.transp);

  if (opts.nebulae) generateNebulae(buf, opts);
  if (opts.dust) generateDust(buf, opts);
  if (opts.stars) generateStars(buf, opts);
  if (opts.planets) generatePlanets(buf, opts);
  if (opts.darken) buf.darkenAll(0.55);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(buf.toImageData(), 0, 0);
  generatedCanvas = canvas;

  updatePreview();
}

/* ------------------------------------------------------------------ *
 * Preview (scrollable tiled surface)
 * ------------------------------------------------------------------ */

let zoom = 2;

function updatePreview() {
  if (!generatedCanvas) return;
  const surface = document.getElementById("preview-surface");
  const dataUrl = generatedCanvas.toDataURL("image/png");
  const tileW = generatedCanvas.width * zoom;
  const tileH = generatedCanvas.height * zoom;
  const tilesAcross = 10;

  surface.style.backgroundImage = `url(${dataUrl})`;
  surface.style.backgroundSize = `${tileW}px ${tileH}px`;
  surface.style.width = `${tileW * tilesAcross}px`;
  surface.style.height = `${tileH * tilesAcross}px`;

  const viewport = document.getElementById("preview-viewport");
  const wasCentered = viewport.dataset.centered !== "true";
  if (wasCentered) {
    viewport.scrollLeft = (tileW * tilesAcross) / 2 - viewport.clientWidth / 2;
    viewport.scrollTop = (tileH * tilesAcross) / 2 - viewport.clientHeight / 2;
    viewport.dataset.centered = "true";
  }
}

function setZoom(z) {
  zoom = clamp(z, 1, 6);
  document.getElementById("zoom-label").textContent = zoom + "x";
  updatePreview();
}

/* ------------------------------------------------------------------ *
 * UI: color scheme list
 * ------------------------------------------------------------------ */

function buildSchemeList() {
  const list = document.getElementById("scheme-list");
  list.innerHTML = "";
  for (const name of Object.keys(PALETTES)) {
    const row = document.createElement("div");
    row.className = "scheme-row" + (name === currentSchemeName ? " active" : "");
    row.dataset.name = name;
    row.setAttribute("role", "option");

    const label = document.createElement("span");
    label.className = "scheme-name";
    label.textContent = name;
    row.appendChild(label);

    const swatches = document.createElement("div");
    swatches.className = "scheme-swatches";
    const paletteForRow = name === currentSchemeName ? currentPalette : PALETTES[name];
    paletteForRow.forEach((hex, i) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch";
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        selectScheme(name, false);
        openColorEditor(sw, i);
      });
      swatches.appendChild(sw);
    });
    row.appendChild(swatches);

    row.addEventListener("click", () => selectScheme(name, true));
    list.appendChild(row);
  }
}

function selectScheme(name, resetPalette) {
  if (name !== currentSchemeName) {
    currentSchemeName = name;
    currentPalette = PALETTES[name].slice();
  } else if (resetPalette) {
    currentPalette = PALETTES[name].slice();
  }
  buildSchemeList();
  generate();
}

function openColorEditor(swatchEl, index) {
  editingSwatchIndex = index;
  const input = document.getElementById("color-editor");
  const rect = swatchEl.getBoundingClientRect();
  input.style.top = rect.top + "px";
  input.style.left = rect.left + "px";
  input.value = currentPalette[index];
  input.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const colorEditor = document.getElementById("color-editor");
  colorEditor.addEventListener("input", () => {
    if (editingSwatchIndex < 0) return;
    currentPalette[editingSwatchIndex] = colorEditor.value;
    buildSchemeList();
    generate();
  });

  buildSchemeList();

  const regenerateInputs = ["width-input", "height-input"];
  regenerateInputs.forEach((id) => {
    document.getElementById(id).addEventListener("change", generate);
  });

  const optionIds = ["opt-stars", "opt-dust", "opt-nebulae", "opt-planets", "opt-tile", "opt-darken", "opt-transp", "opt-dither"];
  optionIds.forEach((id) => {
    document.getElementById(id).addEventListener("change", generate);
  });

  document.getElementById("new-image-btn").addEventListener("click", () => {
    seed = Math.random() * 1000;
    generate();
  });

  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + 1));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - 1));

  document.getElementById("export-btn").addEventListener("click", () => {
    if (!generatedCanvas) return;
    const link = document.createElement("a");
    link.download = `space-bg-${generatedCanvas.width}x${generatedCanvas.height}.png`;
    link.href = generatedCanvas.toDataURL("image/png");
    link.click();
  });

  // Drag-to-scroll preview
  const viewport = document.getElementById("preview-viewport");
  let dragging = false, startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0;
  viewport.addEventListener("mousedown", (e) => {
    dragging = true;
    viewport.classList.add("dragging");
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    viewport.scrollLeft = startScrollLeft - (e.clientX - startX);
    viewport.scrollTop = startScrollTop - (e.clientY - startY);
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    viewport.classList.remove("dragging");
  });

  generate();
});
