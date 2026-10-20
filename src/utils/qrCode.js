/**
 * Lightweight, zero-dependency QR Code (Model 2, Version 2 / 25x25, Error Correction Level L/M) SVG generator.
 * ISO/IEC 18004 compliant data encoding, Reed-Solomon GF(256) block generation, and masking.
 */

// Galois Field GF(256) arithmetic tables (primitive polynomial 0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

/**
 * Encodes text into a standard QR matrix (Version 2, 25x25, Level L - up to 34 bytes).
 * If text is longer, Version 3 (29x29, Level L - up to 55 bytes) is used.
 */
export function generateQrMatrix(text) {
  const rawBytes = new TextEncoder().encode(String(text || ''));
  const version = rawBytes.length <= 32 ? 2 : 3;
  const size = 17 + 4 * version; // 25 for v2, 29 for v3
  const totalCodewords = version === 2 ? 44 : 70;
  const dataCodewords = version === 2 ? 34 : 55;
  const ecCodewords = totalCodewords - dataCodewords; // 10 for v2, 15 for v3

  // Bit buffer: 4-bit mode (0100 for Byte) + 8-bit length + raw data + 4-bit terminator
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(rawBytes.length, 8); // Character count indicator
  for (let i = 0; i < rawBytes.length; i++) {
    pushBits(rawBytes[i], 8);
  }
  // Terminator
  const remCap = dataCodewords * 8 - bits.length;
  pushBits(0, Math.min(4, Math.max(0, remCap)));
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes 0xEC, 0x11
  const dataBytes = new Uint8Array(dataCodewords);
  for (let i = 0; i < dataCodewords; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      const idx = i * 8 + b;
      byteVal = (byteVal << 1) | (idx < bits.length ? bits[idx] : 0);
    }
    if (i * 8 >= bits.length) {
      byteVal = (i % 2 === 0) ? 0xec : 0x11;
    }
    dataBytes[i] = byteVal;
  }

  // Error correction
  const ecBytes = rsEncode(dataBytes, ecCodewords);
  const finalCodewords = new Uint8Array(totalCodewords);
  finalCodewords.set(dataBytes);
  finalCodewords.set(ecBytes, dataBytes.length);

  // Matrix: null = unassigned, 0 = white, 1 = black
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  function setModule(r, c, val, isRes = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      if (isRes) reserved[r][c] = true;
    }
  }

  // 1. Finder patterns (7x7) + separators
  function addFinder(startR, startC) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startR + r;
        const nc = startC + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
            const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(nr, nc, isBorder || isCenter);
          } else {
            setModule(nr, nc, 0); // separator
          }
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment pattern for v2 (18, 18) and v3 (22, 22)
  const alignCoord = version === 2 ? 18 : 22;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      setModule(alignCoord + r, alignCoord + c, isBorder || isCenter);
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!reserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(4 * version + 9, 8, 1);

  // 5. Reserve format info areas around finders
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }

  // 6. Place data bits (Mask 0: (r + c) % 2 === 0)
  const allBits = [];
  for (let i = 0; i < finalCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((finalCodewords[i] >> b) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip timing col
    const rows = [];
    for (let r = 0; r < size; r++) rows.push(upwards ? size - 1 - r : r);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!reserved[r][c]) {
          let bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply standard Mask 0: flip bit if (r + c) % 2 === 0
          if ((r + c) % 2 === 0) bit ^= 1;
          matrix[r][c] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Format information: Mask 0, Level L = 0b111011111000100
  const formatInfo = 0b111011111000100;
  const fmtBits = [];
  for (let i = 14; i >= 0; i--) fmtBits.push((formatInfo >> i) & 1);

  // Top-left finder format info
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[tlCoords[i][0]][tlCoords[i][1]] = fmtBits[i];
  }

  // Split format info for top-right and bottom-left
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = fmtBits[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = fmtBits[7 + i];
  }

  return matrix;
}

/**
 * Returns an array of JSX-compatible rect definitions for dark modules.
 */
export function getQrRects(matrix, cellSize = 4) {
  const rects = [];
  const size = matrix.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        rects.push({
          x: c * cellSize,
          y: r * cellSize,
          width: cellSize,
          height: cellSize,
        });
      }
    }
  }
  return { rects, totalSize: size * cellSize };
}
