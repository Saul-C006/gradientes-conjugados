/* Vista 6b · Factorización LU de Doolittle paso a paso */
(function () {
  "use strict";
  const { card, T, TD, table, invalidBox, note, plot, kpi, details, steps } = window.UI;
  const F = window.FMT;

  function factorSteps(lu) {
    return steps(
      lu.factorSteps.map((s) => {
        const i = s.i + 1,
          j = s.j + 1;
        if (s.type === "u") {
          const sym = s.terms.length ? `a_{${i}${j}} - ${s.terms.map((_, m) => `l_{${i}${m + 1}}u_{${m + 1}${j}}`).join(" - ")}` : `a_{${i}${j}}`;
          const num = s.terms.length ? `${F.tn(s.a)} - ${s.terms.map(([p, q]) => `${F.tp(p, 5)}\\cdot${F.tp(q, 5)}`).join(" - ")}` : "";
          return `Fila ${i} de U${TD(`u_{${i}${j}} = ${sym}${num ? ` = ${num}` : ""} = \\mathbf{${F.tn(s.val, 6)}}`)}`;
        }
        const sym = s.terms.length ? `a_{${i}${j}} - ${s.terms.map((_, m) => `l_{${i}${m + 1}}u_{${m + 1}${j}}`).join(" - ")}` : `a_{${i}${j}}`;
        const num = s.terms.length ? `${F.tn(s.a)} - ${s.terms.map(([p, q]) => `${F.tp(p, 5)}\\cdot${F.tp(q, 5)}`).join(" - ")}` : F.tn(s.a);
        return `Columna ${j} de L${TD(`l_{${i}${j}} = \\frac{${sym}}{u_{${j}${j}}} = \\frac{${num}}{${F.tn(s.div, 6)}} = \\mathbf{${F.tn(s.val, 6)}}`)}`;
      }),
    );
  }

  App.view({
    id: "lu",
    title: "Factorización LU (Doolittle)",
    nav: "LU de Doolittle",
    icon: "U",
    color: "--c-lu",
    module: 6,
    blurb: "A = L U con diag(L) = 1; relación U = D Lᵀ con Cholesky.",
    render({ res }) {
      const head = UI.pageHead({
        group: "Métodos directos · verificación cruzada",
        module: 6,
        title: "Factorización LU de Doolittle",
        lead: "A se descompone en una matriz triangular inferior L con unos en la diagonal y una triangular superior U. Se alterna el cálculo de una fila de U y una columna de L.",
        tags: ["cualquier A con pivotes no nulos", "≈ 2n³/3 operaciones", "diag(L) = 1"],
      });
      const theory = `<div class="grid g2">
        ${card("Fórmulas", TD("u_{kj} = a_{kj} - \\sum_{m=1}^{k-1} l_{km}u_{mj},\\quad j \\ge k") + TD("l_{ik} = \\frac{1}{u_{kk}}\\Big(a_{ik} - \\sum_{m=1}^{k-1} l_{im}u_{mk}\\Big),\\quad i > k"))}
        ${card(
          "Algoritmo",
          `<div class="algo"><ol>
            <li>Para ${T("k = 1,\\dots,n")}: calcular la fila ${T("k")} de ${T("U")} y luego la columna ${T("k")} de ${T("L")}.</li>
            <li>Resolver ${T("L\\,\\mathbf y = \\mathbf b")} (sin dividir: ${T("l_{ii}=1")}).</li>
            <li>Resolver ${T("U\\mathbf x = \\mathbf y")}.</li>
          </ol></div><p class="small muted">Para A simétrica: ${T("A = LDL^T")} con ${T("D=\\operatorname{diag}(u_{kk})")}, luego ${T("U = DL^T")} y ${T("L_{\\text{Chol}} = L\\,D^{1/2}")}.</p>`,
        )}
      </div>`;
      if (!res.valid) return head + theory + invalidBox(res);
      const lu = res.lu,
        n = res.n;
      // Relación con Cholesky
      const D = lu.U.map((r, i) => r[i]);
      const LD = lu.L.map((r) => r.map((v, j) => v * Math.sqrt(D[j])));
      const diffChol = NM.maxAbsDiff(LD, res.chol.L);
      return `${head}${theory}
      <div class="kpis">
        ${kpi("Operaciones aprox.", `${lu.flops}`, "2n³/3")}
        ${kpi("‖LU − A‖ máx", F.sci(lu.reconErr, 2), "reconstrucción", "ok")}
        ${kpi("Residuo relativo", F.sci(res.res.lu, 2), "‖b − Ax‖₂/‖b‖₂", "ok")}
        ${kpi("‖L·D^½ − L_Chol‖", F.sci(diffChol, 2), "misma factorización", "acc")}
      </div>
      <h2 class="sec"><span class="n">1</span>Factorización paso a paso</h2>
      ${card("", details("lu-f", `Cálculo de los ${n * n} elementos de L y U <span class="hint">· alternando filas de U y columnas de L</span>`, factorSteps(lu), true) +
        `<div class="grid g2">${TD(`L = ${F.tmat(lu.L, { d: 6, dim: (i, j) => j > i })}`)}${TD(`U = ${F.tmat(lu.U, { d: 6, dim: (i, j) => j < i })}`)}</div>`)}
      <div class="grid g2">
        ${card("L (multiplicadores)", plot("lu-L", 280))}
        ${card("U (triangular superior)", plot("lu-U", 280))}
      </div>
      <h2 class="sec"><span class="n">2</span>Sustitución progresiva L y = b</h2>
      ${card("", App.substSteps(lu.fwd, { M: "l", v: "y", rhs: "b", unitDiag: true }) + TD(`\\mathbf y = ${F.tvec(lu.y, { d: 6 })}`))}
      <h2 class="sec"><span class="n">3</span>Sustitución regresiva U x = y</h2>
      ${card("", App.substSteps(lu.bwd, { M: "u", v: "x", rhs: "y" }) + TD(`\\mathbf x = ${F.tvec(lu.x, { d: 6 })}`))}
      <h2 class="sec"><span class="n">4</span>Relación con Cholesky</h2>
      ${card(
        "",
        TD(`D = \\operatorname{diag}(${D.map((v) => F.tn(v, 5)).join(",\\ ")}),\\qquad L\\,D^{1/2} = ${F.tmat(LD, { d: 6 })}`) +
          `<p>La diferencia máxima con el factor de Cholesky es <b>${F.sci(diffChol, 2)}</b>: son la misma factorización escrita de dos maneras.
          Los pivotes ${T("u_{kk}")} son además los cocientes de menores ${T("\\Delta_k/\\Delta_{k-1}")} del criterio de Sylvester.</p>`,
      )}
      ${note(`LU reproduce la solución de Cholesky con una diferencia máxima de ${F.sci(Math.max(...res.xref.map((x, i) => Math.abs(x - lu.x[i]))), 2)} miles de Bs.`, "ok")}`;
    },
    mount(_, { res }) {
      if (!res.valid) return;
      const lab = res.lu.L.map((_, i) => `${i + 1}`);
      Charts.heatmap("lu-L", res.lu.L, { labels: lab, rlabels: lab, name: "L", colorscale: "Purples" });
      Charts.heatmap("lu-U", res.lu.U, { labels: lab, rlabels: lab, name: "U", colorscale: "Purples", log: Math.max(...res.lu.U.flat().map(Math.abs)) > 100 });
    },
  });
})();
