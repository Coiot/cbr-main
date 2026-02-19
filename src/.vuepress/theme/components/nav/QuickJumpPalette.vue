<template>
  <div class="quick-jump">
    <button
      type="button"
      class="quick-jump-trigger"
      aria-label="Open quick jump"
      @click="openPalette"
    >
      <svg
        class="quick-jump-trigger-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        aria-hidden="true"
      >
        <path
          d="M208 80C137.3 80 80 137.3 80 208s57.3 128 128 128s128-57.3 128-128S278.7 80 208 80zM0 208C0 93.1 93.1 0 208 0s208 93.1 208 208c0 45.1-14.3 86.8-38.6 120.9l124.9 124.9c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L332.1 374.2C298.8 398.7 255.8 416 208 416C93.1 416 0 322.9 0 208z"
        />
      </svg>
      <span class="quick-jump-trigger-label">Jump</span>
      <kbd class="quick-jump-trigger-shortcut">{{ shortcutLabel }}</kbd>
    </button>

    <transition name="quick-jump-fade">
      <div
        v-if="isOpen"
        class="quick-jump-overlay"
        role="presentation"
        @click.self="closePalette"
      >
        <div
          class="quick-jump-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Quick jump"
        >
          <div class="quick-jump-input-wrap">
            <input
              ref="searchInput"
              class="quick-jump-input"
              type="search"
              v-model="query"
              placeholder="Search episodes, scenes, competitors, tile 72,32"
              autocomplete="off"
              @input="handleInput"
            />
          </div>
          <div class="quick-jump-hint">
            Press <kbd>Enter</kbd> to jump, <kbd>Esc</kbd> to close.
          </div>
          <div
            v-if="snapshotScope.mode === 'snapshot' && snapshotScope.id"
            class="quick-jump-scope"
          >
            <span class="quick-jump-scope-chip">
              Scope: {{ snapshotScope.label || "Snapshot" }}
              <button
                type="button"
                class="quick-jump-scope-clear"
                aria-label="Use live scope"
                @click="clearSnapshotScope"
              >
                ×
              </button>
            </span>
          </div>
          <ul v-if="results.length" class="quick-jump-results">
            <li
              v-for="(item, index) in results"
              :key="item.id"
              class="quick-jump-item"
            >
              <button
                type="button"
                class="quick-jump-item-button"
                :class="{ 'is-active': index === activeIndex }"
                @mouseenter="setActiveIndex(index)"
                @click="activateItem(item)"
              >
                <span class="quick-jump-item-meta">{{ typeLabel(item) }}</span>
                <span class="quick-jump-item-title">{{ item.title }}</span>
                <span v-if="item.subtitle" class="quick-jump-item-subtitle">
                  {{ item.subtitle }}
                </span>
              </button>
            </li>
          </ul>
          <p v-else class="quick-jump-empty">No matching items.</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { editionNavItems } from "../../../data/editions";
import { mapConfig } from "../../../data/communityTileMap";
import { s5OwnerList } from "../community/communityTileMapConstants";

