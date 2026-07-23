<template>
  <section
    v-if="shouldShowSection"
    class="episode-snapshot"
    aria-labelledby="snapshot-title"
  >
    <div class="episode-snapshot-header">
      <div class="episode-snapshot-copy">
        <h2 id="snapshot-title">{{ snapshotTitle }}</h2>
        <p>{{ snapshotContext }}</p>
        <div
          v-if="cityChangeItems.length"
          class="episode-snapshot-changes"
          aria-label="City changes since the previous episode"
        >
          <span
            v-for="item in cityChangeItems"
            :key="item.key"
            class="episode-snapshot-change"
            :class="`is-${item.key}`"
          >
            <strong>{{ item.count }}</strong> {{ item.label }}
          </span>
        </div>
        <p
          v-else-if="citySummaryStatus === 'ready'"
          class="episode-snapshot-change-empty"
        >
          No city changes detected since the previous snapshot.
        </p>
      </div>
      <router-link class="episode-snapshot-link" :to="fullMapLink">
        Open This Snapshot
      </router-link>
    </div>
    <div class="episode-snapshot-map">
      <div v-if="!shouldRenderMap" class="episode-snapshot-placeholder">
        <div class="episode-snapshot-placeholder-card">
          <p>{{ placeholderMessage }}</p>
          <button
            type="button"
            class="episode-snapshot-load"
            @click="requestMap"
            :disabled="isLoadingSnapshot"
          >
            {{ isLoadingSnapshot ? "Loading..." : "Load Map" }}
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
import {
  buildSnapshotLookup,
  buildCityChangeSummary,
} from "../community/communityTileMapSnapshotUtils.js";

