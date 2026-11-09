/* Vista 4 · Entrada de datos (editor de A, b, x₀, tolerancia, Nmáx y M) */
(function () {
  "use strict";
  const { card, T, table, chip, esc, invalidBox, kpi, varName } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER } = window.CASE;

  /** Matriz SPD aleatoria "financiera": diagonal dominante con algunos ceros. */
  function randomSPD(n) {
    const A = NM.zeros(n);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const v = Math.random() < 0.3 ? 0 : +(Math.random() * 0.4).toFixed(2);
        A[i][j] = A[j][i] = v;
      }
    for (let i = 0; i < n; i++) {
      const off = A[i].reduce((s, v, j) => (j === i ? s : s + Math.abs(v)), 0);
      A[i][i] = +(off + 0.6 + Math.random()).toFixed(2);
    }
    const plan = Array.from({ length: n }, () => Math.round(300 + Math.random() * 700));
    const b = NM.matVec(A, plan).map((v) => +v.toFixed(2));
    return { A, b };
  }

  function results(res) {
    if (!res.valid) return invalidBox(res);
    const n = res.n;
    const v = res.validation;
    const rows = Array.from({ length: n }, (_, i) => [
      varName(i),
      F.fix(res.xref[i], 6),
      F.fix(res.gcp.x[i], 6),
      F.fix(res.gc.x[i], 6),
      F.sci(res.errGCP[i].ea, 2),
    ]);
    return `
      <div class="kpis">
        ${kpi("Validación", "SPD ✓", `Δ mín = ${F.smart(Math.min(...v.minors), 4)}`, "ok")}
        ${kpi("κ(A)", F.smart(res.kA.cond, 4), "λmáx / λmín")}
        ${kpi(`κ(M⁻¹A) · ${res.M.label.split(" (")[0]}`, F.smart(res.kM.cond, 4), "matriz precondicionada", "acc")}
        ${kpi("Iteraciones GC / GCP", `${res.gc.iters} / ${res.gcp.iters}`, res.gcp.converged ? "GCP convergió" : "GCP no convergió", res.gcp.converged ? "ok" : "bad")}
        ${kpi("Residuo relativo GCP", F.sci(res.gcp.trueRes, 2), "‖b − Ax‖₂ / ‖b‖₂")}
        ${kpi("Recálculo completo", `${res.ms.toFixed(1)} ms`, "todos los métodos")}
      </div>
      ${table(["Variable", "Referencia (Cholesky)", `GCP · ${esc(res.M.label)}`, "GC simple", "Eₐ GCP"], rows, { cls: "num" })}
      <p class="small muted" style="margin-top:8px">El detalle de cada método está en su propia página: <a href="#/cholesky">Cholesky</a> · <a href="#/lu">LU</a> · <a href="#/gauss">Gauss</a> · <a href="#/gc">GC</a> · <a href="#/gcp">GCP</a> · <a href="#/comparativa">Comparativa</a>.</p>`;
  }

  function editLog() {
    const L = Store.editLog.slice(0, 8);
    if (!L.length) return '<p class="small muted">Aún no hay ediciones manuales en esta sesión.</p>';
    return table(
      ["Hora", "Celda", "Antes", "Después"],
      L.map((e) => [e.t.toLocaleTimeString(), `${e.what}${e.mirror ? " (+ simétrica)" : ""}`, esc(e.from), esc(e.to)]),
      { cls: "num" },
    );
  }

  App.view({
    id: "datos",
    title: "Entrada de datos",
    icon: "✎",
    color: "--c-gauss",
    module: 4,
    blurb: "Editar A, b, x₀, tolerancia, Nmáx y el precondicionador; recálculo instantáneo.",
    render({ res }) {
      const scenBtns = ORDER.map((k) => `<button class="btn sm" type="button" data-scen="${k}">Escenario ${SCENARIOS[k].num} · ${SCENARIOS[k].short}</button>`).join("");
      return `
      ${UI.pageHead({
        group: "Datos",
        module: 4,
        title: "Entrada de datos",
        lead: "Escriba cualquier coeficiente de A o meta de b: la validación (simetría y Sylvester), la solución de referencia, el GCP, el GC, los errores y todos los gráficos de la página se recalculan al instante.",
      })}
      ${card(
        "Sistema A x = b",
        `<div class="row" style="margin-bottom:12px">${scenBtns}<span class="sp"></span>
          <button class="btn sm" type="button" id="d-rand">Generar matriz SPD aleatoria</button></div>
        <div id="d-editor">${App.Editor.html("ed")}</div>
        <p class="small muted" style="margin-top:8px">Las celdas de la diagonal (retornos directos) están sombreadas. Se acepta coma o punto decimal y notación científica (1e-6).
        Una celda en rojo indica el motivo del error; la aplicación no se interrumpe.</p>`,
        { right: `<span id="d-status">${res.valid ? chip("ok", "Matriz válida (SPD)") : chip("bad", "Matriz no válida")}</span>` },
      )}
      ${card("Parámetros del método iterativo", `<div id="d-params">${App.Editor.paramsHtml("ed")}</div>`)}
      ${card("Resultados inmediatos", `<div id="d-results">${results(res)}</div>`)}
      ${card("Registro de ediciones manuales", `<div id="d-log">${editLog()}</div>`)}
      `;
    },
    mount(root) {
      App.Editor.bind(root.querySelector("#d-editor"));
      App.Editor.bind(root.querySelector("#d-params"));
      root.querySelectorAll("[data-scen]").forEach((b) => b.addEventListener("click", () => Store.loadScenario(b.dataset.scen)));
      root.querySelector("#d-rand").addEventListener("click", () => {
        const { A, b } = randomSPD(Store.state.n);
        Store.setAll(A, b);
      });
      App.Editor.sync(root);
    },
    onChange(root, { res }, reason) {
      if (reason === "dim" || reason === "scenario" || reason === "restore") return false;
      App.Editor.sync(root);
      root.querySelector("#d-results").innerHTML = results(res);
      root.querySelector("#d-log").innerHTML = editLog();
      root.querySelector("#d-status").innerHTML = res.valid ? chip("ok", "Matriz válida (SPD)") : chip("bad", "Matriz no válida");
      const om = root.querySelector('[data-param="omega"]');
      if (om) om.closest(".fl").classList.toggle("muted-fl", Store.state.precond !== "ssor");
      return true;
    },
  });

  App.randomSPD = randomSPD;
})();
