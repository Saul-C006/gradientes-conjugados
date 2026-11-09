/* =====================================================================
 * Estado reactivo de la aplicación.
 * Cada cambio (celda, parámetro, escenario) valida, recalcula todo con
 * NM.run y notifica a la vista activa. El estado se guarda en
 * localStorage para que sobreviva a recargas (si el navegador lo permite).
 * ===================================================================== */
(function () {
  "use strict";
  const { SCENARIOS, ORDER } = window.CASE;
  const NM = window.NM;
  const KEY = "gcp-finanzas-v2";
  const clone = (A) => A.map((r) => r.slice());

  /** Convierte texto del usuario a número (acepta coma decimal). */
  function parseNum(s) {
    if (typeof s === "number") return s;
    let t = String(s ?? "").trim().replace(/\s+/g, "").replace("−", "-");
    if (t === "") return NaN;
    if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(",", ".");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
    return Number(t);
  }

  const fresh = (key = "ideal") => {
    const s = SCENARIOS[key];
    return {
      scenario: key,
      edited: false,
      n: s.A.length,
      precond: s.precond,
      omega: 1,
      autosym: true,
      raw: {
        A: s.A.map((r) => r.map(String)),
        b: s.b.map(String),
        x0: s.b.map(() => "0"),
        tol: "1e-6",
        maxIt: "100",
        omega: "1",
      },
    };
  };

  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.raw && Array.isArray(saved.raw.A)) state = Object.assign(fresh(), saved);
  } catch (_) {
    /* sin almacenamiento: se usan los valores por defecto */
  }

  const listeners = new Set();
  let result = null;
  let scenarioRuns = null;
  const editLog = [];

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {
      /* ignorar */
    }
  }

  /** Valida parámetros (tolerancia, Nmáx, x₀, ω). */
  function params() {
    const errs = [];
    const tol = parseNum(state.raw.tol);
    if (!(tol > 0 && tol < 1)) errs.push("La tolerancia debe ser un número en (0, 1), por ejemplo 1e-6.");
    const maxIt = parseNum(state.raw.maxIt);
    if (!(Number.isInteger(maxIt) && maxIt >= 1 && maxIt <= 100000))
      errs.push("Nmáx debe ser un entero entre 1 y 100 000.");
    const x0 = state.raw.x0.map(parseNum);
    const badX0 = x0.map((v, i) => (Number.isFinite(v) ? null : i)).filter((i) => i !== null);
    if (badX0.length) errs.push(`x₀ tiene valores no numéricos en las posiciones ${badX0.map((i) => i + 1).join(", ")}.`);
    const omega = parseNum(state.raw.omega);
    if (state.precond === "ssor" && !(omega > 0 && omega < 2)) errs.push("El parámetro ω de SSOR debe estar en (0, 2).");
    return { tol, maxIt, x0, omega: omega > 0 && omega < 2 ? omega : 1, errs, badX0 };
  }

  function compute() {
    const A = state.raw.A.map((r) => r.map(parseNum));
    const b = state.raw.b.map(parseNum);
    const p = params();
    const validation = NM.validate(A, b);
    if (!validation.ok || p.errs.length) {
      result = { valid: false, validation, paramErrors: p.errs, A, b, params: p };
    } else {
      try {
        result = NM.run(A, b, { x0: p.x0, tol: p.tol, maxIt: p.maxIt, precond: state.precond, omega: p.omega });
        result.paramErrors = [];
        result.params = p;
      } catch (e) {
        validation.ok = false;
        validation.messages.push(`Error numérico: ${e.message}`);
        result = { valid: false, validation, paramErrors: [], A, b, params: p };
      }
    }
    result.state = state;
  }

  /** Resultados de los tres escenarios originales (para tablas comparativas). */
  function runScenarios() {
    const p = params();
    const opts = p.errs.length ? {} : { tol: p.tol, maxIt: p.maxIt, omega: p.omega };
    const out = {};
    for (const k of ORDER) {
      const s = SCENARIOS[k];
      out[k] = NM.run(s.A, s.b, Object.assign({}, opts, { precond: s.precond }));
      out[k].scenario = s;
    }
    return out;
  }

  function emit(reason) {
    compute();
    scenarioRuns = null;
    persist();
    listeners.forEach((fn) => fn(reason));
  }

  const Store = {
    parseNum,
    get state() {
      return state;
    },
    get result() {
      if (!result) compute();
      return result;
    },
    get scenarios() {
      if (!scenarioRuns) scenarioRuns = runScenarios();
      return scenarioRuns;
    },
    editLog,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    loadScenario(key) {
      const keepParams = { tol: state.raw.tol, maxIt: state.raw.maxIt };
      state = fresh(key);
      Object.assign(state.raw, keepParams);
      emit("scenario");
    },
    setCell(i, j, text) {
      const before = state.raw.A[i][j];
      state.raw.A[i][j] = text;
      if (state.autosym && i !== j) state.raw.A[j][i] = text;
      state.edited = true;
      editLog.unshift({ t: new Date(), what: `a${i + 1}${j + 1}`, from: before, to: text, mirror: state.autosym && i !== j });
      emit("cell");
    },
    setB(i, text) {
      const before = state.raw.b[i];
      state.raw.b[i] = text;
      state.edited = true;
      editLog.unshift({ t: new Date(), what: `b${i + 1}`, from: before, to: text });
      emit("cell");
    },
    setX0(i, text) {
      state.raw.x0[i] = text;
      emit("param");
    },
    setParam(name, value) {
      if (name === "precond") state.precond = value;
      else if (name === "autosym") state.autosym = !!value;
      else state.raw[name] = value;
      emit("param");
    },
    /** Cambia la dimensión n (4 a 8) conservando los valores existentes. */
    setN(n) {
      n = Math.max(4, Math.min(8, n | 0));
      const old = state.raw;
      const A = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (old.A[i] && old.A[i][j] !== undefined ? old.A[i][j] : i === j ? "1" : "0")),
      );
      const b = Array.from({ length: n }, (_, i) => old.b[i] ?? "100");
      const x0 = Array.from({ length: n }, (_, i) => old.x0[i] ?? "0");
      state.raw = Object.assign({}, old, { A, b, x0 });
      state.n = n;
      state.edited = true;
      emit("dim");
    },
    /** Reemplaza A y b completos (usado por las pruebas QA y el generador aleatorio). */
    setAll(A, b) {
      state.raw.A = A.map((r) => r.map(String));
      state.raw.b = b.map(String);
      state.raw.x0 = b.map(() => "0");
      state.n = b.length;
      state.edited = true;
      emit("cell");
    },
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    restore(snap) {
      state = JSON.parse(JSON.stringify(snap));
      emit("restore");
    },
    scenarioLabel() {
      const s = SCENARIOS[state.scenario];
      if (!s) return "Personalizado";
      return state.edited ? `${s.short} (editado)` : s.short;
    },
  };

  window.Store = Store;
})();
