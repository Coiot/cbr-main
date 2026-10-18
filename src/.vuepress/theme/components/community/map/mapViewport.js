import { clampValue } from "./mapModel.js";

// map Viewport. Methods run on the owning Vue component instance.

export const mapViewportMethods = {
  handleResize() {
    this.isMobileView = window.innerWidth <= 900;
    if (this.isMobileView && this.editPanelCollapsed) {
      this.editPanelCollapsed = false;
    }
    this.updateViewportSize();
    if (this.hasUserViewportInteraction) {
      this.clampView();
    } else {
      this.fitToView();
    }
  },
  updateViewportSize() {
    const viewport = this.$refs.viewport;
    if (!viewport) {
      return;
    }
    const width = viewport.clientWidth || 0;
    const height = viewport.clientHeight || 0;
    this.viewportSize = {
      width,
      height,
    };
    if (!width || !height || !this.gridWidth || !this.gridHeight) {
      return;
    }
    const fitScale = Math.min(
      width / this.gridWidth,
      height / this.gridHeight
    );
    this.minScale = Math.min(0.4, fitScale);
  },
  clampView() {
    this.translate = this.clampTranslate(this.translate, this.scale);
  },
  fitToView() {
    if (!this.gridWidth || !this.gridHeight) {
      return;
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      this.updateViewportSize();
    }
    if (!this.viewportSize.width || !this.viewportSize.height) {
      return;
    }
    const scale = Math.min(
      this.viewportSize.width / this.gridWidth,
      this.viewportSize.height / this.gridHeight
    );
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, scale));
    this.translate = this.centerTranslate(this.scale);
  },
  zoomIn() {
    this.hasUserViewportInteraction = true;
    this.lockZoomRenderer();
    this.applyZoom(this.scale * 1.15);
    this.scheduleZoomRendererRelease();
  },
  zoomOut() {
    this.hasUserViewportInteraction = true;
    this.lockZoomRenderer();
    this.applyZoom(this.scale * 0.85);
    this.scheduleZoomRendererRelease();
  },
  handleScaleChange() {
    if (this.embedded && this.scale <= 1 && this.miniMapEnabled) {
      this.toggleMiniMap(false);
      return;
    }
    this.scheduleMiniMapDrawIfVisible();
  },
  scheduleMiniMapDrawIfVisible() {
    if (!this.showMiniMap) {
      return;
    }
    this.scheduleMiniMapDraw();
  },
  toggleMiniMap(nextValue) {
    this.miniMapEnabled =
      typeof nextValue === "boolean" ? nextValue : !this.miniMapEnabled;
    if (this.miniMapEnabled) {
      this.scheduleMiniMapDraw();
      return;
    }
    if (this.miniMapFrameId) {
      window.cancelAnimationFrame(this.miniMapFrameId);
      this.miniMapFrameId = null;
    }
  },
  applyZoom(nextScale, focus) {
    if (!this.gridWidth || !this.gridHeight) {
      return;
    }
    const clamped = Math.min(
      this.maxScale,
      Math.max(this.minScale, nextScale)
    );
    const viewport = this.viewportSize;
    const focusPoint = focus || {
      x: viewport.width / 2,
      y: viewport.height / 2,
    };
    const worldX = (focusPoint.x - this.translate.x) / this.scale;
    const worldY = (focusPoint.y - this.translate.y) / this.scale;
    const nextTranslate = {
      x: focusPoint.x - worldX * clamped,
      y: focusPoint.y - worldY * clamped,
    };
    this.scale = clamped;
    this.translate = this.clampTranslate(nextTranslate, clamped);
  },
  centerTranslate(scale) {
    const viewport = this.viewportSize;
    const offsetX = (viewport.width - this.gridWidth * scale) / 2;
    const offsetY = (viewport.height - this.gridHeight * scale) / 2;
    return {
      x: offsetX,
      y: offsetY,
    };
  },
  clampTranslate(translate, scale) {
    if (!this.gridWidth || !this.gridHeight) {
      return translate;
    }
    const viewport = this.viewportSize;
    const scaledWidth = this.gridWidth * scale;
    const scaledHeight = this.gridHeight * scale;
    let minX = viewport.width - scaledWidth;
    let minY = viewport.height - scaledHeight;
    if (scaledWidth <= viewport.width) {
      minX = 0;
    }
    if (scaledHeight <= viewport.height) {
      minY = 0;
    }
    const maxX = Math.max(0, viewport.width - scaledWidth);
    const maxY = Math.max(0, viewport.height - scaledHeight);
    const clamped = {
      x: clampValue(translate.x, minX, maxX),
      y: clampValue(translate.y, minY, maxY),
    };
    if (scaledWidth <= viewport.width) {
      clamped.x = (viewport.width - scaledWidth) / 2;
    }
    if (scaledHeight <= viewport.height) {
      clamped.y = (viewport.height - scaledHeight) / 2;
    }
    return clamped;
  },
  onMiniMapPointerDown(event) {
    if (!this.gridWidth || !this.gridHeight) {
      return;
    }
    const canvas = this.$refs.miniMapCanvas;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const ratioX = clampValue((event.clientX - rect.left) / rect.width, 0, 1);
    const ratioY = clampValue((event.clientY - rect.top) / rect.height, 0, 1);
    const worldX = ratioX * this.gridWidth;
    const worldY = ratioY * this.gridHeight;
    const viewport = this.viewportSize;
    const nextTranslate = {
      x: viewport.width / 2 - worldX * this.scale,
      y: viewport.height / 2 - worldY * this.scale,
    };
    this.translate = this.clampTranslate(nextTranslate, this.scale);
  },
  onWheel(event) {
    if (!this.gridWidth || !this.gridHeight) {
      return;
    }
    const viewport = this.$refs.viewport;
    if (!viewport) {
      return;
    }
    this.hasUserViewportInteraction = true;
    this.lockZoomRenderer();
    const rect = viewport.getBoundingClientRect();
    this.wheelZoomFocus = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.wheelZoomDelta += event.deltaY;
    this.scheduleWheelZoomFrame();
    this.scheduleZoomRendererRelease();
  },
  lockZoomRenderer() {
    this.clearZoomRendererRelease();
    if (!this.zoomRendererMode) {
      this.zoomRendererMode = this.scale <= 1 ? "canvas" : "svg";
    }
  },
  scheduleZoomRendererRelease(delay = 160) {
    this.clearZoomRendererRelease();
    this.zoomRendererReleaseTimer = window.setTimeout(() => {
      this.zoomRendererReleaseTimer = null;
      this.zoomRendererMode = null;
    }, delay);
  },
  clearZoomRendererRelease() {
    if (this.zoomRendererReleaseTimer) {
      window.clearTimeout(this.zoomRendererReleaseTimer);
    }
    this.zoomRendererReleaseTimer = null;
  },
  schedulePinchZoom(nextScale, focus) {
    this.pendingPinchScale = nextScale;
    this.pendingPinchFocus = focus ? { ...focus } : null;
    if (this.pinchZoomRafId !== null) {
      return;
    }
    this.pinchZoomRafId = window.requestAnimationFrame(() => {
      this.pinchZoomRafId = null;
      this.flushPinchZoom();
    });
  },
  flushPinchZoom() {
    const nextScale = this.pendingPinchScale;
    const focus = this.pendingPinchFocus;
    this.pendingPinchScale = null;
    this.pendingPinchFocus = null;
    if (Number.isFinite(nextScale)) {
      this.applyZoom(nextScale, focus);
    }
  },
  clearPinchZoomFrame(flushPending = false) {
    if (this.pinchZoomRafId !== null) {
      window.cancelAnimationFrame(this.pinchZoomRafId);
    }
    this.pinchZoomRafId = null;
    if (flushPending) {
      this.flushPinchZoom();
      return;
    }
    this.pendingPinchScale = null;
    this.pendingPinchFocus = null;
  },
  captureMapPointer(event) {
    const target = event.currentTarget;
    if (!target || typeof target.setPointerCapture !== "function") {
      return;
    }
    try {
      target.setPointerCapture(event.pointerId);
    } catch (error) {
      // A pointer can end before capture is applied during multi-touch changes.
    }
  },
  releaseMapPointer(event) {
    const target = event.currentTarget;
    if (
      !target ||
      typeof target.hasPointerCapture !== "function" ||
      typeof target.releasePointerCapture !== "function"
    ) {
      return;
    }
    try {
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    } catch (error) {
      // Pointer capture may already have been released by the browser.
    }
  },
  beginPinchGesture() {
    const points = Array.from(this.activePointers.values()).slice(0, 2);
    if (points.length < 2) {
      return;
    }
    const distance = Math.hypot(
      points[0].x - points[1].x,
      points[0].y - points[1].y
    );
    if (!distance) {
      return;
    }
    this.lockZoomRenderer();
    this.isPinching = true;
    this.touchGestureHadPinch = true;
    this.pinchStartDistance = distance;
    this.pinchStartScale = this.scale;
    const viewport = this.$refs.viewport;
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      this.pinchCenter = {
        x: (points[0].x + points[1].x) / 2 - rect.left,
        y: (points[0].y + points[1].y) / 2 - rect.top,
      };
    }
    if (this.isPaintingOwner) {
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
      this.flushBrushEdits();
    }
    this.isDragging = false;
    this.dragMoved = true;
  },
  scheduleWheelZoomFrame() {
    if (typeof window === "undefined" || this.wheelZoomRafId !== null) {
      return;
    }
    this.wheelZoomRafId = window.requestAnimationFrame(() => {
      this.wheelZoomRafId = null;
      this.flushWheelZoom();
    });
  },
  clearWheelZoomFrame() {
    if (typeof window !== "undefined" && this.wheelZoomRafId !== null) {
      window.cancelAnimationFrame(this.wheelZoomRafId);
    }
    this.wheelZoomRafId = null;
    this.wheelZoomDelta = 0;
    this.wheelZoomFocus = null;
  },
  flushWheelZoom() {
    if (!this.gridWidth || !this.gridHeight || !this.wheelZoomDelta) {
      this.wheelZoomDelta = 0;
      return;
    }
    const normalizedDelta = clampValue(this.wheelZoomDelta / 120, -4, 4);
    const multiplier = Math.pow(1.12, -normalizedDelta);
    const focus = this.wheelZoomFocus || {
      x: this.viewportSize.width / 2,
      y: this.viewportSize.height / 2,
    };
    this.wheelZoomDelta = 0;
    this.applyZoom(this.scale * multiplier, focus);
  },
};
