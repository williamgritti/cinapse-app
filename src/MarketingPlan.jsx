import { T, FONT_SERIF } from "./ui/theme";
import { BackLink } from "./ui/primitives";

const S = {
  card: { padding: 24, background: T.surface, borderRadius: 12, border: `1px solid ${T.borderSoft}`, marginBottom: 24 },
  label: { fontSize: 15, color: T.dim, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 16 },
  body: { fontSize: 17, color: T.muted, lineHeight: 1.8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 8 },
};

export default function MarketingPlan({ onBack }) {
  return (
    <div className="cinapse-page" style={{ animation: "fadeUp .5s ease" }}>

      {/* BACK */}
      <BackLink onClick={onBack} />

      {/* ─── HERO ─── */}
      <div style={{ textAlign: "center", marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 36, color: T.gold, letterSpacing: ".12em", fontWeight: 300, fontFamily: FONT_SERIF }}>CINAPSE</div>
        <div style={{ fontSize: 17, color: T.muted, letterSpacing: ".08em", marginTop: 8 }}>Plano de Marketing 2026</div>
        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg,${T.gold},${T.goldDim})`, margin: "20px auto 0", borderRadius: 1 }} />
      </div>

      {/* ─── 1. SUMÁRIO EXECUTIVO ─── */}
      <div style={S.card}>
        <div style={S.label}>Sumário Executivo</div>
        <p style={S.body}>
          O Cinapse se posiciona como o catálogo pessoal definitivo para cinéfilos brasileiros apaixonados por cinema de arte, terror, cult e transgressor. Diferente de plataformas genéricas, o Cinapse oferece uma experiência curada, nativa em português, com arquitetura offline-first e dados de streaming atualizados para o mercado brasileiro.
        </p>
        <p style={{ ...S.body, marginTop: 12 }}>
          Nossa missão é criar a ferramenta essencial para quem leva cinema a sério — um espaço pessoal para catalogar, descobrir e organizar filmes que desafiam, provocam e transformam.
        </p>
      </div>

      {/* ─── 2. PÚBLICO-ALVO ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Público-Alvo</div>
        <div style={S.grid}>
          {[
            { title: "Cinéfilo de Terror", color: T.red, desc: "Fãs de horror (18-35), ativos em redes sociais, consomem conteúdo em Mubi e Shudder. Buscam filmes além do mainstream.", traits: "Gaspar Noé · Ari Aster · Dario Argento" },
            { title: "Colecionador de Arte", color: T.blue, desc: "Entusiastas de cinema autoral, frequentadores de festivais, preferem cinema de repertório e retrospectivas.", traits: "Tarkovsky · Bergman · Wong Kar-wai" },
            { title: "Explorador Cult", color: T.purple, desc: "Fãs de exploitation, giallo e cinema transgressor. Colecionadores e participantes de comunidades de nicho.", traits: "Jodorowsky · John Waters · Coffin Joe" },
            { title: "Crítico Casual", color: T.green, desc: "Bloggers e reviewers casuais que buscam uma ferramenta pessoal para tracking e organização de filmes.", traits: "Listas · Notas · Ratings pessoais" },
          ].map(p => (
            <div key={p.title} style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: p.color, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 16, color: T.muted, lineHeight: 1.6, marginBottom: 10 }}>{p.desc}</div>
              <div style={{ fontSize: 14, color: T.dim, fontStyle: "italic" }}>{p.traits}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3. PROPOSTA DE VALOR ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Proposta de Valor</div>
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, color: T.muted }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: "14px 16px", textAlign: "left", color: T.dim, fontSize: 14, letterSpacing: ".1em", textTransform: "uppercase" }}>Recurso</th>
                <th style={{ padding: "14px 12px", textAlign: "center", color: T.gold, fontSize: 14, letterSpacing: ".1em" }}>CINAPSE</th>
                <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 14, letterSpacing: ".1em" }}>Letterboxd</th>
                <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 14, letterSpacing: ".1em" }}>IMDb</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Nativo em Português", true, false, false],
                ["Foco Terror / Art-house", true, false, false],
                ["Streaming Brasil", true, false, false],
                ["Offline-first", true, false, false],
                ["Sem conta / Privacidade", true, false, false],
                ["Sem anúncios", true, false, false],
                ["Watchlists temáticas", true, true, true],
                ["Base de dados global", false, true, true],
                ["Rede social", false, true, false],
              ].map(([feat, cin, let_, imdb]) => (
                <tr key={feat} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "10px 16px", color: T.text }}>{feat}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: cin ? T.gold : T.dim }}>{cin ? "✓" : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: let_ ? T.muted : T.dim }}>{let_ ? "✓" : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: imdb ? T.muted : T.dim }}>{imdb ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. CANAIS DE MARKETING ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Canais de Marketing</div>
        {[
          { channel: "Instagram / TikTok", color: T.red, strategy: "Conteúdo curto: micro-resenhas, recomendações diárias, listas temáticas visuais. Reels com cenas icônicas e trilhas.", reach: "Alto alcance orgânico no público jovem cinéfilo" },
          { channel: "Twitter / X", color: T.blue, strategy: "Engajamento com a comunidade de cinema, live-tweets de festivais, threads de retrospectivas. Curadoria de listas.", reach: "Comunidade cinéfila brasileira muito ativa" },
          { channel: "Reddit", color: T.purple, strategy: "Participação em r/horror, r/filmes, r/brasil. Posts de valor com listas curadas e recomendações. Soft launch.", reach: "Comunidades de nicho altamente engajadas" },
          { channel: "Festivais", color: T.gold, strategy: "Parcerias com Fantaspoa, Mostra de São Paulo, BIFAN. Listas oficiais de filmes, cobertura e watchlists temáticas.", reach: "Público-alvo concentrado, alta credibilidade" },
          { channel: "YouTube", color: T.green, strategy: "Colaboração com canais brasileiros de cinema (Cenas de Cinema, Meteoro Brasil). Reviews patrocinados e menções.", reach: "Alcance de massa com público qualificado" },
        ].map(c => (
          <div key={c.channel} style={{ ...S.card, display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 4, minHeight: 60, background: c.color, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: c.color, marginBottom: 6 }}>{c.channel}</div>
              <div style={{ fontSize: 16, color: T.muted, lineHeight: 1.6, marginBottom: 6 }}>{c.strategy}</div>
              <div style={{ fontSize: 15, color: T.dim, fontStyle: "italic" }}>{c.reach}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 5. ESTRATÉGIA DE CONTEÚDO ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Estratégia de Conteúdo</div>
        <div style={S.card}>
          {[
            { pillar: "Listas Curadas Semanais", desc: "Listas temáticas por diretor, movimento ou década. Ex: \"Novo Extremismo Francês em 10 filmes\", \"Maratona Dario Argento\"." },
            { pillar: "Guias \"Onde Assistir\"", desc: "Guias de streaming por gênero/diretor no Brasil. Conteúdo atualizado com dados reais de disponibilidade." },
            { pillar: "Retrospectivas de Diretores", desc: "Séries de conteúdo explorando a filmografia completa de diretores-chave do catálogo Cinapse." },
            { pillar: "Cobertura de Festivais", desc: "Cobertura ao vivo de festivais de cinema com watchlists geradas automaticamente e recomendações em tempo real." },
          ].map((c, i) => (
            <div key={c.pillar} style={{ padding: "14px 0", borderBottom: i < 3 ? `1px solid ${T.border}22` : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: T.goldGlow, color: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 17, color: T.text, fontWeight: 600, marginBottom: 4 }}>{c.pillar}</div>
                <div style={{ fontSize: 16, color: T.muted, lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 6. CRONOGRAMA DE LANÇAMENTO ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Cronograma de Lançamento</div>
        {[
          { phase: "Fase 1 — Pré-lançamento", period: "Mês 1–2", color: T.blue, items: ["Beta fechado com membros de comunidades de cinema", "Setup de perfis em redes sociais", "Produção de conteúdo inicial (10+ listas curadas)", "Parcerias iniciais com criadores de conteúdo"] },
          { phase: "Fase 2 — Lançamento Suave", period: "Mês 3", color: T.green, items: ["Lançamento público do app", "Push de conteúdo em Reddit e comunidades", "Primeiras colaborações com YouTubers", "Coleta de feedback para iteração rápida"] },
          { phase: "Fase 3 — Crescimento", period: "Mês 4–8", color: T.gold, items: ["Marketing de conteúdo em escala (posts diários)", "Parcerias com festivais (Fantaspoa, Mostra SP)", "Campanhas pagas em Instagram/TikTok", "Expansão do banco de filmes curados para 500+"] },
          { phase: "Fase 4 — Expansão", period: "Mês 9–12", color: T.purple, items: ["PWA / versão mobile nativa", "Exploração de features comunitárias", "Internacionalização (espanhol, inglês)", "Modelo freemium para features premium"] },
        ].map((p, i) => (
          <div key={p.phase} style={{ display: "flex", gap: 20, marginBottom: i < 3 ? 0 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, border: `2px solid ${p.color}44`, flexShrink: 0 }} />
              {i < 3 && <div style={{ width: 2, flex: 1, background: T.border, minHeight: 20 }} />}
            </div>
            <div style={{ ...S.card, flex: 1, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: p.color }}>{p.phase}</div>
                <div style={{ fontSize: 14, color: T.dim, padding: "3px 10px", background: p.color + "18", borderRadius: 4, border: `1px solid ${p.color}33` }}>{p.period}</div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: "none" }}>
                {p.items.map(item => (
                  <li key={item} style={{ fontSize: 16, color: T.muted, lineHeight: 1.8, position: "relative" }}>
                    <span style={{ position: "absolute", left: -16, color: p.color }}>›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 7. MÉTRICAS DE SUCESSO ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...S.label, marginBottom: 20 }}>Métricas de Sucesso</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            ["1.000", "Usuários Ativos", T.gold],
            ["45%", "Retenção 30d", T.green],
            ["500+", "Filmes Curados", T.blue],
            ["4.5★", "Nota na Loja", T.purple],
          ].map(([v, l, c]) => (
            <div key={l} style={{ background: T.surface, borderRadius: 12, padding: 18, textAlign: "center", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 32, fontWeight: 300, color: c }}>{v}</div>
              <div style={{ fontSize: 13, color: T.muted, letterSpacing: ".15em", textTransform: "uppercase", marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 16, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>KPIs Detalhados</div>
          {[
            { kpi: "Usuários ativos mensais (MAU)", target: "1.000 em 6 meses", bar: 0.4 },
            { kpi: "Retenção D30", target: "45% após 30 dias", bar: 0.45 },
            { kpi: "Filmes no catálogo curado", target: "500+ filmes até mês 8", bar: 0.6 },
            { kpi: "Engajamento social", target: "5.000 seguidores combinados", bar: 0.3 },
            { kpi: "Conversão de visitante", target: "15% visitante → usuário ativo", bar: 0.15 },
          ].map(k => (
            <div key={k.kpi} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 16, color: T.text }}>{k.kpi}</span>
                <span style={{ fontSize: 15, color: T.gold }}>{k.target}</span>
              </div>
              <div style={{ height: 6, background: T.card, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${k.bar * 100}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.goldDim})`, borderRadius: 3, transition: "width .8s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "24px 0 40px", borderTop: `1px solid ${T.border}`, color: T.dim, fontSize: 15 }}>
        CINAPSE © 2026 — Documento interno de estratégia
      </div>
    </div>
  );
}
