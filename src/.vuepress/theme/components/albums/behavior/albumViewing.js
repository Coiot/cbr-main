import { CINEMATIC_NARRATION_LAYOUT_KEY } from "./albumSettings.js";

// album Viewing. Methods run on the owning Vue component instance.

export const albumViewingComputed = {
  currentViewLabel() {
    return this.isToggle ? "Horizontal" : "Vertical";
  },
  isHorizontalView() {
    return this.isToggle;
  },
  isVerticalView() {
    return !this.isToggle;
  },
  activeScene() {
    if (!this.hasScenes) {
      return null;
    }
    return (
      this.scenes[this.activeSceneIndex] ||
      this.scenes[0] ||
      null
    );
  },
  timelineProgress() {
    if (this.sceneCount <= 1) {
      return 0;
    }
    return (this.activeSceneIndex / (this.sceneCount - 1)) * 100;
  },
};

export const albumViewingMethods = {
  normalizeViewMode(mode) {
    if (mode === "horizontal" || mode === "vertical") {
      return mode;
    }
    return "vertical";
  },
  applyViewMode(mode) {
    const normalized = this.normalizeViewMode(mode);
    this.isToggle = normalized === "horizontal";
  },
  setViewMode(mode, options = {}) {
    const { persist = true, emit = true } = options;
    const normalized = this.normalizeViewMode(mode);
    this.applyViewMode(normalized);
    if (typeof window !== "undefined" && persist) {
      window.localStorage.setItem("albumsViewMode", normalized);
    }
    if (typeof window !== "undefined" && emit) {
      window.dispatchEvent(
        new CustomEvent("user-settings-updated", {
          detail: { albumsViewMode: normalized },
        })
      );
    }
  },
  toggleView() {
    this.setViewMode(this.isToggle ? "vertical" : "horizontal");
  },
  loadCinematicSettings() {
    if (typeof window === "undefined") {
      return;
    }
    const storedLayout = window.localStorage.getItem(
      CINEMATIC_NARRATION_LAYOUT_KEY
    );
    if (storedLayout === "side" || storedLayout === "bottom") {
      this.cinematicNarrationLayout = storedLayout;
    }
  },
  setCinematicNarrationLayout(layout) {
    if (layout !== "side" && layout !== "bottom") {
      return;
    }
    this.cinematicNarrationLayout = layout;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CINEMATIC_NARRATION_LAYOUT_KEY, layout);
    }
  },
  handleCinematicFullscreenChange(isFullscreen) {
    this.isCinematicFullscreen = Boolean(isFullscreen);
    if (this.isCinematicFullscreen) {
      this.$nextTick(() => {
        this.syncSlidesToActiveScene();
      });
    }
  },
  async toggleCinematicFullscreen() {
    const overlay = this.$refs.cinematicOverlay;
    if (!overlay || typeof overlay.toggleFullscreen !== "function") {
      return;
    }
    await overlay.toggleFullscreen();
  },
  jumpToIndex(index) {
    this.jumpToScene = index + 1;
    this.goToScene();
  },
  handlePrimarySlide(event) {
    const index = Number.isInteger(event)
      ? event
      : Number(event && event.currentSlide && event.currentSlide.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.sceneCount) {
      return;
    }
    this.jumpToScene = index + 1;
    this.setActiveScene(index);
  },
  syncSlidesToActiveScene() {
    if (!this.sceneCount) {
      return;
    }
    const targetIndex = Math.min(
      Math.max(this.activeSceneIndex, 0),
      this.sceneCount - 1
    );
    const overlay = this.$refs.cinematicOverlay;
    if (
      this.isCinematicFullscreen &&
      overlay &&
      typeof overlay.syncToIndex === "function"
    ) {
      overlay.syncToIndex(targetIndex);
    }
    if (this.$refs.horizontalCarousel) {
      this.$refs.horizontalCarousel.goToSlide(targetIndex, { emit: false });
    }
  },
  goToScene(requestedScene) {
    if (!this.sceneCount) {
      return;
    }
    const requested =
      requestedScene === undefined ? this.jumpToScene : requestedScene;
    let target = parseInt(requested, 10);
    if (!Number.isFinite(target)) {
      target = 1;
    }
    target = Math.min(Math.max(target, 1), this.sceneCount);
    this.jumpToScene = target;
    const index = target - 1;
    this.setActiveScene(index);
    const overlay = this.$refs.cinematicOverlay;
    if (
      this.isCinematicFullscreen &&
      overlay &&
      typeof overlay.goToIndex === "function"
    ) {
      overlay.goToIndex(index);
      return;
    }
    if (this.isToggle && this.$refs.horizontalCarousel) {
      this.$refs.horizontalCarousel.goToSlide(index, { emit: false });
      return;
    }
    this.scrollToScene(index);
  },
  goToSceneFromMobileBar(requestedScene) {
    this.mobileJumpOpen = false;
    this.goToScene(requestedScene);
  },
  focusTimelineDot(index) {
    this.$nextTick(() => {
      const track = this.$refs.timelineTrack;
      if (!track) {
        return;
      }
      const dots = Array.from(track.querySelectorAll(".timeline-dot"));
      const target = dots[index];
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    });
  },
  handleTimelineKeydown(event) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }
    const track = this.$refs.timelineTrack;
    if (!track) {
      return;
    }
    const dots = Array.from(track.querySelectorAll(".timeline-dot"));
    if (!dots.length) {
      return;
    }
    const targetIndex = dots.indexOf(event.target);
    const currentIndex =
      targetIndex >= 0 ? targetIndex : this.activeSceneIndex || 0;
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      nextIndex = Math.min(dots.length - 1, currentIndex + 1);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = dots.length - 1;
    }
    if (nextIndex === currentIndex) {
      return;
    }
    event.preventDefault();
    this.enableTimelineFocus();
    this.jumpToIndex(nextIndex);
    this.focusTimelineDot(nextIndex);
  },
  enableTimelineFocus() {
    this.timelineFocusEnabled = true;
    if (this.timelineFocusTimeoutId) {
      clearTimeout(this.timelineFocusTimeoutId);
    }
    this.timelineFocusTimeoutId = setTimeout(() => {
      this.timelineFocusEnabled = false;
      this.timelineFocusTimeoutId = null;
    }, 1500);
  },
  setActiveScene(index) {
    if (!this.sceneCount) {
      return;
    }
    const safeIndex = Math.min(Math.max(index, 0), this.sceneCount - 1);
    this.activeSceneIndex = safeIndex;
    this.saveResumeScene(safeIndex + 1);
    this.syncTimelineFocus(safeIndex);
  },
  syncTimelineFocus(index) {
    const track = this.$refs.timelineTrack;
    if (!track) {
      return;
    }
    if (!this.timelineFocusEnabled) {
      return;
    }
    this.focusTimelineDot(index);
  },
  sceneAnchor(index) {
    return `scene-${index + 1}`;
  },
  sceneKey(scene, index) {
    return scene.scene_number || scene.slide_url || index;
  },
  sceneAlt(scene) {
    const title = scene.scene_title || scene.scene_number || "Scene";
    return `CBR In-Game Screenshot of ${title}`;
  },
  sceneTooltip(scene, index) {
    const parts = [`Scene ${scene.number}`];
    if (scene.hasDeath) {
      parts.push("Death");
    }
    if (scene.hasReporter) {
      parts.push("Reporter");
    }
    if (this.isBookmarked(index)) {
      parts.push("Bookmarked");
    }
    return parts.join(" / ");
  },
  copyLabel(index) {
    return this.copiedScene === index + 1 ? "Copied" : "Copy Link";
  },
  copySceneLink(index) {
    if (typeof window === "undefined") {
      return;
    }
    const anchor = this.sceneAnchor(index);
    const resolved = this.$router.resolve({
      path: this.$page.path,
      hash: `#${anchor}`,
    });
    const url = new URL(resolved.href, window.location.origin).toString();
    const handleCopy = () => {
      this.setCopied(index);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(handleCopy)
        .catch(() => {
          this.copyFallback(url, handleCopy);
        });
      return;
    }
    this.copyFallback(url, handleCopy);
  },
  copyFallback(url, onCopied) {
    if (typeof document === "undefined") {
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    onCopied();
  },
  setCopied(index) {
    this.copiedScene = index + 1;
    if (this._copyTimeout) {
      window.clearTimeout(this._copyTimeout);
    }
    this._copyTimeout = window.setTimeout(() => {
      this.copiedScene = null;
    }, 2000);
  },
  scrollToScene(index) {
    if (typeof document === "undefined") {
      return;
    }
    const el = document.getElementById(this.sceneAnchor(index));
    if (!el || typeof el.scrollIntoView !== "function") {
      return;
    }
    if (this._jumpScrollCleanup) {
      this._jumpScrollCleanup();
      this._jumpScrollCleanup = null;
    }
    const scroll = () =>
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    scroll();
    this.$nextTick(() => {
      scroll();
    });
    const onLoad = () => {
      if (!document.body.contains(el) || this.isToggle) {
        return;
      }
      scroll();
    };
    document.addEventListener("load", onLoad, true);
    document.addEventListener("error", onLoad, true);
    const timeoutId = window.setTimeout(() => {
      if (this._jumpScrollCleanup) {
        this._jumpScrollCleanup();
        this._jumpScrollCleanup = null;
      }
    }, 2000);
    this._jumpScrollCleanup = () => {
      document.removeEventListener("load", onLoad, true);
      document.removeEventListener("error", onLoad, true);
      window.clearTimeout(timeoutId);
    };
    const img = el.querySelector("img");
    if (img && !img.complete) {
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onLoad, { once: true });
    } else if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(scroll);
    }
  },
  handleKeydown(event) {
    if (!this.hasScenes) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const key = event.key;
    if (key === "Escape" && this.mobileJumpOpen) {
      this.mobileJumpOpen = false;
      return;
    }
    const tagName = event.target && event.target.tagName;
    const isInput =
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      (event.target && event.target.isContentEditable);
    if (isInput) {
      return;
    }
    if (
      this.isCinematicFullscreen &&
      (key === "ArrowRight" || key === "ArrowLeft")
    ) {
      event.preventDefault();
      return;
    }
    if (key === "ArrowRight" || key === "j" || key === "J") {
      event.preventDefault();
      if (key === "ArrowRight") {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
      this.enableTimelineFocus();
      this.jumpRelative(1);
      return;
    }
    if (key === "ArrowLeft" || key === "k" || key === "K") {
      event.preventDefault();
      if (key === "ArrowLeft") {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
      this.enableTimelineFocus();
      this.jumpRelative(-1);
      return;
    }
    if (key === "b" || key === "B") {
      event.preventDefault();
      this.bookmarkScene(this.activeSceneIndex);
      return;
    }
    if (key === "c" || key === "C") {
      event.preventDefault();
      this.copySceneLink(this.activeSceneIndex);
      return;
    }
    if (key === "t" || key === "T") {
      event.preventDefault();
      this.toggleView();
      return;
    }
    if (key === "f" || key === "F") {
      event.preventDefault();
      this.toggleCinematicFullscreen();
      return;
    }
    if (key === "r" || key === "R") {
      event.preventDefault();
      this.resumeToScene();
      return;
    }
    if (key === "g" || key === "G") {
      event.preventDefault();
      const jumpInput = document.getElementById(
        this.showFloatingSceneJump ? "floating-scene-jump" : "scene-jump"
      );
      if (jumpInput && typeof jumpInput.focus === "function") {
        jumpInput.focus();
      }
      return;
    }
    if (key === "Home") {
      event.preventDefault();
      this.jumpToIndex(0);
      return;
    }
    if (key === "End") {
      event.preventDefault();
      this.jumpToIndex(this.sceneCount - 1);
      return;
    }
  },
  handleVisibilityChange() {
    if (typeof document === "undefined") {
      return;
    }
    if (document.visibilityState === "hidden") {
      this.flushPendingResume(true);
    }
  },
  handleBeforeUnload() {
    this.flushPendingResume(true);
  },
  jumpRelative(delta) {
    if (!this.sceneCount) {
      return;
    }
    this.mobileJumpOpen = false;
    const nextIndex = Math.min(
      Math.max(this.activeSceneIndex + delta, 0),
      this.sceneCount - 1
    );
    this.jumpToScene = nextIndex + 1;
    this.goToScene();
  },
  handleScroll() {
    if (!this._sceneJumpObserver) {
      this.updateFloatingSceneJump();
    }
    if (this.isToggle || typeof window === "undefined") {
      return;
    }
    if (this._scrollRaf) {
      return;
    }
    this._scrollRaf = window.requestAnimationFrame(() => {
      this._scrollRaf = null;
      this.updateActiveFromScroll();
      this.checkSnapshotInView();
    });
  },
  setupSceneJumpObserver() {
    if (typeof window === "undefined") {
      return;
    }
    this.teardownSceneJumpObserver();
    this.showFloatingSceneJump = false;
    const control = this.$refs.sceneJumpControl;
    const target = control && control.$el;
    if (!target) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      this.updateFloatingSceneJump();
      return;
    }
    this._sceneJumpObserver = new IntersectionObserver((entries) => {
      const entry = entries && entries[0];
      if (!entry) {
        return;
      }
      this.showFloatingSceneJump =
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    });
    this._sceneJumpObserver.observe(target);
  },
  teardownSceneJumpObserver() {
    if (this._sceneJumpObserver) {
      this._sceneJumpObserver.disconnect();
      this._sceneJumpObserver = null;
    }
  },
  updateFloatingSceneJump() {
    if (typeof window === "undefined") {
      return;
    }
    const control = this.$refs.sceneJumpControl;
    const target = control && control.$el;
    if (!target) {
      this.showFloatingSceneJump = false;
      return;
    }
    this.showFloatingSceneJump = target.getBoundingClientRect().bottom <= 0;
  },
  updateActiveFromScroll() {
    if (!this._sceneElements || !this._sceneElements.length) {
      return;
    }
    const offset = window.innerHeight * 0.35;
    let activeIndex = 0;
    for (let i = 0; i < this._sceneElements.length; i++) {
      const rect = this._sceneElements[i].getBoundingClientRect();
      if (rect.top - offset <= 0) {
        activeIndex = i;
      } else {
        break;
      }
    }
    if (activeIndex !== this.activeSceneIndex) {
      this.activeSceneIndex = activeIndex;
      this.jumpToScene = activeIndex + 1;
      this.saveResumeScene(activeIndex + 1);
    }
  },
  cacheSceneElements() {
    if (typeof document === "undefined") {
      return;
    }
    if (this.isToggle) {
      this._sceneElements = [];
      return;
    }
    this._sceneElements = Array.from(
      document.querySelectorAll(".scenes article")
    );
  },
  getHashSceneNumber() {
    if (typeof window === "undefined") {
      return null;
    }
    const match = window.location.hash.match(/^#scene-(\d+)$/);
    if (!match) {
      return null;
    }
    const sceneNumber = parseInt(match[1], 10);
    if (!Number.isFinite(sceneNumber)) {
      return null;
    }
    return sceneNumber;
  },
  applyHashScene() {
    const sceneNumber = this.getHashSceneNumber();
    if (!sceneNumber) {
      return;
    }
    if (!this.sceneCount) {
      return;
    }
    const target = Math.min(Math.max(sceneNumber, 1), this.sceneCount);
    this.jumpToScene = target;
    this.goToScene();
  },
};
