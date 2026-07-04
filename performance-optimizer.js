/* RouteFlow London performance layer */
(function () {
  const TFL_HOST = "api.tfl.gov.uk";
  const routeScript = "routes-main.js";
  const loadedScripts = new Set();
  const memoryCache = new Map();
  const pending = new Map();

  function isTfL(url) {
    try { return new URL(url, location.href).hostname.includes(TFL_HOST); }
    catch { return false; }
  }

  function ttlFor(url) {
    if (/\/Arrivals/i.test(url)) return 25000;
    if (/\/Status/i.test(url)) return 120000;
    if (/\/Route\/Sequence|\/StopPoints|\/Line\/Mode\/bus/i.test(url)) return 10 * 60 * 1000;
    return 60000;
  }

  function cacheKey(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    return `${init?.method || "GET"}:${url}`;
  }

  function cachedResponse(data, response) {
    return new Response(JSON.stringify(data), {
      status: response?.status || 200,
      headers: { "Content-Type": "application/json", "X-RouteFlow-Cache": "hit" }
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function routeFlowFetch(input, init = {}) {
    const method = (init?.method || "GET").toUpperCase();
    const url = typeof input === "string" ? input : input?.url;
    if (method !== "GET" || !url || !isTfL(url)) return originalFetch(input, init);

    const key = cacheKey(input, init);
    const ttl = ttlFor(url);
    const hit = memoryCache.get(key);
    if (hit && Date.now() - hit.time < ttl) return cachedResponse(hit.data, hit.response);
    if (pending.has(key)) return cachedResponse(await pending.get(key), { status: 200 });

    const task = originalFetch(input, init)
      .then(async (res) => {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);
        if (res.ok && data !== null) memoryCache.set(key, { time: Date.now(), data, response: res });
        pending.delete(key);
        return { res, data };
      })
      .catch((err) => { pending.delete(key); throw err; });

    pending.set(key, task.then((x) => x.data));
    const result = await task;
    return result.res;
  };

  function loadScriptOnce(src) {
    if (loadedScripts.has(src) || document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    loadedScripts.add(src);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  window.RouteFlowLazy = {
    routes() { return loadScriptOnce(routeScript); }
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-route='routes'], [data-mobile-route='routes']")) {
      window.RouteFlowLazy.routes();
    }
  }, true);

  window.addEventListener("hashchange", () => {
    if (location.hash.toLowerCase().includes("route") || location.hash.toLowerCase().includes("routes")) {
      window.RouteFlowLazy.routes();
    }
  });

  window.addEventListener("load", () => {
    setTimeout(() => {
      if (location.hash.toLowerCase().includes("routes")) window.RouteFlowLazy.routes();
    }, 1200);
  });
})();
