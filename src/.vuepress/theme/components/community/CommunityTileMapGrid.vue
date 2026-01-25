<template>
  <section class="tile-map">
    <div class="tile-map-header">
      <div class="tile-map-meta">
        <!-- <h2 class="tile-map-title">{{ mapName || "Map Viewer" }}</h2>
        <p class="tile-map-subtitle" v-if="mapDescription">
          {{ mapDescription }}
        </p> -->
        <h1 class="title-map-title">Community Tile Map</h1>
        <p class="tile-map-subtitle tile-map-subtitle-hint">
          Drag to pan. Click a tile to view details. Does not save yet, but can
          play around with the tools.
        </p>
      </div>
      <div class="tile-map-controls">
        <div class="tile-map-control-group">
          <span class="tile-map-control-label">Zoom</span>
          <div class="tile-map-control-pill">
            <button
              type="button"
              class="tile-map-control tile-map-control-icon"
              @click="zoomOut"
              aria-label="Zoom out"
            >
              &minus;
            </button>
            <span class="tile-map-scale">{{ scaleLabel }}</span>
            <button
              type="button"
              class="tile-map-control tile-map-control-icon"
              @click="zoomIn"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
        <div class="tile-map-control-group tile-map-control-actions">
          <button
            type="button"
            class="tile-map-control tile-map-control-ghost"
            @click="fitToView"
          >
            Fit
          </button>
          <button
            type="button"
            class="tile-map-control tile-map-control-ghost"
            @click="resetView"
          >
            Reset
          </button>
        </div>
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
        @pointercancel="onPointerUp"
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
                :class="[terrainClass(tile), { 'is-pillaged': tile.pillaged }]"
                :points="hexPoints"
                :style="tileHexStyle(tile)"
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
                v-if="showUnits && primaryUnit(tile)"
                class="tile-unit"
                :d="unitPath"
                :transform="`translate(${hexSize * 0.3}, ${-hexSize * 0.35})`"
              />
              <text
                v-if="showUnits && primaryUnit(tile) && showLabels"
                class="tile-unit-label"
                :x="hexSize * 0.3"
                :y="-hexSize * 0.35 + 1.5"
                text-anchor="middle"
              >
                {{ unitLabel(primaryUnit(tile)) }}
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
              <polygon
                v-if="tile.civilianUnit && scale > 1"
                class="tile-unit-marker tile-unit-marker-civilian"
                :points="unitTrianglePoints"
                :transform="unitMarkerTransform(tile, 'civilian')"
                :style="unitMarkerStyle(tile.civilianUnit)"
              />
              <circle
                v-if="tile.combatUnit && scale > 1"
                class="tile-unit-marker tile-unit-marker-combat"
                :r="unitMarkerRadius"
                cx="0"
                cy="0"
                :transform="unitMarkerTransform(tile, 'combat')"
                :style="unitMarkerStyle(tile.combatUnit)"
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
        <div
          v-if="hoverTooltipVisible && hoverTooltipTile"
          ref="tileTooltip"
          class="tile-map-tooltip"
          :style="tooltipStyle"
        >
          <div class="tile-tooltip-title">
            {{ tileTitle(hoverTooltipTile) }}
          </div>
          <div class="tile-tooltip-list">
            <div class="tile-info-row">
              <div class="tile-info-label">Terrain</div>
              <div class="tile-info-value">
                {{ formatLabel(hoverTooltipTile.terrain) }}
              </div>
            </div>
            <div class="tile-info-row">
              <div class="tile-info-label">Elevation</div>
              <div class="tile-info-value">
                {{ elevationLabel(hoverTooltipTile.elevation) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.feature" class="tile-info-row">
              <div class="tile-info-label">Feature</div>
              <div class="tile-info-value">
                {{ formatLabel(hoverTooltipTile.feature) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.wonder" class="tile-info-row">
              <div class="tile-info-label">Natural Wonder</div>
              <div class="tile-info-value">
                {{ formatLabel(hoverTooltipTile.wonder) }}
              </div>
            </div>
            <div
              v-if="
                hoverTooltipTile.city &&
                Array.isArray(hoverTooltipTile.city.worldWonders) &&
                hoverTooltipTile.city.worldWonders.length
              "
              class="tile-info-row"
            >
              <div class="tile-info-label">World Wonders</div>
              <div class="tile-info-value">
                {{ worldWondersLabel(hoverTooltipTile.city) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.resource" class="tile-info-row">
              <div class="tile-info-label">Resource</div>
              <div class="tile-info-value">
                {{ resourceLabel(hoverTooltipTile) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.improvement" class="tile-info-row">
              <div class="tile-info-label">Improvement</div>
              <div class="tile-info-value">
                {{ formatLabel(hoverTooltipTile.improvement) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.route" class="tile-info-row">
              <div class="tile-info-label">Route</div>
              <div class="tile-info-value">
                {{ routeLabel(hoverTooltipTile.route) }}
              </div>
            </div>
            <div
              v-if="Number.isFinite(hoverTooltipTile.owner)"
              class="tile-info-row"
            >
              <div class="tile-info-label">Owner</div>
              <div class="tile-info-value">
                {{ ownerLabel(hoverTooltipTile.owner) }}
              </div>
            </div>
            <div
              v-if="
                hoverTooltipTile.city &&
                Number.isFinite(hoverTooltipTile.originalOwner)
              "
              class="tile-info-row"
            >
              <div class="tile-info-label">Original Owner</div>
              <div class="tile-info-value">
                {{ ownerLabel(hoverTooltipTile.originalOwner) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.combatUnit" class="tile-info-row">
              <div class="tile-info-label">Combat Unit</div>
              <div class="tile-info-value">
                {{ describeUnit(hoverTooltipTile.combatUnit) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.civilianUnit" class="tile-info-row">
              <div class="tile-info-label">Civilian Unit</div>
              <div class="tile-info-value">
                {{ describeUnit(hoverTooltipTile.civilianUnit) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.city" class="tile-info-row">
              <div class="tile-info-label">City</div>
              <div class="tile-info-value">
                {{ describeCity(hoverTooltipTile.city) }}
              </div>
            </div>
            <div
              v-if="hoverTooltipTile.city && hoverTooltipTile.city.religion"
              class="tile-info-row"
            >
              <div class="tile-info-label">Religion</div>
              <div class="tile-info-value">
                {{ hoverTooltipTile.city.religion }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.city" class="tile-info-row">
              <div class="tile-info-label">Puppeted</div>
              <div class="tile-info-value">
                {{ hoverTooltipTile.city.isPuppeted ? "Yes" : "No" }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.city" class="tile-info-row">
              <div class="tile-info-label">Occupied</div>
              <div class="tile-info-value">
                {{ hoverTooltipTile.city.isOccupied ? "Yes" : "No" }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.city" class="tile-info-row">
              <div class="tile-info-label">Resistance</div>
              <div class="tile-info-value">
                {{ hoverTooltipTile.city.isResistance ? "Yes" : "No" }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.continent" class="tile-info-row">
              <div class="tile-info-label">Continent</div>
              <div class="tile-info-value">
                {{ continentLabel(hoverTooltipTile.continent) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.hasRiver" class="tile-info-row">
              <div class="tile-info-label">River</div>
              <div class="tile-info-value">
                {{ hoverTooltipTile.hasRiver ? "Yes" : "None" }}
              </div>
            </div>
          </div>
        </div>
        <!-- <div class="tile-map-hint">Drag to pan.</div> -->
      </div>
      <aside class="tile-map-info">
        <div class="tile-info-card tile-info-accordion">
          <div class="tile-info-title">
            Edit Tile
            <span v-if="selectedTile" class="tile-info-title-meta">
              {{ tileTitle(selectedTile) }}
            </span>
          </div>
          <div class="tile-edit-auth">
            <div class="tile-edit-auth-row">
              <div class="tile-edit-auth-label">Editing</div>
              <div
                class="tile-edit-auth-status"
                :class="{
                  'is-enabled': canEdit,
                  'is-denied': authUser && !canEdit,
                  'is-loading': authChecking,
                }"
              >
                {{ authStatusLabel }}
              </div>
            </div>
            <div v-if="!authUser" class="tile-edit-auth-actions">
              <input
                class="tile-edit-input"
                type="email"
                placeholder="Email for edit access"
                v-model="authEmail"
                autocomplete="email"
              />
              <button
                type="button"
                class="tile-edit-button"
                :disabled="authLoading"
                @click="signInWithEmail"
              >
                Send Link
              </button>
            </div>
            <div v-else class="tile-edit-auth-actions">
              <span class="tile-edit-auth-user">{{ authUser.email }}</span>
              <button
                type="button"
                class="tile-edit-button"
                :disabled="authChecking"
                @click="refreshEditPermission"
              >
                Check Access
              </button>
              <button type="button" class="tile-edit-button" @click="signOut">
                Sign out
              </button>
            </div>
            <div v-if="authMessage" class="tile-edit-hint">
              {{ authMessage }}
            </div>
          </div>
          <div v-if="selectedTile" class="tile-edit-form">
            <fieldset class="tile-edit-fieldset" :disabled="!canEdit">
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
                      v-model="editCityCapital"
                      @change="applyCityCapitalEdit"
                      aria-label="Capital city"
                    />
                    Capital
                  </span>
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
                <label class="tile-edit-label" for="tile-combat-unit-input">
                  Combat Unit
                </label>
                <div class="tile-edit-row">
                  <input
                    id="tile-combat-unit-input"
                    class="tile-edit-input"
                    type="text"
                    list="tile-combat-unit-options"
                    placeholder="Search combat unit..."
                    v-model="editCombatUnitType"
                  />
                  <datalist id="tile-combat-unit-options">
                    <option
                      v-for="unit in combatUnitOptions"
                      :key="`combat-unit-${unit.name}`"
                      :value="unit.name"
                      :label="unit.name"
                    ></option>
                  </datalist>
                  <button
                    type="button"
                    class="tile-edit-button"
                    @click="applyCombatUnitEdit"
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    class="tile-edit-button"
                    @click="clearCombatUnitEdit"
                  >
                    Clear
                  </button>
                </div>
                <div class="tile-edit-row">
                  <input
                    id="tile-combat-unit-owner-input"
                    class="tile-edit-input"
                    type="text"
                    list="tile-owner-options"
                    placeholder="Combat owner..."
                    v-model="editCombatUnitOwnerName"
                    :style="ownerInputStyle(editCombatUnitOwnerName)"
                  />
                </div>
              </div>
              <div class="tile-edit-group">
                <label class="tile-edit-label" for="tile-civilian-unit-input">
                  Civilian Unit
                </label>
                <div class="tile-edit-row">
                  <input
                    id="tile-civilian-unit-input"
                    class="tile-edit-input"
                    type="text"
                    list="tile-civilian-unit-options"
                    placeholder="Search civilian unit..."
                    v-model="editCivilianUnitType"
                  />
                  <datalist id="tile-civilian-unit-options">
                    <option
                      v-for="unit in civilianUnitOptions"
                      :key="`civilian-unit-${unit.name}`"
                      :value="unit.name"
                      :label="unit.name"
                    ></option>
                  </datalist>
                  <button
                    type="button"
                    class="tile-edit-button"
                    @click="applyCivilianUnitEdit"
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    class="tile-edit-button"
                    @click="clearCivilianUnitEdit"
                  >
                    Clear
                  </button>
                </div>
                <div class="tile-edit-row">
                  <input
                    id="tile-civilian-unit-owner-input"
                    class="tile-edit-input"
                    type="text"
                    list="tile-owner-options"
                    placeholder="Civilian owner..."
                    v-model="editCivilianUnitOwnerName"
                    :style="ownerInputStyle(editCivilianUnitOwnerName)"
                  />
                </div>
              </div>
              <div v-if="!selectedTile.city" class="tile-edit-group">
                <label class="tile-edit-label tile-edit-label-inline">
                  <span class="tile-edit-checkbox-inline">
                    <input
                      type="checkbox"
                      v-model="editPillaged"
                      @change="applyPillagedEdit"
                      aria-label="Pillaged terrain"
                    />
                    Pillaged
                  </span>
                  <span class="tile-edit-checkbox-inline">
                    <input
                      type="checkbox"
                      v-model="editCitadel"
                      @change="applyCitadelEdit"
                      aria-label="Citadel improvement"
                    />
                    Citadel
                  </span>
                </label>
              </div>
            </fieldset>
            <p class="tile-edit-hint">
              Editing applies to the selected tile. Brush applies for multiple.
            </p>
          </div>
          <div v-else class="tile-info-empty">
            Select a tile to edit its content.
          </div>
        </div>
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
import { createClient } from "@supabase/supabase-js";
import { mapConfig, ownerPalette } from "../../../data/communityTileMap";
import { getEdition } from "../../../data/editions";

const s5Edition = getEdition("s5");
const s5OwnerList = [
  ...((s5Edition && s5Edition.competitors) || []),
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
  [normalizeOwnerKey("Tlingit")]: { primary: "#e0d4b4", secondary: "#404a4e" },
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
const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";
const SUPABASE_MAP_ID = "s5";
const SUPABASE_OVERRIDE_TABLE = "tile_overrides";
const SUPABASE_EDIT_LOG_TABLE = "tile_edits";
const SUPABASE_CHECK_FUNCTION = "check-kofi-subscriber";

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
      supabase: null,
      authEmail: "",
      authUser: null,
      authMessage: "",
      authChecking: false,
      authLoading: false,
      canEdit: false,
      tileSaveQueue: new Map(),
      tileSaveTimer: null,
      tileOverrideSubscription: null,
      authSubscription: null,
      scale: 1,
      minScale: 0.4,
      maxScale: mapConfig.maxScale || 3,
      translate: { x: 0, y: 0 },
      viewportSize: { width: 0, height: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragTranslate: { x: 0, y: 0 },
      dragMoved: false,
      activePointers: new Map(),
      isPinching: false,
      pinchStartDistance: 0,
      pinchStartScale: 1,
      pinchCenter: { x: 0, y: 0 },
      hoveredTile: null,
      hoverTooltipTile: null,
      hoverTooltipVisible: false,
      hoverTooltipTimer: null,
      hoverTooltipPosition: { x: 0, y: 0 },
      hoverTooltipSize: { width: 0, height: 0 },
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
      editCombatUnitType: "",
      editCombatUnitOwnerName: "",
      editCivilianUnitType: "",
      editCivilianUnitOwnerName: "",
      editCitadel: false,
      editPillaged: false,
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

    tooltipStyle() {
      if (!this.viewportSize.width || !this.viewportSize.height) {
        return null;
      }
      const padding = 12;
      const offset = 16;
      const width = this.hoverTooltipSize.width || 240;
      const height = this.hoverTooltipSize.height || 200;
      let left = this.hoverTooltipPosition.x + offset;
      let top = this.hoverTooltipPosition.y + offset;
      left = clampValue(
        left,
        padding,
        Math.max(padding, this.viewportSize.width - width - padding)
      );
      top = clampValue(
        top,
        padding,
        Math.max(padding, this.viewportSize.height - height - padding)
      );
      return {
        left: `${left}px`,
        top: `${top}px`,
      };
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

    authStatusLabel() {
      if (this.authChecking) {
        return "Checking access";
      }
      if (!this.authUser) {
        return "Viewer mode";
      }
      return this.canEdit ? "Editing enabled" : "Viewer only";
    },

    useTerrainCanvas() {
      return this.scale <= 1;
    },

    ownerOptions() {
      return s5OwnerList;
    },

    combatUnitOptions() {
      return BASE_UNITS.filter((unit) => unit.role === "combat");
    },

    civilianUnitOptions() {
      return BASE_UNITS.filter((unit) => unit.role === "civilian");
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
    hoveredTile(nextTile) {
      if (!nextTile) {
        this.hideHoverTooltip();
        return;
      }
      this.scheduleHoverTooltip(nextTile);
    },
    selectedTile(nextTile) {
      this.syncEditFieldsFromTile(nextTile);
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.updateViewportSize();
      this.fitToView();
    });
    this.initSupabase();
    this.loadMap();
    window.addEventListener("resize", this.handleResize);
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
    this.teardownSupabase();
  },

  methods: {
    initSupabase() {
      if (this.supabase) {
        return;
      }
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = this.supabase.auth.onAuthStateChange(
        (_event, session) => {
          this.handleAuthSession(session);
        }
      );
      this.authSubscription = data ? data.subscription : null;
      this.supabase.auth.getSession().then(({ data: sessionData }) => {
        this.handleAuthSession(sessionData ? sessionData.session : null);
      });
    },

    teardownSupabase() {
      if (this.authSubscription) {
        this.authSubscription.unsubscribe();
        this.authSubscription = null;
      }
      if (this.tileOverrideSubscription && this.supabase) {
        this.supabase.removeChannel(this.tileOverrideSubscription);
        this.tileOverrideSubscription = null;
      }
      if (this.tileSaveTimer) {
        window.clearTimeout(this.tileSaveTimer);
        this.tileSaveTimer = null;
      }
    },

    handleAuthSession(session) {
      this.authUser = session ? session.user : null;
      if (this.authUser) {
        if (!this.authEmail) {
          this.authEmail = this.authUser.email || "";
        }
        this.refreshEditPermission();
      } else {
        this.canEdit = false;
        this.ownerBrushEnabled = false;
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
      }
    },

    async signInWithEmail() {
      if (!this.supabase) {
        return;
      }
      const email = String(this.authEmail || "").trim();
      if (!email) {
        this.authMessage = "Enter your email to receive a login link.";
        return;
      }
      this.authLoading = true;
      this.authMessage = "";
      const redirectBase = `${window.location.origin}${window.location.pathname}`;
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectBase,
        },
      });
      this.authLoading = false;
      if (error) {
        this.authMessage = error.message || "Unable to send login link.";
        return;
      }
      this.authMessage = "Check your email for the login link to unlock edits.";
    },

    async signOut() {
      if (!this.supabase) {
        return;
      }
      await this.supabase.auth.signOut();
      this.authUser = null;
      this.canEdit = false;
      this.authMessage = "Signed out.";
      this.ownerBrushEnabled = false;
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
    },

    async refreshEditPermission() {
      if (!this.supabase || !this.authUser) {
        this.canEdit = false;
        return;
      }
      this.authChecking = true;
      this.authMessage = "";
      const { data: sessionData } = await this.supabase.auth.getSession();
      const accessToken =
        sessionData && sessionData.session
          ? sessionData.session.access_token
          : null;
      const { data, error } = await this.supabase.functions.invoke(
        SUPABASE_CHECK_FUNCTION,
        {
          body: {
            map_id: SUPABASE_MAP_ID,
            email: this.authUser.email,
          },
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        }
      );
      this.authChecking = false;
      if (error) {
        this.canEdit = false;
        this.authMessage =
          error.message || "Unable to verify edit permissions.";
        return;
      }
      this.canEdit = !!(data && data.allowed);
      if (!this.canEdit) {
        this.ownerBrushEnabled = false;
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
        this.authMessage = "Viewer mode: this email is not on the edit list.";
      } else {
        this.authMessage = "Editing enabled for this account.";
      }
    },

    ensureEditAccess() {
      if (this.canEdit) {
        return true;
      }
      if (!this.authUser) {
        this.authMessage = "Sign in with your subscriber email to edit.";
      } else if (!this.authChecking) {
        this.authMessage = "This account does not have edit access.";
      }
      return false;
    },

    syncEditFieldsFromTile(tile) {
      if (tile) {
        this.editOwnerName = ownerNameForId(tile.owner);
        this.editOriginalOwnerName = ownerNameForId(tile.originalOwner);
        this.editCityValue =
          tile.city && Number.isFinite(tile.city.size) ? tile.city.size : null;
        this.editCityName = tile.city ? tile.city.name || "" : "";
        this.editCityReligion = tile.city ? tile.city.religion || "" : "";
        this.editWorldWonders = tile.city
          ? worldWondersInputValue(tile.city.worldWonders)
          : "";
        this.editCitadel = isCitadelImprovement(tile);
        this.editCityCapital = tile.city ? !!tile.city.isCapital : false;
        this.editCityPuppeted = tile.city ? !!tile.city.isPuppeted : false;
        this.editCityOccupied = tile.city ? !!tile.city.isOccupied : false;
        this.editCityResistance = tile.city ? !!tile.city.isResistance : false;
        this.editCombatUnitType = unitInputValueForUnit(tile.combatUnit);
        this.editCombatUnitOwnerName = unitOwnerInputValueForUnit(
          tile.combatUnit
        );
        this.editCivilianUnitType = unitInputValueForUnit(tile.civilianUnit);
        this.editCivilianUnitOwnerName = unitOwnerInputValueForUnit(
          tile.civilianUnit
        );
        this.editPillaged = !!tile.pillaged;
      } else {
        this.editOwnerName = "";
        this.editOriginalOwnerName = "";
        this.editCityValue = null;
        this.editCityName = "";
        this.editCityReligion = "";
        this.editWorldWonders = "";
        this.editCitadel = false;
        this.editCityCapital = false;
        this.editCityPuppeted = false;
        this.editCityOccupied = false;
        this.editCityResistance = false;
        this.editCombatUnitType = "";
        this.editCombatUnitOwnerName = "";
        this.editCivilianUnitType = "";
        this.editCivilianUnitOwnerName = "";
        this.editPillaged = false;
      }
    },

    async loadTileOverrides() {
      if (!this.supabase) {
        return;
      }
      const { data, error } = await this.supabase
        .from(SUPABASE_OVERRIDE_TABLE)
        .select("tile_key,payload")
        .eq("map_id", SUPABASE_MAP_ID);
      if (error || !Array.isArray(data)) {
        return;
      }
      this.applyTileOverrides(data);
    },

    applyTileOverrides(rows) {
      if (!this.tileLookup || !Array.isArray(rows) || !rows.length) {
        return;
      }
      let needsBorderRebuild = false;
      rows.forEach((row) => {
        const tileKey = row.tile_key || row.tileKey;
        if (!tileKey) {
          return;
        }
        const tile = this.tileLookup.get(tileKey);
        if (!tile) {
          return;
        }
        const ownerChanged = this.applyTileOverride(tile, row.payload);
        if (ownerChanged) {
          needsBorderRebuild = true;
        }
      });
      if (needsBorderRebuild) {
        this.rebuildOwnerBorders();
      }
      this.nextUnitId = nextUnitIdFromTiles(this.tiles);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyTileOverride(tile, payload) {
      if (!tile || !payload) {
        return false;
      }
      let ownerChanged = false;
      if (Object.prototype.hasOwnProperty.call(payload, "owner")) {
        const nextOwner = Number.isFinite(payload.owner) ? payload.owner : null;
        ownerChanged = tile.owner !== nextOwner;
        tile.owner = nextOwner;
        tile.customOwner = Number.isFinite(nextOwner);
        if (Number.isFinite(nextOwner)) {
          this.ensureOwnerColors(nextOwner);
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, "originalOwner")) {
        const nextOriginal = Number.isFinite(payload.originalOwner)
          ? payload.originalOwner
          : null;
        tile.originalOwner = nextOriginal;
        tile.customOriginalOwner = Number.isFinite(nextOriginal);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "pillaged")) {
        tile.pillaged = !!payload.pillaged;
      }
      if (Object.prototype.hasOwnProperty.call(payload, "citadel")) {
        if (payload.citadel) {
          setCitadelImprovement(tile);
        } else {
          clearCitadelImprovement(tile);
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, "combatUnit")) {
        tile.combatUnit = this.normalizeUnitPayload(payload.combatUnit);
        if (tile.combatUnit && Number.isFinite(tile.combatUnit.owner)) {
          this.ensureOwnerColors(tile.combatUnit.owner);
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, "civilianUnit")) {
        tile.civilianUnit = this.normalizeUnitPayload(payload.civilianUnit);
        if (tile.civilianUnit && Number.isFinite(tile.civilianUnit.owner)) {
          this.ensureOwnerColors(tile.civilianUnit.owner);
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, "city")) {
        tile.city = this.normalizeCityPayload(payload.city, tile);
        if (tile.city) {
          if (Number.isFinite(tile.city.owner)) {
            this.ensureOwnerColors(tile.city.owner);
          }
          clearCitadelImprovement(tile);
        }
      }
      if (this.selectedTile && this.selectedTile.key === tile.key) {
        this.syncEditFieldsFromTile(tile);
      }
      return ownerChanged;
    },

    normalizeUnitPayload(payload) {
      if (!payload || !payload.type) {
        return null;
      }
      const owner = Number.isFinite(payload.owner) ? payload.owner : null;
      const id = Number.isFinite(payload.id) ? payload.id : null;
      return {
        id,
        type: payload.type,
        owner,
      };
    },

    normalizeCityPayload(payload, tile) {
      if (!payload) {
        return null;
      }
      const owner = Number.isFinite(payload.owner)
        ? payload.owner
        : tile
        ? tile.owner
        : null;
      return {
        id: payload.id !== undefined && payload.id !== null ? payload.id : null,
        name: payload.name || "",
        size: Number.isFinite(payload.size) ? payload.size : 1,
        owner,
        religion: payload.religion || "",
        worldWonders: Array.isArray(payload.worldWonders)
          ? [...payload.worldWonders]
          : [],
        isPuppeted: !!payload.isPuppeted,
        isOccupied: !!payload.isOccupied,
        isResistance: !!payload.isResistance,
        isCustom: true,
        isCapital: !!payload.isCapital,
      };
    },

    buildTileOverridePayload(tile) {
      return {
        owner: Number.isFinite(tile.owner) ? tile.owner : null,
        originalOwner: Number.isFinite(tile.originalOwner)
          ? tile.originalOwner
          : null,
        pillaged: !!tile.pillaged,
        citadel: isCitadelImprovement(tile),
        combatUnit: tile.combatUnit
          ? {
              id:
                tile.combatUnit.id !== undefined && tile.combatUnit.id !== null
                  ? tile.combatUnit.id
                  : null,
              type: tile.combatUnit.type,
              owner: Number.isFinite(tile.combatUnit.owner)
                ? tile.combatUnit.owner
                : null,
            }
          : null,
        civilianUnit: tile.civilianUnit
          ? {
              id:
                tile.civilianUnit.id !== undefined &&
                tile.civilianUnit.id !== null
                  ? tile.civilianUnit.id
                  : null,
              type: tile.civilianUnit.type,
              owner: Number.isFinite(tile.civilianUnit.owner)
                ? tile.civilianUnit.owner
                : null,
            }
          : null,
        city: tile.city
          ? {
              id:
                tile.city.id !== undefined && tile.city.id !== null
                  ? tile.city.id
                  : null,
              name: tile.city.name || "",
              size: Number.isFinite(tile.city.size) ? tile.city.size : 1,
              owner: Number.isFinite(tile.city.owner) ? tile.city.owner : null,
              religion: tile.city.religion || "",
              worldWonders: Array.isArray(tile.city.worldWonders)
                ? [...tile.city.worldWonders]
                : [],
              isPuppeted: !!tile.city.isPuppeted,
              isOccupied: !!tile.city.isOccupied,
              isResistance: !!tile.city.isResistance,
              isCapital: !!tile.city.isCapital,
            }
          : null,
      };
    },

    queueTileSave(tile) {
      if (!this.supabase || !this.canEdit || !tile) {
        return;
      }
      const payload = this.buildTileOverridePayload(tile);
      this.tileSaveQueue.set(tile.key, {
        tile_key: tile.key,
        payload,
      });
      if (this.tileSaveTimer) {
        return;
      }
      this.tileSaveTimer = window.setTimeout(() => {
        this.flushTileSaves();
      }, 500);
    },

    async flushTileSaves() {
      if (!this.supabase || !this.tileSaveQueue.size) {
        this.tileSaveTimer = null;
        return;
      }
      const now = new Date().toISOString();
      const rows = Array.from(this.tileSaveQueue.values()).map((entry) => ({
        map_id: SUPABASE_MAP_ID,
        tile_key: entry.tile_key,
        payload: entry.payload,
        updated_at: now,
        updated_by: this.authUser ? this.authUser.id : null,
      }));
      this.tileSaveQueue.clear();
      this.tileSaveTimer = null;
      const { error } = await this.supabase
        .from(SUPABASE_OVERRIDE_TABLE)
        .upsert(rows, {
          onConflict: "map_id,tile_key",
        });
      if (error) {
        this.authMessage = "Unable to sync edits. Please try again.";
        return;
      }
      await this.supabase.from(SUPABASE_EDIT_LOG_TABLE).insert(
        rows.map((row) => ({
          map_id: row.map_id,
          tile_key: row.tile_key,
          payload: row.payload,
          edited_by: row.updated_by,
          edited_at: now,
        }))
      );
    },

    subscribeToTileOverrides() {
      if (!this.supabase || this.tileOverrideSubscription) {
        return;
      }
      this.tileOverrideSubscription = this.supabase
        .channel(`tile-overrides-${SUPABASE_MAP_ID}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: SUPABASE_OVERRIDE_TABLE,
            filter: `map_id=eq.${SUPABASE_MAP_ID}`,
          },
          (payload) => {
            const record = payload.new || payload.old;
            if (!record || !this.tileLookup) {
              return;
            }
            const tileKey = record.tile_key || record.tileKey;
            if (!tileKey) {
              return;
            }
            const tile = this.tileLookup.get(tileKey);
            if (!tile) {
              return;
            }
            const ownerChanged = this.applyTileOverride(tile, record.payload);
            if (ownerChanged) {
              this.rebuildOwnerBorders();
            }
            this.nextUnitId = nextUnitIdFromTiles(this.tiles);
            if (this.useTerrainCanvas) {
              this.drawTerrainCanvas();
            }
          }
        )
        .subscribe();
    },

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
      this.loadTileOverrides();
      this.subscribeToTileOverrides();
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

    updateTooltipPosition(event) {
      const viewport = this.$refs.viewport;
      if (!viewport || !event) {
        return;
      }
      const rect = viewport.getBoundingClientRect();
      this.hoverTooltipPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      if (this.hoverTooltipVisible) {
        this.$nextTick(() => {
          this.updateHoverTooltipSize();
        });
      }
    },

    updateHoverTooltipSize() {
      const tooltip = this.$refs.tileTooltip;
      if (!tooltip) {
        return;
      }
      this.hoverTooltipSize = {
        width: tooltip.offsetWidth,
        height: tooltip.offsetHeight,
      };
    },

    scheduleHoverTooltip(tile) {
      this.clearHoverTooltipTimer();
      this.hoverTooltipVisible = false;
      this.hoverTooltipTile = null;
      if (
        !tile ||
        this.isDragging ||
        this.isPaintingOwner ||
        this.ownerBrushEnabled
      ) {
        return;
      }
      const targetTile = tile;
      this.hoverTooltipTimer = window.setTimeout(() => {
        if (
          this.hoveredTile === targetTile &&
          !this.isDragging &&
          !this.isPaintingOwner
        ) {
          this.hoverTooltipTile = targetTile;
          this.hoverTooltipVisible = true;
          this.$nextTick(() => {
            this.updateHoverTooltipSize();
          });
        }
      }, 1000);
    },

    clearHoverTooltipTimer() {
      if (this.hoverTooltipTimer) {
        window.clearTimeout(this.hoverTooltipTimer);
        this.hoverTooltipTimer = null;
      }
    },

    hideHoverTooltip() {
      this.clearHoverTooltipTimer();
      this.hoverTooltipVisible = false;
      this.hoverTooltipTile = null;
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
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      this.hideHoverTooltip();
      if (event.pointerType === "touch") {
        this.activePointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        if (this.activePointers.size === 2) {
          const points = Array.from(this.activePointers.values());
          this.isPinching = true;
          this.pinchStartDistance = Math.hypot(
            points[0].x - points[1].x,
            points[0].y - points[1].y
          );
          this.pinchStartScale = this.scale;
          const viewport = this.$refs.viewport;
          if (viewport) {
            const rect = viewport.getBoundingClientRect();
            this.pinchCenter = {
              x: (points[0].x + points[1].x) / 2 - rect.left,
              y: (points[0].y + points[1].y) / 2 - rect.top,
            };
          }
          this.isDragging = false;
          this.dragMoved = true;
          return;
        }
      }
      if (this.ownerBrushEnabled) {
        if (!this.ensureEditAccess()) {
          return;
        }
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
      this.updateTooltipPosition(event);
      if (event.pointerType === "touch") {
        if (this.activePointers.has(event.pointerId)) {
          this.activePointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
        }
        if (this.isPinching && this.activePointers.size >= 2) {
          const points = Array.from(this.activePointers.values());
          const distance = Math.hypot(
            points[0].x - points[1].x,
            points[0].y - points[1].y
          );
          if (this.pinchStartDistance > 0) {
            const ratio = distance / this.pinchStartDistance;
            this.applyZoom(this.pinchStartScale * ratio, this.pinchCenter);
          }
          return;
        }
      }
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
      if (event.pointerType === "touch") {
        this.activePointers.delete(event.pointerId);
        if (this.activePointers.size < 2) {
          this.isPinching = false;
          this.pinchStartDistance = 0;
        }
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
        const fill = adjustedTerrainFill(tile, getColor);
        const previousAlpha = context.globalAlpha;
        context.globalAlpha = Number.isFinite(fill.alpha)
          ? fill.alpha
          : previousAlpha;
        drawHexPath(tile);
        context.fillStyle = fill.color;
        context.fill();
        context.globalAlpha = previousAlpha;
      });

      context.lineWidth = 0.2;
      context.strokeStyle = "rgba(0, 0, 0, 0.2)";
      this.tiles.forEach((tile) => {
        drawHexPath(tile);
        context.stroke();
      });

      const overlayAlpha = 0.65;
      const overlayWaterAlpha = 0.1;
      const previousAlpha = context.globalAlpha;
      const overlayTiles = this.tiles.filter((tile) =>
        Number.isFinite(tile.owner)
      );
      if (overlayTiles.length) {
        overlayTiles.forEach((tile) => {
          const isWater =
            tile.terrainId === "ocean" || tile.terrainId === "coast";
          context.globalAlpha = isWater ? overlayWaterAlpha : overlayAlpha;
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
      this.syncEditFieldsFromTile(tile);
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

    tileHexStyle(tile) {
      const stroke = this.tileStrokeStyle(tile);
      if (!tile) {
        return stroke;
      }
      const baseColor = terrainColor(tile.terrainId);
      const fill = adjustedTerrainFill(tile, () => baseColor);
      const nextStyle = { ...stroke, fill: fill.color };
      if (Number.isFinite(fill.alpha) && fill.alpha < 1) {
        nextStyle.fillOpacity = fill.alpha;
      }
      return nextStyle;
    },

    ownerOverlayStyle(tile) {
      const color = this.ownerColors[tile.owner] || "#ffffff";
      const isWater =
        tile && (tile.terrainId === "ocean" || tile.terrainId === "coast");
      return { fill: color, fillOpacity: isWater ? 0.1 : 0.5 };
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
      const unitWidth = height * 0.45;
      const nameUnits = Array.from(name).reduce((total, char) => {
        if (char === " ") {
          return total + 0.5;
        }
        if (/[ilI1'`]/.test(char)) {
          return total + 0.6;
        }
        if (/[mwMW]/.test(char)) {
          return total + 1.2;
        }
        if (/[0-9]/.test(char)) {
          return total + 0.85;
        }
        return total + 0.95;
      }, 0);
      const nameWidth = nameUnits * unitWidth;
      const rightPad = height * 0.38;
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

    primaryUnit(tile) {
      if (!tile) {
        return null;
      }
      return tile.combatUnit || tile.civilianUnit || null;
    },

    unitMarkerStyle(unit) {
      if (!unit) {
        return null;
      }
      const colors = unitMarkerColors(
        unit.owner,
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

    unitMarkerTransform(tile, role) {
      if (!tile) {
        return "translate(0, 0)";
      }
      const hasCombat = !!tile.combatUnit;
      const hasCivilian = !!tile.civilianUnit;
      if (hasCombat && hasCivilian) {
        const offset = this.hexSize * 0.28;
        return `translate(0, ${role === "civilian" ? -offset : offset})`;
      }
      return "translate(0, 0)";
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
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCombatUnitEdit() {
      this.applyUnitEditForRole("combat");
    },

    applyCivilianUnitEdit() {
      this.applyUnitEditForRole("civilian");
    },

    applyUnitEditForRole(role) {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      const typeInput =
        role === "combat" ? this.editCombatUnitType : this.editCivilianUnitType;
      const ownerInput =
        role === "combat"
          ? this.editCombatUnitOwnerName
          : this.editCivilianUnitOwnerName;
      const unitType = normalizeUnitInput(typeInput);
      if (!unitType) {
        return;
      }
      if (unitRoleFromType(unitType) !== role) {
        return;
      }
      const ownerInputId = resolveOwnerInput(ownerInput);
      const owner = Number.isFinite(ownerInputId)
        ? ownerInputId
        : Number.isFinite(this.selectedTile.owner)
        ? this.selectedTile.owner
        : null;
      const existingUnit =
        role === "combat"
          ? this.selectedTile.combatUnit
          : this.selectedTile.civilianUnit;
      const nextId =
        existingUnit && Number.isFinite(existingUnit.id)
          ? existingUnit.id
          : this.nextUnitId++;
      const unitData = {
        id: nextId,
        type: unitType,
        owner,
      };
      if (role === "combat") {
        this.selectedTile.combatUnit = unitData;
        this.editCombatUnitType = unitLabelFromType(unitType);
        this.editCombatUnitOwnerName = ownerNameForId(owner);
      } else {
        this.selectedTile.civilianUnit = unitData;
        this.editCivilianUnitType = unitLabelFromType(unitType);
        this.editCivilianUnitOwnerName = ownerNameForId(owner);
      }
      if (Number.isFinite(owner)) {
        this.ensureOwnerColors(owner);
      }
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCitadelEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      if (this.editCitadel) {
        setCitadelImprovement(this.selectedTile);
      } else {
        clearCitadelImprovement(this.selectedTile);
      }
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyPillagedEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      this.selectedTile.pillaged = !!this.editPillaged;
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCombatUnitEdit() {
      this.clearUnitEditForRole("combat");
    },

    clearCivilianUnitEdit() {
      this.clearUnitEditForRole("civilian");
    },

    clearUnitEditForRole(role) {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      if (role === "combat") {
        this.selectedTile.combatUnit = null;
        this.editCombatUnitType = "";
        this.editCombatUnitOwnerName = "";
      } else {
        this.selectedTile.civilianUnit = null;
        this.editCivilianUnitType = "";
        this.editCivilianUnitOwnerName = "";
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
      this.queueTileSave(this.selectedTile);
    },

    applyOriginalOwnerEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearOwnerEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      this.selectedTile.owner = null;
      this.selectedTile.customOwner = false;
      this.editOwnerName = "";
      this.rebuildOwnerBorders();
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearOriginalOwnerEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      this.selectedTile.originalOwner = null;
      this.selectedTile.customOriginalOwner = false;
      this.editOriginalOwnerName = "";
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    toggleOwnerBrush() {
      if (!this.ensureEditAccess()) {
        return;
      }
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
      if (!this.ensureEditAccess() || !tile || !Number.isFinite(ownerId)) {
        return;
      }
      if (tile.owner === ownerId && tile.customOwner) {
        return;
      }
      tile.owner = ownerId;
      tile.customOwner = true;
      this.ensureOwnerColors(ownerId);
      this.rebuildOwnerBorders();
      this.queueTileSave(tile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    ownerOptionLabel(owner, index) {
      return formatOwnerOptionLabel(owner, index);
    },

    applyCityEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityNameEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityReligionEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityCapitalEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityPuppetedEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isPuppeted: !!this.editCityPuppeted,
        isCustom: true,
      };
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityOccupiedEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isOccupied: !!this.editCityOccupied,
        isCustom: true,
      };
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyCityResistanceEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        isResistance: !!this.editCityResistance,
        isCustom: true,
      };
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityNameEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
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
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      this.selectedTile.city = null;
      this.editCityName = "";
      this.editCityReligion = "";
      this.editCityCapital = false;
      this.editCityPuppeted = false;
      this.editCityOccupied = false;
      this.editCityResistance = false;
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearCityReligionEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        religion: "",
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
      };
      this.editCityReligion = "";
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyWorldWondersEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.selectedTile.city = {
        ...this.selectedTile.city,
        worldWonders: worldWondersFromInput(this.editWorldWonders),
        isCustom: true,
      };
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    clearWorldWondersEdit() {
      if (
        !this.ensureEditAccess() ||
        !this.selectedTile ||
        !this.selectedTile.city
      ) {
        return;
      }
      this.editWorldWonders = "";
      this.selectedTile.city = {
        ...this.selectedTile.city,
        worldWonders: [],
        isCustom: true,
      };
      this.queueTileSave(this.selectedTile);
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
      grass: "#6b973e",
      plains: "#a0b24d",
      desert: "#d5b866",
      tundra: "#95a994",
      snow: "#d9e4e7",
      coast: "#4796b6",
      ocean: "#28658c",
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
      const rawUnit =
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
        rawUnit && !usedUnitIds.has(rawUnit.id)
          ? { id: rawUnit.id, type: rawUnit.type, owner: rawUnit.owner }
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
      let combatUnit = null;
      let civilianUnit = null;
      if (unitData) {
        if (unitRoleFromType(unitData.type) === "civilian") {
          civilianUnit = unitData;
        } else {
          combatUnit = unitData;
        }
      }
      const owner = resolveOwner(
        improvement.owner,
        combatUnit,
        civilianUnit,
        cityData
      );
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
        pillaged: false,
        owner: Number.isFinite(owner) ? owner : null,
        customOwner: Number.isFinite(owner),
        originalOwner: Number.isFinite(owner) ? owner : null,
        customOriginalOwner: false,
        ownerBorderSegments: [],
        combatUnit,
        civilianUnit,
        city: cityData ? { ...cityData } : null,
      });
    }
  }

  return { tiles, ownerColors };
}

function resolveOwner(improvementOwner, combatUnit, civilianUnit, city) {
  if (improvementOwner !== 0xff && improvementOwner !== undefined) {
    return improvementOwner;
  }
  if (combatUnit && Number.isFinite(combatUnit.owner)) {
    return combatUnit.owner;
  }
  if (civilianUnit && Number.isFinite(civilianUnit.owner)) {
    return civilianUnit.owner;
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

function unitInputValueForUnit(unit) {
  if (!unit || !unit.type) {
    return "";
  }
  return unitLabelFromType(unit.type);
}

function unitOwnerInputValueForUnit(unit) {
  if (!unit || !Number.isFinite(unit.owner)) {
    return "";
  }
  return ownerNameForId(unit.owner);
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
    if (!tile) {
      return;
    }
    if (tile.combatUnit && Number.isFinite(tile.combatUnit.id)) {
      maxId = Math.max(maxId, tile.combatUnit.id);
    }
    if (tile.civilianUnit && Number.isFinite(tile.civilianUnit.id)) {
      maxId = Math.max(maxId, tile.civilianUnit.id);
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

function desaturateColor(color, amount = 0.25) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  const mix = (channel) =>
    Math.round(channel + (avg - channel) * Math.min(Math.max(amount, 0), 1));
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

function adjustedTerrainFill(tile, getColor) {
  if (!tile) {
    return { color: "#3c3c3c", alpha: 1 };
  }
  const baseColor = getColor
    ? getColor(tile.terrainId)
    : terrainColor(tile.terrainId);
  const color = tile.pillaged ? desaturateColor(baseColor, 0.3) : baseColor;
  return { color, alpha: 1 };
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
@import "../../styles/config.styl";

.tile-map {
  display: grid;
  gap: 1.5rem;

  button {
    user-select: none;
  }

  .tile-map-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .tile-map-title,
  .title-map-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
  }

  .tile-map-subtitle {
    margin-block: 0.2rem 0;
    margin-inline: 0;
    font-size: 0.95rem;
    color: lighten($textColor, 25%);
  }

  .tile-map-subtitle-hint {
    font-size: 0.85rem;
    color: lighten($textColor, 40%);
  }

  .tile-map-controls {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;

    .tile-map-control-group {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tile-map-control-label {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: lighten($textColor, 35%);
    }

    .tile-map-control-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding-block: 0.25rem;
      padding-inline: 0.35rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(8, 10, 14, 0.8);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
    }

    .tile-map-control {
      min-inline-size: 2.4rem;
      block-size: 2.4rem;
      padding-inline: 0.8rem;
      border: 1px solid $borderColor;
      border-radius: 999px;
      background: rgba(10, 10, 10, 0.8);
      color: $textColor;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tile-map-control:hover {
      color: $backColor;
      background: $accentColor;
    }

    .tile-map-control-icon {
      min-inline-size: 2.1rem;
      block-size: 2.1rem;
      padding: 0;
      border-radius: 50%;
      border-color: rgba(255, 255, 255, 0.18);
      font-size: 1.1rem;
    }

    .tile-map-control-ghost {
      background: rgba(20, 20, 20, 0.6);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .tile-map-control-ghost:hover {
      background: rgba(255, 255, 255, 0.92);
      color: #111;
    }

    .tile-map-scale {
      min-inline-size: 3.2rem;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 800;
      color: lighten($textColor, 15%);
    }
  }

  .tile-map-body {
    display: grid;
    align-items: start;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 1fr) 24rem;
  }

  .tile-map-viewport {
    position: relative;
    inline-size: 100%;
    block-size: auto;
    min-block-size: 18rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    background: #0b0b0b;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
    overflow: hidden;
    touch-action: none;
    user-select: none;
    outline: none;

    &:focus {
      box-shadow: 0 0 0 2px $accentColor;
    }

    &.dragging {
      cursor: grabbing;
    }

    &.brush-active {
      cursor: crosshair;
    }

    .tile-map-loading,
    .tile-map-error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      text-align: center;
      font-weight: 700;
      color: lighten($textColor, 20%);
    }

    .tile-map-canvas {
      position: relative;
      inline-size: 100%;
      block-size: 100%;
      cursor: grab;
      transform-origin: top left;

      .tile-map-svg,
      .tile-map-canvas-layer {
        display: block;
      }
    }

    .tile-map-hint {
      position: absolute;
      inset-block-end: 0.75rem;
      inset-inline-start: 0.75rem;
      padding-block: 0.35rem;
      padding-inline: 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      background: rgba(0, 0, 0, 0.6);
    }

    .tile-map-tooltip {
      position: absolute;
      z-index: 5;
      min-inline-size: 12rem;
      max-inline-size: 18rem;
      padding-block: 0.7rem;
      padding-inline: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: rgba(8, 10, 12, 0.96);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      backdrop-filter: blur(6px);

      .tile-tooltip-title {
        margin-block-end: 0.35rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: lighten($textColor, 35%);
      }

      .tile-tooltip-list {
        display: grid;
        gap: 0.35rem;
      }

      .tile-info-row {
        font-size: 0.78rem;
      }

      .tile-info-label {
        color: lighten($textColor, 30%);
      }
    }

    .tile-group:hover .tile-hex {
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .tile-hex {
      fill: #3c3c3c;
      stroke: rgba(0, 0, 0, 0.25);
      stroke-width: 1;
      transition: stroke 0.2s ease;
      paint-order: stroke;
    }

    .tile-hex.terrain-grass {
      fill: #6b973e;
    }

    .tile-hex.terrain-plains {
      fill: #a0b24d;
    }

    .tile-hex.terrain-desert {
      fill: #d5b866;
    }

    .tile-hex.terrain-tundra {
      fill: #95a994;
    }

    .tile-hex.terrain-snow {
      fill: #d9e4e7;
    }

    .tile-hex.terrain-coast {
      fill: #4796b6;
    }

    .tile-hex.terrain-ocean {
      fill: #28658c;
    }

    .tile-hex.is-pillaged {
      filter: saturate(0.75);
    }

    .tile-selection-outline,
    .tile-hover-outline {
      fill: none;
      stroke-linejoin: round;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .tile-selection-outline {
      stroke: #ffffff;
      stroke-width: 2.5;
    }

    .tile-hover-outline {
      stroke: rgba(255, 255, 255, 0.65);
      stroke-width: 2;
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

    .tile-elevation {
      fill: rgba(255, 255, 255, 0.35);
      stroke: rgba(0, 0, 0, 0.3);
      stroke-width: 0.6;
    }

    .tile-feature,
    .tile-wonder {
      stroke-width: 0.6;
    }

    .tile-resource {
      fill: #f3c969;
      stroke: rgba(0, 0, 0, 0.4);
      stroke-width: 0.6;
    }

    .tile-improvement {
      fill: #d7d0c0;
      stroke: rgba(0, 0, 0, 0.3);
      stroke-width: 0.6;
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

    .tile-river {
      fill: none;
      stroke: #4fc3f7;
      stroke-width: 1.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .tile-unit {
      fill: #111;
      stroke: #fff;
      stroke-width: 0.6;
    }

    .tile-unit-label {
      font-size: 5px;
      font-weight: 700;
      fill: #fff;
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

    .tile-city-labels,
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
      font-size: 6px;
      font-weight: 700;
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
  }

  .tile-map-info {
    display: grid;
    gap: 1rem;
  }

  .tile-info-card,
  .tile-legend-card {
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(10, 10, 10, 0.85);
  }

  .tile-info-summary {
    display: none;
  }

  .tile-info-title {
    display: flex;
    margin-block-end: 0.8rem;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .tile-info-title-meta {
    display: inline-flex;
    align-items: center;
    align-self: center;
    gap: 0.35rem;
    margin-inline-start: 0.75rem;
    padding-block: 0.25rem;
    padding-inline: 0.75rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: lighten($textColor, 30%);
    background: rgba(255, 255, 255, 0.08);
  }

  .tile-edit-auth {
    display: grid;
    gap: 0.5rem;
    margin-block-end: 1rem;
    padding-block-end: 0.75rem;
    border-block-end: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tile-edit-auth-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .tile-edit-auth-label {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: lighten($textColor, 30%);
  }

  .tile-edit-auth-status {
    padding-block: 0.2rem;
    padding-inline: 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: lighten($textColor, 25%);
    background: rgba(255, 255, 255, 0.05);

    &.is-enabled {
      border-color: rgba(129, 210, 145, 0.5);
      color: #c7f3d1;
      background: rgba(77, 186, 109, 0.18);
    }

    &.is-denied {
      border-color: rgba(255, 161, 161, 0.5);
      color: #ffd0d0;
      background: rgba(255, 90, 90, 0.18);
    }

    &.is-loading {
      border-color: rgba(255, 255, 255, 0.2);
      color: lighten($textColor, 35%);
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .tile-edit-auth-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tile-edit-auth-user {
    font-size: 0.8rem;
    font-weight: 700;
    color: lighten($textColor, 10%);
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
    font-size: 0.9rem;
    color: lighten($textColor, 35%);
  }

  .tile-edit-form {
    display: grid;
    gap: 1rem;
  }

  .tile-edit-fieldset {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    border: 0;
    min-inline-size: 0;

    &:disabled {
      opacity: 0.6;
    }
  }

  .tile-edit-group {
    display: grid;
    gap: 0.25rem;
  }

  .tile-edit-label {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: lighten($textColor, 30%);
  }

  .tile-edit-label-inline {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tile-edit-checkbox-inline {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding-block: 0.2rem;
    padding-inline: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    font-size: 0.35rem;
    letter-spacing: 0;
    text-transform: none;
    user-select: none;
    color: lighten($textColor, 15%);
    background: rgba(8, 8, 8, 0.7);

    input {
      inline-size: 0.9rem;
      block-size: 0.9rem;
      accent-color: $accentColor;
    }
  }

  .tile-edit-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    letter-spacing: 0;
    text-transform: none;
    color: lighten($textColor, 15%);

    input {
      inline-size: 1rem;
      block-size: 1rem;
      accent-color: $accentColor;
    }
  }

  .tile-edit-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .tile-edit-input {
    flex: 1;
    min-inline-size: 0;
    padding-block: 0.35rem;
    padding-inline: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    font-weight: 700;
    color: $textColor;
    background: rgba(5, 5, 5, 0.8);

    &:focus {
      outline: none;
      border-color: $accentColor;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .tile-edit-button {
    padding-block: 0.35rem;
    padding-inline: 0.6rem;
    border: 1px solid $borderColor;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    color: $textColor;
    background: rgba(15, 15, 15, 0.9);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: $backColor;
      background: $accentColor;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
      color: lighten($textColor, 20%);
      background: rgba(15, 15, 15, 0.6);
    }

    &.is-active {
      color: $backColor;
      background: $accentColor;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
    }
  }

  .tile-edit-hint {
    margin-block: 0.2rem 0;
    margin-inline: 0;
    font-size: 0.75rem;
    color: lighten($textColor, 35%);
  }

  .tile-map-legend {
    margin-block-start: 0.5rem;

    .terrain-grass {
      background-color: #6b973e;
    }

    .terrain-plains {
      background-color: #a0b24d;
    }

    .terrain-desert {
      background-color: #d5b866;
    }

    .terrain-tundra {
      background-color: #95a994;
    }

    .terrain-snow {
      background-color: #d9e4e7;
    }

    .terrain-coast {
      background-color: #4796b6;
    }

    .terrain-ocean {
      background-color: #28658c;
    }
  }

  .tile-legend-section {
    margin-block-start: 1rem;
  }

  .tile-legend-accordion {
    padding-block: 0.6rem 0.75rem;
    padding-inline: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(8, 10, 14, 0.55);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);

    &[open] {
      background: rgba(14, 17, 24, 0.7);
    }
  }

  .tile-legend-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    list-style: none;
    cursor: pointer;
    outline: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:focus-visible {
      border-radius: 10px;
      box-shadow: 0 0 0 2px $accentColor;
    }
  }

  .tile-legend-title {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: lighten($textColor, 30%);
  }

  .tile-legend-grid {
    display: grid;
    inline-size: 100%;
    gap: 0.45rem;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  }

  .tile-legend-accordion .tile-legend-grid {
    margin-block-start: 0.6rem;
  }

  .tile-legend-scroll {
    max-block-size: 12rem;
    overflow-y: auto;
    padding-inline-end: 0.2rem;
  }

  .tile-legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .legend-swatch {
    inline-size: 1rem;
    block-size: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
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
    border-width: 2px;
    background: transparent;
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
    position: relative;
    inline-size: 1.5rem;
    block-size: 0.6rem;
    border: none;
    background: transparent;

    &::before {
      content: "";
      position: absolute;
      inset-inline: 0;
      inset-block-start: 50%;
      block-size: 2px;
      border-radius: 999px;
      transform: translateY(-50%);
      background: currentColor;
    }
  }

  .legend-feature {
    border-radius: 50%;
  }

  .legend-wonder {
    border-radius: 6px;
  }

  .legend-resource,
  .legend-improvement {
    border-radius: 3px;
  }

  .legend-route {
    border-radius: 8px;
    background: #f3d18c;
  }

  .elevation-hill {
    fill: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.35);
  }

  .elevation-mountain {
    fill: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.6);
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

  .route-road {
    color: #f3d18c;
    background: #f3d18c;
    stroke: #f3d18c;
  }

  .route-railroad {
    color: #cfd8dc;
    background: #cfd8dc;
    stroke: #cfd8dc;
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
      inline-size: 100%;
      gap: 1rem;
    }

    .tile-map-control {
      min-inline-size: 2.8rem;
      block-size: 2.8rem;
      padding-inline: 0.9rem;
      font-size: 0.95rem;
    }

    .tile-map-control-pill {
      inline-size: 100%;
      justify-content: space-between;
    }

    .tile-map-viewport {
      min-block-size: 15rem;
    }

    .tile-info-accordion {
      padding-block: 0.8rem 0.9rem;
      padding-inline: 0.9rem;
    }

    .tile-info-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      list-style: none;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: lighten($textColor, 25%);
      cursor: pointer;

      &::-webkit-details-marker {
        display: none;
      }
    }

    .tile-info-accordion > .tile-info-title {
      display: none;
    }

    .tile-info-accordion[open] .tile-info-summary {
      margin-block-end: 0.75rem;
    }
  }

  @media (max-width: $MQMobile) {
    .tile-map-body {
      grid-template-columns: minmax(0, 1fr);
    }

    .tile-map-viewport {
      min-block-size: 14rem;
    }
  }
}
</style>
