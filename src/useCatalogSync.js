import { useEffect, useState, useSyncExternalStore } from "react";
import { decodeCache, emptyCatalog, isCacheEvent, readCache, readTabDraft, saveTabDraft, writeCache } from "./storage.js";
import { isCatalogData } from "../shared/catalog.js";
import { mergeCatalog, sameValue } from "./mergeCatalog.js";

async function api(path, method = "GET", body) {
  const response = await fetch("/api/" + path, {
    method, credentials: "same-origin", cache: "no-store",
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = response.headers.get("content-type")?.includes("application/json");
  if (path === "session" && method === "GET" && (response.status === 404 || (response.ok && !json))) {
    return { configured: false, authenticated: false, tmdbConfigured: false };
  }
  if (!response.ok) {
    const message = {
      401: path === "session" && method === "POST" ? "Senha incorreta." : "Sua sessão expirou. Entre novamente.",
      413: "O catálogo ultrapassou o tamanho aceito pelo servidor.",
      429: "Muitas tentativas. Aguarde antes de tentar novamente.",
    }[response.status] ?? "O servidor não conseguiu concluir o pedido.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return {};
  if (!json) throw new Error("A resposta do servidor é inválida.");
  return response.json();
}

function asRemote(value) {
  if (!value || !Number.isSafeInteger(value.revision) ||
      !(value.revision === 0 ? value.data === null : value.revision > 0 && isCatalogData(value.data))) {
    throw new Error("O servidor retornou um catálogo inválido.");
  }
  return value;
}

function networkMessage(error) {
  return error instanceof TypeError || error.name === "TimeoutError"
    ? "Sem conexão com o servidor. Tente sincronizar novamente."
    : error.message;
}

export class CatalogSync {
  constructor() {
    try {
      this.cache = readCache();
    } catch {
      this.cache = { data: emptyCatalog(), base: null };
      this.unreadable = true; // Preserve the original storage if it cannot be opened.
      this.storageWarning = "Falha ao abrir a cópia local. Os dados anteriores foram preservados.";
    }
    try {
      const draft = readTabDraft();
      if (draft) {
        this.cache = draft;
        this.tabDraft = true;
      }
    } catch { /* The main local cache can still be used if tab storage is blocked. */ }
    this.state = {
      data: this.cache.data, configured: false, authenticated: false, tmdbConfigured: false,
      status: "loading", message: "", conflict: null,
    };
  }

  listeners = new Set();
  generation = 0;
  busy = false;
  accountBusy = false;
  active = false;
  needsSession = true;
  queued = false;
  subscribe = listener => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  snapshot = () => this.state;
  patch(changes) {
    this.state = { ...this.state, ...changes };
    this.listeners.forEach(listener => listener());
  }

  commit(data, base) {
    this.cache = { data, base };
    if (!this.unreadable) {
      try {
        writeCache(this.cache);
        if (this.tabDraft) {
          this.tabDraft = data !== base?.data;
          saveTabDraft(this.tabDraft ? this.cache : null);
        }
        this.storageWarning = "";
      } catch {
        this.storageWarning = "Não foi possível salvar neste navegador. Exporte uma cópia antes de fechar.";
      }
    }
    const conflict = this.state.conflict && { ...this.state.conflict, local: data };
    this.patch({ data, conflict });
  }

  change(field, update) {
    // A sibling tab can commit between render and click, before its storage event arrives.
    // Apply a functional edit to the latest shared copy wherever we have a common history.
    if (!this.unreadable && !this.storageWarning && !this.tabDraft && !this.state.conflict) {
      try {
        const disk = readCache();
        if (!sameValue(this.cache, disk)) {
          const localBase = this.cache.base;
          if (!localBase || (disk.base && disk.base.revision >= localBase.revision)) {
            const merged = mergeCatalog(localBase?.data ?? this.cache.data, this.cache.data, disk.data);
            if (!merged.conflict) this.cache = { data: merged.data, base: disk.base };
          }
        }
      } catch { /* Edits can still be saved in memory when browser storage is unavailable. */ }
    }
    const { data, base } = this.cache;
    const changed = typeof update === "function" ? update(data[field]) : update;
    if (changed === data[field]) return;
    this.saveEdit({ ...data, [field]: changed }, base);
  }

  replaceData = snapshot => {
    if (!isCatalogData(snapshot)) throw new Error("O formato do catálogo é inválido.");
    this.saveEdit(snapshot, this.cache.base);
  };

  saveEdit(data, base) {
    this.commit(data, base);
    if (this.state.authenticated && !this.state.conflict) {
      this.patch({ status: "pending", message: "" });
      this.schedule();
    }
  }
  setCatalog = update => this.change("catalog", update);
  setWatchlists = update => this.change("watchlists", update);
  setChecklists = update => this.change("checklists", update);

  session(result) {
    const { configured, authenticated, tmdbConfigured } = result;
    this.patch({ configured, authenticated, tmdbConfigured });
    if (!authenticated && !this.state.conflict?.otherTab) {
      this.patch({ conflict: null, status: "local", message: "" });
    }
  }
  fail(error) {
    if (error.status === 401) {
      this.session({ ...this.state, authenticated: false });
    }
    this.patch({ status: "error", message: networkMessage(error) });
  }

  async reconcile(generation) {
    // Retrying a CAS starts from a fresh server snapshot. Never resend a stale whole document.
    for (let attempt = 0; attempt < 3; attempt++) {
      const remote = asRemote(await api("catalog"));
      if (generation !== this.generation) return;
      const { data: local, base } = this.cache;
      if (base && (remote.revision < base.revision ||
          (remote.revision === base.revision && !sameValue(base.data, remote.data)))) {
        throw new Error("A versão do servidor diverge do histórico deste navegador. Exporte a cópia local e confira o banco configurado antes de sincronizar.");
      }
      const theirs = remote.data ?? emptyCatalog();
      const result = mergeCatalog(base?.data, local, theirs);
      if (result.conflict) {
        this.patch({ status: "conflict", message: "", conflict: { local, remote: theirs, revision: remote.revision, titles: result.titles } });
        return;
      }
      const merged = result.data;
      if (sameValue(merged, theirs)) {
        if (this.tabDraft || !sameValue(local, theirs) || (base?.revision ?? 0) !== remote.revision || (base && base.data !== local)) {
          this.commit(theirs, remote.data ? remote : null);
        }
        this.patch({ status: "synced", conflict: null, message: "" });
        return;
      }

      // Persist the reconciliation before sending, so subsequent offline edits retain this base.
      if (!sameValue(local, merged) || (base?.revision ?? 0) !== remote.revision) {
        this.commit(merged, remote.data ? remote : null);
      }
      let saved;
      try {
        saved = await api("catalog", "PUT", { revision: remote.revision, data: merged });
      } catch (error) {
        if (error.status === 409) continue;
        throw error;
      }
      if (generation !== this.generation) return;
      if (saved.revision !== remote.revision + 1) throw new Error("O servidor não confirmou a versão gravada.");
      const latest = this.cache;
      if ((latest.base?.revision ?? 0) > saved.revision) {
        this.queued = true; // A different tab has already observed a newer revision.
        return;
      }
      const edited = !sameValue(merged, latest.data);
      this.commit(edited ? latest.data : merged, { revision: saved.revision, data: merged });
      this.patch({ status: edited ? "pending" : "synced", message: "", conflict: null });
      this.queued ||= edited;
      return;
    }
    throw new Error("O catálogo mudou durante a sincronização. Tente novamente.");
  }

  schedule(refreshSession = false, delay = 200) {
    this.needsSession ||= refreshSession;
    this.queued = true;
    if (this.busy || this.accountBusy || !this.active) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), delay);
  }

  async run() {
    if (this.busy || this.accountBusy || !this.active) return;
    const generation = this.generation;
    this.busy = true;
    this.queued = false;
    try {
      if (this.needsSession) {
        this.needsSession = false;
        const session = await api("session");
        if (generation !== this.generation) return;
        this.session(session);
      }
      if (this.state.authenticated && !this.state.conflict?.otherTab) {
        this.patch({ status: "syncing", message: "" });
        await this.reconcile(generation);
      }
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      this.busy = false;
      if (this.queued) this.schedule();
    }
  }

  account = async (method, body) => {
    if (this.accountBusy) return false;
    this.accountBusy = true;
    const generation = ++this.generation;
    clearTimeout(this.timer);
    this.patch({ status: "loading", message: "" });
    try {
      await api("session", method, body);
      const session = await api("session");
      if (generation !== this.generation) return false;
      this.session(session);
      this.needsSession = false;
      this.queued = session.authenticated;
      return true;
    } catch (error) {
      if (generation === this.generation) this.fail(error);
      return false;
    } finally {
      this.accountBusy = false;
      if (this.queued) this.schedule(false, 0);
    }
  };
  login = password => this.account("POST", { password });
  logout = () => this.account("DELETE");
  retry = () => this.schedule(true, 0);

  resolveConflict = choice => {
    const conflict = this.state.conflict;
    if (!conflict || !["local", "remote"].includes(choice)) return;
    const { data, base } = this.cache;
    // Apply preference only to the records that actually conflicted; retain independent edits.
    const merged = mergeCatalog(conflict.otherTab ? conflict.ancestor : base?.data, data, conflict.remote, choice).data;
    const snapshot = conflict.otherTab ? base :
      (conflict.revision ? { revision: conflict.revision, data: conflict.remote } : null);
    this.commit(merged, snapshot);
    this.patch({ conflict: null, status: this.state.authenticated ? "pending" : "local", message: "" });
    this.schedule(false, 0);
  };

  start = () => {
    this.active = true;
    const whenVisible = () => { if (!document.hidden) this.retry(); };
    const onStorage = event => {
      if (!isCacheEvent(event) || this.storageWarning) return;
      try {
        const disk = readCache();
        const { data, base } = this.cache;
        if (sameValue(this.cache, disk)) return;
        if (this.state.authenticated && (!base || !sameValue(data, base.data))) {
          // Don't replace a draft while its request is in flight. Each tab will reconcile
          // through server CAS. Keep this tab's draft across reloads in the meantime.
          this.tabDraft = true;
          saveTabDraft(this.cache);
          this.schedule();
          return;
        }
        const ancestor = decodeCache(event.oldValue).data;
        const merged = mergeCatalog(ancestor, data, disk.data);
        if (merged.conflict) {
          this.tabDraft = true;
          saveTabDraft(this.cache);
          this.patch({ status: "conflict", message: "", conflict: {
            local: data, remote: disk.data, titles: merged.titles, otherTab: true, ancestor,
          } });
          return;
        }
        this.cache = disk;
        if (sameValue(merged.data, disk.data)) this.patch({ data: disk.data, conflict: null });
        else this.commit(merged.data, disk.base);
        this.schedule(true);
      } catch {
        this.storageWarning = "Falha ao ler ou guardar uma edição entre abas. Exporte uma cópia antes de fechar.";
        this.patch({});
      }
    };
    window.addEventListener("focus", whenVisible);
    window.addEventListener("online", this.retry);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", whenVisible);
    const interval = setInterval(() => {
      if (!document.hidden && this.state.authenticated && !this.state.conflict) this.schedule(true);
    }, 60000);
    this.retry();
    return () => {
      this.active = false;
      this.generation++;
      clearTimeout(this.timer);
      clearInterval(interval);
      window.removeEventListener("focus", whenVisible);
      window.removeEventListener("online", this.retry);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  };
}

const statusMessage = {
  loading: "Verificando a conexão com o catálogo.",
  syncing: "Sincronizando com a nuvem…",
  pending: "Há alterações aguardando sincronização.",
  synced: "Catálogo sincronizado com a nuvem.",
  conflict: "O mesmo registro recebeu alterações incompatíveis.",
};

export function useCatalogSync() {
  const [client] = useState(() => new CatalogSync());
  const { data, ...state } = useSyncExternalStore(client.subscribe, client.snapshot);
  useEffect(client.start, [client]);
  const message = state.message || statusMessage[state.status] || (state.configured
    ? "Catálogo salvo neste navegador. Conecte-se para sincronizar."
    : "Catálogo salvo neste navegador. A sincronização está desativada no servidor.");
  return {
    ...data, replaceData: client.replaceData, setCatalog: client.setCatalog, setWatchlists: client.setWatchlists, setChecklists: client.setChecklists,
    sync: {
      ...state, storageWarning: client.storageWarning || "", message: [message, client.storageWarning].filter(Boolean).join(" "),
      login: client.login, logout: client.logout, retry: client.retry, resolveConflict: client.resolveConflict,
    },
  };
}
