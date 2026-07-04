/* RouteFlow London mobile app layout + private admin controls + bug fixes */
(function () {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const html = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  let isAdmin = false;
  let adminUsers = [];

  function injectMobileStyles() {
    const css = `
      .mobile-app-top,.mobile-bottom-nav,.mobile-quick-sheet{display:none}
      [data-admin-only].locked{display:none!important}
      .admin-lock-card{background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);padding:18px;margin:16px 0}
      .admin-users-list{display:grid;gap:10px;margin-top:12px}.admin-user-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:14px;background:var(--soft);padding:12px}
      .admin-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.admin-access-grid input{width:100%}
      @media(max-width:760px){
        body{background:#f6f8fc;padding-bottom:86px;-webkit-tap-highlight-color:transparent}
        .site-header{display:none!important}.proposal-left-nav{display:none!important}body.has-left-nav main{margin-left:0!important;max-width:100%!important}
        .mobile-app-top{display:block;position:sticky;top:0;z-index:60;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-bottom:1px solid var(--line);padding:10px 12px calc(10px + env(safe-area-inset-top))}
        .mobile-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.mobile-title-row img{width:54px;height:auto}.mobile-title-row strong{font-size:1.05rem;color:var(--navy)}
        .mobile-icon-btn{border:1px solid var(--line);background:#fff;border-radius:14px;min-width:44px;height:44px;font-weight:950;color:var(--navy);box-shadow:0 8px 22px rgba(7,29,73,.08)}
        .mobile-search{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}.mobile-search input{border-radius:999px;min-height:46px;box-shadow:0 10px 24px rgba(7,29,73,.08)}.mobile-search button{border-radius:999px;background:var(--red);color:#fff;font-weight:900;padding:0 16px}
        main{padding:12px!important}.hero-card{display:none}.system-strip{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}.shortcut-grid{grid-template-columns:repeat(2,1fr)!important}.stats-grid,.card-grid,.home-grid,.route-grid,.search-grid,.split,.admin-grid{grid-template-columns:1fr!important}.home-grid{display:flex!important;flex-direction:column}.panel,.shortcut,.stat-card,.system-card,.hub-section{border-radius:20px!important;padding:14px!important;box-shadow:0 8px 26px rgba(7,29,73,.08)!important}.shortcut{min-height:72px}.shortcut .icon{width:42px;height:42px}.page-title h1{font-size:2rem}.page-title p{margin-bottom:4px}
        .toolbar{display:grid!important;grid-template-columns:1fr!important}.toolbar input,.toolbar select,.toolbar button{width:100%;max-width:none!important}.bulk-panel{display:grid!important;grid-template-columns:1fr!important}.bulk-panel input,.bulk-panel select,.bulk-panel button{max-width:none!important;width:100%}
        .map-shell{height:calc(100vh - 190px);min-height:520px}.main-map{height:100%!important;min-height:100%!important}.compact-map{min-height:260px}.map-label{font-size:.75rem;left:12px;right:auto;max-width:calc(100% - 24px)}
        dialog{width:100vw!important;max-width:100vw!important;height:92vh;margin:auto 0 0 0;border-radius:24px 24px 0 0;padding:18px;overflow:auto}.vehicle-profile{grid-template-columns:1fr!important}.vehicle-hero{min-height:150px}.profile-tabs{position:sticky;top:0;background:#fff;z-index:2;padding:8px 0}
        .mobile-bottom-nav{display:grid;position:fixed;left:0;right:0;bottom:0;z-index:70;grid-template-columns:repeat(5,1fr);gap:2px;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-top:1px solid var(--line);padding:8px 8px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -10px 28px rgba(7,29,73,.10)}
        .mobile-bottom-nav button{background:transparent;border-radius:14px;padding:7px 2px;color:var(--muted);font-size:.72rem;font-weight:850}.mobile-bottom-nav button span{display:block;font-size:1.18rem;line-height:1.1}.mobile-bottom-nav button.active{background:#fff0f1;color:var(--red)}
        .mobile-quick-sheet{display:none;position:fixed;left:10px;right:10px;bottom:84px;z-index:75;background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);padding:14px}.mobile-quick-sheet.open{display:block}.mobile-quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.mobile-quick-grid button{background:var(--soft);border-radius:16px;padding:14px;font-weight:900;color:var(--navy)}
        .arrival-row{border-radius:16px;margin:8px 0;box-shadow:0 8px 20px rgba(7,29,73,.06)}.mini-arrival{grid-template-columns:48px 1fr!important}.stop-card-head{flex-direction:column}.stop-card-head span:last-child{display:flex;gap:8px;flex-wrap:wrap}.filter-chips input{max-width:none!important;width:100%}.filter-chips{display:grid!important;grid-template-columns:1fr!important}
        table{min-width:760px}.table-wrap{border-radius:16px;border:1px solid var(--line)}
        .admin-access-grid{grid-template-columns:1fr}.admin-user-row{align-items:flex-start;flex-direction:column}.admin-user-row button{width:100%}
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function routeTo(route) {
    if (route === "admin" && !isAdmin) return showAdminLocked();
    if (window.setRoute) window.setRoute(route);
    else q(`[data-route='${route}']`)?.click();
    syncMobileActive(route);
  }

  function syncMobileActive(route) {
    qa(".mobile-bottom-nav [data-mobile-route]").forEach((b) => b.classList.toggle("active", b.dataset.mobileRoute === route));
  }

  function addMobileShell() {
    if (q(".mobile-app-top")) return;
    const top = document.createElement("section");
    top.className = "mobile-app-top";
    top.innerHTML = `<div class="mobile-title-row"><img src="assets/routeflow-london-logo.svg" alt="RouteFlow London"><strong>RouteFlow London</strong><button class="mobile-icon-btn" id="mobileAccount">👤</button></div><form id="mobileSearchForm" class="mobile-search"><input id="mobileSearch" placeholder="Search bus, stop, route..."><button>Go</button></form>`;
    document.body.prepend(top);

    const nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.innerHTML = `
      <button data-mobile-route="home" class="active"><span>⌂</span>Home</button>
      <button data-mobile-route="hub"><span>🔎</span>Live</button>
      <button data-mobile-route="boards"><span>⭐</span>Boards</button>
      <button data-mobile-route="map"><span>🗺️</span>Map</button>
      <button id="mobileMore"><span>☰</span>More</button>`;
    document.body.appendChild(nav);

    const sheet = document.createElement("section");
    sheet.className = "mobile-quick-sheet";
    sheet.id = "mobileQuickSheet";
    sheet.innerHTML = `<h3>More</h3><div class="mobile-quick-grid"><button data-mobile-route="fleet">🚌 Fleet</button><button data-mobile-route="routes">🛣 Routes</button><button data-mobile-route="sightings">📷 Sightings</button><button data-mobile-route="analytics">📈 Analytics</button><button data-mobile-route="admin" data-admin-only>🔐 Admin</button><button id="mobileCommand">⌘K Search</button></div>`;
    document.body.appendChild(sheet);

    q("#mobileSearchForm")?.addEventListener("submit", (e) => { e.preventDefault(); const value = q("#mobileSearch").value.trim(); if (value) window.search(value); });
    q("#mobileAccount")?.addEventListener("click", () => q("#openAccount")?.click());
    q("#mobileMore")?.addEventListener("click", () => q("#mobileQuickSheet")?.classList.toggle("open"));
    q("#mobileCommand")?.addEventListener("click", () => { q("#mobileQuickSheet")?.classList.remove("open"); q("#openCommand")?.click(); });
    qa("[data-mobile-route]").forEach((b) => b.addEventListener("click", () => { q("#mobileQuickSheet")?.classList.remove("open"); routeTo(b.dataset.mobileRoute); }));
  }

  function addAdminAttributes() {
    qa("[data-route='admin'], [data-mobile-route='admin'], #adminView").forEach((el) => el.setAttribute("data-admin-only", ""));
  }

  function firebaseReady() {
    return window.firebase && firebase.apps && firebase.apps.length && firebase.auth && firebase.database;
  }

  function currentUser() {
    try { return firebase.auth().currentUser; } catch { return null; }
  }

  async function checkAdmin() {
    if (!firebaseReady()) return setAdminState(false);
    const user = currentUser();
    if (!user) return setAdminState(false);
    const db = firebase.database();
    const adminsSnap = await db.ref("adminAccess").get().catch(() => null);
    const hasAnyAdmin = adminsSnap && adminsSnap.exists();
    const mySnap = await db.ref(`adminAccess/${user.uid}`).get().catch(() => null);
    setAdminState(Boolean(mySnap?.val()?.active));
    if (!hasAnyAdmin) showClaimAdmin();
  }

  function setAdminState(value) {
    isAdmin = value;
    qa("[data-admin-only]").forEach((el) => el.classList.toggle("locked", !isAdmin));
    if (!isAdmin && q("#adminView")?.classList.contains("active")) showAdminLocked();
  }

  function showAdminLocked() {
    if (window.setRoute) window.setRoute("home");
    const existing = q("#adminLockToast");
    if (existing) existing.remove();
    const card = document.createElement("section");
    card.id = "adminLockToast";
    card.className = "toast";
    card.textContent = currentUser() ? "Admin access required" : "Log in to access Admin";
    document.body.appendChild(card);
    setTimeout(() => card.remove(), 2400);
    if (!currentUser()) q("#openAccount")?.click();
  }

  function showClaimAdmin() {
    if (!q("#accountPanel")) return;
    const panel = q("#accountPanel");
    if (q("#claimAdmin")) return;
    panel.insertAdjacentHTML("beforeend", `<section class="admin-lock-card"><h3>Admin setup</h3><p class="muted">No admin account exists yet. Claim the first admin role for this Firebase project.</p><button class="primary" id="claimAdmin">Claim admin access</button></section>`);
    q("#claimAdmin")?.addEventListener("click", claimAdmin);
  }

  async function claimAdmin() {
    const user = currentUser();
    if (!user || !firebaseReady()) return;
    await firebase.database().ref(`adminAccess/${user.uid}`).set({ active: true, email: user.email, role: "owner", grantedAt: firebase.database.ServerValue.TIMESTAMP });
    await saveUserProfile(user);
    setAdminState(true);
    renderAdminPanel();
  }

  async function saveUserProfile(user) {
    if (!firebaseReady() || !user) return;
    await firebase.database().ref(`users/${user.uid}`).update({ email: user.email, uid: user.uid, lastSeen: firebase.database.ServerValue.TIMESTAMP });
  }

  async function loadAdminUsers() {
    if (!firebaseReady()) return [];
    const [usersSnap, adminsSnap] = await Promise.all([
      firebase.database().ref("users").get().catch(() => null),
      firebase.database().ref("adminAccess").get().catch(() => null)
    ]);
    const users = usersSnap?.val() || {};
    const admins = adminsSnap?.val() || {};
    adminUsers = Object.values(users).map((u) => ({ ...u, admin: Boolean(admins[u.uid]?.active), role: admins[u.uid]?.role || "user" }));
    return adminUsers;
  }

  async function grantAdminByEmail(email) {
    const match = adminUsers.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!match) return alert("That user must log in once before you can grant access.");
    await firebase.database().ref(`adminAccess/${match.uid}`).set({ active: true, email: match.email, role: "admin", grantedAt: firebase.database.ServerValue.TIMESTAMP });
    await renderAdminPanel();
  }

  async function removeAdmin(uid) {
    if (uid === currentUser()?.uid && !confirm("Remove your own admin access?")) return;
    await firebase.database().ref(`adminAccess/${uid}`).remove();
    await renderAdminPanel();
    await checkAdmin();
  }

  async function renderAdminPanel() {
    if (!q("#adminView")) return;
    if (!isAdmin) {
      q("#adminView").innerHTML = `<div class="page-title"><p>Private</p><h1>Admin</h1></div><section class="admin-lock-card"><h2>Admin access required</h2><p class="muted">Only approved admin accounts can open this tab.</p><button class="primary" onclick="document.querySelector('#openAccount')?.click()">Log in</button></section>`;
      return;
    }
    await loadAdminUsers();
    q("#adminView").innerHTML = `<div class="page-title"><p>Private</p><h1>Admin & Access</h1></div><div class="admin-grid"><section class="panel"><h2>Access control</h2><p class="muted">Give or remove private admin access. Users must log in once before they appear here.</p><div class="admin-access-grid"><input id="grantAdminEmail" placeholder="User email"><button class="primary" id="grantAdminBtn">Grant admin</button></div><div class="admin-users-list">${adminUsers.map((u) => `<div class="admin-user-row"><div><strong>${html(u.email)}</strong><p class="muted">${html(u.uid)} · ${u.admin ? html(u.role) : "no admin access"}</p></div>${u.admin ? `<button class="ghost danger" data-remove-admin="${html(u.uid)}">Remove access</button>` : `<button class="ghost" data-grant-admin="${html(u.email)}">Grant</button>`}</div>`).join("") || `<p class="muted">No users yet.</p>`}</div></section><section class="panel"><h2>Data tools</h2><button id="backupData" class="ghost">Download backup</button><button id="resetLocalData" class="ghost danger">Reset local data</button><div id="dataHealth"></div></section><section class="panel"><h2>Import fleet CSV</h2><p class="muted">Columns: vehicleId, fleetNumber, operator, garage, vehicleType, fuelType, yearBuilt, status, route, livery, photoUrl.</p><textarea id="csvInput" placeholder="vehicleId,operator,garage,vehicleType,fuelType,status,route"></textarea><button id="importCsv" class="primary">Import records</button><div id="adminOutput"></div></section></div>`;
    q("#grantAdminBtn")?.addEventListener("click", () => grantAdminByEmail(q("#grantAdminEmail").value.trim()));
    qa("[data-remove-admin]").forEach((b) => b.addEventListener("click", () => removeAdmin(b.dataset.removeAdmin)));
    qa("[data-grant-admin]").forEach((b) => b.addEventListener("click", () => grantAdminByEmail(b.dataset.grantAdmin)));
    q("#backupData")?.addEventListener("click", () => window.downloadJson ? downloadJson("routeflow-backup.json", { fleet, boards, sightings, recent }) : alert("Backup tool not ready"));
    q("#resetLocalData")?.addEventListener("click", () => { if (confirm("Reset local RouteFlow data on this device?")) { ["rfl_fleet", "rfl_boards", "rfl_sightings", "rfl_recent"].forEach((k) => localStorage.removeItem(k)); location.reload(); } });
    q("#importCsv")?.addEventListener("click", () => window.importCsv ? window.importCsv() : alert("Import tool not ready"));
    if (typeof renderDataHealth === "function") renderDataHealth();
  }

  function patchAdminRouting() {
    const original = window.setRoute;
    if (!original || original._adminPatched) return;
    const patched = function (route) {
      if (route === "admin" && !isAdmin) return showAdminLocked();
      original(route);
      if (route === "admin") renderAdminPanel();
      syncMobileActive(route);
    };
    patched._adminPatched = true;
    window.setRoute = patched;
  }

  function bugFixes() {
    window.addEventListener("error", (event) => {
      console.warn("RouteFlow caught error:", event.message);
    });
    document.addEventListener("click", (e) => {
      const routeBtn = e.target.closest("[data-route='admin']");
      if (routeBtn && !isAdmin) {
        e.preventDefault();
        e.stopPropagation();
        showAdminLocked();
      }
    }, true);
    // Keep duplicated route navs active after older scripts run.
    setInterval(() => {
      const active = q(".view.active")?.id?.replace("View", "") || "home";
      syncMobileActive(active);
      qa(".proposal-left-nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.route === active));
    }, 1200);
  }

  function initFirebaseAdminWatch() {
    const wait = setInterval(() => {
      if (!firebaseReady()) return;
      clearInterval(wait);
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) await saveUserProfile(user);
        await checkAdmin();
        if (q("#adminView")?.classList.contains("active")) await renderAdminPanel();
      });
    }, 250);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectMobileStyles();
    addMobileShell();
    addAdminAttributes();
    bugFixes();
    initFirebaseAdminWatch();
    setTimeout(() => { patchAdminRouting(); checkAdmin(); }, 500);
  });
})();
