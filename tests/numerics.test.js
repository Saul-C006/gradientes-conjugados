/* Pruebas unitarias del núcleo numérico (node --test, sin dependencias).
 * Los valores de referencia se verificaron de forma independiente con NumPy
 * (numpy.linalg.solve, numpy.linalg.eigvalsh y numpy.linalg.cholesky). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const NM = require("../assets/js/core/numerics.js");
const CASE = require("../assets/js/core/scenarios.js");

const { SCENARIOS } = CASE;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);
const vclose = (a, b, tol, msg) => a.forEach((v, i) => close(v, b[i], tol, `${msg}[${i}]`));

// Valores de referencia calculados con NumPy
const NUMPY = {
  ideal: { x: [800, 650, 500, 400], kappa: 2.002192050670297, minors: [1.5, 2.0375, 2.574, 2.9169] },
  estres: { x: [924.450822797405, 695.0960778445994, 604.8711864698577, 496.79197876965463], kappa: 2.3317506342334697, minors: [1.38, 1.6577, 1.92759, 1.974909] },
  mal: { x: [820, 700, 540, 430], kappa: 97631.62661320687, minors: [400, 15.84, 0.2672, 1.7216], kappaJacobi: 592.6106256896252 },
};

test("los tres escenarios son simétricos y definidos positivos", () => {
  for (const k of CASE.ORDER) {
    const s = SCENARIOS[k];
    const v = NM.validate(s.A, s.b);
    assert.ok(v.ok, `${k}: ${v.messages.join(" ")}`);
    vclose(v.minors, NUMPY[k].minors, 1e-9, `${k} menores`);
  }
});

test("b = A·plan en los escenarios construidos a partir de un plan", () => {
  for (const k of ["ideal", "mal"]) {
    const s = SCENARIOS[k];
    vclose(NM.matVec(s.A, s.plan), s.b, 1e-12, `${k} b`);
  }
  // Escenario 3: A = D S D
  const m = SCENARIOS.mal;
  m.A.forEach((r, i) => r.forEach((v, j) => close(v, m.D[i] * m.S[i][j] * m.D[j], 1e-12, `DSD[${i}][${j}]`)));
});

test("Cholesky, LU y Gauss coinciden con NumPy", () => {
  for (const k of CASE.ORDER) {
    const s = SCENARIOS[k];
    const tol = k === "mal" ? 1e-9 : 1e-12;
    vclose(NM.solveCholesky(s.A, s.b).x, NUMPY[k].x, tol, `${k} Cholesky`);
    vclose(NM.solveLU(s.A, s.b).x, NUMPY[k].x, tol, `${k} LU`);
    vclose(NM.solveGauss(s.A, s.b).x, NUMPY[k].x, tol, `${k} Gauss`);
  }
});

test("L Lᵀ = A y L U = A", () => {
  for (const k of CASE.ORDER) {
    const s = SCENARIOS[k];
    assert.ok(NM.solveCholesky(s.A, s.b).reconErr < 1e-12);
    assert.ok(NM.solveLU(s.A, s.b).reconErr < 1e-12);
  }
});

test("κ(A) por autovalores coincide con NumPy", () => {
  for (const k of CASE.ORDER) close(NM.condSPD(SCENARIOS[k].A).cond, NUMPY[k].kappa, 1e-9, `${k} κ`);
  const m = SCENARIOS.mal;
  const J = NM.makePreconditioner(m.A, "jacobi");
  close(NM.condPrecond(m.A, J.L).cond, NUMPY.mal.kappaJacobi, 1e-9, "κ Jacobi");
});

test("GCP converge con tol 1e-6 y reproduce la referencia", () => {
  for (const k of CASE.ORDER) {
    const s = SCENARIOS[k];
    for (const pc of ["none", "jacobi", "ic0", "ssor"]) {
      const M = NM.makePreconditioner(s.A, pc);
      const r = NM.pcg(s.A, s.b, [0, 0, 0, 0], M, 1e-6, 100);
      assert.ok(r.converged, `${k}/${pc} no convergió`);
      assert.ok(r.trueRes < 1e-6, `${k}/${pc} residuo ${r.trueRes}`);
      vclose(r.x, NUMPY[k].x, 1e-6, `${k}/${pc}`);
    }
  }
});

test("iteraciones esperadas: GCP ≤ GC en el escenario mal condicionado", () => {
  const m = SCENARIOS.mal;
  const it = (pc) => NM.pcg(m.A, m.b, [0, 0, 0, 0], NM.makePreconditioner(m.A, pc), 1e-6, 100).iters;
  assert.equal(it("none"), 5);
  assert.equal(it("jacobi"), 4);
  assert.equal(it("ic0"), 3);
  for (const pc of ["jacobi", "ic0", "ssor"]) assert.ok(it(pc) <= it("none"), pc);
});

test("IC(0) conserva el patrón de ceros y descarta el relleno", () => {
  const m = SCENARIOS.mal;
  const { L, dropped } = NM.ic0(m.A);
  for (let i = 0; i < 4; i++) for (let j = 0; j < i; j++) if (m.A[i][j] === 0) assert.equal(L[i][j], 0);
  assert.ok(dropped.some((d) => d.i === 3 && d.j === 2), "debe descartar l₄₃");
});

test("validate detecta matriz no simétrica, no SPD y valores no numéricos sin lanzar", () => {
  const A = SCENARIOS.ideal.A.map((r) => r.slice());
  const b = SCENARIOS.ideal.b;
  const A1 = A.map((r) => r.slice());
  A1[0][2] = 0.55;
  let v = NM.validate(A1, b);
  assert.ok(!v.ok && !v.symmetric);
  const A2 = A.map((r) => r.slice());
  A2[2][3] = A2[3][2] = 2.58;
  v = NM.validate(A2, b);
  assert.ok(!v.ok && v.symmetric && !v.spd);
  const A3 = A.map((r) => r.slice());
  A3[3][3] = NaN;
  v = NM.validate(A3, b);
  assert.ok(!v.ok && !v.numeric && v.badCells.includes("A:3,3"));
  assert.ok(!NM.validate([[1, 2]], [1]).ok);
});

test("propiedades del GC: residuos ortogonales y direcciones A-conjugadas", () => {
  const s = SCENARIOS.ideal;
  const r = NM.pcg(s.A, s.b, [0, 0, 0, 0], NM.makePreconditioner(s.A, "none"), 1e-14, 10);
  const R = [r.init.r, ...r.log.slice(0, -1).map((e) => e.r)];
  const P = r.log.map((e) => e.p);
  for (let i = 0; i < R.length; i++)
    for (let j = 0; j < i; j++) {
      const c = Math.abs(NM.dot(R[i], R[j])) / (NM.norm2(R[i]) * NM.norm2(R[j]));
      assert.ok(c < 1e-10, `r${i}·r${j} = ${c}`);
      const q = Math.abs(NM.dot(P[i], NM.matVec(s.A, P[j]))) / Math.sqrt(NM.dot(P[i], NM.matVec(s.A, P[i])) * NM.dot(P[j], NM.matVec(s.A, P[j])));
      assert.ok(q < 1e-10, `p${i}ᵀAp${j} = ${q}`);
    }
});

test("errores: relativo no definido si x_ref = 0", () => {
  const e = NM.errors([0, 2], [1e-9, 2.002]);
  assert.equal(e[0].er, null);
  assert.equal(e[0].ep, null);
  close(e[1].er, 1e-3, 1e-9, "Er");
  close(e[1].ep, 0.1, 1e-9, "Ep");
});

test("run() integra todo y funciona para n = 6", () => {
  const n = 6;
  const A = NM.zeros(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] = i === j ? 4 : 1 / (1 + Math.abs(i - j));
  const x = Array.from({ length: n }, (_, i) => 100 * (i + 1));
  const b = NM.matVec(A, x);
  const r = NM.run(A, b, { precond: "ic0" });
  assert.ok(r.valid);
  vclose(r.xref, x, 1e-12, "xref");
  vclose(r.gcp.x, x, 1e-6, "gcp");
  assert.ok(r.gcp.iters <= r.gc.iters);
});
