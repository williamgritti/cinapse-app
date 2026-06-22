import { useState, useEffect, useRef } from "react";
import { DB, searchLocal } from "./db";
import * as tmdb from "./tmdb";
import * as store from "./storage";
import MarketingPlan from "./MarketingPlan";
import { T, SP, R, FS, FW, SH, FONT_SERIF } from "./ui/theme";
import { cardStyle } from "./ui/styles";
import {
  Stars, Poster, Spinner, Button, Btn, Card, Input, Textarea, Badge, Pill,
  SectionLabel, ProgressBar, EmptyState, StatCard, ServiceChip, BackLink, Notif,
} from "./ui/primitives";
import Nav from "./ui/Nav";

const TAGS = ["Cinapse","Novo Extremismo Francês","Body Horror","Slow Burn","Arthouse","Asiático Extremo","Psicológico","Exploitation","Folk Horror","Giallo","Transgressor","Festival","Cult","Clássico","Obra-prima"];
const CURATED_WATCHLISTS = [
  { name: "Ari Aster", desc: "O mestre do terror elevado — slow burn, luto e rituais", icon: "🌸",
    match: m => m.director === "Ari Aster" },
  { name: "Folk Horror", desc: "Comunidades isoladas, rituais pagãos e terror rural", icon: "🌿",
    match: m => (m.genres || []).some(g => /folk/i.test(g)) || ["Midsommar","A Bruxa","Apóstolo","The Ritual","Hagazussa","Men","Luz Negra","In the Earth","November","Lamb"].includes(m.title) },
  { name: "Gaspar Noé", desc: "Cinema sensorial extremo — câmera livre, drogas e caos", icon: "🔴",
    match: m => m.director === "Gaspar Noé" },
  { name: "Body Horror", desc: "A carne como território do terror", icon: "🧬",
    match: m => (m.genres || []).some(g => /body horror/i.test(g)) || ["Titane","Raw","Possessor","Tetsuo","The Fly","Crimes of the Future","Videodrome","Eraserhead","Society","Men Behind the Sun"].some(t => m.title?.includes(t)) },
  { name: "Novo Extremismo Francês", desc: "O movimento que redefiniu os limites do cinema de horror", icon: "🇫🇷",
    match: m => ["Pascal Laugier","Alexandre Bustillo","Alexandre Aja","Xavier Gens","Gaspar Noé","Julia Ducournau","Bruno Dumont"].includes(m.director) && parseInt(m.year) >= 2000 },
  { name: "Asiático Extremo", desc: "Vingança, violência estilizada e perturbação oriental", icon: "🏯",
    match: m => ["Park Chan-wook","Kim Jee-woon","Kim Ki-duk","Takashi Miike","Sion Sono","Bong Joon-ho","Pang Brothers","Fruit Chan","Kiyoshi Kurosawa","Hideo Nakata"].includes(m.director) },
  { name: "Lars von Trier", desc: "Provocação, depressão e a condição humana no limite", icon: "🎭",
    match: m => m.director === "Lars von Trier" },
  { name: "Yorgos Lanthimos", desc: "Absurdo clínico — famílias disfuncionais e regras cruéis", icon: "🦌",
    match: m => m.director === "Yorgos Lanthimos" },
  { name: "Psicológico Pesado", desc: "Filmes que ficam na cabeça por dias", icon: "🧠",
    match: m => (m.genres || []).some(g => /psicol/i.test(g)) || ["Cisne Negro","Requiem for a Dream","Clube da Luta","Donnie Darko","Memento","Shutter Island","Garota Exemplar","O Farol","Mulholland Drive"].some(t => m.title?.includes(t)) },
];

