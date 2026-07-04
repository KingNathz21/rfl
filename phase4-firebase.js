const RF_KEYS = ["rfl_fleet", "rfl_boards", "rfl_sightings", "rfl_recent"];
let rfFirebase = null;
let rfAuth = null;
let rfDb = null;
let rfRtdb = null;
let rfUser = null;
let rfSyncTimer = null;
let rfCloudLoaded = false;
let rfCommunityStarted = false;
let rfOnlineRef = null;
let rfCommunitySightings = [];
let rfOnlineUsers = 0;

(function routeFlowEarlyPerformancePatch(){
  if (window.__routeFlowPerfPatched) return;
  window.__routeFlowPerfPatched = true;
  const originalFetch = window.fetch.bind(window);
  const cache = new Map();
  const pending = new Map();
  const ttlFor = (url) => /Arrivals/i.test(url) ? 25000 : /Status/i.test(url) ? 120000 : /Line\/Mode\/bus|Route\/Sequence|StopPoints/i.test(url) ? 600000 : 60000;
  window.fetch = async function(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url;
    const method = (init.method || "GET").toUpperCase();
    if (!url || method !== "GET" || !String(url).includes("api.tfl.gov.uk")) return originalFetch(input, init);
    const key = `${method}:${url}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < ttlFor(url)) return new Response(JSON.stringify(hit.data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (pending.has(key)) return new Response(JSON.stringify(await pending.get(key)), { status: 200, headers: { "Content-Type": "application/json" } });
    const job = originalFetch(input, init).then(async (res) => {
      const data = await res.clone().json().catch(() => null);
      if (res.ok && data !== null) cache.set(key, { time: Date.now(), data });
      pending.delete(key);
      return data;
    }).catch((err) => { pending.delete(key); throw err; });
    pending.set(key, job);
    const res = await originalFetch(input, init);
    const data = await res.clone().json().catch(() => null);
    if (res.ok && data !== null) cache.set(key, { time: Date.now(), data });
    pending.delete(key);
    return res;
  };
})();

function rfGetLocalState() {
  const state = {};
  RF_KEYS.forEach((key) => {
    try { state[key] = JSON.parse(localStorage.getItem(key) || "null"); }
    catch { state[key] = null; }
  });
  state.updatedAt = new Date().toISOString();
  return state;
}

function rfApplyLocalState(state) {
  RF_KEYS.forEach((key) => {
    if (state && state[key] !== undefined && state[key] !== null) {
      localStorage.setItem(key, JSON.stringify(state[key]));
    }
  });
}

function rfAccountHtml(user) {
  if (user) {
    return `<section class="account-panel"><p class="eyebrow">Signed in</p><h2>${user.email}</h2><p class="muted">Your boards, sightings, fleet records and recent searches sync with Firebase.</p><div class="account-actions"><button class="primary" id="syncNow">Sync now</button><button class="ghost" id="loadCloud">Load cloud data</button><button class="ghost" id="publishCommunity">Publish latest sighting</button><button class="ghost danger" id="logoutAccount">Log out</button></div><div id="syncStatus" class="sync-status"></div><section class="community-panel"><h3>Community live</h3><div id="communityStats"></div><div id="communitySightings"></div></section></section>`;
  }
  return `<section class="account-panel"><p class="eyebrow">RouteFlow London account</p><h2>Log in or create an account</h2><p class="muted">Use Firebase Authentication to save favourites, stop boards, sightings and searches across devices.</p><form id="loginForm" class="stacked"><input id="loginEmail" type="email" placeholder="Email"><input id="loginPassword" type="password" placeholder="Password"><button class="primary" type="submit">Log in</button><button class="ghost" type="button" id="createAccount">Create account</button><button class="ghost" type="button" id="resetPassword">Reset password</button></form><div id="syncStatus" class="sync-status"></div></section>`;
}

function rfSetStatus(message, type = "source") {
  const el = document.querySelector("#syncStatus");
  if (el) el.innerHTML = `<span class="status-pill ${type}">${message}</span>`;
}

function rfRenderAccount() {
  const panel = document.querySelector("#accountPanel");
  const button = document.querySelector("#openAccount");
  if (!panel) return;
  panel.innerHTML = rfAccountHtml(rfUser);
  if (button) button.textContent = rfUser ? "Account" : "Log in";

  document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await rfLogin(false);
  });
  document.querySelector("#createAccount")?.addEventListener("click", () => rfLogin(true));
  document.querySelector("#resetPassword")?.addEventListener("click", rfResetPassword);
  document.querySelector("#logoutAccount")?.addEventListener("click", () => rfAuth.signOut());
  document.querySelector("#syncNow")?.addEventListener("click", rfSaveCloud);
  document.querySelector("#loadCloud")?.addEventListener("click", async () => {
    await rfLoadCloud(true);
  });
  document.querySelector("#publishCommunity")?.addEventListener("click", rfPublishLatestSighting);
  rfStartCommunityFeed();
  rfRenderCommunityPanel();
}

async function rfLogin(create) {
  const email = document.querySelector("#loginEmail")?.value.trim();
  const password = document.querySelector("#loginPassword")?.value;
  if (!email || !password) return rfSetStatus("Enter email and password", "warn");
  try {
    rfSetStatus(create ? "Creating account..." : "Logging in...", "warn");
    if (create) await rfAuth.createUserWithEmailAndPassword(email, password);
    else await rfAuth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    rfSetStatus(err.message.replace("Firebase: ", ""), "bad");
  }
}

async function rfResetPassword() {
  const email = document.querySelector("#loginEmail")?.value.trim();
  if (!email) return rfSetStatus("Enter your email first", "warn");
  try {
    await rfAuth.sendPasswordResetEmail(email);
    rfSetStatus("Password reset sent", "good");
  } catch (err) {
    rfSetStatus(err.message.replace("Firebase: ", ""), "bad");
  }
}

function rfDocRef() {
  if (!rfUser) return null;
  return rfDb.collection("users").doc(rfUser.uid).collection("routeflow").doc("state");
}

async function rfSaveCloud() {
  const ref = rfDocRef();
  if (!ref) return;
  try {
    await ref.set(rfGetLocalState(), { merge: true });
    rfSetStatus("Synced to Firebase", "good");
  } catch (err) {
    rfSetStatus("Sync failed: " + err.message, "bad");
  }
}

async function rfLoadCloud(forceReload = false) {
  const ref = rfDocRef();
  if (!ref) return;
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      await rfSaveCloud();
      rfCloudLoaded = true;
      return;
    }
    rfApplyLocalState(snap.data());
    rfCloudLoaded = true;
    rfSetStatus("Cloud data loaded", "good");
    if (forceReload) location.reload();
  } catch (err) {
    rfSetStatus("Cloud load failed: " + err.message, "bad");
  }
}

function rfQueueSync() {
  if (!rfUser || !rfCloudLoaded) return;
  clearTimeout(rfSyncTimer);
  rfSyncTimer = setTimeout(rfSaveCloud, 2500);
}

function rfPatchLocalStorageSync() {
  if (Storage.prototype.__rfPatched) return;
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    original.apply(this, arguments);
    if (RF_KEYS.includes(key)) rfQueueSync();
  };
  Storage.prototype.__rfPatched = true;
}

function rfSafeKey(value) {
  return String(value || "unknown").replace(/[.#$\/[\]]/g, "_").slice(0, 80);
}

function rfLatestLocalSighting() {
  try {
    const list = JSON.parse(localStorage.getItem("rfl_sightings") || "[]");
    return list[0] || null;
  } catch {
    return null;
  }
}

async function rfPublishLatestSighting() {
  if (!rfRtdb || !rfUser) return rfSetStatus("Realtime Database is not ready", "warn");
  const sighting = rfLatestLocalSighting();
  if (!sighting) return rfSetStatus("No sighting to publish", "warn");
  const clean = {
    vehicleId: sighting.vehicleId || "unknown",
    route: sighting.route || "unknown",
    location: sighting.location || "unknown",
    observedAt: sighting.observedAt || new Date().toISOString(),
    source: "community",
    uid: rfUser.uid,
    userEmail: rfUser.email,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  try {
    await rfRtdb.ref("community/sightings").push(clean);
    await rfRtdb.ref(`community/vehicles/${rfSafeKey(clean.vehicleId)}`).set(clean);
    rfSetStatus("Published to community live feed", "good");
  } catch (err) {
    rfSetStatus("Publish failed: " + err.message, "bad");
  }
}

function rfStartPresence() {
  if (!rfRtdb || !rfUser || rfOnlineRef) return;
  const connectedRef = rfRtdb.ref(".info/connected");
  rfOnlineRef = rfRtdb.ref(`presence/${rfUser.uid}`);
  connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
      rfOnlineRef.onDisconnect().remove();
      rfOnlineRef.set({ email: rfUser.email, onlineAt: firebase.database.ServerValue.TIMESTAMP });
    }
  });
  rfRtdb.ref("presence").on("value", (snap) => {
    rfOnlineUsers = snap.numChildren();
    rfRenderCommunityPanel();
  });
}

function rfStopPresence() {
  if (rfOnlineRef) rfOnlineRef.remove();
  rfOnlineRef = null;
}

function rfStartCommunityFeed() {
  if (!rfRtdb || rfCommunityStarted) return;
  rfCommunityStarted = true;
  rfRtdb.ref("community/sightings").limitToLast(8).on("value", (snap) => {
    const rows = [];
    snap.forEach((child) => rows.push({ id: child.key, ...child.val() }));
    rfCommunitySightings = rows.reverse();
    rfRenderCommunityPanel();
  });
}

function rfRenderCommunityPanel() {
  const stats = document.querySelector("#communityStats");
  const list = document.querySelector("#communitySightings");
  if (stats) {
    stats.innerHTML = `<div class="network-item"><strong>Online now</strong><span>${rfOnlineUsers}</span></div><div class="network-item"><strong>Live community sightings</strong><span>${rfCommunitySightings.length}</span></div>`;
  }
  if (list) {
    list.innerHTML = rfCommunitySightings.map((s) => `<article class="sighting-item"><strong>${s.vehicleId || "unknown"}</strong> route ${s.route || "unknown"}<p class="muted">${s.location || "unknown"} · ${s.userEmail || "community"}</p></article>`).join("") || `<p class="muted">No community sightings yet.</p>`;
  }
}

function rfInitFirebase() {
  if (!window.firebase || !window.RouteFlowFirebaseConfig) return;
  try {
    rfFirebase = firebase.initializeApp(window.RouteFlowFirebaseConfig);
    rfAuth = firebase.auth();
    rfDb = firebase.firestore();
    rfRtdb = firebase.database ? firebase.database() : null;
  } catch (err) {
    if (!/already exists/i.test(err.message)) console.error(err);
    rfFirebase = firebase.app();
    rfAuth = firebase.auth();
    rfDb = firebase.firestore();
    rfRtdb = firebase.database ? firebase.database() : null;
  }
  rfPatchLocalStorageSync();
  rfAuth.onAuthStateChanged(async (user) => {
    if (!user) rfStopPresence();
    rfUser = user;
    rfRenderAccount();
    if (user) {
      setTimeout(rfStartPresence, 1500);
      setTimeout(() => rfLoadCloud(false), 1200);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#openAccount")?.addEventListener("click", () => {
    rfRenderAccount();
    document.querySelector("#accountDialog")?.showModal();
  });
  document.querySelector("#closeAccount")?.addEventListener("click", () => document.querySelector("#accountDialog")?.close());
  requestAnimationFrame(rfInitFirebase);
});
