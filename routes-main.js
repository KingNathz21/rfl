/* RouteFlow London - TfL powered Routes main page */
(function () {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const safe = (s) => String(s ?? "").replace(/'/g, "\\'");
  const ROUTE_CACHE = new Map();
  let allBusLines = [];
  let selectedRoute = null;
  let selectedDirection = "outbound";
  let routeRefreshTimer = null;

  async function api(path, ttl = 30000) {
    const hit = ROUTE_CACHE.get(path);
    if (hit && Date.now() - hit.t < ttl) return hit.data;
    const data = await fetchJson(path);
    ROUTE_CACHE.set(path, { t: Date.now(), data });
    return data;
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .routes-main-layout{display:grid;grid-template-columns:340px 1fr;gap:16px}.routes-side{position:sticky;top:92px;align-self:start;max-height:calc(100vh - 110px);overflow:auto}.route-list-search{width:100%;margin-bottom:10px}.route-list{display:grid;gap:8px}.route-list-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px;text-align:left}.route-list-btn.active,.route-list-btn:hover{border-color:#ffd5d8;background:#fff7f7}.route-pill{display:grid;place-items:center;background:var(--red);color:#fff;border-radius:14px;min-width:54px;height:48px;font-weight:950;font-size:1.15rem}.route-main-detail{display:grid;gap:16px}.route-hero-detail{background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;border-radius:28px;padding:22px;box-shadow:var(--shadow)}.route-hero-detail h1{font-size:clamp(2.2rem,5vw,4.5rem);margin:6px 0}.route-hero-detail p{color:rgba(255,255,255,.86)}.route-tabbar,.route-direction-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.route-tabbar button,.route-direction-tabs button{background:#fff;border:1px solid var(--line);border-radius:999px;padding:10px 14px;font-weight:850;color:var(--navy)}.route-tabbar button.active,.route-direction-tabs button.active{background:var(--red);color:#fff;border-color:var(--red)}.route-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.route-summary-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow)}.route-summary-card strong{font-size:1.6rem;display:block}.route-live-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.route-vehicle-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow)}.route-vehicle-card h3{margin:4px 0}.route-stop-list{display:grid;gap:8px}.route-stop-row{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px}.stop-index{display:grid;place-items:center;background:var(--soft);border-radius:12px;width:38px;height:38px;font-weight:900;color:var(--navy)}.route-history-list{display:grid;gap:8px}.history-item{background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}.route-loading{padding:18px;background:#fff;border:1px solid var(--line);border-radius:18px;color:var(--muted)}
      @media(max-width:900px){.routes-main-layout{grid-template-columns:1fr}.routes-side{position:static;max-height:none}.route-summary-grid,.route-live-grid{grid-template-columns:1fr}.route-stop-row{grid-template-columns:34px 1fr}.route-stop-row button{grid-column:2;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function statusLabel(line) {
    const status = line?.lineStatuses?.[0]?.statusSeverityDescription || "Good service";
    const cls = status === "Good service" ? "good" : "warn";
    return `<span class="status-pill ${cls}">${esc(status)}</span>`;
  }

  async function loadAllRoutes() {
    if (allBusLines.length) return allBusLines;
    try {
      allBusLines = await api("/Line/Mode/bus", 600000);
    } catch {
      allBusLines = (typeof routes !== "undefined" ? routes : []).map((r) => ({ id: r.id, name: r.id, lineStatuses: [{ statusSeverityDescription: r.status || "Good service" }] }));
    }
    allBusLines.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    return allBusLines;
  }

  window.renderRoutes = async function () {
    const view = q("#routesView");
    if (!view) return;
    view.innerHTML = `<div class="page-title"><p>TfL live route intelligence</p><h1>Routes</h1></div><section class="routes-main-layout"><aside class="panel routes-side"><input id="routeSearch" class="route-list-search" placeholder="Search route e.g. 12, 343, N68"><div class="route-list" id="routeList"><p class="muted">Loading TfL routes...</p></div></aside><section class="route-main-detail" id="routeMainDetail"><section class="route-hero-detail"><p class="eyebrow">Route explorer</p><h1>Select a route</h1><p>Choose a bus route to see live vehicle IDs from TfL predictions, stops, sequence, status and RouteFlow observation history.</p></section></section></section>`;
    const lines = await loadAllRoutes();
    const input = q("#routeSearch");
    input?.addEventListener("input", () => drawRouteList(input.value));
    drawRouteList(input?.value || "");
    if (selectedRoute) showRouteDetail(selectedRoute, selectedDirection);
  };

  function drawRouteList(term = "") {
    const list = q("#routeList");
    if (!list) return;
    const filtered = allBusLines.filter((line) => !term || String(line.id).toLowerCase().includes(term.toLowerCase()) || String(line.name).toLowerCase().includes(term.toLowerCase())).slice(0, 140);
    list.innerHTML = filtered.map((line) => `<button class="route-list-btn ${selectedRoute === line.id ? "active" : ""}" onclick="showRouteDetail('${safe(line.id)}')"><span class="route-pill">${esc(line.id)}</span><span><strong>${esc(line.name || `Route ${line.id}`)}</strong><br><small class="muted">TfL bus route</small></span>${statusLabel(line)}</button>`).join("") || `<p class="muted">No route found.</p>`;
  }

  function uniqueVehicles(arrivals) {
    const map = new Map();
    arrivals.filter((a) => a.vehicleId).forEach((a) => {
      const existing = map.get(a.vehicleId);
      if (!existing || a.timeToStation < existing.timeToStation) map.set(a.vehicleId, a);
    });
    return [...map.values()].sort((a, b) => a.timeToStation - b.timeToStation);
  }

  function storeRouteObservations(arrivals) {
    if (typeof ensureVehicle !== "function") return;
    arrivals.filter((a) => a.vehicleId).forEach((a) => {
      const stopName = a.stationName || a.currentLocation || a.towards || "Route observation";
      const v = ensureVehicle(a.vehicleId, a.lineName, stopName, "tfl_route_arrivals");
      v.route = a.lineName;
      v.lastSeen = stopName;
      v.lastSeenAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      v.destination = a.destinationName || "Unknown";
    });
    if (typeof save === "function") save();
  }

  function localHistory(routeId) {
    const rows = (typeof sightings !== "undefined" ? sightings : []).filter((s) => String(s.route) === String(routeId));
    return { rows, vehicles: new Set(rows.map((s) => s.vehicleId).filter(Boolean)), locations: new Set(rows.map((s) => s.location).filter(Boolean)) };
  }

  async function getRouteData(routeId, direction) {
    const [lineInfo, status, arrivals, sequence] = await Promise.allSettled([
      api(`/Line/${encodeURIComponent(routeId)}`, 600000),
      api(`/Line/${encodeURIComponent(routeId)}/Status`, 60000),
      api(`/Line/${encodeURIComponent(routeId)}/Arrivals`, 25000),
      api(`/Line/${encodeURIComponent(routeId)}/Route/Sequence/${direction}`, 600000)
    ]);
    return {
      lineInfo: lineInfo.status === "fulfilled" ? lineInfo.value?.[0] : null,
      status: status.status === "fulfilled" ? status.value?.[0] : null,
      arrivals: arrivals.status === "fulfilled" ? arrivals.value : [],
      sequence: sequence.status === "fulfilled" ? sequence.value : null
    };
  }

  window.showRouteDetail = async function (routeId, direction = selectedDirection || "outbound") {
    selectedRoute = routeId;
    selectedDirection = direction;
    drawRouteList(q("#routeSearch")?.value || "");
    const detail = q("#routeMainDetail");
    if (!detail) return;
    detail.innerHTML = `<section class="route-loading">Loading route ${esc(routeId)} from TfL...</section>`;
    clearInterval(routeRefreshTimer);
    const data = await getRouteData(routeId, direction);
    storeRouteObservations(data.arrivals);
    const vehicles = uniqueVehicles(data.arrivals);
    const seq = data.sequence;
    const stopSeq = seq?.stopPointSequences?.[0]?.stopPoint || [];
    const orderedStops = stopSeq.length ? stopSeq : (seq?.stations || []);
    const history = localHistory(routeId);
    const firstStop = orderedStops[0]?.name || orderedStops[0]?.commonName || "Unknown";
    const lastStop = orderedStops[orderedStops.length - 1]?.name || orderedStops[orderedStops.length - 1]?.commonName || "Unknown";
    const currentStatus = data.status?.lineStatuses?.[0]?.statusSeverityDescription || data.lineInfo?.lineStatuses?.[0]?.statusSeverityDescription || "Good service";
    const statusClass = currentStatus === "Good service" ? "good" : "warn";
    detail.innerHTML = `<section class="route-hero-detail"><p class="eyebrow">Route ${esc(routeId)}</p><h1>${esc(routeId)}</h1><p>${esc(firstStop)} → ${esc(lastStop)}</p><div class="route-tabbar"><button class="active" onclick="document.querySelector('#routeLiveSection')?.scrollIntoView({behavior:'smooth'})">Live vehicles</button><button onclick="document.querySelector('#routeStopsSection')?.scrollIntoView({behavior:'smooth'})">Stops</button><button onclick="document.querySelector('#routeHistorySection')?.scrollIntoView({behavior:'smooth'})">History</button></div></section>
      <section class="route-summary-grid"><article class="route-summary-card"><small>Status</small><strong><span class="status-pill ${statusClass}">${esc(currentStatus)}</span></strong></article><article class="route-summary-card"><small>Vehicle IDs</small><strong>${vehicles.length}</strong><span class="muted">from TfL predictions</span></article><article class="route-summary-card"><small>Stops</small><strong>${orderedStops.length || "—"}</strong><span class="muted">${esc(direction)} sequence</span></article><article class="route-summary-card"><small>History</small><strong>${history.rows.length}</strong><span class="muted">RouteFlow observations</span></article></section>
      <section class="panel" id="routeLiveSection"><div class="panel-heading"><div><h2>Live vehicle IDs on route ${esc(routeId)}</h2><p class="muted">This is built from TfL live route arrivals and grouped by Vehicle ID.</p></div><button class="ghost" onclick="showRouteDetail('${safe(routeId)}','${safe(direction)}')">Refresh</button></div><div class="route-live-grid">${vehicles.map((a) => vehicleCard(a)).join("") || `<p class="muted">No live vehicle IDs returned by TfL right now.</p>`}</div></section>
      <section class="panel" id="routeStopsSection"><div class="panel-heading"><div><h2>Stops</h2><p class="muted">Full ${esc(direction)} stopping sequence from TfL.</p></div><div class="route-direction-tabs"><button class="${direction === "outbound" ? "active" : ""}" onclick="showRouteDetail('${safe(routeId)}','outbound')">Outbound</button><button class="${direction === "inbound" ? "active" : ""}" onclick="showRouteDetail('${safe(routeId)}','inbound')">Inbound</button></div></div><div class="route-stop-list">${orderedStops.map((s, i) => stopRow(s, i)).join("") || `<p class="muted">No ordered stops returned.</p>`}</div></section>
      <section class="panel" id="routeHistorySection"><h2>Previous history</h2><div class="route-history-list"><article class="history-item"><strong>Vehicles previously observed</strong><p class="muted">${[...history.vehicles].slice(0, 40).join(", ") || "No vehicle history yet."}</p></article><article class="history-item"><strong>Locations previously observed</strong><p class="muted">${[...history.locations].slice(0, 40).join(", ") || "No location history yet."}</p></article>${history.rows.slice(0, 20).map((s) => `<article class="history-item"><strong>${esc(s.vehicleId)}</strong> on route ${esc(s.route)}<p class="muted">${esc(s.location)} · ${new Date(s.observedAt).toLocaleString()} · ${esc(s.source)}</p></article>`).join("")}</div></section>`;
    routeRefreshTimer = setInterval(() => { if (q("#routesView")?.classList.contains("active") && selectedRoute === routeId) showRouteDetail(routeId, direction); }, 30000);
  };

  function vehicleCard(a) {
    const vehicleId = a.vehicleId || "unknown";
    const mins = a.timeToStation < 60 ? "Due" : `${Math.round(a.timeToStation / 60)} min`;
    const local = typeof fleet !== "undefined" ? fleet.find((v) => v.vehicleId === vehicleId) : null;
    return `<article class="route-vehicle-card"><span class="route-badge">${esc(a.lineName)}</span><h3><button class="link-btn" onclick="openVehicle('${safe(vehicleId)}')">${esc(vehicleId)}</button></h3><p><strong>${esc(a.destinationName || "Unknown destination")}</strong></p><p class="muted">Prediction: ${esc(a.stationName || a.currentLocation || "unknown stop")} · ${mins}</p><p class="muted">${local ? `${esc(local.operator)} · ${esc(local.vehicleType)} · ${esc(local.garage)}` : "Profile will be created when opened"}</p><button class="ghost" onclick="openVehicle('${safe(vehicleId)}')">Open vehicle profile</button></article>`;
  }

  function stopRow(s, i) {
    const id = s.id || s.stationId || s.naptanId || "";
    const name = s.name || s.commonName || "Unknown stop";
    const indicator = s.indicator || s.stopLetter || "";
    return `<article class="route-stop-row"><span class="stop-index">${i + 1}</span><span><strong>${esc(name)}</strong><br><small class="muted">${esc(id)} ${indicator ? `· Stop ${esc(indicator)}` : ""}</small></span>${id ? `<button class="ghost" onclick="loadStop('${safe(id)}','${safe(name)}')">Arrivals</button>` : ""}</article>`;
  }

  function makeRoutesMainOnMobile() {
    const nav = q(".mobile-bottom-nav");
    if (!nav || nav.dataset.routesMainPatched) return;
    nav.dataset.routesMainPatched = "1";
    const buttons = nav.querySelectorAll("button");
    if (buttons[3]) buttons[3].outerHTML = `<button data-mobile-route="routes"><span>🛣</span>Routes</button>`;
    nav.querySelectorAll("[data-mobile-route]").forEach((b) => b.addEventListener("click", () => window.setRoute ? window.setRoute(b.dataset.mobileRoute) : null));
  }

  document.addEventListener("DOMContentLoaded", () => {
    addStyles();
    makeRoutesMainOnMobile();
    qa("[data-route='routes'], [data-mobile-route='routes']").forEach((b) => b.addEventListener("click", () => setTimeout(() => window.renderRoutes(), 100)));
    setTimeout(() => { if (q("#routesView")?.classList.contains("active")) window.renderRoutes(); }, 300);
  });
})();
