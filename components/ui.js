"use client";

export function Shell({ children }) {
  return <div className="flex-1 min-w-0 p-6 md:p-10 pt-20 md:pt-10 relative z-10 fade-in">{children}</div>;
}

export function PageHead({ eyebrow, title, children }) {
  return (
    <header className="mb-8">
      <div className="text-amber text-[11px] tracking-[0.3em] mb-2">{eyebrow}</div>
      <h1 className="serif text-3xl md:text-4xl text-ink mb-2">{title}</h1>
      {children && <p className="text-ink-dim text-sm max-w-2xl leading-relaxed">{children}</p>}
    </header>
  );
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div className="ce-card p-4">
      <div className="text-ink-dim text-[10px] tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-2xl tabular-nums ${accent ? "ce-accent" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-ink-dim text-[11px] mt-1 truncate">{sub}</div>}
    </div>
  );
}

export function Panel({ title, action, children }) {
  return (
    <section className="ce-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-sm tracking-wider text-ink uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Bar({ value, max = 100 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 bg-line w-full rounded-full overflow-hidden">
      <div className="h-full ce-bar rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tag({ children, tone }) {
  const c = tone === "alert" ? "border-alert text-alert"
    : tone === "ok" ? "border-ok text-ok" : "border-line text-ink-dim";
  return <span className={`inline-block text-[10px] px-2 py-0.5 border rounded-full ${c} tracking-wide`}>{children}</span>;
}

export function GenButton({ onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="text-[11px] tracking-wider uppercase px-3 py-1.5 border border-amber-dim text-amber rounded-md hover:bg-amber hover:text-paper transition-colors disabled:opacity-40">
      {loading ? "Processando…" : children}
    </button>
  );
}
