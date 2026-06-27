const state = {
  route: "dashboard",
  fleetPage: 1,
  pageSize: 6,
  fleetSort: "fleetNumber",
  activeBoard: 0,
  adminTab: "dashboard",
  user: { name: "Admin user", role: "Admin", email: "admin@routeflow.ldn" },
};

const networkSummary = [
  { label: "Current bus routes in London", value: "675", detail: "Approximate 2025 public network baseline" },
  { label: "London bus fleet", value: "8,797", detail: "Public TfL fleet audit baseline" },
  { label: "Tracked in Routeflow", value: "8", detail: "Sample fleet records in this first version" },
];

const contentPreviews = [
  {
    icon: "FD",
    title: "Fleet Database",
    route: "fleet",
    text: "Search buses by fleet number, registration, operator, garage, vehicle type, fuel type, status, and last seen record.",
  },
  {
    icon: "SB",
    title: "Stop Boards",
    route: "boards",
    text: "Create favourite stop boards, rename them, reorder stops, and prepare them for 20-second TfL arrivals refreshes.",
  },
  {
    icon: "LM",
    title: "Live Map",
    route: "map",
    text: "Preview vehicle markers, favourite stops, route overlays, and last-seen positions in one map-focused view.",
  },
  {
    icon: "AP",
    title: "Admin Panel",
    route: "admin",
    text: "Manage buses, users, imports, settings, route notes, sightings, analytics, and audit history from a separate area.",
  },
];

const buses = [
  {
    fleetNumber: "LTZ 1045",
    registration: "LTZ1045",
    operator: "London Transit",
    garage: "Camberwell",
    vehicleType: "New Routemaster",
    fuelType: "Hybrid",
    status: "Active",
    lastSeen: "21:18",
    route: "12",
    location: "Oxford Circus",
    notes: "Excellent condition. Recently transferred from route 24 observations.",
  },
  {
    fleetNumber: "VH 45123",
    registration: "LJ71 AAE",
    operator: "Metroline",
    garage: "Holloway",
    vehicleType: "Volvo B5LH",
    fuelType: "Hybrid",
    status: "Active",
    lastSeen: "21:11",
    route: "43",
    location: "London Bridge",
    notes: "High-frequency sighting on core corridor.",
  },
  {
    fleetNumber: "EH 39014",
    registration: "YX20 OJC",
    operator: "Stagecoach",
    garage: "West Ham",
    vehicleType: "Enviro400H",
    fuelType: "Hybrid",
    status: "Maintenance",
    lastSeen: "18:02",
    route: "25",
    location: "Ilford",
    notes: "Marked for engineering inspection.",
  },
  {
    fleetNumber: "EV 9801",
    registration: "LK74 EVC",
    operator: "Arriva London",
    garage: "Brixton",
    vehicleType: "Electroliner",
    fuelType: "Electric",
    status: "Active",
    lastSeen: "20:55",
    route: "133",
    location: "Bank",
    notes: "Electric allocation candidate.",
  },
  {
    fleetNumber: "DE 20177",
    registration: "SN19 BBD",
    operator: "Go-Ahead London",
    garage: "Merton",
    vehicleType: "Enviro200 MMC",
    fuelType: "Diesel",
    status: "Active",
    lastSeen: "20:41",
    route: "200",
    location: "Raynes Park",
    notes: "Seen repeatedly on local short workings.",
  },
  {
    fleetNumber: "BYD 303",
    registration: "LF72 EBU",
    operator: "London United",
    garage: "Fulwell",
    vehicleType: "BYD D8UR-DD",
    fuelType: "Electric",
    status: "Active",
    lastSeen: "19:47",
    route: "94",
    location: "Acton Green",
    notes: "Quiet runner. Photo needed for profile completeness.",
  },
  {
    fleetNumber: "TE 1742",
    registration: "LK10 BNU",
    operator: "Metroline",
    garage: "Potters Bar",
    vehicleType: "Enviro400",
    fuelType: "Diesel",
    status: "Withdrawn",
    lastSeen: "12 Jun",
    route: "84",
    location: "Barnet",
    notes: "Kept for historic record and coverage charts.",
  },
  {
    fleetNumber: "WVL 475",
    registration: "LX59 CZA",
    operator: "Go-Ahead London",
    garage: "Putney",
    vehicleType: "Wright Eclipse Gemini",
    fuelType: "Diesel",
    status: "Active",
    lastSeen: "20:03",
    route: "14",
    location: "South Kensington",
    notes: "Rare modern sighting; verify next week.",
  },
];

