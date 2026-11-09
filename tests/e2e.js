/* Pruebas de extremo a extremo con un navegador real (Playwright).
 * Levanta un servidor HTTP local con el repositorio (igual que GitHub Pages),
 * recorre todas las secciones en los tres escenarios, edita celdas, introduce
 * una matriz inválida, ejecuta el módulo QA completo y revisa la vista móvil.
 *
 *   npm run test:e2e
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const ROUTES = ["inicio", "caso", "formulacion", "datos", "escenarios", "directos", "cholesky", "lu", "gauss", "gc", "gcp", "comparativa", "errores", "geometria", "qa", "conclusiones"];

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${msg}`);
  if (!cond) failures++;
};

function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(ROOT, p === "/" ? "index.html" : p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("404");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

(async () => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_|net::/.test(m.text())) errors.push(m.text());
  });

  console.log("1. Carga inicial");
  await page.goto(url);
  await page.waitForFunction(() => window.App && document.querySelector(".hero"));
  check(await page.evaluate(() => !!window.katex && !!window.Plotly), "KaTeX y Plotly cargados desde el repositorio");

  console.log("2. Todas las secciones en los tres escenarios");
  for (const s of ["ideal", "estres", "mal"]) {
    await page.click(`#databar [data-load="${s}"]`);
    for (const r of ROUTES) {
      await page.evaluate((r) => (location.hash = `#/${r}`), r);
      await page.waitForTimeout(150);
      const info = await page.evaluate(() => ({
        title: document.querySelector("main h1")?.textContent || "",
        plots: document.querySelectorAll(".plot").length,
        drawn: document.querySelectorAll(".plot.js-plotly-plot").length,
        katexErr: document.querySelectorAll(".katex-error").length,
      }));
      const ok = info.title.length > 0 && info.plots === info.drawn && info.katexErr === 0;
      if (!ok) console.log("    ", s, r, info);
      check(ok, `${s} · ${r} (${info.plots} gráficos)`);
    }
  }

  console.log("3. Edición dinámica y matriz inválida");
  await page.click('#databar [data-load="ideal"]');
  await page.evaluate(() => (location.hash = "#/datos"));
  await page.waitForSelector("#ed-a-3-3");
  await page.fill("#ed-a-3-3", "1.36");
  const x1 = await page.evaluate(() => Store.result.xref[0]);
  check(Math.abs(x1 - 800) > 1e-6 && (await page.evaluate(() => Store.result.valid)), `al editar a₄₄ la solución cambia (x₁ = ${x1.toFixed(4)})`);
  await page.fill("#ed-a-2-3", "2.58");
  check(await page.isVisible("#d-results .alert.bad"), "a₃₄ = 2.58 muestra la alerta de matriz no definida positiva");
  await page.fill("#ed-a-0-0", "abc");
  check(await page.evaluate(() => document.querySelector("#ed-a-0-0").classList.contains("bad")), "celda no numérica marcada en rojo");
  await page.evaluate(() => (location.hash = "#/gcp"));
  await page.waitForTimeout(100);
  check(await page.isVisible("main .alert.bad"), "las demás secciones muestran el aviso sin colapsar");
  await page.click('#databar [data-load="ideal"]');
  check(await page.evaluate(() => Store.result.valid), "al cargar un escenario se recupera");

  console.log("4. Módulo QA (velocidad instantánea)");
  await page.evaluate(() => (location.hash = "#/qa"));
  await page.waitForSelector("#qa-run-all");
  await page.selectOption("#qa-speed", "0");
  await page.click("#qa-run-all");
  await page.waitForFunction(() => window.__qaDone, null, { timeout: 120000 });
  const qa = await page.evaluate(() => window.__qaDone);
  check(qa.passed === qa.total, `QA: ${qa.passed} de ${qa.total} pruebas superadas`);

  console.log("5. Vista móvil (390 px)");
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(url);
  for (const r of ["inicio", "datos", "gcp", "comparativa", "geometria"]) {
    await mobile.evaluate((r) => (location.hash = `#/${r}`), r);
    await mobile.waitForTimeout(250);
    const over = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 1, `${r}: sin desplazamiento horizontal (exceso ${over}px)`);
  }

  check(errors.length === 0, `sin errores de JavaScript${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : "\nTodas las comprobaciones pasaron");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
