const STATUSES = new Set(["quero_ver", "assistido", "abandonado"]);
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// The synced movie only stores addedAt. A watch date wins when a record already has one.
const WATCH_DATE_FIELDS = ["watchedAt", "seenAt", "completedAt"];
const MAX_MONTH_SPAN = 120;

const captionFor = {
  addedAt: "Pelo mês em que cada filme assistido foi adicionado ao catálogo. O acervo não guarda a data em que você assistiu.",
  misto: "Pelo mês disponível de cada filme assistido. Quando não há data de sessão, entra o mês em que o filme foi adicionado.",
  watchedAt: "Pelo mês da data em que cada filme foi marcado como assistido.",
  seenAt: "Pelo mês da data em que cada filme foi marcado como assistido.",
  completedAt: "Pelo mês da data em que cada filme foi marcado como assistido.",
};

function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function cleanName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function namesFrom(movie, read) {
  const seen = new Set();
  const names = [];
  for (const value of read(movie)) {
    const name = cleanName(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function genresOf(movie) {
  return namesFrom(movie, (item) => Array.isArray(item?.genres) ? item.genres : []);
}

function directorOf(movie) {
  return namesFrom(movie, (item) => [item?.director]);
}

function watchDate(movie) {
  for (const field of WATCH_DATE_FIELDS) {
    if (finitePositive(movie?.[field])) return { field, ts: movie[field] };
  }
  if (finitePositive(movie?.addedAt)) return { field: "addedAt", ts: movie.addedAt };
  return null;
}

function monthFrom(year, month) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return { key, label: `${MONTHS[month - 1]} ${year}`, year, month, count: 0 };
}

function compareName(a, b) {
  return a.name.localeCompare(b.name, "pt-BR");
}

function ratingRows(movies, readNames) {
  const groups = new Map();
  for (const movie of movies) {
    if (!finitePositive(movie.myRating)) continue;
    for (const name of readNames(movie)) {
      const row = groups.get(name) || { name, sum: 0, count: 0 };
      row.sum += movie.myRating;
      row.count += 1;
      groups.set(name, row);
    }
  }
  return [...groups.values()]
    .filter((row) => row.count >= 2)
    .map((row) => ({ name: row.name, count: row.count, average: row.sum / row.count }))
    .sort((a, b) => b.average - a.average || b.count - a.count || compareName(a, b));
}

function frequencyRows(movies, readNames) {
  const groups = new Map();
  for (const movie of movies) {
    for (const name of readNames(movie)) {
      const row = groups.get(name) || { name, count: 0 };
      row.count += 1;
      groups.set(name, row);
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || compareName(a, b));
}

function watchedMonths(watched) {
  const counts = new Map();
  const fields = new Set();
  let watchedUndated = 0;
  for (const movie of watched) {
    const dated = watchDate(movie);
    if (!dated) {
      watchedUndated += 1;
      continue;
    }
    fields.add(dated.field);
    const date = new Date(dated.ts);
    const stamp = monthFrom(date.getUTCFullYear(), date.getUTCMonth() + 1);
    const row = counts.get(stamp.key) || stamp;
    row.count += 1;
    counts.set(stamp.key, row);
  }

  const keys = [...counts.keys()].sort();
  const months = [];
  if (keys.length) {
    const [startYear, startMonth] = keys[0].split("-").map(Number);
    const [endYear, endMonth] = keys[keys.length - 1].split("-").map(Number);
    const span = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (span > MAX_MONTH_SPAN) {
      months.push(...keys.map((key) => counts.get(key)));
    } else {
      let year = startYear;
      let month = startMonth;
      while (year < endYear || (year === endYear && month <= endMonth)) {
        const stamp = monthFrom(year, month);
        months.push(counts.get(stamp.key) || stamp);
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    }
  }

  let monthBasis = null;
  if (fields.size === 1) monthBasis = [...fields][0];
  else if (fields.size > 1) monthBasis = "misto";

  return { months, monthBasis, monthCaption: captionFor[monthBasis] || "", watchedUndated };
}

const emptyTotals = () => ({ quero_ver: 0, assistido: 0, abandonado: 0, outros: 0, total: 0 });

export function aggregateCatalog(movies) {
  const list = Array.isArray(movies) ? movies.filter((movie) => movie && typeof movie === "object") : [];
  const totals = emptyTotals();
  totals.total = list.length;
  for (const movie of list) {
    if (STATUSES.has(movie.status)) totals[movie.status] += 1;
    else totals.outros += 1;
  }

  const watched = list.filter((movie) => movie.status === "assistido");
  let minutesWatched = 0;
  let watchedWithoutRuntime = 0;
  for (const movie of watched) {
    if (finitePositive(movie.runtime)) minutesWatched += movie.runtime;
    else watchedWithoutRuntime += 1;
  }

  return {
    empty: list.length === 0,
    totals,
    minutesWatched,
    hoursWatched: minutesWatched / 60,
    watchedWithoutRuntime,
    ...watchedMonths(watched),
    ratingByGenre: ratingRows(list, genresOf),
    ratingByDirector: ratingRows(list, directorOf),
    topGenres: frequencyRows(list, genresOf),
    topDirectors: frequencyRows(list, directorOf),
  };
}