const activities = [
  "LTZ 1045 sighted on route 12 at Oxford Circus",
  "New photo link uploaded for BYD 303",
  "Bank Station added to Central board",
  "CSV import preview detected 2 duplicate fleet records",
  "Admin changed EV 9801 status to Active",
];

const routes = [
  { number: "12", status: "Good service", stops: 41, liveBuses: 18, observations: "Frequent LT allocation today", note: "Featured central route" },
  { number: "43", status: "Minor delays", stops: 48, liveBuses: 21, observations: "Two Metroline hybrids bunching southbound", note: "Peak monitoring" },
  { number: "94", status: "Good service", stops: 37, liveBuses: 14, observations: "Electric vehicles visible at Acton", note: "Electric coverage" },
  { number: "200", status: "Good service", stops: 32, liveBuses: 9, observations: "Local short workings active", note: "Favourite route" },
];

let boards = [
  {
    name: "Central Watch",
    stops: [
      { name: "Bank Station", arrivals: ["12 to Dulwich Library - 3 min", "43 to Friern Barnet - 8 min"] },
      { name: "Oxford Circus", arrivals: ["94 to Acton Green - 2 min", "12 to Oxford Circus - 11 min"] },
    ],
  },
  {
    name: "South London",
    stops: [
      { name: "Waterloo Road", arrivals: ["243 to Wood Green - 5 min", "76 to Tottenham Hale - 13 min"] },
      { name: "Brixton Station", arrivals: ["133 to Streatham - 4 min", "59 to Euston - 7 min"] },
    ],
  },
];

let sightings = [
  { fleet: "LTZ 1045", route: "12", location: "Oxford Circus", photo: "https://photos.example/ltz1045", time: "21:18", status: "Approved" },
  { fleet: "EV 9801", route: "133", location: "Bank", photo: "https://photos.example/ev9801", time: "20:55", status: "Pending" },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function init() {
  bindNavigation();
  bindFleet();
  bindBoards();
  bindSightings();
  bindAdmin();
  bindAuth();
  renderDashboard();
  renderFleet();
  renderBoards();
  renderRoutes();
  renderSightings();
  renderAdmin();
}

function bindNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });
  $$("[data-jump-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.jumpRoute));
  });
  $("#globalSearch").addEventListener("input", (event) => renderGlobalSearch(event.target.value));
  $("#refreshLiveData").addEventListener("click", () => {
    activities.unshift(`Live data refreshed at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    renderDashboard();
  });
}

function setRoute(route) {
  state.route = route;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.route === route));
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${route}View`).classList.add("active");
}

function renderDashboard() {
  const activeBuses = buses.filter((bus) => bus.status === "Active").length;
  const stats = [
    ...networkSummary,
    { label: "Active buses in app", value: activeBuses, detail: "Tracking from sightings and arrivals" },
    { label: "Active routes in app", value: routes.length, detail: "Routes with observations today" },
    { label: "New sightings today", value: sightings.length, detail: "Manual and TfL-derived records" },
  ];
  $("#contentPreviewGrid").innerHTML = contentPreviews.map((preview) => `
    <article class="preview-card">
      <span class="preview-icon">${preview.icon}</span>
      <h2>${preview.title}</h2>
      <p>${preview.text}</p>
      <button class="ghost-button" data-preview-route="${preview.route}">Open</button>
    </article>
  `).join("");
  $("#contentPreviewGrid").querySelectorAll("[data-preview-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.previewRoute));
  });
  $("#statsGrid").innerHTML = stats.map((stat) => `
    <article class="stat-card">
      <small>${stat.label}</small>
      <strong>${stat.value}</strong>
      <span class="muted">${stat.detail}</span>
    </article>
  `).join("");
  $("#activityFeed").innerHTML = activities.slice(0, 6).map((activity) => `<li class="activity-item">${activity}</li>`).join("");
  $("#networkStatus").innerHTML = [
    ["TfL Unified API", "Online", "good"],
    ["Arrivals cache", "Warm", "good"],
    ["Photo media", "Needs review", "warn"],
    ["Import queue", "Idle", "good"],
  ].map(([name, status, level]) => `
    <div class="network-item">
      <strong>${name}</strong>
      <span class="status-pill ${level}">${status}</span>
    </div>
  `).join("");
}

