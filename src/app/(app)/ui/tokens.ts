// MIZAN design system — tokens. Same system as ECIRS, wired to MIZAN's
// brand/accent palette (indigo/amber). Anything using brand/accent follows the
// operator's chosen colours at runtime; neutrals stay neutral.
export const card = "rounded-xl border border-neutral-200 bg-white";
export const cardPad = "rounded-xl border border-neutral-200 bg-white p-5";
export const cardHover = "rounded-xl border border-neutral-200 bg-white hover:shadow-sm transition-shadow";

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white px-4 py-2 " +
  "text-sm font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors";
export const btnQuiet =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white " +
  "px-3.5 py-2 text-sm font-medium text-ink hover:bg-neutral-50 disabled:opacity-50 transition-colors";
export const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 " +
  "hover:bg-neutral-100 hover:text-ink transition-colors";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white " +
  "px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors";

export const input =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand/25 " +
  "focus:border-brand transition-shadow disabled:bg-neutral-50 disabled:text-neutral-500";

export const textPrimary = "text-ink";
export const textSecondary = "text-neutral-500";
export const textTertiary = "text-neutral-400";
export const mono = "font-mono text-[0.8rem] tracking-tight";

export const th = "py-2.5 pr-4 text-left text-xs font-medium text-neutral-500";
export const td = "py-3 pr-4 align-top";
export const trHover = "hover:bg-neutral-50 transition-colors";
