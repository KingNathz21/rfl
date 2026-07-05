(() => {
  const TFL = "https://api.tfl.gov.uk";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const cleanId = (v) => String(v ?? "").replace(/[^A-Za-z0-9_-]/g, "_");
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  const state = {
    page: "home",
    stopTimer: null,
    routeSearchTimer: null,
    profile: store.get("rfl_profile", { name: "Guest", email: "", favourites: ["Baker Street Station", "London Bridge Station", "Oxford Circus Station"], vehicles: [], searches: [] }),
    vehicles: store.get("rfl_vehicle_profiles", {}),
    routesLoaded: false,
    allRoutes: [],
    aborters: {}
  };

  const memory = new Map();
  async function api(path, ttl = 30000, group = "default") {
    const key = path;
    const hit = memory.get(key);
    if (hit && Date.now() - hit.time < ttl) return hit.data;
    if (state.aborters[group]) state.aborters[group].abort();
    state.aborters[group] = new AbortController();
    const res = await fetch(TFL + path, { signal: state.aborters[group].signal });
    if (!res.ok) throw Error(res.status);
    const data = await res.json();
    memory.set(key, { time: Date.now(), data });
    return data;
  }

  function idle(fn) { (window.requestIdleCallback || ((cb) => setTimeout(cb, 80)))(fn); }
  function saveProfile() { store.set("rfl_profile", state.profile); store.set("rfl_vehicle_profiles", state.vehicles); }
  function due(sec) { return sec < 60 ? "Due" : `${Math.round(sec / 60)} mins`; }

  function showPage(page) {
    state.page = page;
    $$(".page-view").forEach((v) => v.classList.toggle("active", v.id === page));
    $$('[data-page]').forEach((n) => n.classList.toggle("active", n.dataset.page === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "routes") loadRoutes();
    if (page === "arrivals") initArrivals();
    if (page === "dashboard") renderProfilePage();
    if (page === "fleet") renderFleetPage();
  }
  window.showPage = showPage;

  function addRecent(q) {
    if (!q) return;
    state.profile.searches = [q, ...state.profile.searches.filter((x) => x !== q)].slice(0, 8);
    saveProfile();
    renderProfileWidgets();
  }

  function quickSearch(q) {
    addRecent(q);
    const isRoute = /^[0-9A-Za-z]{1,4}$/.test(q.trim());
    showPage(isRoute ? "routes" : "arrivals");
    setTimeout(() => {
      const input = $(isRoute ? "#routeSearch" : "#arrivalSearch");
      if (!input) return;
      input.value = q;
      input.dispatchEvent(new Event("input"));
      if (isRoute) openRoute(q);
    }, 80);
  }

  function setupNav() {
    $$('[data-page]').forEach((n) => n.addEventListener("click", () => showPage(n.dataset.page)));
    $$(".search-row").forEach((form) => form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = form.querySelector("input")?.value.trim();
      if (q) quickSearch(q);
    }));
    $(".mobile-profile")?.addEventListener("click", () => showPage("dashboard"));
  }

  function vehicleProfile(id, data = {}) {
    const existing = state.vehicles[id] || {};
    state.vehicles[id] = {
      vehicleId: id,
      route: data.route || existing.route || "Unknown",
      destination: data.destination || existing.destination || "Unknown",
      lastSeen: data.lastSeen || existing.lastSeen || "Unknown",
      lastSeenAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      observations: [{ route: data.route, destination: data.destination, location: data.lastSeen, at: new Date().toISOString() }, ...(existing.observations || [])].slice(0, 30)
    };
    saveProfile();
    return state.vehicles[id];
  }

  function openVehicleProfile(id) {
    const v = state.vehicles[id] || vehicleProfile(id);
    let modal = $("#vehicleModal");
    if (!modal) {
      modal = document.createElement("dialog");
      modal.id = "vehicleModal";
      document.body.appendChild(modal);
    }
    const isFav = state.profile.vehicles.includes(id);
    modal.innerHTML = `<button class="modal-close" onclick="document.querySelector('#vehicleModal').close()">×</button>
      <section class="vehicle-modal-grid">
        <div class="vehicle-panel-hero"><span class="route-num">${esc(v.route)}</span><h1>${esc(id)}</h1><p>Vehicle ID / registration</p></div>
        <div>
          <p class="mini-label">Profile</p><h2>${esc(id)}</h2>
          <div class="profile-stat"><strong>Current route</strong><span>${esc(v.route)}</span></div>
          <div class="profile-stat"><strong>Destination</strong><span>${esc(v.destination)}</span></div>
          <div class="profile-stat"><strong>Last seen</strong><span>${esc(v.lastSeen)} · ${esc(v.lastSeenAt || "")}</span></div>
          <button class="primary-btn" onclick="toggleVehicleFavourite('${esc(id)}')">${isFav ? "Remove favourite" : "Add favourite"}</button>
          <button class="ghost-btn" onclick="showPage('fleet');document.querySelector('#vehicleModal').close()">Open Fleet</button>
        </div>
      </section>
      <section class="profile-history"><h3>Previous history</h3>${(v.observations || []).map((o) => `<div class="history-line"><strong>Route ${esc(o.route || "?")}</strong><span>${esc(o.destination || "Unknown")} · ${esc(o.location || "Unknown")}</span><small>${new Date(o.at).toLocaleString()}</small></div>`).join("") || "<p>No history yet.</p>"}</section>`;
    modal.showModal();
  }
  window.openVehicleProfile = openVehicleProfile;

  window.toggleVehicleFavourite = (id) => {
    const list = state.profile.vehicles;
    state.profile.vehicles = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
    saveProfile();
    openVehicleProfile(id);
    renderProfilePage();
  };

  function renderProfileWidgets() {
    const recentPanel = $$(".recent-row");
    if (recentPanel.length && state.profile.searches.length) {
      const parent = recentPanel[0].parentElement;
      const head = parent.querySelector(".section-head")?.outerHTML || "";
      parent.innerHTML = head + state.profile.searches.map((s) => `<div class="recent-row"><span>⌕</span><span>${esc(s)}</span><button onclick="quickSearch('${esc(s)}')">›</button></div>`).join("");
    }
  }

  function renderProfilePage() {
    const view = $("#dashboard");
    if (!view) return;
    view.innerHTML = `<div class="inner-page"><div class="page-title"><h1>Profile</h1><p>Your RouteFlow London account, favourites and saved vehicles.</p></div>
      <div class="profile-layout">
        <article class="profile-card big"><div class="profile-avatar">${esc((state.profile.name || "Guest").slice(0, 2).toUpperCase())}</div><div><h2>${esc(state.profile.name || "Guest")}</h2><p>${esc(state.profile.email || "Local profile")}</p></div></article>
        <article class="profile-card"><h2>Edit profile</h2><input id="profileName" placeholder="Name" value="${esc(state.profile.name)}"><input id="profileEmail" placeholder="Email" value="${esc(state.profile.email)}"><button class="primary-btn" id="saveProfileBtn">Save profile</button></article>
        <article class="profile-card"><h2>Favourite vehicles</h2>${state.profile.vehicles.map((id) => `<button class="profile-link" onclick="openVehicleProfile('${esc(id)}')">${esc(id)}</button>`).join("") || "<p>No vehicle favourites yet.</p>"}</article>
        <article class="profile-card"><h2>Recent searches</h2>${state.profile.searches.map((s) => `<button class="profile-link" onclick="quickSearch('${esc(s)}')">${esc(s)}</button>`).join("") || "<p>No recent searches yet.</p>"}</article>
      </div></div>`;
    $("#saveProfileBtn")?.addEventListener("click", () => {
      state.profile.name = $("#profileName").value.trim() || "Guest";
      state.profile.email = $("#profileEmail").value.trim();
      saveProfile();
      renderProfilePage();
    });
  }

  async function loadStatus() {
    const box = $("#statusGrid");
    if (!box) return;
    try {
      const buses = await api("/Line/Mode/bus/Status", 120000, "status");
      const status = buses.some((l) => (l.lineStatuses?.[0]?.statusSeverity || 10) < 10) ? "Minor Delays" : "Good Service";
      const el = box.querySelector('[data-status="buses"]');
      if (el) { el.textContent = status; el.className = status === "Good Service" ? "good" : "delay"; }
    } catch {}
  }

  async function loadHomeArrivals() {
    const box = $("#nearArrivals");
    if (!box || box.dataset.loaded) return;
    box.dataset.loaded = "1";
    try {
      const rows = await api("/StopPoint/490011841E/Arrivals", 25000, "home-arrivals");
      box.innerHTML = rows.sort((a, b) => a.timeToStation - b.timeToStation).slice(0, 4).map((a) => `<div class="mobile-arrival"><button class="route-badge" onclick="openRoute('${esc(a.lineName)}')">${esc(a.lineName)}</button><div><strong>${esc(a.destinationName)}</strong><small>towards ${esc(a.towards || a.stationName || "London")}</small></div><button class="due-red" onclick="openVehicleProfile('${esc(a.vehicleId || "unknown")}')">${due(a.timeToStation)}</button></div>`).join("");
    } catch {}
  }

  function initArrivals() {
    const list = $("#arrivalResults");
    if (list && !list.dataset.loaded) {
      list.dataset.loaded = "1";
      list.innerHTML = '<p class="muted-note">Search a stop to load TfL arrivals.</p>';
    }
  }

  async function searchStop(q) {
    const list = $("#arrivalResults");
    if (!list) return;
    list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
      const data = await api(`/StopPoint/Search/${encodeURIComponent(q)}?modes=bus`, 60000, "stop-search");
      list.innerHTML = (data.matches || []).slice(0, 8).map((s) => `<div class="arrival-item"><span class="stop-letter">${esc(s.indicator || "•")}</span><div><strong>${esc(s.name)}</strong><small>${esc(s.id)}</small></div><button class="view-all" onclick="loadStop('${esc(s.id)}','${esc(s.name)}')">Arrivals</button></div>`).join("") || "<p>No stops found.</p>";
    } catch (e) {
      if (e.name !== "AbortError") list.innerHTML = "<p>Could not load stop search.</p>";
    }
  }

  async function loadStop(id, name) {
    const list = $("#arrivalResults");
    if (!list) return;
    addRecent(name);
    list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
      const rows = await api(`/StopPoint/${encodeURIComponent(id)}/Arrivals`, 15000, "stop-arrivals");
      list.innerHTML = `<h2>${esc(name)}</h2>` + rows.sort((a, b) => a.timeToStation - b.timeToStation).slice(0, 20).map((a) => {
        if (a.vehicleId) vehicleProfile(a.vehicleId, { route: a.lineName, destination: a.destinationName, lastSeen: name });
        return `<div class="arrival-item"><button class="route-num" onclick="openRoute('${esc(a.lineName)}')">${esc(a.lineName)}</button><div><strong>${esc(a.destinationName)}</strong><small>Vehicle ID: <button class="inline-link" onclick="openVehicleProfile('${esc(a.vehicleId || "unknown")}')">${esc(a.vehicleId || "not shown")}</button></small></div><strong class="due-red">${due(a.timeToStation)}</strong></div>`;
      }).join("");
    } catch (e) {
      if (e.name !== "AbortError") list.innerHTML = "<p>Could not load arrivals.</p>";
    }
  }
  window.loadStop = loadStop;

  async function loadRoutes() {
    const grid = $("#routesGrid");
    if (!grid || state.routesLoaded) return;
    state.routesLoaded = true;
    grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
      const lines = await api("/Line/Mode/bus", 600000, "routes-list");
      state.allRoutes = lines;
      drawRoutes(lines.slice(0, 90));
    } catch {
      grid.innerHTML = "<p>Could not load routes.</p>";
    }
  }

  function drawRoutes(lines) {
    const grid = $("#routesGrid");
    if (!grid) return;
    grid.innerHTML = lines.map((l) => `<article class="route-card"><span class="route-num">${esc(l.id)}</span><h3>${esc(l.name || `Route ${l.id}`)}</h3><p>Live TfL route information.</p><button class="view-all" onclick="openRoute('${esc(l.id)}')">Open route</button></article>`).join("");
  }

  async function openRoute(id) {
    showPage("routes");
    addRecent(id);
    const grid = $("#routesGrid");
    if (!grid) return;
    grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    try {
      const [arr, seq] = await Promise.allSettled([
        api(`/Line/${encodeURIComponent(id)}/Arrivals`, 20000, "route-arrivals"),
        api(`/Line/${encodeURIComponent(id)}/Route/Sequence/outbound`, 600000, "route-seq")
      ]);
      const vehicles = arr.status === "fulfilled" ? [...new Map(arr.value.filter((a) => a.vehicleId).map((a) => [a.vehicleId, a])).values()] : [];
      const stops = seq.status === "fulfilled" ? (seq.value.stopPointSequences?.[0]?.stopPoint || []) : [];
      vehicles.forEach((v) => vehicleProfile(v.vehicleId, { route: v.lineName, destination: v.destinationName, lastSeen: v.stationName || v.currentLocation }));
      grid.innerHTML = `<article class="route-card route-wide"><span class="route-num">${esc(id)}</span><h2>Route ${esc(id)}</h2><p>${vehicles.length} current vehicle IDs · ${stops.length} stops</p><button class="view-all" onclick="loadRoutesAgain()">Back to all routes</button></article>
        <article class="route-card route-wide"><h3>Current buses</h3><div class="vehicle-grid">${vehicles.slice(0, 14).map((v) => `<button class="vehicle-chip" onclick="openVehicleProfile('${esc(v.vehicleId)}')"><strong>${esc(v.vehicleId)}</strong><span>${esc(v.destinationName)} · ${due(v.timeToStation)}</span></button>`).join("") || "<p>No vehicles returned right now.</p>"}</div></article>
        <article class="route-card route-wide"><h3>Stops</h3><div class="stop-list">${stops.slice(0, 40).map((s, i) => `<button class="stop-row" onclick="loadStop('${esc(s.id)}','${esc(s.name || s.commonName)}')"><span>${i + 1}</span><strong>${esc(s.name || s.commonName)}</strong></button>`).join("") || "<p>No stops returned.</p>"}</div></article>`;
    } catch (e) {
      if (e.name !== "AbortError") grid.innerHTML = "<p>Could not load route.</p>";
    }
  }
  window.openRoute = openRoute;
  window.loadRoutesAgain = () => { state.routesLoaded = false; loadRoutes(); };

  function renderFleetPage() {
    const view = $("#fleet");
    if (!view) return;
    const vehicles = Object.values(state.vehicles);
    view.innerHTML = `<div class="inner-page"><div class="page-title"><h1>Fleet</h1><p>Search bus vehicle IDs and open full profiles.</p></div><input id="fleetSearchBox" class="route-list-search" placeholder="Search vehicle ID, route or destination"><div class="cards" id="fleetCards">${renderFleetCards(vehicles)}</div></div>`;
    $("#fleetSearchBox")?.addEventListener("input", (e) => {
      const t = e.target.value.toLowerCase();
      $("#fleetCards").innerHTML = renderFleetCards(vehicles.filter((v) => Object.values(v).join(" ").toLowerCase().includes(t)));
    });
  }

  function renderFleetCards(vehicles) {
    return vehicles.length ? vehicles.map((v) => `<article class="route-card"><span class="route-num">${esc(v.route)}</span><h3>${esc(v.vehicleId)}</h3><p>${esc(v.destination)} · ${esc(v.lastSeen)}</p><button class="view-all" onclick="openVehicleProfile('${esc(v.vehicleId)}')">Open profile</button></article>`).join("") : "<article class='update-card'><h2>No profiles yet</h2><p>Open a route or stop arrivals to create vehicle profiles automatically.</p></article>";
  }

  function setupInputs() {
    $("#arrivalSearch")?.addEventListener("input", (e) => {
      clearTimeout(state.stopTimer);
      state.stopTimer = setTimeout(() => e.target.value.trim() && searchStop(e.target.value.trim()), 380);
    });
    $("#routeSearch")?.addEventListener("input", (e) => {
      clearTimeout(state.routeSearchTimer);
      state.routeSearchTimer = setTimeout(() => {
        const term = e.target.value.toLowerCase();
        const filtered = state.allRoutes.filter((l) => `${l.id} ${l.name}`.toLowerCase().includes(term)).slice(0, 90);
        if (state.routesLoaded) drawRoutes(filtered);
      }, 120);
    });
  }

  setupNav();
  setupInputs();
  renderProfileWidgets();
  idle(loadStatus);
  idle(loadHomeArrivals);
})();