const MAX_RESULTS = 40;
const DEFAULT_RESULTS = 12;
const MAP_PATH = "/community-tile-map/";
const UNKNOWN_CITY_ID = 65535;
const MAP_PINS_STORAGE_KEY = "cbr.mapPins.v1";
const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";
const SNAPSHOT_TABLE = "map_snapshots";
const SNAPSHOT_MAP_ID = "s5";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSceneNumber(scene, fallback) {
  const raw =
    scene && scene.scene_number !== undefined && scene.scene_number !== null
      ? scene.scene_number
      : fallback;
  const number = parseInt(raw, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePathPrefix(value) {
  const prefix = String(value || "").trim();
  if (!prefix) {
    return MAP_PATH;
  }
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function parseTileQuery(value) {
  const input = String(value || "").trim();
  if (!input) {
    return null;
  }
  const match = input.match(
    /(?:tile[\s#:,-]*)?(-?\d{1,3})\s*[, ]\s*(-?\d{1,3})/i
  );
  if (!match) {
    return null;
  }
  const x = parseInt(match[1], 10);
  const y = parseInt(match[2], 10);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { key: `${x},${y}` };
}

function parseOwnerQuery(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }
  const match = input.match(/^owner\s*:\s*(.+)$/i);
  if (!match || !match[1]) {
    return "";
  }
  return String(match[1]).trim();
}

function readMapPinsFromStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MAP_PINS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function parseSnapshotId(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    return decodeURIComponent(raw);
  } catch (error) {
    return raw;
  }
}

function ownerNameForId(ownerId) {
  if (!Number.isFinite(ownerId) || ownerId < 0) {
    return "";
  }
  const owner = Array.isArray(s5OwnerList) ? s5OwnerList[ownerId] : null;
  return owner && owner.name ? String(owner.name).trim() : "";
}

function isDuplicateNavigationError(error) {
  if (!error) {
    return false;
  }
  if (error.name === "NavigationDuplicated") {
    return true;
  }
  const message = String(error.message || "");
  return /Avoided redundant navigation/i.test(message);
}

export default {
  name: "QuickJumpPalette",

  data() {
    return {
      isOpen: false,
      query: "",
      activeIndex: 0,
      allItems: [],
      defaultItems: [],
      mapCitiesLoaded: false,
      snapshotScope: {
        mode: "live",
        id: "",
        label: "",
      },
      snapshotListLoaded: false,
      snapshotListLoading: false,
      snapshotList: [],
      snapshotSearchItems: [],
      snapshotIndexesById: {},
      snapshotIndexLoading: false,
    };
  },

  computed: {
    results() {
      const normalizedQuery = normalizeText(this.query);
      if (!normalizedQuery) {
        const defaults = this.defaultItems.slice(0, DEFAULT_RESULTS);
        if (
          this.snapshotScope.mode === "snapshot" &&
          this.snapshotScope.id &&
          this.snapshotScope.label
        ) {
          return [
            {
              id: `snapshot-active:${this.snapshotScope.id}`,
              type: "mapSnapshot",
              title: this.snapshotScope.label,
              subtitle: "Active snapshot scope",
              snapshotId: this.snapshotScope.id,
              snapshotLabel: this.snapshotScope.label,
              score: 9999,
            },
            ...defaults,
          ].slice(0, DEFAULT_RESULTS);
        }
        return defaults;
      }
      const terms = normalizedQuery.split(" ").filter(Boolean);
      const matches = [];
      const snapshotId =
        this.snapshotScope.mode === "snapshot" ? this.snapshotScope.id : "";
      const isSnapshotScopeActive = Boolean(snapshotId);
      const mapTile = parseTileQuery(this.query);
      const explicitOwner = parseOwnerQuery(this.query);
      if (mapTile) {
        const tileQuery = { tile: mapTile.key };
        if (snapshotId) {
          tileQuery.snapshot = snapshotId;
        }
        matches.push({
          id: `map-tile:${mapTile.key}`,
          type: "mapTile",
          title: `Tile ${mapTile.key}`,
          subtitle: snapshotId
            ? `${this.snapshotScope.label || "Snapshot"} · Community tile map`
            : "Community tile map",
          tileKey: mapTile.key,
          snapshotId,
          to: {
            path: MAP_PATH,
            query: tileQuery,
            hash: `#tile-${mapTile.key}`,
          },
          score: 9999,
        });
      }
      if (explicitOwner) {
        const ownerQuery = { owner: explicitOwner };
        if (snapshotId) {
          ownerQuery.snapshot = snapshotId;
        }
        matches.push({
          id: `map-owner-query:${explicitOwner}`,
          type: "mapOwner",
          title: explicitOwner,
          subtitle: snapshotId
            ? `${this.snapshotScope.label || "Snapshot"} · Map owner`
            : "Map owner",
          ownerName: explicitOwner,
          snapshotId,
          to: {
            path: MAP_PATH,
            query: ownerQuery,
          },
          searchText: normalizeText(`owner ${explicitOwner}`),
          score: 9800,
        });
      }
      this.snapshotSearchItems.forEach((item) => {
        let score = 0;
        if (item.searchText.startsWith(normalizedQuery)) {
          score += 160;
        } else if (item.searchText.includes(normalizedQuery)) {
          score += 85;
        }
        let matchedTerms = 0;
        terms.forEach((term) => {
          if (item.searchText.includes(term)) {
            matchedTerms += 1;
            score += 30;
          }
        });
        if (terms.length && matchedTerms !== terms.length) {
          return;
        }
        if (!score) {
          return;
        }
        score += 110;
        matches.push({ ...item, score });
      });
      const candidateItems = this.activeSearchItems();
      candidateItems.forEach((item) => {
        let score = 0;
        if (item.searchText.startsWith(normalizedQuery)) {
          score += 120;
        } else if (item.searchText.includes(normalizedQuery)) {
          score += 60;
        }
        let matchedTerms = 0;
        terms.forEach((term) => {
          if (item.searchText.includes(term)) {
            matchedTerms += 1;
            score += 25;
          }
        });
        if (terms.length && matchedTerms !== terms.length) {
          return;
        }
        if (!score) {
          return;
        }
        if (item.type === "episode") {
          score += 20;
        } else if (item.type === "scene") {
          score += 10;
        } else if (item.type === "mapSnapshot") {
          score += 90;
        } else if (item.type === "mapPin") {
          score += 70;
        } else if (item.type === "mapOwner") {
          score += 35;
        }
        if (isSnapshotScopeActive) {
          if (item.type === "mapOwner") {
            score += 180;
          } else if (item.type === "mapCity") {
            score += 165;
          } else if (item.type === "mapPin") {
            score += 125;
          } else if (item.type === "mapTile" || item.type === "map") {
            score += 110;
          }
          if (item.snapshotId && item.snapshotId === snapshotId) {
            score += 80;
          }
        }
        matches.push({ ...item, score });
      });
      return matches
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          if ((b.sortDate || 0) !== (a.sortDate || 0)) {
            return (b.sortDate || 0) - (a.sortDate || 0);
          }
          return a.title.localeCompare(b.title, "en");
        })
        .slice(0, MAX_RESULTS);
    },
    shortcutLabel() {
      if (typeof navigator === "undefined") {
        return "Ctrl+K";
      }
      const platform = String(navigator.platform || "");
      return /Mac|iPhone|iPad|iPod/.test(platform) ? "Cmd+K" : "Ctrl+K";
    },
  },

  watch: {
    results(nextResults) {
      if (!nextResults.length) {
        this.activeIndex = -1;
        return;
      }
      if (this.activeIndex < 0 || this.activeIndex >= nextResults.length) {
        this.activeIndex = 0;
      }
    },
    $route() {
      this.syncScopeFromRoute();
      this.closePalette();
    },
  },

  mounted() {
    this.buildIndex();
    this.loadMapCities();
    this.loadMapPins();
    this.syncScopeFromRoute();
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleWindowKeydown, true);
      window.addEventListener(
        "community-map-pins-updated",
        this.handleMapPinsUpdated
      );
    }
  },

  beforeDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleWindowKeydown, true);
      window.removeEventListener(
        "community-map-pins-updated",
        this.handleMapPinsUpdated
      );
    }
  },

  methods: {
    buildIndex() {
      const pages = (this.$site && this.$site.pages) || [];
      const items = [];
      const episodes = [];
      const scenes = [];

      pages.forEach((page) => {
        if (!page || typeof page.path !== "string") {
          return;
        }
        const path = page.path;
        const parts = path.split("/").filter(Boolean);
        if (parts[0] !== "albums" || parts.length < 3) {
          return;
        }
        const frontmatter = page.frontmatter || {};
        const title = String(frontmatter.title || page.title || "").trim();
        if (!title) {
          return;
        }
        const subtitleBits = [];
        if (frontmatter.edition) {
          subtitleBits.push(String(frontmatter.edition));
        }
        if (frontmatter.release_date) {
          subtitleBits.push(String(frontmatter.release_date));
        }
        if (frontmatter.narrated_by) {
          subtitleBits.push(String(frontmatter.narrated_by));
        }
        const sortDateValue = new Date(
          frontmatter.date || frontmatter.release_date || 0
        ).getTime();
        const sortDate = Number.isFinite(sortDateValue) ? sortDateValue : 0;
        episodes.push({
          id: `episode:${path}`,
          type: "episode",
          title,
          subtitle: subtitleBits.join(" · "),
          path,
          sortDate,
          searchText: normalizeText(
            `${title} ${subtitleBits.join(" ")} ${parts.join(" ")}`
          ),
        });

        const pageScenes = Array.isArray(frontmatter.scenes)
          ? frontmatter.scenes
          : [];
        pageScenes.forEach((scene, index) => {
          const sceneNumber = parseSceneNumber(scene, index + 1);
          const rawTitle =
            (scene && (scene.scene_title || scene.scene_title_html)) || "";
          const sceneTitle = stripHtml(rawTitle);
          const sceneLabel =
            sceneTitle && sceneTitle !== String(sceneNumber)
              ? `Scene ${sceneNumber}: ${sceneTitle}`
              : `Scene ${sceneNumber}`;
          scenes.push({
            id: `scene:${path}#${sceneNumber}`,
            type: "scene",
            title: `${title} · ${sceneLabel}`,
            subtitle: subtitleBits.join(" · "),
            path: `${path}#scene-${sceneNumber}`,
            sortDate,
            searchText: normalizeText(
              `${title} ${sceneLabel} ${sceneTitle} ${subtitleBits.join(" ")}`
            ),
          });
        });
      });

      const competitors = [];
      const mapOwners = [];
      editionNavItems.forEach((edition) => {
        const editionId = String(edition.id || "").trim();
        const editionPath = normalizePathPrefix(
          Array.isArray(edition.pathPrefixes) ? edition.pathPrefixes[0] : ""
        );
        const competitorTarget =
          editionId && editionPath.startsWith("/albums/")
            ? { path: "/albums/", query: { edition: editionId } }
            : editionPath;
        const editionLabel = String(edition.title || edition.id || "").trim();
        const civs = Array.isArray(edition.competitors)
          ? edition.competitors
          : [];
        civs.forEach((civ, index) => {
          const civName = String(civ.name || "").trim();
          if (!civName) {
            return;
          }
          const leader = String(civ.leader || "")
            .replace(/\s+/g, " ")
            .trim();
          const author = String(civ.author || "")
            .replace(/\s+/g, " ")
            .trim();
          const subtitle = [leader, editionLabel].filter(Boolean).join(" · ");
          competitors.push({
            id: `competitor:${edition.id || "edition"}:${index}:${civName}`,
            type: "competitor",
            title: civName,
            subtitle,
            to: competitorTarget,
            searchText: normalizeText(
              `${civName} ${leader} ${author} ${editionLabel} ${
                edition.id || ""
              }`
            ),
          });
        });
      });
      const seenOwners = new Set();
      (Array.isArray(s5OwnerList) ? s5OwnerList : []).forEach(
        (owner, index) => {
          const ownerName = String(
            owner && owner.name ? owner.name : ""
          ).trim();
          if (!ownerName) {
            return;
          }
          const key = ownerName.toLowerCase();
          if (seenOwners.has(key)) {
            return;
          }
          seenOwners.add(key);
          mapOwners.push({
            id: `map-owner:${index}:${ownerName}`,
            type: "mapOwner",
            title: ownerName,
            subtitle: "Map owner",
            ownerName,
            to: {
              path: MAP_PATH,
              query: { owner: ownerName },
            },
            searchText: normalizeText(`owner ${ownerName} map civ`),
          });
        }
      );

      items.push({
        id: "map:overview",
        type: "map",
        title: "Community Tile Map",
        subtitle: "Live map, overlays, snapshots",
        path: MAP_PATH,
        searchText: normalizeText("community tile map live overlays snapshots"),
      });
      items.push(...episodes, ...scenes, ...competitors, ...mapOwners);
      this.allItems = items;
      this.defaultItems = [
        items[0],
        ...episodes
          .slice()
          .sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0))
          .slice(0, DEFAULT_RESULTS - 1),
      ].filter(Boolean);
    },

    isMapScopedItem(item) {
      if (!item || !item.type) {
        return false;
      }
      return item.type === "mapCity" || item.type === "mapOwner";
    },

    activeSearchItems() {
      if (this.snapshotScope.mode !== "snapshot" || !this.snapshotScope.id) {
        return this.allItems;
      }
      const scopedMapItems =
        this.snapshotIndexesById[this.snapshotScope.id] || [];
      const baseItems = this.allItems.filter(
        (item) => !this.isMapScopedItem(item)
      );
      return [...baseItems, ...scopedMapItems];
    },

    syncScopeFromRoute() {
      const route = this.$route || {};
      const path = String(route.path || "");
      const snapshotId =
        path.includes("/community-tile-map") && route.query
          ? parseSnapshotId(route.query.snapshot)
          : "";
      if (!snapshotId) {
        this.snapshotScope = {
          mode: "live",
          id: "",
          label: "",
        };
        this.snapshotSearchItems = [];
        return;
      }
      this.snapshotScope = {
        mode: "snapshot",
        id: snapshotId,
        label:
          this.snapshotScope.id === snapshotId ? this.snapshotScope.label : "",
      };
      this.ensureSnapshotScope(snapshotId);
    },

    async ensureSnapshotScope(snapshotId) {
      const nextId = String(snapshotId || "").trim();
      if (!nextId) {
        return;
      }
      await this.loadSnapshotList();
      const snapshot = this.snapshotList.find((entry) => entry.id === nextId);
      const label = snapshot
        ? this.formatSnapshotTitle(snapshot)
        : this.snapshotScope.label || "Snapshot";
      this.snapshotScope = {
        mode: "snapshot",
        id: nextId,
        label,
      };
      this.snapshotSearchItems = this.snapshotList.map((entry) => ({
        id: `snapshot:${entry.id}`,
        type: "mapSnapshot",
        title: this.formatSnapshotTitle(entry),
        subtitle: "Set search scope to snapshot",
        snapshotId: entry.id,
        snapshotLabel: this.formatSnapshotTitle(entry),
        searchText: normalizeText(
          `snapshot ${entry.episode_label || ""} ${entry.episode_at || ""} ${
            entry.created_at || ""
          } ${entry.id}`
        ),
      }));
      await this.loadSnapshotIndex(nextId);
    },

    clearSnapshotScope() {
      this.snapshotScope = {
        mode: "live",
        id: "",
        label: "",
      };
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus();
      }
    },

    formatSnapshotTitle(snapshot) {
      if (!snapshot) {
        return "Snapshot";
      }
      const label = String(snapshot.episode_label || "Snapshot").trim();
      return label || "Snapshot";
    },

    async loadSnapshotList(force = false) {
      if (
        this.snapshotListLoading ||
        (!force && this.snapshotListLoaded && this.snapshotList.length)
      ) {
        return;
      }
      this.snapshotListLoading = true;
      if (typeof window === "undefined") {
        this.snapshotListLoading = false;
        return;
      }
      try {
        const endpoint = `${SUPABASE_URL}/rest/v1/${SNAPSHOT_TABLE}?map_id=eq.${SNAPSHOT_MAP_ID}&is_published=eq.true&select=id,episode_label,episode_at,created_at&order=episode_at.desc.nullslast,created_at.desc`;
        const response = await fetch(endpoint, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (!response.ok) {
          throw new Error("Snapshot list request failed");
        }
        const data = await response.json();
        this.snapshotList = Array.isArray(data) ? data : [];
        this.snapshotListLoaded = true;
        this.snapshotSearchItems = this.snapshotList.map((entry) => ({
          id: `snapshot:${entry.id}`,
          type: "mapSnapshot",
          title: this.formatSnapshotTitle(entry),
          subtitle: "Set search scope to snapshot",
          snapshotId: entry.id,
          snapshotLabel: this.formatSnapshotTitle(entry),
          searchText: normalizeText(
            `snapshot ${entry.episode_label || ""} ${entry.episode_at || ""} ${
              entry.created_at || ""
            } ${entry.id}`
          ),
        }));
      } catch (error) {
        this.snapshotListLoaded = false;
      } finally {
        this.snapshotListLoading = false;
      }
    },

    async loadSnapshotIndex(snapshotId) {
      const id = String(snapshotId || "").trim();
      if (!id || this.snapshotIndexesById[id] || this.snapshotIndexLoading) {
        return;
      }
      this.snapshotIndexLoading = true;
      try {
        const endpoint = `${SUPABASE_URL}/rest/v1/${SNAPSHOT_TABLE}?id=eq.${encodeURIComponent(
          id
        )}&map_id=eq.${SNAPSHOT_MAP_ID}&is_published=eq.true&select=id,episode_label,payload&limit=1`;
        const response = await fetch(endpoint, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (!response.ok) {
          return;
        }
        const rows = await response.json();
        const snapshot = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!snapshot) {
          return;
        }
        const scopedItems = this.buildSnapshotScopedItems(snapshot);
        this.snapshotIndexesById = {
          ...this.snapshotIndexesById,
          [id]: scopedItems,
        };
      } catch (error) {
        // No-op: fall back to live map index.
      } finally {
        this.snapshotIndexLoading = false;
      }
    },

    buildSnapshotScopedItems(snapshot) {
      const payload = Array.isArray(snapshot && snapshot.payload)
        ? snapshot.payload
        : [];
      const snapshotId = String((snapshot && snapshot.id) || "").trim();
      const snapshotLabel = this.formatSnapshotTitle(snapshot);
      if (!snapshotId || !payload.length) {
        return [];
      }
      const cityItems = [];
      const ownerItems = [];
      const ownerSet = new Set();
      const citySeen = new Set();
      payload.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return;
        }
        const tileKey = parseTileQuery(entry.tile_key || entry.tileKey);
        const normalizedTileKey = tileKey ? tileKey.key : "";
        const rowPayload =
          entry.payload && typeof entry.payload === "object"
            ? entry.payload
            : {};
        const city =
          rowPayload.city && typeof rowPayload.city === "object"
            ? rowPayload.city
            : null;
        if (city && city.name && normalizedTileKey) {
          const cityName = String(city.name || "").trim();
          if (cityName) {
            const cityId = `snapshot-city:${snapshotId}:${cityName}:${normalizedTileKey}`;
            if (!citySeen.has(cityId)) {
              citySeen.add(cityId);
              cityItems.push({
                id: cityId,
                type: "mapCity",
                title: cityName,
                subtitle: `${snapshotLabel} · Tile ${normalizedTileKey}`,
                tileKey: normalizedTileKey,
                cityName,
                snapshotId,
                snapshotLabel,
                to: {
                  path: MAP_PATH,
                  query: {
                    snapshot: snapshotId,
                    city: cityName,
                    tile: normalizedTileKey,
                  },
                  hash: `#tile-${normalizedTileKey}`,
                },
                searchText: normalizeText(
                  `city ${cityName} map tile ${normalizedTileKey} ${snapshotLabel}`
                ),
              });
            }
          }
        }
        const ownerId =
          Number.isFinite(rowPayload.owner) && rowPayload.owner >= 0
            ? rowPayload.owner
            : city && Number.isFinite(city.owner)
            ? city.owner
            : null;
        if (Number.isFinite(ownerId)) {
          ownerSet.add(ownerId);
        }
      });
      Array.from(ownerSet)
        .sort((a, b) => a - b)
        .forEach((ownerId, index) => {
          const ownerName = ownerNameForId(ownerId);
          if (!ownerName) {
            return;
          }
          ownerItems.push({
            id: `snapshot-owner:${snapshotId}:${index}:${ownerName}`,
            type: "mapOwner",
            title: ownerName,
            subtitle: `${snapshotLabel} · Map owner`,
            ownerName,
            snapshotId,
            snapshotLabel,
            to: {
              path: MAP_PATH,
              query: {
                snapshot: snapshotId,
                owner: ownerName,
              },
            },
            searchText: normalizeText(
              `owner ${ownerName} map civ ${snapshotLabel} snapshot`
            ),
          });
        });
      return [...cityItems, ...ownerItems];
    },

    async loadMapCities() {
      if (this.mapCitiesLoaded || typeof window === "undefined") {
        return;
      }
      this.mapCitiesLoaded = true;
      try {
        const sourceUrl =
          this.$withBase && mapConfig && mapConfig.stateCacheUrl
            ? this.$withBase(mapConfig.stateCacheUrl)
            : mapConfig.stateCacheUrl;
        if (!sourceUrl) {
          return;
        }
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const cityItems = this.buildMapCityItems(data);
        if (!cityItems.length) {
          return;
        }
        this.allItems = [...this.allItems, ...cityItems];
      } catch (error) {
        // No-op: quick jump still works without city index.
      }
    },

    handleMapPinsUpdated() {
      this.loadMapPins();
    },

    loadMapPins() {
      const pinItems = this.buildMapPinItems(readMapPinsFromStorage());
      const nonPinItems = this.allItems.filter(
        (item) => item.type !== "mapPin"
      );
      this.allItems = [...nonPinItems, ...pinItems];
    },

    buildMapPinItems(pins) {
      if (!Array.isArray(pins) || !pins.length) {
        return [];
      }
      const items = [];
      const seen = new Set();
      pins.forEach((pin, index) => {
        if (!pin || typeof pin !== "object") {
          return;
        }
        const name = String(pin.name || "").trim();
        if (!name) {
          return;
        }
        const primaryTile = parseTileQuery(pin.tileKey);
        const fallbackTile = primaryTile ? null : parseTileQuery(pin.tile);
        const tileKey = primaryTile
          ? primaryTile.key
          : fallbackTile
          ? fallbackTile.key
          : "";
        const cityName = this.parseCityName(String(pin.cityName || ""));
        const ownerName = this.parseCityName(String(pin.ownerName || ""));
        const normalizedName = normalizeText(name);
        if (!normalizedName || seen.has(normalizedName)) {
          return;
        }
        seen.add(normalizedName);
        const subtitleBits = ["Saved map pin"];
        if (cityName) {
          subtitleBits.push(cityName);
        } else if (ownerName) {
          subtitleBits.push(ownerName);
        }
        if (tileKey) {
          subtitleBits.push(`Tile ${tileKey}`);
        }
        const query = {};
        if (ownerName) {
          query.owner = ownerName;
        }
        if (cityName) {
          query.city = cityName;
        }
        if (tileKey) {
          query.tile = tileKey;
        }
        items.push({
          id: `map-pin:${index}:${normalizedName}`,
          type: "mapPin",
          title: name,
          subtitle: subtitleBits.join(" · "),
          tileKey,
          cityName,
          ownerName,
          to: {
            path: MAP_PATH,
            query,
            hash: tileKey ? `#tile-${tileKey}` : "",
          },
          searchText: normalizeText(
            `pin ${name} ${cityName} ${ownerName} tile ${tileKey}`
          ),
        });
      });
      return items;
    },

    buildMapCityItems(data) {
      const width = Number(data && data.width);
      const cityIdArray = Array.isArray(data && data.cityId) ? data.cityId : [];
      const cities = Array.isArray(data && data.cities) ? data.cities : [];
      if (!Number.isFinite(width) || width <= 0 || !cityIdArray.length) {
        return [];
      }
      const tileByCityId = new Map();
      for (let index = 0; index < cityIdArray.length; index += 1) {
        const cityId = cityIdArray[index];
        if (!Number.isFinite(cityId) || cityId === UNKNOWN_CITY_ID) {
          continue;
        }
        if (tileByCityId.has(cityId)) {
          continue;
        }
        const col = index % width;
        const row = Math.floor(index / width);
        tileByCityId.set(cityId, `${col},${row}`);
      }

      const items = [];
      const dedupe = new Set();
      cities.forEach((city) => {
        if (!city || !Number.isFinite(city.id)) {
          return;
        }
        const cityName = String(city.name || "").trim();
        if (!cityName) {
          return;
        }
        const tileKey = tileByCityId.get(city.id);
        if (!tileKey) {
          return;
        }
        const id = `map-city:${city.id}:${cityName}`;
        if (dedupe.has(id)) {
          return;
        }
        dedupe.add(id);
        items.push({
          id,
          type: "mapCity",
          title: cityName,
          subtitle: `Map city · Tile ${tileKey}`,
          tileKey,
          cityName,
          to: {
            path: MAP_PATH,
            query: { city: cityName, tile: tileKey },
            hash: `#tile-${tileKey}`,
          },
          searchText: normalizeText(`city ${cityName} map tile ${tileKey}`),
        });
      });
      return items;
    },

    openPalette() {
      this.isOpen = true;
      this.activeIndex = 0;
      this.loadSnapshotList();
      if (this.snapshotScope.mode === "snapshot" && this.snapshotScope.id) {
        this.ensureSnapshotScope(this.snapshotScope.id);
      }
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
          this.$refs.searchInput.select();
        }
      });
    },

    closePalette() {
      this.isOpen = false;
      this.query = "";
      this.activeIndex = 0;
    },

    handleInput() {
      if (
        this.query &&
        !this.snapshotList.length &&
        !this.snapshotListLoading
      ) {
        this.loadSnapshotList();
      }
      if (this.results.length && this.activeIndex < 0) {
        this.activeIndex = 0;
      }
    },

    handleWindowKeydown(event) {
      const key = String(event.key || "").toLowerCase();
      const withCommand = (event.metaKey || event.ctrlKey) && !event.altKey;
      if (withCommand && key === "k") {
        event.preventDefault();
        if (this.isOpen) {
          this.closePalette();
        } else {
          this.openPalette();
        }
        return;
      }
      if (!this.isOpen) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.closePalette();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.moveActiveIndex(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.moveActiveIndex(-1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = this.results[this.activeIndex];
        if (item) {
          this.activateItem(item);
        }
      }
    },

    moveActiveIndex(delta) {
      const total = this.results.length;
      if (!total) {
        this.activeIndex = -1;
        return;
      }
      const current = this.activeIndex < 0 ? 0 : this.activeIndex;
      this.activeIndex = (current + delta + total) % total;
    },

    setActiveIndex(index) {
      this.activeIndex = index;
    },

    activateItem(item) {
      if (!item) {
        return;
      }
      if (item.type === "mapSnapshot") {
        this.selectSnapshotScope(item);
        return;
      }
      const target = this.withSnapshotScope(item.to || item.path, item);
      if (!target) {
        return;
      }
      if (
        (item.tileKey || item.cityName || item.ownerName || item.snapshotId) &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("quick-jump-map-tile", {
            detail: {
              tileKey: item.tileKey || "",
              cityName: item.cityName || "",
              ownerName: item.ownerName || "",
              snapshotId:
                item.snapshotId ||
                (this.snapshotScope.mode === "snapshot"
                  ? this.snapshotScope.id
                  : ""),
            },
          })
        );
      }
      this.closePalette();
      this.$router.push(target).catch((error) => {
        if (!isDuplicateNavigationError(error)) {
          console.warn("Quick jump navigation failed.", error);
        }
      });
    },

    async selectSnapshotScope(item) {
      const snapshotId =
        item && item.snapshotId ? String(item.snapshotId).trim() : "";
      if (!snapshotId) {
        return;
      }
      await this.ensureSnapshotScope(snapshotId);
      this.activeIndex = 0;
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus();
        this.$refs.searchInput.select();
      }
    },

    withSnapshotScope(target, item) {
      if (!target) {
        return target;
      }
      const snapshotId =
        (item && item.snapshotId) ||
        (this.snapshotScope.mode === "snapshot" ? this.snapshotScope.id : "");
      if (!snapshotId || typeof target !== "object") {
        return target;
      }
      const path = String(target.path || "");
      if (!path.includes("/community-tile-map")) {
        return target;
      }
      return {
        ...target,
        query: {
          ...(target.query || {}),
          snapshot: snapshotId,
        },
      };
    },

    typeLabel(item) {
      if (!item || !item.type) {
        return "Jump";
      }
      if (item.type === "episode") {
        return "Album";
      }
      if (item.type === "scene") {
        return "Scene";
      }
      if (item.type === "competitor") {
        return "Competitor";
      }
      if (item.type === "mapTile") {
        return "Map Tile";
      }
      if (item.type === "mapCity") {
        return "Map City";
      }
      if (item.type === "mapOwner") {
        return "Map Owner";
      }
      if (item.type === "mapSnapshot") {
        return "Snapshot";
      }
      if (item.type === "mapPin") {
        return "Map Pin";
      }
      if (item.type === "map") {
        return "Map";
      }
      return "Jump";
    },

    parseCityName(value) {
      const raw = String(value || "").trim();
      if (!raw) {
        return "";
      }
      try {
        return decodeURIComponent(raw);
      } catch (error) {
        return raw;
      }
    },
  },
};
</script>

