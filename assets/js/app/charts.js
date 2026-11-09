/* =====================================================================
 * Gráficos (Plotly) con el tema visual de la página.
 * Si Plotly no carga, cada gráfico muestra un aviso y el resto funciona.
 * ===================================================================== */
(function () {
  "use strict";
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const COLORS = {
    get gc() { return css("--c-gc"); },
    get gcp() { return css("--c-gcp"); },
    get jacobi() { return css("--c-jacobi"); },
    get ic0() { return css("--c-ic0"); },
    get ssor() { return css("--c-ssor"); },
    get chol() { return css("--c-chol"); },
    get lu() { return css("--c-lu"); },
    get gauss() { return css("--c-gauss"); },
    get sd() { return css("--c-sd"); },
    get tol() { return css("--c-bad"); },
    get ink() { return css("--ink"); },
    get muted() { return css("--muted"); },
    series: () => [css("--c-s1"), css("--c-s2"), css("--c-s3"), css("--c-s4"), css("--c-s5"), css("--c-s6"), css("--c-s7"), css("--c-s8")],
  };

  const baseLayout = (extra = {}) => {
    const grid = css("--grid");
    const ink = css("--ink-2");
    const L = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: css("--font-sans") || "system-ui", size: 12, color: ink },
      margin: { l: 60, r: 18, t: 30, b: 56 },
      legend: { orientation: "h", y: -0.24, yanchor: "top", x: 0, font: { size: 11 } },
      hoverlabel: { font: { family: css("--font-mono") || "monospace" } },
      xaxis: { gridcolor: grid, zerolinecolor: grid, linecolor: grid, automargin: true },
      yaxis: { gridcolor: grid, zerolinecolor: grid, linecolor: grid, automargin: true },
    };
    return deepMerge(L, extra);
  };
  function deepMerge(a, b) {
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  const CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"] };

  function draw(id, data, layout = {}, config = {}) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return;
    if (!window.Plotly) {
      el.innerHTML = `<div class="plot-missing">No se pudo cargar la librería de gráficos. Los resultados numéricos siguen disponibles en las tablas.</div>`;
      return;
    }
    Plotly.react(el, data, baseLayout(layout), Object.assign({}, CONFIG, config));
  }

  /** Superíndices para ejes logarítmicos: 10⁻⁶. */
  const logAxis = (title, extra = {}) =>
    Object.assign({ type: "log", title: { text: title }, exponentformat: "power", showexponent: "all" }, extra);

  /** Curvas de convergencia ‖rₖ‖/‖b‖ (escala log). */
  function convergence(id, series, tol, opts = {}) {
    const data = series.map((s) => ({
      x: s.y.map((_, k) => k),
      y: s.y.map((v) => (v > 0 ? v : 1e-20)),
      name: s.name,
      mode: "lines+markers",
      line: { color: s.color, width: 2.5, dash: s.dash || "solid", shape: "linear" },
      marker: { size: 7, color: s.color },
      hovertemplate: `${s.name}<br>k = %{x}<br>%{y:.3e}<extra></extra>`,
    }));
    const maxK = Math.max(1, ...series.map((s) => s.y.length - 1));
    if (tol)
      data.push({
        x: [0, maxK],
        y: [tol, tol],
        name: `Tolerancia ${tol.toExponential(0)}`,
        mode: "lines",
        line: { color: COLORS.tol, dash: "dot", width: 1.5 },
        hoverinfo: "skip",
      });
    draw(id, data, {
      xaxis: { title: { text: "iteración k" }, dtick: maxK > 12 ? undefined : 1 },
      yaxis: logAxis(opts.ytitle || "‖rₖ‖₂ / ‖b‖₂"),
      ...(opts.layout || {}),
    });
  }

  /** Mapa de calor de una matriz. */
  function heatmap(id, M, opts = {}) {
    const n = M.length,
      m = M[0].length;
    const labels = opts.labels || Array.from({ length: m }, (_, j) => `${j + 1}`);
    const rlabels = opts.rlabels || Array.from({ length: n }, (_, i) => `${i + 1}`);
    const z = M.map((r) => r.map((v) => (opts.log ? (v === 0 ? null : Math.log10(Math.abs(v))) : v)));
    const text = M.map((r) => r.map((v) => (opts.fmt ? opts.fmt(v) : v === 0 ? "0" : Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5 ? v.toExponential(2) : (+v.toFixed(4)).toString())));
    draw(
      id,
      [
        {
          z,
          x: labels,
          y: rlabels,
          type: "heatmap",
          colorscale: opts.colorscale || "Blues",
          reversescale: !!opts.reverse,
          zmid: opts.zmid,
          showscale: opts.showscale !== false,
          text,
          texttemplate: opts.noText ? undefined : "%{text}",
          hovertemplate: `${opts.name || "M"}[%{y},%{x}] = %{text}<extra></extra>`,
          xgap: 2,
          ygap: 2,
          colorbar: { thickness: 10, title: { text: opts.cbTitle || "", side: "right" } },
        },
      ],
      {
        margin: { l: 70, r: 10, t: 10, b: 40 },
        yaxis: { autorange: "reversed", tickfont: { size: 11 }, gridcolor: "rgba(0,0,0,0)" },
        xaxis: { side: "top", tickfont: { size: 11 }, gridcolor: "rgba(0,0,0,0)" },
        ...(opts.layout || {}),
      },
    );
  }

  /** Barras agrupadas. */
  function bars(id, cats, series, opts = {}) {
    draw(
      id,
      series.map((s) => ({
        x: cats,
        y: s.y,
        name: s.name,
        type: "bar",
        marker: { color: s.color },
        text: s.text || s.y.map((v) => (opts.fmt ? opts.fmt(v) : v)),
        textposition: "outside",
        cliponaxis: false,
        hovertemplate: `${s.name}<br>%{x}: %{y}<extra></extra>`,
      })),
      {
        barmode: "group",
        bargap: 0.25,
        yaxis: Object.assign({ title: { text: opts.ytitle || "" } }, opts.log ? logAxis(opts.ytitle || "") : {}),
        ...(opts.layout || {}),
      },
    );
  }

  window.Charts = { draw, convergence, heatmap, bars, logAxis, COLORS, css };
})();
