<template>
  <section class="home-map" aria-labelledby="home-map-title">
    <div class="home-map-header">
      <div class="home-map-copy">
        <h2 id="home-map-title">Community Tile Map</h2>
        <p>
          Explore the live, community-maintained map. Pan, zoom, and see who
          controls each tile.
        </p>
      </div>
      <div class="home-map-actions">
        <router-link class="home-map-link" to="/community-tile-map/">
          Open Full Map
        </router-link>
      </div>
    </div>
    <div class="home-map-embed">
      <div v-if="!shouldRenderMap" class="home-map-placeholder">
        <div class="home-map-placeholder-card">
          <p>
            Tap to load the live map. It can use more memory on mobile devices.
          </p>
          <button type="button" class="home-map-load" @click="requestMap">
            Load Map
          </button>
        </div>
      </div>
      <ClientOnly v-else>
        <keep-alive>
          <CommunityTileMapGrid
            ref="map"
            embedded
            @hook:mounted="onMapMounted"
          />
        </keep-alive>
      </ClientOnly>
      <div
        v-if="shouldRenderMap"
        class="home-map-zoom"
        :class="{ 'is-disabled': !mapMounted }"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          class="home-map-zoom-button"
          aria-label="Zoom in"
          @click="zoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="home-map-zoom-button"
          aria-label="Zoom out"
          @click="zoomOut"
        >
          &minus;
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import CommunityTileMapGrid from "../community/CommunityTileMapGrid.vue";

export default {
  name: "HomeCommunityMap",
  components: {
    CommunityTileMapGrid,
  },
  data() {
    const isMobileBrowser =
      typeof navigator !== "undefined"
        ? /Mobi|Android|iP(hone|ad|od)/.test(navigator.userAgent || "")
        : false;
    return {
      mapMounted: false,
      mapRequested: false,
      isMobileBrowser,
    };
  },
  computed: {
    shouldRenderMap() {
      return !this.isMobileBrowser || this.mapRequested;
    },
  },
  methods: {
    onMapMounted() {
      this.mapMounted = true;
    },
    requestMap() {
      this.mapRequested = true;
    },
    zoomIn() {
      const map = this.$refs.map;
      if (map && typeof map.zoomIn === "function") {
        map.zoomIn();
      }
    },
    zoomOut() {
      const map = this.$refs.map;
      if (map && typeof map.zoomOut === "function") {
        map.zoomOut();
      }
    },
  },
};
</script>

<style scoped>
.home-map {
  border: 1px solid rgba(255, 191, 70, 0.25);
  border-radius: 18px;
  background: linear-gradient(135deg, #0b0b0b 0%, #17130a 100%);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  margin-block: 3rem 0;
}

.home-map-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-block-end: 1.2rem;
}

.home-map-copy h2 {
  color: #fff;
  font-size: 2rem;
  font-weight: 900;
  margin: 0 0 0.4rem;
}

.home-map-copy p {
  max-width: 70ch;
  color: color-mix(in srgb, #fff, transparent 35%);
  margin: 0;
}

.home-map-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.home-map-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.2rem;
  color: #1a1a1a;
  font-weight: 800;
  text-decoration: none;
  border: 1px solid #f6c55b;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffbf46 0%, #f7a726 100%);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.home-map-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.3);
}

.home-map-embed {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  overscroll-behavior: contain;
}

.home-map-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 24rem;
  padding: 1.5rem;
  background: rgba(10, 10, 10, 0.9);
}

.home-map-placeholder-card {
  display: grid;
  gap: 0.9rem;
  max-inline-size: 32ch;
  text-align: center;
  color: color-mix(in srgb, #fff, transparent 30%);
}

.home-map-placeholder-card p {
  margin: 0;
}

.home-map-load {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid #f6c55b;
  background: linear-gradient(135deg, #ffbf46 0%, #f7a726 100%);
  color: #1a1a1a;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.home-map-load:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.3);
}

.home-map-zoom {
  position: absolute;
  inset-block-start: 1rem;
  inset-inline-end: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.home-map-embed:hover .home-map-zoom,
.home-map-embed:focus-within .home-map-zoom {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.home-map-zoom.is-disabled {
  pointer-events: none;
}

.home-map-zoom-button {
  inline-size: 2.4rem;
  block-size: 2.4rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(12, 12, 12, 0.7);
  color: #fff;
  font-size: 1.4rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, background 0.2s ease;
}

.home-map-zoom-button:hover {
  transform: translateY(-1px);
  background: rgba(20, 20, 20, 0.85);
}

.home-map :deep(.tile-map) {
  gap: 1rem;
}

.home-map :deep(.tile-map-meta) {
  display: none;
}

.home-map :deep(.tile-map-controls) {
  display: none;
}

.home-map :deep(.tile-map-body) {
  grid-template-columns: 1fr;
}

.home-map :deep(.tile-map-info) {
  display: none;
}

.home-map :deep(.tile-map-legend) {
  display: none;
}

.home-map :deep(.tile-legend-accordion) {
  display: none;
}

.home-map :deep(.tile-map-viewport) {
  min-block-size: 24rem;
}

@media (max-width: 799px) {
  .home-map {
    padding: 1.1rem;
  }

  .home-map-header {
    flex-direction: column;
    align-items: stretch;
  }

  .home-map-copy h2 {
    font-size: 1.6rem;
  }
}
</style>