<style scoped>
.quick-jump {
  position: relative;
}

.quick-jump-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  block-size: 2.2rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--back-color), transparent 75%);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.quick-jump-trigger:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 90%);
}

.quick-jump-trigger-icon {
  inline-size: 0.9rem;
  block-size: 0.9rem;
  fill: currentColor;
}

.quick-jump-trigger-label {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quick-jump-trigger-shortcut {
  border: 1px solid color-mix(in srgb, var(--back-color), transparent 65%);
  border-radius: 6px;
  color: color-mix(in srgb, var(--back-color), white 25%);
  background: color-mix(in srgb, var(--surface-color), black 10%);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.08rem 0.35rem;
}

.quick-jump-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: color-mix(in srgb, #000, transparent 45%);
  padding: 12vh 1rem 1rem;
}

.quick-jump-dialog {
  inline-size: min(720px, 100%);
  max-block-size: 76vh;
  overflow: auto;
  color: var(--back-color);
  background: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--border-color), black 8%);
  border-radius: 14px;
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.3);
  padding: 0.8rem;
}

.quick-jump-input-wrap {
  display: flex;
}

.quick-jump-input {
  inline-size: 100%;
  color: var(--back-color);
  background: var(--surface-muted-color);
  border: 1px solid var(--surface-border-color);
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.7rem 0.8rem;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
}

