// ─────────────────────────────────────────────────────────────
// CINAPSE — Primitivos de UI reutilizáveis
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import * as tmdb from "../tmdb";
import { T, SP, R, FS, FW, SH, svcColors, svcLabels } from "./theme";
import { inputStyle, sectionLabelStyle, cardStyle, pillStyle, chipStyle, backLinkStyle } from "./styles";

// ─── Stars (movido, inalterado) ───
export function Stars({ n, onRate, size = 18 }) {
  const [h, setH] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2, cursor: onRate ? "pointer" : "default" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          onMouseEnter={() => onRate && setH(i)} onMouseLeave={() => onRate && setH(0)}
          onClick={e => { e.stopPropagation(); onRate?.(i === n ? 0 : i); }}
          style={{ transition: "transform .2s", transform: (h >= i || (!h && n >= i)) ? "scale(1.15)" : "scale(1)" }}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={(h >= i || (!h && n >= i)) ? T.gold : T.border} style={{ transition: "fill .2s" }} />
        </svg>
      ))}
    </div>
  );
}

// ─── Poster (movido, inalterado) ───
export function Poster({ path, size = 150 }) {
  if (!path) return <div style={{ width: size, height: size * 1.5, background: T.surface, borderRadius: R.md, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, opacity: .3, flexShrink: 0 }}>🎬</div>;
  return <img src={tmdb.posterUrl(path)} alt="" style={{ width: size, height: size * 1.5, borderRadius: R.md, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />;
}

// ─── Spinner (movido, inalterado) ───
export function Spinner({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 36 }}>
      <div style={{ display: "inline-block", width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.gold, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      {text && <div style={{ marginTop: 10, fontSize: FS.base, color: T.muted }}>{text}</div>}
    </div>
  );
}

// ─── Button ───
// variant: "solid" | "outline" | "ghost" | "danger"
// size: "sm" | "md" | "lg"
const BTN_PAD = { sm: "6px 14px", md: "9px 18px", lg: "14px 32px" };
const BTN_FS = { sm: FS.sm, md: FS.base, lg: FS.lg };
export function Button({ children, variant = "solid", color = T.gold, size = "md", active, disabled, onClick, style }) {
  let v;
  if (variant === "outline") {
    v = {
      border: `1px solid ${active ? T.goldBorderStrong : T.border}`,
      background: active ? T.goldFill : "transparent",
      color: active ? (color || T.gold) : T.muted,
    };
    if (color && color !== T.gold && active) v = { border: `1px solid ${color}66`, background: color + "18", color };
  } else if (variant === "ghost") {
    v = { border: "none", background: "transparent", color: color || T.gold };
  } else if (variant === "danger") {
    v = { border: `1px solid ${T.red}44`, background: "transparent", color: T.red };
  } else { // solid
    v = { border: "none", background: color || T.gold, color: T.bg, fontWeight: FW.bold };
  }
  return (
    <button onClick={onClick} disabled={disabled} className="cinapse-btn"
      style={{
        padding: BTN_PAD[size], borderRadius: R.md, fontSize: BTN_FS[size], fontWeight: 600,
        cursor: disabled ? "default" : "pointer", transition: "all .25s", fontFamily: "inherit",
        opacity: disabled ? .5 : 1, ...v, ...style,
      }}>{children}</button>
  );
}

// Alias retrocompatível do antigo Btn (toggle outline)
export const Btn = ({ children, active, color, onClick, disabled, style }) => (
  <Button variant="outline" active={active} color={color} onClick={onClick} disabled={disabled} size="sm" style={style}>{children}</Button>
);

// ─── Card ───
export function Card({ children, padding = SP.xl, hover, onClick, style }) {
  const interactive = hover || onClick;
  const base = { ...cardStyle, padding, transition: "all .3s", cursor: onClick ? "pointer" : "default", ...style };
  if (!interactive) return <div style={base} onClick={onClick}>{children}</div>;
  return (
    <div onClick={onClick} style={base}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = T.cardElev; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = SH.md; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = (style?.borderColor) || T.borderSoft; e.currentTarget.style.background = (style?.background) || T.card; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      {children}
    </div>
  );
}

// ─── Input / Textarea (foco dourado interno) ───
export function Input({ style, ...props }) {
  return (
    <input {...props} style={{ ...inputStyle, ...style }}
      onFocus={e => { e.target.style.borderColor = T.goldBorderStrong; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = T.border; props.onBlur?.(e); }} />
  );
}
export function Textarea({ style, ...props }) {
  return (
    <textarea {...props} style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.7, ...style }}
      onFocus={e => { e.target.style.borderColor = T.goldBorderStrong; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = T.border; props.onBlur?.(e); }} />
  );
}

