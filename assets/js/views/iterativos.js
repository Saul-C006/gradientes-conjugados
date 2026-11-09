/* Vistas 7a y 7b · Gradientes Conjugados simple (GC) y Precondicionado (GCP) */
(function () {
  "use strict";
  const { card, T, TD, table, esc, invalidBox, note, plot, kpi, details, steps, yes, seg } = window.UI;
  const F = window.FMT;
  const { unit } = window.CASE;

  const vtex = (v) => F.tvecRow(v, 6);

  /** Traza de una iteración en TeX (k = índice de la iteración que se calcula). */
  function iterSteps(run, pre) {
    const z = pre ? "z" : "r";
    const items = [];
    const i0 = run.init;
    items.push(
      `<b>Inicialización</b>${TD(`\\mathbf r_0 = \\mathbf b - A\\mathbf x_0 = ${vtex(i0.r)}`)}` +
        (pre ? TD(`\\text{resolver } M\\mathbf z_0 = \\mathbf r_0 \\Rightarrow \\mathbf z_0 = ${vtex(i0.z)}`) : "") +
        TD(`\\mathbf p_0 = \\mathbf ${z}_0,\\qquad \\frac{\\|\\mathbf r_0\\|_2}{\\|\\mathbf b\\|_2} = ${F.ts(i0.rel, 4)}`),
    );
    run.log.forEach((e) => {
      const k = e.k - 1;
      let h = `<b>Iteración ${e.k}</b>`;
      h += TD(`A\\mathbf p_{${k}} = ${vtex(e.Ap)}`);
      h += TD(`\\alpha_{${k}} = \\frac{\\mathbf r_{${k}}^{T}\\mathbf ${z}_{${k}}}{\\mathbf p_{${k}}^{T}A\\mathbf p_{${k}}} = \\frac{${F.tn(e.rz, 6)}}{${F.tn(e.pAp, 6)}} = \\mathbf{${F.tn(e.alpha, 8)}}`);
      h += TD(`\\mathbf x_{${k + 1}} = \\mathbf x_{${k}} + \\alpha_{${k}}\\mathbf p_{${k}} = ${vtex(e.x)}`);
      h += TD(`\\mathbf r_{${k + 1}} = \\mathbf r_{${k}} - \\alpha_{${k}}A\\mathbf p_{${k}} = ${vtex(e.r)},\\qquad \\frac{\\|\\mathbf r_{${k + 1}}\\|_2}{\\|\\mathbf b\\|_2} = ${F.ts(e.rel, 4)}`);
      if (e.beta === null) {
        h += `<p>${yes(true, `Criterio de parada: ${F.sci(e.rel, 3)} < tol`)}</p>`;
      } else {
        if (pre) h += TD(`\\text{resolver } M\\mathbf z_{${k + 1}} = \\mathbf r_{${k + 1}} \\Rightarrow \\mathbf z_{${k + 1}} = ${vtex(e.z)}`);
        h += TD(`\\beta_{${k}} = \\frac{\\mathbf r_{${k + 1}}^{T}\\mathbf ${z}_{${k + 1}}}{\\mathbf r_{${k}}^{T}\\mathbf ${z}_{${k}}} = \\frac{${F.tn(e.rzNew, 8)}}{${F.tn(e.rz, 8)}} = ${F.tn(e.beta, 8)}`);
        h += TD(`\\mathbf p_{${k + 1}} = \\mathbf ${z}_{${k + 1}} + \\beta_{${k}}\\mathbf p_{${k}} = ${vtex(e.pNext)}`);
      }
      items.push(h);
    });
    return steps(items);
  }

  function iterTable(run, n) {
    const rows = [["0", "—", "—", F.sci(run.hist[0], 3), ...run.init.x.map((v) => F.fix(v, 4))]];
    run.log.forEach((e) => rows.push([String(e.k), F.smart(e.alpha, 6), e.beta === null ? "—" : F.smart(e.beta, 6), F.sci(e.rel, 3), ...e.x.map((v) => F.fix(v, 4))]));
    return table(["k", "αₖ₋₁", "βₖ₋₁", "‖rₖ‖/‖b‖", ...Array.from({ length: n }, (_, i) => `x${F.sub(i + 1)}`)], rows, { cls: "num" });
  }

  /** Matriz de ortogonalidad normalizada |uᵢᵀ W vⱼ| / √(…) en log10. */
  function orthoMatrix(U, V, W) {
    const m = U.length;
    const g = (a, b) => (W ? NM.dot(a, NM.matVec(W, b)) : NM.dot(a, b));
    const d = U.map((u, i) => Math.sqrt(Math.abs(g(u, V[i]))) || 1);
    return Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => Math.abs(g(U[i], V[j])) / (d[i] * d[j])));
  }

  /** Cota teórica ‖eₖ‖_A ≤ 2((√κ−1)/(√κ+1))ᵏ ‖e₀‖_A. */
  const boundSeries = (kappa, e0, m) => {
    const q = (Math.sqrt(kappa) - 1) / (Math.sqrt(kappa) + 1);
    return Array.from({ length: m + 1 }, (_, k) => Math.min(e0, 2 * q ** k * e0));
  };

  function iterPage(id) {
    const pre = id === "gcp";
    return {
      id,
      title: pre ? "Gradientes Conjugados Precondicionado" : "Gradientes Conjugados simple",
      nav: pre ? "GCP (Suñagua, 2020)" : "GC simple",
      icon: pre ? "∇M" : "∇",
      color: pre ? "--c-gcp" : "--c-gc",
      module: 7,
      blurb: pre ? "Algoritmo de Suñagua (2020), construcción de M y espectro de M⁻¹A." : "Contraste sin precondicionar: direcciones conjugadas y residuos ortogonales.",
      render({ res }) {
        const head = UI.pageHead({
          group: "Métodos iterativos",
          module: 7,
          title: pre ? "Gradientes Conjugados Precondicionado (GCP)" : "Gradientes Conjugados simple (GC)",
          lead: pre
            ? "El GCP resuelve en cada paso el sistema auxiliar M z = r con una matriz M ≈ A fácil de invertir. Equivale a aplicar GC al sistema M⁻¹A x = M⁻¹b, cuyo número de condición es mucho menor cuando M está bien elegida."
            : "Minimiza la energía f(x) = ½ xᵀAx − bᵀx a lo largo de direcciones A-conjugadas. En aritmética exacta termina en a lo sumo n iteraciones; se ejecuta solo como contraste para medir la ganancia del precondicionamiento.",
          tags: pre ? ["Suñagua (2020)", "M = Jacobi · IC(0) · SSOR", "criterio ‖rₖ‖₂/‖b‖₂ < tol"] : ["Hestenes y Stiefel (1952)", "M = I", "contraste"],
        });
        const algo = pre
          ? `<div class="algo"><ol>
              <li>${T("\\mathbf r_0 = \\mathbf b - A\\mathbf x_0")}; resolver ${T("M\\mathbf z_0 = \\mathbf r_0")}; ${T("\\mathbf p_0 = \\mathbf z_0")}</li>
              <li>Para ${T("k = 0,1,2,\\dots")} hasta ${T("\\|\\mathbf r_{k+1}\\|_2/\\|\\mathbf b\\|_2 < \\text{tol}")} o ${T("k = N_{\\max}")}:</li>
              <li style="list-style:none">${T("\\alpha_k = \\dfrac{\\mathbf r_k^T\\mathbf z_k}{\\mathbf p_k^T A\\mathbf p_k}")}</li>
              <li style="list-style:none">${T("\\mathbf x_{k+1} = \\mathbf x_k + \\alpha_k\\mathbf p_k,\\quad \\mathbf r_{k+1} = \\mathbf r_k - \\alpha_k A\\mathbf p_k")}</li>
              <li style="list-style:none">resolver ${T("M\\mathbf z_{k+1} = \\mathbf r_{k+1}")}</li>
              <li style="list-style:none">${T("\\beta_k = \\dfrac{\\mathbf r_{k+1}^T\\mathbf z_{k+1}}{\\mathbf r_k^T\\mathbf z_k},\\quad \\mathbf p_{k+1} = \\mathbf z_{k+1} + \\beta_k\\mathbf p_k")}</li>
            </ol></div>`
          : `<div class="algo"><ol>
              <li>${T("\\mathbf r_0 = \\mathbf b - A\\mathbf x_0,\\quad \\mathbf p_0 = \\mathbf r_0")}</li>
              <li>Para ${T("k = 0,1,2,\\dots")}:</li>
              <li style="list-style:none">${T("\\alpha_k = \\dfrac{\\mathbf r_k^T\\mathbf r_k}{\\mathbf p_k^T A\\mathbf p_k},\\quad \\mathbf x_{k+1} = \\mathbf x_k + \\alpha_k\\mathbf p_k,\\quad \\mathbf r_{k+1} = \\mathbf r_k - \\alpha_k A\\mathbf p_k")}</li>
              <li style="list-style:none">${T("\\beta_k = \\dfrac{\\mathbf r_{k+1}^T\\mathbf r_{k+1}}{\\mathbf r_k^T\\mathbf r_k},\\quad \\mathbf p_{k+1} = \\mathbf r_{k+1} + \\beta_k\\mathbf p_k")}</li>
            </ol></div>`;
        const theory = `<div class="grid g2">
          ${card("Algoritmo", algo)}
          ${card(
            "Idea geométrica",
            pre
              ? `<p>Con ${T("M = LL^T")}, el GCP es el GC aplicado a ${T("\\hat A = L^{-1}AL^{-T}")}. Si ${T("M\\approx A")}, los autovalores de ${T("\\hat A")} se agrupan cerca de 1, las curvas de nivel de la energía se vuelven casi circulares y bastan pocas direcciones.</p>
                 ${TD("\\|\\mathbf e_k\\|_A \\le 2\\left(\\frac{\\sqrt{\\kappa(M^{-1}A)}-1}{\\sqrt{\\kappa(M^{-1}A)}+1}\\right)^{k}\\|\\mathbf e_0\\|_A")}`
              : `<p>Resolver ${T("A\\mathbf x=\\mathbf b")} con A SPD equivale a minimizar ${T("f(\\mathbf x)=\\tfrac12\\mathbf x^TA\\mathbf x-\\mathbf b^T\\mathbf x")}, cuyo gradiente es ${T("-\\mathbf r")}. A diferencia del descenso más pronunciado, cada dirección ${T("\\mathbf p_k")} es A-conjugada a las anteriores (${T("\\mathbf p_i^TA\\mathbf p_j=0")}), así que nunca se deshace lo avanzado.</p>
                 ${TD("\\|\\mathbf e_k\\|_A \\le 2\\left(\\frac{\\sqrt{\\kappa(A)}-1}{\\sqrt{\\kappa(A)}+1}\\right)^{k}\\|\\mathbf e_0\\|_A")}`,
          )}
        </div>`;
        if (!res.valid) return head + theory + invalidBox(res);

        const run = pre ? res.gcp : res.gc;
        const n = res.n;
        const kappa = pre ? res.kM.cond : res.kA.cond;
        let precondBlock = "";
        if (pre) {
          const M = res.M;
          const opts = seg("pc", ["jacobi", "ic0", "ssor"].map((t) => ({ value: t, label: NM.PRECOND_LABEL[t] })), res.opts.precond);
          let detail = "";
          if (M.type === "jacobi")
            detail = `<p>${T("M = D = \\operatorname{diag}(a_{11},\\dots,a_{nn})")}. Resolver ${T("M\\mathbf z=\\mathbf r")} es dividir: ${T("z_i = r_i/a_{ii}")}. Corrige el <b>mal escalamiento</b> de la diagonal.</p>${TD(`M = ${F.tmat(M.M, { d: 4 })}`)}`;
          else if (M.type === "ic0") {
            const dr = M.dropped.length
              ? `Se descartaron ${M.dropped.length} elemento(s) de relleno: ${M.dropped.map((d) => T(`l_{${d.i + 1}${d.j + 1}} = ${F.tn(d.val, 5)}`)).join(", ")} (donde ${T("a_{ij}=0")}).`
              : "No hubo relleno que descartar: IC(0) coincide con Cholesky completo.";
            detail = `<p>Mismas fórmulas que Cholesky, pero solo se calculan los ${T("l_{ij}")} donde ${T("a_{ij}\\neq0")} (se conserva el patrón de ceros, regla R4). ${dr}
              ${M.shift ? `Se aplicó un desplazamiento diagonal σ = ${M.shift}.` : ""} Actúa sobre el escalamiento <b>y</b> sobre el acoplamiento fuera de la diagonal.</p>
              <div class="grid g2">${TD(`L_{IC} = ${F.tmat(M.L, { d: 5, dim: (i, j) => j > i })}`)}${TD(`M = L_{IC}L_{IC}^T = ${F.tmat(M.M, { d: 4 })}`)}</div>
              <p class="small">${T("\\max|M - A| = " + F.ts(NM.maxAbsDiff(M.M, res.A), 3))}: M solo difiere de A en las posiciones de relleno.</p>`;
          } else
            detail = `<p>${T("M = \\frac{1}{\\omega(2-\\omega)}(D+\\omega E)D^{-1}(D+\\omega E)^T")} con ${T("A = E + D + E^T")} y ${T(`\\omega = ${M.omega}`)} (${M.omega === 1 ? "Gauss–Seidel simétrico" : "sobrerrelajación simétrica"}).</p>${TD(`M = ${F.tmat(M.M, { d: 4 })}`)}`;
          precondBlock = `
          <h2 class="sec"><span class="n">M</span>Construcción del precondicionador</h2>
          ${card(`Precondicionador activo: ${esc(M.label)}`, detail + `<div class="row" style="margin-top:8px"><span class="small muted">Cambiar:</span>${opts}</div>`)}
          <div class="grid g2">
            ${card("Espectro: autovalores de A frente a M⁻¹A", plot("it-spec", 300) + `<p class="cap">Escala logarítmica. Cuanto más juntos estén los autovalores, menor es κ y más rápido converge el método.</p>`)}
            ${card("κ antes y después de precondicionar", plot("it-kap", 300))}
          </div>`;
        }

        const kpis = `<div class="kpis">
          ${kpi("Iteraciones", run.iters, `de N<sub>máx</sub> = ${res.opts.maxIt}`, "acc")}
          ${kpi("¿Convergió?", run.converged ? "Sí" : "No", run.breakdown || `tol = ${F.sci(res.opts.tol, 0)}`, run.converged ? "ok" : "bad")}
          ${kpi("Residuo relativo final", F.sci(run.trueRes, 3), "‖b − Ax‖₂/‖b‖₂ verdadero")}
          ${kpi(pre ? "κ(M⁻¹A)" : "κ(A)", F.smart(kappa, 4), pre ? `κ(A) = ${F.smart(res.kA.cond, 4)}` : "λmáx/λmín")}
          ${kpi("Tiempo", `${run.ms.toFixed(3)} ms`, "en este navegador")}
        </div>`;

        const sol = table(
          ["Variable", "Referencia x*", pre ? "GCP" : "GC", "Eₐ", "Eₚ"],
          Array.from({ length: n }, (_, i) => {
            const e = (pre ? res.errGCP : res.errGC)[i];
            return [UI.varName(i), F.fix(res.xref[i], 8), F.fix(run.x[i], 8), F.sci(e.ea, 2), e.ep === null ? "no definido" : `${F.sci(e.ep, 2)} %`];
          }),
          { cls: "num" },
        );

        return `${head}${theory}${kpis}${precondBlock}
        <h2 class="sec"><span class="n">k</span>Iteraciones con los datos actuales</h2>
        ${card("Tabla de iteraciones", iterTable(run, n))}
        ${card("", details(`it-trace-${id}`, `Traza numérica completa <span class="hint">· ${run.iters} iteraciones con todos los vectores</span>`, iterSteps(run, pre)))}
        <div class="grid g2">
          ${card("Convergencia del residuo relativo", plot("it-conv", 320))}
          ${card("Error en norma A frente a la cota teórica", plot("it-err", 320) + `<p class="cap">La cota con ${T("\\kappa")} es pesimista: la convergencia real es más rápida y termina en a lo sumo n pasos (salvo redondeo).</p>`)}
        </div>
        <div class="grid g2">
          ${card("Tamaños de paso αₖ y coeficientes βₖ", plot("it-ab", 300))}
          ${card("Evolución de cada presupuesto xᵢ⁽ᵏ⁾", plot("it-x", 300))}
        </div>
        <h2 class="sec"><span class="n">⊥</span>Propiedades que garantizan la convergencia</h2>
        <div class="grid g2">
          ${card(pre ? "Residuos M⁻¹-ortogonales: |rᵢᵀzⱼ| normalizado" : "Residuos ortogonales: |rᵢᵀrⱼ| normalizado", plot("it-orth", 300) + `<p class="cap">${T("\\log_{10}")} del producto normalizado. Fuera de la diagonal los valores son ≈ 10⁻¹⁰ o menores: los residuos son ortogonales salvo redondeo.</p>`)}
          ${card("Direcciones A-conjugadas: |pᵢᵀApⱼ| normalizado", plot("it-conj", 300) + `<p class="cap">${T("\\mathbf p_i^TA\\mathbf p_j \\approx 0")} para ${T("i\\neq j")}: cada dirección es nueva respecto de las anteriores.</p>`)}
        </div>
        ${card("Solución obtenida frente a la referencia", sol)}
        ${note(
          pre
            ? `Con ${esc(res.M.label)} el GCP converge en <b>${run.iters}</b> iteraciones, frente a <b>${res.gc.iters}</b> del GC simple. κ baja de ${F.smart(res.kA.cond, 4)} a ${F.smart(res.kM.cond, 4)}. Vea la <a href="#/comparativa">comparativa completa</a>.`
            : `El GC simple tarda <b>${run.iters}</b> iteraciones con κ(A) = ${F.smart(res.kA.cond, 4)}. ${run.iters > n ? `Supera n = ${n} por efecto del redondeo: con κ grande se pierde la conjugación exacta.` : `Respeta la terminación finita (≤ n = ${n}).`}`,
          pre ? "ok" : "info",
        )}`;
      },
      mount(root, { res }) {
        if (!res.valid) return;
        const run = pre ? res.gcp : res.gc;
        const col = pre ? Charts.COLORS[res.opts.precond] : Charts.COLORS.gc;
        if (pre)
          root.querySelectorAll("[data-pc]").forEach((b) => b.addEventListener("click", () => Store.setParam("precond", b.dataset.pc)));
        const other = pre ? res.gc : res.gcp;
        Charts.convergence(
          "it-conv",
          [
            { name: pre ? `GCP · ${res.M.label}` : "GC simple", y: run.hist, color: col },
            { name: pre ? "GC simple (contraste)" : `GCP · ${res.M.label}`, y: other.hist, color: pre ? Charts.COLORS.gc : Charts.COLORS[res.opts.precond], dash: "dot" },
          ],
          res.opts.tol,
        );
        const eA = run.errHist.map((e) => (e ? e.eA : null));
        const kappa = pre ? res.kM.cond : res.kA.cond;
        Charts.convergence(
          "it-err",
          [
            { name: "‖xₖ − x*‖_A real", y: eA.map((v) => Math.max(v, 1e-14)), color: col },
            { name: "cota 2qᵏ‖e₀‖_A", y: boundSeries(kappa, eA[0], run.iters), color: Charts.COLORS.muted, dash: "dash" },
          ],
          null,
          { ytitle: "‖eₖ‖_A" },
        );
        Charts.bars(
          "it-ab",
          run.log.map((e) => `k = ${e.k - 1}`),
          [
            { name: "αₖ", y: run.log.map((e) => e.alpha), color: col, text: run.log.map((e) => F.smart(e.alpha, 3)) },
            { name: "βₖ", y: run.log.map((e) => e.beta), color: Charts.COLORS.gauss, text: run.log.map((e) => (e.beta === null ? "" : F.smart(e.beta, 3))) },
          ],
          { log: true, ytitle: "valor" },
        );
        const C = Charts.COLORS.series();
        Charts.draw(
          "it-x",
          res.xref.map((xs, i) => ({
            x: run.path.map((_, k) => k),
            y: run.path.map((p) => p[i]),
            name: `x${i + 1} ${unit(i).short}`,
            mode: "lines+markers",
            line: { color: C[i % 8], width: 2 },
          })),
          { xaxis: { title: { text: "iteración k" }, dtick: 1 }, yaxis: { title: { text: "miles de Bs" } } },
        );
        // Ortogonalidad
        // Residuos r₀…r_{m−1} (el último, ya convergido, es solo ruido de redondeo y no se normaliza)
        const R = [run.init.r, ...run.log.slice(0, -1).map((e) => e.r)];
        const Z = pre ? [run.init.z, ...run.log.slice(0, -1).map((e) => e.z)] : R;
        const P = run.log.map((e) => e.p);
        const lab = (p, m) => Array.from({ length: m }, (_, i) => `${p}${i}`);
        const O = orthoMatrix(R, Z, null);
        Charts.heatmap("it-orth", O, { log: true, labels: lab(pre ? "z" : "r", O.length), rlabels: lab("r", O.length), colorscale: "Viridis", fmt: (v) => (v === 0 ? "0" : v.toExponential(1)), name: "|rᵢᵀzⱼ|", cbTitle: "log₁₀" });
        if (P.length) {
          const Cj = orthoMatrix(P, P, res.A);
          Charts.heatmap("it-conj", Cj, { log: true, labels: lab("p", P.length), rlabels: lab("p", P.length), colorscale: "Viridis", fmt: (v) => (v === 0 ? "0" : v.toExponential(1)), name: "|pᵢᵀApⱼ|", cbTitle: "log₁₀" });
        }
        if (pre) {
          const eigA = res.kA.eig,
            eigM = res.kM.eig;
          Charts.draw(
            "it-spec",
            [
              { x: eigA, y: eigA.map(() => "A"), mode: "markers", marker: { size: 14, color: Charts.COLORS.gc, symbol: "diamond" }, name: "λ(A)", hovertemplate: "λ = %{x:.6g}<extra></extra>" },
              { x: eigM, y: eigM.map(() => "M⁻¹A"), mode: "markers", marker: { size: 14, color: col, symbol: "circle" }, name: "λ(M⁻¹A)", hovertemplate: "λ = %{x:.6g}<extra></extra>" },
            ],
            { xaxis: Charts.logAxis("autovalor λ"), yaxis: { type: "category" }, margin: { l: 70 } },
          );
          const types = ["jacobi", "ic0", "ssor"];
          Charts.bars(
            "it-kap",
            ["κ(A)", ...types.map((t) => NM.PRECOND_LABEL[t].split(" (")[0])],
            [
              {
                name: "κ",
                y: [res.kA.cond, ...types.map((t) => res.others[t].k.cond)],
                color: [Charts.COLORS.gc, ...types.map((t) => Charts.COLORS[t])],
                text: [res.kA.cond, ...types.map((t) => res.others[t].k.cond)].map((v) => F.smart(v, 2)),
              },
            ],
            { log: true, ytitle: "número de condición", layout: { showlegend: false } },
          );
        }
      },
    };
  }

  App.view(iterPage("gc"));
  App.view(iterPage("gcp"));
  App.iter = { orthoMatrix, boundSeries };
})();