function bindFleet() {
  ["fleetSearch", "operatorFilter", "fuelFilter", "statusFilter"].forEach((id) => {
    $(`#${id}`).addEventListener("input", () => {
      state.fleetPage = 1;
      renderFleet();
    });
  });
  $$(".sort-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.fleetSort = button.dataset.sort;
      renderFleet();
    });
  });
  $("#prevPage").addEventListener("click", () => {
    state.fleetPage = Math.max(1, state.fleetPage - 1);
    renderFleet();
  });
  $("#nextPage").addEventListener("click", () => {
    state.fleetPage += 1;
    renderFleet();
  });
  populateFilters();
}

function populateFilters() {
  fillSelect("#operatorFilter", "All operators", unique(buses.map((bus) => bus.operator)));
  fillSelect("#fuelFilter", "All fuel types", unique(buses.map((bus) => bus.fuelType)));
  fillSelect("#statusFilter", "All statuses", unique(buses.map((bus) => bus.status)));
}

function fillSelect(selector, label, options) {
  $(selector).innerHTML = [`<option value="">${label}</option>`, ...options.map((option) => `<option>${option}</option>`)].join("");
}

function unique(values) {
  return [...new Set(values)].sort();
}

function getFilteredFleet() {
  const term = $("#fleetSearch")?.value.trim().toLowerCase() || "";
  const operator = $("#operatorFilter")?.value || "";
  const fuel = $("#fuelFilter")?.value || "";
  const status = $("#statusFilter")?.value || "";
  return buses
    .filter((bus) => !term || Object.values(bus).some((value) => String(value).toLowerCase().includes(term)))
    .filter((bus) => !operator || bus.operator === operator)
    .filter((bus) => !fuel || bus.fuelType === fuel)
    .filter((bus) => !status || bus.status === status)
    .sort((a, b) => String(a[state.fleetSort]).localeCompare(String(b[state.fleetSort]), undefined, { numeric: true }));
}

function renderFleet() {
  const filtered = getFilteredFleet();
  const maxPage = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.fleetPage = Math.min(state.fleetPage, maxPage);
  const pageRows = filtered.slice((state.fleetPage - 1) * state.pageSize, state.fleetPage * state.pageSize);
  $("#fleetCount").textContent = `${filtered.length} vehicles found`;
  $("#fleetTable").innerHTML = pageRows.map((bus, index) => `
    <tr data-bus-index="${buses.indexOf(bus)}">
      <td><strong>${bus.fleetNumber}</strong></td>
      <td>${bus.registration}</td>
      <td>${bus.operator}</td>
      <td>${bus.garage}</td>
      <td>${bus.vehicleType}</td>
      <td>${bus.fuelType}</td>
      <td><span class="status-pill ${bus.status === "Active" ? "good" : bus.status === "Maintenance" ? "warn" : "bad"}">${bus.status}</span></td>
      <td>${bus.lastSeen}</td>
    </tr>
  `).join("");
  $("#fleetTable").querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => openBusProfile(buses[Number(row.dataset.busIndex)]));
  });
  $("#pageLabel").textContent = `Page ${state.fleetPage} of ${maxPage}`;
  $("#prevPage").disabled = state.fleetPage === 1;
  $("#nextPage").disabled = state.fleetPage === maxPage;
}

