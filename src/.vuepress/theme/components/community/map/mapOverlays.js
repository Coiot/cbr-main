import { resolveOwnerInput, normalizeReligionKey, colorFromString } from "./mapModel.js";
import { RELIGION_OVERLAY_DEFINITIONS, RELIGION_OVERLAY_FALLBACK_COLORS } from "./mapSettings.js";

// map Overlays. Methods run on the owning Vue component instance.

export const mapOverlaysComputed = {
  isOverlayTabActive() {
    return this.editPanelTab === "overlays";
  },
  isCivilizationOverlayActive() {
    return this.isOverlayTabActive && this.overlayView === "civilization";
  },
  isPopulationOverlayActive() {
    return this.isOverlayTabActive && this.overlayView === "population";
  },
  isReligionOverlayActive() {
    return this.isOverlayTabActive && this.overlayView === "religion";
  },
  isContrastOverlayActive() {
    return this.isOverlayTabActive && this.overlayView === "contrast";
  },
  contrastVisualizationKey() {
    return [
      this.contrastHideDecorations ? "details-off" : "details-on",
      this.contrastFlattenLandWater ? "flat" : "terrain",
      this.contrastGrayscaleTerrain ? "grayscale" : "color",
      this.contrastBoostOwnerOpacity ? "owner-strong" : "owner-normal",
      this.contrastLargeCityBanners ? "cities-large" : "cities-normal",
    ].join("|");
  },
  activeContrastToggleCount() {
    return [
      this.contrastHideDecorations,
      this.contrastFlattenLandWater,
      this.contrastGrayscaleTerrain,
      this.contrastBoostOwnerOpacity,
      this.contrastLargeCityBanners,
    ].filter(Boolean).length;
  },
  activeOverlayOwnerId() {
    const ownerId = resolveOwnerInput(this.overlayOwnerName);
    return Number.isFinite(ownerId) ? ownerId : null;
  },
  babylonOwnerId() {
    const index = (this.ownerOptions || []).findIndex((owner) =>
      /babylon/i.test(String(owner && owner.name ? owner.name : ""))
    );
    return index >= 0 ? index : null;
  },
  hasActiveCivilizationOverlay() {
    return (
      this.isCivilizationOverlayActive &&
      Number.isFinite(this.activeOverlayOwnerId)
    );
  },
  religionOverlayPresetByKey() {
    const lookup = Object.create(null);
    RELIGION_OVERLAY_DEFINITIONS.forEach((entry) => {
      const key = normalizeReligionKey(entry.religion);
      if (!key) {
        return;
      }
      lookup[key] = { ...entry };
    });
    return lookup;
  },
  religionOverlayByOwner() {
    const ownerLookup = Object.create(null);
    (this.tiles || []).forEach((tile) => {
      if (!tile || !tile.city || !tile.city.isCapital) {
        return;
      }
      const ownerId = this.ownerIdForCity(tile);
      if (!Number.isFinite(ownerId) || ownerLookup[ownerId]) {
        return;
      }
      const religionInput = String(tile.city.religion || "").trim();
      const key = normalizeReligionKey(religionInput);
      if (!key) {
        return;
      }
      const preset = this.religionOverlayPresetByKey[key] || null;
      const religion = preset ? preset.religion : religionInput;
      const color = preset
        ? preset.color
        : colorFromString(religion, RELIGION_OVERLAY_FALLBACK_COLORS);
      ownerLookup[ownerId] = {
        key,
        owner: ownerId,
        religion,
        color,
        holyCity:
          tile.city && tile.city.name ? String(tile.city.name).trim() : "",
      };
    });
    return ownerLookup;
  },
  religionOverlaySummary() {
    const summaryLookup = Object.create(null);
    Object.values(this.religionOverlayByOwner || {}).forEach((entry) => {
      if (!entry || !entry.key) {
        return;
      }
      if (!summaryLookup[entry.key]) {
        summaryLookup[entry.key] = {
          key: entry.key,
          religion: entry.religion,
          color: entry.color,
          civilizations: 0,
          tiles: 0,
        };
      }
      summaryLookup[entry.key].civilizations += 1;
    });
    (this.tiles || []).forEach((tile) => {
      if (!tile || !Number.isFinite(tile.owner)) {
        return;
      }
      const religion = this.religionOverlayByOwner[tile.owner];
      if (!religion || !summaryLookup[religion.key]) {
        return;
      }
      summaryLookup[religion.key].tiles += 1;
    });
    return Object.values(summaryLookup).sort(
      (a, b) =>
        b.civilizations - a.civilizations ||
        b.tiles - a.tiles ||
        a.religion.localeCompare(b.religion)
    );
  },
  religionOverlayCivilizationCount() {
    return Object.keys(this.religionOverlayByOwner || {}).length;
  },
  civilizationOverlayMetrics() {
    if (!this.hasActiveCivilizationOverlay) {
      return null;
    }
    const ownerId = this.activeOverlayOwnerId;
    let tilesOwned = 0;
    let cities = 0;
    let population = 0;
    let combatUnits = 0;
    let civilianUnits = 0;
    (this.tiles || []).forEach((tile) => {
      if (Number.isFinite(tile.owner) && tile.owner === ownerId) {
        tilesOwned += 1;
      }
      const cityOwner = this.ownerIdForCity(tile);
      if (tile.city && cityOwner === ownerId) {
        cities += 1;
        population += Number.isFinite(tile.city.size) ? tile.city.size : 0;
      }
      if (this.ownerIdForUnit(tile.combatUnit, tile) === ownerId) {
        combatUnits += 1;
      }
      if (this.ownerIdForUnit(tile.civilianUnit, tile) === ownerId) {
        civilianUnits += 1;
      }
    });
    return {
      owner: ownerId,
      ownerLabel: this.ownerLabel(ownerId),
      tilesOwned,
      cities,
      population,
      combatUnits,
      civilianUnits,
      avgCitySize: cities ? (population / cities).toFixed(1) : "0.0",
    };
  },
  populationOverlayMetrics() {
    if (!this.isPopulationOverlayActive) {
      return {
        totalPopulation: 0,
        totalCities: 0,
        totalOwnedTiles: 0,
        averageDensity: 0,
        maxDensity: 0,
        owners: [],
        densestOwner: null,
      };
    }
    const ownerLookup = {};
    let totalPopulation = 0;
    let totalCities = 0;
    let totalOwnedTiles = 0;
    const ignoredOwner = this.babylonOwnerId;
    (this.tiles || []).forEach((tile) => {
      if (Number.isFinite(tile.owner)) {
        if (Number.isFinite(ignoredOwner) && tile.owner === ignoredOwner) {
          return;
        }
        const isWater =
          tile.terrainId === "ocean" || tile.terrainId === "coast";
        totalOwnedTiles += 1;
        if (!ownerLookup[tile.owner]) {
          ownerLookup[tile.owner] = {
            owner: tile.owner,
            label: this.ownerLabel(tile.owner),
            tiles: 0,
            densityTiles: 0,
            cities: 0,
            population: 0,
            density: 0,
          };
        }
        ownerLookup[tile.owner].tiles += 1;
        if (!isWater) {
          ownerLookup[tile.owner].densityTiles += 1;
        }
      }
      if (!tile.city) {
        return;
      }
      const cityOwner = this.ownerIdForCity(tile);
      if (!Number.isFinite(cityOwner)) {
        return;
      }
      if (Number.isFinite(ignoredOwner) && cityOwner === ignoredOwner) {
        return;
      }
      if (!ownerLookup[cityOwner]) {
        ownerLookup[cityOwner] = {
          owner: cityOwner,
          label: this.ownerLabel(cityOwner),
          tiles: 0,
          densityTiles: 0,
          cities: 0,
          population: 0,
          density: 0,
        };
      }
      const size = Number.isFinite(tile.city.size) ? tile.city.size : 0;
      ownerLookup[cityOwner].cities += 1;
      ownerLookup[cityOwner].population += Math.max(0, size);
      totalPopulation += Math.max(0, size);
      totalCities += 1;
    });
    const owners = Object.values(ownerLookup).map((entry) => ({
      ...entry,
      density: entry.densityTiles ? entry.population / entry.densityTiles : 0,
    }));
    owners.sort(
      (a, b) => b.density - a.density || b.population - a.population
    );
    const densestOwner = owners.find((entry) => entry.density > 0) || null;
    return {
      totalPopulation,
      totalCities,
      totalOwnedTiles,
      averageDensity: totalOwnedTiles ? totalPopulation / totalOwnedTiles : 0,
      maxDensity: owners.length
        ? owners.reduce(
            (maxDensity, entry) => Math.max(maxDensity, entry.density),
            0
          )
        : 0,
      owners,
      densestOwner,
    };
  },
  populationDensityByOwner() {
    const lookup = {};
    (this.populationOverlayMetrics.owners || []).forEach((entry) => {
      lookup[entry.owner] = entry.density;
    });
    return lookup;
  },
  populationOverlayTopPopulationCivilizations() {
    return [...(this.populationOverlayMetrics.owners || [])]
      .filter((entry) => entry.population > 0)
      .sort(
        (a, b) =>
          b.population - a.population ||
          b.tiles - a.tiles ||
          b.density - a.density
      )
      .slice(0, 5);
  },
  populationOverlayTopTilesCivilizations() {
    return [...(this.populationOverlayMetrics.owners || [])]
      .filter((entry) => entry.tiles > 0)
      .sort(
        (a, b) =>
          b.tiles - a.tiles ||
          b.population - a.population ||
          b.density - a.density
      )
      .slice(0, 5);
  },
  populationOverlayTopCitiesCivilizations() {
    return [...(this.populationOverlayMetrics.owners || [])]
      .filter((entry) => entry.cities > 0)
      .sort(
        (a, b) =>
          b.cities - a.cities ||
          b.population - a.population ||
          b.tiles - a.tiles
      )
      .slice(0, 5);
  },
  populationOverlayTopDensityCivilizations() {
    return (this.populationOverlayMetrics.owners || [])
      .filter((entry) => entry.density > 0)
      .slice(0, 5);
  },
};
