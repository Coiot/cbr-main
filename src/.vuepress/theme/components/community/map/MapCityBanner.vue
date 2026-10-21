<template>
  <g class="tile-city-label" :transform="cityLabelTransform(tile)">
    <rect class="city-label-pill" :x="-width / 2" :y="-cityLabelHeight() / 2"
      :width="width" :height="cityLabelHeight()" :rx="cityLabelHeight() / 2"
      :ry="cityLabelHeight() / 2" :style="cityLabelPillStyle(tile)" />
    <template v-if="hasPopulation">
      <circle class="city-label-badge" :cx="-width / 2 + cityLabelBadgeRadius()"
        :cy="cityLabelTextY()" :r="cityLabelBadgeRadius()" :style="cityLabelBadgeStyle(tile)" />
      <text class="city-label-text city-label-pop" :x="-width / 2 + cityLabelBadgeRadius()"
        :y="cityLabelPopTextY()" dominant-baseline="middle" text-anchor="middle"
        :style="cityLabelPopTextStyle(tile)">{{ tile.city.size }}</text>
    </template>
    <text class="city-label-text city-label-name" :x="nameX" :y="cityLabelTextY()"
      dominant-baseline="middle" :text-anchor="hasPopulation ? 'start' : 'middle'" :style="cityLabelTextStyle(tile)">{{ tile.city.name }}</text>
    <circle v-if="cityHasOriginalOwnerBadge(tile)" class="city-label-original-badge"
      :cx="originalBadgeX" :cy="cityLabelTextY()"
      :r="cityLabelOriginalBadgeRadius()" :style="cityLabelOriginalOwnerStyle(tile)" />
  </g>
</template>
<script>
import { mapRenderingMethods } from './mapRendering.js';
import { ownerPalette } from '../../../../data/communityTileMap';
const bannerMethods = Object.fromEntries(Object.entries(mapRenderingMethods).filter(([name]) =>
  name.startsWith('cityLabel') || name === 'cityHasOriginalOwnerBadge'));
export default {
  props: { tile: { type: Object, required: true }, hexSize: { type: Number, required: true },
    ownerColors: { type: Object, required: true }, ownerSecondaryColors: { type: Object, required: true }, large: Boolean },
  computed: {
    ownerPalette: () => ownerPalette,
    contrastLargeCityBanners() { return this.large; },
    hasPopulation() { return Number.isFinite(this.tile.city?.size); },
    namePadding() { return this.cityLabelHeight() * 0.34; },
    originalBadgeSpace() { return this.cityHasOriginalOwnerBadge(this.tile) ? this.cityLabelOriginalBadgeRadius() * 2 + this.cityLabelHeight() * 0.2 : 0; },
    width() { return this.hasPopulation ? this.cityLabelWidth(this.tile) : this.cityLabelNameWidth(this.tile) + this.namePadding * 2 + this.originalBadgeSpace; },
    nameX() { return this.hasPopulation ? -this.width / 2 + this.cityLabelBadgeRadius() * 2 + this.cityLabelTextGap() : -this.originalBadgeSpace / 2; },
    originalBadgeX() { return (this.hasPopulation ? this.width / 2.5 : this.width / 2 - this.namePadding) - this.cityLabelOriginalBadgeRadius(); },
  },
  methods: bannerMethods,
};
</script>
<style scoped>
.tile-city-label { pointer-events: none; }
.city-label-pill {
  fill: rgba(86, 42, 36, 0.88);
  stroke: rgba(0, 0, 0, 0.7);
  stroke-width: 0.6;
}
.city-label-badge {
  fill: rgba(38, 16, 14, 0.9);
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 0.6;
}
.city-label-original-badge {
  stroke-width: 0.6;
}
.city-label-text {
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.02em;
  stroke: rgba(0, 0, 0, 0.7);
  stroke-width: 1.2;
  paint-order: stroke;
}
.city-label-pop {
  fill: #f5f1e6;
}
.city-label-name {
  font-weight: 800;
  fill: #e6c07a;
}
</style>