.quick-jump-hint {
  color: color-mix(in srgb, var(--back-color), white 28%);
  font-size: 0.76rem;
  margin-block: 0.55rem 0.35rem;
}

.quick-jump-scope {
  margin-block: 0.2rem 0.5rem;
}

.quick-jump-scope-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--back-color);
  background: color-mix(in srgb, var(--accent-color), transparent 84%);
  border: 1px solid color-mix(in srgb, var(--accent-color), transparent 28%);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.2rem 0.45rem 0.2rem 0.55rem;
}

.quick-jump-scope-clear {
  inline-size: 1.2rem;
  block-size: 1.2rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-color), transparent 35%);
  color: inherit;
  background: color-mix(in srgb, var(--surface-color), black 12%);
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}

.quick-jump-hint kbd {
  border: 1px solid var(--surface-border-color);
  border-radius: 5px;
  background: var(--surface-muted-color);
  color: var(--back-color);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
}

.quick-jump-results {
  display: grid;
  gap: 0.34rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-jump-item-button {
  inline-size: 100%;
  display: grid;
  text-align: left;
  gap: 0.08rem;
  border: 1px solid transparent;
  border-radius: 9px;
  background: var(--surface-muted-color);
  padding: 0.55rem 0.65rem;
  cursor: pointer;
}

.quick-jump-item-button:hover,
.quick-jump-item-button.is-active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color), transparent 88%);
}

