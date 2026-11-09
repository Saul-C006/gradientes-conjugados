/* Vista 7c · GCP vs GC y tabla comparativa obligatoria */
(function () {
  "use strict";
  const { card, T, table, esc, invalidBox, note, plot, kpi, yes, varName } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER, unit } = window.CASE;

  const vecCell = (v, d = 4) => v.map((x, i) => `<div><span class="muted">x${F.sub(i + 1)}</span> ${F.fix(x, d)}</div>`).join("");

  /** Interpretación financiera calculada a partir de los resultados. */
  function interp(scen) {
    const I = scen.ideal,
      E = scen.estres,
      M = scen.mal;
    const tI = I.xref.reduce((a, b) => a + b, 0),
      tE = E.xref.reduce((a, b) => a + b, 0);
    const ch = E.xref.map((x, i) => `${unit(i).short} ${x >= I.xref[i] ? "+" : ""}${(((x - I.xref[i]) / I.xref[i]) * 100).toFixed(1)} %`).join(", ");
    return {
      ideal: `Equilibrio estable: el presupuesto coincide con el plan base (${I.xref.map((v) => v.toFixed(0)).join(" / ")}). Con κ(A) ≈ ${I.kA.cond.toFixed(2)}, un error de 1 % en las metas mueve las asignaciones como máximo ≈ ${I.kA.cond.toFixed(1)} %.`,
      estres: `El estrés desplaza el equilibrio sin desestabilizarlo: κ(A) pasa de ${I.kA.cond.toFixed(2)} a ${E.kA.cond.toFixed(2)}. El presupuesto total sube ${(((tE - tI) / tI) * 100).toFixed(1)} % (${ch}). La estructura de dependencias sigue siendo confiable para planificar.`,
      mal: `Planificación frágil: κ(A) ≈ ${F.sci(M.kA.cond, 2)} implica que un error relativo de 10⁻⁶ en los datos puede amplificarse hasta ≈ ${F.sci(M.kA.cond * 1e-6, 1)} en el presupuesto. Causas: redundancia Operaciones–TI (ρ = 0.98) y escalas dispares. IC(0) reduce κ a ${F.smart(M.others.ic0.k.cond, 3)}. Se recomienda normalizar escalas y separar procesos duplicados.`,
    };
  }
  App.interp = interp;

  function mandatoryTable(scen) {
    const it = interp(scen);
    const col = (f) => ORDER.map((k) => f(scen[k], k));
    const rows = [
      ["Solución numérica de referencia (Cholesky)", ...col((r) => vecCell(r.xref))],
      ["Solución GCP (precondicionador del escenario)", ...col((r) => `${vecCell(r.gcp.x)}<span class="sub">M = ${esc(r.M.label)}</span>`)],
      ["Error absoluto Eₐ", ...col((r) => r.errGCP.map((e, i) => `<div><span class="muted">x${F.sub(i + 1)}</span> ${F.sci(e.ea, 2)}</div>`).join(""))],
      ["Error porcentual Eₚ", ...col((r) => r.errGCP.map((e, i) => `<div><span class="muted">x${F.sub(i + 1)}</span> ${e.ep === null ? "n.d." : F.sci(e.ep, 2) + " %"}</div>`).join(""))],
      ["Iteraciones GC (sin precondicionar)", ...col((r) => `<b>${r.gc.iters}</b>`)],
      ["Iteraciones GCP (precondicionado)", ...col((r) => `<b>${r.gcp.iters}</b><span class="sub">${esc(r.M.label)}</span>`)],
      ["  · GCP Jacobi / IC(0) / SSOR", ...col((r) => `${r.others.jacobi.run.iters} / ${r.others.ic0.run.iters} / ${r.others.ssor.run.iters}`)],
      ["Número de condición κ(A)", ...col((r) => F.smart(r.kA.cond, 4))],
      ["Número de condición κ(M⁻¹A)", ...col((r) => `<b>${F.smart(r.kM.cond, 4)}</b><span class="sub">${esc(r.M.label)}</span>`)],
      ["  · κ(M⁻¹A) Jacobi / IC(0) / SSOR", ...col((r) => `${F.smart(r.others.jacobi.k.cond, 3)} / ${F.smart(r.others.ic0.k.cond, 3)} / ${F.smart(r.others.ssor.k.cond, 3)}`)],
      ["Residuo relativo final GCP", ...col((r) => F.sci(r.gcp.trueRes, 3))],
      ["¿Convergió el algoritmo?", ...col((r) => yes(r.gcp.converged))],
      ["Interpretación financiera", ...ORDER.map((k) => `<span class="small" style="font-family:var(--font-sans)">${it[k]}</span>`)],
    ];
    return table(["Indicador", ...ORDER.map((k) => `Escenario ${SCENARIOS[k].short}`)], rows.map((r) => [`<b>${r[0]}</b>`, ...r.slice(1)]), { cls: "num", id: "tabla-obligatoria" });
  }

  App.view({
    id: "comparativa",
    title: "GCP vs GC",
    nav: "Comparativa GCP vs GC",
    icon: "⇄",
    color: "--c-ic0",
    module: 7,
    blurb: "Vectores, iteraciones, residuos y diagnósticos; tabla comparativa obligatoria.",
    render({ res, scen }) {
      const head = UI.pageHead({
        group: "Métodos iterativos",
        module: 7,
        title: "GCP frente a GC: comparativa",
        lead: "Se ejecutan en paralelo el GC simple y el GCP con los tres precondicionadores sobre los mismos datos, con el mismo x₀, la misma tolerancia y el mismo Nmáx. Abajo, la tabla comparativa obligatoria de los tres escenarios (sección 8 de la guía).",
      });
      const mand = `
        <h2 class="sec"><span class="n">§8</span>Tabla comparativa obligatoria de los tres escenarios</h2>
        <p class="muted small">Calculada con los datos originales de cada escenario, ${T("\\mathbf x_0=\\mathbf 0")}, tolerancia y Nmáx de la sección de entrada. El precondicionador «del escenario» es Jacobi para los escenarios 1 y 2 (bien escalados) e IC(0) para el 3 (fuerte correlación fuera de la diagonal), como recomienda la guía.</p>
        ${mandatoryTable(scen)}
        <div class="grid g2" style="margin-top:18px">
          ${card("Iteraciones por escenario y método", plot("cmp-it3", 320))}
          ${card("Escenario 3: convergencia de cada método", plot("cmp-mal", 320))}
        </div>`;
      if (!res.valid) return head + invalidBox(res) + mand;

      const n = res.n;
      const R = [
        { key: "gc", label: "GC simple", run: res.gc, k: res.kA.cond },
        ...["jacobi", "ic0", "ssor"].map((t) => ({ key: t, label: `GCP · ${res.others[t].M.label}`, run: res.others[t].run, k: res.others[t].k.cond })),
      ];
      const vecRows = Array.from({ length: n }, (_, i) => [varName(i), F.fix(res.xref[i], 6), ...R.map((r) => F.fix(r.run.x[i], 6))]);
      const diag = [
        ["Iteraciones", ...R.map((r) => `<b>${r.run.iters}</b>`)],
        ["¿Convergió?", ...R.map((r) => yes(r.run.converged))],
        ["Residuo relativo recursivo ‖rₖ‖/‖b‖", ...R.map((r) => F.sci(r.run.finalRecRes, 3))],
        ["Residuo relativo verdadero ‖b − Ax‖/‖b‖", ...R.map((r) => F.sci(r.run.trueRes, 3))],
        ["Número de condición del sistema iterado", ...R.map((r) => F.smart(r.k, 4))],
        ["Máx. error porcentual vs referencia", ...R.map((r) => `${F.sci(Math.max(...NM.errors(res.xref, r.run.x).map((e) => e.ep ?? 0)), 2)} %`)],
        ["Ahorro de iteraciones vs GC", ...R.map((r) => (r.key === "gc" ? "—" : `${res.gc.iters - r.run.iters >= 0 ? "" : "+"}${res.gc.iters - r.run.iters}`))],
      ];
      const best = R.slice(1).reduce((a, b) => (b.run.iters < a.run.iters || (b.run.iters === a.run.iters && b.k < a.k) ? b : a));
      return `${head}
      <div class="kpis">
        ${kpi("GC simple", `${res.gc.iters} it.`, `κ(A) = ${F.smart(res.kA.cond, 3)}`)}
        ${kpi(`GCP activo · ${res.M.label.split(" (")[0]}`, `${res.gcp.iters} it.`, `κ(M⁻¹A) = ${F.smart(res.kM.cond, 3)}`, "acc")}
        ${kpi("Mejor precondicionador", best.label.replace("GCP · ", "").split(" (")[0], `${best.run.iters} it. · κ = ${F.smart(best.k, 3)}`, "ok")}
        ${kpi("GCP ≤ GC", res.gcp.iters <= res.gc.iters ? "Sí" : "No", "prueba QA-04", res.gcp.iters <= res.gc.iters ? "ok" : "bad")}
      </div>
      <h2 class="sec"><span class="n">x</span>Datos actuales: vectores aproximados</h2>
      ${card("", table(["Variable", "Referencia", ...R.map((r) => r.label)], vecRows, { cls: "num" }))}
      ${card("Diagnósticos", table(["Indicador", ...R.map((r) => r.label)], diag, { cls: "num" }))}
      <div class="grid g2">
        ${card("Convergencia con los datos actuales", plot("cmp-conv", 340))}
        ${card("Iteraciones y número de condición", plot("cmp-bars", 340))}
      </div>
      ${note(
        `En sistemas pequeños (n = ${n}) el GC termina en a lo sumo ${n} pasos en aritmética exacta, así que la ganancia en iteraciones es modesta.
        Lo que el precondicionador cambia de forma drástica es κ: en sistemas grandes, donde la terminación finita no ayuda, esa reducción determina la velocidad.`,
        "idea",
        "Lectura.",
      )}
      ${mand}`;
    },
    mount(_, { res, scen }) {
      const C = Charts.COLORS;
      if (res.valid) {
        Charts.convergence(
          "cmp-conv",
          [
            { name: "GC simple", y: res.gc.hist, color: C.gc, dash: "dot" },
            { name: "GCP Jacobi", y: res.others.jacobi.run.hist, color: C.jacobi },
            { name: "GCP IC(0)", y: res.others.ic0.run.hist, color: C.ic0 },
            { name: "GCP SSOR", y: res.others.ssor.run.hist, color: C.ssor },
          ],
          res.opts.tol,
        );
        const labels = ["GC", "Jacobi", "IC(0)", "SSOR"];
        const its = [res.gc.iters, res.others.jacobi.run.iters, res.others.ic0.run.iters, res.others.ssor.run.iters];
        const ks = [res.kA.cond, res.others.jacobi.k.cond, res.others.ic0.k.cond, res.others.ssor.k.cond];
        Charts.draw(
          "cmp-bars",
          [
            { x: labels, y: its, type: "bar", name: "iteraciones", marker: { color: [C.gc, C.jacobi, C.ic0, C.ssor] }, text: its, textposition: "outside", yaxis: "y" },
            { x: labels, y: ks, type: "scatter", mode: "lines+markers", name: "κ (eje derecho, log)", yaxis: "y2", line: { color: C.ink, width: 2, dash: "dot" }, marker: { size: 9 } },
          ],
          {
            yaxis: { title: { text: "iteraciones" }, dtick: 1, range: [0, Math.max(...its) + 1.2] },
            yaxis2: Object.assign(Charts.logAxis("κ"), { overlaying: "y", side: "right", showgrid: false }),
            margin: { r: 60 },
          },
        );
      }
      const cats = ORDER.map((k) => `${SCENARIOS[k].num}. ${SCENARIOS[k].short}`);
      Charts.bars(
        "cmp-it3",
        cats,
        [
          { name: "GC simple", y: ORDER.map((k) => scen[k].gc.iters), color: C.gc },
          { name: "GCP Jacobi", y: ORDER.map((k) => scen[k].others.jacobi.run.iters), color: C.jacobi },
          { name: "GCP IC(0)", y: ORDER.map((k) => scen[k].others.ic0.run.iters), color: C.ic0 },
          { name: "GCP SSOR", y: ORDER.map((k) => scen[k].others.ssor.run.iters), color: C.ssor },
        ],
        { ytitle: "iteraciones", layout: { yaxis: { dtick: 1 } } },
      );
      const m = scen.mal;
      Charts.convergence(
        "cmp-mal",
        [
          { name: "GC simple", y: m.gc.hist, color: C.gc, dash: "dot" },
          { name: "GCP Jacobi", y: m.others.jacobi.run.hist, color: C.jacobi },
          { name: "GCP IC(0)", y: m.others.ic0.run.hist, color: C.ic0 },
          { name: "GCP SSOR", y: m.others.ssor.run.hist, color: C.ssor },
        ],
        m.opts.tol,
      );
    },
  });
})();
