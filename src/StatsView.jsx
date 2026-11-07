import { useMemo } from "react";
import { aggregateCatalog } from "./stats.js";

const VISIBLE = 8;

function plural(count, one, many) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? one : many}`;
}

function formatRating(value) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function hoursParts(minutes) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (total <= 0) return { value: "0", unit: "h" };
  if (hours === 0) return { value: String(rest), unit: "min" };
  if (rest === 0) return { value: String(hours), unit: "h" };
  return { value: String(hours), unit: `h ${rest} min` };
}

function monthSummary(months) {
  return months.map((month) => {
    if (month.count === 0) return `${month.label}: nenhum`;
    return `${month.label}: ${plural(month.count, "filme", "filmes")}`;
  }).join("; ");
}

function Gate({ value, unit, idle }) {
  return (
    <div className={idle ? "stats-gate stats-gate-idle" : "stats-gate"}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="56" fill="none" stroke="#2e2c36" strokeWidth="1" />
        {!idle && (
          <circle cx="60" cy="60" r="56" fill="none" stroke="#d4a853" strokeWidth="1.5"
            strokeDasharray="88 264" strokeLinecap="butt" transform="rotate(-90 60 60)" />
        )}
      </svg>
      <div className="stats-gate-figure">
        <span className="stats-gate-value">{value}</span>
        <span className="stats-gate-unit">{unit}</span>
      </div>
    </div>
  );
}

function MonthChart({ months }) {
  const max = Math.max(...months.map((month) => month.count), 1);
  const slot = 48;
  const width = months.length * slot;
  const height = 168;
  const padTop = 22;
  const padBottom = 40;
  const inner = height - padTop - padBottom;
  return (
    <div className="stats-chart" tabIndex={months.length > 7 ? 0 : undefined}>
      <svg role="img" aria-label={monthSummary(months)} viewBox={`0 0 ${width} ${height}`}
        style={{ width: months.length > 7 ? width : "100%", height }}>
        {months.map((month, index) => {
          const bar = month.count === 0 ? 2 : Math.max(6, (month.count / max) * inner);
          const x = index * slot + (slot - 16) / 2;
          const y = padTop + inner - bar;
          const showYear = index === 0 || month.year !== months[index - 1].year;
          return (
            <g key={month.key}>
              {month.count > 0 && (
                <text x={x + 8} y={y - 6} textAnchor="middle" fill="#e9e2d4" fontSize="11"
                  fontFamily="Space Mono, ui-monospace, monospace">{month.count}</text>
              )}
              <rect x={x} y={y} width="16" height={bar} fill={month.count === 0 ? "#2e2c36" : "#d4a853"} />
              <text x={x + 8} y={height - 16} textAnchor="middle" fill="#b4aea1" fontSize="11"
                fontFamily="Space Mono, ui-monospace, monospace">{month.label.slice(0, 3)}</text>
              {showYear && (
                <text x={x + 8} y={height - 2} textAnchor="middle" fill="#8d8779" fontSize="10"
                  fontFamily="Space Mono, ui-monospace, monospace">{month.year}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RatingList({ rows, empty }) {
  if (rows.length === 0) return <p className="stats-quiet">{empty}</p>;
  const shown = rows.slice(0, VISIBLE);
  const rest = rows.length - shown.length;
  return (
    <>
      <ol className="stats-rank">
        {shown.map((row) => (
          <li key={row.name}>
            <span className="stats-rank-name">{row.name}</span>
            <span className="stats-rank-value">
              <strong>{formatRating(row.average)}</strong>
              <small>{plural(row.count, "filme", "filmes")}</small>
            </span>
            <span className="stats-rank-track" aria-hidden="true">
              <span className="stats-rank-fill" style={{ width: `${Math.min(100, (row.average / 5) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ol>
      {rest > 0 && <p className="stats-quiet">{plural(rest, "outro ficou de fora desta lista", "outros ficaram de fora desta lista")}.</p>}
    </>
  );
}

