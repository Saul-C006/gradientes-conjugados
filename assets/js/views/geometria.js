/* Vista complementaria · Geometría del método en 3D */
(function () {
  "use strict";
  const { card, T, TD, invalidBox, note, plot, seg, esc } = window.UI;
  const F = window.FMT;
  const { unit } = window.CASE;
  let pair = [0, 1];
  let axes3 = [0, 1, 2];

  /** Subproblema 2×2 en (xᵢ, xⱼ) con las demás variables fijas en x*. */
  function reduced(res, i, j) {
    const A = res.A,
      xs = res.xref,
      n = res.n;
    const idx = [i, j];
    const As = idx.map((p) => idx.map((q) => A[p][q]));
    const bs = idx.map((p) => {
      let s = res.b[p];
      for (let k = 0; k < n; k++) if (k !== i && k !== j) s -= A[p][k] * xs[k];
      return s;
    });
    const x0 = idx.map((p) => res.opts.x0[p]);
    return { As, bs, x0, xs: [xs[i], xs[j]] };
  }

  const energy = (As, xs) => (x) => {
    const e = [x[0] - xs[0], x[1] - xs[1]];
    return 0.5 * (e[0] * (As[0][0] * e[0] + As[0][1] * e[1]) + e[1] * (As[1][0] * e[0] + As[1][1] * e[1]));
  };

  function grid(range, f, N = 60) {
    const [x0, x1, y0, y1] = range;
    const xs = Array.from({ length: N }, (_, k) => x0 + ((x1 - x0) * k) / (N - 1));
    const ys = Array.from({ length: N }, (_, k) => y0 + ((y1 - y0) * k) / (N - 1));
    const z = ys.map((y) => xs.map((x) => f([x, y])));
    return { xs, ys, z };
  }
  function rangeFor(points, pad = 0.18) {
    const X = points.map((p) => p[0]),
      Y = points.map((p) => p[1]);
    let [a, b, c, d] = [Math.min(...X), Math.max(...X), Math.min(...Y), Math.max(...Y)];
    const dx = Math.max(b - a, 1e-6),
      dy = Math.max(d - c, 1e-6);
    return [a - pad * dx, b + pad * dx, c - pad * dy, d + pad * dy];
  }

  App.view({
    id: "geometria",
    title: "Geometría 3D",
    nav: "Geometría 3D",
    icon: "◬",
    color: "--c-s7",
    blurb: "Superficie de energía, trayectorias de GC/GCP/descenso y efecto del precondicionador.",
    render({ res }) {
      const head = UI.pageHead({
        group: "Análisis · complemento visual",
        title: "Geometría del método en 3D",
        lead: "Resolver Ax = b con A simétrica definida positiva equivale a encontrar el fondo de un «tazón» cuadrático. El número de condición es la forma del tazón: redondo si κ ≈ 1, un valle estrecho si κ ≫ 1. Aquí se ve por qué el precondicionador acelera la convergencia.",
        tags: ["f(x) = ½ xᵀAx − bᵀx", "curvas de nivel = elipses", "ejes ∝ 1/√λ"],
      });
      if (!res.valid) return head + invalidBox(res);
      const n = res.n;
      const pairs = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push({ value: `${i}-${j}`, label: `x${F.sub(i + 1)}–x${F.sub(j + 1)}` });
      const R = reduced(res, pair[0], pair[1]);
      const ev = NM.eigSym(R.As);
      const D = R.As.map((r, i) => Math.sqrt(r[i]));
      const S = R.As.map((r, i) => r.map((v, j) => v / (D[i] * D[j])));
      const evS = NM.eigSym(S);
      const ax3 = [0, 1, 2, 3].slice(0, Math.min(n, 4));
      return `${head}
      ${card(
        "1 · Superficie de energía en un plano (xᵢ, xⱼ)",
        `<div class="row" style="margin-bottom:10px"><span class="small muted">Plano:</span>${seg("pair", pairs, `${pair[0]}-${pair[1]}`)}</div>
        <p class="small">Se fijan las demás variables en la solución ${T("x^*")} y se dibuja ${T("f(\\mathbf x)-f(\\mathbf x^*) = \\tfrac12(\\mathbf x-\\mathbf x^*)^TA_{2\\times2}(\\mathbf x-\\mathbf x^*)")} para el subsistema 2×2 de ${esc(unit(pair[0]).short)} y ${esc(unit(pair[1]).short)}.
        Sobre ella, las trayectorias del <b style="color:var(--c-gc)">GC</b>, del <b style="color:var(--c-gcp)">GCP-Jacobi</b> y del <b style="color:var(--c-sd)">descenso más pronunciado</b> desde ${T("\\mathbf x_0")}.</p>
        ${plot("g3-surf", 520)}
        <p class="cap">κ del subsistema: ${T(`\\kappa(A_{2\\times2}) = ${F.tn(ev[1] / ev[0], 4)}`)}; con Jacobi ${T(`\\kappa(D^{-1/2}AD^{-1/2}) = ${F.tn(evS[1] / evS[0], 4)}`)}. En 2D el GC llega en 2 pasos; el descenso necesita muchos más si el valle es estrecho. Arrastre para girar.</p>`,
      )}
      <div class="grid g2">
        ${card("2a · Curvas de nivel originales", plot("g3-c1", 380) + `<p class="cap">Variables originales: elipses alargadas (ejes ∝ 1/√λ).</p>`)}
        ${card("2b · Curvas de nivel precondicionadas (Jacobi)", plot("g3-c2", 380) + `<p class="cap">Variables escaladas ${T("\\hat x_i = \\sqrt{a_{ii}}\\,x_i")}. ${
          evS[1] / evS[0] < 0.5 * (ev[1] / ev[0])
            ? `κ baja de ${F.smart(ev[1] / ev[0], 3)} a ${F.smart(evS[1] / evS[0], 3)}: el escalamiento quita el estiramiento de los ejes.`
            : "El escalamiento casi no cambia la forma: las elipses ya estaban bien escaladas."
        } ${Math.abs(S[0][1]) > 0.9 ? `Queda la inclinación por la correlación ρ = ${S[0][1].toFixed(2)}: Jacobi no la corrige; IC(0) sí.` : ""}</p>`)}
      </div>
      ${card(
        "3 · Trayectoria completa en el espacio de presupuestos (proyección 3D)",
        `<div class="row" style="margin-bottom:10px"><span class="small muted">Ejes:</span>${seg(
          "ax3",
          n >= 4
            ? [
                { value: "0-1-2", label: "x₁ x₂ x₃" },
                { value: "0-1-3", label: "x₁ x₂ x₄" },
                { value: "1-2-3", label: "x₂ x₃ x₄" },
                { value: "0-2-3", label: "x₁ x₃ x₄" },
              ]
            : [{ value: "0-1-2", label: "x₁ x₂ x₃" }],
          axes3.join("-"),
        )}</div>
        <p class="small">Iterados ${T("\\mathbf x_k")} del sistema completo de ${n} variables, proyectados en tres de ellas. Cada punto es una iteración; el diamante es ${T("\\mathbf x^*")}.</p>
        ${plot("g3-path", 520)}`,
      )}
      <div class="grid g2">
        ${card("4a · Relieve de la matriz A: log₁₀|aᵢⱼ|", plot("g3-A", 420))}
        ${card("4b · Relieve de la matriz precondicionada L⁻¹AL⁻ᵀ", plot("g3-S", 420))}
      </div>
      ${note(
        `El relieve 4a muestra el problema: valores de muy distinto orden (mal escalamiento) y acoplamientos grandes fuera de la diagonal. Tras precondicionar con ${esc(res.M.label)} (4b) la matriz se parece a la identidad: diagonal ≈ 1 y elementos fuera de la diagonal pequeños, y por eso κ(M⁻¹A) = ${F.smart(res.kM.cond, 4)}.`,
        "idea",
      )}`;
    },
    mount(root, { res }) {
      root.querySelectorAll("[data-pair]").forEach((b) =>
        b.addEventListener("click", () => {
          pair = b.dataset.pair.split("-").map(Number);
          App.render(true);
        }),
      );
      root.querySelectorAll("[data-ax3]").forEach((b) =>
        b.addEventListener("click", () => {
          axes3 = b.dataset.ax3.split("-").map(Number);
          App.render(true);
        }),
      );
      if (!res.valid) return;
      const C = Charts.COLORS;
      const [i, j] = pair;
      const R = reduced(res, i, j);
      const f = energy(R.As, R.xs);
      const I2 = NM.makePreconditioner(R.As, "none");
      const J2 = NM.makePreconditioner(R.As, "jacobi");
      const cg = NM.pcg(R.As, R.bs, R.x0, I2, 1e-12, 50);
      const pcg = NM.pcg(R.As, R.bs, R.x0, J2, 1e-12, 50);
      const sd = NM.steepest(R.As, R.bs, R.x0, 1e-6, 400);
      const rg = rangeFor([R.x0, R.xs, ...cg.path, ...pcg.path, ...sd.path.slice(0, 3)]);
      const G = grid(rg, f);
      const zmax = Math.max(...G.z.flat());
      const line3 = (path, name, color, w = 6) => ({
        type: "scatter3d",
        mode: "lines+markers",
        name,
        x: path.map((p) => p[0]),
        y: path.map((p) => p[1]),
        z: path.map((p) => f(p) + zmax * 0.004),
        line: { color, width: w },
        marker: { size: 4, color },
      });
      const sceneAxis = (t) => ({ title: { text: t }, gridcolor: Charts.css("--grid"), backgroundcolor: "rgba(0,0,0,0)", showbackground: false });
      const sdShown = sd.path.slice(0, 60);
      Charts.draw(
        "g3-surf",
        [
          { type: "surface", x: G.xs, y: G.ys, z: G.z, colorscale: "Viridis", opacity: 0.88, showscale: false, contours: { z: { show: true, usecolormap: true, project: { z: true } } }, hovertemplate: "x=%{x:.2f}<br>y=%{y:.2f}<br>f=%{z:.3g}<extra></extra>" },
          line3(sdShown, `Descenso más pronunciado (${sd.iters} it.)`, C.sd, 4),
          line3(cg.path, `GC (${cg.iters} it.)`, C.gc),
          line3(pcg.path, `GCP Jacobi (${pcg.iters} it.)`, C.gcp),
          { type: "scatter3d", mode: "markers", name: "x*", x: [R.xs[0]], y: [R.xs[1]], z: [0], marker: { size: 7, color: Charts.css("--ink"), symbol: "diamond" } },
        ],
        {
          margin: { l: 0, r: 0, t: 10, b: 0 },
          scene: {
            xaxis: sceneAxis(`x${i + 1} ${unit(i).short}`),
            yaxis: sceneAxis(`x${j + 1} ${unit(j).short}`),
            zaxis: sceneAxis("f(x) − f(x*)"),
            camera: { eye: { x: 1.5, y: -1.5, z: 1.0 } },
            aspectmode: "manual",
            aspectratio: { x: 1, y: 1, z: 0.6 },
          },
          legend: { y: -0.05 },
        },
      );
      // Curvas de nivel
      const contour = (id, G2, paths, xt, yt) =>
        Charts.draw(
          id,
          [
            { type: "contour", x: G2.xs, y: G2.ys, z: G2.z.map((r) => r.map((v) => Math.log10(v + 1e-12 * zmax + 1e-300))), colorscale: "Viridis", showscale: false, contours: { coloring: "lines" }, line: { width: 1.3 }, hoverinfo: "skip", ncontours: 22 },
            ...paths.map((p) => ({ type: "scatter", mode: "lines+markers", name: p.name, x: p.path.map((q) => q[0]), y: p.path.map((q) => q[1]), line: { color: p.color, width: p.w || 2.5 }, marker: { size: 6, color: p.color } })),
          ],
          { xaxis: { title: { text: xt }, scaleanchor: "y", scaleratio: 1 }, yaxis: { title: { text: yt } }, margin: { t: 10 } },
        );
      contour(
        "g3-c1",
        G,
        [
          { name: `Descenso (${sd.iters})`, path: sdShown, color: C.sd, w: 1.5 },
          { name: `GC (${cg.iters})`, path: cg.path, color: C.gc },
        ],
        `x${i + 1}`,
        `x${j + 1}`,
      );
      // Coordenadas escaladas x̂ = D^{1/2} x
      const d = [Math.sqrt(R.As[0][0]), Math.sqrt(R.As[1][1])];
      const sc = (p) => [p[0] * d[0], p[1] * d[1]];
      const fh = (q) => f([q[0] / d[0], q[1] / d[1]]);
      const rg2 = rangeFor([sc(R.x0), sc(R.xs), ...pcg.path.map(sc)]);
      const G2 = grid(rg2, fh);
      const S = R.As.map((r, a) => r.map((v, b) => v / (d[a] * d[b])));
      const sdS = NM.steepest(S, R.bs.map((v, a) => v / d[a]), sc(R.x0), 1e-6, 400);
      contour(
        "g3-c2",
        G2,
        [
          { name: `Descenso escalado (${sdS.iters})`, path: sdS.path.slice(0, 60), color: C.sd, w: 1.5 },
          { name: `GCP Jacobi (${pcg.iters})`, path: pcg.path.map(sc), color: C.gcp },
        ],
        `√a${i + 1}${i + 1}·x${i + 1}`,
        `√a${j + 1}${j + 1}·x${j + 1}`,
      );
      // Trayectoria completa proyectada
      const [a, b, c] = axes3.filter((k) => k < res.n).length === 3 ? axes3 : [0, 1, 2];
      const sdFull = NM.steepest(res.A, res.b, res.opts.x0, res.opts.tol, 300);
      const P = (path, name, color, w = 6) => ({
        type: "scatter3d",
        mode: "lines+markers",
        name,
        x: path.map((p) => p[a]),
        y: path.map((p) => p[b]),
        z: path.map((p) => p[c]),
        line: { color, width: w },
        marker: { size: 4, color },
        hovertemplate: `k=%{pointNumber}<br>x${a + 1}=%{x:.2f}<br>x${b + 1}=%{y:.2f}<br>x${c + 1}=%{z:.2f}<extra>${name}</extra>`,
      });
      Charts.draw(
        "g3-path",
        [
          P(sdFull.path.slice(0, 80), `Descenso más pronunciado (${sdFull.iters}${sdFull.converged ? "" : "+"} it.)`, C.sd, 3),
          P(res.gc.path, `GC (${res.gc.iters} it.)`, C.gc),
          P(res.gcp.path, `GCP ${res.M.label} (${res.gcp.iters} it.)`, Charts.COLORS[res.opts.precond]),
          { type: "scatter3d", mode: "markers", name: "x*", x: [res.xref[a]], y: [res.xref[b]], z: [res.xref[c]], marker: { size: 8, symbol: "diamond", color: Charts.css("--ink") } },
        ],
        {
          margin: { l: 0, r: 0, t: 10, b: 0 },
          scene: {
            xaxis: sceneAxis(`x${a + 1} ${unit(a).short}`),
            yaxis: sceneAxis(`x${b + 1} ${unit(b).short}`),
            zaxis: sceneAxis(`x${c + 1} ${unit(c).short}`),
            camera: { eye: { x: 1.6, y: 1.4, z: 0.9 } },
          },
          legend: { y: -0.05 },
        },
      );
      // Relieve de matrices: barras 3D (mesh3d) con altura log₁₀|aᵢⱼ| sobre un piso común
      const relief = (id, M, title) => {
        const n = M.length;
        const FLOOR = -5;
        const X = [], Y = [], Z = [], I = [], J = [], K = [], V = [];
        const hover = [];
        const w = 0.36;
        M.forEach((row, r) =>
          row.forEach((val, c) => {
            if (val === 0) return;
            const top = Math.max(FLOOR + 0.05, Math.log10(Math.abs(val)));
            const b0 = X.length;
            const cx = c + 1, cy = r + 1;
            for (const [dx, dy, z] of [[-w, -w, FLOOR], [w, -w, FLOOR], [w, w, FLOOR], [-w, w, FLOOR], [-w, -w, top], [w, -w, top], [w, w, top], [-w, w, top]]) {
              X.push(cx + dx); Y.push(cy + dy); Z.push(z); V.push(top);
              hover.push(`${title}[${r + 1},${c + 1}] = ${F.nf(val, 6)}`);
            }
            for (const [a, b, d] of [[0, 1, 2], [0, 2, 3], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]) {
              I.push(b0 + a); J.push(b0 + b); K.push(b0 + d);
            }
          }),
        );
        const lab = M.map((_, k) => k + 1);
        Charts.draw(
          id,
          [{ type: "mesh3d", x: X, y: Y, z: Z, i: I, j: J, k: K, intensity: V, colorscale: "YlGnBu", reversescale: true, cmin: -4, cmax: 3, flatshading: true, showscale: true,
             colorbar: { thickness: 10, title: { text: "log₁₀|·|" } }, text: hover, hovertemplate: "%{text}<extra></extra>", lighting: { ambient: 0.75, diffuse: 0.6 } }],
          {
            margin: { l: 0, r: 0, t: 10, b: 0 },
            scene: {
              xaxis: Object.assign(sceneAxis("columna j"), { tickvals: lab }),
              yaxis: Object.assign(sceneAxis("fila i"), { tickvals: lab, autorange: "reversed" }),
              zaxis: Object.assign(sceneAxis("log₁₀|valor|"), { range: [FLOOR, 3] }),
              camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
            },
          },
        );
      };
      relief("g3-A", res.A, "A");
      relief("g3-S", res.kM.S, "L⁻¹AL⁻ᵀ");
    },
  });
})();
