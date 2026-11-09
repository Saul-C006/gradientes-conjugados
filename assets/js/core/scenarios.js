/* =====================================================================
 * Datos del caso de estudio y de los tres escenarios obligatorios.
 * Los coeficientes son ilustrativos y calibrados por el autor; cada
 * escenario documenta el cálculo exacto con que se obtuvo (campo `build`).
 * ===================================================================== */
(function (root, factory) {
  const D = factory();
  if (typeof module === "object" && module.exports) module.exports = D;
  else root.CASE = D;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const UNITS = [
    {
      short: "Operaciones",
      long: "Operaciones y Producción",
      icon: "⚙",
      desc: "Presta el servicio principal. Consume la plataforma de TI y abastece a Comercial.",
    },
    {
      short: "TI",
      long: "Tecnologías de Información",
      icon: "⌘",
      desc: "Unidad transversal (ERP, CRM, infraestructura). Es el nodo que conecta a todas las demás.",
    },
    {
      short: "Comercial",
      long: "Comercial y Marketing",
      icon: "◎",
      desc: "Ventas y posicionamiento. Depende de la capacidad de Operaciones y del CRM de TI.",
    },
    {
      short: "Innovación",
      long: "Innovación y Transformación Digital",
      icon: "✦",
      desc: "Cartera de proyectos nuevos. Su flujo se materializa solo a través de la plataforma de TI.",
    },
  ];

  /** Nombre de la unidad i (para n > 4 se generan unidades adicionales). */
  const unit = (i) =>
    UNITS[i] || {
      short: `Unidad ${i + 1}`,
      long: `Unidad estratégica ${i + 1}`,
      icon: "•",
      desc: "Unidad adicional definida por el usuario.",
    };

  const IDEAL_A = [
    [1.5, 0.25, 0.2, 0],
    [0.25, 1.4, 0.15, 0.3],
    [0.2, 0.15, 1.3, 0],
    [0, 0.3, 0, 1.2],
  ];
  const IDEAL_PLAN = [800, 650, 500, 400];

  const SCENARIOS = {
    ideal: {
      key: "ideal",
      num: 1,
      name: "Ideal",
      short: "Ideal",
      color: "ok",
      precond: "jacobi",
      A: IDEAL_A,
      b: [1462.5, 1305, 907.5, 675],
      plan: IDEAL_PLAN,
      summary: "Situación financiera estable y equilibrada.",
      points: [
        "Retornos directos de 1.20 a 1.50 Bs por cada Bs asignado; retornos cruzados de 0.15 a 0.30.",
        "Diagonal estrictamente dominante (regla R3): A está bien condicionada.",
        "b = A·x con el plan base 800 / 650 / 500 / 400 miles de Bs.",
      ],
      expected:
        "κ(A) bajo: se evalúa la exactitud y la convergencia rápida del método.",
      build: [
        {
          title: "Retornos directos aᵢᵢ",
          text: "Flujo de caja que genera cada unidad por cada Bs que recibe: Operaciones 1.50, TI 1.40, Comercial 1.30 e Innovación 1.20 (proyectos nuevos maduran más lento).",
        },
        {
          title: "Retornos cruzados aᵢⱼ",
          text: "a₁₂ = 0.25 (Operaciones usa la plataforma de TI), a₁₃ = 0.20 (Comercial vende lo que produce Operaciones), a₂₃ = 0.15 (CRM), a₂₄ = 0.30 (Innovación se apoya en TI). a₁₄ = a₃₄ = 0 por la regla R4.",
        },
        {
          title: "Metas de flujo b",
          text: "Se fijó primero el plan base x = (800, 650, 500, 400) y se calculó b = A·x, de modo que la solución exacta es conocida y sirve para comprobar los métodos.",
          tex: "b_1 = 1.5(800) + 0.25(650) + 0.2(500) + 0(400) = 1462.5",
        },
      ],
    },
    estres: {
      key: "estres",
      num: 2,
      name: "Bajo estrés financiero",
      short: "Bajo estrés",
      color: "warn",
      precond: "jacobi",
      A: [
        [1.38, 0.35, 0.2, 0],
        [0.35, 1.29, 0.15, 0.3],
        [0.2, 0.15, 1.2, 0],
        [0, 0.3, 0, 1.1],
      ],
      b: [1640, 1460, 1015, 755],
      summary: "Inflación de costos de alrededor del 12 %.",
      points: [
        "Retornos directos reducidos 8 %: cada Bs compra menos insumos (aᵢᵢ × 0.92).",
        "a₁₂ sube de 0.25 a 0.35: Operaciones automatiza para contener costos y depende más de TI.",
        "Las metas de flujo b suben cerca de 12 % para cubrir costos más altos.",
      ],
      expected:
        "Se verifica si el estrés altera el condicionamiento o solo desplaza el punto de equilibrio.",
      build: [
        {
          title: "Retornos directos × 0.92",
          text: "La inflación de costos reduce el flujo que produce cada Bs: 1.5·0.92 = 1.38; 1.4·0.92 = 1.288 ≈ 1.29; 1.3·0.92 = 1.196 ≈ 1.20; 1.2·0.92 = 1.104 ≈ 1.10.",
        },
        {
          title: "Mayor dependencia Operaciones–TI",
          text: "Para contener costos, Operaciones automatiza procesos: a₁₂ = a₂₁ pasa de 0.25 a 0.35. El resto de los retornos cruzados no cambia y se mantiene la simetría (R2).",
        },
        {
          title: "Metas b × 1.12",
          text: "Cada meta del escenario ideal se multiplica por 1.12 y se redondea a múltiplos de 5 miles de Bs: 1462.5·1.12 = 1638 ≈ 1640; 1305·1.12 = 1461.6 ≈ 1460; 907.5·1.12 = 1016.4 ≈ 1015; 675·1.12 = 756 ≈ 755.",
        },
      ],
    },
    mal: {
      key: "mal",
      num: 3,
      name: "Mal condicionado",
      short: "Mal condicionado",
      color: "bad",
      precond: "ic0",
      A: [
        [400, 19.6, 0.2, 0],
        [19.6, 1, 0.04, 0.4],
        [0.2, 0.04, 0.04, 0],
        [0, 0.4, 0, 16],
      ],
      b: [341828, 16965.6, 213.6, 7160],
      plan: [820, 700, 540, 430],
      D: [20, 1, 0.2, 4],
      S: [
        [1, 0.98, 0.05, 0],
        [0.98, 1, 0.2, 0.1],
        [0.05, 0.2, 1, 0],
        [0, 0.1, 0, 1],
      ],
      summary: "Alta interdependencia y mal escalamiento entre variables.",
      points: [
        "Operaciones y TI casi redundantes: ρ₁₂ = 19.6/√(400·1) = 0.98 (automatización total).",
        "Consolidación contable sin normalizar: escalas de la diagonal de 0.04 a 400 (factor 10⁴).",
        "b = A·x con el plan 820 / 700 / 540 / 430; κ(A) ≈ 10⁵ ≫ 1.",
      ],
      expected:
        "κ(A) ≫ 1: Jacobi corrige el mal escalamiento; IC(0) además la correlación fuera de la diagonal.",
      build: [
        {
          title: "Matriz de correlaciones S",
          text: "Se parte de una matriz de interdependencias normalizadas con ρ₁₂ = 0.98: Operaciones y TI casi redundantes por la automatización total.",
        },
        {
          title: "Escalas D = diag(20, 1, 0.2, 4)",
          text: "Cada unidad reporta en una escala contable distinta (consolidación sin normalizar). A = D·S·D, por ejemplo a₁₂ = 20·0.98·1 = 19.6 y a₃₃ = 0.2·1·0.2 = 0.04.",
          tex: "A = D\\,S\\,D,\\quad a_{ij} = d_i\\, s_{ij}\\, d_j",
        },
        {
          title: "Metas b = A·x",
          text: "Con el plan x = (820, 700, 540, 430) se obtiene b = A·x, de modo que la solución exacta es conocida aunque el sistema sea frágil.",
          tex: "b_1 = 400(820) + 19.6(700) + 0.2(540) = 341828",
        },
      ],
    },
  };

  const ORDER = ["ideal", "estres", "mal"];

  const RUBRIC = [
    { crit: "Caso financiero y modelado (n ≥ 4)", pts: 15, where: ["caso", "formulacion"] },
    { crit: "Solución numérica de referencia", pts: 15, where: ["cholesky", "lu", "gauss", "directos"] },
    { crit: "Implementación del algoritmo GCP", pts: 20, where: ["gc", "gcp", "comparativa"] },
    { crit: "Construcción de los tres escenarios", pts: 15, where: ["escenarios"] },
    { crit: "Análisis de errores y condicionamiento", pts: 15, where: ["errores", "geometria"] },
    { crit: "Página web interactiva y módulo QA", pts: 10, where: ["datos", "qa"] },
    { crit: "Aporte específico de la mención (Ing. de Sistemas)", pts: 5, where: ["caso"] },
    { crit: "Interpretación y conclusiones", pts: 5, where: ["conclusiones"] },
  ];

  const STUDENT = {
    name: "Saúl Walter Callisaya Sumi",
    ci: "15074779",
    mencion: "Ingeniería de Sistemas",
    modalidad: "Individual",
    area: "Finanzas",
    gestion: "2026",
  };

  return { UNITS, unit, SCENARIOS, ORDER, RUBRIC, STUDENT };
});
