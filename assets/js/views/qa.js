/* Vista 9 · Módulo de pruebas de software (QA) ejecutadas en vivo sobre la interfaz */
(function () {
  "use strict";
  const { card, table, chip, esc, kpi, note } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER } = window.CASE;
  const HKEY = "gcp-qa-history";

  const QA = { running: false, speed: 120, results: {}, history: [] };
  try {
    QA.history = JSON.parse(localStorage.getItem(HKEY) || "[]");
  } catch (_) {}

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pause = () => sleep(QA.speed);
  const rand = (a, b) => a + Math.random() * (b - a);
  const round = (v, d) => +v.toFixed(d);

  // ---------------- Consola ----------------
  function log(msg, cls = "") {
    const c = document.getElementById("qa-console");
    if (!c) return;
    const t = new Date().toLocaleTimeString();
    c.insertAdjacentHTML("beforeend", `<div><span class="ts">[${t}]</span> <span class="${cls}">${esc(msg)}</span></div>`);
    c.scrollTop = c.scrollHeight;
  }

  // ---------------- Acciones de "usuario simulado" ----------------
  const $ = (sel) => document.querySelector(sel);
  async function click(sel, label) {
    const el = $(sel);
    if (!el) throw new Error(`No se encontró el control ${label || sel}`);
    log(`clic en «${label || el.textContent.trim()}»`, "act");
    el.click();
    await pause();
  }
  async function type(sel, value, label) {
    const el = $(sel);
    if (!el) throw new Error(`No se encontró la celda ${label || sel}`);
    log(`escribe ${label || sel} = «${value}»`, "act");
    el.focus();
    el.classList.add("flash");
    if (QA.speed > 0) {
      el.value = "";
      for (const ch of String(value)) {
        el.value += ch;
        await sleep(Math.min(40, QA.speed / 4));
      }
    } else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.blur();
    setTimeout(() => el.classList.remove("flash"), 700);
    await pause();
  }
  async function select(sel, value, label) {
    const el = $(sel);
    if (!el) throw new Error(`No se encontró ${label || sel}`);
    log(`selecciona ${label || sel} = ${value}`, "act");
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await pause();
  }
  async function check(sel, on, label) {
    const el = $(sel);
    log(`${on ? "marca" : "desmarca"} «${label}»`, "act");
    el.checked = on;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await pause();
  }
  const cell = (i, j) => `#qa-a-${i}-${j}`;
  const bcell = (i) => `#qa-b-${i}`;
  const load = (k) => click(`#databar [data-load="${k}"]`, `Escenario ${SCENARIOS[k].num} · ${SCENARIOS[k].short}`);
  const alertShown = () => !!document.querySelector("#qa-live .alert.bad");

  /** Solución independiente: Gauss con pivoteo parcial (no comparte código con NM.solveGauss). */
  function indepSolve(A, b) {
    const n = b.length;
    const M = A.map((r, i) => r.concat([b[i]]));
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      [M[k], M[p]] = [M[p], M[k]];
      for (let i = k + 1; i < n; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = M[i][n];
      for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  // ---------------- Casos de prueba ----------------
  const TESTS = [
    {
      id: "QA-01",
      mandatory: true,
      name: "Carga de escenarios",
      input: "Clic en los botones de los escenarios 1, 2 y 3 de la barra superior.",
      expected: "Cada escenario carga sus datos en las celdas, pasa la validación SPD, el GCP converge (residuo < tol) y Eₚ máx < 10⁻⁴ %.",
      async run() {
        const out = [];
        let pass = true;
        for (const k of ORDER) {
          await load(k);
          const r = Store.result;
          const s = SCENARIOS[k];
          const cellsOk = Number(document.querySelector(cell(0, 0)).value) === s.A[0][0];
          const ep = r.valid ? Math.max(...r.errGCP.map((e) => e.ep ?? 0)) : Infinity;
          const ok = r.valid && cellsOk && r.gcp.converged && r.gcp.trueRes < r.opts.tol && ep < 1e-4;
          pass = pass && ok;
          out.push(`${s.short}: ${r.valid ? `GC ${r.gc.iters} / GCP ${r.gcp.iters} it., residuo ${F.sci(r.gcp.trueRes, 1)}, Eₚ máx ${F.sci(ep, 1)} %` : "no válido"}${cellsOk ? "" : " (celdas no cargadas)"}`);
          log(`${s.short}: ${ok ? "correcto" : "FALLA"}`, ok ? "ok" : "bad");
        }
        return { pass, obtained: out.join("\n") };
      },
    },
    {
      id: "QA-02",
      mandatory: true,
      name: "Validación de matriz no válida",
      input: "",
      expected: "La app no se interrumpe: detecta la falta de simetría, el menor de Sylvester no positivo y la celda no numérica, muestra la alerta con el motivo, marca la celda y se recupera al cargar un escenario.",
      async run() {
        const out = [];
        let pass = true;
        await load("ideal");
        // a) No simétrica
        const v1 = round(rand(0.4, 0.9), 2);
        await check("#qa-autosym", false, "Reflejar aᵢⱼ en aⱼᵢ");
        await type(cell(0, 2), v1, "a₁₃");
        let r = Store.result;
        const okA = !r.valid && !r.validation.symmetric && alertShown() && $(cell(0, 2)).classList.contains("bad");
        out.push(`a) a₁₃ = ${v1} ≠ a₃₁ = 0.2 → ${okA ? "detectado y alertado" : "NO detectado"}`);
        pass = pass && okA;
        await check("#qa-autosym", true, "Reflejar aᵢⱼ en aⱼᵢ");
        await load("ideal");
        // b) Simétrica pero no definida positiva: |a₃₄| > √(a₃₃a₄₄) ⇒ un menor 2×2 negativo ⇒ A no es SPD
        const v2 = round(Math.sqrt(1.3 * 1.2) * rand(1.4, 2.2), 2);
        await type(cell(2, 3), v2, "a₃₄ (y a₄₃)");
        r = Store.result;
        const minor = r.validation.minors[r.validation.firstBadMinor];
        const okB = !r.valid && r.validation.symmetric && !r.validation.spd && alertShown();
        out.push(`b) a₃₄ = a₄₃ = ${v2} → Δ${r.validation.firstBadMinor + 1} = ${F.smart(minor, 4)} ≤ 0 ${okB ? "detectado" : "NO detectado"}`);
        pass = pass && okB;
        await load("ideal");
        // c) No numérica
        const bad = ["abc", "1..2", "", "x7"][Math.floor(Math.random() * 4)];
        await type(cell(3, 3), bad, "a₄₄");
        r = Store.result;
        const okC = !r.valid && !r.validation.numeric && alertShown() && $(cell(3, 3)).classList.contains("bad");
        out.push(`c) a₄₄ = «${bad}» → ${okC ? "detectado" : "NO detectado"}`);
        pass = pass && okC;
        await load("ideal");
        const rec = Store.result.valid && !alertShown();
        out.push(`Recuperación: ${rec ? "correcta" : "falló"}`);
        pass = pass && rec;
        this.input = `a) a₁₃ = ${v1} con reflejo desactivado\nb) a₃₄ = a₄₃ = ${v2} (> √(a₃₃a₄₄))\nc) a₄₄ = «${bad}»`;
        return { pass, obtained: out.join("\n") };
      },
    },
    {
      id: "QA-03",
      mandatory: true,
      name: "Edición dinámica",
      input: "",
      expected: "Al escribir se recalculan solos la solución de referencia, el GCP y los errores; la nueva solución satisface Ax = b y coincide con un cálculo independiente (Gauss con pivoteo).",
      async run() {
        await load("ideal");
        const before = Store.result;
        const a44 = round(rand(1.25, 1.45), 2),
          b2 = Math.round(rand(1200, 1350));
        await type(cell(3, 3), a44, "a₄₄");
        await type(bcell(1), b2, "b₂");
        const r = Store.result;
        const xi = indepSolve(r.A, r.b);
        const diff = Math.max(...xi.map((v, i) => Math.abs(v - r.xref[i]) / Math.max(1, Math.abs(v))));
        const shown = document.querySelector("#qa-mini [data-x0]")?.textContent || "";
        const domOk = shown.replace(/\s| /g, "").startsWith(r.xref[0].toFixed(4).slice(0, 6));
        const pass = r.valid && r.gcp.converged && diff < 1e-10 && r.res.chol < 1e-12 && Math.max(...r.errGCP.map((e) => e.ea)) < 1e-6 && domOk && r.xref[0] !== before.xref[0];
        this.input = `Escenario 1; a₄₄: 1.2 → ${a44}; b₂: 1305 → ${b2}`;
        return {
          pass,
          obtained: `x₁ ref: ${before.xref[0].toFixed(6)} → ${r.xref[0].toFixed(6)}\nx₁ GCP: ${before.gcp.x[0].toFixed(6)} → ${r.gcp.x[0].toFixed(6)}\nDiferencia con Gauss independiente: ${F.sci(diff, 1)}; residuo ${F.sci(r.res.chol, 1)}; GCP ${r.gcp.iters} it.; recálculo ${r.ms.toFixed(1)} ms; tabla en pantalla ${domOk ? "actualizada" : "NO actualizada"}`,
        };
      },
    },
    {
      id: "QA-04",
      mandatory: true,
      name: "Comparativa de precondicionamiento",
      input: "Escenario 3 (mal condicionado) con M = Jacobi, M = IC(0) y M = SSOR.",
      expected: "En el escenario mal condicionado, iteraciones GCP ≤ iteraciones GC con cada precondicionador, y κ(M⁻¹A) < κ(A).",
      async run() {
        await load("mal");
        const out = [];
        let pass = true;
        for (const t of ["jacobi", "ic0", "ssor"]) {
          await select("#qa-precond", t, "Precondicionador");
          const r = Store.result;
          const ok = r.valid && r.gcp.converged && r.gcp.iters <= r.gc.iters && r.kM.cond < r.kA.cond;
          pass = pass && ok;
          out.push(`${NM.PRECOND_LABEL[t]}: GC ${r.gc.iters} vs GCP ${r.gcp.iters} it.; κ ${F.smart(r.kA.cond, 1)} → ${F.smart(r.kM.cond, 2)}`);
          log(`${t}: ${ok ? "GCP ≤ GC" : "FALLA"}`, ok ? "ok" : "bad");
        }
        await select("#qa-precond", "ic0", "Precondicionador");
        return { pass, obtained: out.join("\n") };
      },
    },
    {
      id: "QA-05",
      mandatory: false,
      name: "Consistencia de métodos directos",
      input: "Datos originales de los tres escenarios.",
      expected: "Cholesky, LU y Gauss coinciden en los tres escenarios con diferencia relativa ≤ 100·κ(A)·ε.",
      async run() {
        const out = [];
        let pass = true;
        for (const k of ORDER) {
          await load(k);
          const r = Store.result;
          const d = Math.max(...r.xref.map((x, i) => Math.max(Math.abs(x - r.lu.x[i]), Math.abs(x - r.gauss.x[i])) / Math.max(1, Math.abs(x))));
          const lim = 100 * r.kA.cond * 2.22e-16;
          pass = pass && d <= lim;
          out.push(`Esc. ${SCENARIOS[k].num}: dif. ${F.sci(d, 1)} (límite ${F.sci(lim, 1)})`);
        }
        return { pass, obtained: out.join("\n") };
      },
    },
    {
      id: "QA-06",
      mandatory: false,
      name: "Parámetros inválidos",
      input: "",
      expected: "Una tolerancia fuera de (0, 1) o un Nmáx no entero positivo se rechaza con alerta, sin ejecutar el método ni colapsar.",
      async run() {
        await load("ideal");
        const tolBad = ["abc", "2", "-1e-6", "0"][Math.floor(Math.random() * 4)];
        const itBad = ["x", "0", "2.5", "-3"][Math.floor(Math.random() * 4)];
        await type("#qa-tol", tolBad, "tolerancia");
        const r1 = Store.result;
        const ok1 = !r1.valid && r1.paramErrors.length > 0 && alertShown();
        await type("#qa-tol", "1e-6", "tolerancia");
        await type("#qa-maxIt", itBad, "Nmáx");
        const r2 = Store.result;
        const ok2 = !r2.valid && r2.paramErrors.length > 0 && alertShown();
        await type("#qa-maxIt", "100", "Nmáx");
        const rec = Store.result.valid;
        this.input = `tol = «${tolBad}»; Nmáx = «${itBad}»`;
        return { pass: ok1 && ok2 && rec, obtained: `tol: ${ok1 ? "rechazada con alerta" : "NO rechazada"}\nNmáx: ${ok2 ? "rechazado con alerta" : "NO rechazado"}\nRecuperación: ${rec ? "correcta" : "falló"}` };
      },
    },
    {
      id: "QA-07",
      mandatory: false,
      name: "Matriz SPD aleatoria de dimensión 5",
      input: "",
      expected: "Al cambiar n a 5 y escribir celda por celda una matriz SPD generada al azar, el GCP converge y coincide con Cholesky (Eₚ < 10⁻⁴ %).",
      async run() {
        await select("#qa-n", "5", "Dimensión n");
        const { A, b } = App.randomSPD(5);
        for (let i = 0; i < 5; i++)
          for (let j = i; j < 5; j++) {
            if (QA.speed === 0) {
              const el = $(cell(i, j));
              el.value = String(A[i][j]);
              el.dispatchEvent(new Event("input", { bubbles: true }));
            } else await type(cell(i, j), A[i][j], `a${F.sub(i + 1)}${F.sub(j + 1)}`);
          }
        for (let i = 0; i < 5; i++) await type(bcell(i), b[i], `b${F.sub(i + 1)}`);
        const r = Store.result;
        const ep = r.valid ? Math.max(...r.errGCP.map((e) => e.ep ?? 0)) : Infinity;
        this.input = `n = 5; diag(A) = (${A.map((r, i) => r[i]).join(", ")}); b = (${b.map((v) => Math.round(v)).join(", ")})`;
        const pass = r.valid && r.n === 5 && r.gcp.converged && ep < 1e-4;
        return { pass, obtained: r.valid ? `x_ref = (${r.xref.map((v) => v.toFixed(2)).join(", ")})\nGC ${r.gc.iters} / GCP ${r.gcp.iters} it.; Eₚ máx ${F.sci(ep, 1)} %` : "matriz no válida" };
      },
    },
    {
      id: "QA-08",
      mandatory: false,
      name: "Formato de entrada flexible",
      input: "Escenario 1; a₁₁ = «1,5» (coma decimal) y b₁ = «1.4625e3» (notación científica).",
      expected: "La coma decimal y la notación científica se interpretan como 1.5 y 1462.5: la solución no cambia (800, 650, 500, 400).",
      async run() {
        await load("ideal");
        await type(cell(0, 0), "1,5", "a₁₁");
        await type(bcell(0), "1.4625e3", "b₁");
        const r = Store.result;
        const pass = r.valid && Math.abs(r.xref[0] - 800) < 1e-9 && Math.abs(r.xref[3] - 400) < 1e-9;
        return { pass, obtained: r.valid ? `x = (${r.xref.map((v) => v.toFixed(6)).join(", ")})` : "no válido" };
      },
    },
  ];

  // ---------------- Ejecución ----------------
  async function runTests(ids) {
    if (QA.running) return;
    QA.running = true;
    const snap = Store.snapshot();
    const t0 = performance.now();
    paint();
    log(`Inicio de ${ids.length} prueba(s). Se guardaron los datos del usuario.`, "hd");
    for (const id of ids) {
      const t = TESTS.find((x) => x.id === id);
      QA.results[id] = { status: "run" };
      paint();
      log(`── ${t.id} · ${t.name}`, "hd");
      const s = performance.now();
      let r;
      try {
        r = await t.run.call(t);
      } catch (e) {
        r = { pass: false, obtained: `Excepción: ${e.message}` };
      }
      QA.results[id] = { status: r.pass ? "pass" : "fail", obtained: r.obtained, input: t.input, ms: performance.now() - s, at: new Date().toLocaleTimeString() };
      log(`${t.id}: ${r.pass ? "PASA" : "FALLA"}`, r.pass ? "ok" : "bad");
      paint();
    }
    Store.restore(snap);
    log("Datos del usuario restaurados.", "hd");
    const passed = ids.filter((id) => QA.results[id].status === "pass").length;
    QA.history.unshift({ at: new Date().toLocaleString(), n: ids.length, passed, ms: performance.now() - t0, speed: QA.speed });
    QA.history = QA.history.slice(0, 10);
    try {
      localStorage.setItem(HKEY, JSON.stringify(QA.history));
    } catch (_) {}
    QA.running = false;
    paint();
    window.__qaDone = { passed, total: ids.length };
  }

  const statusChip = (s) =>
    s === "pass" ? chip("ok", "PASA") : s === "fail" ? chip("bad", "FALLA") : s === "run" ? chip("run", "Ejecutando…") : chip("idle", "Pendiente");

  function listHtml() {
    return TESTS.map((t) => {
      const r = QA.results[t.id] || {};
      return `<div class="qa-item ${r.status === "run" ? "run" : ""}"><div><div class="ttl">${t.id} · ${t.name}</div><div class="meta">${t.mandatory ? "Obligatoria (guía, sección 9)" : "Adicional"}${r.ms ? ` · ${(r.ms / 1000).toFixed(1)} s` : ""}</div></div>
        <div class="row">${statusChip(r.status)}<button class="btn sm" type="button" data-qa="${t.id}" ${QA.running ? "disabled" : ""}>Ejecutar</button></div></div>`;
    }).join("");
  }
  function tableHtml() {
    return table(
      ["ID", "Prueba", "Entrada", "Resultado esperado", "Resultado obtenido", "Conclusión"],
      TESTS.map((t) => {
        const r = QA.results[t.id] || {};
        return [
          `<b>${t.id}</b><span class="sub">${t.mandatory ? "Obligatoria" : "Adicional"}</span>`,
          t.name,
          `<span class="small" style="white-space:pre-line">${esc(r.input || t.input || "Valores aleatorios generados en cada ejecución.")}</span>`,
          `<span class="small">${esc(t.expected)}</span>`,
          `<span class="small mono" style="white-space:pre-line">${esc(r.obtained || "—")}</span>`,
          statusChip(r.status),
        ];
      }),
      { id: "qa-table" },
    );
  }
  function summaryHtml() {
    const done = TESTS.filter((t) => QA.results[t.id] && QA.results[t.id].status !== "run" && QA.results[t.id].status);
    const passed = done.filter((t) => QA.results[t.id].status === "pass").length;
    if (!done.length) return chip("idle", "Sin ejecutar");
    return chip(passed === done.length ? "ok" : "bad", `${passed} de ${done.length} pruebas superadas`);
  }
  function historyHtml() {
    if (!QA.history.length) return '<p class="small muted">Sin ejecuciones registradas en este navegador.</p>';
    return table(["Fecha", "Pruebas", "Superadas", "Duración", "Velocidad"], QA.history.map((h) => [h.at, h.n, `${h.passed}/${h.n}`, `${(h.ms / 1000).toFixed(1)} s`, h.speed === 0 ? "instantánea" : `${h.speed} ms`]), { cls: "num" });
  }
  function miniHtml(res) {
    if (!res.valid) return UI.invalidBox(res);
    return table(
      ["Variable", "x_ref", "x_GCP", "Eₐ"],
      res.xref.map((x, i) => [UI.varName(i), `<span ${i === 0 ? "data-x0" : ""}>${F.fix(x, 4)}</span>`, F.fix(res.gcp.x[i], 4), F.sci(res.errGCP[i].ea, 1)]),
      { cls: "num" },
    ) + `<p class="small muted" style="margin-top:6px">GC ${res.gc.iters} / GCP ${res.gcp.iters} it. · κ(A) = ${F.smart(res.kA.cond, 3)} · ${esc(res.M.label)}</p>`;
  }

  function paint() {
    const L = document.getElementById("qa-list");
    if (!L) return;
    L.innerHTML = listHtml();
    document.getElementById("qa-tbl").innerHTML = tableHtml();
    document.getElementById("qa-summary").innerHTML = summaryHtml();
    document.getElementById("qa-hist").innerHTML = historyHtml();
    document.getElementById("qa-run-all").disabled = QA.running;
  }

  App.view({
    id: "qa",
    title: "Módulo de pruebas (QA)",
    nav: "Pruebas (QA)",
    icon: "✓",
    color: "--c-ok",
    module: 9,
    blurb: "8 casos de prueba ejecutados en vivo por un usuario simulado sobre la interfaz.",
    render({ res }) {
      return `
      ${UI.pageHead({
        group: "Calidad y cierre",
        module: 9,
        title: "Módulo de pruebas de software (QA)",
        lead: "Un «usuario simulado» hace clic en los botones, escribe en las celdas y cambia los selectores de esta misma página; la consola registra cada acción. Varias entradas se generan al azar en cada ejecución. Al terminar se restauran los datos que tenía el usuario.",
        tags: ["4 pruebas obligatorias de la guía", "4 pruebas adicionales", "formato Entrada · Esperado · Obtenido · Conclusión"],
      })}
      <div class="row" style="margin-bottom:16px">
        <button class="btn primary" type="button" id="qa-run-all">▶ Ejecutar todas las pruebas</button>
        <label class="small muted" for="qa-speed">Velocidad</label>
        <select class="fld sm" id="qa-speed">
          <option value="450">Lenta (para exponer)</option>
          <option value="120" selected>Normal</option>
          <option value="0">Instantánea</option>
        </select>
        <span class="sp"></span><span id="qa-summary">${summaryHtml()}</span>
      </div>
      <div class="qa-wrap">
        ${card("Casos de prueba", `<div class="qa-list" id="qa-list">${listHtml()}</div>`)}
        ${card("Consola del usuario simulado", `<div class="console" id="qa-console" aria-live="polite"><div><span class="hd">Listo. Pulse «Ejecutar todas las pruebas».</span></div></div>`)}
      </div>
      <div class="grid g2">
        ${card("Vista en vivo: datos que manipula la prueba", `<div id="qa-live-ed">${App.Editor.html("qa")}</div><div style="margin-top:12px">${App.Editor.paramsHtml("qa")}</div>`)}
        ${card("Vista en vivo: resultados", `<div id="qa-live"><div id="qa-mini">${miniHtml(res)}</div></div>`)}
      </div>
      ${card("Registro formal de pruebas", `<div id="qa-tbl">${tableHtml()}</div>`)}
      ${card("Historial de ejecuciones (este navegador)", `<div id="qa-hist">${historyHtml()}</div>`)}
      ${note("Además de este módulo en vivo, el repositorio incluye pruebas automáticas del núcleo numérico (<code>npm test</code>, Node) y pruebas de extremo a extremo con un navegador real (<code>npm run test:e2e</code>, Playwright). Ver README.", "info")}`;
    },
    mount(root) {
      App.Editor.bind(root.querySelector("#qa-live-ed").parentElement);
      root.querySelector("#qa-speed").value = String(QA.speed);
      root.querySelector("#qa-speed").addEventListener("change", (e) => (QA.speed = +e.target.value));
      root.querySelector("#qa-run-all").addEventListener("click", () => runTests(TESTS.map((t) => t.id)));
      root.querySelector("#qa-list").addEventListener("click", (e) => {
        const b = e.target.closest("[data-qa]");
        if (b) runTests([b.dataset.qa]);
      });
    },
    onChange(root, { res }) {
      const ed = root.querySelector("#qa-live-ed");
      if (!ed) return false;
      if (ed.querySelectorAll("input[data-b]").length !== Store.state.n) {
        ed.innerHTML = App.Editor.html("qa");
        const params = ed.parentElement.querySelector("[data-params]");
        if (params) params.outerHTML = App.Editor.paramsHtml("qa");
      }
      App.Editor.sync(ed.parentElement);
      root.querySelector("#qa-mini").innerHTML = miniHtml(res);
      return true;
    },
  });

  App.QA = { run: runTests, TESTS, state: QA };
})();
