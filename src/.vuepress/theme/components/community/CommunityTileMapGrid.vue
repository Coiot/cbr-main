<template>
  <section class="tile-map">
    <div class="tile-map-header">
      <div class="tile-map-meta">
        <!-- <h2 class="tile-map-title">{{ mapName || "Map Viewer" }}</h2>
        <p class="tile-map-subtitle" v-if="mapDescription">
          {{ mapDescription }}
        </p> -->
        <h2 class="title-map-title">Season 5 Community Tile Map</h2>
        <p class="tile-map-subtitle tile-map-subtitle-hint">
          Drag to pan. Click a tile to view details. Does not save yet, but can
          play around with the tools.
        </p>
      </div>
      <div class="tile-map-controls">
        <span class="tile-map-scale">Zoom: {{ scaleLabel }}</span>
        <button
          type="button"
          class="tile-map-control"
          @click="zoomOut"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          class="tile-map-control"
          @click="zoomIn"
          aria-label="Zoom in"
        >
          +
        </button>
        <button type="button" class="tile-map-control" @click="fitToView">
          Fit
        </button>
        <button type="button" class="tile-map-control" @click="resetView">
          Reset
        </button>
      </div>
    </div>
    <div class="tile-map-body">
      <div
        ref="viewport"
        class="tile-map-viewport"
        :class="{ dragging: isDragging, 'brush-active': ownerBrushEnabled }"
        :style="viewportStyle"
        tabindex="0"
        aria-label="Community tile map viewer"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
        @keydown="onKeydown"
      >
        <div v-if="isLoading" class="tile-map-loading">Loading map data...</div>
        <div v-else-if="loadError" class="tile-map-error">
          {{ loadError }}
        </div>
        <div v-else-if="!tiles.length" class="tile-map-error">
          No tile data found.
        </div>
        <div v-else class="tile-map-canvas" :style="canvasStyle">
          <canvas
            v-if="useTerrainCanvas"
            ref="terrainCanvas"
            class="tile-map-canvas-layer"
            :width="canvasWidth"
            :height="canvasHeight"
            aria-hidden="true"
          ></canvas>
          <svg
            v-else
            class="tile-map-svg"
            :width="gridWidth"
            :height="gridHeight"
            :viewBox="`0 0 ${gridWidth} ${gridHeight}`"
            role="img"
            aria-label="Community tile map"
          >
            <g
              v-for="tile in visibleTiles"
              :key="tile.key"
              class="tile-group"
              :class="{ 'is-selected': isSelected(tile) }"
              :transform="`translate(${tile.x}, ${tile.y})`"
              @mouseenter="setHover(tile)"
              @mouseleave="clearHover"
              @click="selectTile(tile)"
            >
              <polygon
                class="tile-hex"
                :class="terrainClass(tile)"
                :points="hexPoints"
                :style="tileStrokeStyle(tile)"
              />
              <polygon
                v-if="Number.isFinite(tile.owner)"
                class="tile-owner-overlay"
                :points="hexPoints"
                :style="ownerOverlayStyle(tile)"
              />
              <polygon
                v-if="showDecorations && tile.elevation"
                class="tile-elevation"
                :class="elevationClass(tile)"
                :points="elevationPoints(tile)"
              />
              <line
                v-for="segment in tile.ownerBorderSegments"
                :key="segment.key"
                class="tile-owner-border"
                :x1="segment.x1"
                :y1="segment.y1"
                :x2="segment.x2"
                :y2="segment.y2"
                :style="{ stroke: segment.color }"
              />
              <line
                v-for="segment in showDecorations ? tile.riverSegments : []"
                :key="segment.key"
                class="tile-river"
                :x1="segment.x1"
                :y1="segment.y1"
                :x2="segment.x2"
                :y2="segment.y2"
              />
              <circle
                v-if="showDecorations && tile.feature"
                class="tile-feature"
                :r="featureRadius"
                :cx="-hexSize * 0.4"
                :cy="-hexSize * 0.25"
                :style="featureStyle(tile)"
              />
              <path
                v-if="showDecorations && tile.wonder"
                class="tile-wonder"
                :d="wonderPath"
                :transform="`translate(${hexSize * 0.4}, ${-hexSize * 0.25})`"
                :style="wonderStyle(tile)"
              />
              <polygon
                v-if="showDecorations && tile.resource"
                class="tile-resource"
                :points="resourcePoints"
                :transform="`translate(${hexSize * 0.4}, ${hexSize * 0.2})`"
                :style="{ fill: tile.resourceColor }"
              />
              <rect
                v-if="
                  showDecorations &&
                  tile.improvement &&
                  !isCitadelImprovement(tile)
                "
                class="tile-improvement"
                :x="-hexSize * 0.2"
                :y="hexSize * 0.15"
                :width="hexSize * 0.4"
                :height="hexSize * 0.4"
                rx="1.5"
                ry="1.5"
                :style="{ fill: tile.improvementColor }"
              />
              <polygon
                v-if="showCitadels && isCitadelImprovement(tile)"
                class="tile-citadel"
                :points="citadelStarPoints"
              />
              <path
                v-if="showDecorations && tile.route"
                class="tile-route"
                :class="routeClass(tile)"
                :d="routePath"
              />
              <path
                v-if="showUnits && tile.unit"
                class="tile-unit"
                :d="unitPath"
                :transform="`translate(${hexSize * 0.3}, ${-hexSize * 0.35})`"
              />
              <text
                v-if="showUnits && tile.unit && showLabels"
                class="tile-unit-label"
                :x="hexSize * 0.3"
                :y="-hexSize * 0.35 + 1.5"
                text-anchor="middle"
              >
                {{ unitLabel(tile.unit) }}
              </text>
              <circle
                v-if="tile.city && !tile.city.isCapital"
                class="tile-city"
                :r="hexSize * 0.35"
                cx="0"
                cy="0"
              />
              <path
                v-if="tile.city && tile.city.isCapital"
                class="tile-city-capital"
                :d="capitalCityPath"
              />
              <circle
                v-if="tile.unit && scale > 1 && !unitIsCivilian(tile)"
                class="tile-unit-marker tile-unit-marker-combat"
                :r="unitMarkerRadius"
                cx="0"
                cy="0"
                :style="unitMarkerStyle(tile)"
              />
              <polygon
                v-if="tile.unit && scale > 1 && unitIsCivilian(tile)"
                class="tile-unit-marker tile-unit-marker-civilian"
                :points="unitTrianglePoints"
                :style="unitMarkerStyle(tile)"
              />
            </g>
            <g
              v-if="hoveredTile"
              class="tile-selection"
              :transform="`translate(${hoveredTile.x}, ${hoveredTile.y})`"
            >
              <polygon class="tile-hover-outline" :points="hexPoints" />
            </g>
            <g
              v-if="selectedTile"
              class="tile-selection"
              :transform="`translate(${selectedTile.x}, ${selectedTile.y})`"
            >
              <polygon class="tile-selection-outline" :points="hexPoints" />
            </g>
            <g v-if="visibleCityLabels.length" class="tile-city-labels">
              <g
                v-for="tile in visibleCityLabels"
                :key="`city-name-${tile.key}`"
                class="tile-city-label"
                :transform="cityLabelTransform(tile)"
              >
                <rect
                  class="city-label-pill"
                  :x="-cityLabelWidth(tile) / 2"
                  :y="-cityLabelHeight() / 2"
                  :width="cityLabelWidth(tile)"
                  :height="cityLabelHeight()"
                  :rx="cityLabelHeight() / 2"
                  :ry="cityLabelHeight() / 2"
                  :style="cityLabelPillStyle(tile)"
                />
                <circle
                  class="city-label-badge"
                  :cx="-cityLabelWidth(tile) / 2 + cityLabelBadgeRadius()"
                  :cy="cityLabelTextY()"
                  :r="cityLabelBadgeRadius()"
                  :style="cityLabelBadgeStyle(tile)"
                />
                <text
                  class="city-label-text city-label-pop"
                  :x="-cityLabelWidth(tile) / 2 + cityLabelBadgeRadius()"
                  :y="cityLabelPopTextY()"
                  dominant-baseline="middle"
                  text-anchor="middle"
                  :style="cityLabelPopTextStyle(tile)"
                >
                  {{ tile.city.size }}
                </text>
                <text
                  class="city-label-text city-label-name"
                  :x="
                    -cityLabelWidth(tile) / 2 +
                    cityLabelBadgeRadius() * 2 +
                    cityLabelTextGap()
                  "
                  :y="cityLabelTextY()"
                  dominant-baseline="middle"
                  text-anchor="start"
                  :style="cityLabelTextStyle(tile)"
                >
                  {{ tile.city.name }}
                </text>
              </g>
            </g>
          </svg>
        </div>
        <!-- <div class="tile-map-hint">Drag to pan.</div> -->
      </div>
      <aside class="tile-map-info">
        <details class="tile-info-card tile-info-accordion" open>
          <summary class="tile-info-summary">Tile Details</summary>
          <div class="tile-info-title">
            {{ activeTile ? tileTitle(activeTile) : "Tile Details" }}
          </div>
          <div v-if="activeTile" class="tile-info-list">
            <div class="tile-info-row">
              <div class="tile-info-label">Terrain</div>
              <div class="tile-info-value">
                {{ formatLabel(activeTile.terrain) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Elevation</div>
              <div class="tile-info-value">
                {{ elevationLabel(activeTile.elevation) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Feature</div>
              <div class="tile-info-value">
                {{ formatLabel(activeTile.feature) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Natural Wonder</div>
              <div class="tile-info-value">
                {{ formatLabel(activeTile.wonder) }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">World Wonders</div>
              <div class="tile-info-value">
                {{ worldWondersLabel(activeTile.city) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Resource</div>
              <div class="tile-info-value">
                {{ resourceLabel(activeTile) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Improvement</div>
              <div class="tile-info-value">
                {{ formatLabel(activeTile.improvement) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Route</div>
              <div class="tile-info-value">
                {{ routeLabel(activeTile.route) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Owner</div>
              <div class="tile-info-value">
                {{ ownerLabel(activeTile.owner) }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">Original Owner</div>
              <div class="tile-info-value">
                {{ ownerLabel(activeTile.originalOwner) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Unit</div>
              <div class="tile-info-value">
                {{ describeUnit(activeTile.unit) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">City</div>
              <div class="tile-info-value">
                {{ describeCity(activeTile.city) }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">Religion</div>
              <div class="tile-info-value">
                {{ activeTile.city.religion || "None" }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">Puppeted</div>
              <div class="tile-info-value">
                {{ activeTile.city.isPuppeted ? "Yes" : "No" }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">Occupied</div>
              <div class="tile-info-value">
                {{ activeTile.city.isOccupied ? "Yes" : "No" }}
              </div>
            </div>
            <div v-if="activeTile.city" class="tile-info-row">
              <div class="tile-info-label">Resistance</div>
              <div class="tile-info-value">
                {{ activeTile.city.isResistance ? "Yes" : "No" }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Continent</div>
              <div class="tile-info-value">
                {{ continentLabel(activeTile.continent) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">River</div>
              <div class="tile-info-value">
                {{ activeTile.hasRiver ? "Yes" : "None" }}
              </div>
            </div>
          </div>
          <div v-else class="tile-info-empty">
            Hover or tap a tile to see its details.
          </div>
        </details>
        <details class="tile-info-card tile-info-accordion" open>
          <summary class="tile-info-summary">Edit Tile</summary>
          <div class="tile-info-title">Edit Tile</div>
          <div v-if="selectedTile" class="tile-edit-form">
            <div class="tile-edit-group">
              <label class="tile-edit-label" for="tile-owner-input">
                Owner
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-owner-input"
                  class="tile-edit-input"
                  type="text"
                  list="tile-owner-options"
                  placeholder="Search civ..."
                  v-model="editOwnerName"
                  :style="ownerInputStyle(editOwnerName)"
                />
                <datalist id="tile-owner-options">
                  <option
                    v-for="(owner, index) in ownerOptions"
                    :key="`owner-${index}`"
                    :value="owner.name"
                    :label="ownerOptionLabel(owner, index)"
                  ></option>
                </datalist>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyOwnerEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearOwnerEdit"
                >
                  Clear
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': ownerBrushEnabled }"
                  @click="toggleOwnerBrush"
                >
                  Brush
                </button>
              </div>
              <div v-if="ownerBrushEnabled" class="tile-edit-hint">
                Brush: click-drag to paint ownership.
              </div>
            </div>

            <div
              v-if="selectedTile && selectedTile.city"
              class="tile-edit-group"
            >
              <label class="tile-edit-label" for="tile-original-owner-input">
                Original Owner
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-original-owner-input"
                  class="tile-edit-input"
                  type="text"
                  list="tile-owner-options"
                  placeholder="Search civ..."
                  v-model="editOriginalOwnerName"
                  :style="ownerInputStyle(editOriginalOwnerName)"
                />
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyOriginalOwnerEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearOriginalOwnerEdit"
                >
                  Clear
                </button>
              </div>
            </div>
            <div class="tile-edit-group">
              <label class="tile-edit-label tile-edit-label-inline">
                City Name
                <span class="tile-edit-checkbox-inline">
                  <input
                    type="checkbox"
                    v-model="editCityCapital"
                    @change="applyCityCapitalEdit"
                    aria-label="Capital city"
                  />
                  Capital City
                </span>
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-city-name-input"
                  class="tile-edit-input"
                  type="text"
                  maxlength="32"
                  v-model="editCityName"
                />
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyCityNameEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearCityNameEdit"
                >
                  Clear
                </button>
              </div>
            </div>
            <div
              v-if="selectedTile && selectedTile.city"
              class="tile-edit-group"
            >
              <label class="tile-edit-label tile-edit-label-inline">
                <span class="tile-edit-checkbox-inline">
                  <input
                    type="checkbox"
                    v-model="editCityPuppeted"
                    @change="applyCityPuppetedEdit"
                    aria-label="Puppeted city"
                  />
                  Puppeted
                </span>
                <span class="tile-edit-checkbox-inline">
                  <input
                    type="checkbox"
                    v-model="editCityOccupied"
                    @change="applyCityOccupiedEdit"
                    aria-label="Occupied city"
                  />
                  Occupied
                </span>
                <span class="tile-edit-checkbox-inline">
                  <input
                    type="checkbox"
                    v-model="editCityResistance"
                    @change="applyCityResistanceEdit"
                    aria-label="Resistance city"
                  />
                  Resistance
                </span>
              </label>
            </div>

            <div
              v-if="selectedTile && selectedTile.city"
              class="tile-edit-group"
            >
              <label class="tile-edit-label" for="tile-city-input">
                City Population
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-city-input"
                  class="tile-edit-input"
                  type="number"
                  min="1"
                  max="99"
                  v-model.number="editCityValue"
                />
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyCityEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearCityEdit"
                >
                  Clear
                </button>
              </div>
            </div>
            <div
              v-if="selectedTile && selectedTile.city"
              class="tile-edit-group"
            >
              <label class="tile-edit-label" for="tile-city-religion-input">
                Religion
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-city-religion-input"
                  class="tile-edit-input"
                  type="text"
                  maxlength="32"
                  placeholder="None"
                  v-model="editCityReligion"
                />
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyCityReligionEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearCityReligionEdit"
                >
                  Clear
                </button>
              </div>
            </div>
            <div
              v-if="selectedTile && selectedTile.city"
              class="tile-edit-group"
            >
              <label class="tile-edit-label" for="tile-city-wonders-input">
                World Wonders
              </label>
              <div class="tile-edit-row">
                <input
                  id="tile-city-wonders-input"
                  class="tile-edit-input"
                  type="text"
                  placeholder="Comma-separated..."
                  v-model="editWorldWonders"
                />
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyWorldWondersEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearWorldWondersEdit"
                >
                  Clear
                </button>
              </div>
            </div>
            <div class="tile-edit-group">
              <label class="tile-edit-label" for="tile-unit-input">Unit</label>
              <div class="tile-edit-row">
                <input
                  id="tile-unit-input"
                  class="tile-edit-input"
                  type="text"
                  list="tile-unit-options"
                  placeholder="Search unit..."
                  v-model="editUnitType"
                />
                <datalist id="tile-unit-options">
                  <option
                    v-for="unit in unitOptions"
                    :key="`unit-${unit.name}`"
                    :value="unit.name"
                    :label="`${unit.name} (${unit.role})`"
                  ></option>
                </datalist>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="applyUnitEdit"
                >
                  Set
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  @click="clearUnitEdit"
                >
                  Clear
                </button>
              </div>
              <div class="tile-edit-row">
                <input
                  id="tile-unit-owner-input"
                  class="tile-edit-input"
                  type="text"
                  list="tile-owner-options"
                  placeholder="Unit owner..."
                  v-model="editUnitOwnerName"
                  :style="ownerInputStyle(editUnitOwnerName)"
                />
              </div>
            </div>
            <div v-if="!selectedTile.city" class="tile-edit-group">
              <label class="tile-edit-label tile-edit-label-inline">
                <span class="tile-edit-checkbox-inline">
                  <input
                    type="checkbox"
                    v-model="editCitadel"
                    @change="applyCitadelEdit"
                    aria-label="Citadel improvement"
                  />
                  Citadel Improvement
                </span>
              </label>
            </div>
            <p class="tile-edit-hint">
              Editing applies to the selected tile only.
            </p>
          </div>
          <div v-else class="tile-info-empty">
            Select a tile to edit its owner or city.
          </div>
        </details>
      </aside>
    </div>

    <div class="tile-map-legend">
      <div class="tile-legend-card">
        <div class="tile-info-title">Legend</div>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="terrainLegend.length"
          open
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Terrain</span>
          </summary>
          <div class="tile-legend-grid">
            <div
              v-for="terrain in terrainLegend"
              :key="terrain.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-hex"
                :class="`terrain-${terrain.id}`"
              >
              </span>
              <span class="legend-label">{{ terrain.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="ownerLegend.length"
          open
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Civilizations</span>
          </summary>
          <div class="tile-legend-grid">
            <div
              v-for="owner in ownerLegend"
              :key="owner.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-hex-outline"
                :style="ownerLegendStyle(owner)"
              ></span>
              <span class="legend-label">{{ owner.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="elevationLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Elevation</span>
          </summary>
          <div class="tile-legend-grid">
            <div
              v-for="elevation in elevationLegend"
              :key="elevation.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch"
                :class="[
                  `elevation-${elevation.id}`,
                  elevation.id === 'hill'
                    ? 'legend-trapezoid'
                    : 'legend-triangle',
                ]"
              ></span>
              <span class="legend-label">{{ elevation.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="featureLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Features</span>
          </summary>
          <div class="tile-legend-grid tile-legend-scroll">
            <div
              v-for="feature in featureLegend"
              :key="feature.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-feature legend-circle"
                :style="featureLegendStyle(feature)"
              ></span>
              <span class="legend-label">{{ feature.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="wonderLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Wonders</span>
          </summary>
          <div class="tile-legend-grid tile-legend-scroll">
            <div
              v-for="wonder in wonderLegend"
              :key="wonder.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-wonder legend-star"
                :style="wonderLegendStyle(wonder)"
              ></span>
              <span class="legend-label">{{ wonder.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="resourceLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Resources</span>
          </summary>
          <div class="tile-legend-grid tile-legend-scroll">
            <div
              v-for="resource in resourceLegend"
              :key="resource.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-resource legend-diamond"
                :style="resourceLegendStyle(resource)"
              ></span>
              <span class="legend-label">{{ resource.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="improvementLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Improvements</span>
          </summary>
          <div class="tile-legend-grid tile-legend-scroll">
            <div
              v-for="improvement in improvementLegend"
              :key="improvement.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-improvement legend-square"
                :style="improvementLegendStyle(improvement)"
              ></span>
              <span class="legend-label">{{ improvement.label }}</span>
            </div>
          </div>
        </details>
        <details
          class="tile-legend-section tile-legend-accordion"
          v-if="routeLegend.length"
        >
          <summary class="tile-legend-summary">
            <span class="tile-legend-title">Routes</span>
          </summary>
          <div class="tile-legend-grid">
            <div
              v-for="route in routeLegend"
              :key="route.id"
              class="tile-legend-item"
            >
              <span
                class="legend-swatch legend-route legend-line"
                :class="`route-${route.id}`"
              ></span>
              <span class="legend-label">{{ route.label }}</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>

<script>
import { mapConfig, ownerPalette } from "../../../data/communityTileMap";
import { getEdition } from "../../../data/editions";

const s5OwnerList = [
  ...(getEdition("s5")?.competitors || []),
  {
    name: "Babylon",
    leader: "Nebuchadnezzar II",
    author: "Firaxis",
  },
];

function normalizeOwnerKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const OWNER_COLOR_MAP = {
  [normalizeOwnerKey("Babylon")]: { primary: "#244353", secondary: "#d4f9ff" },
  [normalizeOwnerKey("Zazzau")]: { primary: "#d1e7d2", secondary: "#165e44" },
  [normalizeOwnerKey("Yunnan")]: { primary: "#750224", secondary: "#baac87" },
  [normalizeOwnerKey("Yanomami")]: { primary: "#a44345", secondary: "#e4d1c4" },
  [normalizeOwnerKey("Xavante")]: { primary: "#24050e", secondary: "#eb5b39" },
  [normalizeOwnerKey("Xaragua")]: { primary: "#89124f", secondary: "#b3d942" },
  [normalizeOwnerKey("Wassoulou")]: {
    primary: "#a5dfeb",
    secondary: "#191c4d",
  },
  [normalizeOwnerKey("Wallachia")]: {
    primary: "#0a5857",
    secondary: "#bbb645",
  },
  [normalizeOwnerKey("Vyatka")]: { primary: "#f9dfb1", secondary: "#b54505" },
  [normalizeOwnerKey("Umhaill")]: { primary: "#efb212", secondary: "#6c0215" },
  [normalizeOwnerKey("Tlingit")]: { primary: "#404a4e", secondary: "#e0d4b4" },
  [normalizeOwnerKey("Ternate")]: { primary: "#3f3901", secondary: "#d4c56b" },
  [normalizeOwnerKey("Teotihuacan")]: {
    primary: "#1b1627",
    secondary: "#50b595",
  },
  [normalizeOwnerKey("Tang")]: { primary: "#45100a", secondary: "#c5c44b" },
  [normalizeOwnerKey("Susquehannock")]: {
    primary: "#d9b1e4",
    secondary: "#51070f",
  },
  [normalizeOwnerKey("Sumer")]: { primary: "#272b51", secondary: "#d96954" },
  [normalizeOwnerKey("Seychelles")]: {
    primary: "#3accc7",
    secondary: "#0c3856",
  },
  [normalizeOwnerKey("Scythia")]: { primary: "#99290a", secondary: "#f9d6b0" },
  [normalizeOwnerKey("Scotland")]: {
    primary: "#1c1e35",
    secondary: "#abbdb7",
  },
  [normalizeOwnerKey("Ryukyu")]: { primary: "#ad9ec5", secondary: "#262625" },
  [normalizeOwnerKey("Rouran")]: { primary: "#c1be33", secondary: "#721c05" },
  [normalizeOwnerKey("Rapa Nui")]: { primary: "#8babcb", secondary: "#67120a" },
  [normalizeOwnerKey("Qara-Khitai")]: {
    primary: "#171614",
    secondary: "#78b3cf",
  },
  [normalizeOwnerKey("Potiguara")]: {
    primary: "#0e3733",
    secondary: "#f07158",
  },
  [normalizeOwnerKey("Portugal")]: { primary: "#8da328", secondary: "#00236f" },
  [normalizeOwnerKey("Ponca")]: { primary: "#e3c565", secondary: "#844505" },
  [normalizeOwnerKey("Pomo")]: { primary: "#d6683f", secondary: "#000000" },
  [normalizeOwnerKey("Phoenicia")]: {
    primary: "#77194d",
    secondary: "#d89819",
  },
  [normalizeOwnerKey("Pegu")]: { primary: "#b21b2a", secondary: "#fff398" },
  [normalizeOwnerKey("Papal States")]: {
    primary: "#bc5720",
    secondary: "#fceed1",
  },
  [normalizeOwnerKey("Pakistan")]: {
    primary: "#437415",
    secondary: "#d4d9b5",
  },
  [normalizeOwnerKey("Onondaga")]: {
    primary: "#e6d9d4",
    secondary: "#692060",
  },
  [normalizeOwnerKey("New South Wales")]: {
    primary: "#e6c7cb",
    secondary: "#67120a",
  },
  [normalizeOwnerKey("Mysore")]: { primary: "#6b080f", secondary: "#f07c4e" },
  [normalizeOwnerKey("Maravi")]: { primary: "#0e1202", secondary: "#c26258" },
  [normalizeOwnerKey("Ma'in")]: { primary: "#3c1f07", secondary: "#d1722b" },
  [normalizeOwnerKey("Luba")]: { primary: "#523a65", secondary: "#e0b8af" },
  [normalizeOwnerKey("Lanfang")]: { primary: "#b2ac1c", secondary: "#21201f" },
  [normalizeOwnerKey("Kipchaks")]: {
    primary: "#e59d3b",
    secondary: "#1f2028",
  },
  [normalizeOwnerKey("Ket")]: { primary: "#7d9792", secondary: "#5d1212" },
  [normalizeOwnerKey("Karankawa")]: {
    primary: "#154b75",
    secondary: "#f08977",
  },
  [normalizeOwnerKey("Kalmar Union")]: {
    primary: "#7f3725",
    secondary: "#dec073",
  },
  [normalizeOwnerKey("Japan")]: { primary: "#d3d3d3", secondary: "#68002d" },
  [normalizeOwnerKey("Itelmen")]: { primary: "#9ed8c7", secondary: "#231016" },
  [normalizeOwnerKey("Hyksos")]: { primary: "#43010d", secondary: "#ce462f" },
  [normalizeOwnerKey("Herero")]: { primary: "#f3aa98", secondary: "#550c1c" },
  [normalizeOwnerKey("Hanseatic League")]: {
    primary: "#f0e5dd",
    secondary: "#912316",
  },
  [normalizeOwnerKey("Guaycuru")]: {
    primary: "#d6c798",
    secondary: "#874420",
  },
  [normalizeOwnerKey("Green Ukraine")]: {
    primary: "#0b4033",
    secondary: "#ebe968",
  },
  [normalizeOwnerKey("France")]: { primary: "#1c3b56", secondary: "#f23929" },
  [normalizeOwnerKey("Ethiopia")]: {
    primary: "#110d4b",
    secondary: "#3a8a81",
  },
  [normalizeOwnerKey("Estonia")]: { primary: "#5196d5", secondary: "#1c1c26" },
  [normalizeOwnerKey("Circassia")]: {
    primary: "#265c24",
    secondary: "#f0e152",
  },
  [normalizeOwnerKey("Chono")]: { primary: "#6d3026", secondary: "#9edaef" },
  [normalizeOwnerKey("Cebu")]: { primary: "#094048", secondary: "#78ded0" },
  [normalizeOwnerKey("Caral")]: { primary: "#793656", secondary: "#ffaa6d" },
  [normalizeOwnerKey("Bunuba")]: { primary: "#3f1021", secondary: "#f75142" },
  [normalizeOwnerKey("Bjarmians")]: {
    primary: "#3c1e3d",
    secondary: "#b4b5cf",
  },
  [normalizeOwnerKey("Bjarmias")]: {
    primary: "#3c1e3d",
    secondary: "#b4b5cf",
  },
  [normalizeOwnerKey("Bangladesh")]: {
    primary: "#064c39",
    secondary: "#ef7245",
  },
  [normalizeOwnerKey("Bactria")]: { primary: "#9db5e3", secondary: "#0c0d7d" },
  [normalizeOwnerKey("Aures")]: { primary: "#deb057", secondary: "#073c42" },
  [normalizeOwnerKey("Anishinaabe")]: {
    primary: "#42102a",
    secondary: "#b3c5ed",
  },
};
import { parseCiv5Map } from "./civ5MapParser";

const SQRT3 = Math.sqrt(3);
const RESOURCE_COLOR_OPTIONS = { saturation: 62, lightness: 55 };
const IMPROVEMENT_COLOR_OPTIONS = { saturation: 45, lightness: 60 };
const FEATURE_COLORS = {
  ice: "#d7eff9",
  jungle: "#1d7b4a",
  marsh: "#5e6b3d",
  oasis: "#8bcf9c",
  "flood-plains": "#b58b4b",
  forest: "#1f5e3b",
  fallout: "#8b2d2d",
  atoll: "#5ec2c9",
  crater: "#6d4c41",
  fuji: "#cfd8dc",
  mesa: "#b87a4a",
  reef: "#5ec2c9",
  volcano: "#ef6c00",
  gibraltar: "#757575",
  geyser: "#80deea",
  "fountain-youth": "#4fc3f7",
  potosi: "#9e9e9e",
  "el-dorado": "#ffca28",
  "sri-pada": "#81c784",
  "mt-sinai": "#f5f5f5",
  "mt-kailash": "#b0bec5",
  uluru: "#d84315",
  "lake-victoria": "#4fc3f7",
  kilimanjaro: "#78909c",
  "solomons-mines": "#ffb74d",
};
const WONDER_COLORS = {
  crater: "#c17a52",
  fuji: "#e0e0e0",
  mesa: "#b87a4a",
  volcano: "#ef6c00",
  gibraltar: "#757575",
  geyser: "#80deea",
  "fountain-youth": "#4fc3f7",
  potosi: "#9e9e9e",
  "el-dorado": "#ffca28",
  "sri-pada": "#81c784",
  "mt-sinai": "#f5f5f5",
  "mt-kailash": "#b0bec5",
  uluru: "#d84315",
  "lake-victoria": "#4fc3f7",
  kilimanjaro: "#78909c",
  "solomons-mines": "#ffb74d",
};
const BASE_UNITS = [
  { name: "Settler", role: "civilian" },
  { name: "Worker", role: "civilian" },
  { name: "Warrior", role: "combat" },
  { name: "Scout", role: "combat" },
  { name: "Archer", role: "combat" },
  { name: "Spearman", role: "combat" },
  { name: "Chariot Archer", role: "combat" },
  { name: "Swordsman", role: "combat" },
  { name: "Horseman", role: "combat" },
  { name: "Catapult", role: "combat" },
  { name: "Knight", role: "combat" },
  { name: "Crossbowman", role: "combat" },
  { name: "Pikeman", role: "combat" },
  { name: "Trebuchet", role: "combat" },
  { name: "Longswordsman", role: "combat" },
  { name: "Musketman", role: "combat" },
  { name: "Cannon", role: "combat" },
  { name: "Lancer", role: "combat" },
  { name: "Rifleman", role: "combat" },
  { name: "Cavalry", role: "combat" },
  { name: "Infantry", role: "combat" },
  { name: "Artillery", role: "combat" },
  { name: "Tank", role: "combat" },
  { name: "Anti Tank Gun", role: "combat" },
  { name: "Anti Aircraft Gun", role: "combat" },
  { name: "Paratrooper", role: "combat" },
  { name: "Fighter", role: "combat" },
  { name: "Bomber", role: "combat" },
  { name: "Atomic Bomb", role: "combat" },
  { name: "Rocket Artillery", role: "combat" },
  { name: "Mechanized Infantry", role: "combat" },
  { name: "Modern Armor", role: "combat" },
  { name: "Helicopter Gunship", role: "combat" },
  { name: "Mobile Sam", role: "combat" },
  { name: "Guided Missile", role: "combat" },
  { name: "Jet Fighter", role: "combat" },
  { name: "Stealth Bomber", role: "combat" },
  { name: "Nuclear Missile", role: "combat" },
  { name: "Mech", role: "combat" },
  { name: "Workboat", role: "civilian" },
  { name: "Trireme", role: "combat" },
  { name: "Caravel", role: "combat" },
  { name: "Frigate", role: "combat" },
  { name: "Ironclad", role: "combat" },
  { name: "Destroyer", role: "combat" },
  { name: "Battleship", role: "combat" },
  { name: "Submarine", role: "combat" },
  { name: "Carrier", role: "combat" },
  { name: "Nuclear Submarine", role: "combat" },
  { name: "Missile Cruiser", role: "combat" },
  { name: "Artist", role: "civilian" },
  { name: "Scientist", role: "civilian" },
  { name: "Merchant", role: "civilian" },
  { name: "Engineer", role: "civilian" },
  { name: "Great General", role: "civilian" },
];
const BASE_UNIT_IDS = BASE_UNITS.map((unit) =>
  unit.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")
);

export default {
  data() {
    return {
      tiles: [],
      mapConfig: { ...mapConfig },
      ownerPalette: [...ownerPalette],
      ownerColors: {},
      ownerLegend: [],
      mapName: "",
      mapDescription: "",
      isLoading: false,
      loadError: "",
      scale: 1,
      minScale: 0.4,
      maxScale: mapConfig.maxScale || 3,
      translate: { x: 0, y: 0 },
      viewportSize: { width: 0, height: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragTranslate: { x: 0, y: 0 },
      dragMoved: false,
      hoveredTile: null,
      selectedTile: null,
      tileLookup: null,
      showUnits: false,
      ownerSecondaryColors: {},
      editOwnerName: "",
      editOriginalOwnerName: "",
      editCityValue: null,
      editCityName: "",
      editCityReligion: "",
      editWorldWonders: "",
      editCityCapital: false,
      editCityPuppeted: false,
      editCityOccupied: false,
      editCityResistance: false,
      editUnitType: "",
      editUnitOwnerName: "",
      editCitadel: false,
      ownerBrushEnabled: false,
      isPaintingOwner: false,
      ownerBrushId: null,
      nextUnitId: 1,
      terrainLegend: [],
      featureLegend: [],
      wonderLegend: [],
      resourceLegend: [],
      improvementLegend: [],
      elevationLegend: [
        { id: "hill", label: "Hills" },
        { id: "mountain", label: "Mountain" },
      ],
      routeLegend: [
        { id: "road", label: "Road" },
        { id: "railroad", label: "Railroad" },
      ],
    };
  },

  computed: {
    hexSize() {
      return this.mapConfig.hexSize;
    },

    hexWidth() {
      return this.hexSize * SQRT3;
    },

    hexHeight() {
      return this.hexSize * 2;
    },

    gridWidth() {
      if (!this.mapConfig.columns) {
        return 0;
      }
      const extra = this.mapConfig.rows > 1 ? this.hexWidth / 2 : 0;
      return this.hexWidth * this.mapConfig.columns + extra;
    },

    gridHeight() {
      if (!this.mapConfig.rows) {
        return 0;
      }
      return this.hexHeight + (this.mapConfig.rows - 1) * this.hexSize * 1.5;
    },

    hexPoints() {
      return buildHexPoints(this.hexSize);
    },

    resourcePoints() {
      const size = this.hexSize * 0.18;
      return `${-size} 0 0 ${-size} ${size} 0 0 ${size}`;
    },

    routePath() {
      const size = this.hexSize * 0.45;
      return `M ${-size} ${size * 0.6} L ${size} ${size * 0.6}`;
    },

    wonderPath() {
      const outer = this.hexSize * 0.22;
      const inner = this.hexSize * 0.1;
      return buildStarPath(outer, inner);
    },

    capitalCityPath() {
      const outer = this.hexSize * 0.28;
      const inner = this.hexSize * 0.12;
      return buildStarPath(outer, inner);
    },

    canvasStyle() {
      return {
        width: `${this.gridWidth}px`,
        height: `${this.gridHeight}px`,
        transform: `translate(${this.translate.x}px, ${this.translate.y}px) scale(${this.scale})`,
      };
    },

    viewportStyle() {
      return {
        maxWidth: `${this.mapConfig.viewWidth}px`,
        maxHeight: `${this.mapConfig.viewHeight}px`,
        aspectRatio: `${this.mapConfig.viewWidth} / ${this.mapConfig.viewHeight}`,
      };
    },

    activeTile() {
      return this.selectedTile;
    },

    scaleLabel() {
      return `${Math.round(this.scale * 100)}%`;
    },

    featureRadius() {
      return this.hexSize * 0.16;
    },

    unitPath() {
      const size = this.hexSize * 0.18;
      return `M 0 ${-size} L ${size} 0 L 0 ${size} L ${-size} 0 Z`;
    },

    unitMarkerRadius() {
      return this.hexSize * 0.34;
    },

    unitTrianglePoints() {
      const size = this.hexSize * 0.56;
      return `0 ${size * 0.6} ${-size * 0.55} ${-size * 0.4} ${size * 0.55} ${
        -size * 0.4
      }`;
    },

    citadelStarPoints() {
      const outer = this.hexSize * 0.5;
      const inner = outer * 0.65;
      return buildRegularStarPoints(8, outer, inner);
    },

    showDecorations() {
      return this.scale >= 0.55;
    },

    showLabels() {
      return this.scale >= 0.75;
    },

    showCitadels() {
      return this.scale > 1;
    },

    useTerrainCanvas() {
      return this.scale <= 1;
    },

    ownerOptions() {
      return s5OwnerList;
    },

    unitOptions() {
      return BASE_UNITS;
    },

    canvasWidth() {
      return Math.ceil(this.gridWidth);
    },

    canvasHeight() {
      return Math.ceil(this.gridHeight);
    },

    visibleTiles() {
      if (this.useTerrainCanvas) {
        return [];
      }
      if (!this.tiles.length || !this.viewportSize.width) {
        return this.tiles;
      }
      const padding = this.hexSize * 3;
      const halfWidth = this.hexWidth / 2 + padding;
      const halfHeight = this.hexHeight / 2 + padding;
      const minX = -this.translate.x / this.scale - halfWidth;
      const minY = -this.translate.y / this.scale - halfHeight;
      const maxX = minX + this.viewportSize.width / this.scale + halfWidth * 2;
      const maxY =
        minY + this.viewportSize.height / this.scale + halfHeight * 2;
      return this.tiles.filter(
        (tile) =>
          tile.x + halfWidth >= minX &&
          tile.x - halfWidth <= maxX &&
          tile.y + halfHeight >= minY &&
          tile.y - halfHeight <= maxY
      );
    },

    visibleCityLabels() {
      if (!this.showLabels) {
        return [];
      }
      return this.visibleTiles.filter((tile) => tile.city && tile.city.name);
    },
  },

  watch: {
    useTerrainCanvas(nextValue) {
      if (nextValue) {
        this.$nextTick(() => {
          this.drawTerrainCanvas();
        });
      }
    },
    selectedTile(nextTile) {
      if (nextTile) {
        this.editCityValue =
          nextTile.city && Number.isFinite(nextTile.city.size)
            ? nextTile.city.size
            : null;
        this.editCityName = nextTile.city ? nextTile.city.name || "" : "";
        this.editCityReligion = nextTile.city
          ? nextTile.city.religion || ""
          : "";
        this.editWorldWonders = nextTile.city
          ? worldWondersInputValue(nextTile.city.worldWonders)
          : "";
        this.editCitadel = isCitadelImprovement(nextTile);
        this.editCityCapital = nextTile.city
          ? !!nextTile.city.isCapital
          : false;
        this.editCityPuppeted = nextTile.city
          ? !!nextTile.city.isPuppeted
          : false;
        this.editCityOccupied = nextTile.city
          ? !!nextTile.city.isOccupied
          : false;
        this.editCityResistance = nextTile.city
          ? !!nextTile.city.isResistance
          : false;
      } else {
        this.editCityValue = null;
        this.editCityName = "";
        this.editCityReligion = "";
        this.editWorldWonders = "";
        this.editCitadel = false;
        this.editCityCapital = false;
        this.editCityPuppeted = false;
        this.editCityOccupied = false;
        this.editCityResistance = false;
      }
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.updateViewportSize();
      this.fitToView();
    });
    this.loadMap();
    window.addEventListener("resize", this.handleResize);
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
  },

  methods: {
    async loadMap() {
      this.isLoading = true;
      this.loadError = "";
      try {
        let mapData = await this.loadJson(this.mapConfig.baseCacheUrl);
        if (!mapData) {
          const url = this.$withBase
            ? this.$withBase(this.mapConfig.sourceUrl)
            : this.mapConfig.sourceUrl;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Unable to load map data.");
          }
          const buffer = await response.arrayBuffer();
          mapData = parseCiv5Map(buffer);
        }
        const stateData = await this.loadJson(this.mapConfig.stateCacheUrl);
        this.applyMapData(mapData, stateData);
      } catch (error) {
        this.loadError = error.message || "Unable to load map data.";
      } finally {
        this.isLoading = false;
        this.$nextTick(() => {
          this.updateViewportSize();
          this.fitToView();
        });
      }
    },

    async loadJson(url) {
      if (!url) {
        return null;
      }
      try {
        const resolved = this.$withBase ? this.$withBase(url) : url;
        const response = await fetch(resolved);
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        return null;
      }
    },

    applyMapData(mapData, stateData) {
      const mergedMapData = mergeMapState(mapData, stateData);
      this.mapConfig.columns = mergedMapData.width;
      this.mapConfig.rows = mergedMapData.height;
      this.mapName = mergedMapData.mapName || "";
      this.mapDescription = mergedMapData.mapDescription || "";
      this.hoveredTile = null;
      this.selectedTile = null;

      this.terrainLegend = buildLegendItems(mergedMapData.terrainList);
      this.featureLegend = buildLegendItems(mergedMapData.featureTerrainList);
      this.wonderLegend = buildLegendItems(mergedMapData.featureWonderList);
      const improvementNames = collectImprovementNames(
        mergedMapData.improvementList,
        stateData
      );
      const resourceColors = buildColorLookup(
        mergedMapData.resourceList,
        RESOURCE_COLOR_OPTIONS
      );
      const improvementColors = buildColorLookup(
        improvementNames,
        IMPROVEMENT_COLOR_OPTIONS
      );
      this.resourceLegend = buildLegendItems(mergedMapData.resourceList).map(
        (item) => ({
          ...item,
          color: resourceColors.get(item.name),
        })
      );
      this.improvementLegend = buildLegendItems(improvementNames).map(
        (item) => ({
          ...item,
          color: improvementColors.get(item.name),
        })
      );

      const { tiles, ownerColors } = buildTiles(
        mergedMapData,
        this.hexSize,
        this.ownerPalette,
        resourceColors,
        improvementColors
      );
      this.tiles = tiles;
      this.nextUnitId = nextUnitIdFromTiles(tiles);
      this.tileLookup = buildTileLookup(tiles);
      this.ownerColors = ownerColors;
      this.ownerSecondaryColors = buildSecondaryColorMap(ownerColors);
      applyOwnerColorOverrides(this.ownerColors, this.ownerSecondaryColors);
      this.ownerLegend = buildOwnerLegend(
        this.ownerColors,
        s5OwnerList,
        this.ownerPalette,
        this.ownerSecondaryColors
      );
      this.rebuildOwnerBorders();
      this.$nextTick(() => {
        if (this.useTerrainCanvas) {
          this.drawTerrainCanvas();
        }
      });
    },

    handleResize() {
      this.updateViewportSize();
      this.clampView();
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

    resetView() {
      this.scale = 1;
      this.translate = this.centerTranslate(this.scale);
      this.clampView();
    },

    zoomIn() {
      this.applyZoom(this.scale * 1.15);
    },

    zoomOut() {
      this.applyZoom(this.scale * 0.85);
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

    onWheel(event) {
      if (!this.gridWidth || !this.gridHeight) {
        return;
      }
      const rect = this.$refs.viewport.getBoundingClientRect();
      const focus = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const direction = event.deltaY > 0 ? 0.9 : 1.1;
      this.applyZoom(this.scale * direction, focus);
    },

    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }
      if (this.ownerBrushEnabled) {
        const ownerId = this.resolveBrushOwnerId();
        if (!Number.isFinite(ownerId)) {
          return;
        }
        this.isPaintingOwner = true;
        this.ownerBrushId = ownerId;
        const tile = this.getTileAtPointer(event);
        if (tile) {
          this.applyOwnerToTile(tile, ownerId);
        }
        return;
      }
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.dragTranslate = { ...this.translate };
      event.currentTarget.setPointerCapture(event.pointerId);
    },

    onPointerMove(event) {
      if (this.useTerrainCanvas && !this.isDragging) {
        const tile = this.getTileAtPointer(event);
        if (tile !== this.hoveredTile) {
          this.hoveredTile = tile;
          this.drawTerrainCanvas();
        }
      }
      if (this.isPaintingOwner && Number.isFinite(this.ownerBrushId)) {
        const tile = this.getTileAtPointer(event);
        if (tile) {
          this.applyOwnerToTile(tile, this.ownerBrushId);
        }
        return;
      }
      if (!this.isDragging) {
        return;
      }
      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      if (!this.dragMoved) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          this.dragMoved = true;
        } else {
          return;
        }
      }
      const nextTranslate = {
        x: this.dragTranslate.x + dx,
        y: this.dragTranslate.y + dy,
      };
      this.translate = this.clampTranslate(nextTranslate, this.scale);
    },

    onPointerUp(event) {
      if (this.useTerrainCanvas && event.type === "pointerleave") {
        if (this.hoveredTile) {
          this.hoveredTile = null;
          this.drawTerrainCanvas();
        }
        return;
      }
      if (this.isPaintingOwner) {
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
        return;
      }
      if (this.isDragging) {
        this.isDragging = false;
        if (
          event.currentTarget &&
          event.currentTarget.hasPointerCapture &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }
      if (!this.dragMoved && event.button === 0) {
        if (this.ownerBrushEnabled) {
          return;
        }
        const tile = this.getTileAtPointer(event);
        if (tile) {
          this.selectedTile = tile;
          if (this.useTerrainCanvas) {
            this.drawTerrainCanvas();
          }
        }
      }
    },

    drawTerrainCanvas() {
      const canvas = this.$refs.terrainCanvas;
      if (!canvas || !this.tiles.length) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const width = this.canvasWidth;
      const height = this.canvasHeight;
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      const vertices = buildHexVertices(this.hexSize);
      const terrainCache = new Map();
      const getColor = (terrainId) => {
        if (!terrainCache.has(terrainId)) {
          terrainCache.set(terrainId, terrainColor(terrainId));
        }
        return terrainCache.get(terrainId);
      };
      const drawHexPath = (tile) => {
        context.beginPath();
        context.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          context.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
        }
        context.closePath();
      };
      this.tiles.forEach((tile) => {
        const color = getColor(tile.terrainId);
        drawHexPath(tile);
        context.fillStyle = color;
        context.fill();
      });

      context.lineWidth = 0.2;
      context.strokeStyle = "rgba(0, 0, 0, 0.2)";
      this.tiles.forEach((tile) => {
        drawHexPath(tile);
        context.stroke();
      });

      const overlayAlpha = 0.5;
      const previousAlpha = context.globalAlpha;
      const overlayTiles = this.tiles.filter((tile) =>
        Number.isFinite(tile.owner)
      );
      if (overlayTiles.length) {
        context.globalAlpha = overlayAlpha;
        overlayTiles.forEach((tile) => {
          const color = this.ownerColors[tile.owner] || "#ffffff";
          drawHexPath(tile);
          context.fillStyle = color;
          context.fill();
        });
        context.globalAlpha = previousAlpha;

        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        overlayTiles.forEach((tile) => {
          if (!tile.ownerBorderSegments || !tile.ownerBorderSegments.length) {
            return;
          }
          tile.ownerBorderSegments.forEach((segment) => {
            context.beginPath();
            context.moveTo(tile.x + segment.x1, tile.y + segment.y1);
            context.lineTo(tile.x + segment.x2, tile.y + segment.y2);
            context.strokeStyle = segment.color || "#ffffff";
            context.stroke();
          });
        });
      }

      const cityTiles = this.tiles.filter((tile) => tile.city);
      if (cityTiles.length) {
        const capitalOuter = this.hexSize * 0.44;
        const capitalInner = this.hexSize * 0.2;
        const capitalVertices = buildStarVertices(capitalOuter, capitalInner);
        context.globalAlpha = 1;
        cityTiles.forEach((tile) => {
          if (tile.city.isCapital) {
            context.beginPath();
            context.moveTo(
              tile.x + capitalVertices[0].x,
              tile.y + capitalVertices[0].y
            );
            for (let i = 1; i < capitalVertices.length; i += 1) {
              context.lineTo(
                tile.x + capitalVertices[i].x,
                tile.y + capitalVertices[i].y
              );
            }
            context.closePath();
            context.fillStyle = "#fff";
            context.fill();
            context.strokeStyle = "rgba(0, 0, 0, 0.9)";
            context.lineWidth = 1.25;
            context.stroke();
          } else {
            context.beginPath();
            context.arc(tile.x, tile.y, this.hexSize * 0.35, 0, Math.PI * 2);
            context.fillStyle = "#fff";
            context.fill();
            context.strokeStyle = "rgba(0, 0, 0, 0.9)";
            context.lineWidth = 1.5;
            context.stroke();
          }
        });
      }

      // Unit markers render in SVG at higher zoom levels.

      const outlineTiles = [];
      if (this.hoveredTile) {
        outlineTiles.push({
          tile: this.hoveredTile,
          color: "rgba(255, 255, 255, 0.65)",
          width: 1.5,
        });
      }
      if (this.selectedTile) {
        outlineTiles.push({
          tile: this.selectedTile,
          color: "#ffffff",
          width: 2.5,
        });
      }
      if (outlineTiles.length) {
        context.lineJoin = "round";
        context.lineCap = "round";
        outlineTiles.forEach(({ tile, color, width }) => {
          drawHexPath(tile);
          context.strokeStyle = color;
          context.lineWidth = width;
          context.stroke();
        });
      }
    },

    onKeydown(event) {
      const panStep = 40;
      const key = event.key;
      if (key === "+" || key === "=") {
        event.preventDefault();
        this.zoomIn();
        return;
      }
      if (key === "-" || key === "_") {
        event.preventDefault();
        this.zoomOut();
        return;
      }
      if (key === "0") {
        event.preventDefault();
        this.resetView();
        return;
      }
      if (key === "f" || key === "F") {
        event.preventDefault();
        this.fitToView();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        event.preventDefault();
        const delta = {
          x:
            key === "ArrowLeft" ? panStep : key === "ArrowRight" ? -panStep : 0,
          y: key === "ArrowUp" ? panStep : key === "ArrowDown" ? -panStep : 0,
        };
        const nextTranslate = {
          x: this.translate.x + delta.x,
          y: this.translate.y + delta.y,
        };
        this.translate = this.clampTranslate(nextTranslate, this.scale);
      }
    },

    setHover(tile) {
      this.hoveredTile = tile;
    },

    clearHover() {
      this.hoveredTile = null;
    },

    selectTile(tile) {
      if (this.dragMoved) {
        return;
      }
      if (this.ownerBrushEnabled || this.isPaintingOwner) {
        return;
      }
      this.selectedTile = tile;
      this.editOwnerName = ownerNameForId(tile ? tile.owner : null);
      this.editOriginalOwnerName = ownerNameForId(
        tile ? tile.originalOwner : null
      );
      this.editUnitType = unitInputValueForTile(tile);
      this.editUnitOwnerName = unitOwnerInputValueForTile(tile);
      this.editCityReligion =
        tile && tile.city && tile.city.religion ? tile.city.religion : "";
    },

    getTileAtPointer(event) {
      const viewport = this.$refs.viewport;
      if (!viewport || !this.tileLookup) {
        return null;
      }
      const rect = viewport.getBoundingClientRect();
      const worldX =
        (event.clientX - rect.left - this.translate.x) / this.scale;
      const worldY = (event.clientY - rect.top - this.translate.y) / this.scale;
      return this.getTileAtPoint(worldX, worldY);
    },

    getTileAtPoint(worldX, worldY) {
      if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
        return null;
      }
      const hexWidth = this.hexWidth;
      const hexHeight = this.hexHeight;
      const verticalStep = this.hexSize * 1.5;
      const originX = hexWidth / 2;
      const originY = hexHeight / 2;
      const rowFloat = (worldY - originY) / verticalStep;
      const rowCandidates = [
        Math.floor(rowFloat) - 1,
        Math.floor(rowFloat),
        Math.ceil(rowFloat),
        Math.ceil(rowFloat) + 1,
      ];
      const candidates = [];
      const vertices = buildHexVertices(this.hexSize);

      rowCandidates.forEach((row) => {
        if (row < 0 || row >= this.mapConfig.rows) {
          return;
        }
        const offset = row % 2 ? 0 : hexWidth / 2;
        const colFloat = (worldX - originX - offset) / hexWidth;
        const baseCol = Math.round(colFloat);
        [baseCol - 1, baseCol, baseCol + 1].forEach((col) => {
          if (col < 0 || col >= this.mapConfig.columns) {
            return;
          }
          const tile = this.tileLookup.get(`${col},${row}`);
          if (!tile) {
            return;
          }
          candidates.push(tile);
        });
      });

      for (let i = 0; i < candidates.length; i += 1) {
        const tile = candidates[i];
        const localX = worldX - tile.x;
        const localY = worldY - tile.y;
        if (pointInPolygon(localX, localY, vertices)) {
          return tile;
        }
      }

      let bestTile = null;
      let bestDistance = Infinity;
      candidates.forEach((tile) => {
        const dx = worldX - tile.x;
        const dy = worldY - tile.y;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTile = tile;
        }
      });

      return bestTile;
    },

    isSelected(tile) {
      return this.selectedTile && this.selectedTile.key === tile.key;
    },

    tileStrokeStyle(tile) {
      return { stroke: "rgba(0, 0, 0, 0.15)", strokeWidth: 1 };
    },

    ownerOverlayStyle(tile) {
      const color = this.ownerColors[tile.owner] || "#ffffff";
      return { fill: color, fillOpacity: 0.45 };
    },

    terrainClass(tile) {
      return tile.terrainId ? `terrain-${tile.terrainId}` : "terrain-grass";
    },

    elevationClass(tile) {
      return tile.elevation === 2 ? "elevation-mountain" : "elevation-hill";
    },

    featureStyle(tile) {
      const color = featureColor(tile.featureId);
      return { fill: color, stroke: "rgba(0, 0, 0, 0.4)" };
    },

    wonderStyle(tile) {
      const color = wonderColor(tile.wonderId);
      return { fill: color, stroke: "rgba(0, 0, 0, 0.4)" };
    },

    routeClass(tile) {
      return tile.route ? `route-${tile.route}` : "";
    },

    tileTitle(tile) {
      return `Tile ${tile.col},${tile.row}`;
    },

    formatLabel(value) {
      if (!value) {
        return "None";
      }
      return formatEnumLabel(value);
    },

    elevationLabel(value) {
      if (value === 2) {
        return "Mountain";
      }
      if (value === 1) {
        return "Hills";
      }
      return "Flat";
    },

    cityLabelTransform(tile) {
      return `translate(${tile.x}, ${tile.y - this.hexSize * 0.7})`;
    },

    cityLabelHeight() {
      return Math.max(10, this.hexSize * 0.8);
    },

    cityLabelBadgeRadius() {
      return this.cityLabelHeight() * 0.46;
    },

    cityLabelTextGap() {
      return this.cityLabelHeight() * 0.3;
    },

    cityLabelTextY() {
      return this.cityLabelHeight() * 0.06 - 0.5;
    },

    cityLabelPopTextY() {
      return this.cityLabelTextY() + 0.5;
    },

    cityLabelWidth(tile) {
      const name =
        tile && tile.city && tile.city.name ? String(tile.city.name) : "";
      const height = this.cityLabelHeight();
      const badgeDiameter = this.cityLabelBadgeRadius() * 2;
      const nameWidth = name.length * (height * 0.34);
      const rightPad = height * 0.32;
      return badgeDiameter + this.cityLabelTextGap() + nameWidth + rightPad;
    },

    ownerLegendStyle(owner) {
      const fill = owner && owner.color ? owner.color : "#ffffff";
      const border =
        owner && owner.secondaryColor ? owner.secondaryColor : fill;
      return { backgroundColor: fill, borderColor: border };
    },

    ownerInputStyle(value) {
      const ownerId = resolveOwnerInput(value);
      if (!Number.isFinite(ownerId)) {
        return null;
      }
      const entry = ownerColorEntryById(ownerId);
      if (!entry) {
        return null;
      }
      return {
        backgroundColor: entry.primary,
        borderColor: entry.secondary,
        color: entry.secondary,
      };
    },

    cityLabelPillStyle(tile) {
      const colors = cityLabelColors(
        tile,
        this.ownerColors,
        this.ownerSecondaryColors
      );
      if (!colors) {
        return null;
      }
      return { fill: colors.primary, stroke: colors.secondary };
    },

    cityLabelBadgeStyle(tile) {
      const colors = cityLabelColors(
        tile,
        this.ownerColors,
        this.ownerSecondaryColors
      );
      if (!colors) {
        return null;
      }
      return { fill: "#111", stroke: colors.secondary };
    },

    cityLabelTextStyle(tile) {
      const colors = cityLabelColors(
        tile,
        this.ownerColors,
        this.ownerSecondaryColors
      );
      if (!colors) {
        return null;
      }
      return { fill: colors.secondary, stroke: "none" };
    },

    cityLabelPopTextStyle(tile) {
      const colors = cityLabelColors(
        tile,
        this.ownerColors,
        this.ownerSecondaryColors
      );
      if (!colors) {
        return null;
      }
      const fill = "#ffffff";
      return { fill, ...textStrokeStyleForFill(fill) };
    },

    unitMarkerStyle(tile) {
      if (!tile || !tile.unit) {
        return null;
      }
      const colors = unitMarkerColors(
        tile.unit.owner,
        this.ownerColors,
        this.ownerSecondaryColors
      );
      if (!colors) {
        return null;
      }
      return {
        fill: colors.primary,
        stroke: colors.secondary,
      };
    },

    unitIsCivilian(tile) {
      if (!tile || !tile.unit) {
        return false;
      }
      return unitRoleFromType(tile.unit.type) === "civilian";
    },

    isCitadelImprovement(tile) {
      return isCitadelImprovement(tile);
    },

    resourceLabel(tile) {
      if (!tile.resource) {
        return "None";
      }
      const amount = tile.resourceAmount ? ` x${tile.resourceAmount}` : "";
      return `${formatEnumLabel(tile.resource)}${amount}`;
    },

    routeLabel(route) {
      if (!route) {
        return "None";
      }
      return route === "railroad" ? "Railroad" : "Road";
    },

    ownerLabel(owner) {
      if (owner === null || owner === undefined) {
        return "None";
      }
      const name = ownerNameForId(owner);
      return name || "Unknown";
    },

    unitLabel(unit) {
      if (!unit || !unit.type) {
        return "";
      }
      return formatEnumLabel(unit.type).slice(0, 2).toUpperCase();
    },

    describeUnit(unit) {
      if (!unit) {
        return "None";
      }
      const owner = Number.isFinite(unit.owner)
        ? ` (${ownerNameForId(unit.owner) || "Unknown"})`
        : "";
      return `${formatEnumLabel(unit.type || "Unit")}${owner}`;
    },

    describeCity(city) {
      if (!city) {
        return "None";
      }
      const name = city.name || "City";
      const capital = city.isCapital ? " • Capital" : "";
      return `${name} (Pop ${city.size || 1})${capital}`;
    },

    isWorldWonderCity(city) {
      return isWorldWonderCity(city);
    },

    worldWondersLabel(city) {
      return worldWondersLabel(city);
    },

    continentLabel(continent) {
      if (!continent) {
        return "None";
      }
      const label = {
        1: "Americas",
        2: "Asia",
        3: "Africa",
        4: "Europe",
      }[continent];
      return label || `Continent ${continent}`;
    },

    featureLegendStyle(feature) {
      return {
        backgroundColor: featureColor(feature.id),
        borderColor: featureColor(feature.id),
      };
    },

    wonderLegendStyle(wonder) {
      return {
        backgroundColor: wonderColor(wonder.id),
        borderColor: wonderColor(wonder.id),
      };
    },

    resourceLegendStyle(resource) {
      const color =
        resource.color ||
        colorFromString(resource.name, RESOURCE_COLOR_OPTIONS);
      return {
        backgroundColor: color,
        borderColor: color,
      };
    },

    elevationPoints(tile) {
      const size = this.hexSize * 0.38;
      const isMountain = tile && tile.elevation === 2;
      if (isMountain) {
        return `0 ${-size} ${size} ${size} ${-size} ${size}`;
      }
      const top = size * 0.6;
      const bottom = size * 0.9;
      const height = size * 0.7;
      return `${-top} ${-height} ${top} ${-height} ${bottom} ${height} ${-bottom} ${height}`;
    },

    improvementLegendStyle(improvement) {
      const color =
        improvement.color ||
        colorFromString(improvement.name, IMPROVEMENT_COLOR_OPTIONS);
      return {
        backgroundColor: color,
        borderColor: color,
      };
    },

    applyOwnerEdit() {
      if (!this.selectedTile) {
        return;
      }
      const ownerId = resolveOwnerInput(this.editOwnerName);
      if (!Number.isFinite(ownerId) || ownerId < 0) {
        return;
      }
      const normalized = Math.round(ownerId);
      this.selectedTile.owner = normalized;
      this.selectedTile.customOwner = true;
      this.editOwnerName = ownerNameForId(normalized);
      this.ensureOwnerColors(normalized);
      this.rebuildOwnerBorders();
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyUnitEdit() {
      if (!this.selectedTile) {
        return;
      }
      const unitType = normalizeUnitInput(this.editUnitType);
      if (!unitType) {
        return;
      }
      const ownerInputId = resolveOwnerInput(this.editUnitOwnerName);
      const owner = Number.isFinite(ownerInputId)
        ? ownerInputId
        : Number.isFinite(this.selectedTile.owner)
        ? this.selectedTile.owner
        : null;
      this.selectedTile.unit = {
        id: this.nextUnitId,
        type: unitType,
        owner,
      };
      this.nextUnitId += 1;
      this.editUnitType = unitLabelFromType(unitType);
      this.editUnitOwnerName = ownerNameForId(owner);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCitadelEdit() {
      if (!this.selectedTile) {
        return;
      }
      if (this.editCitadel) {
        setCitadelImprovement(this.selectedTile);
      } else {
        clearCitadelImprovement(this.selectedTile);
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearUnitEdit() {
      if (!this.selectedTile) {
        return;
      }
      this.selectedTile.unit = null;
      this.editUnitType = "";
      this.editUnitOwnerName = "";
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyOriginalOwnerEdit() {
      if (!this.selectedTile) {
        return;
      }
      const ownerId = resolveOwnerInput(this.editOriginalOwnerName);
      if (!Number.isFinite(ownerId) || ownerId < 0) {
        return;
      }
      const normalized = Math.round(ownerId);
      this.selectedTile.originalOwner = normalized;
      this.selectedTile.customOriginalOwner = true;
      this.editOriginalOwnerName = ownerNameForId(normalized);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearOwnerEdit() {
      if (!this.selectedTile) {
        return;
      }
      this.selectedTile.owner = null;
      this.selectedTile.customOwner = false;
      this.editOwnerName = "";
      this.rebuildOwnerBorders();
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearOriginalOwnerEdit() {
      if (!this.selectedTile) {
        return;
      }
      this.selectedTile.originalOwner = null;
      this.selectedTile.customOriginalOwner = false;
      this.editOriginalOwnerName = "";
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    toggleOwnerBrush() {
      this.ownerBrushEnabled = !this.ownerBrushEnabled;
      if (!this.ownerBrushEnabled) {
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
      }
    },

    resolveBrushOwnerId() {
      const ownerId = resolveOwnerInput(this.editOwnerName);
      if (!Number.isFinite(ownerId) || ownerId < 0) {
        return null;
      }
      return Math.round(ownerId);
    },

    applyOwnerToTile(tile, ownerId) {
      if (!tile || !Number.isFinite(ownerId)) {
        return;
      }
      if (tile.owner === ownerId && tile.customOwner) {
        return;
      }
      tile.owner = ownerId;
      tile.customOwner = true;
      this.ensureOwnerColors(ownerId);
      this.rebuildOwnerBorders();
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    ownerOptionLabel(owner, index) {
      return formatOwnerOptionLabel(owner, index);
    },

    applyCityEdit() {
      if (!this.selectedTile) {
        return;
      }
      const population = Number(this.editCityValue);
      if (!Number.isFinite(population) || population < 1) {
        this.clearCityEdit();
        return;
      }
      const name =
        typeof this.editCityName === "string" && this.editCityName.trim()
          ? this.editCityName.trim()
          : this.selectedTile.city
          ? this.selectedTile.city.name
          : `City ${this.selectedTile.col},${this.selectedTile.row}`;
      this.selectedTile.city = {
        id: this.selectedTile.city ? this.selectedTile.city.id : null,
        name,
        size: Math.round(population),
        owner: this.selectedTile.owner,
        religion: this.editCityReligion ? this.editCityReligion.trim() : "",
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isPuppeted: !!this.editCityPuppeted,
        isOccupied: !!this.editCityOccupied,
        isResistance: !!this.editCityResistance,
        isCustom: true,
        isCapital: !!this.editCityCapital,
      };
      clearCitadelImprovement(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityNameEdit() {
      if (!this.selectedTile) {
        return;
      }
      const trimmed =
        typeof this.editCityName === "string" ? this.editCityName.trim() : "";
      if (!trimmed) {
        this.clearCityNameEdit();
        return;
      }
      const size = Number.isFinite(this.editCityValue)
        ? Math.max(1, Math.round(this.editCityValue))
        : this.selectedTile.city
        ? this.selectedTile.city.size || 1
        : 1;
      const worldWonders = worldWondersFromInput(this.editWorldWonders);
      this.selectedTile.city = {
        id: this.selectedTile.city ? this.selectedTile.city.id : null,
        name: trimmed,
        size,
        owner: this.selectedTile.owner,
        religion: this.editCityReligion ? this.editCityReligion.trim() : "",
        worldWonders,
        isPuppeted: !!this.editCityPuppeted,
        isOccupied: !!this.editCityOccupied,
        isResistance: !!this.editCityResistance,
        isCustom: true,
        isCapital: !!this.editCityCapital,
      };
      clearCitadelImprovement(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityReligionEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      const religion =
        typeof this.editCityReligion === "string"
          ? this.editCityReligion.trim()
          : "";
      this.selectedTile.city = {
        ...this.selectedTile.city,
        religion,
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isPuppeted: !!this.editCityPuppeted,
        isOccupied: !!this.editCityOccupied,
        isResistance: !!this.editCityResistance,
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityCapitalEdit() {
      if (!this.selectedTile) {
        return;
      }
      const isCapital = !!this.editCityCapital;
      if (!this.selectedTile.city) {
        if (!isCapital) {
          return;
        }
        const size = Number.isFinite(this.editCityValue)
          ? Math.max(1, Math.round(this.editCityValue))
          : 1;
        const name =
          typeof this.editCityName === "string" && this.editCityName.trim()
            ? this.editCityName.trim()
            : `City ${this.selectedTile.col},${this.selectedTile.row}`;
        this.selectedTile.city = {
          id: null,
          name,
          size,
          owner: this.selectedTile.owner,
          religion: this.editCityReligion ? this.editCityReligion.trim() : "",
          worldWonders: worldWondersFromInput(this.editWorldWonders),
          isPuppeted: !!this.editCityPuppeted,
          isOccupied: !!this.editCityOccupied,
          isResistance: !!this.editCityResistance,
          isCustom: true,
          isCapital: true,
        };
        clearCitadelImprovement(this.selectedTile);
      } else {
        this.selectedTile.city = {
          ...this.selectedTile.city,
          worldWonders: worldWondersFromInput(this.editWorldWonders),
          isCustom: true,
          isCapital,
        };
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityPuppetedEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isPuppeted: !!this.editCityPuppeted,
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityOccupiedEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isOccupied: !!this.editCityOccupied,
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityResistanceEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isResistance: !!this.editCityResistance,
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityNameEdit() {
      if (!this.selectedTile) {
        return;
      }
      this.editCityName = "";
      if (this.selectedTile.city) {
        this.selectedTile.city = {
          ...this.selectedTile.city,
          name: "",
          worldWonders: worldWondersFromInput(this.editWorldWonders),
          isCustom: true,
          isCapital: !!this.editCityCapital,
        };
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityEdit() {
      if (!this.selectedTile) {
        return;
      }
      this.selectedTile.city = null;
      this.editCityName = "";
      this.editCityReligion = "";
      this.editCityCapital = false;
      this.editCityPuppeted = false;
      this.editCityOccupied = false;
      this.editCityResistance = false;
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityReligionEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        religion: "",
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
      };
      this.editCityReligion = "";
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyWorldWondersEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearWorldWondersEdit() {
      if (!this.selectedTile || !this.selectedTile.city) {
        return;
      }
      this.editWorldWonders = "";
      this.selectedTile.city = {
        ...this.selectedTile.city,
        worldWonders: [],
        isCustom: true,
      };
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    ensureOwnerColors(ownerId) {
      if (!Number.isFinite(ownerId)) {
        return;
      }
      const override = ownerColorEntryById(ownerId);
      if (!this.ownerColors[ownerId]) {
        this.ownerColors[ownerId] =
          (override && override.primary) ||
          this.ownerPalette[ownerId % this.ownerPalette.length];
      }
      if (!this.ownerSecondaryColors[ownerId]) {
        this.ownerSecondaryColors[ownerId] =
          (override && override.secondary) ||
          deriveSecondaryColor(this.ownerColors[ownerId]);
      }
      this.ownerLegend = buildOwnerLegend(
        this.ownerColors,
        s5OwnerList,
        this.ownerPalette,
        this.ownerSecondaryColors
      );
    },

    rebuildOwnerBorders() {
      this.tiles = buildOwnerBorders(
        this.tiles,
        this.mapConfig.columns,
        this.mapConfig.rows,
        this.ownerSecondaryColors,
        this.hexSize
      );
    },
  },
};

function buildHexPoints(size) {
  const points = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 90);
    points.push(
      `${(size * Math.cos(angle)).toFixed(4)} ${(
        size * Math.sin(angle)
      ).toFixed(4)}`
    );
  }
  return points.join(" ");
}

function buildHexVertices(size) {
  const vertices = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 90);
    vertices.push({
      x: size * Math.cos(angle),
      y: size * Math.sin(angle),
    });
  }
  return vertices;
}

function buildStarPath(outerRadius, innerRadius) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(`${Math.cos(angle) * radius} ${Math.sin(angle) * radius}`);
  }
  return `M ${points[0]} L ${points.slice(1).join(" L ")} Z`;
}

function buildStarVertices(outerRadius, innerRadius) {
  const vertices = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return vertices;
}

function buildRegularStarVertices(pointCount, outerRadius, innerRadius) {
  const vertices = [];
  const totalPoints = Math.max(2, pointCount) * 2;
  for (let i = 0; i < totalPoints; i += 1) {
    const angle = (Math.PI / pointCount) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return vertices;
}

function buildRegularStarPoints(pointCount, outerRadius, innerRadius) {
  return buildRegularStarVertices(pointCount, outerRadius, innerRadius)
    .map((point) => `${point.x} ${point.y}`)
    .join(" ");
}

function buildLegendItems(list) {
  return (list || []).map((name, index) => ({
    id: normalizeId(name) || `entry-${index}`,
    name,
    label: formatEnumLabel(name),
  }));
}

function normalizeId(name) {
  if (!name) {
    return "";
  }
  return name
    .replace(/^(TERRAIN|FEATURE|RESOURCE|IMPROVEMENT|UNIT)_/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase();
}

function formatEnumLabel(value) {
  if (!value) {
    return "None";
  }
  return value
    .replace(/^(TERRAIN|FEATURE|RESOURCE|IMPROVEMENT|UNIT)_/, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getImprovementName(list, index) {
  if (index === 0xff || index === undefined || index === null) {
    return null;
  }
  if (list && index >= 0 && index < list.length && list[index]) {
    return list[index];
  }
  return `IMPROVEMENT_${index}`;
}

function buildColorLookup(list, options) {
  const lookup = new Map();
  (list || []).forEach((entry) => {
    if (!entry) {
      return;
    }
    lookup.set(entry, colorFromString(entry, options));
  });
  return lookup;
}

function colorFromString(name, options = {}) {
  if (!name) {
    return options.fallback || "#a0a0a0";
  }
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const saturation = Number.isFinite(options.saturation)
    ? options.saturation
    : 55;
  const lightness = Number.isFinite(options.lightness) ? options.lightness : 55;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function featureColor(id) {
  if (!id) {
    return "#1f5e3b";
  }
  return FEATURE_COLORS[id] || "#1f5e3b";
}

function wonderColor(id) {
  if (!id) {
    return "#ffca28";
  }
  return WONDER_COLORS[id] || "#ffca28";
}

function terrainColor(id) {
  return (
    {
      grass: "#6b8f46",
      plains: "#9aa857",
      desert: "#c9ad5f",
      tundra: "#8aa089",
      snow: "#d9e4e7",
      coast: "#3c7f9a",
      ocean: "#1f4f6d",
    }[id] || "#3c3c3c"
  );
}

function collectImprovementNames(improvementList, stateData) {
  const names = (improvementList || []).filter(Boolean);
  const seen = new Set(names);
  if (stateData && Array.isArray(stateData.improvement)) {
    stateData.improvement.forEach((value) => {
      if (value === 0xff || value === undefined || value === null) {
        return;
      }
      if (improvementList && value < improvementList.length) {
        return;
      }
      const name = `IMPROVEMENT_${value}`;
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    });
  }
  return names;
}

function normalizeEntityId(rawId, zeroIsNone) {
  if (rawId === null || rawId === undefined) {
    return null;
  }
  const value = Number(rawId);
  if (!Number.isFinite(value) || value === 0xffff) {
    return null;
  }
  if (zeroIsNone && value === 0) {
    return null;
  }
  const highByte = value >> 8;
  if (highByte === 0xff) {
    return null;
  }
  if (highByte === 0x00) {
    return value & 0xff;
  }
  return value;
}

function shouldTreatZeroAsNone(values) {
  if (!Array.isArray(values) || !values.length) {
    return false;
  }
  let zeroCount = 0;
  const total = values.length;
  for (let i = 0; i < total; i += 1) {
    if (values[i] === 0) {
      zeroCount += 1;
    }
  }
  return zeroCount / total > 0.55;
}

function shouldTreatZeroIdAsNone(values) {
  if (!Array.isArray(values) || !values.length) {
    return false;
  }
  let zeroCount = 0;
  const total = values.length;
  for (let i = 0; i < total; i += 1) {
    const value = values[i];
    if ((value & 0xff) === 0x00 && value >> 8 === 0x00) {
      zeroCount += 1;
    }
  }
  return zeroCount / total > 0.55;
}

function buildStateNormalization(stateData) {
  return {
    ownerZeroIsNone: shouldTreatZeroAsNone(stateData.owner),
    improvementZeroIsNone: shouldTreatZeroAsNone(stateData.improvement),
    routeZeroIsNone: shouldTreatZeroAsNone(stateData.routeType),
    cityZeroIsNone: shouldTreatZeroIdAsNone(stateData.cityId),
    unitZeroIsNone: shouldTreatZeroIdAsNone(stateData.unitId),
  };
}

function createEmptyImprovementTiles(tileCount) {
  const tiles = new Array(tileCount);
  for (let i = 0; i < tileCount; i += 1) {
    tiles[i] = {
      cityId: 0xffff,
      unitId: 0xffff,
      owner: 0xff,
      improvement: 0xff,
      routeType: 0xff,
      routeOwner: 0xff,
    };
  }
  return tiles;
}

function normalizeRouteType(value, zeroIsNone) {
  if (!Number.isFinite(value)) {
    return 0xff;
  }
  if (zeroIsNone && value === 0) {
    return 0xff;
  }
  if (zeroIsNone && value === 1) {
    return 0;
  }
  if (zeroIsNone && value === 2) {
    return 1;
  }
  return value;
}

function buildImprovementTilesFromState(stateData, tileCount, normalization) {
  const owners = Array.isArray(stateData.owner) ? stateData.owner : [];
  const improvements = Array.isArray(stateData.improvement)
    ? stateData.improvement
    : [];
  const routeTypes = Array.isArray(stateData.routeType)
    ? stateData.routeType
    : [];
  const routeOwners = Array.isArray(stateData.routeOwner)
    ? stateData.routeOwner
    : [];
  const cityIds = Array.isArray(stateData.cityId) ? stateData.cityId : [];
  const unitIds = Array.isArray(stateData.unitId) ? stateData.unitId : [];
  const tiles = new Array(tileCount);

  for (let i = 0; i < tileCount; i += 1) {
    const ownerValue = Number.isFinite(owners[i]) ? owners[i] : 0xff;
    const improvementValue = Number.isFinite(improvements[i])
      ? improvements[i]
      : 0xff;
    const routeValue = normalizeRouteType(
      Number.isFinite(routeTypes[i]) ? routeTypes[i] : 0xff,
      normalization.routeZeroIsNone
    );
    const cityValue = Number.isFinite(cityIds[i]) ? cityIds[i] : 0xffff;
    const unitValue = Number.isFinite(unitIds[i]) ? unitIds[i] : 0xffff;
    tiles[i] = {
      cityId:
        normalization.cityZeroIsNone && cityValue === 0 ? 0xffff : cityValue,
      unitId:
        normalization.unitZeroIsNone && unitValue === 0 ? 0xffff : unitValue,
      owner:
        normalization.ownerZeroIsNone && ownerValue === 0 ? 0xff : ownerValue,
      improvement:
        normalization.improvementZeroIsNone && improvementValue === 0
          ? 0xff
          : improvementValue,
      routeType: routeValue,
      routeOwner: Number.isFinite(routeOwners[i]) ? routeOwners[i] : 0xff,
    };
  }

  return tiles;
}

function buildEntitiesFromState(improvementTiles, normalization, stateCities) {
  const unitsById = new Map();
  const citiesById = new Map(
    Array.isArray(stateCities)
      ? stateCities.map((city) => [city.id, { ...city }])
      : []
  );

  improvementTiles.forEach((tile) => {
    const owner = Number.isFinite(tile.owner) ? tile.owner : null;
    const unitId = normalizeEntityId(tile.unitId, normalization.unitZeroIsNone);
    const cityId = normalizeEntityId(tile.cityId, normalization.cityZeroIsNone);

    if (unitId !== null && !unitsById.has(unitId)) {
      unitsById.set(unitId, {
        id: unitId,
        type: `Unit ${unitId}`,
        owner,
      });
    }

    if (cityId !== null) {
      if (!citiesById.has(cityId)) {
        citiesById.set(cityId, {
          id: cityId,
          name: `City ${cityId}`,
          size: 1,
          owner,
        });
      } else if (!Number.isFinite(citiesById.get(cityId).owner)) {
        citiesById.get(cityId).owner = owner;
      }
    }
  });

  return {
    units: Array.from(unitsById.values()),
    cities: Array.from(citiesById.values()),
  };
}

function mergeMapState(mapData, stateData) {
  if (!mapData) {
    return mapData;
  }
  const tileCount = mapData.width * mapData.height;
  const normalization = stateData
    ? buildStateNormalization(stateData)
    : {
        ownerZeroIsNone: false,
        improvementZeroIsNone: false,
        routeZeroIsNone: false,
        cityZeroIsNone: false,
        unitZeroIsNone: false,
      };
  const improvementTiles = stateData
    ? buildImprovementTilesFromState(stateData, tileCount, normalization)
    : mapData.improvementTiles || createEmptyImprovementTiles(tileCount);
  const entities = stateData
    ? buildEntitiesFromState(improvementTiles, normalization, stateData.cities)
    : {
        units: mapData.units || [],
        cities: mapData.cities || [],
      };

  return {
    ...mapData,
    improvementTiles,
    units: entities.units,
    cities: entities.cities,
    stateNormalization: normalization,
  };
}

function buildRiverSegments(riverData, hexSize) {
  if (!riverData) {
    return [];
  }
  const edges = [
    { bit: 1, start: 1, end: 2 },
    { bit: 2, start: 2, end: 3 },
    { bit: 4, start: 3, end: 4 },
  ];
  const vertices = buildHexVertices(hexSize);
  const inset = hexSize * 0.08;
  return edges
    .filter((edge) => riverData & edge.bit)
    .map((edge) => ({
      key: edge.bit,
      ...insetSegment(vertices[edge.start], vertices[edge.end], inset),
    }));
}

function insetSegment(start, end, inset) {
  if (!inset) {
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const length = Math.hypot(midX, midY) || 1;
  const offsetX = (-midX / length) * inset;
  const offsetY = (-midY / length) * inset;
  return {
    x1: start.x + offsetX,
    y1: start.y + offsetY,
    x2: end.x + offsetX,
    y2: end.y + offsetY,
  };
}

function buildTiles(
  mapData,
  hexSize,
  palette,
  resourceColors,
  improvementColors
) {
  const tiles = [];
  const ownerColors = {};
  const unitsById = new Map(
    (mapData.units || []).map((unit) => [unit.id, unit])
  );
  const citiesById = new Map(
    (mapData.cities || []).map((city) => [city.id, city])
  );
  const usedUnitIds = new Set();
  const usedCityIds = new Set();
  const normalization = mapData.stateNormalization || {
    cityZeroIsNone: false,
    unitZeroIsNone: false,
  };

  const hexWidth = hexSize * SQRT3;
  const hexHeight = hexSize * 2;
  const verticalStep = hexSize * 1.5;
  const originX = hexWidth / 2;
  const originY = hexHeight / 2;

  const getString = (list, index) => {
    if (index === 0xff || index === undefined || index === null) {
      return null;
    }
    return list && index >= 0 && index < list.length ? list[index] : null;
  };

  for (let row = 0; row < mapData.height; row += 1) {
    const displayRow = mapData.height - 1 - row;
    for (let col = 0; col < mapData.width; col += 1) {
      const index = row * mapData.width + col;
      const raw = mapData.mapTiles[index];
      const improvement = mapData.improvementTiles[index];
      const terrain = getString(mapData.terrainList, raw.terrainType);
      const resource = getString(mapData.resourceList, raw.resourceType);
      const feature = getString(
        mapData.featureTerrainList,
        raw.featureTerrainType
      );
      const wonder = getString(
        mapData.featureWonderList,
        raw.featureWonderType
      );
      const improvementName = getImprovementName(
        mapData.improvementList,
        improvement.improvement
      );
      const unit =
        improvement.unitId !== 0xffff
          ? unitsById.get(
              normalizeEntityId(
                improvement.unitId,
                normalization.unitZeroIsNone
              )
            )
          : null;
      const city =
        improvement.cityId !== 0xffff
          ? citiesById.get(
              normalizeEntityId(
                improvement.cityId,
                normalization.cityZeroIsNone
              )
            )
          : null;
      const unitData =
        unit && !usedUnitIds.has(unit.id)
          ? { id: unit.id, type: unit.type, owner: unit.owner }
          : null;
      const cityData =
        city && !usedCityIds.has(city.id)
          ? {
              id: city.id,
              name: city.name,
              size: city.population || city.size || 1,
              owner: city.owner,
              religion: city.religion || "",
              worldWonders: Array.isArray(city.worldWonders)
                ? [...city.worldWonders]
                : [],
              isPuppeted: !!city.isPuppeted,
              isOccupied: !!city.isOccupied,
              isResistance: !!city.isResistance,
              isCapital: !!city.isCapital,
              isCustom: !!city.isCustom,
            }
          : null;
      if (unitData) {
        usedUnitIds.add(unitData.id);
      }
      if (cityData) {
        usedCityIds.add(cityData.id);
      }
      const owner = resolveOwner(improvement.owner, unitData, cityData);
      const resourceColor = resource
        ? (resourceColors && resourceColors.get(resource)) ||
          colorFromString(resource, RESOURCE_COLOR_OPTIONS)
        : null;
      const improvementColor = improvementName
        ? (improvementColors && improvementColors.get(improvementName)) ||
          colorFromString(improvementName, IMPROVEMENT_COLOR_OPTIONS)
        : null;
      const riverSegments = buildRiverSegments(raw.riverData, hexSize);

      if (Number.isFinite(owner)) {
        ownerColors[owner] =
          ownerColors[owner] || palette[owner % palette.length];
      }

      tiles.push({
        key: `${col},${displayRow}`,
        col,
        row: displayRow,
        sourceRow: row,
        x: col * hexWidth + (displayRow % 2 ? 0 : hexWidth / 2) + originX,
        y: displayRow * verticalStep + originY,
        terrain,
        terrainId: normalizeId(terrain),
        feature,
        featureId: normalizeId(feature),
        wonder,
        wonderId: normalizeId(wonder),
        resource,
        resourceId: normalizeId(resource),
        resourceColor,
        resourceAmount: raw.resourceAmount,
        elevation: raw.elevation,
        continent: raw.continent,
        riverData: raw.riverData,
        riverSegments,
        hasRiver: riverSegments.length > 0,
        improvement: improvementName,
        improvementId: normalizeId(improvementName),
        improvementColor,
        route: routeFromType(improvement.routeType),
        routeOwner: improvement.routeOwner,
        owner: Number.isFinite(owner) ? owner : null,
        customOwner: Number.isFinite(owner),
        originalOwner: Number.isFinite(owner) ? owner : null,
        customOriginalOwner: false,
        ownerBorderSegments: [],
        unit: unitData,
        city: cityData ? { ...cityData } : null,
      });
    }
  }

  return { tiles, ownerColors };
}

function resolveOwner(improvementOwner, unit, city) {
  if (improvementOwner !== 0xff && improvementOwner !== undefined) {
    return improvementOwner;
  }
  if (unit && Number.isFinite(unit.owner)) {
    return unit.owner;
  }
  if (city && Number.isFinite(city.owner)) {
    return city.owner;
  }
  return null;
}

function routeFromType(routeType) {
  if (routeType === 0) {
    return "road";
  }
  if (routeType === 1) {
    return "railroad";
  }
  return null;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildSecondaryColorMap(ownerColors) {
  const secondary = {};
  Object.keys(ownerColors || {}).forEach((key) => {
    secondary[key] = deriveSecondaryColor(ownerColors[key]);
  });
  return secondary;
}

function buildOwnerLegend(
  ownerColors,
  ownerList,
  palette,
  ownerSecondaryColors
) {
  if (Array.isArray(ownerList) && ownerList.length) {
    return ownerList.map((owner, index) => ({
      id: index,
      label: owner.name || `Owner ${index}`,
      color:
        ownerColors && ownerColors[index]
          ? ownerColors[index]
          : palette[index % palette.length],
      secondaryColor:
        ownerSecondaryColors && ownerSecondaryColors[index]
          ? ownerSecondaryColors[index]
          : deriveSecondaryColor(
              ownerColors && ownerColors[index]
                ? ownerColors[index]
                : palette[index % palette.length]
            ),
    }));
  }
  return Object.keys(ownerColors || {})
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((owner) => ({
      id: owner,
      label: `Owner ${owner}`,
      color: ownerColors[owner],
      secondaryColor:
        ownerSecondaryColors && ownerSecondaryColors[owner]
          ? ownerSecondaryColors[owner]
          : deriveSecondaryColor(ownerColors[owner]),
    }));
}

function ownerNameForId(ownerId) {
  if (!Number.isFinite(ownerId)) {
    return "";
  }
  const entry = s5OwnerList[ownerId];
  return entry && entry.name ? entry.name : "";
}

function ownerColorEntryById(ownerId) {
  if (!Number.isFinite(ownerId)) {
    return null;
  }
  const entry = s5OwnerList[ownerId];
  if (!entry || !entry.name) {
    return null;
  }
  return OWNER_COLOR_MAP[normalizeOwnerKey(entry.name)] || null;
}

function isWorldWonderName(name) {
  return String(name || "").trim() === "World Wonder";
}

function isWorldWonderCity(city) {
  if (!city) {
    return false;
  }
  return isWorldWonderName(city.name);
}

function worldWondersFromInput(value) {
  if (!value) {
    return [];
  }
  const entries = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(entries));
}

function worldWondersInputValue(value) {
  if (!Array.isArray(value) || !value.length) {
    return "";
  }
  return value.filter(Boolean).join(", ");
}

function worldWondersLabel(city) {
  if (!city || !Array.isArray(city.worldWonders)) {
    return "None";
  }
  return city.worldWonders.length ? city.worldWonders.join(", ") : "None";
}

function isCitadelImprovement(tile) {
  if (!tile) {
    return false;
  }
  if (tile.improvementId === "citadel") {
    return true;
  }
  const name = String(tile.improvement || "")
    .trim()
    .toUpperCase();
  return name === "IMPROVEMENT_CITADEL" || name === "CITADEL";
}

function setCitadelImprovement(tile) {
  if (!tile) {
    return;
  }
  const name = "IMPROVEMENT_CITADEL";
  tile.improvement = name;
  tile.improvementId = "citadel";
  tile.improvementColor = colorFromString(name, IMPROVEMENT_COLOR_OPTIONS);
}

function clearCitadelImprovement(tile) {
  if (!tile) {
    return;
  }
  if (!isCitadelImprovement(tile)) {
    return;
  }
  tile.improvement = null;
  tile.improvementId = "";
  tile.improvementColor = null;
}

function cityLabelColors(tile, ownerColors, ownerSecondaryColors) {
  if (!tile || !Number.isFinite(tile.owner)) {
    return null;
  }
  const override = ownerColorEntryById(tile.owner);
  const primary =
    (override && override.primary) ||
    (ownerColors ? ownerColors[tile.owner] : null);
  if (!primary) {
    return null;
  }
  const secondary =
    (override && override.secondary) ||
    (ownerSecondaryColors ? ownerSecondaryColors[tile.owner] : null) ||
    deriveSecondaryColor(primary);
  return { primary, secondary };
}

function applyOwnerColorOverrides(ownerColors, ownerSecondaryColors) {
  s5OwnerList.forEach((owner, index) => {
    const entry =
      owner && owner.name
        ? OWNER_COLOR_MAP[normalizeOwnerKey(owner.name)]
        : null;
    if (entry) {
      ownerColors[index] = entry.primary;
      ownerSecondaryColors[index] = entry.secondary;
      return;
    }
    if (!ownerColors[index]) {
      ownerColors[index] = ownerPalette[index % ownerPalette.length];
    }
    if (!ownerSecondaryColors[index]) {
      ownerSecondaryColors[index] = deriveSecondaryColor(ownerColors[index]);
    }
  });
}

function formatOwnerOptionLabel(owner, index) {
  const leader = owner && owner.leader ? ` \u2014 ${owner.leader}` : "";
  return `${owner.name || "Unknown"}${leader}`;
}

function normalizeUnitInput(value) {
  if (!value) {
    return null;
  }
  const raw = String(value)
    .trim()
    .toUpperCase()
    .replace(/^UNIT_/, "")
    .replace(/[^A-Z0-9]+/g, "_");
  if (!BASE_UNIT_IDS.includes(raw)) {
    return null;
  }
  return `UNIT_${raw}`;
}

function unitInputValueForTile(tile) {
  if (!tile || !tile.unit || !tile.unit.type) {
    return "";
  }
  return unitLabelFromType(tile.unit.type);
}

function unitOwnerInputValueForTile(tile) {
  if (!tile || !tile.unit || !Number.isFinite(tile.unit.owner)) {
    return "";
  }
  return ownerNameForId(tile.unit.owner);
}

function unitLabelFromType(type) {
  const raw = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/^UNIT_/, "")
    .replace(/[^A-Z0-9]+/g, "_");
  const index = BASE_UNIT_IDS.indexOf(raw);
  return index >= 0 ? BASE_UNITS[index].name : raw;
}

function nextUnitIdFromTiles(tiles) {
  let maxId = 0;
  (tiles || []).forEach((tile) => {
    if (tile && tile.unit && Number.isFinite(tile.unit.id)) {
      maxId = Math.max(maxId, tile.unit.id);
    }
  });
  return maxId + 1;
}

function unitRoleFromType(type) {
  const raw = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/^UNIT_/, "")
    .replace(/[^A-Z0-9]+/g, "_");
  const index = BASE_UNIT_IDS.indexOf(raw);
  return index >= 0 ? BASE_UNITS[index].role : "combat";
}

function unitMarkerColors(owner, ownerColors, ownerSecondaryColors) {
  if (!Number.isFinite(owner)) {
    return null;
  }
  const primary = ownerColors ? ownerColors[owner] : null;
  if (!primary) {
    return null;
  }
  const secondary =
    (ownerSecondaryColors && ownerSecondaryColors[owner]) ||
    deriveSecondaryColor(primary);
  return { primary, secondary };
}

function resolveOwnerInput(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (/^\\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const normalized = trimmed.toLowerCase();
  const matchIndex = s5OwnerList.findIndex(
    (owner) => owner.name && owner.name.toLowerCase() === normalized
  );
  return matchIndex >= 0 ? matchIndex : null;
}

function buildTileLookup(tiles) {
  const map = new Map();
  (tiles || []).forEach((tile) => {
    map.set(`${tile.col},${tile.row}`, tile);
  });
  return map;
}

function pointInPolygon(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function buildOwnerBorders(
  tiles,
  columns,
  rows,
  ownerSecondaryColors,
  hexSize
) {
  if (!Array.isArray(tiles) || !tiles.length) {
    return tiles;
  }
  const tileMap = new Map();
  tiles.forEach((tile) => {
    tile.ownerBorderSegments = [];
    tileMap.set(`${tile.col},${tile.row}`, tile);
  });
  if (!columns || !rows) {
    return tiles;
  }

  const vertices = buildHexVertices(hexSize);
  const inset = hexSize * 0.08;
  const edges = [
    {
      key: "ne",
      start: 0,
      end: 1,
      offsets: {
        even: [1, -1],
        odd: [0, -1],
      },
    },
    {
      key: "e",
      start: 1,
      end: 2,
      offsets: {
        even: [1, 0],
        odd: [1, 0],
      },
    },
    {
      key: "se",
      start: 2,
      end: 3,
      offsets: {
        even: [1, 1],
        odd: [0, 1],
      },
    },
    {
      key: "sw",
      start: 3,
      end: 4,
      offsets: {
        even: [0, 1],
        odd: [-1, 1],
      },
    },
    {
      key: "w",
      start: 4,
      end: 5,
      offsets: {
        even: [-1, 0],
        odd: [-1, 0],
      },
    },
    {
      key: "nw",
      start: 5,
      end: 0,
      offsets: {
        even: [0, -1],
        odd: [-1, -1],
      },
    },
  ];

  tiles.forEach((tile) => {
    if (!Number.isFinite(tile.owner)) {
      return;
    }
    const parity = tile.row % 2 === 0 ? "even" : "odd";
    const borderColor = ownerSecondaryColors[tile.owner] || "#ffffff";
    edges.forEach((edge) => {
      const offset = edge.offsets[parity];
      const neighbor = tileMap.get(
        `${tile.col + offset[0]},${tile.row + offset[1]}`
      );
      const matchesOwner =
        neighbor &&
        Number.isFinite(neighbor.owner) &&
        neighbor.owner === tile.owner;
      if (!matchesOwner) {
        const segment = insetSegment(
          vertices[edge.start],
          vertices[edge.end],
          inset
        );
        tile.ownerBorderSegments.push({
          ...segment,
          color: borderColor,
          key: `${tile.key}-${edge.key}`,
        });
      }
    });
  });

  return tiles;
}

function deriveSecondaryColor(color) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color || "#ffffff";
  }
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  const lighten = luminance < 140;
  const target = lighten ? 255 : 0;
  const amount = lighten ? 0.35 : 0.3;
  const mix = (channel) => Math.round(channel + (target - channel) * amount);
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

function parseHexColor(color) {
  if (typeof color !== "string") {
    return null;
  }
  const hex = color.trim();
  if (!hex.startsWith("#")) {
    return null;
  }
  const value = hex.slice(1);
  if (value.length === 3) {
    const r = parseInt(value[0] + value[0], 16);
    const g = parseInt(value[1] + value[1], 16);
    const b = parseInt(value[2] + value[2], 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return { r, g, b };
  }
  if (value.length === 6) {
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return { r, g, b };
  }
  return null;
}

function textStrokeStyleForFill(fill) {
  const rgb = parseHexColor(fill);
  if (!rgb) {
    return { stroke: "rgba(0, 0, 0, 0.7)", strokeWidth: 1.2 };
  }
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  if (luminance < 40) {
    return { stroke: "rgba(255, 255, 255, 0.9)", strokeWidth: 0.8 };
  }
  return { stroke: "rgba(0, 0, 0, 0.7)", strokeWidth: 1.2 };
}

function toHex(value) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}
</script>

<style lang="stylus">
@import '../../styles/config.styl';

.tile-map {
  display: grid;
  gap: 1.5rem;
}

.tile-map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.tile-map-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
}

.tile-map-subtitle {
  margin: 0.2rem 0 0;
  color: lighten($textColor, 25%);
  font-size: 0.95rem;
}

.tile-map-subtitle-hint {
  font-size: 0.85rem;
  color: lighten($textColor, 40%);
}

.tile-map-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  user-select: none;
}

.tile-map-control {
  min-width: 2.4rem;
  height: 2.4rem;
  padding: 0 0.8rem;
  border-radius: 999px;
  border: 1px solid $borderColor;
  background: rgba(10, 10, 10, 0.8);
  color: $textColor;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tile-map-control:hover {
  color: $backColor;
  background: $accentColor;
}

.tile-map-scale {
  font-size: 0.9rem;
  font-weight: 700;
  color: lighten($textColor, 25%);
}

.tile-map-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21rem;
  gap: 1.5rem;
  align-items: start;
}

.tile-map-viewport {
  position: relative;
  width: 100%;
  height: auto;
  min-height: 18rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0b0b0b;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  outline: none;
}

.tile-map-viewport:focus {
  box-shadow: 0 0 0 2px $accentColor;
}

.tile-map-viewport.dragging {
  cursor: grabbing;
}

.tile-map-viewport.brush-active {
  cursor: crosshair;
}

.tile-map-loading,
.tile-map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: lighten($textColor, 20%);
  font-weight: 700;
  text-align: center;
  padding: 1rem;
}

.tile-map-canvas {
  transform-origin: top left;
  width: 100%;
  height: 100%;
  cursor: grab;
  position: relative;
}

.tile-map-svg {
  display: block;
}

.tile-map-canvas-layer {
  display: block;
}

.tile-map-hint {
  position: absolute;
  inset-block-end: 0.75rem;
  inset-inline-start: 0.75rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.6);
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
}

.tile-group:hover .tile-hex {
  stroke-linejoin: round;
  stroke-linecap: round;
}

.tile-hex {
  stroke: rgba(0, 0, 0, 0.25);
  stroke-width: 1;
  fill: #3c3c3c;
  transition: stroke 0.2s ease;
  paint-order: stroke;
}

.tile-selection-outline {
  fill: none;
  stroke: #ffffff;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.tile-hover-outline {
  fill: none;
  stroke: rgba(255, 255, 255, 0.65);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.tile-owner-overlay {
  pointer-events: none;
}

.tile-owner-border {
  stroke-width: 2;
  stroke-linejoin: round;
  pointer-events: none;
  opacity: 0.85;
}

.terrain-grass {
  fill: #6b8f46;
  background-color: #6b8f46;
}

.terrain-plains {
  fill: #9aa857;
  background-color: #9aa857;
}

.terrain-desert {
  fill: #c9ad5f;
  background-color: #c9ad5f;
}

.terrain-tundra {
  fill: #8aa089;
  background-color: #8aa089;
}

.terrain-snow {
  fill: #d9e4e7;
  background-color: #d9e4e7;
}

.terrain-coast {
  fill: #3c7f9a;
  background-color: #3c7f9a;
}

.terrain-ocean {
  fill: #1f4f6d;
  background-color: #1f4f6d;
}

.tile-elevation {
  fill: rgba(255, 255, 255, 0.35);
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.6;
}

.elevation-hill {
  fill: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.35);
}

.elevation-mountain {
  fill: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.6);
}

.tile-feature {
  stroke-width: 0.6;
}

.tile-wonder {
  stroke-width: 0.6;
}

.tile-resource {
  fill: #f3c969;
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 0.6;
}

.resource-strategic {
  fill: #ff7043;
}

.resource-bonus {
  fill: #81c784;
}

.resource-luxury {
  fill: #ffd54f;
}

.tile-improvement {
  fill: #d7d0c0;
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.6;
}

.improvement-farm {
  fill: #c7a85a;
}

.improvement-mine {
  fill: #8b8b8b;
}

.improvement-pasture {
  fill: #c0b08d;
}

.improvement-plantation {
  fill: #b9965a;
}

.improvement-camp {
  fill: #a8764f;
}

.improvement-boats {
  fill: #6fa8dc;
}

.improvement-quarry {
  fill: #9e9e9e;
}

.improvement-lumber {
  fill: #7a6a5c;
}

.improvement-trade {
  fill: #8bc34a;
}

.improvement-well {
  fill: #607d8b;
}

.improvement-fort {
  fill: #6d4c41;
}

.improvement-landmark {
  fill: #ffcc80;
}

.improvement-special {
  fill: #b0bec5;
}

.tile-route {
  stroke: #f3d18c;
  stroke-width: 1.4;
}

.tile-citadel {
  fill: rgba(255, 255, 255, 0.92);
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 1.2;
}

.route-road {
  stroke: #f3d18c;
  background: #f3d18c;
  color: #f3d18c;
}

.route-railroad {
  stroke: #cfd8dc;
  background: #cfd8dc;
  color: #cfd8dc;
}

.tile-river {
  stroke: #4fc3f7;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.tile-unit {
  fill: #111;
  stroke: #fff;
  stroke-width: 0.6;
}

.tile-unit-label {
  fill: #fff;
  font-size: 5px;
  font-weight: 700;
  pointer-events: none;
}

.tile-unit-marker {
  stroke-width: 1;
  stroke-linejoin: round;
  stroke-linecap: round;
  pointer-events: none;
}

.tile-city {
  fill: #131313;
  stroke: #fff;
  stroke-width: 1.2;
}

.tile-city-capital {
  fill: #fff;
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 0.75;
  scale: 1.5;
  pointer-events: none;
}

.tile-city-labels {
  pointer-events: none;
}

.tile-city-label {
  pointer-events: none;
}

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

.city-label-text {
  font-weight: 700;
  font-size: 6px;
  letter-spacing: 0.02em;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.7);
  stroke-width: 1.2;
}

.city-label-pop {
  fill: #f5f1e6;
}

.city-label-name {
  fill: #e6c07a;
  font-weight: 800;
}

.tile-map-info {
  display: grid;
  gap: 1rem;
}

.tile-map-legend {
  margin-top: 0.5rem;
}

.tile-info-card,
.tile-legend-card {
  background: rgba(10, 10, 10, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
}

.tile-info-summary {
  display: none;
}

.tile-info-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 0.8rem;
}

.tile-info-list {
  display: grid;
  gap: 0.5rem;
}

.tile-info-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.tile-info-label {
  color: lighten($textColor, 25%);
}

.tile-info-value {
  font-weight: 700;
}

.tile-info-empty {
  color: lighten($textColor, 35%);
  font-size: 0.9rem;
}

.tile-edit-form {
  display: grid;
  gap: 1rem;
}

.tile-edit-group {
  display: grid;
  gap: 0.25rem;
}

.tile-edit-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: lighten($textColor, 30%);
}

.tile-edit-label-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.tile-edit-checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 8, 8, 0.7);
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.72rem;
  color: lighten($textColor, 15%);
}

.tile-edit-checkbox-inline input {
  width: 0.9rem;
  height: 0.9rem;
  accent-color: $accentColor;
}

.tile-edit-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.85rem;
  color: lighten($textColor, 15%);
}

.tile-edit-checkbox input {
  width: 1rem;
  height: 1rem;
  accent-color: $accentColor;
}

.tile-edit-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tile-edit-input {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(5, 5, 5, 0.8);
  color: $textColor;
  font-weight: 700;
}

.tile-edit-input:focus {
  outline: none;
  border-color: $accentColor;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
}

.tile-edit-button {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid $borderColor;
  background: rgba(15, 15, 15, 0.9);
  color: $textColor;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tile-edit-button:hover {
  color: $backColor;
  background: $accentColor;
}

.tile-edit-button.is-active {
  color: $backColor;
  background: $accentColor;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
}

.tile-edit-hint {
  margin: 0.2rem 0 0;
  color: lighten($textColor, 35%);
  font-size: 0.75rem;
}

.tile-legend-section {
  margin-top: 1rem;
}

.tile-legend-accordion {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 10, 14, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  padding: 0.6rem 0.75rem 0.75rem;
}

.tile-legend-accordion[open] {
  background: rgba(14, 17, 24, 0.7);
}

.tile-legend-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  list-style: none;
  outline: none;
}

.tile-legend-summary::-webkit-details-marker {
  display: none;
}

.tile-legend-summary:focus-visible {
  box-shadow: 0 0 0 2px $accentColor;
  border-radius: 10px;
}

@media (max-width: 900px) {
  .tile-map-body {
    grid-template-columns: 1fr;
  }

  .tile-map-info {
    order: 2;
  }

  .tile-map-legend {
    order: 3;
  }

  .tile-map-controls {
    width: 100%;
    gap: 1.5rem;
  }

  .tile-map-control {
    min-width: 2.8rem;
    height: 2.8rem;
    padding: 0 0.9rem;
    font-size: 0.95rem;
  }

  .tile-map-viewport {
    min-height: 15rem;
  }

  .tile-info-accordion {
    padding: 0.8rem 0.9rem 0.9rem;
  }

  .tile-info-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    cursor: pointer;
    list-style: none;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    color: lighten($textColor, 25%);
  }

  .tile-info-summary::-webkit-details-marker {
    display: none;
  }

  .tile-info-accordion > .tile-info-title {
    display: none;
  }

  .tile-info-accordion[open] .tile-info-summary {
    margin-bottom: 0.75rem;
  }
}


.tile-legend-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: lighten($textColor, 30%);
}

.tile-legend-grid {
  inline-size: 100%;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
}

.tile-legend-accordion .tile-legend-grid {
  margin-top: 0.6rem;
}

.tile-legend-scroll {
  max-height: 12rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.tile-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.legend-swatch {
  width: 1rem;
  height: 1rem;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.legend-hex,
.legend-hex-outline {
  clip-path: polygon(
    25% 6.7%,
    75% 6.7%,
    100% 50%,
    75% 93.3%,
    25% 93.3%,
    0 50%
  );
}

.legend-hex-outline {
  background: transparent;
  border-width: 2px;
}

.legend-triangle {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.legend-circle {
  border-radius: 50%;
}

.legend-star {
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
}

.legend-diamond {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}

.legend-trapezoid {
  clip-path: polygon(22% 18%, 78% 18%, 92% 88%, 8% 88%);
}

.legend-square {
  border-radius: 4px;
}

.legend-line {
  width: 1.5rem;
  height: 0.6rem;
  border: none;
  background: transparent;
  position: relative;
}

.legend-line::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: currentColor;
}

.legend-feature {
  border-radius: 50%;
}

.legend-wonder {
  border-radius: 6px;
}

.legend-resource {
  border-radius: 3px;
}

.legend-improvement {
  border-radius: 3px;
}

.legend-route {
  border-radius: 8px;
  background: #f3d18c;
}

@media (max-width: $MQMobile) {
  .tile-map-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .tile-map-viewport {
    min-height: 14rem;
  }
}
</style>
