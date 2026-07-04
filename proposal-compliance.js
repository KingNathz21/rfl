/* RouteFlow London proposal compliance layer
   Aligns the current app with the uploaded RFL Website Proposal:
   - left desktop navigation + top global search
   - stop-board cards with route/direction filters and cached timestamps
   - fleet explorer filters, seen-window filters, bulk tag edit
   - vehicle dossiers with observed identifier provenance and Vehicle/{id}/Arrivals
   - route explorer with route sequence/shape where available
   - live map tabs: stops, routes, fleet
   - non-maintenance-safe labels only
*/
(function () {
  const CACHE = new Map();
  let boardTimer = null;
  let mapMode = "fleet";
  let selectedMapRoute = "12";

  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const html = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const safe = (s) => String(s ?? "").replace(/'/g, "\\'");
  const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function injectStyle() {
    const css = `
      @media (min-width: 980px){
        body.has-left-nav main{margin-left:236px;max-width:calc(1460px + 236px)}
        .proposal-left-nav{position:fixed;left:18px;top:92px;bottom:18px;width:214px;background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);padding:14px;z-index:18;display:flex;flex-direction:column;gap:6px;overflow:auto}
        .proposal-left-nav .nav-item{width:100%;text-align:left}.proposal-left-nav .rail-title{font-weight:950;color:var(--navy);padding:8px 10px}.proposal-left-nav .rail-sub{color:var(--muted);font-size:.8rem;padding:0 10px 10px}.top-nav{display:none!important}.site-header{padding-left:28px}
      }
      @media (max-width:979px){.proposal-left-nav{display:none}}
      .stop-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.stop-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:var(--shadow)}
      .stop-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.stop-letter{display:inline-grid;place-items:center;background:var(--navy);color:#fff;border-radius:12px;min-width:42px;height:42px;font-weight:950}.filter-chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.filter-chips input{min-height:36px;padding:8px 10px;border-radius:999px;max-width:170px}.mini-arrivals{display:grid;gap:8px;margin-top:8px}.mini-arrival{display:grid;grid-template-columns:54px 1fr auto;gap:8px;align-items:center;border-top:1px solid var(--line);padding-top:8px}.cache-note{font-size:.78rem;color:var(--muted)}
      .fleet-extra-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.fleet-extra-toolbar input,.fleet-extra-toolbar select{max-width:190px}.bulk-panel{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:10px;background:var(--soft);border-radius:16px;margin:10px 0}.bulk-panel input,.bulk-panel select{max-width:180px}.profile-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.profile-section{background:var(--soft);border:1px solid var(--line);border-radius:16px;padding:12px;margin-top:10px}.media-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.media-link{display:block;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.map-tabbar{position:absolute;z-index:6;right:16px;top:16px;display:flex;gap:8px;flex-wrap:wrap}.map-tabbar .ghost.active{background:#fff0f1;color:var(--red);border-color:#ffd5d8}.route-shape-note{margin-top:10px}.confidence-high{outline:4px solid rgba(21,115,71,.22)}.confidence-medium{outline:4px solid rgba(166,98,0,.22)}.confidence-low{outline:4px solid rgba(108,118,144,.20)}
      @media(max-width:760px){.stop-card-grid{grid-template-columns:1fr}.mini-arrival{grid-template-columns:48px 1fr}.mini-arrival .due{grid-column:2}.map-tabbar{position:static;padding:12px;background:#fff}.media-grid{grid-template-columns:1fr}}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.body.classList.add("has-left-nav");
  }

  function addLeftNav() {
    if (q(".proposal-left-nav")) return;
    const nav = document.createElement("aside");
    nav.className = "proposal-left-nav";
    nav.innerHTML = `<div class="rail-title">RouteFlow London</div><div class="rail-sub">Transport intelligence</div>${["home:Dashboard","boards:Boards","fleet:Fleet Explorer","routes:Routes","map:Live Map","sightings:Sightings","analytics:Analytics","admin:Admin / Imports"].map(x => { const [r, t] = x.split(":"); return `<button class="nav-item" data-route="${r}">${t}</button>`; }).join("")}`;
    document.body.appendChild(nav);
    nav.querySelectorAll("[data-route]").forEach((b) => b.addEventListener("click", () => window.setRoute ? window.setRoute(b.dataset.route) : q(`[data-route='${b.dataset.route}']`)?.click()));
  }

  function patchSetRoute() {
    const original = window.setRoute || setRoute;
    window.setRoute = function (route) {
      original(route);
      qa(".proposal-left-nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.route === route));
      if (route === "boards") startBoardPolling();
      if (route === "map") setTimeout(renderProposalMap, 120);
    };
  }

  async function cachedTfL(path, ttl = 30000) {
    const hit = CACHE.get(path);
    if (hit && Date.now() - hit.t < ttl) return hit.data;
    const data = await fetchJson(path);
    CACHE.set(path, { t: Date.now(), data });
    return data;
  }

  function due(a) { return a.timeToStation < 60 ? "Due" : `${Math.round(a.timeToStation / 60)} min`; }

  async function loadStopCardArrivals(stop, idx) {
    const target = q(`#stop-arrivals-${idx}`);
    const note = q(`#stop-cache-${idx}`);
    if (!target) return;
    try {
      const rows = await cachedTfL(`/StopPoint/${encodeURIComponent(stop.id)}/Arrivals`, 28000);
      const routeFilter = (stop.routeFilter || "").trim().toLowerCase();
      const destFilter = (stop.destinationFilter || "").trim().toLowerCase();
      const filtered = rows
        .sort((a, b) => a.timeToStation - b.timeToStation)
        .filter((a) => !routeFilter || String(a.lineName).toLowerCase().includes(routeFilter))
        .filter((a) => !destFilter || String(a.destinationName).toLowerCase().includes(destFilter))
        .slice(0, 6);
      target.innerHTML = filtered.map((a) => `<div class="mini-arrival"><span class="route-badge">${html(a.lineName)}</span><span><strong>${html(a.destinationName)}</strong><br><small class="muted">Vehicle ID: ${html(a.vehicleId || "not shown")}</small></span><span class="due">${due(a)}</span></div>`).join("") || `<p class="muted">No arrivals match the filters.</p>`;
      if (note) note.textContent = `cached ${nowLabel()}`;
      if (typeof recordAutomaticSightings === "function") recordAutomaticSightings(filtered, stop);
    } catch {
      target.innerHTML = `<p class="muted">Arrivals unavailable.</p>`;
      if (note) note.textContent = "cache unavailable";
    }
  }

  window.setStopFilter = function (idx, key, value) {
    const board = boards[state.activeBoard];
    if (!board?.stops?.[idx]) return;
    board.stops[idx][key] = value;
    save();
    loadStopCardArrivals(board.stops[idx], idx);
  };

  window.renderBoards = function () {
    q("#boardList") && (q("#boardList").innerHTML = boards.map((b, i) => `<button class="board-card ${i === state.activeBoard ? "active-board" : ""}" onclick="window.setActiveBoard(${i})"><strong>${html(b.name)}</strong><p class="muted">${b.stops.length} stops</p></button>`).join(""));
    const board = boards[state.activeBoard];
    q("#activeBoardName") && (q("#activeBoardName").textContent = board?.name || "Board");
    q("#activeBoardMeta") && (q("#activeBoardMeta").textContent = board ? `${board.stops.length} stops · smooth refresh every 30 seconds · TfL cache aware` : "");
    q("#boardStops") && (q("#boardStops").innerHTML = (board?.stops || []).map((s, i) => `<article class="stop-card"><div class="stop-card-head"><div><span class="stop-letter">${html(s.indicator || "•")}</span><h3>${html(s.name)}</h3><p class="muted">${html(s.id)}</p><span class="cache-note" id="stop-cache-${i}">waiting for refresh</span></div><span><button class="ghost" onclick="loadStop('${safe(s.id)}','${safe(s.name)}')">Full board</button><button class="ghost danger" onclick="removeBoardStop(${i})">Remove</button></span></div><div class="filter-chips"><input value="${html(s.routeFilter || "")}" oninput="setStopFilter(${i}, 'routeFilter', this.value)" placeholder="Only route e.g. 12"><input value="${html(s.destinationFilter || "")}" oninput="setStopFilter(${i}, 'destinationFilter', this.value)" placeholder="Towards / destination"></div><div class="mini-arrivals" id="stop-arrivals-${i}"><p class="muted">Loading arrivals…</p></div></article>`).join("") || "<p class='muted'>Add a stop to this board.</p>");
    (board?.stops || []).forEach((s, i) => loadStopCardArrivals(s, i));
  };

  function startBoardPolling() {
    clearInterval(boardTimer);
    boardTimer = setInterval(() => {
      if (state.route === "boards") window.renderBoards();
    }, 30000);
  }

  function enhanceFleetToolbar() {
    const toolbar = q("#fleetView .toolbar");
    if (!toolbar || q("#garageFilter")) return;
    toolbar.insertAdjacentHTML("beforeend", `<select id="garageFilter"></select><select id="seenFilter"><option value="">Any seen state</option><option value="30">Seen in last 30 mins</option><option value="120">Seen in last 2 hours</option><option value="never">Never seen</option></select>`);
    toolbar.insertAdjacentHTML("afterend", `<div class="bulk-panel"><strong>Bulk tag edit</strong><input id="bulkIds" placeholder="Vehicle IDs comma-separated"><select id="bulkField"><option value="operator">Operator</option><option value="garage">Garage</option><option value="vehicleType">Type</option><option value="fuelType">Fuel</option><option value="status">Status</option></select><input id="bulkValue" placeholder="New value"><button class="ghost" id="applyBulkTag">Apply</button></div>`);
    ["garageFilter", "seenFilter"].forEach((id) => q("#" + id)?.addEventListener("input", window.renderFleet));
    q("#applyBulkTag")?.addEventListener("click", () => {
      const ids = q("#bulkIds").value.split(",").map((x) => x.trim()).filter(Boolean);
      const field = q("#bulkField").value;
      const value = q("#bulkValue").value.trim();
      if (!ids.length || !value) return toast("Add IDs and a value first");
      fleet.forEach((v) => { if (ids.includes(v.vehicleId)) v[field] = value; });
      save(); window.renderFleet(); toast("Bulk tag updated");
    });
  }

  function minutesSinceSeen(v) {
    const sight = sightings.find((s) => s.vehicleId === v.vehicleId);
    if (!sight) return Infinity;
    return Math.round((Date.now() - new Date(sight.observedAt).getTime()) / 60000);
  }

  window.renderFleet = function () {
    enhanceFleetToolbar();
    updateSelect("#operatorFilter", "All operators", [...new Set(fleet.map(v => v.operator))]);
    updateSelect("#fuelFilter", "All fuel", [...new Set(fleet.map(v => v.fuelType))]);
    updateSelect("#statusFilter", "All status", [...new Set(fleet.map(v => v.status))]);
    updateSelect("#garageFilter", "All garages", [...new Set(fleet.map(v => v.garage))]);
    const term = (q("#fleetSearch")?.value || "").toLowerCase();
    const op = q("#operatorFilter")?.value || "", fuel = q("#fuelFilter")?.value || "", status = q("#statusFilter")?.value || "", garage = q("#garageFilter")?.value || "", seen = q("#seenFilter")?.value || "";
    const rows = fleet.filter(v => (!term || Object.values(v).some(x => String(x).toLowerCase().includes(term))) && (!op || v.operator === op) && (!fuel || v.fuelType === fuel) && (!status || v.status === status) && (!garage || v.garage === garage)).filter(v => { const mins = minutesSinceSeen(v); if (seen === "never") return !Number.isFinite(mins) || mins === Infinity; if (seen) return mins <= Number(seen); return true; });
    q("#fleetTable") && (q("#fleetTable").innerHTML = rows.map(v => `<tr onclick="openVehicle('${safe(v.vehicleId)}')"><td><strong>${html(v.vehicleId)}</strong><br><small class="muted">${html(v.fleetNumber || "canonical key")}</small></td><td>${html(v.operator)}</td><td>${html(v.garage)}</td><td>${html(v.vehicleType)}<br><small>${html(v.yearBuilt || "year unknown")}</small></td><td>${html(v.fuelType)}</td><td><span class="status-pill ${v.status === "Active" ? "good" : "source"}">${html(v.status)}</span></td><td>${html(v.route)}</td><td>${html(v.lastSeen)} · ${html(v.lastSeenAt)}<br><small class="muted">${minutesSinceSeen(v) === Infinity ? "never observed" : `${minutesSinceSeen(v)} min ago`}</small></td><td><span class="status-pill source">${html(v.source)}</span></td></tr>`).join(""));
    renderFleetHighlights();
  };

  window.openVehicle = async function (id) {
    const v = fleet.find(x => x.vehicleId === id) || ensureVehicle(id, "Unknown", "Unknown", "manual");
    const vehicleSightings = sightings.filter(s => s.vehicleId === v.vehicleId).slice(0, 10);
    let upcoming = "<p class='muted'>Vehicle predictions unavailable.</p>";
    try {
      const data = await cachedTfL(`/Vehicle/${encodeURIComponent(v.vehicleId)}/Arrivals`, 28000);
      upcoming = data.sort((a,b)=>a.timeToStation-b.timeToStation).slice(0,8).map(a => `<div class="network-item"><strong>${html(a.lineName)} to ${html(a.destinationName)}</strong><span>${due(a)}</span></div>`).join("") || upcoming;
    } catch {}
    const livery = (v.liveryHistory || [{ description: "No livery history recorded yet", source: v.source || "local" }]).map(x => `<p><strong>${html(x.description)}</strong><br><small class="muted">${html(x.start || "")} ${x.end ? "→ " + html(x.end) : ""} · ${html(x.source || "local")}</small></p>`).join("");
    const media = (v.media || []).map(m => `<a class="media-link" href="${html(m.url)}" target="_blank" rel="noreferrer">${html(m.caption || m.url)}</a>`).join("") || `<p class="muted">No media links yet.</p>`;
    q("#vehicleProfile").innerHTML = `<div class="vehicle-profile"><section><div class="vehicle-hero"></div><p class="eyebrow">Vehicle dossier</p><h1>${html(v.vehicleId)}</h1><span class="status-pill source">${html(v.source || "local")}</span><div class="profile-section"><h3>Identity card</h3><div class="network-item"><strong>Operator</strong><span>${html(v.operator)}</span></div><div class="network-item"><strong>Garage tag</strong><span>${html(v.garage)}</span></div><div class="network-item"><strong>Type / Fuel</strong><span>${html(v.vehicleType)} · ${html(v.fuelType)}</span></div><div class="network-item"><strong>Status</strong><span>${html(v.status)}</span></div></div></section><section><div class="profile-tabs"><span class="status-pill good">Observed identifier</span><span class="status-pill source">Non-maintenance dossier</span><span class="status-pill source">Provenance: ${html(v.source || "local")}</span></div><div class="profile-section"><h2>Last seen</h2><p>Route ${html(v.route)} · ${html(v.lastSeen)} · ${html(v.lastSeenAt)}</p><button class="ghost" onclick="document.querySelector('#vehicleDialog').close();setRoute('map');setTimeout(()=>flyTo([${Number(v.lng)||DEFAULT_CENTER[0]},${Number(v.lat)||DEFAULT_CENTER[1]}],14),80)">Show on map</button></div><div class="profile-section"><h2>Next predicted stops</h2>${upcoming}</div><div class="profile-section"><h2>Activity timeline</h2><div class="timeline">${vehicleSightings.map(s=>`<p>${new Date(s.observedAt).toLocaleString()} · Route ${html(s.route)} · ${html(s.location)} · ${html(s.source)}</p>`).join("") || "<p>No sightings yet.</p>"}${livery}</div></div><div class="profile-section"><h2>Route affinity</h2><p class="muted">${routeAffinity(v.vehicleId).join(", ") || "No route pattern yet."}</p></div><div class="profile-section"><h2>Media links</h2><div class="media-grid">${media}</div></div></section></div>`;
    q("#vehicleDialog").showModal();
  };

  window.showRouteDetail = async function (id) {
    const vehicles = vehiclesOnRoute(id);
    let stops = "", shape = "<p class='muted'>Route shape unavailable.</p>";
    try {
      const data = await cachedTfL(`/Line/${encodeURIComponent(id)}/StopPoints`, 600000);
      stops = data.slice(0, 18).map(s => `<div class="network-item"><strong>${html(s.commonName || s.name)}</strong><span>${html(s.indicator || "")}</span></div>`).join("");
    } catch { stops = "<p class='muted'>Stop list unavailable.</p>"; }
    try {
      const seq = await cachedTfL(`/Line/${encodeURIComponent(id)}/Route/Sequence/outbound`, 600000);
      const count = seq.stopPointSequences?.[0]?.stopPoint?.length || 0;
      shape = `<p class="route-shape-note"><span class="status-pill good">Route sequence loaded</span> ${count} ordered stops found from TfL route sequence.</p>`;
      selectedMapRoute = id;
    } catch {}
    q("#routeDetail").innerHTML = `<section class="route-detail-card"><h2>Route ${id}</h2><span class="status-pill ${statusForRoute(id).severity}">${html(statusForRoute(id).status)} advisory</span>${shape}<div class="route-detail-grid"><div><h3>Vehicles observed today</h3>${vehicles.map(v=>`<div class="network-item"><strong>${html(v.vehicleId)}</strong><span>${html(v.lastSeen)}</span></div>`).join("") || "<p class='muted'>No vehicles observed yet.</p>"}</div><div><h3>Stops</h3>${stops}</div></div></section>`;
  };

  function addMapTabs() {
    const shell = q(".map-shell");
    if (!shell || q(".map-tabbar")) return;
    shell.insertAdjacentHTML("afterbegin", `<div class="map-tabbar"><button class="ghost active" data-map-mode="fleet">Fleet view</button><button class="ghost" data-map-mode="stops">Stop view</button><button class="ghost" data-map-mode="routes">Route view</button></div>`);
    qa("[data-map-mode]").forEach(btn => btn.addEventListener("click", () => { mapMode = btn.dataset.mapMode; qa("[data-map-mode]").forEach(b=>b.classList.toggle("active", b===btn)); renderProposalMap(); }));
  }

  function confidenceClass(v) {
    const mins = minutesSinceSeen(v);
    if (mins <= 2) return "confidence-high";
    if (mins <= 10) return "confidence-medium";
    return "confidence-low";
  }

  function renderProposalMap() {
    addMapTabs();
    if (!state.mainMap || !state.mainMap.loaded()) return;
    clearMarkers();
    if (mapMode === "stops") {
      boards.flatMap(b=>b.stops).slice(0,80).forEach(s => { const el = document.createElement("button"); el.className = "rfl-map-marker stop"; el.textContent = s.indicator || "S"; const c = [Number(s.lng)||coordsFor(s.name)[0], Number(s.lat)||coordsFor(s.name)[1]]; const marker = new maplibregl.Marker({element:el}).setLngLat(c).setPopup(new maplibregl.Popup().setHTML(`<strong>${html(s.name)}</strong><br>${html(s.id)}<br><button onclick="loadStop('${safe(s.id)}','${safe(s.name)}')">Arrivals</button>`)).addTo(state.mainMap); state.mapMarkers.push(marker); });
      return;
    }
    const vehicles = mapMode === "routes" ? fleet.filter(v => String(v.route) === String(selectedMapRoute)) : fleet;
    vehicles.slice(0,100).forEach(v => { const el = document.createElement("button"); el.className = `rfl-map-marker ${confidenceClass(v)}`; el.textContent = (v.route || "B").slice(0,3); el.title = v.vehicleId; const marker = new maplibregl.Marker({element:el}).setLngLat([Number(v.lng)||DEFAULT_CENTER[0], Number(v.lat)||DEFAULT_CENTER[1]]).setPopup(new maplibregl.Popup().setHTML(`<strong>${html(v.vehicleId)}</strong><br>Route ${html(v.route)}<br>${html(v.lastSeen)}<br><small>${mapMode === "routes" ? "Route view" : "Fleet view"}</small>`)).addTo(state.mainMap); el.addEventListener("click",()=>openVehicle(v.vehicleId)); state.mapMarkers.push(marker); });
  }

  const originalRenderMap = window.renderMap || renderMap;
  window.renderMap = function () { originalRenderMap(); renderProposalMap(); };

  function patchImport() {
    const original = window.importCsv || importCsv;
    window.importCsv = function () {
      const text = q("#csvInput")?.value.trim();
      if (!text) return original();
      const lines = text.split(/\n+/); const headers = lines.shift().split(",").map(h=>h.trim()); let count = 0;
      lines.forEach(line => { const values = line.split(","); const row = Object.fromEntries(headers.map((h,i)=>[h, values[i]?.trim() || ""])); const vehicleId = row.vehicleId || row.registration || row.fleetNumber; if (!vehicleId) return; const coords = coordsFor(row.lastSeen || row.location || ""); fleet = fleet.filter(v => v.vehicleId !== vehicleId); fleet.push({vehicleId, fleetNumber: row.fleetNumber || vehicleId, operator: row.operator || "Unknown", garage: row.garage || "Unknown", vehicleType: row.vehicleType || "Unknown", fuelType: row.fuelType || "Unknown", yearBuilt: row.yearBuilt || "", status: row.status || "Unknown", route: row.route || "Unknown", lastSeen: row.lastSeen || "Unknown", lastSeenAt: row.lastSeenAt || "", source: row.source || "imported", lastVerified: row.lastVerified || new Date().toISOString().slice(0,10), notes: row.notes || "", liveryHistory: row.livery ? [{description: row.livery, source: "import"}] : [], media: row.photoUrl ? [{url: row.photoUrl, caption: row.photoCaption || "Photo link"}] : [], lng: coords[0], lat: coords[1]}); count++; });
      save(); renderAll(); q("#adminOutput").innerHTML = `<p class="status-pill good">Imported/merged ${count} proposal-safe fleet records</p>`; toast(`Imported ${count} records`);
    };
    q("#importCsv")?.removeEventListener("click", original);
    q("#importCsv")?.addEventListener("click", window.importCsv);
  }

  function scheduleTrackedStopPolling() {
    setInterval(() => {
      const tracked = boards.flatMap(b=>b.stops).slice(0,8);
      tracked.forEach((stop) => cachedTfL(`/StopPoint/${encodeURIComponent(stop.id)}/Arrivals`, 28000).then(arr => recordAutomaticSightings(arr, stop)).catch(()=>{}));
    }, 30000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyle(); addLeftNav(); patchSetRoute(); addMapTabs(); patchImport(); startBoardPolling(); scheduleTrackedStopPolling(); setTimeout(()=>{ window.renderBoards(); window.renderFleet(); renderProposalMap(); }, 250);
  });
})();