// Estilo de <select> consistente com os tokens
const selectStyle = { padding: "7px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.md, color: T.muted, fontSize: FS.sm, outline: "none", fontFamily: "inherit", cursor: "pointer" };

// ─── MAIN APP ───

export default function App() {
  const [catalog, setCatalog] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [view, setView] = useState("main");
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState([]);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [searchMode, setSearchMode] = useState("local"); // local | tmdb
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [sortBy, setSortBy] = useState("added");
  const [notif, setNotif] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [streaming, setStreaming] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [selWatchlist, setSelWatchlist] = useState(null);
  const [wlName, setWlName] = useState(""); const [wlDesc, setWlDesc] = useState("");
  const [showWlCreate, setShowWlCreate] = useState(false);
  const [showWlPicker, setShowWlPicker] = useState(null);
  const [selChecklist, setSelChecklist] = useState(null);
  const [clName, setClName] = useState(""); const [clInput, setClInput] = useState("");
  const [showClCreate, setShowClCreate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showAllLocal, setShowAllLocal] = useState(false);
  const [localSort, setLocalSort] = useState("title");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [manTitle, setManTitle] = useState(""); const [manYear, setManYear] = useState("");
  const [manDirector, setManDirector] = useState(""); const [manGenres, setManGenres] = useState("");
  const [keyInput, setKeyInput] = useState(tmdb.getApiKey());
  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load
  useEffect(() => {
    const d = store.load();
    setCatalog(d.catalog || []);
    setWatchlists(d.watchlists || []);
    setChecklists(d.checklists || []);
  }, []);

  // Save on change
  useEffect(() => {
    store.save({ catalog, watchlists, checklists });
  }, [catalog, watchlists, checklists]);

  const flash = (msg, type = "ok") => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 2500); };

  // ─── BACKUP / RESTORE ───
  const handleExport = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), catalog, watchlists, checklists, tmdbApiKey: tmdb.getApiKey() || "" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinapse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash("Backup exportado!");
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== "object" || !Array.isArray(data.catalog)) {
          flash("Arquivo inválido", "warn"); return;
        }
        const hasExisting = catalog.length > 0 || watchlists.length > 0 || checklists.length > 0;
        if (hasExisting && !window.confirm("Isso vai substituir o catálogo, watchlists, listas e API key atuais. Continuar?")) return;
        setCatalog(data.catalog || []);
        setWatchlists(data.watchlists || []);
        setChecklists(data.checklists || []);
        if (data.tmdbApiKey) { tmdb.setApiKey(data.tmdbApiKey); setKeyInput(data.tmdbApiKey); }
        flash(`Importado: ${(data.catalog || []).length} filme${(data.catalog || []).length !== 1 ? "s" : ""}`);
      } catch (err) {
        flash("Erro ao ler arquivo: " + err.message, "warn");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── SEARCH ───
  const doLocalSearch = (q) => {
    if (q.length >= 2) setLocalResults(searchLocal(q));
    else setLocalResults([]);
  };

  const doTmdbSearch = async () => {
    if (!query.trim()) return;
    if (!tmdb.hasApiKey()) { flash("Configure a API key do TMDb nas configurações", "warn"); return; }
    setLoading(true); setSearchError(""); setTmdbResults([]);
    try {
      const results = await tmdb.searchMovies(query);
      setTmdbResults(results);
      if (!results.length) setSearchError("Nenhum resultado no TMDb.");
    } catch (e) {
      setSearchError(`Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    if (searchMode === "local") doLocalSearch(val);
    else {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (val.length >= 3) doTmdbSearch();
      }, 600);
    }
  };

  // ─── FILM CRUD ───
  const addFromLocal = (m) => {
    const key = `${m.title}-${m.year}`;
    if (catalog.some(c => `${c.title}-${c.year}` === key)) { flash("Já no catálogo!", "warn"); return; }
    setCatalog(prev => [{ ...m, id: Date.now(), myRating: 0, notes: "", tags: [], status: "quero_ver", addedAt: Date.now() }, ...prev]);
    flash(`"${m.title}" adicionado!`);
  };

  const addFromTmdb = async (movie) => {
    const key = `${movie.title}-${(movie.release_date || "").slice(0, 4)}`;
    if (catalog.some(c => `${c.title}-${c.year}` === key)) { flash("Já no catálogo!", "warn"); return; }
    flash("Buscando detalhes...", "info");
    const enriched = await tmdb.enrichMovie(movie);
    setCatalog(prev => [{ ...enriched, id: Date.now(), myRating: 0, notes: "", tags: [], status: "quero_ver", addedAt: Date.now() }, ...prev]);
    flash(`"${enriched.title}" adicionado!`);
  };

  const addManual = () => {
    if (!manTitle.trim()) return;
    setCatalog(prev => [{ id: Date.now(), title: manTitle.trim(), original_title: manTitle.trim(), year: manYear.trim(), director: manDirector.trim(), cast: [], genres: manGenres.trim() ? manGenres.split(",").map(g => g.trim()) : [], runtime: 0, rating: 0, overview: "", streaming: [], myRating: 0, notes: "", tags: [], status: "quero_ver", addedAt: Date.now() }, ...prev]);
    flash(`"${manTitle.trim()}" adicionado!`);
    setManTitle(""); setManYear(""); setManDirector(""); setManGenres(""); setShowManual(false);
  };

  const update = (id, u) => {
    setCatalog(prev => prev.map(m => m.id === id ? { ...m, ...u } : m));
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...u }));
  };

  const remove = (id) => {
    const m = catalog.find(c => c.id === id);
    setCatalog(prev => prev.filter(c => c.id !== id));
    setSelected(null); setView("main"); flash(`"${m?.title}" removido`, "warn");
  };

  const toggleTag = (id, tag) => {
    const m = catalog.find(c => c.id === id); if (!m) return;
    update(id, { tags: m.tags.includes(tag) ? m.tags.filter(t => t !== tag) : [...m.tags, tag] });
  };

  // ─── STREAMING ───
  const loadStreaming = async (movieId) => {
    if (!tmdb.hasApiKey()) { setStreaming({ services: [], note: "Configure a TMDb API key para buscar streaming." }); return; }
    setStreamLoading(true);
    const details = await tmdb.getMovieDetails(movieId);
    const services = tmdb.extractStreamingBR(details);
    setStreaming({ services, note: services.length === 0 ? "Não encontrado no TMDb para o Brasil." : "" });
    setStreamLoading(false);
  };

  // ─── PREVIEW (search result detail) ───
  const previewLocal = (m) => {
    setPreview({ ...m, _source: "local" });
    setStreaming(null);
  };

  const previewTmdb = async (movie) => {
    setPreviewLoading(true);
    setPreview(null);
    setStreaming(null);
    try {
      const enriched = await tmdb.enrichMovie(movie);
      setPreview({ ...enriched, _source: "tmdb", _rawTmdbId: movie.id });
      // Auto-fetch streaming
      if (tmdb.hasApiKey() && movie.id) {
        const details = await tmdb.getMovieDetails(movie.id);
        const services = tmdb.extractStreamingBR(details);
        setStreaming({ services, note: services.length === 0 ? "Não encontrado no TMDb para o Brasil." : "" });
      }
    } catch (e) {
      flash("Erro ao carregar detalhes: " + e.message, "warn");
    }
    setPreviewLoading(false);
  };

  const addFromPreview = () => {
    if (!preview) return;
    const key = `${preview.title}-${preview.year}`;
    if (catalog.some(c => `${c.title}-${c.year}` === key)) { flash("Já no catálogo!", "warn"); return; }
    setCatalog(prev => [{ ...preview, id: Date.now(), myRating: 0, notes: "", tags: [], status: "quero_ver", addedAt: Date.now() }, ...prev]);
    flash(`"${preview.title}" adicionado!`);
  };

  // ─── WATCHLISTS ───
  const createWatchlist = () => { if (!wlName.trim()) return; setWatchlists(prev => [{ id: Date.now(), name: wlName.trim(), desc: wlDesc.trim(), movieIds: [], createdAt: Date.now() }, ...prev]); setWlName(""); setWlDesc(""); setShowWlCreate(false); flash("Watchlist criada!"); };
  const deleteWatchlist = (id) => { setWatchlists(prev => prev.filter(w => w.id !== id)); if (selWatchlist?.id === id) setSelWatchlist(null); flash("Removida", "warn"); };
  const addToWatchlist = (wlId, movieId) => { setWatchlists(prev => prev.map(w => w.id === wlId ? { ...w, movieIds: w.movieIds.includes(movieId) ? w.movieIds : [...w.movieIds, movieId] } : w)); setShowWlPicker(null); flash("Adicionado!"); };
  const removeFromWatchlist = (wlId, movieId) => { setWatchlists(prev => prev.map(w => w.id === wlId ? { ...w, movieIds: w.movieIds.filter(id => id !== movieId) } : w)); };

  // ─── CHECKLISTS ───
  const createChecklist = () => { if (!clName.trim()) return; setChecklists(prev => [{ id: Date.now(), name: clName.trim(), items: [], createdAt: Date.now() }, ...prev]); setClName(""); setShowClCreate(false); flash("Lista criada!"); };
  const deleteChecklist = (id) => { setChecklists(prev => prev.filter(c => c.id !== id)); if (selChecklist?.id === id) setSelChecklist(null); flash("Removida", "warn"); };
  const addChecklistItem = (clId) => { if (!clInput.trim()) return; setChecklists(prev => prev.map(c => c.id === clId ? { ...c, items: [...c.items, { id: Date.now(), text: clInput.trim(), done: false }] } : c)); setClInput(""); };
  const toggleCheckItem = (clId, itemId) => { setChecklists(prev => prev.map(c => c.id === clId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : c)); };
  const removeCheckItem = (clId, itemId) => { setChecklists(prev => prev.map(c => c.id === clId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c)); };

  // ─── CURATED WATCHLISTS ───
  const createCuratedWatchlist = (cw) => {
    if (watchlists.some(w => w.name === cw.name)) { flash("Watchlist já existe!", "warn"); return; }
    const matched = DB.filter(cw.match);
    if (matched.length === 0) { flash("Nenhum filme encontrado no banco", "warn"); return; }
    // Add matched movies to catalog if not already there
    const newMovies = [];
    matched.forEach(m => {
      const key = `${m.title}-${m.year}`;
      if (!catalog.some(c => `${c.title}-${c.year}` === key) && !newMovies.some(n => `${n.title}-${n.year}` === key)) {
        newMovies.push({ ...m, id: Date.now() + Math.random() * 1000, myRating: 0, notes: "", tags: [], status: "quero_ver", addedAt: Date.now() });
      }
    });
    const updatedCatalog = [...newMovies, ...catalog];
    setCatalog(updatedCatalog);
    // Create watchlist with IDs
    const movieIds = matched.map(m => {
      const key = `${m.title}-${m.year}`;
      const found = updatedCatalog.find(c => `${c.title}-${c.year}` === key);
      return found?.id;
    }).filter(Boolean);
    setWatchlists(prev => [{ id: Date.now(), name: cw.name, desc: cw.desc, movieIds, createdAt: Date.now() }, ...prev]);
    flash(`"${cw.name}" criada com ${movieIds.length} filmes!`);
  };

  // ─── DERIVED ───
  const filtered = catalog
    .filter(m => filterStatus === "all" || m.status === filterStatus)
    .filter(m => !filterTag || (m.tags || []).includes(filterTag))
    .sort((a, b) => sortBy === "added" ? b.addedAt - a.addedAt : sortBy === "rating" ? (b.myRating || 0) - (a.myRating || 0) : sortBy === "year" ? (parseInt(b.year) || 0) - (parseInt(a.year) || 0) : (a.title || "").localeCompare(b.title || ""));

  const allTags = [...new Set(catalog.flatMap(m => m.tags || []))];
  const stats = {
    total: catalog.length,
    watched: catalog.filter(m => m.status === "assistido").length,
    want: catalog.filter(m => m.status === "quero_ver").length,
    avg: catalog.filter(m => m.myRating > 0).length ? (catalog.filter(m => m.myRating > 0).reduce((s, m) => s + m.myRating, 0) / catalog.filter(m => m.myRating > 0).length).toFixed(1) : "—",
    genres: Object.entries(catalog.reduce((a, m) => { (m.genres || []).forEach(g => a[g] = (a[g] || 0) + 1); return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5),
    directors: Object.entries(catalog.filter(m => m.director).reduce((a, m) => { a[m.director] = (a[m.director] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };

  const resetView = () => { setSelected(null); setSelWatchlist(null); setSelChecklist(null); setLocalResults([]); setTmdbResults([]); setQuery(""); setSearchError(""); setStreaming(null); setShowWlPicker(null); setPreview(null); setPreviewLoading(false); setShowAllLocal(false); setLocalSort("title"); };

  const go = (v) => { setView(v); resetView(); };

  // Bloco "Onde Assistir" reutilizado por preview e detail
  const StreamingPanel = ({ m, fetchId, fallback }) => (
    <div style={{ marginTop: SP["3xl"] - 4, padding: SP.lg, background: T.surface, borderRadius: R.lg, border: `1px solid ${T.borderSoft}`, boxShadow: SH.sm }}>
      <SectionLabel style={{ marginBottom: SP.md }}
        action={!streaming && !streamLoading && fetchId != null && !(m.streaming?.length > 0) && (
          <Button variant="outline" color={T.gold} active size="sm" onClick={() => loadStreaming(fetchId)}>Buscar no TMDb</Button>
        )}>Onde Assistir (Brasil)</SectionLabel>
      {m.streaming?.length > 0 && (
        <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap" }}>
          {m.streaming.map((s, i) => <ServiceChip key={i} service={s} />)}
        </div>
      )}
      {streamLoading && <Spinner text="Buscando..." />}
      {streaming && !m.streaming?.length && (
        streaming.services?.length > 0 ? (
          <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap" }}>
            {streaming.services.map((s, i) => <ServiceChip key={i} service={s} />)}
          </div>
        ) : <div style={{ fontSize: FS.base, color: T.dim, fontStyle: "italic" }}>{streaming.note || "Não encontrado"}</div>
      )}
      {!m.streaming?.length && !streaming && !streamLoading && fallback}
    </div>
  );

  // Cabeçalho (pôster + metadados) reutilizado por preview e detail
  const MovieHero = ({ m, posterSize }) => (
    <div style={{ display: "flex", gap: SP["3xl"] - 4, flexWrap: "wrap" }}>
      {m.poster_path && <Poster path={m.poster_path} size={posterSize} />}
      <div style={{ flex: 1, minWidth: 260 }}>
        <h1 style={{ fontSize: FS["2xl"] + 4, fontWeight: FW.regular, margin: "0 0 4px", fontFamily: FONT_SERIF, letterSpacing: ".01em" }}>{m.title}</h1>
        {m.original_title && m.original_title !== m.title && <div style={{ fontSize: FS.md, color: T.muted, fontStyle: "italic" }}>{m.original_title}</div>}
        <div style={{ display: "flex", gap: SP.lg, marginTop: SP.md - 2, fontSize: FS.md, color: T.muted, flexWrap: "wrap" }}>
          {m.year && <span>{m.year}</span>}
          {m.runtime > 0 && <span>{m.runtime} min</span>}
          {m.director && <span style={{ color: T.gold }}>{m.director}</span>}
          {m.rating > 0 && <span>★ {Number(m.rating).toFixed(1)}</span>}
        </div>
        <div style={{ display: "flex", gap: SP.sm - 2, flexWrap: "wrap", marginTop: SP.md }}>
          {(m.genres || []).map(g => <Pill key={g}>{g}</Pill>)}
        </div>
        {m.overview && <p style={{ fontSize: FS.lg, lineHeight: 1.7, color: T.muted, marginTop: SP.xl }}>{m.overview}</p>}
        {m.cast?.length > 0 && <div style={{ marginTop: SP.md + 2, fontSize: FS.base, color: T.dim }}>Elenco: {m.cast.slice(0, 8).join(", ")}</div>}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // RENDER DE CADA VIEW
  // ═══════════════════════════════════════════
  const renderView = () => {

    // ── SEARCH PREVIEW ──
    if (preview) {
      const m = preview;
      const inCat = catalog.some(c => `${c.title}-${c.year}` === `${m.title}-${m.year}`);
      return (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <BackLink onClick={() => { setPreview(null); setStreaming(null); }} label="← Voltar aos resultados" />
          <MovieHero m={m} posterSize={220} />
          <StreamingPanel m={m} fetchId={m._rawTmdbId ?? null}
            fallback={m._source === "local" && <div style={{ fontSize: FS.base, color: T.dim, fontStyle: "italic" }}>Busque no TMDb para ver streaming</div>} />
          <div style={{ marginTop: SP["2xl"], textAlign: "center" }}>
            <Button variant={inCat ? "outline" : "solid"} color={inCat ? T.green : T.gold} active={inCat} size="lg" disabled={inCat} onClick={addFromPreview}>
              {inCat ? "✓ Já no catálogo" : "Adicionar ao Catálogo"}
            </Button>
          </div>
        </div>
      );
    }

    // ── DETAIL ──
    if (view === "detail" && selected) {
      const m = catalog.find(c => c.id === selected.id) || selected;
      return (
        <div style={{ animation: "fadeUp .5s ease" }}>
          <BackLink onClick={() => { setView("main"); setSelected(null); setEditing(false); setStreaming(null); setShowWlPicker(null); }} />
          <MovieHero m={m} posterSize={200} />
          <StreamingPanel m={m} fetchId={m.id < 1e12 ? m.id : null}
            fallback={m.id >= 1e12 && <div style={{ fontSize: FS.base, color: T.dim, fontStyle: "italic" }}>Adicionado manualmente — sem dados de streaming</div>} />

          {/* WATCHLIST PICKER */}
          <div style={{ marginTop: SP.lg, position: "relative" }}>
            <Button variant="outline" color={T.purple} active size="sm" onClick={() => setShowWlPicker(showWlPicker ? null : m.id)}>+ Watchlist</Button>
            {showWlPicker === m.id && (
              <div style={{ position: "absolute", top: 40, left: 0, ...cardStyle, background: T.surface, padding: SP.sm, zIndex: 10, minWidth: 220, animation: "fadeUp .2s ease", boxShadow: SH.md }}>
                {watchlists.length > 0 ? watchlists.map(wl => (
                  <div key={wl.id} onClick={() => addToWatchlist(wl.id, m.id)} style={{ padding: "8px 12px", borderRadius: R.sm, cursor: "pointer", fontSize: FS.base, color: T.text, transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.card} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {wl.name} <span style={{ color: T.dim, fontSize: FS.sm }}>({wl.movieIds.length})</span>
                  </div>
                )) : <div style={{ padding: 10, fontSize: FS.sm, color: T.dim }}>Crie na aba Watchlists</div>}
              </div>
            )}
          </div>

          {/* CATALOG FIELDS */}
          <div style={{ marginTop: SP["3xl"] - 4, borderTop: `1px solid ${T.borderSoft}`, paddingTop: SP["2xl"] }}>
            <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.xl, flexWrap: "wrap" }}>
              {[["quero_ver", "Quero Ver", T.blue], ["assistido", "Assistido", T.green], ["abandonado", "Abandonado", T.red]].map(([s, l, c]) => (
                <Btn key={s} active={m.status === s} color={c} onClick={() => update(m.id, { status: s })}>{l}</Btn>
              ))}
            </div>
            <div style={{ marginBottom: SP.xl }}>
              <SectionLabel style={{ marginBottom: SP.sm - 2 }}>Minha Nota</SectionLabel>
              <Stars n={m.myRating} onRate={r => update(m.id, { myRating: r })} size={26} />
            </div>
            <div style={{ marginBottom: SP.xl }}>
              <SectionLabel style={{ marginBottom: SP.sm }}>Tags</SectionLabel>
              <div style={{ display: "flex", gap: SP.sm - 2, flexWrap: "wrap" }}>
                {TAGS.map(t => <Pill key={t} clickable active={(m.tags || []).includes(t)} onClick={() => toggleTag(m.id, t)}>{t}</Pill>)}
              </div>
            </div>
            <div style={{ marginBottom: SP.xl }}>
              <SectionLabel style={{ marginBottom: SP.sm }}
                action={<button onClick={() => { if (editing) update(m.id, { notes: notesDraft }); else setNotesDraft(m.notes || ""); setEditing(!editing); }}
                  style={{ background: "none", border: "none", color: T.gold, fontSize: FS.sm, cursor: "pointer", fontFamily: "inherit" }}>{editing ? "Salvar" : m.notes ? "Editar" : "Adicionar"}</button>}>Anotações</SectionLabel>
              {editing ? <Textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} placeholder="Ideias pro Cinapse..." />
                : m.notes ? <div style={{ fontSize: FS.md, color: T.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.notes}</div>
                : <div style={{ fontSize: FS.base, color: T.dim, fontStyle: "italic" }}>Nenhuma anotação</div>}
            </div>
            <Button variant="danger" size="sm" onClick={() => remove(m.id)} style={{ opacity: .7 }}>Remover do catálogo</Button>
          </div>
        </div>
      );
    }

    // ── WATCHLISTS ──
    if (view === "watchlists") {
      if (selWatchlist) {
        const wl = watchlists.find(w => w.id === selWatchlist.id);
        if (!wl) { setSelWatchlist(null); return null; }
        const movies = wl.movieIds.map(id => catalog.find(c => c.id === id)).filter(Boolean);
        const watched = movies.filter(m => m.status === "assistido").length;
        return (
          <div>
            <BackLink onClick={() => setSelWatchlist(null)} style={{ marginBottom: SP.xl }} />
            <h2 style={{ fontSize: FS.h2, fontWeight: FW.regular, color: T.gold, margin: "0 0 4px", fontFamily: FONT_SERIF }}>{wl.name}</h2>
            {wl.desc && <div style={{ fontSize: FS.base, color: T.muted, marginBottom: SP.sm }}>{wl.desc}</div>}
            {movies.length > 0 && <div style={{ display: "flex", gap: SP.md, alignItems: "center", marginBottom: SP.xl }}><span style={{ fontSize: FS.sm, color: T.muted }}>{watched}/{movies.length} assistidos</span><ProgressBar value={watched} max={movies.length} maxWidth={160} /></div>}
            {movies.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.dim }}>Adicione filmes pela ficha do catálogo.</div>}
            {movies.map((m, i) => (
              <div key={m.id} style={{ display: "flex", gap: SP.md + 2, padding: "12px 16px", ...cardStyle, marginBottom: SP.sm, animation: `fadeUp .3s ease ${i * .04}s both`, alignItems: "center" }}>
                <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => { setSelected(m); setView("detail"); }}>
                  <div style={{ fontSize: FS.lg, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({m.year})</span></div>
                  <div style={{ fontSize: FS.sm, color: T.muted, marginTop: 2 }}>{m.director}</div>
                </div>
                <Badge color={m.status === "assistido" ? T.green : T.blue}>{m.status === "assistido" ? "VISTO" : "LISTA"}</Badge>
                <button onClick={() => removeFromWatchlist(wl.id, m.id)} style={{ background: "none", border: "none", color: T.red, fontSize: FS.base, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP["2xl"] }}>
            <h2 style={{ fontSize: FS.h2, fontWeight: FW.light, color: T.gold, margin: 0, fontFamily: FONT_SERIF }}>Watchlists Temáticas</h2>
            <Btn active onClick={() => setShowWlCreate(!showWlCreate)}>+ Nova</Btn>
          </div>
          {showWlCreate && <Card padding={SP.lg} style={{ background: T.surface, marginBottom: SP.xl, animation: "fadeUp .3s ease" }}>
            <Input value={wlName} onChange={e => setWlName(e.target.value)} placeholder="Nome (ex: Maratona Gaspar Noé)" onKeyDown={e => e.key === "Enter" && createWatchlist()} style={{ marginBottom: SP.sm }} />
            <Input value={wlDesc} onChange={e => setWlDesc(e.target.value)} placeholder="Descrição (opcional)" style={{ fontSize: FS.base, marginBottom: SP.md }} />
            <div style={{ display: "flex", gap: SP.sm }}><Button onClick={createWatchlist}>Criar</Button><Button variant="outline" onClick={() => setShowWlCreate(false)}>Cancelar</Button></div>
          </Card>}
          {watchlists.length === 0 && !showWlCreate && <EmptyState icon="📋" title="Nenhuma watchlist" />}
          {watchlists.map((wl, i) => {
            const movies = wl.movieIds.map(id => catalog.find(c => c.id === id)).filter(Boolean);
            const w = movies.filter(m => m.status === "assistido").length;
            return <Card key={wl.id} hover onClick={() => setSelWatchlist(wl)} padding="16px 20px" style={{ marginBottom: SP.md, animation: `fadeUp .3s ease ${i * .05}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: FS.xl, fontWeight: 600 }}>{wl.name}</div>{wl.desc && <div style={{ fontSize: FS.sm, color: T.dim, marginTop: 2 }}>{wl.desc}</div>}</div>
                <button onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }} style={{ background: "none", border: "none", color: T.red, fontSize: FS.md, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button></div>
              <div style={{ display: "flex", gap: SP.md, marginTop: SP.md - 2, fontSize: FS.sm, color: T.muted, alignItems: "center" }}><span>{movies.length} filme{movies.length !== 1 ? "s" : ""}</span>{movies.length > 0 && <><span style={{ color: T.green }}>{w} visto{w !== 1 ? "s" : ""}</span><ProgressBar value={w} max={movies.length} height={4} maxWidth={120} /></>}</div>
            </Card>;
          })}

          {/* CURATED WATCHLISTS */}
          <div style={{ marginTop: SP["4xl"] - 12, borderTop: `1px solid ${T.borderSoft}`, paddingTop: SP["2xl"] }}>
            <SectionLabel style={{ marginBottom: SP.lg, letterSpacing: ".15em" }}>Watchlists Curadas</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: SP.md }}>
              {CURATED_WATCHLISTS.map(cw => {
                const exists = watchlists.some(w => w.name === cw.name);
                const count = DB.filter(cw.match).length;
                return <Card key={cw.name} hover={!exists} onClick={() => !exists && createCuratedWatchlist(cw)} padding="14px 16px"
                  style={{ background: exists ? T.surface : T.card, borderColor: exists ? T.green + "44" : T.borderSoft, cursor: exists ? "default" : "pointer", opacity: exists ? .6 : 1 }}>
                  <div style={{ fontSize: FS["2xl"] - 2, marginBottom: SP.sm - 2 }}>{cw.icon}</div>
                  <div style={{ fontSize: FS.md, fontWeight: 600, color: exists ? T.green : T.text }}>{exists ? "✓ " : ""}{cw.name}</div>
                  <div style={{ fontSize: FS.sm, color: T.dim, marginTop: SP.xs, lineHeight: 1.4 }}>{cw.desc}</div>
                  <div style={{ fontSize: 13, color: T.muted, marginTop: SP.sm }}>{count} filme{count !== 1 ? "s" : ""}</div>
                </Card>;
              })}
            </div>
          </div>
        </div>
      );
    }

    // ── CHECKLISTS ──
    if (view === "checklists") {
      if (selChecklist) {
        const cl = checklists.find(c => c.id === selChecklist.id); if (!cl) { setSelChecklist(null); return null; }
        const done = cl.items.filter(i => i.done).length;
        return (
          <div>
            <BackLink onClick={() => setSelChecklist(null)} style={{ marginBottom: SP.xl }} />
            <h2 style={{ fontSize: FS.h2, fontWeight: FW.regular, color: T.gold, margin: "0 0 4px", fontFamily: FONT_SERIF }}>{cl.name}</h2>
            {cl.items.length > 0 && <div style={{ display: "flex", gap: SP.md, alignItems: "center", marginBottom: SP.xl, marginTop: SP.sm }}><span style={{ fontSize: FS.sm, color: T.muted }}>{done}/{cl.items.length}</span><ProgressBar value={done} max={cl.items.length} maxWidth={180} gradient={`linear-gradient(90deg,${T.gold},${T.green})`} /></div>}
            <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.xl }}>
              <Input value={clInput} onChange={e => setClInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addChecklistItem(cl.id)} placeholder="Adicionar filme..." style={{ flex: 1 }} />
              <Button onClick={() => addChecklistItem(cl.id)} style={{ padding: "11px 18px" }}>+</Button>
            </div>
            {cl.items.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.dim, fontSize: FS.md }}>Digite filmes acima</div>}
            {cl.items.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: SP.md, padding: "12px 16px", ...cardStyle, borderColor: item.done ? T.green + "33" : T.borderSoft, marginBottom: SP.sm - 2, animation: `fadeUp .3s ease ${i * .03}s both`, transition: "all .3s" }}>
                <div onClick={() => toggleCheckItem(cl.id, item.id)} style={{ width: 22, height: 22, borderRadius: R.sm, border: `2px solid ${item.done ? T.green : T.border}`, background: item.done ? T.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .25s", flexShrink: 0 }}>
                  {item.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                </div>
                <span style={{ flex: 1, fontSize: FS.lg, color: item.done ? T.dim : T.text, textDecoration: item.done ? "line-through" : "none", transition: "all .3s", fontStyle: item.done ? "italic" : "normal" }}>{item.text}</span>
                <button onClick={() => removeCheckItem(cl.id, item.id)} style={{ background: "none", border: "none", color: T.red, fontSize: FS.base, cursor: "pointer", opacity: .3 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = .3}>×</button>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP["2xl"] }}>
            <h2 style={{ fontSize: FS.h2, fontWeight: FW.light, color: T.gold, margin: 0, fontFamily: FONT_SERIF }}>Listas de Filmes</h2>
            <Btn active onClick={() => setShowClCreate(!showClCreate)}>+ Nova</Btn>
          </div>
          {showClCreate && <Card padding={SP.lg} style={{ background: T.surface, marginBottom: SP.xl, animation: "fadeUp .3s ease" }}>
            <Input value={clName} onChange={e => setClName(e.target.value)} placeholder="Nome da lista" onKeyDown={e => e.key === "Enter" && createChecklist()} style={{ marginBottom: SP.md }} />
            <div style={{ display: "flex", gap: SP.sm }}><Button onClick={createChecklist}>Criar</Button><Button variant="outline" onClick={() => setShowClCreate(false)}>Cancelar</Button></div>
          </Card>}
          {checklists.length === 0 && !showClCreate && <EmptyState icon="✅" title="Nenhuma lista" hint="Monte listas e vá riscando" />}
          {checklists.map((cl, i) => {
            const done = cl.items.filter(x => x.done).length;
            return <Card key={cl.id} hover onClick={() => setSelChecklist(cl)} padding="16px 20px" style={{ marginBottom: SP.md, animation: `fadeUp .3s ease ${i * .05}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: FS.xl, fontWeight: 600 }}>{cl.name}</div>
                <button onClick={e => { e.stopPropagation(); deleteChecklist(cl.id); }} style={{ background: "none", border: "none", color: T.red, fontSize: FS.md, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = .4}>×</button></div>
              <div style={{ display: "flex", gap: SP.md, alignItems: "center", marginTop: SP.sm, fontSize: FS.sm, color: T.muted }}><span>{cl.items.length} filme{cl.items.length !== 1 ? "s" : ""}</span>{cl.items.length > 0 && <><span style={{ color: T.green }}>{done} assistido{done !== 1 ? "s" : ""}</span><ProgressBar value={done} max={cl.items.length} height={4} maxWidth={120} gradient={`linear-gradient(90deg,${T.gold},${T.green})`} /></>}</div>
            </Card>;
          })}
        </div>
      );
    }

    // ── STATS ──
    if (view === "stats") {
      return (
        <div>
          <h2 style={{ fontSize: FS.h2, fontWeight: FW.light, color: T.gold, marginBottom: SP["3xl"], fontFamily: FONT_SERIF }}>Estatísticas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: SP.md + 2, marginBottom: SP["4xl"] - 12 }}>
            {[["Total", stats.total, T.text], ["Assistidos", stats.watched, T.green], ["Quero Ver", stats.want, T.blue], ["Nota Média", stats.avg, T.gold]].map(([l, v, c]) => (
              <StatCard key={l} label={l} value={v} color={c} />
            ))}
          </div>
          {stats.genres.length > 0 && <div style={{ marginBottom: SP["3xl"] - 4 }}>
            <SectionLabel style={{ marginBottom: SP.md, letterSpacing: ".15em" }}>Top Gêneros</SectionLabel>
            {stats.genres.map(([g, n]) => <div key={g} style={{ display: "flex", alignItems: "center", gap: SP.md, marginBottom: SP.sm }}><div style={{ width: 110, fontSize: FS.base, color: T.muted, textAlign: "right" }}>{g}</div><ProgressBar value={n} max={stats.genres[0][1]} height={6} gradient={`linear-gradient(90deg,${T.gold},${T.goldDim})`} style={{ background: T.surface }} /><div style={{ fontSize: FS.base, color: T.muted, width: 24 }}>{n}</div></div>)}
          </div>}
          {stats.directors.length > 0 && <div style={{ marginBottom: SP["3xl"] - 4 }}>
            <SectionLabel style={{ marginBottom: SP.md, letterSpacing: ".15em" }}>Top Diretores</SectionLabel>
            {stats.directors.map(([d, n]) => <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.borderSoft}`, fontSize: FS.md }}><span>{d}</span><span style={{ color: T.gold }}>{n}</span></div>)}
          </div>}
          {catalog.length === 0 && <div style={{ textAlign: "center", color: T.dim, marginTop: 60 }}>Adicione filmes para ver estatísticas.</div>}
        </div>
      );
    }

    // ── SETTINGS ──
    if (view === "settings") {
      return (
        <div>
          <h2 style={{ fontSize: FS.h2, fontWeight: FW.light, color: T.gold, marginBottom: SP["3xl"], fontFamily: FONT_SERIF }}>Configurações</h2>
          <Card padding={SP.xl} style={{ background: T.surface, marginBottom: SP.xl }}>
            <SectionLabel style={{ marginBottom: SP.md }}>TMDb API Key</SectionLabel>
            <p style={{ fontSize: FS.base, color: T.muted, lineHeight: 1.6, marginBottom: SP.lg }}>
              Com a chave do TMDb, a busca retorna filmes de todo o catálogo mundial com pôsteres, sinopses, elenco e dados de streaming atualizados. Sem ela, a busca usa apenas o banco local de {DB.length} filmes curados.
            </p>
            <p style={{ fontSize: FS.base, color: T.dim, marginBottom: SP.lg }}>
              Gratuita em <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: T.gold, textDecoration: "none" }}>themoviedb.org/settings/api</a>
            </p>
            <div style={{ display: "flex", gap: SP.sm }}>
              <Input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Cole sua API key aqui..." style={{ flex: 1, fontFamily: "monospace", fontSize: FS.base }} />
              <Button onClick={() => { tmdb.setApiKey(keyInput.trim()); flash("API key salva!"); }}>Salvar</Button>
            </div>
            {tmdb.hasApiKey() && <div style={{ marginTop: SP.md - 2, fontSize: FS.sm, color: T.green }}>✓ API key configurada</div>}
          </Card>
          <Card padding={SP.xl} style={{ background: T.surface, marginBottom: SP.xl }}>
            <SectionLabel style={{ marginBottom: SP.md }}>Backup & Sincronização</SectionLabel>
            <p style={{ fontSize: FS.base, color: T.muted, lineHeight: 1.6, marginBottom: SP.lg }}>
              Exporte um arquivo JSON com seu catálogo, watchlists, listas e API key. Importe em outro dispositivo (ex: iPhone) para migrar tudo de uma vez.
            </p>
            <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap" }}>
              <Button onClick={handleExport}>Exportar JSON</Button>
              <Button variant="outline" color={T.gold} active onClick={() => fileInputRef.current?.click()}>Importar JSON</Button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} style={{ display: "none" }} />
            </div>
          </Card>
          <Card padding={SP.xl} style={{ background: T.surface, marginBottom: SP.xl }}>
            <SectionLabel style={{ marginBottom: SP.md }}>Dados</SectionLabel>
            <div style={{ fontSize: FS.base, color: T.muted }}>{catalog.length} filmes · {watchlists.length} watchlists · {checklists.length} listas</div>
            <div style={{ fontSize: FS.sm, color: T.dim, marginTop: SP.sm }}>Banco local: {DB.length} filmes curados</div>
          </Card>
          <Card padding={SP.xl} style={{ background: T.surface }}>
            <SectionLabel style={{ marginBottom: SP.md }}>Sobre o Cinapse</SectionLabel>
            <p style={{ fontSize: FS.base, color: T.muted, lineHeight: 1.6, margin: "0 0 16px" }}>
              Conheça a estratégia de marketing e crescimento do Cinapse.
            </p>
            <Button variant="outline" color={T.gold} active onClick={() => setView("marketing")}>Ver Plano de Marketing</Button>
          </Card>
        </div>
      );
    }

    // ── MAIN CATALOG ──
    const hasResults = searchMode === "local" ? localResults.length > 0 : tmdbResults.length > 0;
    const showingSearch = (query.length >= 2 && (hasResults || loading || searchError)) || hasResults || showAllLocal;

    return (
      <div>
        {/* Marca (apenas mobile; desktop usa a top nav) */}
        <div className="cinapse-brand-mobile" style={{ flexDirection: "column", marginBottom: SP.lg }}>
          <div style={{ fontSize: FS.hero, color: T.gold, letterSpacing: ".08em", fontWeight: FW.light, fontFamily: FONT_SERIF }}>CINAPSE</div>
          <div style={{ fontSize: 13, color: T.dim, letterSpacing: ".2em", textTransform: "uppercase" }}>{catalog.length} filme{catalog.length !== 1 ? "s" : ""} · {DB.length} no banco</div>
        </div>

        {/* SEARCH */}
        <div style={{ marginBottom: SP.sm }}>
          <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.sm }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Input value={query} onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && searchMode === "tmdb") doTmdbSearch(); }}
                placeholder={searchMode === "local" ? "Buscar no banco local..." : "Buscar no TMDb... (Enter)"}
                style={{ background: T.surface, padding: "13px 44px 13px 18px", fontSize: FS.lg, borderRadius: R.lg }} />
              {query && (
                <button onClick={() => { setQuery(""); setLocalResults([]); setTmdbResults([]); setSearchError(""); setShowAllLocal(false); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: T.border, border: "none", color: T.muted, fontSize: FS.base, cursor: "pointer", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.red + "44"; e.currentTarget.style.color = T.red; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.muted; }}>×</button>
              )}
            </div>
            {searchMode === "tmdb" && (
              <Button onClick={doTmdbSearch} disabled={loading || !query.trim()} style={{ padding: "13px 22px", fontSize: FS.md, borderRadius: R.lg }}>
                {loading ? "..." : "Buscar"}
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: SP.md, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: SP.xs }}>
              <Btn active={searchMode === "local"} onClick={() => { setSearchMode("local"); setTmdbResults([]); setSearchError(""); if (query.length >= 2) doLocalSearch(query); }}>Local ({DB.length})</Btn>
              <Btn active={searchMode === "tmdb"} color={tmdb.hasApiKey() ? T.gold : T.dim} onClick={() => { setSearchMode("tmdb"); setLocalResults([]); }}>TMDb {tmdb.hasApiKey() ? "✓" : "🔑"}</Btn>
            </div>
            <button onClick={() => setShowManual(!showManual)} style={{ background: "none", border: "none", color: T.muted, fontSize: FS.sm, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>{showManual ? "Fechar" : "+ Manual"}</button>
            {searchMode === "local" && <button onClick={() => { setShowAllLocal(!showAllLocal); setLocalResults(showAllLocal ? [] : DB); setQuery(""); }} style={{ background: "none", border: "none", color: T.gold, fontSize: FS.sm, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>{showAllLocal ? "Fechar catálogo" : `Ver todos (${DB.length})`}</button>}
          </div>
        </div>

        {/* MANUAL ADD */}
        {showManual && <Card padding={SP.lg} style={{ background: T.surface, marginBottom: SP.xl, marginTop: SP.md, animation: "fadeUp .3s ease" }}>
          <SectionLabel style={{ marginBottom: SP.md }}>Adicionar Manualmente</SectionLabel>
          <Input value={manTitle} onChange={e => setManTitle(e.target.value)} placeholder="Título *" onKeyDown={e => e.key === "Enter" && addManual()} style={{ marginBottom: SP.sm }} />
          <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.sm }}><Input value={manYear} onChange={e => setManYear(e.target.value)} placeholder="Ano" style={{ flex: 1 }} /><Input value={manDirector} onChange={e => setManDirector(e.target.value)} placeholder="Diretor" style={{ flex: 2 }} /></div>
          <Input value={manGenres} onChange={e => setManGenres(e.target.value)} placeholder="Gêneros (vírgula)" style={{ marginBottom: SP.md }} />
          <Button onClick={addManual} disabled={!manTitle.trim()}>Adicionar</Button>
        </Card>}

        {/* LOADING */}
        {previewLoading && <Spinner text="Carregando detalhes..." />}
        {loading && <Spinner text="Buscando no TMDb..." />}
        {searchError && !loading && <div style={{ padding: SP.lg, textAlign: "center", color: T.red, fontSize: FS.base, background: T.red + "11", borderRadius: R.md, marginTop: SP.md, marginBottom: SP.lg }}>{searchError}</div>}

        {/* LOCAL RESULTS */}
        {searchMode === "local" && (localResults.length > 0 || showAllLocal) && <div style={{ marginTop: SP.lg, marginBottom: SP["3xl"] - 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md - 2, flexWrap: "wrap", gap: SP.sm }}>
            <SectionLabel>{localResults.length} resultado{localResults.length !== 1 ? "s" : ""} <span style={{ fontSize: 13, fontWeight: 400, opacity: .7 }}>— clique para detalhes</span></SectionLabel>
            {showAllLocal && <div style={{ display: "flex", gap: SP.sm - 2 }}>
              {[["title", "A-Z"], ["rating", "Nota ↓"], ["year", "Ano ↓"]].map(([k, label]) => (
                <Btn key={k} active={localSort === k} onClick={() => { setLocalSort(k); setLocalResults(prev => [...prev].sort(k === "rating" ? (a, b) => (b.rating || 0) - (a.rating || 0) : k === "year" ? (a, b) => (b.year || 0) - (a.year || 0) : (a, b) => (a.title || "").localeCompare(b.title || ""))); }}>{label}</Btn>
              ))}
            </div>}
          </div>
          {localResults.map((m, i) => {
            const inCat = catalog.some(c => c.title === m.title && c.year === m.year);
            return <div key={i} onClick={() => previewLocal(m)} style={{ display: "flex", gap: SP.lg, padding: "12px 16px", ...cardStyle, borderColor: inCat ? T.goldBorder : T.borderSoft, marginBottom: SP.sm, animation: `fadeUp .35s ease ${i * .05}s both`, alignItems: "center", cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = T.goldBorderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = inCat ? T.goldBorder : T.borderSoft; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FS.lg, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({m.year})</span></div>
                <div style={{ fontSize: FS.sm, color: T.muted, marginTop: 3 }}>{m.director && <span style={{ color: T.gold }}>{m.director}</span>}{m.runtime > 0 && <span> · {m.runtime}min</span>}{m.rating > 0 && <span> · ★{Number(m.rating).toFixed(1)}</span>}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>{(m.genres || []).slice(0, 4).map(g => <span key={g} style={{ fontSize: 13, padding: "2px 8px", borderRadius: 12, background: T.goldSoft, color: T.goldDim, border: `1px solid ${T.goldBorder}` }}>{g}</span>)}</div>
              </div>
              <Button variant="outline" color={inCat ? T.green : T.gold} active onClick={(e) => { e.stopPropagation(); addFromLocal(m); }} disabled={inCat} size="sm" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{inCat ? "✓" : "+ Adicionar"}</Button>
              <span style={{ color: T.dim, fontSize: FS.lg, flexShrink: 0 }}>›</span>
            </div>;
          })}
        </div>}

        {/* TMDB RESULTS */}
        {searchMode === "tmdb" && !loading && tmdbResults.length > 0 && <div style={{ marginTop: SP.lg, marginBottom: SP["3xl"] - 4 }}>
          <SectionLabel style={{ marginBottom: SP.md - 2 }}>{tmdbResults.length} resultado{tmdbResults.length !== 1 ? "s" : ""} do TMDb <span style={{ fontSize: 13, fontWeight: 400, opacity: .7 }}>— clique para detalhes</span></SectionLabel>
          {tmdbResults.map((m, i) => {
            const yr = (m.release_date || "").slice(0, 4);
            const inCat = catalog.some(c => c.title === m.title && c.year === yr);
            return <div key={m.id} onClick={() => previewTmdb(m)} style={{ display: "flex", gap: SP.md + 2, padding: "12px 16px", ...cardStyle, borderColor: inCat ? T.goldBorder : T.borderSoft, marginBottom: SP.sm, animation: `fadeUp .35s ease ${i * .05}s both`, alignItems: "center", cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = T.goldBorderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = inCat ? T.goldBorder : T.borderSoft; }}>
              {m.poster_path && <img src={tmdb.posterUrl(m.poster_path, "w92")} alt="" style={{ width: 46, height: 69, borderRadius: R.sm, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FS.lg, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({yr})</span></div>
                {m.vote_average > 0 && <div style={{ fontSize: FS.sm, color: T.gold, marginTop: 2 }}>★ {m.vote_average.toFixed(1)}</div>}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>{tmdb.genreNames(m.genre_ids).slice(0, 4).map(g => <span key={g} style={{ fontSize: 13, padding: "2px 8px", borderRadius: 12, background: T.goldSoft, color: T.goldDim, border: `1px solid ${T.goldBorder}` }}>{g}</span>)}</div>
              </div>
              <Button variant="outline" color={inCat ? T.green : T.gold} active onClick={(e) => { e.stopPropagation(); addFromTmdb(m); }} disabled={inCat} size="sm" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{inCat ? "✓" : "+ Adicionar"}</Button>
              <span style={{ color: T.dim, fontSize: FS.lg, flexShrink: 0 }}>›</span>
            </div>;
          })}
        </div>}

        {/* FILTERS */}
        {catalog.length > 0 && !showingSearch && <div style={{ marginBottom: SP.xl, marginTop: SP.lg, display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap" }}>
          {[["all", "Todos"], ["quero_ver", "Quero Ver"], ["assistido", "Assistidos"], ["abandonado", "Abandonados"]].map(([v, l]) => <Btn key={v} active={filterStatus === v} onClick={() => setFilterStatus(v)}>{l}</Btn>)}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
            <option value="added">Recentes</option><option value="rating">Nota</option><option value="year">Ano</option><option value="title">Título</option>
          </select>
          {allTags.length > 0 && <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={selectStyle}>
            <option value="">Tags</option>{allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>}
        </div>}

        {/* CATALOG GRID */}
        {!showingSearch && (catalog.length === 0 ?
          <EmptyState icon="🎬" title="Catálogo vazio" hint="Busque ou adicione manualmente" />
          : <>
            {/* Fetch posters button */}
            {tmdb.hasApiKey() && catalog.some(m => !m.poster_path) && (
              <div style={{ marginTop: SP.sm, marginBottom: SP.md }}>
                <Button variant="outline" color={T.gold} active size="sm" onClick={async () => {
                  flash("Buscando pôsteres...", "info");
                  await tmdb.fetchMissingPosters(catalog, (id, data) => update(id, data));
                  flash("Pôsteres atualizados!");
                }}>🖼 Buscar pôsteres ({catalog.filter(m => !m.poster_path).length} sem capa)</Button>
              </div>
            )}
            <div className="catalog-grid">
              {filtered.map((m, i) => (
                <div key={m.id} onClick={() => { setSelected(m); setView("detail"); setStreaming(null); }}
                  style={{ cursor: "pointer", borderRadius: R.lg, overflow: "hidden", transition: "all .3s", animation: `fadeUp .4s ease ${Math.min(i * .03, .5)}s both`, position: "relative" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.03)"; e.currentTarget.style.boxShadow = SH.glow; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  {/* Poster or Fallback */}
                  <div style={{ width: "100%", aspectRatio: "2/3", position: "relative", overflow: "hidden" }}>
                    {m.poster_path ? (
                      <img src={tmdb.posterUrl(m.poster_path)} alt={m.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={e => { e.target.onerror = null; e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"; }} />
                    ) : null}
                    {/* Fallback — styled title card */}
                    <div style={{
                      width: "100%", height: "100%", position: m.poster_path ? "absolute" : "relative",
                      top: 0, left: 0, display: m.poster_path ? "none" : "flex",
                      flexDirection: "column", justifyContent: "flex-end", padding: 14,
                      background: `linear-gradient(135deg, ${T.surface} 0%, #1a1525 50%, #12101a 100%)`,
                    }}>
                      <div style={{ fontSize: 14, color: T.gold, letterSpacing: ".08em", fontWeight: 600, textTransform: "uppercase", marginBottom: 4, opacity: .7 }}>{m.year}</div>
                      <div style={{ fontSize: FS.lg, fontWeight: 600, color: T.text, lineHeight: 1.25, marginBottom: 6 }}>{m.title}</div>
                      <div style={{ fontSize: 14, color: T.muted }}>{m.director}</div>
                      {m.rating > 0 && <div style={{ fontSize: 14, color: T.gold, marginTop: 4 }}>★ {Number(m.rating).toFixed(1)}</div>}
                    </div>

                    {/* Status badge */}
                    <div style={{
                      position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 4,
                      fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                      background: m.status === "assistido" ? T.green + "dd" : m.status === "abandonado" ? T.red + "dd" : T.blue + "dd",
                      color: "#fff", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)"
                    }}>
                      {m.status === "assistido" ? "VISTO" : m.status === "abandonado" ? "DROP" : "LISTA"}
                    </div>

                    {/* Rating badge */}
                    {m.myRating > 0 && (
                      <div style={{
                        position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 3,
                        background: "rgba(0,0,0,.75)", padding: "3px 8px", borderRadius: 4,
                        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)"
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={T.gold} /></svg>
                        <span style={{ fontSize: 14, color: T.gold, fontWeight: 700 }}>{m.myRating}</span>
                      </div>
                    )}

                    {/* Tags badge */}
                    {(m.tags || []).length > 0 && (
                      <div style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: "rgba(0,0,0,.65)", padding: "2px 7px", borderRadius: 4,
                        fontSize: 12, color: T.goldDim, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)"
                      }}>
                        {m.tags[0]}{m.tags.length > 1 ? ` +${m.tags.length - 1}` : ""}
                      </div>
                    )}

                    {/* Hover overlay with info — only for poster cards */}
                    {m.poster_path && (
                      <div className="poster-overlay" style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent 0%, rgba(0,0,0,.9) 100%)",
                        padding: "50px 12px 10px", pointerEvents: "none"
                      }}>
                        <div style={{ fontSize: FS.base, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{m.title}</div>
                        <div style={{ fontSize: 14, color: T.muted, marginTop: 2 }}>{m.year}{m.director ? ` · ${m.director}` : ""}</div>
                      </div>
                    )}
                  </div>

                  {/* Title below poster for poster cards */}
                  {m.poster_path && (
                    <div style={{ padding: "8px 10px 10px", background: T.card }}>
                      <div style={{ fontSize: FS.base, fontWeight: 600, lineHeight: 1.25, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                      <div style={{ fontSize: 14, color: T.dim, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.year}{m.director ? ` · ${m.director}` : ""}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Marketing ocupa a tela inteira (layout próprio, com back) ──
  if (view === "marketing") {
    return (
      <>
        <Notif notif={notif} />
        <Nav view={view} onNavigate={go} />
        <MarketingPlan onBack={() => setView("settings")} />
      </>
    );
  }

  return (
    <>
      <Notif notif={notif} />
      <Nav view={view} onNavigate={go} count={view === "main" ? catalog.length : null} dbCount={DB.length} />
      <div className={`cinapse-page${view === "main" ? " wide" : ""}`}>
        {renderView()}
      </div>
    </>
  );
}
