import { getSupabaseClient } from "./theme/supabaseClient";

const withAssetVersion = (url) => {
  if (!url || typeof url !== "string") {
    return url;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  // Temporarily disable runtime query-param cache busting to reduce
  // client/cache mismatch risk across static deploys.
  return trimmed;
};

const retireLegacyServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (!registrations.length) {
      return;
    }

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const results = await Promise.all(
      registrations.map((registration) => registration.unregister())
    );

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
    }

    if (wasControlled && results.some(Boolean)) {
      const reloadKey = "cbr.legacyServiceWorkerReloaded.v1";
      try {
        if (!window.sessionStorage.getItem(reloadKey)) {
          window.sessionStorage.setItem(reloadKey, "true");
          window.location.reload();
        }
      } catch (error) {
        // Storage can be unavailable in Safari private browsing; avoid a loop.
      }
    }
  } catch (error) {
    console.warn("Unable to retire a legacy service worker.", error);
  }
};

export default ({ Vue, router, siteData }) => {
  Vue.prototype.$assetUrl = withAssetVersion;

  // This ensures the script runs only on the client side
  if (typeof window !== "undefined") {
    const storedThemeMode = window.localStorage.getItem("themeMode");
    const themeMode = storedThemeMode === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", themeMode);
    document.documentElement.style.colorScheme = themeMode;

    // Initialize the shared client early so magic-link callbacks are consumed
    // even before specific page/layout auth handlers mount.
    getSupabaseClient();

    if (document.readyState === "complete") {
      retireLegacyServiceWorkers();
    } else {
      window.addEventListener("load", retireLegacyServiceWorkers, {
        once: true,
      });
    }
  }
};
