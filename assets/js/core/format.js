/* =====================================================================
 * Formato de números para texto y para fórmulas TeX (KaTeX).
 * ===================================================================== */
(function (root, factory) {
  const F = factory();
  if (typeof module === "object" && module.exports) module.exports = F;
  else root.FMT = F;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  const SUP = { "-": "⁻", "+": "", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sub = (i) => String(i).split("").map((c) => SUBS[c]).join("");
  const ok = (v) => v !== null && v !== undefined && Number.isFinite(v);

  /** Agrupa miles con espacio fino. */
  const group = (s) => {
    const [i, d] = s.split(".");
    const neg = i.startsWith("-");
    const g = (neg ? i.slice(1) : i).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg ? "−" : "") + g + (d !== undefined ? "." + d : "");
  };
  /** Decimales fijos. */
  const fix = (v, d = 4) => (ok(v) ? group(Number(v).toFixed(d)) : "—");
  /** Notación científica legible: 1.23×10⁻⁶. */
  const sci = (v, d = 2) => {
    if (!ok(v)) return "—";
    if (v === 0) return "0";
    const [m, e] = Number(v).toExponential(d).split("e");
    const ee = Number(e);
    if (ee === 0) return m.replace("-", "−");
    return `${m.replace("-", "−")}×10${String(ee).split("").map((c) => SUP[c] ?? c).join("")}`;
  };
  /** Elige fijo o científico según la magnitud. */
  const smart = (v, d = 4) => {
    if (!ok(v)) return "—";
    if (v === 0) return "0";
    const a = Math.abs(v);
    return a >= 1e-3 && a < 1e7 ? fix(v, d) : sci(v, Math.min(d, 3));
  };
  /** Hasta 6 decimales sin ceros sobrantes (para mostrar coeficientes). */
  const nf = (v, maxd = 6) => {
    if (!ok(v)) return "—";
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e-4 && a < 1e9) {
      let s = v.toFixed(a >= 1000 ? Math.min(4, maxd) : maxd);
      if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
      return group(s);
    }
    return sci(v, 4);
  };
  const p15 = (v) => (ok(v) ? (v === 0 ? "0" : Number(v).toPrecision(15)).replace("-", "−") : "—");
  const pct = (v, d = 1) => (ok(v) ? `${(v * 100).toFixed(d)} %` : "—");

  // ---------- TeX ----------
  /** Número en TeX: 1\,462.5 / 3.87\times10^{-19}. */
  const tn = (v, maxd = 6) => {
    if (!ok(v)) return "\\text{—}";
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e-4 && a < 1e9) {
      let s = v.toFixed(a >= 1000 ? Math.min(4, maxd) : maxd);
      if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
      const [i, d] = s.split(".");
      const neg = i.startsWith("-");
      const g = (neg ? i.slice(1) : i).replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
      return (neg ? "-" : "") + g + (d !== undefined ? "." + d : "");
    }
    const [m, e] = v.toExponential(3).split("e");
    return `${m.replace(/\.?0+$/, "")}\\times10^{${Number(e)}}`;
  };
  /** Número entre paréntesis si es negativo (para sustituciones). */
  const tp = (v, d) => (v < 0 ? `(${tn(v, d)})` : tn(v, d));
  /** Notación científica en TeX con d decimales. */
  const ts = (v, d = 3) => {
    if (!ok(v)) return "\\text{—}";
    if (v === 0) return "0";
    const [m, e] = v.toExponential(d).split("e");
    return Number(e) === 0 ? m : `${m}\\times10^{${Number(e)}}`;
  };
  /** Matriz TeX (bmatrix). opts.hl: Set de "i,j" a resaltar; opts.aug: barra antes de la última columna. */
  const tmat = (M, opts = {}) => {
    const f = opts.f || ((v) => tn(v, opts.d ?? 4));
    const cols = M[0].length;
    const spec = opts.aug ? `{${"c".repeat(cols - 1)}|c}` : "";
    const rows = M.map((r, i) =>
      r
        .map((v, j) => {
          let s = f(v);
          if (opts.hl && opts.hl.has(`${i},${j}`)) s = `\\colorbox{${opts.hlColor || "#fde68a"}}{$${s}$}`;
          else if (opts.dim && opts.dim(i, j, v)) s = `\\color{#94a3b8}{${s}}`;
          return s;
        })
        .join(" & "),
    ).join(" \\\\ ");
    return opts.aug ? `\\left[\\begin{array}${spec}${rows}\\end{array}\\right]` : `\\begin{bmatrix}${rows}\\end{bmatrix}`;
  };
  const tvec = (v, opts = {}) => tmat(v.map((x) => [x]), opts);
  const tvecRow = (v, d = 4) => `(${v.map((x) => tn(x, d)).join(",\\ ")})`;

  return { sub, group, fix, sci, smart, nf, p15, pct, tn, tp, ts, tmat, tvec, tvecRow, ok };
});
