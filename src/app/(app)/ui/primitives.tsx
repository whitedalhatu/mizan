import { card as cardCls } from "./tokens";

export function PageHeader({
  title, description, action,
}: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-neutral-500 mt-1 leading-relaxed max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Section({
  title, description, action, children, className = "",
}: { title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={"mt-8 " + className}>
      {title && (
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed max-w-2xl">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cardCls + " " + className}>{children}</div>;
}

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "info";
const TONE: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  brand: "bg-brand text-white",
  accent: "bg-accent-soft text-brand-deep",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>;
}

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  const dot: Record<Tone, string> = {
    neutral: "bg-neutral-400", brand: "bg-brand", accent: "bg-accent",
    success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500", info: "bg-sky-500",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
      <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />{children}
    </span>
  );
}

export function EmptyState({
  title, hint, action,
}: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-neutral-500 mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// A detail-page header: a small back link on its own row above the title, then
// the title with optional actions to its right. Keeps the cramped "Title ← Back"
// pattern out of the single action slot.
export function DetailHeader({
  backHref, backLabel, title, subtitle, actions,
}: {
  backHref: string; backLabel: string; title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div>
      <a href={backHref} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-ink transition-colors">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </a>
      <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
