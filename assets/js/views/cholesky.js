/* Vista 6a · Método de Cholesky (A = L Lᵀ) paso a paso */
(function () {
  "use strict";
  const { card, T, TD, table, esc, invalidBox, note, plot, kpi, details, steps, varName } = window.UI;
  const F = window.FMT;
  const { unit } = window.CASE;

  /**
   * Pasos de sustitución en TeX.
   *  st: pasos de NM.forwardSteps/backwardSteps
   *  o: { M: "l" | "u" ..., v: "y" | "x", rhs: "b" | "y" | "c", unitDiag: bool, transpose: bool }
   */
  function substSteps(st, o) {
    return steps(
      st.map((s) => {
        const i = s.i + 1;
        const coef = (k) => (o.transpose ? `${o.M}_{${k + 1}${i}}` : `${o.M}_{${i}${k + 1}}`);
        const sym = s.terms.length ? `${o.rhs}_{${i}} - (${s.terms.map((t) => `${coef(t.k)}${o.v}_{${t.k + 1}}`).join(" + ")})` : `${o.rhs}_{${i}}`;
        const num = s.terms.length ? `${F.tn(s.rhs)} - (${s.terms.map((t) => `${F.tp(t.coef, 5)}\\cdot${F.tp(t.val, 5)}`).join(" + ")})` : F.tn(s.rhs);
        const d = o.unitDiag ? "" : `${o.M}_{${i}${i}}`;
        const lhs = `${o.v}_{${i}}`;
        if (o.unitDiag) return TD(`${lhs} = ${sym} = ${num} = \\mathbf{${F.tn(s.val, 6)}}`);
        return TD(`${lhs} = \\frac{${sym}}{${d}} = \\frac{${num}}{${F.tn(s.diag, 6)}} = \\mathbf{${F.tn(s.val, 6)}}`);
      }),
    );
  }
  App.substSteps = substSteps;

  function factorSteps(ch) {
    return steps(
      ch.factorSteps.map((s) => {
        const i = s.i + 1,
          j = s.j + 1;
        if (s.type === "diag") {
          const sym = s.terms.length ? `a_{${i}${i}} - ${s.terms.map((_, k) => `l_{${i}${k + 1}}^2`).join(" - ")}` : `a_{${i}${i}}`;
          const num = s.terms.length ? `${F.tn(s.a)} - ${s.terms.map((t) => `${F.tp(t, 5)}^2`).join(" - ")}` : F.tn(s.a);
          return `<b>Pivote de la columna ${j}</b>${TD(`l_{${i}${i}} = \\sqrt{${sym}} = \\sqrt{${num}} = \\sqrt{${F.tn(s.inner, 6)}} = \\mathbf{${F.tn(s.val, 6)}}`)}`;
        }
        const sym = s.terms.length ? `a_{${i}${j}} - ${s.terms.map((_, k) => `l_{${i}${k + 1}}l_{${j}${k + 1}}`).join(" - ")}` : `a_{${i}${j}}`;
        const num = s.terms.length ? `${F.tn(s.a)} - ${s.terms.map(([p, q]) => `${F.tp(p, 5)}\\cdot${F.tp(q, 5)}`).join(" - ")}` : F.tn(s.a);
        const fill = s.a === 0 && s.val !== 0 ? ` <span class="chip warn"><span class="dot"></span>relleno: a${F.sub(i)}${F.sub(j)} = 0 pero l${F.sub(i)}${F.sub(j)} ≠ 0</span>` : "";
        return `Elemento bajo el pivote${fill}${TD(`l_{${i}${j}} = \\frac{${sym}}{l_{${j}${j}}} = \\frac{${num}}{${F.tn(s.div, 6)}} = \\mathbf{${F.tn(s.val, 6)}}`)}`;
      }),
    );
  }

  App.view({
    id: "cholesky",
    title: "Método de Cholesky",
    nav: "Cholesky",
    icon: "L",
    color: "--c-chol",
    module: 6,
    blurb: "A = L Lᵀ: factorización, sustituciones y verificación paso a paso.",
    render({ res }) {
      const head = UI.pageHead({
        group: "Métodos directos · solución de referencia oficial",
        module: 6,
        title: "Método de Cholesky",
        lead: "Toda matriz simétrica definida positiva se escribe de forma única como A = L Lᵀ, con L triangular inferior y diagonal positiva. Resolver A x = b se reduce a dos sistemas triangulares.",
        tags: ["A simétrica definida positiva", "≈ n³/3 operaciones", "estable sin pivoteo"],
      });
      const theory = `<div class="grid g2">
        ${card(
          "Fórmulas",
          TD("l_{jj} = \\sqrt{a_{jj} - \\sum_{k=1}^{j-1} l_{jk}^2}") +
            TD("l_{ij} = \\frac{1}{l_{jj}}\\Big(a_{ij} - \\sum_{k=1}^{j-1} l_{ik}l_{jk}\\Big),\\quad i > j") +
            `<p class="small muted">Si algún radicando es ≤ 0, A no es definida positiva y el método se detiene: por eso Cholesky es también una prueba de SPD.</p>`,
        )}
        ${card(
          "Algoritmo",
          `<div class="algo"><ol>
            <li>Para ${T("j = 1,\\dots,n")}: calcular el pivote ${T("l_{jj}")} y luego cada ${T("l_{ij}")} de la columna.</li>
            <li>Sustitución progresiva: resolver ${T("L\\,\\mathbf y = \\mathbf b")}.</li>
            <li>Sustitución regresiva: resolver ${T("L^{T}\\mathbf x = \\mathbf y")}.</li>
            <li>Verificar ${T("LL^T = A")} y el residuo ${T("\\|b - Ax\\|_2/\\|b\\|_2")}.</li>
          </ol></div>`,
        )}
      </div>`;
      if (!res.valid) return head + theory + invalidBox(res);
      const ch = res.chol,
        n = res.n;
      return `${head}${theory}
      <div class="kpis">
        ${kpi("Operaciones aprox.", `${ch.flops}`, "n³/3")}
        ${kpi("‖LLᵀ − A‖ máx", F.sci(ch.reconErr, 2), "reconstrucción", "ok")}
        ${kpi("Residuo relativo", F.sci(res.res.chol, 2), "‖b − Ax‖₂/‖b‖₂", "ok")}
        ${kpi("det A = (∏ lᵢᵢ)²", F.smart(ch.L.reduce((p, r, i) => p * r[i], 1) ** 2, 5), "producto de pivotes al cuadrado")}
      </div>

      <h2 class="sec"><span class="n">1</span>Factorización A = L Lᵀ con los datos actuales</h2>
      ${card("", TD(`A = ${F.tmat(res.A)}`) + details("ch-f", `Cálculo de los ${(n * (n + 1)) / 2} elementos de L <span class="hint">· con sustitución numérica</span>`, factorSteps(ch), true) + TD(`L = ${F.tmat(ch.L, { d: 6, dim: (i, j) => j > i })}`))}
      <div class="grid g2">
        ${card("Estructura de L (mapa de calor)", plot("ch-L", 300) + `<p class="cap">Los ceros por encima de la diagonal no se calculan. Un elemento bajo la diagonal puede ser distinto de cero aunque ${T("a_{ij}=0")}: es el <b>relleno</b> (fill-in) que IC(0) descarta.</p>`)}
        ${card("Pivotes: a_jj frente a l_jj²", plot("ch-piv", 300) + `<p class="cap">${T("l_{jj}^2")} es lo que queda de ${T("a_{jj}")} después de restar lo ya explicado por columnas anteriores. Un pivote pequeño frente a ${T("a_{jj}")} indica dependencia fuerte (mal condicionamiento).</p>`)}
      </div>

      <h2 class="sec"><span class="n">2</span>Sustitución progresiva L y = b</h2>
      ${card("", substSteps(ch.fwd, { M: "l", v: "y", rhs: "b" }) + TD(`\\mathbf y = ${F.tvec(ch.y, { d: 6 })}`))}

      <h2 class="sec"><span class="n">3</span>Sustitución regresiva Lᵀ x = y</h2>
      ${card("", substSteps(ch.bwd, { M: "l", v: "x", rhs: "y", transpose: true }) + TD(`\\mathbf x^{*} = ${F.tvec(ch.x, { d: 6 })}`))}

      <h2 class="sec"><span class="n">4</span>Verificación</h2>
      <div class="grid g2">
        ${card("Reconstrucción L Lᵀ", TD(`LL^{T} = ${F.tmat(ch.recon, { d: 6 })}`) + `<p class="small">Diferencia máxima con A: <b>${F.sci(ch.reconErr, 2)}</b> (nivel de redondeo).</p>`)}
        ${card(
          "Solución y residuo",
          table(
            ["Variable", "x* (miles de Bs)", "(Ax*)ᵢ", "bᵢ"],
            Array.from({ length: n }, (_, i) => [varName(i), F.fix(ch.x[i], 8), F.fix(NM.matVec(res.A, ch.x)[i], 6), F.fix(res.b[i], 6)]),
            { cls: "num" },
          ) + `<p class="small" style="margin-top:8px">${T("\\|b-Ax^*\\|_2/\\|b\\|_2 = " + F.ts(res.res.chol, 3))}</p>`,
        )}
      </div>
      ${note("Este vector x* es la «solución numérica de referencia» con la que se calculan todos los errores del GCP y del GC.", "ok")}`;
    },
    mount(_, { res }) {
      if (!res.valid) return;
      const ch = res.chol;
      const lab = ch.L.map((_, i) => `${i + 1}`);
      Charts.heatmap("ch-L", ch.L.map((r, i) => r.map((v, j) => (j > i ? 0 : v))), { labels: lab, rlabels: lab, name: "L", colorscale: "Blues" });
      const labels = ch.L.map((_, j) => `j = ${j + 1}`);
      Charts.bars(
        "ch-piv",
        labels,
        [
          { name: "a_jj", y: res.A.map((r, j) => r[j]), color: Charts.COLORS.muted, text: res.A.map((r, j) => F.nf(r[j], 3)) },
          { name: "l_jj²", y: ch.L.map((r, j) => r[j] ** 2), color: Charts.COLORS.chol, text: ch.L.map((r, j) => F.nf(r[j] ** 2, 3)) },
        ],
        { ytitle: "valor", log: Math.max(...res.A.map((r, j) => r[j])) / Math.min(...ch.L.map((r, j) => r[j] ** 2)) > 200 },
      );
    },
  });
})();