const snapshotCache = new Map();
const missingSnapshotCache = new Set();

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
    snapshotDate: {
      type: [String, Date],
      default: "",
    },
    previousSnapshotPath: {
      type: String,
      default: "",
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
      cityChanges: { founded: [], captured: [], removed: [] },
      citySummaryStatus: "idle",
      isReady: false,
      fetchController: null,
      summaryFetchController: null,
      mapMounted: false,
      mapRequested: false,
      isMobileBrowser,
      isLoadingSnapshot: false,
      snapshotAvailability: this.snapshotPath ? "unknown" : "available",
    };
  },
  computed: {
    hasSnapshotSource() {
      return !!this.snapshotPath || this.useBaseSnapshot;
    },
    requiresPayload() {
      return !!this.snapshotPath;
    },
    shouldShowSection() {
      if (!this.hasSnapshotSource) {
        return false;
      }
      if (this.requiresPayload && this.snapshotAvailability === "missing") {
        return false;
      }
      if (this.isMobileBrowser) {
        return this.requiresPayload
          ? this.snapshotAvailability === "available"
          : true;
      }
      return this.requiresPayload ? this.isReady : true;
    },
    shouldRenderMap() {
      if (!this.hasSnapshotSource) {
        return false;
      }
      if (this.requiresPayload) {
        return this.isReady && (!this.isMobileBrowser || this.mapRequested);
      }
      return !this.isMobileBrowser || this.mapRequested;
    },
    placeholderMessage() {
      if (this.isLoadingSnapshot) {
        return "Loading snapshot map...";
      }
      return "Tap to load the snapshot map. It can use more memory on mobile devices.";
    },
    formattedSnapshotDate() {
      if (!this.snapshotDate) {
        return "";
      }
      const date = new Date(this.snapshotDate);
      if (!Number.isFinite(date.getTime())) {
        return String(this.snapshotDate);
      }
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    snapshotContext() {
      const base = "Snapshot from the community tile map for this episode.";
      return this.formattedSnapshotDate
        ? `${base} Episode date: ${this.formattedSnapshotDate}.`
        : base;
    },
    staticSnapshotId() {
      const match = String(this.snapshotPath || "").match(
        /\/(s5-episode-[0-9-]+)\.json(?:$|\?)/i
      );
      return match ? match[1].toLowerCase() : "";
    },
    fullMapLink() {
      if (!this.staticSnapshotId) {
        return "/community-tile-map/";
      }
      return {
        path: "/community-tile-map/",
        query: { snapshot: this.staticSnapshotId },
      };
    },
    cityChangeItems() {
      const changes = this.cityChanges || {};
      return [
        {
          key: "founded",
          label: "founded",
          count: (changes.founded || []).length,
        },
        {
          key: "captured",
          label: "captured",
          count: (changes.captured || []).length,
        },
        {
          key: "removed",
          label: "razed/removed",
          count: (changes.removed || []).length,
        },
      ].filter((item) => item.count > 0);
    },
  },
  mounted() {
    if (this.useBaseSnapshot && !this.snapshotPath) {
      this.isReady = !this.isMobileBrowser;
      return;
    }
    if (this.isMobileBrowser && this.requiresPayload) {
      this.checkSnapshotAvailability();
      return;
    }
    if (!this.isMobileBrowser) {
      this.loadSnapshot(this.useBaseSnapshot);
    }
  },
  beforeUnmount() {
    this.abortSnapshotFetch();
    this.abortSummaryFetch();
  },
  watch: {
    snapshotPath() {
      this.abortSnapshotFetch();
      this.snapshotPayload = null;
      this.cityChanges = { founded: [], captured: [], removed: [] };
      this.citySummaryStatus = "idle";
      this.isReady = false;
      this.isLoadingSnapshot = false;
      this.mapMounted = false;
      this.mapRequested = false;
      this.snapshotAvailability = this.snapshotPath ? "unknown" : "available";
      if (this.isMobileBrowser && this.requiresPayload) {
        this.checkSnapshotAvailability();
        return;
      }
      if (!this.isMobileBrowser) {
        this.loadSnapshot(this.useBaseSnapshot);
      }
    },
  },
  methods: {
    onMapMounted() {
      this.mapMounted = true;
    },
    requestMap() {
      this.mapRequested = true;
      if (this.requiresPayload && !this.isReady && !this.isLoadingSnapshot) {
        this.loadSnapshot(this.useBaseSnapshot);
      }
    },
    abortSnapshotFetch() {
      if (this.fetchController) {
        this.fetchController.abort();
        this.fetchController = null;
      }
    },
    abortSummaryFetch() {
      if (this.summaryFetchController) {
        this.summaryFetchController.abort();
        this.summaryFetchController = null;
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
    async checkSnapshotAvailability() {
      if (!this.snapshotPath) {
        this.snapshotAvailability = "available";
        return;
      }
      if (missingSnapshotCache.has(this.snapshotPath)) {
        this.snapshotAvailability = "missing";
        return;
      }
      const cached = snapshotCache.get(this.snapshotPath);
      if (Array.isArray(cached) && cached.length) {
        this.snapshotAvailability = "available";
        return;
      }
      this.abortSnapshotFetch();
      try {
        const resolved = this.$withBase
          ? this.$withBase(this.snapshotPath)
          : this.snapshotPath;
        this.fetchController = new AbortController();
        const response = await fetch(resolved, {
          method: "HEAD",
          signal: this.fetchController.signal,
        });
        if (response.status === 404 || response.status === 410) {
          missingSnapshotCache.add(this.snapshotPath);
          this.snapshotAvailability = "missing";
          return;
        }
        this.snapshotAvailability = "available";
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
        this.snapshotAvailability = "available";
      } finally {
        this.fetchController = null;
      }
    },
    async loadSnapshot(allowFallback = false) {
      if (!this.snapshotPath) {
        this.isReady = allowFallback;
        this.snapshotAvailability = allowFallback ? "available" : "unknown";
        return;
      }
      if (missingSnapshotCache.has(this.snapshotPath)) {
        this.snapshotAvailability = "missing";
        this.isReady = allowFallback;
        return;
      }
      const cached = snapshotCache.get(this.snapshotPath);
      if (Array.isArray(cached) && cached.length) {
        this.snapshotPayload = cached;
        this.isReady = true;
        this.snapshotAvailability = "available";
        this.loadCityChangeSummary();
        return;
      }
      this.abortSnapshotFetch();
      this.isLoadingSnapshot = true;
      try {
        const resolved = this.$withBase
          ? this.$withBase(this.snapshotPath)
          : this.snapshotPath;
        this.fetchController = new AbortController();
        const response = await fetch(resolved, {
          signal: this.fetchController.signal,
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            missingSnapshotCache.add(this.snapshotPath);
            this.snapshotAvailability = "missing";
          }
          this.isReady = allowFallback;
          return;
        }
        const payload = await response.json();
        if (!Array.isArray(payload) || !payload.length) {
          missingSnapshotCache.add(this.snapshotPath);
          this.snapshotAvailability = "missing";
          this.isReady = allowFallback;
          return;
        }
        this.snapshotPayload = payload;
        snapshotCache.set(this.snapshotPath, payload);
        this.isReady = true;
        this.snapshotAvailability = "available";
        this.loadCityChangeSummary();
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
        this.snapshotAvailability = "unknown";
        this.isReady = allowFallback;
      } finally {
        this.fetchController = null;
        this.isLoadingSnapshot = false;
      }
    },
    async loadCityChangeSummary() {
      if (!this.previousSnapshotPath || !Array.isArray(this.snapshotPayload)) {
        this.citySummaryStatus = "unavailable";
        return;
      }
      this.abortSummaryFetch();
      this.citySummaryStatus = "loading";
      try {
        let previousPayload = snapshotCache.get(this.previousSnapshotPath);
        if (!Array.isArray(previousPayload) || !previousPayload.length) {
          const resolved = this.$withBase
            ? this.$withBase(this.previousSnapshotPath)
            : this.previousSnapshotPath;
          this.summaryFetchController = new AbortController();
          const response = await fetch(resolved, {
            signal: this.summaryFetchController.signal,
          });
          if (!response.ok) {
            this.citySummaryStatus = "unavailable";
            return;
          }
          previousPayload = await response.json();
          if (!Array.isArray(previousPayload) || !previousPayload.length) {
            this.citySummaryStatus = "unavailable";
            return;
          }
          snapshotCache.set(this.previousSnapshotPath, previousPayload);
        }
        this.cityChanges = buildCityChangeSummary(
          buildSnapshotLookup(this.snapshotPayload),
          buildSnapshotLookup(previousPayload)
        );
        this.citySummaryStatus = "ready";
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
        this.citySummaryStatus = "unavailable";
      } finally {
        this.summaryFetchController = null;
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
  border: 1px solid var(--panel-border-color);
  background: linear-gradient(
    135deg,
    var(--panel-bg-color) 0%,
    var(--panel-bg-soft-color) 100%
  );
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
  color: var(--page-text-color);
}

.episode-snapshot-copy p {
  margin: 0;
  color: var(--panel-muted-color);
  max-width: 60ch;
}

.episode-snapshot-changes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-block-start: 0.8rem;
}

.episode-snapshot-change {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  color: var(--panel-text-color);
  background: var(--panel-bg-elevated-color);
  font-size: 0.82rem;
}

.episode-snapshot-change strong {
  color: var(--accent-color);
  font-size: 0.95rem;
}

.episode-snapshot-change-empty {
  margin-block-start: 0.7rem !important;
  font-size: 0.82rem;
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
  background: var(--panel-bg-elevated-color);
}

.episode-snapshot-placeholder-card {
  display: grid;
  gap: 0.9rem;
  max-inline-size: 32ch;
  text-align: center;
  color: var(--panel-muted-color);
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

.episode-snapshot-load:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
  border: 1px solid var(--panel-border-color);
  background: var(--panel-bg-soft-color);
  color: var(--panel-text-color);
  font-size: 1.4rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, background 0.2s ease;
}

.episode-snapshot-zoom-button:hover {
  transform: translateY(-1px);
  background: var(--panel-bg-color);
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
