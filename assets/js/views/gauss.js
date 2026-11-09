/* Vista 6c · Eliminación de Gauss sobre la matriz aumentada [A | b] */
(function () {
  "use strict";
  const { card, T, TD, invalidBox, note, plot, kpi, steps } = window.UI;
  const F = window.FMT;
  let stage = 0; // etapa visible en el visor paso a paso

  function stageHtml(g, k) {
    const n = g.U.length;
    const snap = g.snaps[k];
    const hl = new Set();
    let ops = "";
    if (k === 0) {
      ops = `<p>Matriz aumentada inicial ${T("[A\\,|\\,\\mathbf b]")}. En la etapa ${T("k")} se anulan los elementos bajo el pivote ${T("a_{kk}")}.</p>`;
    } else {
      const piv = k - 1;
      hl.add(`${piv},${piv}`);
      ops = steps(
        g.ops[piv].map(
          (o) =>
            `${T(`m_{${o.i + 1}${o.k + 1}} = \\dfrac{a_{${o.i + 1}${o.k + 1}}}{a_{${o.k + 1}${o.k + 1}}} = \\dfrac{${F.tn(o.num, 6)}}{${F.tn(o.piv, 6)}} = \\mathbf{${F.tn(o.m, 6)}}`)}
             ${TD(`R_{${o.i + 1}} \\leftarrow R_{${o.i + 1}} - (${F.tn(o.m, 6)})\\,R_{${o.k + 1}}`)}`,
        ),
      );
    }
    const M = snap.M;
    const shown = TD(F.tmat(M, { aug: true, d: 5, hl, hlColor: "#fde68a", dim: (i, j) => j < k && i > j }));
    return `<div class="grid g2"><div>${shown}</div><div>${ops}</div></div>`;
  }

  App.view({
    id: "gauss",
    title: "Eliminación de Gauss",
    nav: "Eliminación de Gauss",
    icon: "G",
    color: "--c-gauss",
    module: 6,
    blurb: "Visor por etapas de [A | b] → [U | c] y sustitución regresiva.",
    render({ res }) {
      const head = UI.pageHead({
        group: "Métodos directos · verificación cruzada",
        module: 6,
        title: "Eliminación de Gauss",
        lead: "Se transforma la matriz aumentada [A | b] en un sistema triangular superior [U | c] mediante operaciones de fila, y luego se despeja de abajo hacia arriba.",
        tags: ["operaciones elementales de fila", "sin pivoteo (A SPD)", "≈ 2n³/3 operaciones"],
      });
      const theory = `<div class="grid g2">
        ${card("Fórmulas de la etapa k", TD("m_{ik} = \\frac{a^{(k)}_{ik}}{a^{(k)}_{kk}},\\qquad a^{(k+1)}_{ij} = a^{(k)}_{ij} - m_{ik}\\,a^{(k)}_{kj},\\qquad b^{(k+1)}_i = b^{(k)}_i - m_{ik}\\,b^{(k)}_k") + TD("x_i = \\frac{1}{u_{ii}}\\Big(c_i - \\sum_{j>i} u_{ij}x_j\\Big)"))}
        ${card("¿Por qué no hace falta pivoteo?", `<p>Para A simétrica definida positiva todos los pivotes ${T("a^{(k)}_{kk}")} son positivos (son ${T("\\Delta_k/\\Delta_{k-1}")}), y la eliminación sin intercambio de filas es numéricamente estable.
          Los multiplicadores ${T("m_{ik}")} son exactamente los elementos de ${T("L")} en la factorización LU.</p>`)}
      </div>`;
      if (!res.valid) return head + theory + invalidBox(res);
      const g = res.gauss,
        n = res.n;
      if (stage > n - 1) stage = 0;
      const btns = Array.from({ length: n }, (_, k) => `<button type="button" class="btn sm ${k === stage ? "primary" : ""}" data-stage="${k}">${k === 0 ? "Inicial" : `Etapa ${k}`}</button>`).join("");
      return `${head}${theory}
      <div class="kpis">
        ${kpi("Pivotes", g.pivots.map((p) => F.smart(p, 3)).join(" · "), "todos positivos ⇒ sin pivoteo")}
        ${kpi("∏ pivotes = det A", F.smart(g.pivots.reduce((a, b) => a * b, 1), 5), "coincide con Δₙ")}
        ${kpi("Residuo relativo", F.sci(res.res.gauss, 2), "‖b − Ax‖₂/‖b‖₂", "ok")}
      </div>
      <h2 class="sec"><span class="n">1</span>Eliminación hacia adelante, etapa por etapa</h2>
      ${card("Visor de etapas", `<div class="stepper" id="g-steps">${btns}<span class="sp"></span><button class="btn sm" type="button" id="g-next">Siguiente etapa →</button></div><div id="g-stage">${stageHtml(g, stage)}</div>`)}
      <div class="grid g2">
        ${card("Multiplicadores mᵢₖ de cada etapa", plot("g-mult", 280))}
        ${card("Sistema triangular resultante [U | c]", TD(F.tmat(g.U.map((r, i) => r.concat([g.c[i]])), { aug: true, d: 5, dim: (i, j) => j < i })))}
      </div>
      <h2 class="sec"><span class="n">2</span>Sustitución regresiva U x = c</h2>
      ${card("", App.substSteps(g.bwd, { M: "u", v: "x", rhs: "c" }) + TD(`\\mathbf x = ${F.tvec(g.x, { d: 6 })}`))}
      ${note(`Gauss reproduce la solución de Cholesky con una diferencia máxima de ${F.sci(Math.max(...res.xref.map((x, i) => Math.abs(x - g.x[i]))), 2)} miles de Bs.`, "ok")}`;
    },
    mount(root, { res }) {
      if (!res.valid) return;
      const g = res.gauss,
        n = res.n;
      const show = (k) => {
        stage = k;
        root.querySelector("#g-stage").innerHTML = stageHtml(g, k);
        root.querySelectorAll("[data-stage]").forEach((b) => b.classList.toggle("primary", +b.dataset.stage === k));
      };
      root.querySelector("#g-steps").addEventListener("click", (e) => {
        const b = e.target.closest("[data-stage]");
        if (b) show(+b.dataset.stage);
        if (e.target.id === "g-next") show((stage + 1) % n);
      });
      const series = g.ops.map((ops, k) => ({
        name: `Etapa ${k + 1} (pivote a${k + 1}${k + 1})`,
        y: Array.from({ length: n }, (_, i) => {
          const o = ops.find((q) => q.i === i);
          return o ? o.m : null;
        }),
        color: Charts.COLORS.series()[k % 8],
        text: Array.from({ length: n }, (_, i) => {
          const o = ops.find((q) => q.i === i);
          return o ? F.nf(o.m, 4) : "";
        }),
      }));
      Charts.bars("g-mult", Array.from({ length: n }, (_, i) => `fila ${i + 1}`), series, { ytitle: "mᵢₖ" });
    },
  });
})();
