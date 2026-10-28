/**
 * Screenshot post-processing: area-average downscale from BGRA to RGBA, a cursor arrow drawn
 * at the pointer (screen captures do not contain the cursor), and JPEG encoding. JPEG keeps a
 * 1280×800 desktop around 100–250 KB, which matters because every screenshot stays in the
 * model's context and is re-sent with each request.
 */
import jpeg from 'jpeg-js';

export interface Scaled { width: number; height: number; scale: number }

/** Output size that fits `maxWidth`×`maxHeight` without upscaling. */
export function fit(width: number, height: number, maxWidth: number, maxHeight: number): Scaled {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
}

export function downscale(bgra: Uint8Array, width: number, height: number, out: Scaled): Uint8Array {
  const rgba = new Uint8Array(out.width * out.height * 4);
  const fx = width / out.width, fy = height / out.height;
  for (let oy = 0; oy < out.height; oy++) {
    const y0 = Math.floor(oy * fy), y1 = Math.max(y0 + 1, Math.floor((oy + 1) * fy));
    for (let ox = 0; ox < out.width; ox++) {
      const x0 = Math.floor(ox * fx), x1 = Math.max(x0 + 1, Math.floor((ox + 1) * fx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1 && y < height; y++) {
        let i = (y * width + x0) * 4;
        for (let x = x0; x < x1 && x < width; x++, i += 4) { b += bgra[i]; g += bgra[i + 1]; r += bgra[i + 2]; n++; }
      }
      const o = (oy * out.width + ox) * 4;
      rgba[o] = r / n; rgba[o + 1] = g / n; rgba[o + 2] = b / n; rgba[o + 3] = 255;
    }
  }
  return rgba;
}

// Standard arrow pointer, 12×19: '#' outline, '.' fill.
const ARROW = [
  '#', '##', '#.#', '#..#', '#...#', '#....#', '#.....#', '#......#', '#.......#', '#........#',
  '#.........#', '#......####', '#...#..#', '#..##..#', '#.#  #..#', '##   #..#', '#     #..#', '      #..#', '       ##',
];

export function drawCursor(rgba: Uint8Array, width: number, height: number, cx: number, cy: number): void {
  ARROW.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[dx];
      if (ch !== '#' && ch !== '.') continue;
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const o = (y * width + x) * 4, v = ch === '#' ? 0 : 255;
      rgba[o] = v; rgba[o + 1] = v; rgba[o + 2] = v;
    }
  });
}

export function encodeJpeg(rgba: Uint8Array, width: number, height: number, quality: number): Uint8Array {
  return jpeg.encode({ data: rgba, width, height }, quality).data;
}