function FrequencyList({ rows, empty }) {
  if (rows.length === 0) return <p className="stats-quiet">{empty}</p>;
  const shown = rows.slice(0, VISIBLE);
  const rest = rows.length - shown.length;
  const max = shown[0].count;
  return (
    <>
      <ol className="stats-rank">
        {shown.map((row) => (
          <li key={row.name}>
            <span className="stats-rank-name">{row.name}</span>
            <span className="stats-rank-value">
              <strong>{row.count}</strong>
              <small>{row.count === 1 ? "filme" : "filmes"}</small>
            </span>
            <span className="stats-rank-track" aria-hidden="true">
              <span className="stats-rank-fill stats-rank-fill-dim" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ol>
      {rest > 0 && <p className="stats-quiet">Mais {plural(rest, "nome no catálogo", "nomes no catálogo")}.</p>}
    </>
  );
}

function EmptyCatalog() {
  return (
    <div className="stats-empty">
      <Gate value="—" unit="" idle />
      <h2 id="stats-heading">Nada nesta bobina</h2>
      <p>Adicione um filme ao catálogo e marque se você quer ver, já assistiu ou abandonou. As horas, os meses e as notas aparecem aqui.</p>
    </div>
  );
}

export default function StatsView({ catalog }) {
  const stats = useMemo(() => aggregateCatalog(catalog), [catalog]);
  if (stats.empty) return <EmptyCatalog />;

  const hours = hoursParts(stats.minutesWatched);
  const watched = stats.totals.assistido;
  const statuses = [
    ["quero_ver", "Quero ver", "hollow"],
    ["assistido", "Assistidos", "gold"],
    ["abandonado", "Abandonados", "blood"],
  ];

  return (
    <div className="stats">
      <header className="stats-intro">
        <h2 id="stats-heading">Estatísticas</h2>
        <p>O retrato do que você marcou neste catálogo.</p>
      </header>

      <div className="stats-hero">
        <Gate value={hours.value} unit={hours.unit} idle={stats.minutesWatched <= 0} />
        <div>
          <p className="stats-kicker">Horas assistidas</p>
          <p className="stats-lead">
            {watched === 0
              ? "Nenhum filme marcado como assistido. A soma usa só esse status e a duração da ficha."
              : `Soma da duração de ${plural(watched, "filme marcado como assistido", "filmes marcados como assistidos")}.`}
          </p>
          {stats.watchedWithoutRuntime > 0 && (
            <p className="stats-quiet">
              {plural(stats.watchedWithoutRuntime, "filme assistido está sem duração e não entra", "filmes assistidos estão sem duração e não entram")} na soma.
            </p>
          )}
        </div>
      </div>

      <ul className="stats-status" aria-label="Totais por status">
        {statuses.map(([key, label, mark]) => (
          <li key={key}>
            <span className={`stats-cue stats-cue-${mark}`} aria-hidden="true" />
            <span className="stats-count">{stats.totals[key]}</span>
            <span className="stats-label">{label}</span>
          </li>
        ))}
      </ul>
      {stats.totals.outros > 0 && (
        <p className="stats-quiet">{plural(stats.totals.outros, "filme com outro status", "filmes com outro status")}.</p>
      )}

      <section className="stats-block" aria-labelledby="stats-months">
        <h3 id="stats-months">Assistidos por mês</h3>
        {stats.months.length === 0 ? (
          <p className="stats-quiet">
            {watched === 0
              ? "Marque um filme como assistido para ver em que mês ele entrou na conta."
              : "Os filmes assistidos não têm data utilizável, então o mês fica em branco."}
          </p>
        ) : (
          <>
            <p className="stats-caption">{stats.monthCaption}</p>
            {stats.months.length > 7 && <p className="stats-quiet">Deslize para o lado para ver os meses.</p>}
            <MonthChart months={stats.months} />
            {stats.watchedUndated > 0 && (
              <p className="stats-quiet">
                {plural(stats.watchedUndated, "filme assistido ficou de fora porque não tem data", "filmes assistidos ficaram de fora porque não têm data")}.
              </p>
            )}
          </>
        )}
      </section>

      <section className="stats-block" aria-labelledby="stats-ratings">
        <h3 id="stats-ratings">Nota média</h3>
        <p className="stats-caption">Gêneros e diretores com pelo menos dois filmes avaliados por você. A barra vai até 5.</p>
        <div className="stats-split">
          <div>
            <h4>Por gênero</h4>
            <RatingList rows={stats.ratingByGenre} empty="Nenhum gênero tem duas notas ainda." />
          </div>
          <div>
            <h4>Por diretor</h4>
            <RatingList rows={stats.ratingByDirector} empty="Nenhum diretor tem duas notas ainda." />
          </div>
        </div>
      </section>

      <section className="stats-block" aria-labelledby="stats-frequent">
        <h3 id="stats-frequent">Mais frequentes</h3>
        <p className="stats-caption">No catálogo inteiro, inclusive o que você quer ver ou abandonou.</p>
        <div className="stats-split">
          <div>
            <h4>Gêneros</h4>
            <FrequencyList rows={stats.topGenres} empty="Nenhum gênero na ficha destes filmes." />
          </div>
          <div>
            <h4>Diretores</h4>
            <FrequencyList rows={stats.topDirectors} empty="Nenhum diretor na ficha destes filmes." />
          </div>
        </div>
      </section>
    </div>
  );
}
