// ─────────────────────────────────────────────────────────────
// CINAPSE — Helpers de estilo compartilhados (objetos/funções, sem JSX)
// ─────────────────────────────────────────────────────────────

import { T, SP, R, FS } from "./theme";

// Wrapper de página (centralizado). Catálogo usa 860; demais 760.
export const screen = (maxWidth = 760) => ({
  maxWidth, margin: "0 auto", padding: `${SP["2xl"]}px ${SP.xl}px`,
});

// Input unificado (reconcilia o antigo IS e o input de busca)
export const inputStyle = {
  width: "100%", padding: "11px 14px", background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: R.md, color: T.text,
  fontSize: FS.md, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  transition: "border-color .25s",
};

// Label de seção (uppercase, espaçada)
export const sectionLabelStyle = {
  fontSize: FS.sm, color: T.dim, letterSpacing: ".12em", textTransform: "uppercase",
};

// Card / painel base (sem margem embutida — quem chama espaça)
export const cardStyle = {
  background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: R.lg,
};

// Pill clicável (gênero/tag): ativo destaca em dourado
export const pillStyle = (active, color = T.gold) => ({
  padding: "4px 12px", borderRadius: R.pill, fontSize: FS.sm, fontWeight: 600,
  cursor: "pointer", userSelect: "none", transition: "all .25s",
  background: active ? T.goldFill : "transparent",
  border: `1px solid ${active ? T.goldBorderStrong : T.border}`,
  color: active ? T.gold : T.muted,
});

// Chip estático (gênero, não-clicável)
export const chipStyle = () => ({
  padding: "4px 12px", borderRadius: R.pill, fontSize: FS.sm, fontWeight: 600,
  background: T.goldSoft, border: `1px solid ${T.goldBorder}`, color: T.gold,
});

// Link "← Voltar"
export const backLinkStyle = {
  background: "none", border: "none", color: T.muted, fontSize: FS.md,
  cursor: "pointer", padding: 0, marginBottom: SP["2xl"], fontFamily: "inherit",
};
