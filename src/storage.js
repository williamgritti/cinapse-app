const KEY = "cinapse-data-v1";

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { catalog: [], watchlists: [], checklists: [] };
    return JSON.parse(raw);
  } catch {
    return { catalog: [], watchlists: [], checklists: [] };
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Save error:", e);
  }
}
