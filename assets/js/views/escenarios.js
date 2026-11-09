/* Vista 5 · Tres escenarios */
(function () {
  "use strict";
  const { card, T, TD, table, chip, esc, note, plot, details } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER, unit } = window.CASE;

  App.view({
    id: "escenarios",
    title: "Tres escenarios",
    icon: "③",
    color: "--c-warn",
    module: 5,
    blurb: "Ideal, bajo estrés y mal condicionado: justificación, cálculo de A y b, carga rápida.",
    render({ scen, st }) {
      const cards = ORDER.map((k) => {
        const s = SCENARIOS[k],
          r = scen[k];
        const active = st.scenario === k && !st.edited;
        return `<section class="card scen-card" style="--sc:var(--c-${s.color})"><div class="card-b">
          <div class="row"><span class="num">ESCENARIO ${s.num}</span><span class="sp"></span>${active ? chip("ok", "Activo") : ""}</div>
          <h3 style="font-size:20px;margin:6px 0 4px;font-family:var(--font-serif)">${s.name}</h3>
          <p class="muted" style="margin:0">${s.summary}</p>
          <ul>${s.points.map((p) => `<li>${p}</li>`).join("")}</ul>
          <div class="row small" style="margin:8px 0 12px">${chip(s.color === "bad" ? "bad" : s.color === "warn" ? "warn" : "ok", `κ(A) = ${F.smart(r.kA.cond, 4)}`)}
          ${chip("info", `GC ${r.gc.iters} · GCP ${r.gcp.iters} it.`)}</div>
          <p class="small"><b>Análisis esperado:</b> ${s.expected}</p>
          <button class="btn primary sm" type="button" data-load="${k}">Cargar y ejecutar</button>
        </div></section>`;
      }).join("");

      const builds = ORDER.map((k) => {
        const s = SCENARIOS[k];
        let extra = "";
        if (k === "mal")
          extra = TD(`D = \\operatorname{diag}(${s.D.join(",\\ ")}),\\quad S = ${F.tmat(s.S)}`) + TD(`A = D\\,S\\,D = ${F.tmat(s.A)}`);
        else extra = TD(`A = ${F.tmat(s.A)},\\qquad \\mathbf b = ${F.tvec(s.b)}`);
        if (s.plan) extra += TD(`\\mathbf b = A\\,${F.tvec(s.plan)} = ${F.tvec(NM.matVec(s.A, s.plan))}`);
        return details(
          `esc-b-${k}`,
          `Cómo se construyó el escenario ${s.num} · ${s.name} <span class="hint">· cálculo de A y b</span>`,
          `<ol>${s.build.map((b) => `<li><b>${b.title}.</b> ${b.text}${b.tex ? TD(b.tex) : ""}</li>`).join("")}</ol>${extra}`,
        );
      }).join("");

      const I = scen.ideal,
        E = scen.estres;
      const deltaRows = I.xref.map((x, i) => [
        `<span class="var">x${F.sub(i + 1)}</span> ${esc(unit(i).short)}`,
        F.fix(x, 2),
        F.fix(E.xref[i], 2),
        F.fix(E.xref[i] - x, 2),
        `${(((E.xref[i] - x) / x) * 100).toFixed(1)} %`,
      ]);
      const tI = I.xref.reduce((a, b) => a + b, 0),
        tE = E.xref.reduce((a, b) => a + b, 0);
      deltaRows.push(["<b>Total</b>", F.fix(tI, 2), F.fix(tE, 2), F.fix(tE - tI, 2), `<b>${(((tE - tI) / tI) * 100).toFixed(1)} %</b>`]);

      return `
      ${UI.pageHead({
        group: "Datos",
        module: 5,
        title: "Tres escenarios obligatorios",
        lead: "Los tres escenarios comparten las mismas variables y la misma estructura de red (regla R4). Cambian, con justificación financiera, los coeficientes de A, el vector b o ambos. Cada botón carga los datos y ejecuta todos los métodos.",
      })}
      <div class="grid g3">${cards}</div>
      <h2 class="sec"><span class="n">A,b</span>Construcción de cada escenario</h2>
      ${builds}

      <h2 class="sec"><span class="n">Δ</span>Impacto del estrés financiero: ¿cambia el condicionamiento o el equilibrio?</h2>
      <div class="grid g2">
        ${card("Presupuesto ideal vs bajo estrés (miles de Bs)", table(["Unidad", "Ideal", "Bajo estrés", "Cambio", "Cambio %"], deltaRows, { cls: "num" }))}
        ${card("Cambio porcentual por unidad", plot("esc-delta", 260))}
      </div>
      ${note(
        `κ(A) pasa de ${F.smart(I.kA.cond, 4)} a ${F.smart(E.kA.cond, 4)} (+${(((E.kA.cond - I.kA.cond) / I.kA.cond) * 100).toFixed(1)} %): el estrés <b>desplaza el punto de equilibrio</b>
        (el presupuesto total sube ${(((tE - tI) / tI) * 100).toFixed(1)} %) pero <b>no altera de forma significativa el condicionamiento</b>.
        El algoritmo responde igual: GC y GCP siguen convergiendo en ${E.gc.iters} y ${E.gcp.iters} iteraciones.`,
        "warn",
        "Conclusión del escenario 2.",
      )}

      <h2 class="sec"><span class="n">κ</span>Condicionamiento de los tres escenarios</h2>
      <div class="grid g2">
        ${card("κ(A) y κ(M⁻¹A) por escenario (escala logarítmica)", plot("esc-kappa", 320))}
        ${card("Iteraciones hasta la tolerancia", plot("esc-iters", 320))}
      </div>`;
    },
    mount(root, { scen }) {
      root.querySelectorAll("[data-load]").forEach((b) =>
        b.addEventListener("click", () => {
          Store.loadScenario(b.dataset.load);
        }),
      );
      const cats = ORDER.map((k) => `${SCENARIOS[k].num}. ${SCENARIOS[k].short}`);
      const I = scen.ideal,
        E = scen.estres;
      Charts.bars(
        "esc-delta",
        I.xref.map((_, i) => unit(i).short),
        [{ name: "Cambio %", y: I.xref.map((x, i) => +(((E.xref[i] - x) / x) * 100).toFixed(2)), color: Charts.COLORS.gauss }],
        { ytitle: "% respecto al ideal", fmt: (v) => `${v.toFixed(1)} %`, layout: { showlegend: false, margin: { t: 20 } } },
      );
      Charts.bars(
        "esc-kappa",
        cats,
        [
          { name: "κ(A)", y: ORDER.map((k) => scen[k].kA.cond), color: Charts.COLORS.gc },
          { name: "κ(M⁻¹A) Jacobi", y: ORDER.map((k) => scen[k].others.jacobi.k.cond), color: Charts.COLORS.jacobi },
          { name: "κ(M⁻¹A) IC(0)", y: ORDER.map((k) => scen[k].others.ic0.k.cond), color: Charts.COLORS.ic0 },
          { name: "κ(M⁻¹A) SSOR", y: ORDER.map((k) => scen[k].others.ssor.k.cond), color: Charts.COLORS.ssor },
        ],
        { log: true, ytitle: "número de condición", fmt: (v) => F.smart(v, 2) },
      );
      Charts.bars(
        "esc-iters",
        cats,
        [
          { name: "GC simple", y: ORDER.map((k) => scen[k].gc.iters), color: Charts.COLORS.gc },
          { name: "GCP Jacobi", y: ORDER.map((k) => scen[k].others.jacobi.run.iters), color: Charts.COLORS.jacobi },
          { name: "GCP IC(0)", y: ORDER.map((k) => scen[k].others.ic0.run.iters), color: Charts.COLORS.ic0 },
          { name: "GCP SSOR", y: ORDER.map((k) => scen[k].others.ssor.run.iters), color: Charts.COLORS.ssor },
        ],
        { ytitle: "iteraciones", layout: { yaxis: { dtick: 1 } } },
      );
    },
  });
})();
