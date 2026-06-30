import { useState, useEffect, useRef } from "react";
import { DB, searchLocal } from "./db";
import * as tmdb from "./tmdb";
import * as store from "./storage";
import MarketingPlan from "./MarketingPlan";

const T = {
  bg: "#0a0a0f", surface: "#12121a", card: "#16161f", border: "#2a2a3a",
  gold: "#d4a853", goldDim: "#a8843f", goldGlow: "rgba(212,168,83,0.15)",
  red: "#c44040", green: "#4a9e6a", blue: "#5a7ec4", purple: "#8b6fc0",
  text: "#e8e4dc", muted: "#8a8696", dim: "#5a5668",
};

const TAGS = ["Cinapse","Novo Extremismo Francês","Body Horror","Slow Burn","Arthouse","Asiático Extremo","Psicológico","Exploitation","Folk Horror","Giallo","Transgressor","Festival","Cult","Clássico","Obra-prima"];
const svcColors = { sub: T.green, rent: T.blue, buy: T.purple, free: T.gold };
const svcLabels = { sub: "Assinatura", rent: "Aluguel", buy: "Compra", free: "Grátis" };
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


// ─── COMPONENTS ───

function Stars({ n, onRate, size = 18 }) {
  const [h, setH] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2, cursor: onRate ? "pointer" : "default" }}>
      {[1,2,3,4,5].map(i => (
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

function Poster({ path, size = 150 }) {
  if (!path) return <div style={{ width: size, height: size * 1.5, background: T.surface, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, opacity: .3, flexShrink: 0 }}>🎬</div>;
  return <img src={tmdb.posterUrl(path)} alt="" style={{ width: size, height: size * 1.5, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />;
}

function Spinner({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 36 }}>
      <div style={{ display: "inline-block", width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.gold, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      {text && <div style={{ marginTop: 10, fontSize: 16, color: T.muted }}>{text}</div>}
    </div>
  );
}

const Btn = ({ children, active, color, onClick, disabled, style: s }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer", border: `1px solid ${active ? (color || T.gold) + "66" : T.border}`, background: active ? (color || T.gold) + "18" : "transparent", color: active ? (color || T.gold) : T.muted, transition: "all .25s", opacity: disabled ? .5 : 1, boxShadow: active ? `0 0 16px -5px ${(color || T.gold)}aa` : "none", ...s }}>{children}</button>
);

const IS = { width: "100%", padding: "10px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 17, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" };

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
  const [showSettings, setShowSettings] = useState(false);
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

  // ─── TAB BAR ───
  const TabBar = () => (
    <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 12, flexWrap: "wrap" }}>
      {[["main", "Catálogo"], ["watchlists", "Watchlists"], ["checklists", "Listas"], ["stats", "Stats"], ["settings", "⚙"]].map(([v, l]) => (
        <button key={v} onClick={() => { setView(v); resetView(); }} className={view === v ? "cnp-tab-active" : undefined}
          style={{ padding: "8px 16px", borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none", background: view === v ? T.goldGlow : "transparent", color: view === v ? T.gold : T.muted, transition: "all .25s" }}>{l}</button>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════
  // SEARCH PREVIEW
  // ═══════════════════════════════════════════
  if (preview) {
    const m = preview;
    const inCat = catalog.some(c => `${c.title}-${c.year}` === `${m.title}-${m.year}`);
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px", animation: "fadeUp .4s ease" }}>
        <button onClick={() => { setPreview(null); setStreaming(null); }}
          style={{ background: "none", border: "none", color: T.muted, fontSize: 17, cursor: "pointer", padding: 0, marginBottom: 24 }}>← Voltar aos resultados</button>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {m.poster_path && <Poster path={m.poster_path} size={220} />}
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, margin: "0 0 4px" }}>{m.title}</h1>
            {m.original_title && m.original_title !== m.title && <div style={{ fontSize: 17, color: T.muted, fontStyle: "italic" }}>{m.original_title}</div>}
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 17, color: T.muted, flexWrap: "wrap" }}>
              {m.year && <span>{m.year}</span>}
              {m.runtime > 0 && <span>{m.runtime} min</span>}
              {m.director && <span style={{ color: T.gold }}>{m.director}</span>}
              {m.rating > 0 && <span>★ {Number(m.rating).toFixed(1)}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {(m.genres || []).map(g => <span key={g} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 14, fontWeight: 600, background: T.gold + "22", border: `1px solid ${T.gold}66`, color: T.gold }}>{g}</span>)}
            </div>
            {m.overview && <p style={{ fontSize: 17, lineHeight: 1.7, color: T.muted, marginTop: 20 }}>{m.overview}</p>}
            {m.cast?.length > 0 && <div style={{ marginTop: 14, fontSize: 16, color: T.dim }}>Elenco: {m.cast.slice(0, 5).join(", ")}</div>}
          </div>
        </div>

        {/* STREAMING */}
        <div style={{ marginTop: 28, padding: 18, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase" }}>Onde Assistir (Brasil)</span>
            {!streaming && !streamLoading && m._rawTmdbId && (
              <button onClick={() => loadStreaming(m._rawTmdbId)} style={{ background: T.gold + "22", border: `1px solid ${T.gold}44`, borderRadius: 6, color: T.gold, fontSize: 14, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>Buscar no TMDb</button>
            )}
          </div>
          {m.streaming?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {m.streaming.map((s, i) => <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: (svcColors[s.type] || T.blue) + "18", border: `1px solid ${(svcColors[s.type] || T.blue)}44` }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{s.name}</span><br />
                <span style={{ fontSize: 13, color: svcColors[s.type] || T.muted }}>{svcLabels[s.type] || s.type}</span>
              </div>)}
            </div>
          )}
          {streamLoading && <Spinner text="Buscando..." />}
          {streaming && !m.streaming?.length && (
            streaming.services?.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {streaming.services.map((s, i) => <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: (svcColors[s.type] || T.blue) + "18", border: `1px solid ${(svcColors[s.type] || T.blue)}44` }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{s.name}</span><br />
                  <span style={{ fontSize: 13, color: svcColors[s.type] || T.muted }}>{svcLabels[s.type] || s.type}</span>
                </div>)}
              </div>
            ) : <div style={{ fontSize: 16, color: T.dim, fontStyle: "italic" }}>{streaming.note || "Não encontrado"}</div>
          )}
          {!m.streaming?.length && !streaming && !streamLoading && m._source === "local" && <div style={{ fontSize: 16, color: T.dim, fontStyle: "italic" }}>Busque no TMDb para ver streaming</div>}
        </div>

        {/* ADD BUTTON */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={addFromPreview} disabled={inCat}
            style={{ padding: "14px 40px", borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: inCat ? "default" : "pointer",
              background: inCat ? T.green + "22" : T.gold, border: inCat ? `1px solid ${T.green}44` : "none",
              color: inCat ? T.green : T.bg, transition: "all .3s", opacity: inCat ? .8 : 1 }}>
            {inCat ? "✓ Já no catálogo" : "Adicionar ao Catálogo"}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════
  if (view === "detail" && selected) {
    const m = catalog.find(c => c.id === selected.id) || selected;
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px", animation: "fadeUp .5s ease" }}>
        <button onClick={() => { setView("main"); setSelected(null); setEditing(false); setStreaming(null); setShowWlPicker(null); }}
          style={{ background: "none", border: "none", color: T.muted, fontSize: 17, cursor: "pointer", padding: 0, marginBottom: 24 }}>← Voltar</button>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {m.poster_path && <Poster path={m.poster_path} size={200} />}
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, margin: "0 0 4px" }}>{m.title}</h1>
            {m.original_title && m.original_title !== m.title && <div style={{ fontSize: 17, color: T.muted, fontStyle: "italic" }}>{m.original_title}</div>}
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 17, color: T.muted, flexWrap: "wrap" }}>
              {m.year && <span>{m.year}</span>}
              {m.runtime > 0 && <span>{m.runtime} min</span>}
              {m.director && <span style={{ color: T.gold }}>{m.director}</span>}
              {m.rating > 0 && <span>★ {Number(m.rating).toFixed(1)}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {(m.genres || []).map(g => <span key={g} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 14, fontWeight: 600, background: T.gold + "22", border: `1px solid ${T.gold}66`, color: T.gold }}>{g}</span>)}
            </div>
            {m.overview && <p style={{ fontSize: 18, lineHeight: 1.7, color: T.muted, marginTop: 20 }}>{m.overview}</p>}
            {m.cast?.length > 0 && <div style={{ marginTop: 14, fontSize: 16, color: T.dim }}>Elenco: {m.cast.join(", ")}</div>}
          </div>
        </div>

        {/* STREAMING */}
        <div style={{ marginTop: 28, padding: 18, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase" }}>Onde Assistir (Brasil)</span>
            {m.streaming?.length > 0 ? null : !streaming && !streamLoading && m.id < 1e12 && (
              <button onClick={() => loadStreaming(m.id)} style={{ background: T.gold + "22", border: `1px solid ${T.gold}44`, borderRadius: 6, color: T.gold, fontSize: 14, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>Buscar no TMDb</button>
            )}
          </div>
          {/* Embedded streaming from DB */}
          {m.streaming?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {m.streaming.map((s, i) => <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: (svcColors[s.type] || T.blue) + "18", border: `1px solid ${(svcColors[s.type] || T.blue)}44` }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{s.name}</span><br />
                <span style={{ fontSize: 13, color: svcColors[s.type] || T.muted }}>{svcLabels[s.type] || s.type}</span>
              </div>)}
            </div>
          )}
          {/* TMDb streaming fetch */}
          {streamLoading && <Spinner text="Buscando..." />}
          {streaming && !m.streaming?.length && (
            streaming.services?.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {streaming.services.map((s, i) => <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: (svcColors[s.type] || T.blue) + "18", border: `1px solid ${(svcColors[s.type] || T.blue)}44` }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{s.name}</span><br />
                  <span style={{ fontSize: 13, color: svcColors[s.type] || T.muted }}>{svcLabels[s.type] || s.type}</span>
                </div>)}
              </div>
            ) : <div style={{ fontSize: 16, color: T.dim, fontStyle: "italic" }}>{streaming.note || "Não encontrado"}</div>
          )}
          {!m.streaming?.length && !streaming && !streamLoading && m.id >= 1e12 && <div style={{ fontSize: 16, color: T.dim, fontStyle: "italic" }}>Adicionado manualmente — sem dados de streaming</div>}
        </div>

        {/* WATCHLIST PICKER */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <button onClick={() => setShowWlPicker(showWlPicker ? null : m.id)} style={{ background: T.purple + "18", border: `1px solid ${T.purple}44`, borderRadius: 6, color: T.purple, fontSize: 14, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>+ Watchlist</button>
          {showWlPicker === m.id && (
            <div style={{ position: "absolute", top: 36, left: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8, zIndex: 10, minWidth: 220, animation: "fadeUp .2s ease", boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
              {watchlists.length > 0 ? watchlists.map(wl => (
                <div key={wl.id} onClick={() => addToWatchlist(wl.id, m.id)} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 16, color: T.text, transition: "background .15s" }}
                  onMouseEnter={e => e.target.style.background = T.card} onMouseLeave={e => e.target.style.background = "transparent"}>
                  {wl.name} <span style={{ color: T.dim, fontSize: 14 }}>({wl.movieIds.length})</span>
                </div>
              )) : <div style={{ padding: 10, fontSize: 15, color: T.dim }}>Crie na aba Watchlists</div>}
            </div>
          )}
        </div>

        {/* CATALOG FIELDS */}
        <div style={{ marginTop: 28, borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[["quero_ver", "Quero Ver", T.blue], ["assistido", "Assistido", T.green], ["abandonado", "Abandonado", T.red]].map(([s, l, c]) => (
              <Btn key={s} active={m.status === s} color={c} onClick={() => update(m.id, { status: s })}>{l}</Btn>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, color: T.dim, marginBottom: 6, letterSpacing: ".1em", textTransform: "uppercase" }}>Minha Nota</div>
            <Stars n={m.myRating} onRate={r => update(m.id, { myRating: r })} size={24} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, color: T.dim, marginBottom: 8, letterSpacing: ".1em", textTransform: "uppercase" }}>Tags</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TAGS.map(t => <span key={t} onClick={() => toggleTag(m.id, t)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: (m.tags || []).includes(t) ? T.gold + "22" : "transparent", border: `1px solid ${(m.tags || []).includes(t) ? T.gold + "66" : T.border}`, color: (m.tags || []).includes(t) ? T.gold : T.muted, transition: "all .25s", userSelect: "none" }}>{t}</span>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, color: T.dim, marginBottom: 8, letterSpacing: ".1em", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
              Anotações
              <button onClick={() => { if (editing) update(m.id, { notes: notesDraft }); else setNotesDraft(m.notes || ""); setEditing(!editing); }}
                style={{ background: "none", border: "none", color: T.gold, fontSize: 15, cursor: "pointer" }}>{editing ? "Salvar" : m.notes ? "Editar" : "Adicionar"}</button>
            </div>
            {editing ? <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} placeholder="Ideias pro Cinapse..." style={{ ...IS, minHeight: 100, resize: "vertical", lineHeight: 1.7 }} />
              : m.notes ? <div style={{ fontSize: 17, color: T.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.notes}</div>
              : <div style={{ fontSize: 16, color: T.dim, fontStyle: "italic" }}>Nenhuma anotação</div>}
          </div>
          <button onClick={() => remove(m.id)} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, fontSize: 15, padding: "6px 14px", cursor: "pointer", opacity: .6, transition: "opacity .25s" }}
            onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = .6}>Remover do catálogo</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // WATCHLISTS
  // ═══════════════════════════════════════════
  if (view === "watchlists") {
    if (selWatchlist) {
      const wl = watchlists.find(w => w.id === selWatchlist.id);
      if (!wl) { setSelWatchlist(null); return null; }
      const movies = wl.movieIds.map(id => catalog.find(c => c.id === id)).filter(Boolean);
      const watched = movies.filter(m => m.status === "assistido").length;
      return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
          <button onClick={() => setSelWatchlist(null)} style={{ background: "none", border: "none", color: T.muted, fontSize: 17, cursor: "pointer", padding: 0, marginBottom: 20 }}>← Voltar</button>
          <h2 style={{ fontSize: 28, fontWeight: 400, color: T.gold, margin: "0 0 4px" }}>{wl.name}</h2>
          {wl.desc && <div style={{ fontSize: 16, color: T.muted, marginBottom: 8 }}>{wl.desc}</div>}
          {movies.length > 0 && <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}><span style={{ fontSize: 15, color: T.muted }}>{watched}/{movies.length} assistidos</span><div style={{ flex: 1, maxWidth: 160, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${(watched / movies.length) * 100}%`, height: "100%", background: T.green, borderRadius: 3, transition: "width .5s" }} /></div></div>}
          {movies.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.dim }}>Adicione filmes pela ficha do catálogo.</div>}
          {movies.map((m, i) => (
            <div key={m.id} style={{ display: "flex", gap: 14, padding: "12px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 8, animation: `fadeUp .3s ease ${i * .04}s both`, alignItems: "center" }}>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelected(m); setView("detail"); }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({m.year})</span></div>
                <div style={{ fontSize: 15, color: T.muted, marginTop: 2 }}>{m.director}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 7px", borderRadius: 4, background: m.status === "assistido" ? T.green + "cc" : T.blue + "cc", color: "#fff" }}>{m.status === "assistido" ? "VISTO" : "LISTA"}</span>
              <button onClick={() => removeFromWatchlist(wl.id, m.id)} style={{ background: "none", border: "none", color: T.red, fontSize: 16, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = .4}>×</button>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 300, color: T.gold, margin: 0 }}>Watchlists Temáticas</h2>
          <Btn active onClick={() => setShowWlCreate(!showWlCreate)}>+ Nova</Btn>
        </div>
        {showWlCreate && <div style={{ padding: 18, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20, animation: "fadeUp .3s ease" }}>
          <input value={wlName} onChange={e => setWlName(e.target.value)} placeholder="Nome (ex: Maratona Gaspar Noé)" onKeyDown={e => e.key === "Enter" && createWatchlist()} style={IS} />
          <input value={wlDesc} onChange={e => setWlDesc(e.target.value)} placeholder="Descrição (opcional)" style={{ ...IS, fontSize: 16, marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}><button onClick={createWatchlist} style={{ padding: "8px 20px", background: T.gold, border: "none", borderRadius: 6, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Criar</button><button onClick={() => setShowWlCreate(false)} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, fontSize: 16, cursor: "pointer" }}>Cancelar</button></div>
        </div>}
        {watchlists.length === 0 && !showWlCreate && <div style={{ textAlign: "center", padding: "40px 20px", color: T.dim }}><div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>📋</div><div style={{ fontSize: 18, color: T.muted }}>Nenhuma watchlist</div></div>}
        {watchlists.map((wl, i) => {
          const movies = wl.movieIds.map(id => catalog.find(c => c.id === id)).filter(Boolean);
          const w = movies.filter(m => m.status === "assistido").length;
          return <div key={wl.id} onClick={() => setSelWatchlist(wl)} style={{ padding: "16px 20px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", transition: "all .3s", marginBottom: 10, animation: `fadeUp .3s ease ${i * .05}s both` }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple + "66"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: 20, fontWeight: 600 }}>{wl.name}</div>{wl.desc && <div style={{ fontSize: 15, color: T.dim, marginTop: 2 }}>{wl.desc}</div>}</div>
              <button onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }} style={{ background: "none", border: "none", color: T.red, fontSize: 17, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = .4}>×</button></div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 15, color: T.muted }}><span>{movies.length} filme{movies.length !== 1 ? "s" : ""}</span>{movies.length > 0 && <><span style={{ color: T.green }}>{w} visto{w !== 1 ? "s" : ""}</span><div style={{ flex: 1, maxWidth: 120, height: 4, background: T.border, borderRadius: 2, alignSelf: "center", overflow: "hidden" }}><div style={{ width: `${(w / movies.length) * 100}%`, height: "100%", background: T.green, borderRadius: 2, transition: "width .5s" }} /></div></>}</div>
          </div>;
        })}

        {/* CURATED WATCHLISTS */}
        <div style={{ marginTop: 36, borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
          <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 16 }}>Watchlists Curadas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {CURATED_WATCHLISTS.map(cw => {
              const exists = watchlists.some(w => w.name === cw.name);
              const count = DB.filter(cw.match).length;
              return <div key={cw.name} onClick={() => !exists && createCuratedWatchlist(cw)}
                style={{ padding: "14px 16px", background: exists ? T.surface : T.card, border: `1px solid ${exists ? T.green + "44" : T.border}`, borderRadius: 10, cursor: exists ? "default" : "pointer", transition: "all .3s", opacity: exists ? .6 : 1 }}
                onMouseEnter={e => { if (!exists) { e.currentTarget.style.borderColor = T.gold + "66"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = exists ? T.green + "44" : T.border; e.currentTarget.style.transform = "none"; }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{cw.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: exists ? T.green : T.text }}>{exists ? "✓ " : ""}{cw.name}</div>
                <div style={{ fontSize: 14, color: T.dim, marginTop: 4, lineHeight: 1.4 }}>{cw.desc}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>{count} filme{count !== 1 ? "s" : ""}</div>
              </div>;
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // CHECKLISTS
  // ═══════════════════════════════════════════
  if (view === "checklists") {
    if (selChecklist) {
      const cl = checklists.find(c => c.id === selChecklist.id); if (!cl) { setSelChecklist(null); return null; }
      const done = cl.items.filter(i => i.done).length;
      return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
          <button onClick={() => setSelChecklist(null)} style={{ background: "none", border: "none", color: T.muted, fontSize: 17, cursor: "pointer", padding: 0, marginBottom: 20 }}>← Voltar</button>
          <h2 style={{ fontSize: 28, fontWeight: 400, color: T.gold, margin: "0 0 4px" }}>{cl.name}</h2>
          {cl.items.length > 0 && <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, marginTop: 8 }}><span style={{ fontSize: 15, color: T.muted }}>{done}/{cl.items.length}</span><div style={{ flex: 1, maxWidth: 180, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${cl.items.length ? ((done / cl.items.length) * 100) : 0}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.green})`, borderRadius: 3, transition: "width .5s" }} /></div></div>}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={clInput} onChange={e => setClInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addChecklistItem(cl.id)} placeholder="Adicionar filme..."
              style={{ ...IS, flex: 1, marginBottom: 0 }} onFocus={e => e.target.style.borderColor = T.gold + "66"} onBlur={e => e.target.style.borderColor = T.border} />
            <button onClick={() => addChecklistItem(cl.id)} style={{ padding: "11px 18px", background: T.gold, border: "none", borderRadius: 8, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>+</button>
          </div>
          {cl.items.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.dim, fontSize: 17 }}>Digite filmes acima</div>}
          {cl.items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.card, border: `1px solid ${item.done ? T.green + "33" : T.border}`, borderRadius: 8, marginBottom: 6, animation: `fadeUp .3s ease ${i * .03}s both`, transition: "all .3s" }}>
              <div onClick={() => toggleCheckItem(cl.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? T.green : T.border}`, background: item.done ? T.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .25s", flexShrink: 0 }}>
                {item.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
              </div>
              <span style={{ flex: 1, fontSize: 18, color: item.done ? T.dim : T.text, textDecoration: item.done ? "line-through" : "none", transition: "all .3s", fontStyle: item.done ? "italic" : "normal" }}>{item.text}</span>
              <button onClick={() => removeCheckItem(cl.id, item.id)} style={{ background: "none", border: "none", color: T.red, fontSize: 16, cursor: "pointer", opacity: .3 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = .3}>×</button>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 300, color: T.gold, margin: 0 }}>Listas de Filmes</h2>
          <Btn active onClick={() => setShowClCreate(!showClCreate)}>+ Nova</Btn>
        </div>
        {showClCreate && <div style={{ padding: 18, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20, animation: "fadeUp .3s ease" }}>
          <input value={clName} onChange={e => setClName(e.target.value)} placeholder="Nome da lista" onKeyDown={e => e.key === "Enter" && createChecklist()} style={IS} />
          <div style={{ display: "flex", gap: 8 }}><button onClick={createChecklist} style={{ padding: "8px 20px", background: T.gold, border: "none", borderRadius: 6, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Criar</button><button onClick={() => setShowClCreate(false)} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, fontSize: 16, cursor: "pointer" }}>Cancelar</button></div>
        </div>}
        {checklists.length === 0 && !showClCreate && <div style={{ textAlign: "center", padding: "60px 20px", color: T.dim }}><div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>✅</div><div style={{ fontSize: 18, color: T.muted }}>Nenhuma lista</div><div style={{ fontSize: 16, marginTop: 6 }}>Monte listas e vá riscando</div></div>}
        {checklists.map((cl, i) => {
          const done = cl.items.filter(x => x.done).length;
          return <div key={cl.id} onClick={() => setSelChecklist(cl)} style={{ padding: "16px 20px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", transition: "all .3s", marginBottom: 10, animation: `fadeUp .3s ease ${i * .05}s both` }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold + "44"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 20, fontWeight: 600 }}>{cl.name}</div>
              <button onClick={e => { e.stopPropagation(); deleteChecklist(cl.id); }} style={{ background: "none", border: "none", color: T.red, fontSize: 17, cursor: "pointer", opacity: .4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = .4}>×</button></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 15, color: T.muted }}><span>{cl.items.length} filme{cl.items.length !== 1 ? "s" : ""}</span>{cl.items.length > 0 && <><span style={{ color: T.green }}>{done} assistido{done !== 1 ? "s" : ""}</span><div style={{ flex: 1, maxWidth: 120, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${cl.items.length ? ((done / cl.items.length) * 100) : 0}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.green})`, borderRadius: 2, transition: "width .5s" }} /></div></>}</div>
          </div>;
        })}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════
  if (view === "stats") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
        <h2 style={{ fontSize: 28, fontWeight: 300, color: T.gold, marginBottom: 28 }}>Estatísticas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14, marginBottom: 36 }}>
          {[["Total", stats.total, T.text], ["Assistidos", stats.watched, T.green], ["Quero Ver", stats.want, T.blue], ["Nota Média", stats.avg, T.gold]].map(([l, v, c]) => (
            <div key={l} style={{ background: T.surface, borderRadius: 12, padding: 18, textAlign: "center", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 32, fontWeight: 300, color: c }}>{v}</div>
              <div style={{ fontSize: 13, color: T.muted, letterSpacing: ".15em", textTransform: "uppercase", marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
        {stats.genres.length > 0 && <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 16, color: T.dim, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 12 }}>Top Gêneros</div>
          {stats.genres.map(([g, n]) => <div key={g} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><div style={{ width: 110, fontSize: 16, color: T.muted, textAlign: "right" }}>{g}</div><div style={{ flex: 1, height: 6, background: T.surface, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${(n / stats.genres[0][1]) * 100}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.goldDim})`, borderRadius: 3, transition: "width .8s" }} /></div><div style={{ fontSize: 16, color: T.muted, width: 24 }}>{n}</div></div>)}
        </div>}
        {stats.directors.length > 0 && <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 16, color: T.dim, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 12 }}>Top Diretores</div>
          {stats.directors.map(([d, n]) => <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}22`, fontSize: 17 }}><span>{d}</span><span style={{ color: T.gold }}>{n}</span></div>)}
        </div>}
        {catalog.length === 0 && <div style={{ textAlign: "center", color: T.dim, marginTop: 60 }}>Adicione filmes para ver estatísticas.</div>}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════
  if (view === "settings") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}><TabBar />
        <h2 style={{ fontSize: 28, fontWeight: 300, color: T.gold, marginBottom: 28 }}>Configurações</h2>
        <div style={{ padding: 20, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>TMDb API Key</div>
          <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Com a chave do TMDb, a busca retorna filmes de todo o catálogo mundial com pôsteres, sinopses, elenco e dados de streaming atualizados. Sem ela, a busca usa apenas o banco local de {DB.length} filmes curados.
          </p>
          <p style={{ fontSize: 16, color: T.dim, marginBottom: 16 }}>
            Gratuita em <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: T.gold, textDecoration: "none" }}>themoviedb.org/settings/api</a>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Cole sua API key aqui..."
              style={{ ...IS, flex: 1, marginBottom: 0, fontFamily: "monospace", fontSize: 16 }} />
            <button onClick={() => { tmdb.setApiKey(keyInput.trim()); flash("API key salva!"); }}
              style={{ padding: "10px 20px", background: T.gold, border: "none", borderRadius: 8, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Salvar</button>
          </div>
          {tmdb.hasApiKey() && <div style={{ marginTop: 10, fontSize: 15, color: T.green }}>✓ API key configurada</div>}
        </div>
        <div style={{ padding: 20, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Backup & Sincronização</div>
          <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Exporte um arquivo JSON com seu catálogo, watchlists, listas e API key. Importe em outro dispositivo (ex: iPhone) para migrar tudo de uma vez.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleExport}
              style={{ padding: "10px 20px", background: T.gold, border: "none", borderRadius: 8, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Exportar JSON</button>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${T.gold}66`, borderRadius: 8, color: T.gold, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Importar JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} style={{ display: "none" }} />
          </div>
        </div>
        <div style={{ padding: 20, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Dados</div>
          <div style={{ fontSize: 16, color: T.muted }}>{catalog.length} filmes · {watchlists.length} watchlists · {checklists.length} listas</div>
          <div style={{ fontSize: 15, color: T.dim, marginTop: 8 }}>Banco local: {DB.length} filmes curados</div>
        </div>
        <div style={{ padding: 20, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginTop: 20 }}>
          <div style={{ fontSize: 12, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Sobre o Cinapse</div>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16, margin: "0 0 16px" }}>
            Conheça a estratégia de marketing e crescimento do Cinapse.
          </p>
          <button onClick={() => setView("marketing")}
            style={{ padding: "10px 20px", background: T.gold + "22", border: `1px solid ${T.gold}44`, borderRadius: 8, color: T.gold, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif" }}>
            Ver Plano de Marketing
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MARKETING PLAN
  // ═══════════════════════════════════════════
  if (view === "marketing") {
    return <MarketingPlan onBack={() => setView("settings")} />;
  }

  // ═══════════════════════════════════════════
  // MARKETING PLAN
  // ═══════════════════════════════════════════
  if (view === "marketing") {
    return <MarketingPlan onBack={() => setView("settings")} />;
  }

  // ═══════════════════════════════════════════
  // MAIN CATALOG
  // ═══════════════════════════════════════════
  const hasResults = searchMode === "local" ? localResults.length > 0 : tmdbResults.length > 0;
  const showingSearch = (query.length >= 2 && (hasResults || loading || searchError)) || hasResults || showAllLocal;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      {notif && <div style={{ position: "fixed", top: "max(20px, env(safe-area-inset-top))", right: "max(20px, env(safe-area-inset-right))", zIndex: 100, padding: "12px 20px", borderRadius: 8, fontSize: 16, fontWeight: 600, background: notif.type === "ok" ? T.green + "dd" : notif.type === "info" ? T.blue + "dd" : T.red + "dd", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.4)", animation: "fadeUp .3s ease" }}>{notif.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div className="cnp-title" style={{ fontSize: 40, letterSpacing: ".1em", fontWeight: 600, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>CINAPSE</div>
          <div style={{ fontSize: 14, color: T.dim, letterSpacing: ".2em", textTransform: "uppercase" }}>{catalog.length} filme{catalog.length !== 1 ? "s" : ""} · {DB.length} no banco</div>
        </div>
      </div>
      <TabBar />

      {/* SEARCH */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input value={query} onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchMode === "tmdb") doTmdbSearch(); }}
              placeholder={searchMode === "local" ? "Buscar no banco local..." : "Buscar no TMDb... (Enter)"}
              style={{ width: "100%", padding: "13px 44px 13px 18px", background: "rgba(20,18,12,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1px solid ${T.gold}22`, borderRadius: 12, color: T.text, fontSize: 18, outline: "none", fontFamily: "inherit", transition: "border-color .3s, box-shadow .3s", boxSizing: "border-box" }}
              onFocus={e => { e.target.style.borderColor = T.gold + "66"; e.target.style.boxShadow = `0 0 24px -6px ${T.goldGlow}`; }} onBlur={e => { e.target.style.borderColor = T.gold + "22"; e.target.style.boxShadow = "none"; }} />
            {query && (
              <button onClick={() => { setQuery(""); setLocalResults([]); setTmdbResults([]); setSearchError(""); setShowAllLocal(false); }}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: T.border, border: "none", color: T.muted, fontSize: 16, cursor: "pointer", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.red + "44"; e.currentTarget.style.color = T.red; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.muted; }}>×</button>
            )}
          </div>
          {searchMode === "tmdb" && (
            <button onClick={doTmdbSearch} disabled={loading || !query.trim()}
              style={{ padding: "13px 22px", background: loading ? T.surface : T.gold, border: "none", borderRadius: 10, color: loading ? T.muted : T.bg, fontWeight: 700, fontSize: 17, cursor: loading ? "wait" : "pointer", opacity: !query.trim() ? .5 : 1, whiteSpace: "nowrap" }}>
              {loading ? "..." : "Buscar"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <Btn active={searchMode === "local"} onClick={() => { setSearchMode("local"); setTmdbResults([]); setSearchError(""); if (query.length >= 2) doLocalSearch(query); }}>Local ({DB.length})</Btn>
            <Btn active={searchMode === "tmdb"} color={tmdb.hasApiKey() ? T.gold : T.dim} onClick={() => { setSearchMode("tmdb"); setLocalResults([]); }}>TMDb {tmdb.hasApiKey() ? "✓" : "🔑"}</Btn>
          </div>
          <button onClick={() => setShowManual(!showManual)} style={{ background: "none", border: "none", color: T.muted, fontSize: 15, cursor: "pointer", textDecoration: "underline", padding: 0 }}>{showManual ? "Fechar" : "+ Manual"}</button>
          {searchMode === "local" && <button onClick={() => { setShowAllLocal(!showAllLocal); setLocalResults(showAllLocal ? [] : DB); setQuery(""); }} style={{ background: "none", border: "none", color: T.gold, fontSize: 15, cursor: "pointer", textDecoration: "underline", padding: 0 }}>{showAllLocal ? "Fechar catálogo" : `Ver todos (${DB.length})`}</button>}
        </div>
      </div>

      {/* MANUAL ADD */}
      {showManual && <div style={{ padding: 18, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20, marginTop: 12, animation: "fadeUp .3s ease" }}>
        <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Adicionar Manualmente</div>
        <input value={manTitle} onChange={e => setManTitle(e.target.value)} placeholder="Título *" onKeyDown={e => e.key === "Enter" && addManual()} style={IS} />
        <div style={{ display: "flex", gap: 8 }}><input value={manYear} onChange={e => setManYear(e.target.value)} placeholder="Ano" style={{ ...IS, flex: 1 }} /><input value={manDirector} onChange={e => setManDirector(e.target.value)} placeholder="Diretor" style={{ ...IS, flex: 2 }} /></div>
        <input value={manGenres} onChange={e => setManGenres(e.target.value)} placeholder="Gêneros (vírgula)" style={{ ...IS, marginBottom: 12 }} />
        <button onClick={addManual} disabled={!manTitle.trim()} style={{ padding: "8px 20px", background: T.gold, border: "none", borderRadius: 6, color: T.bg, fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: !manTitle.trim() ? .5 : 1 }}>Adicionar</button>
      </div>}

      {/* LOADING */}
      {previewLoading && <Spinner text="Carregando detalhes..." />}
      {loading && <Spinner text="Buscando no TMDb..." />}
      {searchError && !loading && <div style={{ padding: 16, textAlign: "center", color: T.red, fontSize: 16, background: T.red + "11", borderRadius: 8, marginTop: 12, marginBottom: 16 }}>{searchError}</div>}

      {/* LOCAL RESULTS */}
      {searchMode === "local" && (localResults.length > 0 || showAllLocal) && <div style={{ marginTop: 16, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 15, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase" }}>{localResults.length} resultado{localResults.length !== 1 ? "s" : ""} <span style={{ fontSize: 13, fontWeight: 400, opacity: .7 }}>— clique para detalhes</span></div>
          {showAllLocal && <div style={{ display: "flex", gap: 6 }}>
            {[["title", "A-Z"], ["rating", "Nota ↓"], ["year", "Ano ↓"]].map(([k, label]) => (
              <button key={k} onClick={() => { setLocalSort(k); setLocalResults(prev => [...prev].sort(k === "rating" ? (a, b) => (b.rating || 0) - (a.rating || 0) : k === "year" ? (a, b) => (b.year || 0) - (a.year || 0) : (a, b) => (a.title || "").localeCompare(b.title || ""))); }}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${localSort === k ? T.gold + "66" : T.border}`, background: localSort === k ? T.gold + "18" : "transparent", color: localSort === k ? T.gold : T.muted, transition: "all .2s" }}>{label}</button>
            ))}
          </div>}
        </div>
        {localResults.map((m, i) => {
          const inCat = catalog.some(c => c.title === m.title && c.year === m.year);
          return <div key={i} onClick={() => previewLocal(m)} style={{ display: "flex", gap: 16, padding: "12px 16px", background: T.card, border: `1px solid ${inCat ? T.gold + "44" : T.border}`, borderRadius: 10, marginBottom: 8, animation: `fadeUp .35s ease ${i * .05}s both`, alignItems: "center", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = T.gold + "66"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = inCat ? T.gold + "44" : T.border; }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({m.year})</span></div>
              <div style={{ fontSize: 15, color: T.muted, marginTop: 3 }}>{m.director && <span style={{ color: T.gold }}>{m.director}</span>}{m.runtime > 0 && <span> · {m.runtime}min</span>}{m.rating > 0 && <span> · ★{Number(m.rating).toFixed(1)}</span>}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>{(m.genres || []).slice(0, 4).map(g => <span key={g} style={{ fontSize: 13, padding: "2px 8px", borderRadius: 12, background: T.gold + "15", color: T.goldDim, border: `1px solid ${T.gold}22` }}>{g}</span>)}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); addFromLocal(m); }} disabled={inCat} style={{ padding: "8px 16px", border: `1px solid ${inCat ? T.green + "44" : T.gold + "44"}`, borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: inCat ? "default" : "pointer", background: inCat ? T.green + "11" : "transparent", color: inCat ? T.green : T.gold, whiteSpace: "nowrap", flexShrink: 0 }}>{inCat ? "✓" : "+ Adicionar"}</button>
            <span style={{ color: T.dim, fontSize: 18, flexShrink: 0 }}>›</span>
          </div>;
        })}
      </div>}

      {/* TMDB RESULTS */}
      {searchMode === "tmdb" && !loading && tmdbResults.length > 0 && <div style={{ marginTop: 16, marginBottom: 28 }}>
        <div style={{ fontSize: 15, color: T.dim, marginBottom: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>{tmdbResults.length} resultado{tmdbResults.length !== 1 ? "s" : ""} do TMDb <span style={{ fontSize: 13, fontWeight: 400, opacity: .7 }}>— clique para detalhes</span></div>
        {tmdbResults.map((m, i) => {
          const yr = (m.release_date || "").slice(0, 4);
          const inCat = catalog.some(c => c.title === m.title && c.year === yr);
          return <div key={m.id} onClick={() => previewTmdb(m)} style={{ display: "flex", gap: 14, padding: "12px 16px", background: T.card, border: `1px solid ${inCat ? T.gold + "44" : T.border}`, borderRadius: 10, marginBottom: 8, animation: `fadeUp .35s ease ${i * .05}s both`, alignItems: "center", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.borderColor = T.gold + "66"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = inCat ? T.gold + "44" : T.border; }}>
            {m.poster_path && <img src={tmdb.posterUrl(m.poster_path, "w92")} alt="" style={{ width: 46, height: 69, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{m.title} <span style={{ fontWeight: 300, color: T.dim }}>({yr})</span></div>
              {m.vote_average > 0 && <div style={{ fontSize: 15, color: T.gold, marginTop: 2 }}>★ {m.vote_average.toFixed(1)}</div>}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>{tmdb.genreNames(m.genre_ids).slice(0, 4).map(g => <span key={g} style={{ fontSize: 13, padding: "2px 8px", borderRadius: 12, background: T.gold + "15", color: T.goldDim, border: `1px solid ${T.gold}22` }}>{g}</span>)}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); addFromTmdb(m); }} disabled={inCat} style={{ padding: "8px 16px", border: `1px solid ${inCat ? T.green + "44" : T.gold + "44"}`, borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: inCat ? "default" : "pointer", background: inCat ? T.green + "11" : "transparent", color: inCat ? T.green : T.gold, whiteSpace: "nowrap", flexShrink: 0 }}>{inCat ? "✓" : "+ Adicionar"}</button>
            <span style={{ color: T.dim, fontSize: 18, flexShrink: 0 }}>›</span>
          </div>;
        })}
      </div>}

      {/* FILTERS */}
      {catalog.length > 0 && !showingSearch && <div style={{ marginBottom: 20, marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[["all", "Todos"], ["quero_ver", "Quero Ver"], ["assistido", "Assistidos"], ["abandonado", "Abandonados"]].map(([v, l]) => <Btn key={v} active={filterStatus === v} onClick={() => setFilterStatus(v)}>{l}</Btn>)}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "6px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, fontSize: 14, outline: "none" }}>
          <option value="added">Recentes</option><option value="rating">Nota</option><option value="year">Ano</option><option value="title">Título</option>
        </select>
        {allTags.length > 0 && <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ padding: "6px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, fontSize: 14, outline: "none" }}>
          <option value="">Tags</option>{allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>}
      </div>}

      {/* CATALOG GRID */}
      {!showingSearch && (catalog.length === 0 ?
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.dim }}><div style={{ fontSize: 44, marginBottom: 12, opacity: .3 }}>🎬</div><div style={{ fontSize: 18, color: T.muted }}>Catálogo vazio</div><div style={{ fontSize: 16, marginTop: 6 }}>Busque ou adicione manualmente</div></div>
        : <>
          {/* Fetch posters button */}
          {tmdb.hasApiKey() && catalog.some(m => !m.poster_path) && (
            <div style={{ marginTop: 8, marginBottom: 12 }}>
              <button onClick={async () => {
                flash("Buscando pôsteres...", "info");
                await tmdb.fetchMissingPosters(catalog, (id, data) => update(id, data));
                flash("Pôsteres atualizados!");
              }} style={{ background: T.gold + "18", border: `1px solid ${T.gold}44`, borderRadius: 6, color: T.gold, fontSize: 14, fontWeight: 600, padding: "6px 14px", cursor: "pointer", transition: "all .25s" }}>
                🖼 Buscar pôsteres ({catalog.filter(m => !m.poster_path).length} sem capa)
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginTop: 8, perspective: 1100 }}>
            {filtered.map((m, i) => (
              <div key={m.id} onClick={() => { setSelected(m); setView("detail"); setStreaming(null); }} className="cnp-card"
                style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", transition: "transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s, border-color .25s", animation: `fadeUp .4s ease ${Math.min(i * .03, .5)}s both`, position: "relative", transformStyle: "preserve-3d", border: `1px solid ${T.border}` }}
                onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; e.currentTarget.style.transform = `translateY(-6px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) scale(1.04)`; e.currentTarget.style.boxShadow = `0 26px 56px rgba(0,0,0,.6), 0 0 38px ${T.goldGlow}`; e.currentTarget.style.borderColor = T.gold + "66"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = T.border; }}>
                <div className="cnp-sheen" />
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
                    <div style={{ fontSize: 18, fontWeight: 600, color: T.text, lineHeight: 1.25, marginBottom: 6 }}>{m.title}</div>
                    <div style={{ fontSize: 14, color: T.muted }}>{m.director}</div>
                    {m.rating > 0 && <div style={{ fontSize: 14, color: T.gold, marginTop: 4 }}>★ {Number(m.rating).toFixed(1)}</div>}
                  </div>

                  {/* Status badge */}
                  <div className="cnp-badge" style={{
                    position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                    background: m.status === "assistido" ? T.green + "dd" : m.status === "abandonado" ? T.red + "dd" : T.blue + "dd",
                    color: "#fff", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 4
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
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{m.title}</div>
                      <div style={{ fontSize: 14, color: T.muted, marginTop: 2 }}>{m.year}{m.director ? ` · ${m.director}` : ""}</div>
                    </div>
                  )}
                </div>

                {/* Title below poster for poster cards */}
                {m.poster_path && (
                  <div style={{ padding: "8px 10px 10px", background: T.card }}>
                    <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
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
}
