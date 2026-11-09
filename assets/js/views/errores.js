/* Vista 8 · Análisis de errores y condicionamiento */
(function () {
  "use strict";
  const { card, T, TD, table, esc, invalidBox, note, plot, kpi, details, steps, varName, seg } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER, unit } = window.CASE;
  let which = "active"; // active | jacobi | ic0 | ssor | gc
  let delta = -4; // log10 de la perturbación relativa

  const pick = (res) => {
    if (which === "gc") return { label: "GC simple", run: res.gc };
    if (which === "active") return { label: `GCP · ${res.M.label}`, run: res.gcp };
    return { label: `GCP · ${res.others[which].M.label}`, run: res.others[which].run };
  };

  function errTable(res) {
    const p = pick(res);
    const er = NM.errors(res.xref, p.run.x);
    const rows = er.map((e, i) => [
      varName(i),
      F.p15(res.xref[i]),
      F.p15(p.run.x[i]),
      F.sci(e.ea, 3),
      e.er === null ? '<span class="chip warn">no definido (x_ref = 0)</span>' : F.sci(e.er, 3),
      e.ep === null ? "—" : `${F.sci(e.ep, 3)} %`,
    ]);
    return table(["Variable", "x_ref (15 cifras)", `x · ${esc(p.label)}`, "Eₐ = |x_ref − x|", "Eᵣ = Eₐ/|x_ref|", "Eₚ = Eᵣ × 100 %"], rows, { cls: "num", id: "tabla-errores" });
  }

  /** Experimento de sensibilidad: b → b + δb con ‖δb‖/‖b‖ = δ. */
  function sensitivity(res, d, trials = 60) {
    const nb = NM.norm2(res.b),
      nx = NM.norm2(res.xref);
    const L = res.chol.L;
    const out = [];
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
    // Dirección del peor caso: autovector de λmín (amplifica κ veces)
    const eg = NM.eigSym(res.A, true);
    const dirs = [];
    for (let t = 0; t < trials; t++) dirs.push(res.b.map(() => rnd()));
    dirs.push(eg.vectors[0].map((v, i) => v)); // peor caso para δx
    for (const dir of dirs) {
      const s = (d * nb) / NM.norm2(dir);
      const db = dir.map((v) => v * s);
      const dx = NM.backwardT(L, NM.forward(L, db));
      out.push(NM.norm2(dx) / nx);
    }
    return out;
  }

  App.view({
    id: "errores",
    title: "Análisis de errores",
    icon: "ε",
    color: "--c-bad",
    module: 8,
    blurb: "Eₐ, Eᵣ, Eₚ por variable, residuo global, κ(A), κ(M⁻¹A) y sensibilidad.",
    render({ res, scen }) {
      const head = UI.pageHead({
        group: "Análisis",
        module: 8,
        title: "Análisis de errores y condicionamiento",
        lead: "Se compara cada componente del GCP con la solución de referencia de Cholesky y se mide qué tan sensible es el sistema a errores en los datos mediante el número de condición.",
      });
      const formulas = card(
        "Definiciones",
        `<div class="grid g2"><div>
          ${TD("E_{a,i} = |x_{\\text{ref},i} - x_{\\text{GCP},i}|")}
          ${TD("E_{r,i} = \\frac{E_{a,i}}{|x_{\\text{ref},i}|}\\quad(\\text{no definido si } x_{\\text{ref},i}=0)")}
          ${TD("E_{p,i} = E_{r,i}\\times 100\\,\\%")}
        </div><div>
          ${TD("\\text{Residuo relativo global} = \\frac{\\|\\mathbf b - A\\mathbf x_{\\text{GCP}}\\|_2}{\\|\\mathbf b\\|_2}")}
          ${TD("\\kappa_2(A) = \\|A\\|_2\\|A^{-1}\\|_2 = \\frac{\\lambda_{\\max}}{\\lambda_{\\min}},\\qquad \\kappa_2(M^{-1}A) = \\kappa_2(L^{-1}AL^{-T})")}
          ${TD("\\frac{\\|\\mathbf x - \\mathbf x^*\\|}{\\|\\mathbf x^*\\|} \\le \\kappa(A)\\,\\frac{\\|\\mathbf r\\|}{\\|\\mathbf b\\|}")}
        </div></div>`,
      );
      const scRows = ORDER.map((k) => {
        const r = scen[k];
        const mx = Math.max(...r.errGCP.map((e) => e.ep ?? 0));
        return [
          `<b>${SCENARIOS[k].num}. ${SCENARIOS[k].short}</b>`,
          F.sci(Math.max(...r.errGCP.map((e) => e.ea)), 2),
          `${F.sci(mx, 2)} %`,
          F.sci(r.gcp.trueRes, 2),
          F.smart(r.kA.cond, 4),
          `${F.smart(r.kM.cond, 4)} <span class="sub">${esc(r.M.label)}</span>`,
          F.sci(r.kA.cond * r.gcp.trueRes, 2),
        ];
      });
      const scenTbl = card(
        "Resumen de errores en los tres escenarios",
        table(["Escenario", "máx Eₐ", "máx Eₚ", "Residuo GCP", "κ(A)", "κ(M⁻¹A)", "Cota κ·‖r‖/‖b‖"], scRows, { cls: "num" }),
      );
      if (!res.valid) return head + formulas + invalidBox(res) + scenTbl;

      const p = pick(res);
      const er = NM.errors(res.xref, p.run.x);
      const mx = Math.max(...er.map((e) => e.ep ?? 0));
      const bound = res.kA.cond * p.run.trueRes;
      const realRel = NM.norm2(NM.sub(p.run.x, res.xref)) / NM.norm2(res.xref);
      const opts = [
        { value: "active", label: `GCP activo` },
        { value: "jacobi", label: "GCP Jacobi" },
        { value: "ic0", label: "GCP IC(0)" },
        { value: "ssor", label: "GCP SSOR" },
        { value: "gc", label: "GC simple" },
      ];
      const n = res.n;
      const eig = res.kA.eig;
      const inv = NM.inverse(res.A);
      const norm1 = (M) => Math.max(...M[0].map((_, j) => M.reduce((s, r) => s + Math.abs(r[j]), 0)));
      const normI = (M) => Math.max(...M.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));

      const procErr = steps(
        er.map((e, i) =>
          TD(
            `E_{a,${i + 1}} = |${F.p15(res.xref[i]).replace("−", "-")} - ${F.p15(p.run.x[i]).replace("−", "-")}| = ${F.ts(e.ea, 4)}` +
              (e.er === null ? "" : `,\\quad E_{r,${i + 1}} = \\frac{${F.ts(e.ea, 4)}}{${F.tn(Math.abs(res.xref[i]), 6)}} = ${F.ts(e.er, 4)},\\quad E_{p,${i + 1}} = ${F.ts(e.ep, 4)}\\,\\%`),
          ),
        ),
      );
      const r = NM.sub(res.b, NM.matVec(res.A, p.run.x));
      const procRes = TD(`\\mathbf b - A\\mathbf x = ${F.tvecRow(r.map((v) => +v.toPrecision(4)), 6)}`) + TD(`\\frac{\\|\\mathbf b - A\\mathbf x\\|_2}{\\|\\mathbf b\\|_2} = \\frac{${F.ts(NM.norm2(r), 4)}}{${F.tn(NM.norm2(res.b), 6)}} = ${F.ts(p.run.trueRes, 4)}`);
      const procK =
        TD(`\\lambda(A) = \\{${eig.map((e) => F.tn(e, 6)).join(",\\ ")}\\}`) +
        TD(`\\kappa_2(A) = \\frac{\\lambda_{\\max}}{\\lambda_{\\min}} = \\frac{${F.tn(eig[n - 1], 6)}}{${F.tn(eig[0], 6)}} = ${F.tn(res.kA.cond, 6)}`) +
        TD(`\\lambda(M^{-1}A) = \\{${res.kM.eig.map((e) => F.tn(e, 6)).join(",\\ ")}\\}\\Rightarrow \\kappa_2(M^{-1}A) = \\frac{${F.tn(res.kM.eig[n - 1], 6)}}{${F.tn(res.kM.eig[0], 6)}} = ${F.tn(res.kM.cond, 6)}`) +
        `<p class="small">Comprobación con otras normas: ${T(`\\kappa_1(A) = \\|A\\|_1\\|A^{-1}\\|_1 = ${F.tn(norm1(res.A) * norm1(inv), 4)}`)}, ${T(`\\kappa_\\infty(A) = ${F.tn(normI(res.A) * normI(inv), 4)}`)}. Todas las normas dan el mismo orden de magnitud.</p>`;

      return `${head}${formulas}
      <div class="row" style="margin-bottom:14px"><span class="small muted">Analizar:</span>${seg("which", opts, which)}</div>
      <div class="kpis">
        ${kpi("Residuo relativo global", F.sci(p.run.trueRes, 3), "‖b − Ax‖₂/‖b‖₂", "ok")}
        ${kpi("κ₂(A)", F.smart(res.kA.cond, 4), "λmáx/λmín")}
        ${kpi("κ₂(M⁻¹A)", F.smart(res.kM.cond, 4), esc(res.M.label), "acc")}
        ${kpi("Mayor error porcentual", `${F.sci(mx, 2)} %`, esc(p.label))}
        ${kpi("Error relativo real ‖e‖/‖x*‖", F.sci(realRel, 2), `cota κ·‖r‖/‖b‖ = ${F.sci(bound, 2)}`, realRel <= bound * 1.0001 + 1e-300 ? "ok" : "warn")}
      </div>
      ${card("Tabla interactiva de errores por variable", errTable(res) + `<p class="small muted" style="margin-top:8px">Las soluciones se muestran con 15 cifras significativas porque los errores aparecen en las últimas cifras.</p>`)}
      <div class="grid g2">
        ${card("Error absoluto por variable (escala log)", plot("er-bars", 300))}
        ${card("Error porcentual GCP vs GC", plot("er-pct", 300))}
      </div>
      ${card(
        "Procedimiento paso a paso",
        details("er-p1", "Errores absoluto, relativo y porcentual por variable", procErr) +
          details("er-p2", "Residuo relativo global", procRes) +
          details("er-p3", "Números de condición κ(A) y κ(M⁻¹A) <span class='hint'>· por autovalores</span>", procK),
      )}

      <h2 class="sec"><span class="n">δ</span>Experimento de sensibilidad: ¿cuánto amplifica A un error en las metas?</h2>
      ${card(
        "Perturbación de b",
        `<p>Se perturba ${T("\\mathbf b")} con ${T("\\|\\delta\\mathbf b\\|/\\|\\mathbf b\\| = \\delta")} en 60 direcciones aleatorias y en la dirección del peor caso (autovector de ${T("\\lambda_{\\min}")}).
        La teoría garantiza ${T("\\|\\delta\\mathbf x\\|/\\|\\mathbf x\\| \\le \\kappa(A)\\,\\delta")}.</p>
        <div class="row"><label class="small" for="er-d">δ = 10<sup id="er-dl">${delta}</sup></label>
        <input type="range" id="er-d" min="-10" max="-1" step="1" value="${delta}" style="flex:1;max-width:340px"></div>
        <div class="grid g2"><div>${plot("er-sens", 300)}</div><div id="er-sens-t"></div></div>`,
      )}
      ${scenTbl}
      ${note(`Un residuo pequeño solo garantiza un error pequeño si κ(A) es moderado. Con κ(A) = ${F.smart(res.kA.cond, 4)}, un residuo de ${F.sci(p.run.trueRes, 2)} admite un error relativo de hasta ${F.sci(bound, 2)}.`, "idea", "Residuo frente a error.")}`;
    },
    mount(root, { res }) {
      root.querySelectorAll("[data-which]").forEach((b) =>
        b.addEventListener("click", () => {
          which = b.dataset.which;
          App.render(true);
        }),
      );
      if (!res.valid) return;
      const C = Charts.COLORS;
      const p = pick(res);
      const labels = res.xref.map((_, i) => `x${i + 1} ${unit(i).short}`);
      const eaP = NM.errors(res.xref, p.run.x).map((e) => e.ea);
      const eaC = res.errGC.map((e) => e.ea);
      const floor = (v) => Math.max(v, 1e-18);
      Charts.bars(
        "er-bars",
        labels,
        [
          { name: p.label, y: eaP.map(floor), color: C.gcp, text: eaP.map((v) => F.sci(v, 1)) },
          { name: "GC simple", y: eaC.map(floor), color: C.gc, text: eaC.map((v) => F.sci(v, 1)) },
        ],
        { log: true, ytitle: "Eₐ (miles de Bs)" },
      );
      const epP = NM.errors(res.xref, p.run.x).map((e) => e.ep ?? 0);
      const epC = res.errGC.map((e) => e.ep ?? 0);
      Charts.bars(
        "er-pct",
        labels,
        [
          { name: p.label, y: epP.map(floor), color: C.gcp, text: epP.map((v) => F.sci(v, 1)) },
          { name: "GC simple", y: epC.map(floor), color: C.gc, text: epC.map((v) => F.sci(v, 1)) },
        ],
        { log: true, ytitle: "Eₚ (%)" },
      );
      const drawSens = () => {
        const d = 10 ** delta;
        const s = sensitivity(res, d);
        const worst = s[s.length - 1];
        const rand = s.slice(0, -1);
        Charts.draw(
          "er-sens",
          [
            { y: rand, x: rand.map((_, i) => i + 1), mode: "markers", name: "direcciones aleatorias", marker: { color: C.gcp, size: 6 } },
            { y: [worst], x: [rand.length + 3], mode: "markers", name: "peor caso (λmín)", marker: { color: C.gc, size: 12, symbol: "star" } },
            { y: [res.kA.cond * d, res.kA.cond * d], x: [0, rand.length + 4], mode: "lines", name: "cota κ(A)·δ", line: { color: C.tol, dash: "dash" } },
            { y: [d, d], x: [0, rand.length + 4], mode: "lines", name: "δ (sin amplificación)", line: { color: C.muted, dash: "dot" } },
          ],
          { yaxis: Charts.logAxis("‖δx‖/‖x‖"), xaxis: { title: { text: "prueba" } } },
        );
        root.querySelector("#er-sens-t").innerHTML = table(
          ["Indicador", "Valor"],
          [
            ["δ = ‖δb‖/‖b‖", F.sci(d, 0)],
            ["Amplificación media", F.smart(rand.reduce((a, b) => a + b, 0) / rand.length / d, 3)],
            ["Amplificación del peor caso", F.smart(worst / d, 4)],
            ["κ(A) (cota)", F.smart(res.kA.cond, 4)],
            ["Error relativo máximo en x", F.sci(worst, 2)],
          ],
          { cls: "num" },
        ) + `<p class="small muted" style="margin-top:8px">La amplificación del peor caso es menor o igual que κ(A): la cota es alcanzable cuando el error de b se alinea con λmáx y la solución con λmín.</p>`;
        root.querySelector("#er-dl").textContent = delta;
      };
      drawSens();
      root.querySelector("#er-d").addEventListener("input", (e) => {
        delta = +e.target.value;
        drawSens();
      });
    },
  });
})();
