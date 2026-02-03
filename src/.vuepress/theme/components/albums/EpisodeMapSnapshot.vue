<template>
  <section
    v-if="isReady"
    class="episode-snapshot"
    aria-labelledby="snapshot-title"
  >
    <div class="episode-snapshot-header">
      <div class="episode-snapshot-copy">
        <h2 id="snapshot-title">{{ snapshotTitle }}</h2>
        <p>Snapshot from the community tile map for this episode.</p>
      </div>
      <router-link class="episode-snapshot-link" to="/community-tile-map/">
        Open Live Map
      </router-link>
    </div>
    <div class="episode-snapshot-map">
      <div v-if="!shouldRenderMap" class="episode-snapshot-placeholder">
        <div class="episode-snapshot-placeholder-card">
          <p>
            Tap to load the snapshot map. It can use more memory on mobile
            devices.
          </p>
          <button
            type="button"
            class="episode-snapshot-load"
            @click="requestMap"
          >
            Load Map
          </button>
        </div>
      </div>
      <ClientOnly v-else>
        <CommunityTileMapGrid
          ref="map"
          embedded
          embedded-mode="snapshot"
          :snapshot-payload="snapshotPayload"
          :use-base-snapshot="useBaseSnapshot"
          @hook:mounted="onMapMounted"
        />
      </ClientOnly>
      <div
        v-if="shouldRenderMap"
        class="episode-snapshot-zoom"
        :class="{ 'is-disabled': !mapMounted }"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          class="episode-snapshot-zoom-button"
          aria-label="Zoom in"
          @click="zoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="episode-snapshot-zoom-button"
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

const snapshotCache = new Map();

export default {
  name: "EpisodeMapSnapshot",
  components: {
    CommunityTileMapGrid,
  },
  props: {
    snapshotPath: {
      type: String,
      default: "",
    },
    snapshotTitle: {
      type: String,
      default: "Episode Map Snapshot",
    },
    useBaseSnapshot: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const isMobileBrowser =
      typeof navigator !== "undefined"
        ? /Mobi|Android|iP(hone|ad|od)/.test(navigator.userAgent || "")
        : false;
    return {
      snapshotPayload: null,
      isReady: false,
      fetchController: null,
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
  mounted() {
    if (this.useBaseSnapshot && !this.snapshotPath) {
      this.isReady = true;
      return;
    }
    this.loadSnapshot(this.useBaseSnapshot);
  },
  beforeDestroy() {
    this.abortSnapshotFetch();
  },
  methods: {
    onMapMounted() {
      this.mapMounted = true;
    },
    requestMap() {
      this.mapRequested = true;
    },
    abortSnapshotFetch() {
      if (this.fetchController) {
        this.fetchController.abort();
        this.fetchController = null;
      }
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
    async loadSnapshot(allowFallback = false) {
      if (!this.snapshotPath) {
        this.isReady = allowFallback;
        return;
      }
      const cached = snapshotCache.get(this.snapshotPath);
      if (Array.isArray(cached) && cached.length) {
        this.snapshotPayload = cached;
        this.isReady = true;
        return;
      }
      this.abortSnapshotFetch();
      try {
        const resolved = this.$withBase
          ? this.$withBase(this.snapshotPath)
          : this.snapshotPath;
        this.fetchController = new AbortController();
        const response = await fetch(resolved, {
          signal: this.fetchController.signal,
        });
        if (!response.ok) {
          this.isReady = allowFallback;
          return;
        }
        const payload = await response.json();
        if (!Array.isArray(payload) || !payload.length) {
          this.isReady = allowFallback;
          return;
        }
        this.snapshotPayload = payload;
        snapshotCache.set(this.snapshotPath, payload);
        this.isReady = true;
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
        this.isReady = allowFallback;
      } finally {
        this.fetchController = null;
      }
    },
  },
};
</script>

<style scoped>
.episode-snapshot {
  margin-block: 2.5rem 1.5rem;
  padding: 1.4rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 191, 70, 0.25);
  background: linear-gradient(135deg, #0b0b0b 0%, #17130a 100%);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.2);
}

.episode-snapshot-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
  margin-block-end: 1rem;
}

.episode-snapshot-copy h2 {
  margin: 0 0 0.4rem;
  font-size: 1.8rem;
  font-weight: 900;
  color: #fff;
}

.episode-snapshot-copy p {
  margin: 0;
  color: color-mix(in srgb, #fff, transparent 35%);
  max-width: 60ch;
}

.episode-snapshot-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid #f6c55b;
  background: linear-gradient(135deg, #ffbf46 0%, #f7a726 100%);
  color: #1a1a1a;
  font-weight: 800;
  text-decoration: none;
  text-shadow: none;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.episode-snapshot-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.3);
}

.episode-snapshot-map {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  overscroll-behavior: contain;
}

.episode-snapshot-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 22rem;
  padding: 1.5rem;
  background: rgba(10, 10, 10, 0.9);
}

.episode-snapshot-placeholder-card {
  display: grid;
  gap: 0.9rem;
  max-inline-size: 32ch;
  text-align: center;
  color: color-mix(in srgb, #fff, transparent 30%);
}

.episode-snapshot-placeholder-card p {
  margin: 0;
}

.episode-snapshot-load {
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

.episode-snapshot-load:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.3);
}

.episode-snapshot-zoom {
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

.episode-snapshot-map:hover .episode-snapshot-zoom,
.episode-snapshot-map:focus-within .episode-snapshot-zoom {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.episode-snapshot-zoom.is-disabled {
  pointer-events: none;
}

.episode-snapshot-zoom-button {
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

.episode-snapshot-zoom-button:hover {
  transform: translateY(-1px);
  background: rgba(20, 20, 20, 0.85);
}

.episode-snapshot :deep(.tile-map-viewport) {
  min-block-size: 22rem;
}

@media (max-width: 799px) {
  .episode-snapshot {
    padding: 1.1rem;
  }

  .episode-snapshot-header {
    flex-direction: column;
    align-items: stretch;
  }

  .episode-snapshot-copy h2 {
    font-size: 1.5rem;
  }
}
</style>
