/* Vista 2 · Caso de estudio (aporte de la mención: Ingeniería de Sistemas) */
(function () {
  "use strict";
  const { card, T, table, chip, esc, invalidBox, note } = window.UI;
  const F = window.FMT;
  const { unit } = window.CASE;

  /** Verificación automática de las reglas de negocio R1–R5. */
  function rules(res) {
    const A = res.A,
      b = res.b,
      x = res.xref,
      n = res.n;
    const Ax = NM.matVec(A, x);
    const bal = Math.max(...b.map((v, i) => Math.abs(v - Ax[i])));
    const rows = A.map((r, i) => ({ d: r[i], off: r.reduce((s, v, j) => (j === i ? s : s + Math.abs(v)), 0) }));
    const r3 = rows.every((r) => r.d > r.off);
    const r4 = n >= 4 ? A[0][3] === 0 && A[2][3] === 0 : true;
    return [
      ["R1", "Balance de flujo", T("\\sum_j a_{ij}x_j = b_i"), `máx |bᵢ − Σⱼ aᵢⱼxⱼ| = ${F.sci(bal, 2)} miles de Bs`, bal <= 1e-8 * Math.max(1, NM.normInf(b))],
      ["R2", "Reciprocidad", T("a_{ij} = a_{ji}"), res.validation.symmetric ? `Los ${(n * (n - 1)) / 2} pares coinciden` : "Hay pares distintos", res.validation.symmetric],
      ["R3", "Predominio del retorno propio", T("a_{ii} > \\sum_{j\\ne i}|a_{ij}|"), rows.map((r, i) => `F${F.sub(i + 1)}: ${F.nf(r.d)} ${r.d > r.off ? ">" : "≤"} ${F.nf(r.off)}`).join(" · "), r3],
      ["R4", "Canal único de Innovación", T("a_{14} = a_{34} = 0"), n >= 4 ? `a₁₄ = ${F.nf(A[0][3])}, a₃₄ = ${F.nf(A[2][3])}` : "—", r4],
      ["R5", "Asignación factible", T("x_i \\ge 0"), `x = (${x.map((v) => F.fix(v, 2)).join(", ")})`, x.every((v) => v >= 0)],
    ];
  }

  /** Red interdepartamental: grosor de arista = ρᵢⱼ = aᵢⱼ/√(aᵢᵢaⱼⱼ). */
  function network(res) {
    const A = res.A,
      n = res.n,
      x = res.xref;
    const W = 640,
      H = 380,
      cx = W / 2,
      cy = H / 2,
      R = 135;
    const pos = Array.from({ length: n }, (_, i) => {
      if (n === 4) return [[cx - 210, cy - 95], [cx, cy + 85], [cx + 210, cy - 95], [cx + 210, cy + 120]][i] || [cx, cy];
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + 1.6 * R * Math.cos(a), cy + R * Math.sin(a)];
    });
    if (n === 4) pos[3] = [cx - 210, cy + 120];
    let edges = "",
      nodes = "";
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        if (A[i][j] === 0) continue;
        const rho = A[i][j] / Math.sqrt(A[i][i] * A[j][j]);
        const [x1, y1] = pos[i],
          [x2, y2] = pos[j];
        const col = Math.abs(rho) > 0.9 ? "var(--c-bad)" : "var(--accent)";
        edges += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-opacity="0.75" stroke-width="${2 + 14 * Math.min(1, Math.abs(rho))}" stroke-linecap="round"/>
          <g transform="translate(${(x1 + x2) / 2},${(y1 + y2) / 2})"><rect x="-44" y="-19" width="88" height="38" rx="8" fill="var(--surface)" stroke="var(--line-2)"/>
          <text text-anchor="middle" y="-3" font-size="11.5" font-weight="600">a${F.sub(i + 1)}${F.sub(j + 1)} = ${F.nf(A[i][j])}</text>
          <text text-anchor="middle" y="12" font-size="11" fill="var(--muted)">ρ = ${rho.toFixed(2)}</text></g>`;
      }
    pos.forEach(([px, py], i) => {
      nodes += `<g transform="translate(${px},${py})"><rect x="-74" y="-32" width="148" height="64" rx="14" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>
        <text text-anchor="middle" y="-12" font-size="13" font-weight="700">x${F.sub(i + 1)} ${esc(unit(i).short)}</text>
        <text text-anchor="middle" y="5" font-size="11.5" fill="var(--muted)">a${F.sub(i + 1)}${F.sub(i + 1)} = ${F.nf(A[i][i])}</text>
        <text text-anchor="middle" y="21" font-size="12" font-weight="600" fill="var(--accent)">${F.fix(x[i], 1)} mil Bs</text></g>`;
    });
    return `<div class="net"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Red de flujo interdepartamental">${edges}${nodes}</svg></div>`;
  }

  App.view({
    id: "caso",
    title: "Caso de estudio",
    icon: "◈",
    color: "--c-s1",
    module: 2,
    blurb: "Contexto, proceso modelado, reglas de negocio R1–R5, red y matriz de flujo.",
    render({ res }) {
      const n = res.valid ? res.n : Store.state.n;
      const units = Array.from({ length: n }, (_, i) => {
        const u = unit(i);
        return `<div class="unit"><div class="ico">${u.icon}</div><div class="v">x${F.sub(i + 1)}</div><b>${esc(u.long)}</b><p class="small muted" style="margin:4px 0 0">${esc(u.desc)}</p></div>`;
      }).join("");
      const flow = [
        ["1", "Captura", "Metas bᵢ y coeficientes aᵢⱼ por unidad", "datos"],
        ["2", "Validación", "R2–R3: simetría y Sylvester", "formulacion"],
        ["3", "Referencia", "Cholesky, LU y Gauss", "directos"],
        ["4", "Iteración", "GCP (Jacobi, IC(0), SSOR) y GC", "gcp"],
        ["5", "Control", "Errores, residuo y κ", "errores"],
        ["6", "Decisión", "Presupuesto por unidad, R1 y R5", "caso"],
      ]
        .map(([k, t, d, r]) => `<div><span class="k">PASO ${k}</span><b><a href="#/${r}">${t}</a></b>${d}</div>`)
        .join("");

      let live = "";
      if (!res.valid) live = invalidBox(res);
      else {
        const R = rules(res);
        const fl = res.A.map((r, i) => r.map((a, j) => a * res.xref[j]));
        const flowRows = fl.map((r, i) => [
          `<b>${esc(unit(i).short)}</b>`,
          ...r.map((v) => (v === 0 ? '<span class="muted">0</span>' : F.fix(v, 2))),
          `<b>${F.fix(res.b[i], 2)}</b>`,
          `${((100 * r[i]) / res.b[i]).toFixed(1)} %`,
        ]);
        live = `
          ${card(
            "Verificación automática de las reglas de negocio (datos actuales)",
            table(
              ["Regla", "Nombre", "Condición", "Evidencia con los datos actuales", "Estado"],
              R.map(([id, nm, cond, ev, okk]) => [`<b>${id}</b>`, nm, cond, `<span class="small">${ev}</span>`, chip(okk ? "ok" : "warn", okk ? "Cumple" : "No cumple")]),
            ) +
              (R[2][4]
                ? ""
                : note("La regla R3 no se cumple: la diagonal ya no domina. Es lo esperado en el escenario mal condicionado; A sigue siendo definida positiva (Sylvester), pero el sistema se vuelve frágil.", "warn")),
          )}
          <div class="grid g2">
            ${card("Red de flujo interdepartamental", network(res) + `<p class="cap">El grosor de cada arista es la interdependencia normalizada ${T("\\rho_{ij} = a_{ij}/\\sqrt{a_{ii}a_{jj}}")}; en rojo, ${T("\\rho > 0.9")}. Se redibuja con cada cambio en la matriz.</p>`)}
            ${card(
              "Matriz de flujo de caja interdepartamental",
              `<p class="small">Con la solución de referencia, ${T("F_{ij} = a_{ij}\\,x_j")} es el flujo (miles de Bs) que el presupuesto de la unidad ${T("j")} aporta a la meta de la unidad ${T("i")}. Cada fila suma ${T("b_i")}: la regla R1 vista como dinero.</p>` +
                table(["Meta de ↓ / aporte de →", ...Array.from({ length: res.n }, (_, j) => `x${F.sub(j + 1)}`), "Σ = bᵢ", "% propio"], flowRows, { cls: "num" }),
            )}
          </div>`;
      }

      return `
      ${UI.pageHead({
        group: "Proyecto",
        module: 2,
        title: "Caso de estudio",
        lead: "Una empresa de servicios mediana de La Paz planifica su presupuesto anual por unidades. Las unidades no funcionan aisladas: Operaciones depende de la plataforma de TI, Comercial vende lo que Operaciones produce e Innovación solo se conecta con el resto a través de TI. Planificar sin esas interdependencias sobreestima o subestima el presupuesto que cada unidad necesita realmente.",
        tags: ["Mención: Ingeniería de Sistemas", "Modelado de procesos", "Reglas de negocio", "Flujo de caja interdepartamental", "Valor organizacional"],
      })}
      <div class="units">${units}</div>

      <h2 class="sec"><span class="n">IS</span>Proceso de planificación modelado</h2>
      <div class="flow">${flow}</div>

      <h2 class="sec"><span class="n">R</span>Reglas de negocio del modelo</h2>
      <div class="grid g2">
        ${card("", `
          <div class="def">
            <b>R1</b><span><b>Balance de flujo.</b> Cada unidad alcanza su meta con su propio presupuesto y los retornos que recibe: ${T("\\sum_j a_{ij}x_j=b_i")}.</span>
            <b>R2</b><span><b>Reciprocidad.</b> Los acuerdos de servicio usan un único precio de transferencia bilateral: ${T("a_{ij}=a_{ji}")} (A simétrica).</span>
            <b>R3</b><span><b>Predominio del retorno propio.</b> ${T("a_{ii} > \\sum_{j\\neq i}|a_{ij}|")}. Con diagonal positiva garantiza, por Gershgorin, que A es definida positiva.</span>
          </div>`)}
        ${card("", `
          <div class="def">
            <b>R4</b><span><b>Canal único de Innovación.</b> Innovación no intercambia flujo directo con Operaciones ni con Comercial: ${T("a_{14}=a_{34}=0")}. Es el patrón de ceros que conserva IC(0).</span>
            <b>R5</b><span><b>Asignación factible.</b> Ningún presupuesto puede ser negativo: ${T("x_i \\ge 0")}.</span>
          </div>
          <p class="small muted" style="margin-top:10px">Las reglas se traducen en validaciones del software: R2 y R3 en la comprobación de simetría y Sylvester, R4 en el patrón de dispersión, R1 y R5 en la verificación de la solución.</p>`)}
      </div>

      ${live}

      ${card(
        "Procedencia de los datos y valor organizacional",
        `<p>Los coeficientes son <b>datos ilustrativos calibrados por el autor</b> a partir de supuestos de planificación: retornos directos entre 1.20 y 1.50 Bs de flujo por cada Bs asignado,
        retornos cruzados entre 0.15 y 0.35 y un plan base de 800, 650, 500 y 400 miles de Bs. No provienen de estados financieros reales.
        El escenario de estrés aplica un supuesto de inflación de costos de alrededor del 12 % y el mal condicionado reproduce una consolidación contable con escalas heterogéneas
        (ver <a href="#/escenarios">Tres escenarios</a>, donde se muestra el cálculo de cada dato).</p>
        <p>El <b>valor organizacional</b> del modelo está en que hace explícitas las dependencias entre áreas: la matriz de flujo muestra quién financia la meta de quién,
        los multiplicadores ${T("A^{-1}")} (en <a href="#/directos">Solución de referencia</a>) cuantifican cuánto presupuesto adicional exige un cambio de meta en una unidad,
        y ${T("\\kappa(A)")} funciona como indicador de riesgo: advierte cuándo la planificación se vuelve frágil frente a errores en los datos.</p>`,
      )}`;
    },
  });
})();
