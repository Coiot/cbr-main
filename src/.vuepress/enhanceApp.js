const ASSET_VERSION =
  typeof __ASSET_VERSION__ !== "undefined" ? String(__ASSET_VERSION__) : "";

const withAssetVersion = (url) => {
  if (!ASSET_VERSION || !url || typeof url !== "string") {
    return url;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    if (typeof window === "undefined") {
      return trimmed;
    }
    const sameOrigin = trimmed.startsWith(window.location.origin);
    if (!sameOrigin) {
      return trimmed;
    }
  }
  const hasQuery = trimmed.includes("?");
  const hasHash = trimmed.includes("#");
  if (hasHash) {
    const parts = trimmed.split("#");
    const base = parts.shift();
    const hash = parts.join("#");
    return `${withAssetVersion(base)}#${hash}`;
  }
  return `${trimmed}${hasQuery ? "&" : "?"}v=${encodeURIComponent(
    ASSET_VERSION
  )}`;
};

export default ({ Vue, router, siteData }) => {
  Vue.prototype.$assetUrl = withAssetVersion;

  // This ensures the script runs only on the client side
  if (typeof window !== "undefined") {
    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.onload = () => {
      kofiWidgetOverlay.draw("coiot", {
        type: "floating-chat",
        "floating-chat.donateButton.text": "Support Us",
        "floating-chat.donateButton.background-color": "#fcbf47",
        "floating-chat.donateButton.text-color": "#323842",
      });
    };
    document.body.appendChild(script);
  }
};
