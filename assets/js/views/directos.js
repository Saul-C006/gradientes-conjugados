/* Vista 6 · Solución numérica de referencia (resumen de los métodos directos) */
(function () {
  "use strict";
  const { card, T, TD, table, chip, esc, invalidBox, note, plot, kpi, varName, yes } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER, unit } = window.CASE;

  App.view({
    id: "directos",
    title: "Solución de referencia",
    nav: "Resumen y referencia",
    icon: "⊞",
    color: "--c-chol",
    module: 6,
    blurb: "Cholesky (oficial), LU y Gauss: la misma solución en los tres escenarios y multiplicadores A⁻¹.",
    render({ res, scen }) {
      const head = UI.pageHead({
        group: "Métodos directos",
        module: 6,
        title: "Solución numérica de referencia",
        lead: "La «solución numérica de referencia» (que la guía permite llamar solución exacta) se obtiene con un método directo. Se usa Cholesky como referencia oficial porque A es simétrica definida positiva, y se verifica con LU de Doolittle y eliminación de Gauss.",
      });
      const methods = `
        <div class="grid g3">
          ${card("Cholesky · A = L Lᵀ", `<p class="small">Aprovecha la simetría: solo factoriza un triángulo. Existe si y solo si A es SPD, por eso también funciona como prueba de definición positiva.</p>${TD("\\approx \\tfrac{n^3}{3}\\ \\text{flops}")}<a class="btn sm" href="#/cholesky">Ver paso a paso →</a>`, { cls: "accent-l", })}
          ${card("LU de Doolittle · A = L U", `<p class="small">Factorización general con ${T("\\operatorname{diag}(L)=1")}. Para A simétrica se cumple ${T("U = D L^T")}, el puente con Cholesky.</p>${TD("\\approx \\tfrac{2n^3}{3}\\ \\text{flops}")}<a class="btn sm" href="#/lu">Ver paso a paso →</a>`, { cls: "accent-l" })}
          ${card("Gauss · [A | b] → [U | c]", `<p class="small">Elimina por debajo de cada pivote con multiplicadores ${T("m_{ik}=a_{ik}/a_{kk}")} y termina con sustitución regresiva.</p>${TD("\\approx \\tfrac{2n^3}{3}\\ \\text{flops}")}<a class="btn sm" href="#/gauss">Ver paso a paso →</a>`, { cls: "accent-l" })}
        </div>`;

      const scenRows = [];
      for (let i = 0; i < 4; i++)
        scenRows.push([varName(i), ...ORDER.map((k) => F.fix(scen[k].xref[i], 6))]);
      scenRows.push(["<b>Residuo relativo</b>", ...ORDER.map((k) => F.sci(scen[k].res.chol, 2))]);
      scenRows.push([
        "<b>Máx. diferencia Cholesky–LU–Gauss</b>",
        ...ORDER.map((k) => {
          const r = scen[k];
          const d = Math.max(...r.xref.map((x, i) => Math.max(Math.abs(x - r.lu.x[i]), Math.abs(x - r.gauss.x[i])) / Math.max(1, Math.abs(x))));
          return F.sci(d, 2);
        }),
      ]);
      scenRows.push(["<b>Cota 100·κ(A)·ε</b>", ...ORDER.map((k) => F.sci(100 * scen[k].kA.cond * 2.22e-16, 2))]);
      const scenTable = card(
        "Solución de referencia en los tres escenarios (miles de Bs)",
        table(["Variable", ...ORDER.map((k) => `${SCENARIOS[k].num}. ${SCENARIOS[k].short}`)], scenRows, { cls: "num" }) +
          `<p class="small muted" style="margin-top:8px">Los tres métodos coinciden con diferencias del orden del redondeo (${T("\\varepsilon\\approx2.2\\times10^{-16}")}); en el escenario mal condicionado la diferencia crece, como predice ${T("\\kappa(A)\\,\\varepsilon")}.</p>`,
      );

      if (!res.valid) return head + methods + invalidBox(res) + scenTable;

      const n = res.n;
      const cmp = Array.from({ length: n }, (_, i) => [
        varName(i),
        F.fix(res.chol.x[i], 8),
        F.fix(res.lu.x[i], 8),
        F.fix(res.gauss.x[i], 8),
        F.sci(Math.max(Math.abs(res.chol.x[i] - res.lu.x[i]), Math.abs(res.chol.x[i] - res.gauss.x[i])), 2),
      ]);
      cmp.push(["<b>‖b − Ax‖₂/‖b‖₂</b>", F.sci(res.res.chol, 2), F.sci(res.res.lu, 2), F.sci(res.res.gauss, 2), ""]);
      const inv = NM.inverse(res.A);

      return `${head}${methods}
      <h2 class="sec"><span class="n">x*</span>Datos actuales: los tres métodos frente a frente</h2>
      <div class="kpis">
        ${kpi("Solución de referencia", "Cholesky", "vector x* usado en errores")}
        ${kpi("Residuo Cholesky", F.sci(res.res.chol, 2), "‖b − Ax*‖₂/‖b‖₂", "ok")}
        ${kpi("Reconstrucción ‖LLᵀ − A‖", F.sci(res.chol.reconErr, 2), "máximo por elemento")}
        ${kpi("Reconstrucción ‖LU − A‖", F.sci(res.lu.reconErr, 2), "máximo por elemento")}
      </div>
      ${card("Comparación con los datos actuales", table(["Variable", "Cholesky", "LU (Doolittle)", "Gauss", "Máx. diferencia"], cmp, { cls: "num" }))}
      <div class="grid g2">
        ${card("Solución por unidad (miles de Bs)", plot("dir-sol", 300))}
        ${card("Residuo relativo de cada método", plot("dir-res", 300))}
      </div>
      ${scenTable}

      <h2 class="sec"><span class="n">A⁻¹</span>Lectura financiera: multiplicadores de sensibilidad</h2>
      <div class="grid g2">
        ${card(
          "Matriz inversa A⁻¹",
          `<p class="small">Como ${T("x = A^{-1}b")}, el elemento ${T("(A^{-1})_{ij} = \\partial x_i/\\partial b_j")} indica cuántos miles de Bs adicionales necesita la unidad ${T("i")} si la meta de la unidad ${T("j")} sube en mil Bs.
          Los valores negativos indican que la unidad ${T("i")} puede ceder presupuesto porque recibe retorno cruzado de ${T("j")}.</p>${TD(`A^{-1} = ${F.tmat(inv, { d: 5 })}`)}`,
        )}
        ${card("Mapa de calor de A⁻¹", plot("dir-inv", 320))}
      </div>
      ${note(`Ejemplo: si la meta de ${esc(unit(0).short)} sube en 1 mil Bs, su presupuesto debe subir ${F.nf(inv[0][0], 4)} mil Bs y el de ${esc(unit(1).short)} cambia en ${F.nf(inv[1][0], 4)} mil Bs.`, "idea", "Interpretación.")}
      `;
    },
    mount(_, { res }) {
      if (!res.valid) return;
      const labels = res.xref.map((_, i) => `x${i + 1} ${unit(i).short}`);
      Charts.bars(
        "dir-sol",
        labels,
        [
          { name: "Cholesky", y: res.chol.x, color: Charts.COLORS.chol, text: res.chol.x.map((v) => v.toFixed(1)) },
          { name: "LU", y: res.lu.x, color: Charts.COLORS.lu, text: res.lu.x.map(() => "") },
          { name: "Gauss", y: res.gauss.x, color: Charts.COLORS.gauss, text: res.gauss.x.map(() => "") },
        ],
        { ytitle: "miles de Bs" },
      );
      Charts.bars(
        "dir-res",
        ["Cholesky", "LU", "Gauss"],
        [{ name: "residuo", y: [res.res.chol, res.res.lu, res.res.gauss].map((v) => Math.max(v, 1e-18)), color: Charts.COLORS.chol, text: [res.res.chol, res.res.lu, res.res.gauss].map((v) => F.sci(v, 1)) }],
        { log: true, ytitle: "‖b − Ax‖₂ / ‖b‖₂", layout: { showlegend: false } },
      );
      const inv = NM.inverse(res.A);
      const lab = res.xref.map((_, i) => `${unit(i).short}`);
      Charts.heatmap("dir-inv", inv, { labels: lab.map((l) => `b: ${l}`), rlabels: lab.map((l) => `x: ${l}`), colorscale: "RdBu", zmid: 0, name: "A⁻¹" });
    },
  });
})();
