/* Vista 1 · Inicio */
(function () {
  "use strict";
  const { card, kpi, T, TD, table } = window.UI;
  const F = window.FMT;
  const { STUDENT } = window.CASE;

  App.view({
    id: "inicio",
    title: "Inicio",
    icon: "⌂",
    color: "--accent",
    render({ res, scen }) {
      const s = scen;
      const it = (k) => `${s[k].gc.iters} / ${s[k].gcp.iters}`;
      const map = [...App.views.values()]
        .filter((v) => v.id !== "inicio")
        .map(
          (v) =>
            `<a href="#/${v.id}" style="--mc:var(${v.color || "--accent"})"><span class="mn">${v.module ? `MÓDULO ${v.module}` : "COMPLEMENTO"}</span><div><b>${v.title}</b></div><small>${v.blurb || ""}</small></a>`,
        )
        .join("");
      return `
      <section class="hero">
        <div class="eyebrow">Aplicación del método de Gradientes Conjugados Precondicionado en problemas financieros</div>
        <h1>Planificación financiera y distribución de recursos entre cuatro unidades estratégicas interdependientes</h1>
        <p>El presupuesto de cada unidad genera flujo de caja en ella misma y en las unidades con las que comparte procesos.
        Ese acoplamiento se modela como un sistema lineal simétrico y definido positivo ${T("A\\mathbf{x}=\\mathbf{b}")}
        que se resuelve con tres métodos directos (Cholesky, LU y Gauss) y con Gradientes Conjugados Precondicionado (Suñagua, 2020),
        contrastado con Gradientes Conjugados simple en tres escenarios.</p>
        <div class="row">
          <a class="btn primary" href="#/caso">Empezar por el caso de estudio →</a>
          <a class="btn" href="#/datos">Editar los datos</a>
          <a class="btn" href="#/comparativa">Ver la comparativa</a>
        </div>
        <div class="hero-eq" aria-hidden="true">Ax = b</div>
      </section>

      <div class="grid g2">
        ${card(
          "Datos del estudiante",
          table(
            ["Campo", "Valor"],
            [
              ["Nombre", `<b>${STUDENT.name}</b>`],
              ["C.I.", STUDENT.ci],
              ["Mención", STUDENT.mencion],
              ["Modalidad", STUDENT.modalidad],
              ["Área", STUDENT.area],
              ["Gestión", STUDENT.gestion],
            ],
          ),
        )}
        ${card(
          "Síntesis del caso financiero",
          `<p>Se reparte el presupuesto anual (miles de Bs) entre <b>Operaciones</b>, <b>Tecnologías de Información</b>,
          <b>Comercial</b> e <b>Innovación</b>. Cada coeficiente ${T("a_{ij}")} mide cuánto flujo de caja aporta un boliviano
          asignado a la unidad ${T("j")} a la meta de la unidad ${T("i")}; el vector ${T("\\mathbf b")} fija la meta de flujo que
          cada unidad debe cubrir.</p>
          ${TD("\\underbrace{\\begin{bmatrix} a_{11} & \\cdots & a_{14}\\\\ \\vdots & \\ddots & \\vdots \\\\ a_{41} & \\cdots & a_{44}\\end{bmatrix}}_{\\text{retornos}}\\underbrace{\\begin{bmatrix}x_1\\\\ \\vdots\\\\ x_4\\end{bmatrix}}_{\\text{presupuestos}} = \\underbrace{\\begin{bmatrix}b_1\\\\ \\vdots\\\\ b_4\\end{bmatrix}}_{\\text{metas}}")}
          <p class="small muted">Parámetros: ${T("n = 4")} (editable hasta 8), ${T("\\mathbf x_0=\\mathbf 0")}, tolerancia
          ${T("\\|r_k\\|_2/\\|b\\|_2 < 10^{-6}")}, precondicionadores Jacobi, IC(0) y SSOR.</p>`,
        )}
      </div>

      <h2 class="sec"><span class="n">≡</span>Resultados de un vistazo</h2>
      <div class="kpis">
        ${kpi("κ(A) · Ideal", F.smart(s.ideal.kA.cond, 3), "bien condicionada", "ok")}
        ${kpi("κ(A) · Bajo estrés", F.smart(s.estres.kA.cond, 3), "solo desplaza el equilibrio", "warn")}
        ${kpi("κ(A) · Mal condicionado", F.sci(s.mal.kA.cond, 2), `IC(0): κ(M⁻¹A) = ${F.smart(s.mal.kM.cond, 2)}`, "bad")}
        ${kpi("Iteraciones GC / GCP", `${it("ideal")} · ${it("estres")} · ${it("mal")}`, "escenarios 1 · 2 · 3", "acc")}
        ${kpi("Estado de los datos actuales", res.valid ? "Válidos" : "No válidos", res.valid ? `GCP: ${res.gcp.iters} iteraciones` : "ver Entrada de datos", res.valid ? "ok" : "bad")}
      </div>

      <h2 class="sec"><span class="n">⇢</span>Mapa del proyecto</h2>
      <p class="muted">Cada método tiene su propia página con la teoría, el algoritmo, el cálculo paso a paso con los datos actuales y sus gráficos.
      La barra superior permite cambiar de escenario o de precondicionador desde cualquier página; todo se recalcula al instante.</p>
      <div class="map">${map}</div>
      `;
    },
  });
})();
