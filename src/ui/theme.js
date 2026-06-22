// ─────────────────────────────────────────────────────────────
// CINAPSE — Design tokens (fonte única de verdade)
// Tema "cinema de arte": dark + dourado. Valores base preservados;
// escalas e aliases semânticos adicionados para consistência.
// ─────────────────────────────────────────────────────────────

export const T = {
  // Superfícies base (inalteradas)
  bg: "#0a0a0f", surface: "#12121a", card: "#16161f", border: "#2a2a3a",
  // Acento dourado (inalterado)
  gold: "#d4a853", goldDim: "#a8843f", goldGlow: "rgba(212,168,83,0.15)",
  // Estados (inalterados)
  red: "#c44040", green: "#4a9e6a", blue: "#5a7ec4", purple: "#8b6fc0",
  // Texto (inalterado)
  text: "#e8e4dc", muted: "#8a8696", dim: "#5a5668",

  // NOVO — superfícies de elevação (profundidade entre os valores existentes)
  bgElev: "#0d0d13",       // seções elevadas sobre o bg
  cardElev: "#1b1b26",     // card em hover/ativo
  borderSoft: "#22222f",   // hairline discreto (substitui border + "22")
  borderStrong: "#34344a", // borda enfatizada (hover/foco)

  // NOVO — aliases semânticos de dourado (substituem gold + "10/16/40/66")
  goldSoft: "rgba(212,168,83,0.10)",        // preenchimento faint (chips/tags)
  goldFill: "rgba(212,168,83,0.16)",        // fill de botão ativo
  goldBorder: "rgba(212,168,83,0.40)",      // borda dourada padrão
  goldBorderStrong: "rgba(212,168,83,0.66)",// borda dourada de foco
  goldText: "#e0b968",                      // dourado levemente mais claro p/ texto pequeno
};

// Escala de espaçamento (base 4px) — substitui 4/6/8/12/14/16/18/20/24/28/32/48
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32, "4xl": 48 };

// Raios — substitui 4/6/8/10/12/20
export const R = { sm: 6, md: 8, lg: 10, xl: 12, pill: 999, full: "50%" };

// Escala tipográfica — substitui 12..36 soltos
export const FS = { xs: 13, sm: 14, base: 16, md: 17, lg: 18, xl: 20, "2xl": 24, h2: 28, hero: 36 };
export const FW = { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 };
export const FONT_SERIF = "'Cormorant Garamond', Georgia, serif"; // wordmark / títulos

// Sombras — sistema de elevação
export const SH = {
  sm: "0 2px 8px rgba(0,0,0,.3)",
  md: "0 8px 24px rgba(0,0,0,.45)",
  lg: "0 16px 40px rgba(0,0,0,.6)",
  glow: "0 16px 40px rgba(0,0,0,.6), 0 0 30px rgba(212,168,83,0.15)", // hover do card do catálogo
};

// Streaming (movido de App.jsx para os chips viverem em ui/)
export const svcColors = { sub: T.green, rent: T.blue, buy: T.purple, free: T.gold };
export const svcLabels = { sub: "Assinatura", rent: "Aluguel", buy: "Compra", free: "Grátis" };
