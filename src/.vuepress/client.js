import {
  ClientOnly,
  Content,
  defineClientConfig,
} from "@vuepress/client";
import { defineAsyncComponent } from "vue";
import mediumZoom from "medium-zoom";
import { legacyPages } from "@temp/legacyPages.js";
import Layout from "./theme/Layout.vue";
import NotFound from "./theme/NotFound.vue";
import { installChunkLoadRecovery } from "./chunkLoadRecovery";

const markdownComponents = {
  "albums-Editions": () => import("./components/albums/Editions.vue"),
  "albums-Mk2List": () => import("./components/albums/Mk2List.vue"),
  "albums-OthersList": () => import("./components/albums/OthersList.vue"),
  "albums-PRList": () => import("./components/albums/PRList.vue"),
  "albums-S1List": () => import("./components/albums/S1List.vue"),
  "albums-S2List": () => import("./components/albums/S2List.vue"),
  "albums-S3List": () => import("./components/albums/S3List.vue"),
  "albums-S4List": () => import("./components/albums/S4List.vue"),
  "albums-S5List": () => import("./components/albums/S5List.vue"),
};

const withAssetVersion = (url) => {
  if (!url || typeof url !== "string") return url;
  return url.trim();
};

const retireLegacyServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (!registrations.length) return;

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
        // Safari private browsing can deny storage access.
      }
    }
  } catch (error) {
    console.warn("Unable to retire a legacy service worker.", error);
  }
};

const installLegacyGlobals = (app, siteData) => {
  const properties = app.config.globalProperties;
  siteData.value.pages = legacyPages;
  siteData.value.themeConfig = __CBR_THEME_CONFIG__;

  const defineLegacyProperty = (name, getter) => {
    if (Object.getOwnPropertyDescriptor(properties, name)) return;
    Object.defineProperty(properties, name, { get: getter });
  };
  defineLegacyProperty("$themeConfig", () => __CBR_THEME_CONFIG__);
  defineLegacyProperty("$themeLocaleConfig", () => __CBR_THEME_CONFIG__);
  defineLegacyProperty("$localeConfig", () => ({
    path: "/",
    lang: siteData.value.lang || "en-US",
  }));
  defineLegacyProperty("$localePath", () => "/");
  defineLegacyProperty("$siteTitle", () => siteData.value.title || "");
  defineLegacyProperty("$title", () => siteData.value.title || "");
  defineLegacyProperty(
    "$description",
    () => siteData.value.description || ""
  );
  properties.$assetUrl = withAssetVersion;
};

let zoomInstance = null;
let zoomObserver = null;
let zoomRefreshTimer = null;
const refreshMediumZoom = () => {
  if (typeof document === "undefined") return;
  if (!zoomInstance) {
    zoomInstance = mediumZoom({
      background: "rgba(27, 27, 27, 0.9)",
      scrollOffset: 110,
    });
  }
  const attached = new Set(zoomInstance.getImages());
  const images = Array.from(document.querySelectorAll(".medium-zoom")).filter(
    (image) => !attached.has(image)
  );
  if (images.length) zoomInstance.attach(images);
};

const queueMediumZoomRefresh = () => {
  window.clearTimeout(zoomRefreshTimer);
  zoomRefreshTimer = window.setTimeout(refreshMediumZoom, 0);
};

const startMediumZoomObserver = () => {
  refreshMediumZoom();
  if (zoomObserver || !document.body) return;
  zoomObserver = new MutationObserver((mutations) => {
    const hasZoomImage = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches(".medium-zoom") || node.querySelector(".medium-zoom"))
      )
    );
    if (hasZoomImage) queueMediumZoomRefresh();
  });
  zoomObserver.observe(document.body, { childList: true, subtree: true });
};

export default defineClientConfig({
  layouts: {
    Layout,
    NotFound,
    Page: Layout,
    Other: Layout,
    CommunitySpotlight: Layout,
    CommunityTileMap: Layout,
  },

  enhance({ app, router, siteData }) {
    installLegacyGlobals(app, siteData);
    installChunkLoadRecovery({ app, router });
    app.component("Content", Content);
    app.component("ClientOnly", ClientOnly);
    Object.entries(markdownComponents).forEach(([name, loader]) => {
      app.component(name, defineAsyncComponent(loader));
    });

    if (typeof window === "undefined") return;

    let storedThemeMode = "";
    try {
      storedThemeMode = window.localStorage.getItem("themeMode");
    } catch (error) {
      // Storage can be unavailable in Safari private browsing.
    }
    const themeMode = storedThemeMode === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", themeMode);
    document.documentElement.style.colorScheme = themeMode;

    router.afterEach(() => {
      if (zoomInstance) zoomInstance.detach();
      queueMediumZoomRefresh();
    });

    if (document.readyState === "complete") {
      retireLegacyServiceWorkers();
      startMediumZoomObserver();
    } else {
      window.addEventListener("load", retireLegacyServiceWorkers, {
        once: true,
      });
      window.addEventListener("load", startMediumZoomObserver, {
        once: true,
      });
    }
  },
});
