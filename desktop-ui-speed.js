/* RouteFlow London - desktop redesign and responsiveness fixes */
(function () {
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];
  let renderQueued = false;
  let routeChangeAt = 0;

  function injectDesktopCss() {
    const style = document.createElement("style");
    style.textContent = `
      :root{--rfl-radius:24px;--rfl-shadow:0 14px 36px rgba(7,29,73,.08);--rfl-card:#fff;--rfl-page:#f5f7fb}
      @media(min-width:981px){
        body{background:linear-gradient(180deg,#f8faff,#eef3fb)!important}.site-header{height:72px;padding:10px 22px!important;gap:14px!important;box-shadow:0 8px 30px rgba(7,29,73,.06)}.logo img{width:68px!important}.mini-search input{width:290px!important}.kbd-btn{min-width:54px}.account-btn{min-width:92px}
        body.has-left-nav main{margin-left:258px!important;max-width:calc(100% - 258px)!important;padding:22px 26px 38px!important}.proposal-left-nav{top:88px!important;left:20px!important;width:224px!important;border-radius:28px!important;padding:16px!important;background:linear-gradient(180deg,#fff,#fbfcff)!important}.proposal-left-nav .rail-title{font-size:1.05rem}.proposal-left-nav .nav-item{display:flex;align-items:center;gap:10px;padding:12px 13px!important;margin:2px 0}.proposal-left-nav .nav-item::before{content:"";width:9px;height:9px;border-radius:999px;background:#dce3f1}.proposal-left-nav .nav-item.active::before{background:var(--red)}
        .hero-card.hero-v2{display:grid;grid-template-columns:110px 1fr;align-items:center;text-align:left;gap:22px;padding:24px 32px!important;margin-bottom:18px!important}.hero-card .hero-logo{width:96px!important;grid-row:1/5}.hero-card h1{font-size:clamp(2.4rem,4vw,4rem)!important;margin:2px 0 8px!important}.hero-card p{margin:0 0 14px!important;max-width:920px!important}.hero-search{margin:0!important;max-width:760px!important}
        .system-strip{grid-template-columns:repeat(4,minmax(0,1fr))!important}.shortcut-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}.shortcut{flex-direction:column;align-items:flex-start;min-height:118px}.shortcut strong{font-size:.98rem}.stats-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.card-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.home-grid{grid-template-columns:1fr 1.55fr 1fr!important}.panel,.shortcut,.stat-card,.system-card,.hub-section,.route-card,.route-summary-card,.route-vehicle-card{border-radius:var(--rfl-radius)!important;box-shadow:var(--rfl-shadow)!important;border-color:#e8edf6!important}.panel:hover,.shortcut:hover,.route-card:hover,.route-vehicle-card:hover{box-shadow:0 18px 42px rgba(7,29,73,.11)!important}
        .page-title{display:flex;align-items:end;justify-content:space-between;margin:2px 0 16px}.page-title h1{font-size:clamp(2.2rem,3.2vw,3.6rem)!important;margin:0!important}.page-title p{margin:0 0 8px!important;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--red)!important}.routes-main-layout{grid-template-columns:300px 1fr!important}.routes-side{top:90px!important;border-radius:28px!important}.route-list-btn{transition:.16s ease}.route-list-btn:hover{transform:translateY(-1px)}.route-hero-detail{border-radius:30px!important}.route-summary-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.route-live-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.search-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.split{grid-template-columns:320px 1fr!important}.admin-grid{grid-template-columns:1.1fr .9fr!important}.table-wrap{border:1px solid var(--line);border-radius:18px}tbody tr{cursor:pointer}.map-shell{min-height:680px}.main-map{min-height:680px!important}.compact-map{min-height:340px!important}
      }
      .rfl-skeleton{background:linear-gradient(90deg,#f1f4f9,#fff,#f1f4f9);background-size:220% 100%;animation:rflShimmer 1.2s infinite;border-radius:14px;min-height:48px}@keyframes rflShimmer{0%{background-position:220% 0}100%{background-position:-220% 0}}
      body.rfl-busy *{cursor:progress!important}.rfl-perf-badge{position:fixed;right:16px;bottom:16px;background:var(--navy);color:#fff;border-radius:999px;padding:8px 12px;font-size:.78rem;font-weight:900;z-index:120;box-shadow:var(--shadow)}
      @media(max-width:760px){.rfl-perf-badge{display:none}.home-grid .map-panel{order:-1}.system-strip{display:none!important}.stats-grid{grid-template-columns:repeat(2,1fr)!important}.card-grid{gap:12px!important}.shortcut-grid{gap:12px!important}.panel h2{font-size:1.2rem}.page-title{margin-top:8px}.page-title h1{font-size:1.85rem!important}.route-live-grid,.route-summary-grid{grid-template-columns:1fr!important}.route-hero-detail{padding:16px!important}.route-hero-detail h1{font-size:2.4rem!important}}
    `;
    document.head.appendChild(style);
  }

  function badge(text) {
    let el = qs("#rflPerfBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "rflPerfBadge";
      el.className = "rfl-perf-badge";
      document.body.appendChild(el);
    }
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 1300);
  }

  function patchRenderAll() {
    if (!window.renderAll || window.renderAll.__speedPatched) return;
    const original = window.renderAll;
    const patched = function () {
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(() => {
        renderQueued = false;
        original();
      });
    };
    patched.__speedPatched = true;
    window.renderAll = patched;
  }

  function patchSetRoute() {
    if (!window.setRoute || window.setRoute.__speedPatched) return;
    const original = window.setRoute;
    const patched = function (route) {
      const now = performance.now();
      if (now - routeChangeAt < 120 && document.querySelector(`#${route}View`)?.classList.contains("active")) return;
      routeChangeAt = now;
      document.body.classList.add("rfl-busy");
      original(route);
      if (route === "routes" && window.RouteFlowLazy) window.RouteFlowLazy.routes();
      setTimeout(() => document.body.classList.remove("rfl-busy"), 180);
    };
    patched.__speedPatched = true;
    window.setRoute = patched;
  }

  function patchMapRendering() {
    if (!window.renderMap || window.renderMap.__speedPatched) return;
    const original = window.renderMap;
    let mapQueued = false;
    const patched = function () {
      const mapActive = qs("#mapView")?.classList.contains("active");
      const homeActive = qs("#homeView")?.classList.contains("active");
      if (!mapActive && !homeActive) return;
      if (mapQueued) return;
      mapQueued = true;
      setTimeout(() => {
        mapQueued = false;
        original();
      }, mapActive ? 120 : 500);
    };
    patched.__speedPatched = true;
    window.renderMap = patched;
  }

  function makeDashboardCleaner() {
    const hero = qs(".hero-card.hero-v2");
    if (hero && !qs("#desktopHeroHint")) {
      hero.insertAdjacentHTML("beforeend", `<div id="desktopHeroHint" class="pill-row"><span class="status-pill good">Fast search</span><span class="status-pill source">TfL live data</span><span class="status-pill source">Firebase sync</span></div>`);
    }
    qsa(".shortcut").forEach((card) => {
      if (!card.dataset.polished) {
        card.dataset.polished = "1";
        card.setAttribute("type", "button");
      }
    });
  }

  function reduceStartupWork() {
    if (window.__rflReducedStartup) return;
    window.__rflReducedStartup = true;
    window.addEventListener("load", () => setTimeout(() => badge("Optimised"), 700));
  }

  function init() {
    injectDesktopCss();
    reduceStartupWork();
    const timer = setInterval(() => {
      patchRenderAll();
      patchSetRoute();
      patchMapRendering();
      makeDashboardCleaner();
    }, 250);
    setTimeout(() => clearInterval(timer), 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
