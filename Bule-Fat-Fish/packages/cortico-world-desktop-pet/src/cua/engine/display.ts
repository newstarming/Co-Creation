/**
 * Displays in an engine's own global coordinates and the mapping to a display's physical pixels.
 * The global unit is a physical pixel on Windows (the engine is per-monitor DPI aware) and under
 * X11, and a point on macOS, where each display has its own number of pixels per point. Displays
 * need not touch: Windows leaves gaps between displays of different scale factors.
 */

export interface NativeDisplay {
  /** Stays the same while the display stays connected. */
  id: string;
  primary: boolean;
  /** Top-left corner and size in global units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Physical pixels per global unit. */
  scale: number;
}

/** Left to right, then top to bottom: the order the bot numbers them in, from 1. */
export function ordered(list: readonly NativeDisplay[]): NativeDisplay[] {
  return [...list].sort((a, b) => a.x - b.x || a.y - b.y);
}

/** Names the arrangement: any display added, removed, moved, resized or rescaled changes it. */
export function layoutOf(list: readonly NativeDisplay[]): string {
  return list.map((d) => `${d.id}@${d.x},${d.y},${d.width}x${d.height}*${d.scale}`).join('|');
}

export function physicalSize(d: NativeDisplay): { width: number; height: number } {
  return { width: Math.round(d.width * d.scale), height: Math.round(d.height * d.scale) };
}

/** A physical pixel of `d` in global units. */
export function toNative(d: NativeDisplay, x: number, y: number): { x: number; y: number } {
  return { x: d.x + x / d.scale, y: d.y + y / d.scale };
}

/** A global point in physical pixels of `d`. */
export function toLocal(d: NativeDisplay, x: number, y: number): { x: number; y: number } {
  return { x: Math.round((x - d.x) * d.scale), y: Math.round((y - d.y) * d.scale) };
}

/** Index in `list` of the display holding the global point, -1 when none does. */
export function displayAt(list: readonly NativeDisplay[], x: number, y: number): number {
  return list.findIndex((d) => x >= d.x && y >= d.y && x < d.x + d.width && y < d.y + d.height);
}

/** The `w`×`h` block at (`x`, `y`) of a top-down BGRA image `width` wide. */
export function crop(bgra: Uint8Array, width: number, x: number, y: number, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) out.set(bgra.subarray(((y + row) * width + x) * 4, ((y + row) * width + x + w) * 4), row * w * 4);
  return out;
}
