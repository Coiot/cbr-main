const ASSET_VERSION =
  typeof __ASSET_VERSION__ !== "undefined" ? String(__ASSET_VERSION__) : "";

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

export default ({ Vue, router, siteData }) => {
  Vue.prototype.$assetUrl = withAssetVersion;

  // This ensures the script runs only on the client side
  if (typeof window !== "undefined") {
    if (document.getElementById("kofi-overlay-widget-script")) {
      return;
    }
    const script = document.createElement("script");
    script.id = "kofi-overlay-widget-script";
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.onload = () => {
      try {
        if (
          typeof window.kofiWidgetOverlay !== "undefined" &&
          window.kofiWidgetOverlay &&
          typeof window.kofiWidgetOverlay.draw === "function"
        ) {
          window.kofiWidgetOverlay.draw("coiot", {
            type: "floating-chat",
            "floating-chat.donateButton.text": "Support Us",
            "floating-chat.donateButton.background-color": "#fcbf47",
            "floating-chat.donateButton.text-color": "#323842",
          });
        }
      } catch (error) {
        console.warn("Unable to initialize Ko-fi widget.", error);
      }
    };
    document.body.appendChild(script);
  }
};
