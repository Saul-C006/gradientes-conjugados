/* =====================================================================
 * Aplicación: registro de vistas, enrutador por hash (#/ruta), barra de
 * datos global, editor de la matriz y tema claro/oscuro.
 * ===================================================================== */
(function () {
  "use strict";
  const { esc, chip } = window.UI;
  const F = window.FMT;
  const { SCENARIOS, ORDER, unit } = window.CASE;

  const views = new Map();
  const NAV = [
    { group: "Proyecto", items: ["inicio", "caso", "formulacion"] },
    { group: "Datos", items: ["datos", "escenarios"] },
    { group: "Métodos directos", items: ["directos", "cholesky", "lu", "gauss"] },
    { group: "Métodos iterativos", items: ["gc", "gcp", "comparativa"] },
    { group: "Análisis", items: ["errores", "geometria"] },
    { group: "Calidad y cierre", items: ["qa", "conclusiones"] },
  ];

  const App = {
    views,
    current: null,
    view(def) {
      views.set(def.id, def);
    },
    go(id) {
      location.hash = `#/${id}`;
    },
  };

  // ------------------------------------------------------------------
  // Tema
  // ------------------------------------------------------------------
  function initTheme() {
    let t = null;
    try {
      t = localStorage.getItem("gcp-theme");
    } catch (_) {}
    if (t) document.documentElement.dataset.theme = t;
    document.getElementById("theme-btn").addEventListener("click", () => {
      const dark =
        document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      const next = dark ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("gcp-theme", next);
      } catch (_) {}
      render(true);
    });
  }

  // ------------------------------------------------------------------
  // Navegación lateral
  // ------------------------------------------------------------------
  function buildNav() {
    const nav = document.getElementById("nav");
    let n = 0;
    nav.innerHTML = NAV.map(
      (g) =>
        `<div class="nav-g"><div class="nav-gt">${g.group}</div>${g.items
          .map((id) => {
            const v = views.get(id);
            if (!v) return "";
            n++;
            return `<a href="#/${id}" data-route="${id}" class="nav-a" style="--mc:var(${v.color || "--accent"})"><span class="nav-i">${v.icon || String(n).padStart(2, "0")}</span><span>${v.nav || v.title}</span></a>`;
          })
          .join("")}</div>`,
    ).join("");
    document.getElementById("menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) document.body.classList.remove("nav-open");
    });
  }

  /** Orden lineal de rutas para los botones "anterior / siguiente". */
  const ORDER_ROUTES = () => NAV.flatMap((g) => g.items).filter((id) => views.has(id));

  // ------------------------------------------------------------------
  // Barra de datos global
  // ------------------------------------------------------------------
  function renderDataBar() {
    const bar = document.getElementById("databar");
    const st = Store.state,
      res = Store.result;
    const scenBtns = ORDER.map((k) => {
      const s = SCENARIOS[k];
      const on = st.scenario === k && !st.edited;
      return `<button type="button" class="sc sc-${s.color} ${on ? "on" : ""}" data-load="${k}" title="Cargar el escenario ${s.num}: ${esc(s.name)}"><b>${s.num}</b> ${s.short}</button>`;
    }).join("");
    const status = res.valid
      ? chip("ok", `Válida · κ(A) = ${F.smart(res.kA.cond, 2)}`)
      : chip("bad", "Datos no válidos");
    const pc = ["jacobi", "ic0", "ssor"]
      .map((t) => `<option value="${t}" ${st.precond === t ? "selected" : ""}>${NM.PRECOND_LABEL[t]}</option>`)
      .join("");
    bar.innerHTML = `
      <div class="db-l"><span class="db-t">Escenario</span><div class="scs">${scenBtns}</div>
        ${st.edited || !SCENARIOS[st.scenario] ? `<span class="chip warn"><span class="dot"></span>${esc(Store.scenarioLabel())}</span>` : ""}</div>
      <div class="db-r">
        <label class="db-t" for="db-pc">Precondicionador</label>
        <select id="db-pc" class="fld sm">${pc}</select>
        ${status}
        <a class="btn sm" href="#/datos">Editar datos</a>
      </div>`;
  }
  function bindDataBar() {
    const bar = document.getElementById("databar");
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-load]");
      if (b) Store.loadScenario(b.dataset.load);
    });
    bar.addEventListener("change", (e) => {
      if (e.target.id === "db-pc") Store.setParam("precond", e.target.value);
    });
  }

  // ------------------------------------------------------------------
  // Editor de A, b y parámetros (usado en "Entrada de datos" y en QA)
  // ------------------------------------------------------------------
  const Editor = {
    html(prefix = "ed") {
      const st = Store.state,
        n = st.n;
      let h = `<div class="editor" data-editor="${prefix}" style="--n:${n}">`;
      h += `<div class="ed-grid"><div></div>`;
      for (let j = 0; j < n; j++) h += `<div class="ed-ch">x${F.sub(j + 1)}<small>${esc(unit(j).short)}</small></div>`;
      h += `<div class="ed-eq"></div><div class="ed-ch">b<small>meta</small></div>`;
      for (let i = 0; i < n; i++) {
        h += `<div class="ed-rh">${esc(unit(i).short)}</div>`;
        for (let j = 0; j < n; j++)
          h += `<input class="cell ${i === j ? "diag" : ""}" inputmode="decimal" spellcheck="false" autocomplete="off" id="${prefix}-a-${i}-${j}" data-i="${i}" data-j="${j}" aria-label="a${i + 1}${j + 1}" value="${esc(st.raw.A[i][j])}">`;
        h += `<div class="ed-eq">=</div><input class="cell bcell" inputmode="decimal" spellcheck="false" autocomplete="off" id="${prefix}-b-${i}" data-b="${i}" aria-label="b${i + 1}" value="${esc(st.raw.b[i])}">`;
      }
      h += `</div></div>`;
      return h;
    },
    paramsHtml(prefix = "ed") {
      const st = Store.state,
        n = st.n;
      const x0 = st.raw.x0
        .map((v, i) => `<input class="cell sm" id="${prefix}-x0-${i}" data-x0="${i}" aria-label="x0 ${i + 1}" value="${esc(v)}">`)
        .join("");
      const pc = ["jacobi", "ic0", "ssor"]
        .map((t) => `<option value="${t}" ${st.precond === t ? "selected" : ""}>${NM.PRECOND_LABEL[t]}</option>`)
        .join("");
      return `<div class="params" data-params="${prefix}">
        <label class="fl"><span>Vector inicial x₀</span><div class="x0">${x0}</div></label>
        <label class="fl"><span>Tolerancia ‖rₖ‖₂/‖b‖₂ &lt;</span><input class="fld" id="${prefix}-tol" data-param="tol" value="${esc(st.raw.tol)}"></label>
        <label class="fl"><span>N<sub>máx</sub> iteraciones</span><input class="fld" id="${prefix}-maxIt" data-param="maxIt" value="${esc(st.raw.maxIt)}"></label>
        <label class="fl"><span>Precondicionador M</span><select class="fld" id="${prefix}-precond" data-param="precond">${pc}</select></label>
        <label class="fl ${st.precond === "ssor" ? "" : "muted-fl"}"><span>ω (solo SSOR)</span><input class="fld" id="${prefix}-omega" data-param="omega" value="${esc(st.raw.omega)}"></label>
        <label class="fl"><span>Dimensión n</span><select class="fld" id="${prefix}-n" data-param="n">${[4, 5, 6, 7, 8].map((k) => `<option ${k === n ? "selected" : ""}>${k}</option>`).join("")}</select></label>
        <label class="chk"><input type="checkbox" id="${prefix}-autosym" data-param="autosym" ${st.autosym ? "checked" : ""}> Reflejar aᵢⱼ en aⱼᵢ (mantener simetría)</label>
      </div>`;
    },
    bind(root) {
      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.dataset.i !== undefined) Store.setCell(+t.dataset.i, +t.dataset.j, t.value);
        else if (t.dataset.b !== undefined) Store.setB(+t.dataset.b, t.value);
        else if (t.dataset.x0 !== undefined) Store.setX0(+t.dataset.x0, t.value);
        else if (t.dataset.param === "tol" || t.dataset.param === "maxIt" || t.dataset.param === "omega")
          Store.setParam(t.dataset.param, t.value);
      });
      root.addEventListener("change", (e) => {
        const t = e.target;
        if (t.dataset.param === "precond") Store.setParam("precond", t.value);
        else if (t.dataset.param === "autosym") Store.setParam("autosym", t.checked);
        else if (t.dataset.param === "n") Store.setN(+t.value);
      });
    },
    /** Sincroniza valores y marcas de error sin reconstruir (conserva el foco). */
    sync(root) {
      const st = Store.state,
        res = Store.result;
      const bad = new Set(res.valid ? [] : res.validation.badCells || []);
      root.querySelectorAll("input[data-i]").forEach((el) => {
        const i = +el.dataset.i,
          j = +el.dataset.j;
        if (document.activeElement !== el && el.value !== st.raw.A[i][j]) el.value = st.raw.A[i][j];
        el.classList.toggle("bad", bad.has(`A:${i},${j}`));
      });
      root.querySelectorAll("input[data-b]").forEach((el) => {
        const i = +el.dataset.b;
        if (document.activeElement !== el && el.value !== st.raw.b[i]) el.value = st.raw.b[i];
        el.classList.toggle("bad", bad.has(`b:${i}`));
      });
      root.querySelectorAll("input[data-x0]").forEach((el) => {
        const i = +el.dataset.x0;
        if (document.activeElement !== el && el.value !== st.raw.x0[i]) el.value = st.raw.x0[i];
        el.classList.toggle("bad", (res.params?.badX0 || []).includes(i));
      });
      for (const p of ["tol", "maxIt", "omega"]) {
        const el = root.querySelector(`[data-param="${p}"]`);
        if (el && document.activeElement !== el && el.value !== st.raw[p]) el.value = st.raw[p];
      }
      const pc = root.querySelector('[data-param="precond"]');
      if (pc) pc.value = st.precond;
      const as = root.querySelector('[data-param="autosym"]');
      if (as) as.checked = st.autosym;
    },
  };
  App.Editor = Editor;

  // ------------------------------------------------------------------
  // Renderizado de la vista activa
  // ------------------------------------------------------------------
  function routeId() {
    const h = location.hash.replace(/^#\/?/, "").split("?")[0];
    return views.has(h) ? h : "inicio";
  }

  function ctx() {
    return { res: Store.result, st: Store.state, get scen() { return Store.scenarios; } };
  }

  function purgePlots(root) {
    if (window.Plotly) root.querySelectorAll(".js-plotly-plot").forEach((el) => Plotly.purge(el));
  }

  function render(keepScroll) {
    const id = routeId();
    const v = views.get(id);
    const main = document.getElementById("view");
    const open = [...main.querySelectorAll("details[open][id]")].map((d) => d.id);
    const y = window.scrollY;
    purgePlots(main);
    const c = ctx();
    main.innerHTML = `<div class="view v-${id}">${v.render(c)}${pager(id)}</div>`;
    if (keepScroll) open.forEach((oid) => { const d = document.getElementById(oid); if (d) d.open = true; });
    try {
      if (v.mount) v.mount(main, c);
    } catch (e) {
      console.error(e);
    }
    renderDataBar();
    document.querySelectorAll(".nav-a").forEach((a) => a.classList.toggle("on", a.dataset.route === id));
    document.title = `${v.title} · GCP en planificación financiera`;
    if (keepScroll) window.scrollTo(0, y);
    App.current = id;
  }

  function pager(id) {
    const order = ORDER_ROUTES();
    const i = order.indexOf(id);
    const prev = order[i - 1] && views.get(order[i - 1]);
    const next = order[i + 1] && views.get(order[i + 1]);
    return `<nav class="pager">${prev ? `<a href="#/${prev.id}" class="pg prev"><small>Anterior</small>${prev.title}</a>` : "<span></span>"}${next ? `<a href="#/${next.id}" class="pg next"><small>Siguiente</small>${next.title}</a>` : "<span></span>"}</nav>`;
  }

  function onStoreChange(reason) {
    const v = views.get(routeId());
    if (v && v.onChange && v.onChange(document.getElementById("view"), ctx(), reason) === true) {
      renderDataBar();
      return;
    }
    render(true);
  }

  App.render = render;

  function start() {
    initTheme();
    buildNav();
    bindDataBar();
    Store.subscribe(onStoreChange);
    window.addEventListener("hashchange", () => {
      render(false);
      window.scrollTo(0, 0);
    });
    render(false);
    // Si el usuario cambia el tema del sistema, redibujar gráficos
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => render(true));
  }

  window.App = App;
  document.addEventListener("DOMContentLoaded", start);
})();
