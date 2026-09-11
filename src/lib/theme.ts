// Derives the supporting shades (deep, mist, soft) from the operator's two
// brand colours, so only two need to be chosen and the rest follow. Runs
// server-side in the root layout, which writes the results as CSS variables.
// Colours are validated as #RRGGBB before reaching here.

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!m) return { r: 30, g: 58, b: 95 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}
function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount });
}

export type ThemeVars = {
  "--brand": string;
  "--brand-deep": string;
  "--brand-mist": string;
  "--accent": string;
  "--accent-soft": string;
};

export function deriveThemeVars(primaryColor: string, accentColor: string): ThemeVars {
  return {
    "--brand": primaryColor,
    "--brand-deep": darken(primaryColor, 0.35),
    "--brand-mist": lighten(primaryColor, 0.9),
    "--accent": accentColor,
    "--accent-soft": lighten(accentColor, 0.87),
  };
}
