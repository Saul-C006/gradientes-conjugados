/* Vista 10 · Conclusiones y referencias */
(function () {
  "use strict";
  const { card, T } = window.UI;
  const F = window.FMT;

  App.view({
    id: "conclusiones",
    title: "Conclusiones y referencias",
    nav: "Conclusiones",
    icon: "★",
    color: "--c-s6",
    module: 10,
    blurb: "Interpretación técnica y financiera, cita de Suñagua (2020) y fuentes de datos.",
    render({ scen }) {
      const I = scen.ideal,
        E = scen.estres,
        M = scen.mal;
      const it = App.interp(scen);
      const dif = (r) => Math.max(...r.xref.map((x, i) => Math.max(Math.abs(x - r.lu.x[i]), Math.abs(x - r.gauss.x[i])) / Math.max(1, Math.abs(x))));
      const maxEp = Math.max(...["ideal", "estres", "mal"].map((k) => Math.max(...scen[k].errGCP.map((e) => e.ep ?? 0))));
      return `
      ${UI.pageHead({ group: "Calidad y cierre", module: 10, title: "Conclusiones y referencias", lead: "Interpretación matemática y financiera de los resultados obtenidos en los tres escenarios. Los números de esta página se calculan en vivo." })}
      <div class="grid g2">
        ${card(
          "Interpretación técnica",
          `<p><b>1. Métodos directos.</b> Cholesky, LU y Gauss dan la misma solución en los tres escenarios. En los bien condicionados difieren en
          ${F.sci(Math.max(dif(I), dif(E)), 1)} o menos (nivel del redondeo); en el mal condicionado la diferencia sube a ${F.sci(dif(M), 1)}, del orden de
          ${T("\\kappa(A)\\,\\varepsilon \\approx " + F.ts(M.kA.cond * 2.22e-16, 1))}. El mal condicionamiento se nota incluso en los métodos «exactos».</p>
          <p><b>2. Exactitud del GCP.</b> En los tres escenarios el GCP alcanza ${T("\\|r_k\\|_2/\\|b\\|_2 < 10^{-6}")} y reproduce la solución de Cholesky con errores porcentuales
          de ${F.sci(maxEp, 1)} % o menores.</p>
          <p><b>3. Terminación finita.</b> Con ${T("n = 4")} el GC termina, en aritmética exacta, en a lo sumo 4 iteraciones. Por eso en los escenarios bien condicionados
          (κ ≈ ${I.kA.cond.toFixed(2)} y ${E.kA.cond.toFixed(2)}) GC y GCP-Jacobi coinciden en ${I.gc.iters} iteraciones; IC(0) baja a ${I.others.ic0.run.iters} porque aproxima casi toda la matriz
          (${T("\\kappa(M^{-1}A)\\approx" + F.tn(I.others.ic0.k.cond, 3))}).</p>
          <p><b>4. Precondicionamiento.</b> En el escenario mal condicionado ${T("\\kappa(A)\\approx" + F.ts(M.kA.cond, 2))} y el redondeo hace que el GC simple necesite ${M.gc.iters} iteraciones, más que n.
          Jacobi corrige el mal escalamiento (${T("\\kappa \\approx " + F.tn(M.others.jacobi.k.cond, 1))}, ${M.others.jacobi.run.iters} it.) pero no la correlación ${T("\\rho_{12} = 0.98")};
          IC(0) actúa sobre ambas causas (${T("\\kappa \\approx " + F.tn(M.others.ic0.k.cond, 2))}, ${M.others.ic0.run.iters} it.). Esto confirma la recomendación de la guía: Jacobi para mal escalamiento
          y Cholesky incompleto para acoplamiento fuerte fuera de la diagonal.</p>
          <p><b>5. Residuo frente a error.</b> Un residuo pequeño no garantiza un error pequeño cuando κ es grande:
          ${T("\\|e\\|/\\|x\\| \\le \\kappa(A)\\,\\|r\\|/\\|b\\|")}. Por eso se informan ambos indicadores y κ se calcula por autovalores.</p>`,
        )}
        ${card(
          "Interpretación financiera",
          `<p><b>Escenario ideal.</b> ${it.ideal}</p>
          <p><b>Escenario bajo estrés.</b> ${it.estres}</p>
          <p><b>Escenario mal condicionado.</b> ${it.mal}</p>
          <p><b>Aporte desde Ingeniería de Sistemas.</b> Las reglas de negocio R1–R5 se traducen en restricciones verificadas automáticamente por el software:
          R2 y R3 en la validación de simetría y Sylvester, R4 en el patrón de ceros que conserva IC(0), y R1 y R5 en el balance y la factibilidad de la solución.
          La matriz de flujo y los multiplicadores ${T("A^{-1}")} convierten el resultado numérico en información de gestión, y ${T("\\kappa(A)")} funciona como indicador de riesgo del proceso de planificación.
          La calidad del software se respalda con pruebas en vivo (módulo QA), pruebas unitarias del núcleo numérico y pruebas de extremo a extremo en un navegador real.</p>`,
        )}
      </div>
      ${card(
        "Referencias",
        `<ol>
          <li>Suñagua S., P. (2020). Método de Gradientes Conjugados Precondicionado. <i>Revista Boliviana de Matemática – UMSA</i>, 04, 2–7.</li>
          <li>Golub, G. H., &amp; Van Loan, C. F. (2013). <i>Matrix Computations</i> (4th ed.). Johns Hopkins University Press.</li>
          <li>Saad, Y. (2003). <i>Iterative Methods for Sparse Linear Systems</i> (2nd ed.). SIAM.</li>
          <li>Hestenes, M. R., &amp; Stiefel, E. (1952). Methods of Conjugate Gradients for Solving Linear Systems. <i>Journal of Research of the National Bureau of Standards</i>, 49(6), 409–436.</li>
          <li>Shewchuk, J. R. (1994). <i>An Introduction to the Conjugate Gradient Method Without the Agonizing Pain</i>. Carnegie Mellon University.</li>
          <li>Universidad Mayor de San Andrés, Carrera de Informática (2026). <i>Desafío Académico de Métodos Numéricos: Aplicación del Método de Gradientes Conjugados Precondicionado en problemas financieros</i> (guía del desafío).</li>
        </ol>
        <p class="small muted"><b>Fuente de datos:</b> coeficientes y metas ilustrativos construidos por el autor; el cálculo de cada valor se documenta en <a href="#/escenarios">Tres escenarios</a>.
        <b>Software:</b> JavaScript puro para todos los cálculos; Plotly.js (gráficos) y KaTeX (fórmulas) incluidos en el repositorio.</p>`,
      )}`;
    },
  });
})();