function openBusProfile(bus) {
  $("#busProfile").innerHTML = `
    <div class="bus-profile-grid">
      <section>
        <p class="eyebrow">Bus profile</p>
        <h1>${bus.fleetNumber}</h1>
        <p>${bus.registration} · ${bus.operator}</p>
        <div class="photo-strip">
          <div class="bus-photo"></div>
          <div class="bus-photo"></div>
          <div class="bus-photo"></div>
        </div>
        <div class="network-item"><strong>Garage</strong><span>${bus.garage}</span></div>
        <div class="network-item"><strong>Vehicle Type</strong><span>${bus.vehicleType}</span></div>
        <div class="network-item"><strong>Fuel Type</strong><span>${bus.fuelType}</span></div>
        <div class="network-item"><strong>Status</strong><span>${bus.status}</span></div>
      </section>
      <section>
        <h2>Notes</h2>
        <p>${bus.notes}</p>
        <h2>Last Seen</h2>
        <p>${bus.lastSeen} on route ${bus.route} at ${bus.location}</p>
        <h2>Sightings Timeline</h2>
        <div class="timeline">
          <div class="timeline-item"><strong>${bus.lastSeen}</strong><br>${bus.location} on route ${bus.route}</div>
          <div class="timeline-item"><strong>Yesterday</strong><br>Imported from TfL arrivals cache</div>
          <div class="timeline-item"><strong>Last week</strong><br>Manual sighting approved by admin</div>
        </div>
        <h2>Route History</h2>
        <p>${bus.route}, ${routes.map((route) => route.number).filter((route) => route !== bus.route).slice(0, 2).join(", ")}</p>
      </section>
    </div>
  `;
  $("#busDialog").showModal();
}

function bindBoards() {
  $("#addBoard").addEventListener("click", () => {
    boards.push({ name: `Board ${boards.length + 1}`, stops: [] });
    state.activeBoard = boards.length - 1;
    renderBoards();
  });
  $("#renameBoard").addEventListener("click", () => {
    const name = prompt("Board name", boards[state.activeBoard].name);
    if (name) {
      boards[state.activeBoard].name = name;
      renderBoards();
    }
  });
  $("#addStopForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#stopInput");
    if (!input.value.trim()) return;
    boards[state.activeBoard].stops.push({ name: input.value.trim(), arrivals: ["Live arrivals pending", "TfL refresh in 20 seconds"] });
    input.value = "";
    renderBoards();
  });
}

function renderBoards() {
  $("#boardList").innerHTML = boards.map((board, index) => `
    <button class="board-item" data-board="${index}">
      <strong>${board.name}</strong><br>
      <span class="muted">${board.stops.length} favourite stops</span>
    </button>
  `).join("");
  $("#boardList").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeBoard = Number(button.dataset.board);
      renderBoards();
    });
  });
  const board = boards[state.activeBoard];
  $("#activeBoardName").textContent = board.name;
  $("#stopArrivals").innerHTML = board.stops.map((stop, index) => `
    <article class="arrival-item">
      <div class="panel-heading">
        <strong>${index + 1}. ${stop.name}</strong>
        <span>
          <button class="ghost-button" data-move-up="${index}">Up</button>
          <button class="ghost-button" data-move-down="${index}">Down</button>
        </span>
      </div>
      ${stop.arrivals.map((arrival) => `<p class="muted">${arrival}</p>`).join("")}
    </article>
  `).join("");
  $("#stopArrivals").querySelectorAll("[data-move-up]").forEach((button) => button.addEventListener("click", () => moveStop(Number(button.dataset.moveUp), -1)));
  $("#stopArrivals").querySelectorAll("[data-move-down]").forEach((button) => button.addEventListener("click", () => moveStop(Number(button.dataset.moveDown), 1)));
}

function moveStop(index, direction) {
  const stops = boards[state.activeBoard].stops;
  const next = index + direction;
  if (next < 0 || next >= stops.length) return;
  [stops[index], stops[next]] = [stops[next], stops[index]];
  renderBoards();
}

function renderRoutes() {
  $("#routesGrid").innerHTML = routes.map((route) => `
    <article class="route-card">
      <span class="route-number">${route.number}</span>
      <h2>${route.status}</h2>
      <p class="muted">${route.note}</p>
      <p><strong>${route.stops}</strong> stops · <strong>${route.liveBuses}</strong> live buses</p>
      <p>${route.observations}</p>
      <div class="map-panel" style="min-height: 150px; box-shadow: none;">
        <div class="route-line route-line-a"></div>
        <button class="map-marker bus-marker" style="--x: 54%; --y: 45%;">${route.liveBuses}</button>
      </div>
    </article>
  `).join("");
}

