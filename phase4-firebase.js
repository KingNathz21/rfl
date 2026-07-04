const RF_KEYS = ["rfl_fleet", "rfl_boards", "rfl_sightings", "rfl_recent"];
let rfFirebase = null;
let rfAuth = null;
let rfDb = null;
let rfUser = null;
let rfSyncTimer = null;
let rfCloudLoaded = false;

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
    return `<section class="account-panel"><p class="eyebrow">Signed in</p><h2>${user.email}</h2><p class="muted">Your boards, sightings, fleet records and recent searches can now sync to Firebase.</p><div class="account-actions"><button class="primary" id="syncNow">Sync now</button><button class="ghost" id="loadCloud">Load cloud data</button><button class="ghost danger" id="logoutAccount">Log out</button></div><div id="syncStatus" class="sync-status"></div></section>`;
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
  rfSyncTimer = setTimeout(rfSaveCloud, 1200);
}

function rfPatchLocalStorageSync() {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    original.apply(this, arguments);
    if (RF_KEYS.includes(key)) rfQueueSync();
  };
}

function rfInitFirebase() {
  if (!window.firebase || !window.RouteFlowFirebaseConfig) return;
  try {
    rfFirebase = firebase.initializeApp(window.RouteFlowFirebaseConfig);
    rfAuth = firebase.auth();
    rfDb = firebase.firestore();
    if (firebase.analytics) firebase.analytics();
  } catch (err) {
    if (!/already exists/i.test(err.message)) console.error(err);
    rfFirebase = firebase.app();
    rfAuth = firebase.auth();
    rfDb = firebase.firestore();
  }
  rfPatchLocalStorageSync();
  rfAuth.onAuthStateChanged(async (user) => {
    rfUser = user;
    rfRenderAccount();
    if (user) await rfLoadCloud(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#openAccount")?.addEventListener("click", () => {
    rfRenderAccount();
    document.querySelector("#accountDialog")?.showModal();
  });
  document.querySelector("#closeAccount")?.addEventListener("click", () => document.querySelector("#accountDialog")?.close());
  rfInitFirebase();
});
