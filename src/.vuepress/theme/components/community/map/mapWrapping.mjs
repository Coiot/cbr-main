// Rendering repeats are camera coordinates, never extra tiles or saved data.
export const wrapValue = (value, period) => period > 0 ? ((value % period) + period) % period : value;
export const nearestWorldX = (x, center, period) => period > 0 ? x + Math.round((center - x) / period) * period : x;

export function worldCopies(left, right, period, drawingWidth, padding = 0) {
  if (!(period > 0) || !Number.isFinite(left + right)) return [0];
  const first = Math.ceil((left - drawingWidth - padding) / period);
  const last = Math.floor((right + padding) / period);
  return Array.from({length: Math.max(0, last - first + 1)}, (_, i) => first + i);
}

export function wrappedViewportRects(x, y, width, height, period) {
  if (width >= period) return [{x: 0, y, width: period, height}];
  const start = wrapValue(x, period), firstWidth = Math.min(width, period - start);
  const result = [{x: start, y, width: firstWidth, height}];
  if (firstWidth < width) result.push({x: 0, y, width: width - firstWidth, height});
  return result;
}

export const mapWrappingComputed = {
  wrappingEnabled() { return this.horizontalWrap && !this.embedded; },
  wrapActive() { return this.wrappingEnabled && !this.wrapFitted; },
  worldPeriod() { return this.mapConfig.columns * this.hexWidth; },
  visibleWorldCopies() {
    if (!this.wrapActive) return [0];
    return worldCopies(-this.translate.x / this.scale,
      (this.viewportSize.width - this.translate.x) / this.scale,
      this.worldPeriod, this.gridWidth, this.hexSize * 8);
  },
  wrapCopies() { return this.visibleWorldCopies.filter(copy => copy !== 0); },
  wrapCopyKey() { return this.wrapCopies.join(','); },
  miniMapViewportRects() {
    if (!this.wrapActive) return [this.miniMapViewport];
    const {y, height} = this.miniMapViewport;
    return wrappedViewportRects(-this.translate.x / this.scale, y,
      this.viewportSize.width / this.scale, height, this.worldPeriod);
  },
};

export const mapWrappingMethods = {
  activateHorizontalWrap() { if (this.wrappingEnabled) this.wrapFitted = false; },
  tileWorldX(tile) {
    return this.wrapActive ? nearestWorldX(tile.x,
      (this.viewportSize.width / 2 - this.translate.x) / this.scale, this.worldPeriod) : tile.x;
  },
  syncWrappedCanvases(kind = 'terrain') {
    const source = this.$refs[`${kind}Canvas`];
    if (!source) return;
    for (const canvas of this.$refs[`${kind}WrapCanvases`] || []) {
      if (canvas.width !== source.width) canvas.width = source.width;
      if (canvas.height !== source.height) canvas.height = source.height;
      const context = canvas.getContext('2d');
      if (!context) continue;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0);
    }
  },
  refreshWrappedCanvases() {
    this.$nextTick(() => {
      if (this._mapDisposed) return;
      this.syncWrappedCanvases('terrain');
      this.syncWrappedCanvases('brush');
    });
  },
};