function bindSightings() {
  $("#sightingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const sighting = {
      fleet: $("#sightingFleet").value.trim(),
      route: $("#sightingRoute").value.trim(),
      location: $("#sightingLocation").value.trim(),
      photo: $("#sightingPhoto").value.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Pending",
    };
    if (!sighting.fleet || !sighting.location) return;
    sightings.unshift(sighting);
    activities.unshift(`${sighting.fleet} sighting submitted at ${sighting.location}`);
    event.target.reset();
    renderSightings();
    renderDashboard();
  });
  $("#exportSightings").addEventListener("click", () => {
    const csv = ["Fleet,Route,Location,Photo,Time,Status", ...sightings.map((s) => `${s.fleet},${s.route},${s.location},${s.photo},${s.time},${s.status}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "routeflow-sightings.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function renderSightings() {
  $("#sightingList").innerHTML = sightings.map((sighting) => `
    <article class="sighting-item">
      <strong>${sighting.fleet}</strong> on route ${sighting.route || "unknown"}
      <p class="muted">${sighting.location} · ${sighting.time} · ${sighting.status}</p>
      ${sighting.photo ? `<a href="${sighting.photo}" target="_blank" rel="noreferrer">Photo link</a>` : ""}
    </article>
  `).join("");
}

function bindAdmin() {
  $$(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminTab = button.dataset.adminTab;
      $$(".admin-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      renderAdmin();
    });
  });
}

function renderAdmin() {
  const content = {
    dashboard: renderAdminDashboard,
    fleet: renderAdminFleet,
    csv: renderAdminCsv,
    users: renderAdminUsers,
    analytics: renderAdminAnalytics,
    settings: renderAdminSettings,
    audit: renderAdminAudit,
  }[state.adminTab]();
  $("#adminContent").innerHTML = content;
}

function renderAdminDashboard() {
  return `
    <div class="admin-stat-grid">
      ${[
        ["Total buses", buses.length],
        ["Total users", 12],
        ["Total sightings", sightings.length],
        ["Total routes", routes.length],
        ["API status", "Online"],
        ["Server health", "99.9%"],
      ].map(([label, value]) => `<article class="admin-card"><span class="muted">${label}</span><h2>${value}</h2></article>`).join("")}
    </div>
  `;
}

function renderAdminFleet() {
  return `
    <section class="panel">
      <div class="panel-heading"><h2>Fleet Management</h2><button class="solid-button">Add bus</button></div>
      <p class="muted">Add, edit, delete buses, upload photos, edit operators, garages, vehicle types, and status.</p>
      <div class="table-wrap">${miniFleetTable()}</div>
    </section>
  `;
}

function miniFleetTable() {
  return `
    <table>
      <thead><tr><th>Fleet</th><th>Operator</th><th>Garage</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${buses.slice(0, 5).map((bus) => `<tr><td>${bus.fleetNumber}</td><td>${bus.operator}</td><td>${bus.garage}</td><td>${bus.status}</td><td><button class="ghost-button">Edit</button></td></tr>`).join("")}</tbody>
    </table>
  `;
}

function renderAdminCsv() {
  return `
    <section class="panel">
      <h2>CSV Import</h2>
      <form class="stacked-form">
        <input type="file" accept=".csv,.xlsx,.xls">
        <button class="solid-button" type="button">Preview import</button>
      </form>
      <p class="muted">Preview includes fleet numbers, registrations, operators, garages, vehicle types, and duplicate detection.</p>
    </section>
  `;
}

function renderAdminUsers() {
  return `
    <section class="panel">
      <div class="panel-heading"><h2>User Management</h2><button class="solid-button">Create user</button></div>
      ${["Admin user - Admin", "Fleet contributor - User", "Suspended importer - Suspended"].map((user) => `<div class="network-item"><strong>${user}</strong><button class="ghost-button">Manage</button></div>`).join("")}
    </section>
  `;
}

function renderAdminAnalytics() {
  return `
    <div class="routes-grid">
      ${["Most active buses", "Most seen routes", "Operator statistics", "Fleet coverage", "Rare sightings", "Activity over time"].map((chart, index) => `
        <article class="route-card">
          <h2>${chart}</h2>
          <div class="map-panel" style="min-height: 140px; box-shadow: none;">
            <div class="route-line ${index % 2 ? "route-line-b" : "route-line-a"}"></div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAdminSettings() {
  return `
    <section class="panel">
      <h2>Website Settings</h2>
      <form class="stacked-form">
        <input value="Routeflow LDN" aria-label="Site name">
        <input value="routeflow-logo.svg" aria-label="Logo">
        <select><option>Professional light theme</option><option>High contrast theme</option></select>
        <input value="20" aria-label="Cache timings">
        <button class="solid-button" type="button">Save settings</button>
      </form>
    </section>
  `;
}

function renderAdminAudit() {
  return `
    <section class="panel">
      <h2>Audit Logs</h2>
      ${[
        ["Admin user", "21:20", "Changed bus status", "127.0.0.1", "Maintenance", "Active"],
        ["Admin user", "21:04", "Imported CSV preview", "127.0.0.1", "0 rows", "8 rows"],
        ["Fleet contributor", "20:48", "Submitted sighting", "127.0.0.1", "none", "Pending sighting"],
      ].map(([user, time, action, ip, previous, next]) => `<div class="network-item"><strong>${action}</strong><p class="muted">${user} · ${time} · ${ip} · ${previous} -> ${next}</p></div>`).join("")}
    </section>
  `;
}

function bindAuth() {
  $("[data-open-auth='login']").addEventListener("click", () => openAuth("login"));
  $("[data-open-auth='register']").addEventListener("click", () => openAuth("register"));
  $("#closeAuthDialog").addEventListener("click", () => $("#authDialog").close());
  $("#closeBusDialog").addEventListener("click", () => $("#busDialog").close());
  $$(".auth-tab").forEach((button) => button.addEventListener("click", () => openAuth(button.dataset.authTab, false)));
}

function openAuth(tab, show = true) {
  $$(".auth-tab").forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  const forms = {
    login: ["Email", "Password"],
    register: ["Name", "Email", "Password"],
    reset: ["Email"],
    profile: ["Name", "Email", "Role"],
  };
  $("#authForm").innerHTML = forms[tab].map((label) => `<input placeholder="${label}" value="${tab === "profile" && label === "Role" ? state.user.role : ""}">`).join("") +
    `<button class="solid-button" type="button">${tab === "reset" ? "Send reset link" : tab === "profile" ? "Save profile" : tab === "register" ? "Create account" : "Log in"}</button>
     <button class="ghost-button" type="button" id="logoutButton">Logout</button>`;
  $("#logoutButton").addEventListener("click", () => {
    $("#authDialog").close();
    alert("Logged out locally. Backend JWT flow is ready for implementation.");
  });
  if (show) $("#authDialog").showModal();
}

function renderGlobalSearch(query) {
  const term = query.trim().toLowerCase();
  if (!term) {
    $("#searchResults").classList.add("hidden");
    $("#searchResults").innerHTML = "";
    return;
  }
  const busResults = buses.filter((bus) => Object.values(bus).some((value) => String(value).toLowerCase().includes(term)));
  const routeResults = routes.filter((route) => Object.values(route).some((value) => String(value).toLowerCase().includes(term)));
  const stopResults = boards.flatMap((board) => board.stops.map((stop) => ({ ...stop, board: board.name }))).filter((stop) => stop.name.toLowerCase().includes(term));
  $("#searchResults").classList.remove("hidden");
  $("#searchResults").innerHTML = `
    <strong>Search results</strong>
    ${[...busResults.map((bus) => `Fleet ${bus.fleetNumber} · ${bus.registration} · ${bus.operator} · ${bus.garage}`),
      ...routeResults.map((route) => `Route ${route.number} · ${route.status}`),
      ...stopResults.map((stop) => `Stop ${stop.name} · ${stop.board}`)]
      .slice(0, 8)
      .map((result) => `<div class="network-item">${result}</div>`)
      .join("") || `<p class="muted">No matching fleet numbers, registrations, stops, routes, operators, or garages.</p>`}
  `;
}

window.addEventListener("DOMContentLoaded", init);