// ─── Badge (status sólido pequeno) ───
export function Badge({ children, color = T.blue, style }) {
  return <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: R.sm, background: color + "dd", color: "#fff", ...style }}>{children}</span>;
}

// ─── Pill (gênero/tag) ───
export function Pill({ children, active, clickable, onClick, color }) {
  if (!clickable && active === undefined) return <span style={chipStyle()}>{children}</span>;
  return <span onClick={onClick} style={pillStyle(active, color)}>{children}</span>;
}

// ─── SectionLabel (label + ação opcional à direita) ───
export function SectionLabel({ children, action, style }) {
  return (
    <div style={{ ...sectionLabelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", ...style }}>
      <span>{children}</span>
      {action}
    </div>
  );
}

// ─── ProgressBar ───
export function ProgressBar({ value, max = 1, color = T.green, gradient, height = 5, maxWidth, style }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = gradient || color;
  return (
    <div style={{ flex: 1, maxWidth, height, background: T.border, borderRadius: height / 2, overflow: "hidden", ...style }}>
      <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: height / 2, transition: "width .6s" }} />
    </div>
  );
}

// ─── EmptyState ───
export function EmptyState({ icon, title, hint }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: T.dim }}>
      {icon && <div style={{ fontSize: 44, marginBottom: SP.md, opacity: .3 }}>{icon}</div>}
      <div style={{ fontSize: FS.lg, color: T.muted }}>{title}</div>
      {hint && <div style={{ fontSize: FS.base, marginTop: SP.xs }}>{hint}</div>}
    </div>
  );
}

// ─── StatCard ───
export function StatCard({ value, label, color = T.text }) {
  return (
    <div style={{ background: T.surface, borderRadius: R.xl, padding: SP.lg, textAlign: "center", border: `1px solid ${T.borderSoft}`, boxShadow: SH.sm }}>
      <div style={{ fontSize: 32, fontWeight: FW.light, color }}>{value}</div>
      <div style={{ fontSize: FS.xs, color: T.muted, letterSpacing: ".15em", textTransform: "uppercase", marginTop: SP.xs + 2 }}>{label}</div>
    </div>
  );
}

// ─── ServiceChip (streaming) — dedupe das 4 cópias ───
export function ServiceChip({ service: s }) {
  const c = svcColors[s.type] || T.blue;
  return (
    <div style={{ padding: "8px 14px", borderRadius: R.md, background: c + "18", border: `1px solid ${c}44` }}>
      <span style={{ fontSize: FS.base, fontWeight: 600, color: T.text }}>{s.name}</span><br />
      <span style={{ fontSize: 13, color: svcColors[s.type] || T.muted }}>{svcLabels[s.type] || s.type}</span>
    </div>
  );
}

// ─── BackLink ───
export function BackLink({ onClick, label = "← Voltar", style }) {
  return <button onClick={onClick} style={{ ...backLinkStyle, ...style }}>{label}</button>;
}

// ─── Notif (toast) ───
export function Notif({ notif }) {
  if (!notif) return null;
  const bg = notif.type === "ok" ? T.green + "dd" : notif.type === "info" ? T.blue + "dd" : T.red + "dd";
  return (
    <div style={{ position: "fixed", top: "max(20px, env(safe-area-inset-top))", right: "max(20px, env(safe-area-inset-right))", zIndex: 100, padding: "12px 20px", borderRadius: R.md, fontSize: FS.base, fontWeight: 600, background: bg, color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.4)", animation: "fadeUp .3s ease" }}>{notif.msg}</div>
  );
}