.quick-jump-item-meta {
  color: color-mix(in srgb, var(--back-color), white 32%);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.quick-jump-item-title {
  color: var(--back-color);
  font-size: 0.94rem;
  font-weight: 800;
}

.quick-jump-item-subtitle {
  color: color-mix(in srgb, var(--back-color), white 16%);
  font-size: 0.78rem;
}

.quick-jump-empty {
  color: color-mix(in srgb, var(--back-color), white 24%);
  font-size: 0.86rem;
  margin: 0.5rem 0 0.2rem;
}

.quick-jump-fade-enter-active,
.quick-jump-fade-leave-active {
  transition: opacity 0.14s ease;
}

.quick-jump-fade-enter,
.quick-jump-fade-leave-to {
  opacity: 0;
}

@media (max-width: 799px) {
  .quick-jump-trigger {
    inline-size: 2.2rem;
    justify-content: center;
    padding: 0.25rem;
    border-color: transparent;
  }
  .quick-jump-trigger-label,
  .quick-jump-trigger-shortcut {
    display: none;
  }
  .quick-jump-overlay {
    padding-block-start: calc(var(--navbar-height, 3.6rem) + 0.6rem);
  }
  .quick-jump-dialog {
    max-block-size: calc(100vh - var(--navbar-height, 3.6rem) - 1.2rem);
  }
}
</style>
