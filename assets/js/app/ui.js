/* =====================================================================
 * Componentes de interfaz reutilizables (HTML como texto + KaTeX).
 * ===================================================================== */
(function () {
  "use strict";
  const F = window.FMT;
  const { unit } = window.CASE;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /** Fórmula en línea / en bloque con KaTeX (si no carga, muestra el TeX). */
  const tex = (s, display = false) => {
    if (window.katex) {
      try {
        return katex.renderToString(s, { throwOnError: false, displayMode: display, strict: "ignore" });
      } catch (_) {
        /* cae al texto */
      }
    }
    return `<code>${esc(s)}</code>`;
  };
  const T = (s) => tex(s, false);
  const TD = (s) => `<div class="eq">${tex(s, true)}</div>`;

  const chip = (cls, txt) => `<span class="chip ${cls}"><span class="dot"></span>${txt}</span>`;
  const yes = (b, y = "Sí", n = "No") => chip(b ? "ok" : "bad", b ? y : n);

  const card = (title, body, opts = {}) =>
    `<section class="card ${opts.cls || ""}" ${opts.id ? `id="${opts.id}"` : ""}>
      ${title ? `<header class="card-h"><h3>${title}</h3>${opts.right || ""}</header>` : ""}
      <div class="card-b">${body}</div>
    </section>`;

  const note = (body, cls = "info", title = "") =>
    `<div class="note ${cls}">${title ? `<strong>${title}</strong> ` : ""}${body}</div>`;

  const kpi = (label, value, sub = "", cls = "") =>
    `<div class="kpi ${cls}"><div class="kpi-l">${label}</div><div class="kpi-v">${value}</div>${sub ? `<div class="kpi-s">${sub}</div>` : ""}</div>`;

  const details = (id, summary, body, open = false) =>
    `<details class="proc" id="${id}" ${open ? "open" : ""}><summary>${summary}</summary><div class="proc-b">${body}</div></details>`;

  /** Lista de pasos numerados. */
  const steps = (items) => `<ol class="steps">${items.map((h) => `<li><div class="step-c">${h}</div></li>`).join("")}</ol>`;

  const table = (head, rows, opts = {}) =>
    `<div class="tbl-wrap"><table class="t ${opts.cls || ""}" ${opts.id ? `id="${opts.id}"` : ""}>
      <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;

  /** Encabezado de página con número de módulo de la guía. */
  const pageHead = (o) =>
    `<header class="page-h">
      <div class="crumbs">${o.group || ""}${o.module ? ` · <span class="mod">Módulo ${o.module} de la guía</span>` : ""}</div>
      <h1>${o.title}</h1>
      ${o.lead ? `<p class="lead">${o.lead}</p>` : ""}
      ${o.tags ? `<div class="tags">${o.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>` : ""}
    </header>`;

  const xi = (i) => `x${F.sub(i + 1)}`;
  const varName = (i) => `<span class="var">${xi(i)}</span> ${esc(unit(i).short)}`;

  /** Gráfico (contenedor para Plotly). */
  const plot = (id, h = 340, cls = "") => `<div class="plot ${cls}" id="${id}" style="height:${h}px"></div>`;

  /** Aviso cuando los datos actuales no son válidos. */
  const invalidBox = (res) =>
    `<div class="alert bad" role="alert">
      <div class="alert-t">Los datos actuales no se pueden resolver</div>
      <ul>${[...(res.validation?.messages || []), ...(res.paramErrors || [])].map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <p>Corrija los valores en <a href="#/datos">Entrada de datos</a> o cargue uno de los escenarios. La aplicación sigue funcionando.</p>
    </div>`;

  /** Tabla de un vector por variable. */
  const vecTable = (cols, n) => {
    const head = ["Variable", ...cols.map((c) => c.label)];
    const rows = Array.from({ length: n }, (_, i) => [varName(i), ...cols.map((c) => c.cell(i))]);
    return table(head, rows, { cls: "num" });
  };

  /** Botones segmentados. */
  const seg = (name, opts, active) =>
    `<div class="seg" role="group">${opts
      .map((o) => `<button type="button" class="${o.value === active ? "on" : ""}" data-${name}="${o.value}">${o.label}</button>`)
      .join("")}</div>`;

  window.UI = { esc, tex, T, TD, chip, yes, card, note, kpi, details, steps, table, pageHead, xi, varName, plot, invalidBox, vecTable, seg };
})();
