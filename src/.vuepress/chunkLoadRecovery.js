const RECOVERY_STORAGE_KEY = "cbr.chunkRecovery.v1";
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;

const chunkErrorPatterns = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i,
];

const errorMessage = (error) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  return String(error.message || error.name || error);
};

const isChunkLoadError = (error) => {
  const message = errorMessage(error);
  return chunkErrorPatterns.some((pattern) => pattern.test(message));
};

const readRecovery = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY));
  } catch (error) {
    return null;
  }
};

const writeRecovery = (target) => {
  try {
    window.sessionStorage.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({ target, attemptedAt: Date.now() })
    );
  } catch (error) {
    // Recovery still works without storage, but cannot guard repeat reloads.
  }
};

const clearRecovery = () => {
  try {
    window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch (error) {
    // Storage can be unavailable in Safari private browsing.
  }
};

const showRecoveryBanner = (target) => {
  if (document.querySelector(".chunk-recovery")) return;

  const banner = document.createElement("aside");
  banner.className = "chunk-recovery";
  banner.setAttribute("role", "alert");
  banner.setAttribute("aria-live", "assertive");

  const copy = document.createElement("span");
  copy.textContent =
    "The website was updated while this page was open. Reload to continue.";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Reload";
  button.addEventListener("click", () => {
    clearRecovery();
    window.location.assign(target);
  });

  banner.append(copy, button);
  document.body.appendChild(banner);
};

export const installChunkLoadRecovery = ({ app, router }) => {
  if (typeof window === "undefined") return;

  const recover = (error, routeTarget = "") => {
    if (!isChunkLoadError(error)) return false;

    const target = routeTarget || window.location.href;
    const previous = readRecovery();
    const isRepeat =
      previous &&
      previous.target === target &&
      Date.now() - Number(previous.attemptedAt || 0) < RECOVERY_WINDOW_MS;

    if (isRepeat) {
      showRecoveryBanner(target);
    } else {
      writeRecovery(target);
      window.location.assign(target);
    }
    return true;
  };

  const previousErrorHandler = app.config.errorHandler;
  app.config.errorHandler = (error, instance, info) => {
    if (recover(error)) return;
    if (previousErrorHandler) {
      previousErrorHandler(error, instance, info);
      return;
    }
    console.error(error);
  };

  router.onError((error, to) => {
    recover(error, to && to.fullPath ? to.fullPath : "");
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (recover(event.reason)) {
      event.preventDefault();
    }
  });

  router.isReady().then(() => {
    window.setTimeout(clearRecovery, 10000);
  });
};
