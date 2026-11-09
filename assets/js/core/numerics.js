/* =====================================================================
 * Núcleo numérico (JavaScript puro, sin dependencias)
 * ---------------------------------------------------------------------
 * Funciona en el navegador (window.NM) y en Node (require) para que las
 * pruebas automáticas de /tests usen exactamente el mismo código.
 *
 * Contenido:
 *   - Álgebra básica: dot, norm2, matVec, transpose, det
 *   - validate: cuadrada, numérica, simétrica y definida positiva (Sylvester)
 *   - Métodos directos con registro de cada paso:
 *       solveCholesky (A = L Lᵀ), solveLU (Doolittle), solveGauss ([A | b])
 *   - Precondicionadores: Jacobi, Cholesky incompleto IC(0) y SSOR
 *   - pcg: Gradientes Conjugados Precondicionado (Suñagua, 2020);
 *          con M = I es el GC simple
 *   - steepest: descenso más pronunciado (solo para contraste geométrico)
 *   - eigSym (rotaciones de Jacobi), condSPD, condPrecond
 *   - errors, run (ejecución completa de un caso)
 * ===================================================================== */
(function (root, factory) {
  const NM = factory();
  if (typeof module === "object" && module.exports) module.exports = NM;
  else root.NM = NM;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ------------------------------------------------------------------
  // Álgebra básica
  // ------------------------------------------------------------------
  const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  const norm2 = (a) => Math.sqrt(dot(a, a));
  const normInf = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const matVec = (A, x) => A.map((row) => dot(row, x));
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const scale = (a, s) => a.map((v) => v * s);
  const clone = (A) => A.map((r) => r.slice());
  const transpose = (A) => A[0].map((_, j) => A.map((r) => r[j]));
  const zeros = (n, m = n) =>
    Array.from({ length: n }, () => new Array(m).fill(0));
  const eye = (n) =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
  const matMul = (A, B) => {
    const n = A.length,
      m = B[0].length,
      p = B.length;
    const C = zeros(n, m);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < p; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        for (let j = 0; j < m; j++) C[i][j] += a * B[k][j];
      }
    return C;
  };
  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  /** Determinante por eliminación gaussiana con pivoteo parcial. */
  function det(M) {
    const A = clone(M),
      n = A.length;
    let d = 1;
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++)
        if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
      if (A[p][k] === 0) return 0;
      if (p !== k) {
        [A[p], A[k]] = [A[k], A[p]];
        d = -d;
      }
      d *= A[k][k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / A[k][k];
        for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      }
    }
    return d;
  }

  /** Menores principales líderes Δ₁ … Δₙ. */
  const leadingMinors = (A) =>
    A.map((_, k) => det(A.slice(0, k + 1).map((r) => r.slice(0, k + 1))));

  // ------------------------------------------------------------------
  // Validación de entrada
  // ------------------------------------------------------------------
  /**
   * Comprueba que A sea cuadrada n×n, numérica, simétrica y definida
   * positiva (criterio de Sylvester), y que b sea numérico de dimensión n.
   * Nunca lanza excepciones: devuelve un informe con mensajes legibles y
   * la lista de celdas con problemas (para marcarlas en la interfaz).
   */
  function validate(A, b) {
    const res = {
      ok: false,
      square: false,
      numeric: false,
      symmetric: false,
      spd: false,
      minors: [],
      asym: 0,
      messages: [],
      badCells: [],
      firstBadMinor: -1,
    };
    const n = Array.isArray(A) ? A.length : 0;
    if (
      n < 1 ||
      A.some((r) => !Array.isArray(r) || r.length !== n)
    ) {
      res.messages.push("La matriz A no es cuadrada.");
      return res;
    }
    res.square = true;
    const bad = [];
    A.forEach((r, i) =>
      r.forEach((v, j) => {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          bad.push(`a${i + 1}${j + 1}`);
          res.badCells.push(`A:${i},${j}`);
        }
      }),
    );
    if (!Array.isArray(b) || b.length !== n) bad.push("b (dimensión)");
    else
      b.forEach((v, i) => {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          bad.push(`b${i + 1}`);
          res.badCells.push(`b:${i}`);
        }
      });
    if (bad.length) {
      res.messages.push(`Valores no numéricos o vacíos en: ${bad.join(", ")}.`);
      return res;
    }
    res.numeric = true;
    let sc = 0;
    A.forEach((r) => r.forEach((v) => (sc = Math.max(sc, Math.abs(v)))));
    const pairs = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const d = Math.abs(A[i][j] - A[j][i]);
        res.asym = Math.max(res.asym, d);
        if (d > 1e-12 * Math.max(1, sc)) {
          pairs.push(`a${i + 1}${j + 1} = ${A[i][j]} ≠ a${j + 1}${i + 1} = ${A[j][i]}`);
          res.badCells.push(`A:${i},${j}`, `A:${j},${i}`);
        }
      }
    res.symmetric = pairs.length === 0;
    if (!res.symmetric)
      res.messages.push(
        `A no es simétrica (A ≠ Aᵀ): ${pairs.slice(0, 3).join("; ")}${pairs.length > 3 ? "…" : ""}.`,
      );
    res.minors = leadingMinors(A);
    const neg = res.minors.findIndex((m) => !(m > 0));
    res.firstBadMinor = neg;
    res.spd = res.symmetric && neg === -1;
    if (neg !== -1)
      res.messages.push(
        `${res.symmetric ? "" : "Además, "}A no es definida positiva: el menor principal Δ${neg + 1} = ${res.minors[neg].toPrecision(6)} no es positivo (criterio de Sylvester).`,
      );
    res.ok = res.square && res.numeric && res.symmetric && res.spd;
    return res;
  }

  // ------------------------------------------------------------------
  // Sustituciones con registro de pasos
  // ------------------------------------------------------------------
  /** L y = b con L triangular inferior (sustitución progresiva). */
  function forwardSteps(L, b) {
    const n = b.length,
      y = new Array(n),
      steps = [];
    for (let i = 0; i < n; i++) {
      let s = b[i];
      const terms = [];
      for (let k = 0; k < i; k++) {
        s -= L[i][k] * y[k];
        terms.push({ coef: L[i][k], val: y[k], k });
      }
      y[i] = s / L[i][i];
      steps.push({ i, rhs: b[i], terms, diag: L[i][i], val: y[i] });
    }
    return { y, steps };
  }
  /** U x = y con U triangular superior (sustitución regresiva). */
  function backwardSteps(U, y) {
    const n = y.length,
      x = new Array(n),
      steps = [];
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      const terms = [];
      for (let k = i + 1; k < n; k++) {
        s -= U[i][k] * x[k];
        terms.push({ coef: U[i][k], val: x[k], k });
      }
      x[i] = s / U[i][i];
      steps.push({ i, rhs: y[i], terms, diag: U[i][i], val: x[i] });
    }
    return { x, steps };
  }
  const forward = (L, b) => forwardSteps(L, b).y;
  const backwardT = (L, y) => backwardSteps(transpose(L), y).x;

  // ------------------------------------------------------------------
  // Método directo 1: Cholesky A = L Lᵀ
  // ------------------------------------------------------------------
  function cholesky(A, record = false) {
    const n = A.length,
      L = zeros(n),
      steps = [];
    for (let j = 0; j < n; j++) {
      let s = A[j][j];
      const terms = [];
      for (let k = 0; k < j; k++) {
        s -= L[j][k] * L[j][k];
        terms.push(L[j][k]);
      }
      if (!(s > 0)) throw new Error(`Cholesky: pivote no positivo en la columna ${j + 1}`);
      L[j][j] = Math.sqrt(s);
      if (record)
        steps.push({ type: "diag", i: j, j, a: A[j][j], terms, inner: s, val: L[j][j] });
      for (let i = j + 1; i < n; i++) {
        let t = A[i][j];
        const tt = [];
        for (let k = 0; k < j; k++) {
          t -= L[i][k] * L[j][k];
          tt.push([L[i][k], L[j][k]]);
        }
        L[i][j] = t / L[j][j];
        if (record)
          steps.push({ type: "off", i, j, a: A[i][j], terms: tt, inner: t, div: L[j][j], val: L[i][j] });
      }
    }
    return record ? { L, steps } : L;
  }
  function solveCholesky(A, b) {
    const t0 = now();
    const { L, steps } = cholesky(A, true);
    const f = forwardSteps(L, b);
    const bk = backwardSteps(transpose(L), f.y);
    const LLt = matMul(L, transpose(L));
    return {
      method: "Cholesky",
      x: bk.x,
      L,
      y: f.y,
      factorSteps: steps,
      fwd: f.steps,
      bwd: bk.steps,
      recon: LLt,
      reconErr: maxAbsDiff(LLt, A),
      flops: Math.round(n3(A.length) / 3),
      ms: now() - t0,
    };
  }
  const n3 = (n) => n * n * n;
  function maxAbsDiff(X, Y) {
    let m = 0;
    for (let i = 0; i < X.length; i++)
      for (let j = 0; j < X[0].length; j++) m = Math.max(m, Math.abs(X[i][j] - Y[i][j]));
    return m;
  }

  // ------------------------------------------------------------------
  // Método directo 2: LU de Doolittle A = L U (diag(L) = 1)
  // ------------------------------------------------------------------
  function solveLU(A, b) {
    const t0 = now();
    const n = A.length,
      L = eye(n),
      U = zeros(n),
      steps = [];
    for (let k = 0; k < n; k++) {
      for (let j = k; j < n; j++) {
        let s = A[k][j];
        const terms = [];
        for (let m = 0; m < k; m++) {
          s -= L[k][m] * U[m][j];
          terms.push([L[k][m], U[m][j]]);
        }
        U[k][j] = s;
        steps.push({ type: "u", i: k, j, a: A[k][j], terms, val: s });
      }
      if (U[k][k] === 0) throw new Error("LU: pivote nulo");
      for (let i = k + 1; i < n; i++) {
        let s = A[i][k];
        const terms = [];
        for (let m = 0; m < k; m++) {
          s -= L[i][m] * U[m][k];
          terms.push([L[i][m], U[m][k]]);
        }
        L[i][k] = s / U[k][k];
        steps.push({ type: "l", i, j: k, a: A[i][k], terms, inner: s, div: U[k][k], val: L[i][k] });
      }
    }
    const f = forwardSteps(L, b),
      bk = backwardSteps(U, f.y);
    const LU = matMul(L, U);
    return {
      method: "LU (Doolittle)",
      x: bk.x,
      L,
      U,
      y: f.y,
      factorSteps: steps,
      fwd: f.steps,
      bwd: bk.steps,
      recon: LU,
      reconErr: maxAbsDiff(LU, A),
      flops: Math.round((2 * n3(n)) / 3),
      ms: now() - t0,
    };
  }

  // ------------------------------------------------------------------
  // Método directo 3: eliminación de Gauss sobre [A | b]
  // ------------------------------------------------------------------
  function solveGauss(A, b) {
    const t0 = now();
    const n = A.length;
    const M = A.map((r, i) => r.concat([b[i]]));
    const snaps = [{ k: -1, M: clone(M) }],
      ops = [];
    for (let k = 0; k < n - 1; k++) {
      if (M[k][k] === 0) throw new Error("Gauss: pivote nulo");
      const opsK = [];
      for (let i = k + 1; i < n; i++) {
        const m = M[i][k] / M[k][k];
        opsK.push({ i, k, num: M[i][k], piv: M[k][k], m, rowBefore: M[i].slice() });
        if (m !== 0) for (let j = k; j <= n; j++) M[i][j] -= m * M[k][j];
        M[i][k] = 0;
        opsK[opsK.length - 1].rowAfter = M[i].slice();
      }
      ops.push(opsK);
      snaps.push({ k, M: clone(M) });
    }
    const U = M.map((r) => r.slice(0, n)),
      c = M.map((r) => r[n]);
    const bk = backwardSteps(U, c);
    return {
      method: "Eliminación de Gauss",
      x: bk.x,
      U,
      c,
      snaps,
      ops,
      bwd: bk.steps,
      pivots: U.map((r, i) => r[i]),
      flops: Math.round((2 * n3(n)) / 3),
      ms: now() - t0,
    };
  }

  /** Inversa de A (SPD) resolviendo A x = eⱼ con Cholesky. */
  function inverse(A) {
    const n = A.length,
      L = cholesky(A),
      inv = zeros(n);
    for (let j = 0; j < n; j++) {
      const e = new Array(n).fill(0);
      e[j] = 1;
      const col = backwardT(L, forward(L, e));
      for (let i = 0; i < n; i++) inv[i][j] = col[i];
    }
    return inv;
  }

  // ------------------------------------------------------------------
  // Precondicionadores
  // ------------------------------------------------------------------
  /**
   * Cholesky incompleto IC(0): misma factorización que Cholesky pero
   * solo se guardan los lᵢⱼ donde aᵢⱼ ≠ 0 (se descarta el relleno).
   * Si aparece un pivote no positivo se desplaza la diagonal
   * (A + σ·diag(A)) y se reintenta.
   */
  function ic0(A) {
    const n = A.length,
      L = zeros(n);
    const diag = A.map((r, i) => r[i]);
    let shift = 0,
      dropped = [],
      steps = [];
    for (let tries = 0; tries < 40; tries++) {
      let ok = true;
      dropped = [];
      steps = [];
      for (let i = 0; i < n; i++) L[i].fill(0);
      for (let j = 0; j < n && ok; j++) {
        let s = A[j][j] + shift * diag[j];
        for (let k = 0; k < j; k++) s -= L[j][k] * L[j][k];
        if (!(s > 0)) {
          ok = false;
          break;
        }
        L[j][j] = Math.sqrt(s);
        steps.push({ type: "diag", i: j, j, inner: s, val: L[j][j] });
        for (let i = j + 1; i < n; i++) {
          let t = A[i][j];
          for (let k = 0; k < j; k++) t -= L[i][k] * L[j][k];
          if (A[i][j] === 0) {
            if (Math.abs(t) > 1e-300) dropped.push({ i, j, val: t / L[j][j] });
            continue;
          }
          L[i][j] = t / L[j][j];
          steps.push({ type: "off", i, j, inner: t, div: L[j][j], val: L[i][j] });
        }
      }
      if (ok) return { L, shift, dropped, steps };
      shift = shift === 0 ? 1e-3 : shift * 2;
    }
    throw new Error("IC(0) no pudo construirse");
  }

  /**
   * SSOR: M = (D + ωE) D⁻¹ (D + ωE)ᵀ / (ω(2 − ω)), con A = E + D + Eᵀ.
   * Se factoriza como M = Lₛ Lₛᵀ con Lₛ = (D + ωE) D^{-1/2} / √(ω(2−ω)).
   */
  function ssorFactor(A, omega) {
    const n = A.length,
      Ls = zeros(n);
    const c = 1 / Math.sqrt(omega * (2 - omega));
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) {
        const v = i === j ? A[i][i] : omega * A[i][j];
        Ls[i][j] = (v / Math.sqrt(A[j][j])) * c;
      }
    return Ls;
  }

  const PRECOND_LABEL = {
    none: "Ninguno (M = I)",
    jacobi: "Jacobi (diagonal)",
    ic0: "Cholesky incompleto IC(0)",
    ssor: "SSOR",
  };

  /** Construye M con su factor L (M = L Lᵀ) y la operación z = M⁻¹ r. */
  function makePreconditioner(A, type, opts = {}) {
    const n = A.length;
    const fromL = (L, extra) => {
      const M = matMul(L, transpose(L));
      return Object.assign(
        {
          type,
          label: PRECOND_LABEL[type],
          apply: (r) => backwardT(L, forward(L, r)),
          L,
          M,
          shift: 0,
          dropped: [],
        },
        extra,
      );
    };
    if (type === "jacobi") {
      const d = A.map((r, i) => r[i]);
      const L = zeros(n);
      d.forEach((v, i) => (L[i][i] = Math.sqrt(v)));
      if (d.some((v) => !(v > 0))) throw new Error("Jacobi: diagonal no positiva");
      return Object.assign(fromL(L), { apply: (r) => r.map((v, i) => v / d[i]), d });
    }
    if (type === "ic0") {
      const { L, shift, dropped, steps } = ic0(A);
      return fromL(L, { shift, dropped, steps });
    }
    if (type === "ssor") {
      const omega = opts.omega ?? 1;
      if (!(omega > 0 && omega < 2)) throw new Error("SSOR: ω debe estar en (0, 2)");
      return fromL(ssorFactor(A, omega), { omega, label: `SSOR (ω = ${omega})` });
    }
    return {
      type: "none",
      label: PRECOND_LABEL.none,
      apply: (r) => r.slice(),
      L: eye(n),
      M: eye(n),
      shift: 0,
      dropped: [],
    };
  }

  // ------------------------------------------------------------------
  // Gradientes Conjugados Precondicionado (Suñagua, 2020)
  // ------------------------------------------------------------------
  /**
   *  r₀ = b − A x₀ ; resolver M z₀ = r₀ ; p₀ = z₀
   *  para k = 0, 1, …
   *     αₖ   = (rₖᵀ zₖ) / (pₖᵀ A pₖ)
   *     xₖ₊₁ = xₖ + αₖ pₖ ;  rₖ₊₁ = rₖ − αₖ A pₖ
   *     si ‖rₖ₊₁‖₂ / ‖b‖₂ < tol : parar
   *     resolver M zₖ₊₁ = rₖ₊₁
   *     βₖ   = (rₖ₊₁ᵀ zₖ₊₁) / (rₖᵀ zₖ) ;  pₖ₊₁ = zₖ₊₁ + βₖ pₖ
   *  Con M = I se obtiene el GC simple.
   *  `xstar` (opcional) permite registrar el error ‖xₖ − x*‖ en cada paso.
   */
  function pcg(A, b, x0, M, tol = 1e-6, maxIt = 100, xstar = null) {
    const t0 = now();
    let x = x0.slice();
    const Ax0 = matVec(A, x);
    let r = sub(b, Ax0);
    const nb = norm2(b) || 1;
    let z = M.apply(r),
      p = z.slice(),
      rz = dot(r, z);
    const errOf = (v) => {
      if (!xstar) return null;
      const e = sub(v, xstar);
      return { e2: norm2(e), eA: Math.sqrt(Math.max(0, dot(e, matVec(A, e)))) };
    };
    const init = { x: x.slice(), Ax0, r: r.slice(), z: z.slice(), p: p.slice(), rz, nr: norm2(r), rel: norm2(r) / nb, nb };
    const hist = [norm2(r) / nb];
    const errHist = [errOf(x)];
    const path = [x.slice()];
    const log = [];
    let k = 0,
      converged = hist[0] < tol,
      breakdown = null;
    while (!converged && k < maxIt) {
      const Ap = matVec(A, p),
        pAp = dot(p, Ap);
      if (!(pAp > 0)) {
        breakdown = "pᵀAp ≤ 0 (la matriz no es definida positiva o el residuo ya es nulo)";
        break;
      }
      const alpha = rz / pAp;
      const e = { k: k + 1, xPrev: x.slice(), rPrev: r.slice(), zPrev: z.slice(), p: p.slice(), Ap, rz, pAp, alpha };
      x = x.map((v, i) => v + alpha * p[i]);
      r = r.map((v, i) => v - alpha * Ap[i]);
      k++;
      const nr = norm2(r),
        rel = nr / nb;
      hist.push(rel);
      errHist.push(errOf(x));
      path.push(x.slice());
      Object.assign(e, { x: x.slice(), r: r.slice(), nr, rel, beta: null, energy: 0.5 * dot(x, matVec(A, x)) - dot(b, x) });
      if (rel < tol) {
        converged = true;
        log.push(e);
        break;
      }
      z = M.apply(r);
      const rzNew = dot(r, z);
      const beta = rzNew / rz;
      p = z.map((v, i) => v + beta * p[i]);
      Object.assign(e, { z: z.slice(), rzNew, beta, pNext: p.slice() });
      rz = rzNew;
      log.push(e);
    }
    const trueR = sub(b, matVec(A, x));
    return {
      x,
      iters: k,
      converged,
      hist,
      errHist,
      path,
      log,
      init,
      trueR,
      trueRes: norm2(trueR) / nb,
      finalRecRes: hist[hist.length - 1],
      nb,
      breakdown,
      ms: now() - t0,
    };
  }

  /** Descenso más pronunciado (gradiente simple), solo como contraste. */
  function steepest(A, b, x0, tol = 1e-6, maxIt = 500) {
    let x = x0.slice();
    let r = sub(b, matVec(A, x));
    const nb = norm2(b) || 1;
    const path = [x.slice()],
      hist = [norm2(r) / nb];
    let k = 0;
    while (hist[hist.length - 1] >= tol && k < maxIt) {
      const Ar = matVec(A, r),
        rAr = dot(r, Ar);
      if (!(rAr > 0)) break;
      const a = dot(r, r) / rAr;
      x = x.map((v, i) => v + a * r[i]);
      r = r.map((v, i) => v - a * Ar[i]);
      k++;
      path.push(x.slice());
      hist.push(norm2(r) / nb);
    }
    return { x, iters: k, path, hist, converged: hist[hist.length - 1] < tol };
  }

  // ------------------------------------------------------------------
  // Autovalores y números de condición
  // ------------------------------------------------------------------
  /** Autovalores (y autovectores) de una matriz simétrica: rotaciones de Jacobi. */
  function eigSym(S, withVectors = false) {
    const A = clone(S),
      n = A.length,
      V = eye(n);
    let sweeps = 0;
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0,
        tr = 0;
      for (let i = 0; i < n; i++) {
        tr += A[i][i] * A[i][i];
        for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      }
      if (off <= 1e-30 * Math.max(tr, 1e-300)) break;
      sweeps++;
      for (let p = 0; p < n; p++)
        for (let q = p + 1; q < n; q++) {
          if (A[p][q] === 0) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1),
            s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p],
              akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k],
              aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          if (withVectors)
            for (let k = 0; k < n; k++) {
              const vkp = V[k][p],
                vkq = V[k][q];
              V[k][p] = c * vkp - s * vkq;
              V[k][q] = s * vkp + c * vkq;
            }
        }
    }
    const idx = A.map((_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
    const values = idx.map((i) => A[i][i]);
    values.sweeps = sweeps;
    if (!withVectors) return values;
    return { values, vectors: idx.map((i) => V.map((r) => r[i])), sweeps };
  }
  /** κ₂(A) = λmáx / λmín para A simétrica definida positiva. */
  function condSPD(A) {
    const e = eigSym(A);
    return { cond: e[e.length - 1] / e[0], eig: e, sweeps: e.sweeps };
  }
  /** κ₂(M⁻¹A) = κ₂(L⁻¹ A L⁻ᵀ) con M = L Lᵀ (matriz semejante y simétrica). */
  function precondMatrix(A, L) {
    const n = A.length;
    const W = zeros(n);
    for (let j = 0; j < n; j++) {
      const col = forward(L, A.map((r) => r[j]));
      for (let i = 0; i < n; i++) W[i][j] = col[i];
    }
    const S = zeros(n);
    for (let i = 0; i < n; i++) {
      const row = forward(L, W[i]);
      for (let j = 0; j < n; j++) S[i][j] = row[j];
    }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) S[i][j] = S[j][i] = (S[i][j] + S[j][i]) / 2;
    return S;
  }
  function condPrecond(A, L) {
    const S = precondMatrix(A, L);
    const c = condSPD(S);
    c.S = S;
    return c;
  }

  // ------------------------------------------------------------------
  // Errores
  // ------------------------------------------------------------------
  function errors(xref, xap) {
    return xref.map((xr, i) => {
      const ea = Math.abs(xr - xap[i]);
      const er = xr === 0 ? null : ea / Math.abs(xr);
      return { ea, er, ep: er === null ? null : er * 100 };
    });
  }

  // ------------------------------------------------------------------
  // Ejecución completa de un caso
  // ------------------------------------------------------------------
  function run(A, b, opts = {}) {
    const n = b.length;
    const { x0 = new Array(n).fill(0), tol = 1e-6, maxIt = 100, precond = "jacobi", omega = 1 } = opts;
    const t0 = now();
    const v = validate(A, b);
    if (!v.ok) return { valid: false, validation: v };
    const chol = solveCholesky(A, b);
    const lu = solveLU(A, b);
    const gauss = solveGauss(A, b);
    const xref = chol.x;
    const M = makePreconditioner(A, precond, { omega });
    const I = makePreconditioner(A, "none");
    const gcp = pcg(A, b, x0, M, tol, maxIt, xref);
    const gc = pcg(A, b, x0, I, tol, maxIt, xref);
    // Los otros precondicionadores, para la comparativa
    const others = {};
    for (const t of ["jacobi", "ic0", "ssor"]) {
      const Mt = t === precond ? M : makePreconditioner(A, t, { omega });
      others[t] = {
        M: Mt,
        run: t === precond ? gcp : pcg(A, b, x0, Mt, tol, maxIt, xref),
        k: condPrecond(A, Mt.L),
      };
    }
    const kA = condSPD(A);
    const kM = others[precond] ? others[precond].k : condPrecond(A, M.L);
    const nb = norm2(b) || 1;
    const res = (x) => norm2(sub(b, matVec(A, x))) / nb;
    return {
      valid: true,
      validation: v,
      n,
      A,
      b,
      opts: { x0, tol, maxIt, precond, omega },
      chol,
      lu,
      gauss,
      ref: chol,
      xref,
      M,
      gcp,
      gc,
      others,
      kA,
      kM,
      errGCP: errors(xref, gcp.x),
      errGC: errors(xref, gc.x),
      res: { chol: res(chol.x), lu: res(lu.x), gauss: res(gauss.x), gcp: gcp.trueRes, gc: gc.trueRes },
      ms: now() - t0,
    };
  }

  return {
    dot, norm2, normInf, matVec, matMul, sub, add, scale, clone, transpose, zeros, eye,
    det, leadingMinors, validate,
    forwardSteps, backwardSteps, forward, backwardT,
    cholesky, solveCholesky, solveLU, solveGauss, inverse,
    ic0, ssorFactor, makePreconditioner, PRECOND_LABEL,
    pcg, steepest,
    eigSym, condSPD, precondMatrix, condPrecond,
    errors, run, maxAbsDiff,
  };
});
