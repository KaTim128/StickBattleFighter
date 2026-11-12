/**
 * A fighter's colour made bright enough to read as a bar on the dark panel: the same hue, at
 * least 62% lightness, and (for a coloured fighter, not a grey one) at least 55% saturation.
 * Necro's deep robe purple becomes a clear violet; Braxon's grey stays grey.
 */
export function accentColour(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return hex;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  if (s > 0.15) s = Math.max(s, 0.55);
  l = Math.max(l, 0.62);
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
