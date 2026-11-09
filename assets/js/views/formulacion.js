/* Vista 3 · Formulación: variables, sistema, simetría y definición positiva */
(function () {
  "use strict";
  const { card, T, TD, table, yes, esc, invalidBox, note, details, steps, plot } = window.UI;
  const F = window.FMT;
  const { unit, SCENARIOS, ORDER } = window.CASE;

  /** Sistema de ecuaciones en TeX con los datos actuales. */
  function systemTex(A, b) {
    const n = b.length;
    const rows = A.map((r, i) => {
      const terms = [];
      r.forEach((a, j) => {
        if (a === 0) return;
        const s = `${F.tn(Math.abs(a))}x_{${j + 1}}`;
        terms.push(terms.length === 0 ? (a < 0 ? "-" : "") + s : (a < 0 ? " - " : " + ") + s);
      });
      return `${terms.join("") || "0"} &= ${F.tn(b[i])} && \\text{meta ${esc(unit(i).short)}}`;
    });
    return `\\begin{aligned}${rows.join(" \\\\ ")}\\end{aligned}`;
  }

  /** Procedimiento de Sylvester paso a paso. */
  function sylvester(A, v, res) {
    const n = A.length,
      m = v.minors;
    const out = [];
    out.push(`${T("\\Delta_1 = a_{11} = " + F.tn(A[0][0]))} ${yes(m[0] > 0, "> 0", "≤ 0")}`);
    if (n >= 2)
      out.push(
        `${TD(`\\Delta_2 = \\begin{vmatrix} a_{11} & a_{12}\\\\ a_{21} & a_{22}\\end{vmatrix} = a_{11}a_{22}-a_{12}a_{21} = ${F.tp(A[0][0])}\\cdot${F.tp(A[1][1])} - ${F.tp(A[0][1])}\\cdot${F.tp(A[1][0])} = ${F.tn(m[1])}`)} ${yes(m[1] > 0, "> 0", "≤ 0")}`,
      );
    if (n >= 3) {
      const a = A;
      const c1 = a[1][1] * a[2][2] - a[1][2] * a[2][1];
      const c2 = a[1][0] * a[2][2] - a[1][2] * a[2][0];
      const c3 = a[1][0] * a[2][1] - a[1][1] * a[2][0];
      out.push(
        `Desarrollo por cofactores de la primera fila:${TD(
          `\\Delta_3 = a_{11}\\begin{vmatrix}a_{22}&a_{23}\\\\a_{32}&a_{33}\\end{vmatrix} - a_{12}\\begin{vmatrix}a_{21}&a_{23}\\\\a_{31}&a_{33}\\end{vmatrix} + a_{13}\\begin{vmatrix}a_{21}&a_{22}\\\\a_{31}&a_{32}\\end{vmatrix}`,
        )}${TD(`= ${F.tp(a[0][0])}(${F.tn(c1)}) - ${F.tp(a[0][1])}(${F.tn(c2)}) + ${F.tp(a[0][2])}(${F.tn(c3)}) = ${F.tn(m[2])}`)} ${yes(m[2] > 0, "> 0", "≤ 0")}`,
      );
    }
    if (n >= 4) {
      if (res && res.valid) {
        const p = res.gauss.pivots;
        for (let k = 4; k <= n; k++) {
          const prod = p.slice(0, k).map((v, i) => `u_{${i + 1}${i + 1}}`).join("\\,");
          const nums = p.slice(0, k).map((v) => F.tp(v, 5)).join("\\cdot");
          out.push(
            `Para ${T(`k = ${k}`)} se usa que, sin intercambio de filas, el determinante es el producto de los pivotes de Gauss:${TD(`\\Delta_${k} = ${prod} = ${nums} = ${F.tn(m[k - 1])}`)} ${yes(m[k - 1] > 0, "> 0", "≤ 0")}`,
          );
        }
      } else
        for (let k = 4; k <= n; k++) out.push(`${T(`\\Delta_${k} = ${F.tn(m[k - 1])}`)} ${yes(m[k - 1] > 0, "> 0", "≤ 0")}`);
    }
    return steps(out);
  }

  App.view({
    id: "formulacion",
    title: "Formulación",
    icon: "∑",
    color: "--c-s8",
    module: 3,
    blurb: "Variables, sistema Ax = b, coeficientes y demostración de que A es SPD.",
    render({ res, scen }) {
      const A = res.A,
        b = res.b,
        v = res.validation;
      const n = A.length;
      const varRows = [
        [T("x_i"), "Presupuesto anual asignado a la unidad i (incógnita)", "miles de Bs"],
        [T("a_{ii}"), "Retorno directo: flujo de caja que genera la unidad i por cada Bs que recibe", "Bs / Bs"],
        [T("a_{ij}\\;(i\\ne j)"), "Retorno cruzado: flujo que aporta a la meta de i cada Bs asignado a j (servicios compartidos, precios de transferencia)", "Bs / Bs"],
        [T("b_i"), "Meta de flujo de caja que la unidad i debe cubrir en la gestión", "miles de Bs"],
      ];
      const varsList = Array.from({ length: n }, (_, i) => [`<span class="var">x${F.sub(i + 1)}</span>`, esc(unit(i).long), esc(unit(i).desc)]);

      const numeric = v.numeric;
      let sys = "";
      if (numeric) {
        sys = `
          <div class="grid g2">
            ${card("Sistema lineal con los datos actuales", TD(systemTex(A, b)) + `<p class="small muted">La ecuación i es el balance de flujo de la unidad i (regla R1). Los términos nulos reflejan la regla R4.</p>`)}
            ${card("Forma matricial A x = b", TD(`${F.tmat(A)}\\begin{bmatrix}${A.map((_, i) => `x_{${i + 1}}`).join("\\\\")}\\end{bmatrix} = ${F.tvec(b)}`))}
          </div>`;
      }

      let proof = "";
      if (numeric) {
        const AT = NM.transpose(A);
        const symTbl = [];
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++)
            symTbl.push([T(`a_{${i + 1}${j + 1}} = ${F.tn(A[i][j])}`), T(`a_{${j + 1}${i + 1}} = ${F.tn(A[j][i])}`), yes(Math.abs(A[i][j] - A[j][i]) <= 1e-12 * Math.max(1, NM.normInf(A.flat())), "Iguales", "Distintos")]);
        const eig = v.symmetric ? NM.eigSym(A) : null;
        proof = `
        <h2 class="sec"><span class="n">SPD</span>Demostración: A es simétrica y definida positiva</h2>
        <div class="grid g2">
          ${card(
            "Paso 1 · Simetría A = Aᵀ",
            TD(`A^{T} = ${F.tmat(AT)}`) +
              details("f-sym", `Comparar los ${(n * (n - 1)) / 2} pares fuera de la diagonal`, table(["aᵢⱼ", "aⱼᵢ", "Resultado"], symTbl)) +
              `<p>${yes(v.symmetric, "A es simétrica", "A no es simétrica")} <span class="small muted">máx |aᵢⱼ − aⱼᵢ| = ${F.sci(v.asym, 2)}</span></p>`,
          )}
          ${card(
            "Paso 2 · Criterio de Sylvester",
            `<p class="small">Una matriz simétrica es definida positiva si y solo si todos sus menores principales líderes ${T("\\Delta_k=\\det A_{1:k,1:k}")} son positivos.</p>` +
              sylvester(A, v, res) +
              `<p style="margin-top:8px">${yes(v.spd, "Todos los menores son positivos ⇒ A es definida positiva", "A no es definida positiva")}</p>`,
          )}
        </div>
        ${
          eig
            ? card(
                "Paso 3 · Comprobación independiente: autovalores y discos de Gershgorin",
                `<div class="grid g2"><div>
                  <p>Los autovalores se calculan con el método de rotaciones de Jacobi para matrices simétricas (${eig.sweeps} barridos).</p>
                  ${TD(`\\lambda(A) = \\{${eig.map((e) => F.tn(e, 5)).join(",\\ ")}\\}`)}
                  <p>${yes(eig[0] > 0, "Todos λᵢ > 0 ⇒ xᵀAx > 0 para todo x ≠ 0", "Hay autovalores no positivos")}</p>
                  <p class="small muted">Cada disco de Gershgorin tiene centro ${T("a_{ii}")} y radio ${T("R_i=\\sum_{j\\ne i}|a_{ij}|")}; todo autovalor está en algún disco.
                  Si todos los discos quedan a la derecha de 0 (diagonal dominante, regla R3) la matriz es definida positiva sin calcular nada más.
                  En el escenario mal condicionado un disco cruza el 0: Gershgorin no basta y se necesita Sylvester.</p>
                </div><div>${plot("f-gersh", 300)}</div></div>`,
              )
            : ""
        }`;
      }

      const sumRows = ORDER.map((k) => {
        const r = scen[k];
        return [
          `<b>${SCENARIOS[k].num}. ${SCENARIOS[k].short}</b>`,
          ...r.validation.minors.map((m) => F.smart(m, 4)),
          r.kA.eig.map((e) => F.smart(e, 4)).join(", "),
          yes(r.validation.symmetric),
          yes(r.validation.spd),
        ];
      });
      if (numeric && n === 4)
        sumRows.push([
          "<i>Datos actuales</i>",
          ...v.minors.map((m) => F.smart(m, 4)),
          v.symmetric ? NM.eigSym(A).map((e) => F.smart(e, 4)).join(", ") : "—",
          yes(v.symmetric),
          yes(v.spd),
        ]);

      return `
      ${UI.pageHead({
        group: "Proyecto",
        module: 3,
        title: "Formulación del sistema",
        lead: "Definición de las variables financieras, el sistema lineal Ax = b, la interpretación de cada coeficiente y la demostración formal de que A es simétrica y definida positiva.",
      })}
      <div class="grid g2">
        ${card("Significado de los símbolos", table(["Símbolo", "Significado financiero", "Unidad"], varRows))}
        ${card(`Las n = ${n} variables`, table(["Variable", "Unidad estratégica", "Rol"], varsList))}
      </div>
      ${!numeric ? invalidBox(res) : ""}
      ${sys}
      ${proof}
      <h2 class="sec"><span class="n">3×</span>Resumen para los tres escenarios</h2>
      ${table(["Escenario", "Δ₁", "Δ₂", "Δ₃", "Δ₄", "Autovalores λ", "Simétrica", "Definida positiva"], sumRows, { cls: "num" })}
      ${note("En los tres escenarios todos los menores principales y todos los autovalores son positivos: A es simétrica definida positiva y por tanto el sistema tiene solución única, Cholesky existe y el GC converge.", "ok")}
      `;
    },
    mount(_, { res }) {
      const el = document.getElementById("f-gersh");
      if (!el || !res.validation.symmetric) return;
      const A = res.A,
        n = A.length;
      const eig = NM.eigSym(A);
      const C = Charts.COLORS.series();
      const data = [];
      A.forEach((r, i) => {
        const R = r.reduce((s, v, j) => (j === i ? s : s + Math.abs(v)), 0);
        data.push({
          x: [r[i] - R, r[i] + R],
          y: [i + 1, i + 1],
          mode: "lines",
          line: { color: C[i % 8], width: 10 },
          name: `Disco ${i + 1}: ${F.nf(r[i])} ± ${F.nf(R)}`,
          hovertemplate: `fila ${i + 1}: [%{x:.4g}]<extra></extra>`,
        });
        data.push({ x: [r[i]], y: [i + 1], mode: "markers", marker: { color: "#fff", size: 8, line: { color: C[i % 8], width: 2 } }, showlegend: false, hoverinfo: "skip" });
      });
      data.push({ x: eig, y: eig.map(() => 0), mode: "markers", marker: { symbol: "x", size: 11, color: Charts.COLORS.ink }, name: "autovalores λ", hovertemplate: "λ = %{x:.6g}<extra></extra>" });
      Charts.draw(el, data, {
        xaxis: { title: { text: "eje real" }, zeroline: true, zerolinecolor: Charts.COLORS.tol, zerolinewidth: 2 },
        yaxis: { title: { text: "fila i" }, tickvals: [0, ...A.map((_, i) => i + 1)], ticktext: ["λ", ...A.map((_, i) => `${i + 1}`)], range: [-0.6, n + 0.6] },
        legend: { y: -0.3 },
        margin: { t: 10 },
      });
    },
  });
})();
