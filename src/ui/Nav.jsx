// ─────────────────────────────────────────────────────────────
// CINAPSE — Navegação responsiva
// Bottom bar no mobile (<768px) · barra no topo no desktop (>=768px)
// Controle de visibilidade via classes em index.css (mobile-first).
// ─────────────────────────────────────────────────────────────

import { T, FS, FW, FONT_SERIF } from "./theme";

const ICONS = {
  main: "M4 4h16v16H4zM4 9h16M9 4v16",            // grade / catálogo
  watchlists: "M6 4h12v16l-6-4-6 4z",             // marcador / coleção
  checklists: "M4 6h10M4 12h10M4 18h10M18 5l2 2 3-3", // lista marcada
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",     // barras
  settings: "M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.5-2.4 1a8 8 0 00-1.7-1l-.4-2.5h-4l-.4 2.5a8 8 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.5 2.4-1a8 8 0 001.7 1l.4 2.5h4l.4-2.5a8 8 0 001.7-1l2.4 1 2-3.5z", // engrenagem
};

const TABS = [
  ["main", "Catálogo"],
  ["watchlists", "Watchlists"],
  ["checklists", "Listas"],
  ["stats", "Stats"],
  ["settings", "Config"],
];

function NavIcon({ name, size = 22, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? T.gold : T.muted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "stroke .25s" }}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Nav({ view, onNavigate, count, dbCount }) {
  return (
    <>
      {/* ─── TOPO (desktop) ─── */}
      <header className="cinapse-nav-top">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 26, color: T.gold, letterSpacing: ".1em", fontWeight: FW.light, fontFamily: FONT_SERIF }}>CINAPSE</span>
          {count != null && <span style={{ fontSize: FS.xs, color: T.dim, letterSpacing: ".18em", textTransform: "uppercase" }}>{count} filme{count !== 1 ? "s" : ""} · {dbCount} no banco</span>}
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {TABS.map(([v, l]) => {
            const on = view === v || (v === "settings" && view === "marketing");
            return (
              <button key={v} onClick={() => onNavigate(v)} className="cinapse-tab-top"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: on ? T.goldGlow : "transparent", color: on ? T.gold : T.muted, fontSize: FS.sm, fontWeight: 600, transition: "all .25s" }}>
                <NavIcon name={v} size={18} active={on} />
                {l}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ─── INFERIOR (mobile) ─── */}
      <nav className="cinapse-nav-bottom">
        {TABS.map(([v, l]) => {
          const on = view === v || (v === "settings" && view === "marketing");
          return (
            <button key={v} onClick={() => onNavigate(v)} className="cinapse-tab-bottom"
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 2px", border: "none", background: "transparent", cursor: "pointer", color: on ? T.gold : T.muted }}>
              <NavIcon name={v} size={22} active={on} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".02em" }}>{l}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
