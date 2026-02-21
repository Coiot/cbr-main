<template>
  <section class="tile-map">
    <div v-if="!embedded" class="tile-map-header">
      <div class="tile-map-meta">
        <!-- <h2 class="tile-map-title">{{ mapName || "Map Viewer" }}</h2>
        <p class="tile-map-subtitle" v-if="mapDescription">
          {{ mapDescription }}
        </p> -->
        <h1 class="title-map-title">Community Tile Map</h1>
        <p class="tile-map-subtitle tile-map-subtitle-hint">
          Drag to pan. Click a tile to view details. Sign in from the user menu
          to edit.
        </p>
      </div>
      <div class="tile-map-controls">
        <div class="tile-map-auth-toolbar">
          <div class="tile-map-toolbar-row">
            <div class="tile-map-toolbar-group tile-map-mode-toggle">
              <button
                type="button"
                class="tile-edit-button"
                :class="{ 'is-active': !localEditsEnabled }"
                @click="setLocalEdits(false)"
              >
                Live
              </button>
              <button
                type="button"
                class="tile-edit-button"
                :class="{ 'is-active': localEditsEnabled }"
                @click="setLocalEdits(true)"
              >
                Local
              </button>
            </div>
            <div class="tile-map-toolbar-group tile-map-auth-group">
              <span v-if="!authUser" class="tile-edit-hint">
                Sign in via the user menu to unlock edits.
              </span>
            </div>
            <!-- <span class="tile-map-toolbar-spacer" aria-hidden="true"></span> -->
            <div v-if="authMessage" class="tile-edit-hint">
              {{ authMessage }}
            </div>
            <div
              class="tile-map-toolbar-group tile-map-control-group tile-map-control-group-compact"
            >
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
                  :aria-pressed="miniMapEnabled"
                  @click="toggleMiniMap"
                >
                  Mini Map
                </button>
                <span
                  v-if="!isMobileView"
                  class="tile-map-toolbar-divider"
                  aria-hidden="true"
                ></span>
                <button
                  v-if="!isMobileView"
                  type="button"
                  class="tile-map-info-toggle tile-map-toolbar-toggle"
                  @click="toggleEditPanel"
                  :aria-label="
                    editPanelCollapsed
                      ? 'Expand edit panel'
                      : 'Collapse edit panel'
                  "
                >
                  <svg
                    v-if="editPanelCollapsed"
                    class="tile-map-info-toggle-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    aria-hidden="true"
                  >
                    <path
                      d="M544 512C526.3 512 512 497.7 512 480L512 160C512 142.3 526.3 128 544 128C561.7 128 576 142.3 576 160L576 480C576 497.7 561.7 512 544 512zM71 337C61.6 327.6 61.6 312.4 71 303.1L215 159C221.9 152.1 232.2 150.1 241.2 153.8C250.2 157.5 256 166.3 256 176L256 256L400 256C426.5 256 448 277.5 448 304L448 336C448 362.5 426.5 384 400 384L256 384L256 464C256 473.7 250.2 482.5 241.2 486.2C232.2 489.9 221.9 487.9 215 481L71 337z"
                    />
                  </svg>
                  <svg
                    v-else
                    class="tile-map-info-toggle-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    aria-hidden="true"
                  >
                    <path
                      d="M96 128C113.7 128 128 142.3 128 160L128 480C128 497.7 113.7 512 96 512C78.3 512 64 497.7 64 480L64 160C64 142.3 78.3 128 96 128zM569 303C578.4 312.4 578.4 327.6 569 336.9L425 481C418.1 487.9 407.8 489.9 398.8 486.2C389.8 482.5 384 473.7 384 464L384 384L240 384C213.5 384 192 362.5 192 336L192 304C192 277.5 213.5 256 240 256L384 256L384 176C384 166.3 389.8 157.5 398.8 153.8C407.8 150.1 418.1 152.2 425 159L569 303z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="tile-map-body"
      :class="{
        'is-collapsed': embedded || (editPanelCollapsed && !isMobileView),
      }"
    >
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
          <canvas
            v-if="useTerrainCanvas"
            ref="brushCanvas"
            class="tile-map-canvas-layer tile-map-brush-layer"
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
            <defs>
              <symbol id="hex-shape" overflow="visible">
                <polygon :points="hexPoints" />
              </symbol>
              <symbol id="resource-diamond" overflow="visible">
                <polygon :points="resourcePoints" />
              </symbol>
              <symbol id="unit-triangle" overflow="visible">
                <polygon :points="unitTrianglePoints" />
              </symbol>
              <symbol id="citadel-star" overflow="visible">
                <polygon :points="citadelStarPoints" />
              </symbol>
              <symbol id="unit-icon" overflow="visible">
                <path :d="unitPath" />
              </symbol>
              <symbol id="city-capital" overflow="visible">
                <path :d="capitalCityPath" />
              </symbol>
              <symbol id="tile-wonder" overflow="visible">
                <path :d="wonderPath" />
              </symbol>
            </defs>
            <g
              v-for="tile in visibleTiles"
              :key="tile.key"
              class="tile-group"
              :transform="`translate(${tile.x}, ${tile.y})`"
            >
              <use
                class="tile-hex"
                :class="[
                  terrainClass(tile),
                  {
                    'is-pillaged': tile.pillaged,
                    'is-recent': isRecentlyEdited(tile),
                    'is-snapshot-diff': isSnapshotDiff(tile),
                  },
                ]"
                href="#hex-shape"
                xlink:href="#hex-shape"
                :style="tileHexStyle(tile)"
              />
              <use
                v-if="shouldShowOwnerOverlay(tile)"
                class="tile-owner-overlay"
                href="#hex-shape"
                xlink:href="#hex-shape"
                :style="ownerOverlayStyle(tile)"
              />
              <polygon
                v-if="showDecorations && tile.elevation"
                class="tile-elevation"
                :class="elevationClass(tile)"
                :points="elevationPoints(tile)"
              />
              <line
                v-for="segment in ownerBorderSegmentsForTile(tile)"
                :key="segment.key"
                class="tile-owner-border"
                :x1="segment.x1"
                :y1="segment.y1"
                :x2="segment.x2"
                :y2="segment.y2"
                :style="ownerBorderStyle(tile, segment)"
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
              <use
                v-if="showDecorations && tile.wonder"
                class="tile-wonder"
                href="#tile-wonder"
                xlink:href="#tile-wonder"
                :transform="`translate(${hexSize * 0.4}, ${-hexSize * 0.25})`"
                :style="wonderStyle(tile)"
              />
              <use
                v-if="showDecorations && tile.resource"
                class="tile-resource"
                href="#resource-diamond"
                xlink:href="#resource-diamond"
                :transform="`translate(${hexSize * 0.4}, ${hexSize * 0.2})`"
                :style="{ fill: tile.resourceColor }"
              />
              <use
                v-if="showCitadels && isCitadelImprovement(tile)"
                class="tile-citadel"
                href="#citadel-star"
                xlink:href="#citadel-star"
              />
              <path
                v-if="showDecorations && tile.route"
                class="tile-route"
                :class="routeClass(tile)"
                :d="routePath"
              />
              <g
                v-if="showDecorations && tile.ruins"
                class="tile-ruins"
                :transform="ruinsTransform()"
                :style="ruinsStyle(tile)"
              >
                <path
                  v-for="(ruinsPath, index) in ruinsPaths()"
                  :key="`ruins-${index}`"
                  :d="ruinsPath.d"
                  :style="ruinsPathStyle(ruinsPath, index, tile)"
                />
              </g>
              <use
                v-if="
                  showUnits && shouldShowPrimaryUnit(tile) && primaryUnit(tile)
                "
                class="tile-unit"
                href="#unit-icon"
                xlink:href="#unit-icon"
                :transform="`translate(${hexSize * 0.3}, ${-hexSize * 0.35})`"
              />
              <text
                v-if="
                  showUnits &&
                  shouldShowPrimaryUnit(tile) &&
                  primaryUnit(tile) &&
                  showLabels
                "
                class="tile-unit-label"
                :x="hexSize * 0.3"
                :y="-hexSize * 0.35 + 1.5"
                text-anchor="middle"
              >
                {{ unitLabel(primaryUnit(tile)) }}
              </text>
              <circle
                v-if="shouldShowCity(tile) && tile.city && !tile.city.isCapital"
                class="tile-city"
                :r="hexSize * 0.35"
                cx="0"
                cy="0"
              />
              <use
                v-if="shouldShowCity(tile) && tile.city && tile.city.isCapital"
                class="tile-city-capital"
                href="#city-capital"
                xlink:href="#city-capital"
              />
              <use
                v-if="showUnitMarker(tile, 'civilian')"
                class="tile-unit-marker tile-unit-marker-civilian"
                href="#unit-triangle"
                xlink:href="#unit-triangle"
                :transform="unitMarkerTransform(tile, 'civilian')"
                :style="unitMarkerStyle(tile.civilianUnit)"
              />
              <circle
                v-if="showUnitMarker(tile, 'combat')"
                class="tile-unit-marker tile-unit-marker-combat"
                :r="unitMarkerRadius"
                cx="0"
                cy="0"
                :transform="unitMarkerTransform(tile, 'combat')"
                :style="unitMarkerStyle(tile.combatUnit)"
              />
              <g
                v-if="tile.notes"
                class="tile-note-pin"
                :transform="notePinTransform()"
                :style="notePinStyle(tile)"
              >
                <path
                  v-for="(pinPath, index) in notePinPaths()"
                  :key="`note-pin-${index}`"
                  :d="pinPath.d"
                  :opacity="pinPath.opacity"
                />
              </g>
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
                <circle
                  v-if="cityHasOriginalOwnerBadge(tile)"
                  class="city-label-original-badge"
                  :cx="
                    cityLabelWidth(tile) / 2.5 - cityLabelOriginalBadgeRadius()
                  "
                  :cy="cityLabelTextY()"
                  :r="cityLabelOriginalBadgeRadius()"
                  :style="cityLabelOriginalOwnerStyle(tile)"
                />
              </g>
            </g>
            <g
              v-if="visibleMapPinTiles.length"
              class="tile-map-pin-overlays"
              aria-hidden="true"
            >
              <g
                v-for="pin in visibleMapPinTiles"
                :key="`map-pin-overlay-${pin.nameKey}`"
                class="tile-map-pin-overlay"
                :transform="`translate(${pin.tile.x}, ${pin.tile.y})`"
              >
                <path class="tile-map-pin-overlay-tip" :d="mapPinTipPath()" />
                <circle
                  class="tile-map-pin-overlay-dot"
                  cx="0"
                  :cy="mapPinDotY()"
                  :r="mapPinDotRadius()"
                />
                <circle
                  class="tile-map-pin-overlay-core"
                  cx="0"
                  :cy="mapPinDotY()"
                  :r="mapPinCoreRadius()"
                />
                <g v-if="showMapPinLabels" class="tile-map-pin-overlay-label">
                  <rect
                    class="tile-map-pin-overlay-pill"
                    :x="-mapPinLabelWidth(pin.name) / 2"
                    :y="mapPinLabelY()"
                    :width="mapPinLabelWidth(pin.name)"
                    :height="mapPinLabelHeight()"
                    :rx="hexSize * 0.22"
                    :ry="hexSize * 0.22"
                  />
                  <text
                    class="tile-map-pin-overlay-text"
                    x="0"
                    :y="mapPinLabelTextY()"
                    dominant-baseline="middle"
                    text-anchor="middle"
                  >
                    {{ mapPinLabelText(pin.name) }}
                  </text>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div
          v-if="showMiniMap && tiles.length"
          class="tile-mini-map"
          :class="{ 'is-embedded': embedded }"
        >
          <canvas
            ref="miniMapCanvas"
            class="tile-mini-map-canvas"
            :width="miniMapWidth"
            :height="miniMapHeight"
            role="img"
            aria-label="Mini map"
            @pointerdown.stop.prevent="onMiniMapPointerDown"
          ></canvas>
        </div>
        <div v-if="showEmbeddedMiniMapToggle" class="tile-mini-toggle">
          <button
            type="button"
            class="tile-mini-toggle-button"
            :class="{ 'is-active': miniMapEnabled }"
            :aria-pressed="miniMapEnabled"
            @click.stop="toggleMiniMap"
            @pointerdown.stop
            @touchstart.stop
          >
            Mini Map {{ miniMapEnabled ? "On" : "Off" }}
          </button>
        </div>
        <div
          v-if="hoverTooltipVisible && hoverTooltipTile"
          class="tile-map-tooltip-bridge"
          :style="hoverTooltipBridgeStyle"
          @mouseenter="lockHoverTooltip"
          @mouseleave="unlockHoverTooltip"
        ></div>
        <div
          v-if="hoverTooltipVisible && hoverTooltipTile"
          ref="tileTooltip"
          class="tile-map-tooltip"
          :style="tooltipStyle"
          @mouseenter="lockHoverTooltip"
          @mouseleave="unlockHoverTooltip"
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
            <div
              v-if="hoverTooltipTile.city && hoverTooltipTile.city.isPuppeted"
              class="tile-info-row"
            >
              <div class="tile-info-label">Puppeted</div>
              <div class="tile-info-value">Yes</div>
            </div>
            <div
              v-if="hoverTooltipTile.city && hoverTooltipTile.city.isOccupied"
              class="tile-info-row"
            >
              <div class="tile-info-label">Occupied</div>
              <div class="tile-info-value">Yes</div>
            </div>
            <div
              v-if="hoverTooltipTile.city && hoverTooltipTile.city.isResistance"
              class="tile-info-row"
            >
              <div class="tile-info-label">Resistance</div>
              <div class="tile-info-value">Yes</div>
            </div>
            <div v-if="hoverTooltipTile.continent" class="tile-info-row">
              <div class="tile-info-label">Continent</div>
              <div class="tile-info-value">
                {{ continentLabel(hoverTooltipTile.continent) }}
              </div>
            </div>
            <div v-if="hoverTooltipTile.hasRiver" class="tile-info-row">
              <div class="tile-info-label">River</div>
              <div class="tile-info-value">Yes</div>
            </div>
            <div v-if="hoverTooltipTile.notes" class="tile-info-notes">
              <div class="tile-info-label">Notes</div>
              <div
                class="tile-info-notes-value"
                v-text="hoverTooltipTile.notes"
              ></div>
            </div>
          </div>
        </div>
        <!-- <div class="tile-map-hint">Drag to pan.</div> -->
      </div>
      <aside
        v-if="!embedded"
        class="tile-map-info"
        :class="{ 'is-collapsed': editPanelCollapsed && !isMobileView }"
      >
        <div class="tile-map-info-header">
          <div
            v-if="!editPanelCollapsed || isMobileView"
            class="tile-map-info-tabs"
          >
            <button
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'edit' }"
              @click="editPanelTab = 'edit'"
            >
              Edit
            </button>
            <button
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'notes' }"
              :disabled="!showNotesTab"
              @click="editPanelTab = 'notes'"
            >
              Notes
            </button>
            <button
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'snapshots' }"
              @click="editPanelTab = 'snapshots'"
            >
              Snapshots
            </button>
            <button
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'overlays' }"
              @click="editPanelTab = 'overlays'"
            >
              Overlays
            </button>
          </div>
        </div>
        <div
          v-show="!editPanelCollapsed || isMobileView"
          class="tile-map-info-panel"
        >
          <div
            v-show="editPanelTab === 'edit'"
            class="tile-info-card tile-info-accordion"
          >
            <div class="tile-info-title">
              Edit Tile
              <span v-if="selectedTile" class="tile-info-title-meta">
                {{ tileTitle(selectedTile) }}
              </span>
              <span
                v-if="localEditsEnabled"
                class="tile-info-title-meta tile-info-title-meta-local"
              >
                Local Only
              </span>
              <span class="tile-info-title-actions">
                <button
                  v-if="!localEditsEnabled"
                  type="button"
                  class="tile-edit-button"
                  title="Undoes last 60 seconds of edits"
                  :disabled="!canEdit || undoLoading"
                  @click="undoRecentEdits"
                >
                  Undo
                </button>
              </span>
            </div>

            <div
              v-if="selectedTile"
              class="tile-edit-form"
              :class="{ 'tile-edit-form-locked': !editAccessAllowed }"
              :title="
                !editAccessAllowed
                  ? 'Editing is disabled. Sign in to enable edits.'
                  : null
              "
            >
              <fieldset
                class="tile-edit-fieldset"
                :disabled="!editAccessAllowed"
              >
                <div class="tile-edit-group">
                  <label class="tile-edit-label" for="tile-owner-input">
                    Owner
                  </label>
                  <div class="tile-edit-row">
                    <div class="tile-edit-combobox">
                      <input
                        id="tile-owner-input"
                        class="tile-edit-input"
                        type="text"
                        placeholder="Search civ..."
                        v-model="editOwnerName"
                        @focus="openCombo('owner', ownerOptionMatches)"
                        @blur="handleComboBlur('owner', applyOwnerEdit)"
                        @change="applyOwnerEdit"
                        @input="
                          scheduleFieldEdit('owner');
                          onComboInput('owner', ownerOptionMatches);
                        "
                        @keydown="
                          onComboKeydown(
                            $event,
                            'owner',
                            ownerOptionMatches,
                            applyOwnerEdit
                          )
                        "
                        :style="ownerInputStyle(editOwnerName)"
                      />
                      <div
                        v-if="comboOpen.owner"
                        class="tile-edit-combobox-list"
                      >
                        <button
                          v-for="(owner, index) in ownerOptionMatches"
                          :key="`owner-${owner.name}-${index}`"
                          type="button"
                          class="tile-edit-combobox-option"
                          :class="{
                            'is-active': comboHighlight.owner === index,
                          }"
                          @mousedown.prevent="
                            selectComboOption('owner', owner, applyOwnerEdit)
                          "
                          @mouseenter="setComboHighlight('owner', index)"
                        >
                          <span class="tile-edit-combobox-option-title">
                            {{ owner.name }}
                          </span>
                          <span
                            v-if="owner.leader"
                            class="tile-edit-combobox-option-meta"
                          >
                            {{ owner.leader }}
                          </span>
                        </button>
                        <div
                          v-if="!ownerOptionMatches.length"
                          class="tile-edit-combobox-empty"
                        >
                          No matches
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="tile-edit-button"
                      :class="{
                        'is-active':
                          ownerBrushEnabled && ownerBrushMode === 'clear',
                      }"
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
                    Brush: click-drag to
                    {{ ownerBrushMode === "clear" ? "clear" : "paint" }}
                    ownership.
                  </div>
                </div>

                <div
                  v-if="selectedTile && selectedTile.city"
                  class="tile-edit-group"
                >
                  <label
                    class="tile-edit-label"
                    for="tile-original-owner-input"
                  >
                    Original City Founder
                  </label>
                  <div class="tile-edit-row">
                    <div class="tile-edit-combobox">
                      <input
                        id="tile-original-owner-input"
                        class="tile-edit-input"
                        type="text"
                        placeholder="Search civ..."
                        v-model="editOriginalOwnerName"
                        @focus="
                          openCombo('originalOwner', originalOwnerOptionMatches)
                        "
                        @blur="
                          handleComboBlur(
                            'originalOwner',
                            applyOriginalOwnerEdit
                          )
                        "
                        @change="applyOriginalOwnerEdit"
                        @input="
                          scheduleFieldEdit('originalOwner');
                          onComboInput(
                            'originalOwner',
                            originalOwnerOptionMatches
                          );
                        "
                        @keydown="
                          onComboKeydown(
                            $event,
                            'originalOwner',
                            originalOwnerOptionMatches,
                            applyOriginalOwnerEdit
                          )
                        "
                        :style="ownerInputStyle(editOriginalOwnerName)"
                      />
                      <div
                        v-if="comboOpen.originalOwner"
                        class="tile-edit-combobox-list"
                      >
                        <button
                          v-for="(owner, index) in originalOwnerOptionMatches"
                          :key="`original-owner-${owner.name}-${index}`"
                          type="button"
                          class="tile-edit-combobox-option"
                          :class="{
                            'is-active': comboHighlight.originalOwner === index,
                          }"
                          @mousedown.prevent="
                            selectComboOption(
                              'originalOwner',
                              owner,
                              applyOriginalOwnerEdit
                            )
                          "
                          @mouseenter="
                            setComboHighlight('originalOwner', index)
                          "
                        >
                          <span class="tile-edit-combobox-option-title">
                            {{ owner.name }}
                          </span>
                          <span
                            v-if="owner.leader"
                            class="tile-edit-combobox-option-meta"
                          >
                            {{ owner.leader }}
                          </span>
                        </button>
                        <div
                          v-if="!originalOwnerOptionMatches.length"
                          class="tile-edit-combobox-empty"
                        >
                          No matches
                        </div>
                      </div>
                    </div>
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
                      @keydown.enter.prevent="applyCityNameEdit"
                      @blur="applyCityNameEdit"
                      @input="scheduleFieldEdit('cityName')"
                    />
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
                  <div class="tile-edit-label tile-edit-label-inline">
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editCityCapital"
                        @change="applyCityCapitalEdit"
                        aria-label="Capital city"
                      />
                      Capital
                    </label>
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editCityPuppeted"
                        @change="applyCityPuppetedEdit"
                        aria-label="Puppeted city"
                      />
                      Puppeted
                    </label>
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editCityOccupied"
                        @change="applyCityOccupiedEdit"
                        aria-label="Occupied city"
                      />
                      Occupied
                    </label>
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editCityResistance"
                        @change="applyCityResistanceEdit"
                        aria-label="Resistance city"
                      />
                      Resistance
                    </label>
                  </div>
                </div>

                <div
                  v-if="selectedTile && selectedTile.city"
                  class="tile-edit-group"
                >
                  <div class="tile-edit-row tile-edit-row-split">
                    <div class="tile-edit-split">
                      <label class="tile-edit-label" for="tile-city-input">
                        Population
                      </label>
                      <div class="tile-edit-row">
                        <input
                          id="tile-city-input"
                          class="tile-edit-input tile-edit-input-compact"
                          type="number"
                          min="1"
                          max="99"
                          v-model.number="editCityValue"
                          @keydown.enter.prevent="applyCityEdit"
                          @blur="applyCityEdit"
                          @change="applyCityEdit"
                          @input="scheduleFieldEdit('cityValue')"
                        />
                        <button
                          type="button"
                          class="tile-edit-button"
                          @click="clearCityEdit"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div class="tile-edit-split">
                      <label
                        class="tile-edit-label"
                        for="tile-city-religion-input"
                      >
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
                          @keydown.enter.prevent="applyCityReligionEdit"
                          @blur="applyCityReligionEdit"
                          @input="scheduleFieldEdit('cityReligion')"
                        />
                        <button
                          type="button"
                          class="tile-edit-button"
                          @click="clearCityReligionEdit"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
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
                      @keydown.enter.prevent="applyWorldWondersEdit"
                      @blur="applyWorldWondersEdit"
                      @input="scheduleFieldEdit('worldWonders')"
                    />
                    <button
                      type="button"
                      class="tile-edit-button"
                      @click="clearWorldWondersEdit"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <!-- <div class="tile-edit-group tile-edit-units">
                  <div class="tile-edit-units-grid">
                    <div class="tile-edit-unit-group">
                      <div class="tile-edit-unit-header">
                        <div class="tile-edit-unit-label">Combat Unit</div>
                        <button
                          type="button"
                          class="tile-edit-button"
                          @click="clearCombatUnitEdit"
                        >
                          Clear
                        </button>
                      </div>
                      <div class="tile-edit-combobox">
                        <input
                          id="tile-combat-unit-input"
                          class="tile-edit-input"
                          type="text"
                          placeholder="Search combat unit..."
                          v-model="editCombatUnitType"
                          @focus="
                            openCombo('combatUnit', combatUnitOptionMatches)
                          "
                          @blur="
                            handleComboBlur('combatUnit', applyCombatUnitEdit)
                          "
                          @change="applyCombatUnitEdit"
                          @input="
                            scheduleUnitEdit('combat');
                            onComboInput('combatUnit', combatUnitOptionMatches);
                          "
                          @keydown="
                            onComboKeydown(
                              $event,
                              'combatUnit',
                              combatUnitOptionMatches,
                              applyCombatUnitEdit
                            )
                          "
                        />
                        <div
                          v-if="comboOpen.combatUnit"
                          class="tile-edit-combobox-list"
                        >
                          <button
                            v-for="(unit, index) in combatUnitOptionMatches"
                            :key="`combat-unit-${unit.name}-${index}`"
                            type="button"
                            class="tile-edit-combobox-option"
                            :class="{
                              'is-active': comboHighlight.combatUnit === index,
                            }"
                            @mousedown.prevent="
                              selectComboOption(
                                'combatUnit',
                                unit,
                                applyCombatUnitEdit
                              )
                            "
                            @mouseenter="setComboHighlight('combatUnit', index)"
                          >
                            <span class="tile-edit-combobox-option-title">
                              {{ unit.name }}
                            </span>
                          </button>
                          <div
                            v-if="!combatUnitOptionMatches.length"
                            class="tile-edit-combobox-empty"
                          >
                            No matches
                          </div>
                        </div>
                      </div>
                      <div class="tile-edit-combobox">
                        <input
                          id="tile-combat-unit-owner-input"
                          class="tile-edit-input"
                          type="text"
                          placeholder="Combat owner..."
                          v-model="editCombatUnitOwnerName"
                          @focus="
                            openCombo('combatOwner', combatOwnerOptionMatches)
                          "
                          @blur="
                            handleComboBlur('combatOwner', applyCombatUnitEdit)
                          "
                          @change="applyCombatUnitEdit"
                          @input="
                            scheduleUnitEdit('combat');
                            onComboInput(
                              'combatOwner',
                              combatOwnerOptionMatches
                            );
                          "
                          @keydown="
                            onComboKeydown(
                              $event,
                              'combatOwner',
                              combatOwnerOptionMatches,
                              applyCombatUnitEdit
                            )
                          "
                          :style="ownerInputStyle(editCombatUnitOwnerName)"
                        />
                        <div
                          v-if="comboOpen.combatOwner"
                          class="tile-edit-combobox-list"
                        >
                          <button
                            v-for="(owner, index) in combatOwnerOptionMatches"
                            :key="`combat-owner-${owner.name}-${index}`"
                            type="button"
                            class="tile-edit-combobox-option"
                            :class="{
                              'is-active': comboHighlight.combatOwner === index,
                            }"
                            @mousedown.prevent="
                              selectComboOption(
                                'combatOwner',
                                owner,
                                applyCombatUnitEdit
                              )
                            "
                            @mouseenter="
                              setComboHighlight('combatOwner', index)
                            "
                          >
                            <span class="tile-edit-combobox-option-title">
                              {{ owner.name }}
                            </span>
                            <span
                              v-if="owner.leader"
                              class="tile-edit-combobox-option-meta"
                            >
                              {{ owner.leader }}
                            </span>
                          </button>
                          <div
                            v-if="!combatOwnerOptionMatches.length"
                            class="tile-edit-combobox-empty"
                          >
                            No matches
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="tile-edit-unit-group">
                      <div class="tile-edit-unit-header">
                        <div class="tile-edit-unit-label">Civilian Unit</div>
                        <button
                          type="button"
                          class="tile-edit-button"
                          @click="clearCivilianUnitEdit"
                        >
                          Clear
                        </button>
                      </div>
                      <div class="tile-edit-combobox">
                        <input
                          id="tile-civilian-unit-input"
                          class="tile-edit-input"
                          type="text"
                          placeholder="Search civilian unit..."
                          v-model="editCivilianUnitType"
                          @focus="
                            openCombo('civilianUnit', civilianUnitOptionMatches)
                          "
                          @blur="
                            handleComboBlur(
                              'civilianUnit',
                              applyCivilianUnitEdit
                            )
                          "
                          @change="applyCivilianUnitEdit"
                          @input="
                            scheduleUnitEdit('civilian');
                            onComboInput(
                              'civilianUnit',
                              civilianUnitOptionMatches
                            );
                          "
                          @keydown="
                            onComboKeydown(
                              $event,
                              'civilianUnit',
                              civilianUnitOptionMatches,
                              applyCivilianUnitEdit
                            )
                          "
                        />
                        <div
                          v-if="comboOpen.civilianUnit"
                          class="tile-edit-combobox-list"
                        >
                          <button
                            v-for="(unit, index) in civilianUnitOptionMatches"
                            :key="`civilian-unit-${unit.name}-${index}`"
                            type="button"
                            class="tile-edit-combobox-option"
                            :class="{
                              'is-active':
                                comboHighlight.civilianUnit === index,
                            }"
                            @mousedown.prevent="
                              selectComboOption(
                                'civilianUnit',
                                unit,
                                applyCivilianUnitEdit
                              )
                            "
                            @mouseenter="
                              setComboHighlight('civilianUnit', index)
                            "
                          >
                            <span class="tile-edit-combobox-option-title">
                              {{ unit.name }}
                            </span>
                          </button>
                          <div
                            v-if="!civilianUnitOptionMatches.length"
                            class="tile-edit-combobox-empty"
                          >
                            No matches
                          </div>
                        </div>
                      </div>
                      <div class="tile-edit-combobox">
                        <input
                          id="tile-civilian-unit-owner-input"
                          class="tile-edit-input"
                          type="text"
                          placeholder="Civilian owner..."
                          v-model="editCivilianUnitOwnerName"
                          @focus="
                            openCombo(
                              'civilianOwner',
                              civilianOwnerOptionMatches
                            )
                          "
                          @blur="
                            handleComboBlur(
                              'civilianOwner',
                              applyCivilianUnitEdit
                            )
                          "
                          @change="applyCivilianUnitEdit"
                          @input="
                            scheduleUnitEdit('civilian');
                            onComboInput(
                              'civilianOwner',
                              civilianOwnerOptionMatches
                            );
                          "
                          @keydown="
                            onComboKeydown(
                              $event,
                              'civilianOwner',
                              civilianOwnerOptionMatches,
                              applyCivilianUnitEdit
                            )
                          "
                          :style="ownerInputStyle(editCivilianUnitOwnerName)"
                        />
                        <div
                          v-if="comboOpen.civilianOwner"
                          class="tile-edit-combobox-list"
                        >
                          <button
                            v-for="(owner, index) in civilianOwnerOptionMatches"
                            :key="`civilian-owner-${owner.name}-${index}`"
                            type="button"
                            class="tile-edit-combobox-option"
                            :class="{
                              'is-active':
                                comboHighlight.civilianOwner === index,
                            }"
                            @mousedown.prevent="
                              selectComboOption(
                                'civilianOwner',
                                owner,
                                applyCivilianUnitEdit
                              )
                            "
                            @mouseenter="
                              setComboHighlight('civilianOwner', index)
                            "
                          >
                            <span class="tile-edit-combobox-option-title">
                              {{ owner.name }}
                            </span>
                            <span
                              v-if="owner.leader"
                              class="tile-edit-combobox-option-meta"
                            >
                              {{ owner.leader }}
                            </span>
                          </button>
                          <div
                            v-if="!civilianOwnerOptionMatches.length"
                            class="tile-edit-combobox-empty"
                          >
                            No matches
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div> -->
                <div v-if="!selectedTile.city" class="tile-edit-group">
                  <div class="tile-edit-label tile-edit-label-inline">
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editPillaged"
                        @change="applyPillagedEdit"
                        aria-label="Pillaged terrain"
                      />
                      Pillaged
                    </label>
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editCitadel"
                        @change="applyCitadelEdit"
                        aria-label="Citadel improvement"
                      />
                      Citadel
                    </label>
                    <label class="tile-edit-checkbox-inline">
                      <input
                        type="checkbox"
                        v-model="editRuins"
                        @change="applyRuinsEdit"
                        aria-label="Ruins"
                      />
                      Ruins
                    </label>
                  </div>
                </div>
                <div class="tile-map-pins">
                  <div class="tile-map-pins-head">
                    <span class="tile-map-pins-label">Map Pins</span>
                    <span class="tile-map-pins-hint">
                      Save named jump points for tiles/cities.
                    </span>
                  </div>
                  <div class="tile-map-pins-save">
                    <input
                      class="tile-edit-input tile-map-pin-input"
                      type="text"
                      maxlength="40"
                      placeholder="homefront"
                      v-model.trim="mapPinInput"
                      @keydown.enter.prevent="saveCurrentMapPin"
                    />
                    <button
                      type="button"
                      class="tile-edit-button"
                      :disabled="!selectedTile || !mapPinInput"
                      @click="saveCurrentMapPin"
                    >
                      Save Pin
                    </button>
                  </div>
                  <div
                    v-if="mapPinStatus"
                    class="tile-edit-hint tile-map-pin-status"
                  >
                    {{ mapPinStatus }}
                  </div>
                  <div v-if="mapPins.length" class="tile-map-pins-list">
                    <div
                      v-for="pin in mapPins"
                      :key="pin.nameKey"
                      class="tile-map-pin-row"
                    >
                      <button
                        type="button"
                        class="tile-edit-button tile-map-pin-jump"
                        @click="jumpToMapPin(pin.name)"
                      >
                        {{ pin.name }}
                      </button>
                      <span class="tile-map-pin-meta">{{ pin.label }}</span>
                      <button
                        type="button"
                        class="tile-edit-button tile-map-pin-remove"
                        @click="removeMapPin(pin.name)"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div v-else class="tile-edit-hint">No pins saved yet.</div>
                </div>
              </fieldset>
              <p class="tile-edit-hint">
                Editing applies to the selected tile. Brush applies for
                multiple.
              </p>
            </div>
            <div v-else class="tile-info-empty">
              Select a tile to edit its content.
            </div>
          </div>
          <div
            v-show="editPanelTab === 'notes'"
            v-if="showNotesTab"
            class="tile-info-card tile-notes-card"
          >
            <div class="tile-info-title">
              Tile Notes
              <div v-if="tileNotesStatus" class="tile-edit-hint">
                {{ tileNotesStatus }}
              </div>
            </div>
            <div v-if="selectedTile" class="tile-notes-body">
              <div v-if="!editAccessAllowed" class="tile-notes-text">
                {{ selectedTile.notes }}
              </div>
              <div v-else class="tile-notes-editor">
                <textarea
                  class="tile-edit-input tile-notes-input"
                  rows="4"
                  placeholder="Add a note for this tile..."
                  v-model="editTileNotes"
                  @blur="applyTileNotesEdit"
                ></textarea>
              </div>
            </div>
            <div v-else class="tile-info-empty">
              Select a tile to view notes.
            </div>
          </div>
          <div
            v-show="editPanelTab === 'snapshots'"
            class="tile-info-card tile-snapshot-card"
          >
            <div class="tile-info-title">Snapshots</div>
            <div class="tile-snapshot-body">
              <div v-if="snapshotLoading" class="tile-edit-hint">
                Loading snapshots...
              </div>
              <div class="tile-edit-group">
                <label class="tile-edit-label" for="snapshot-view-select">
                  View Snapshot
                </label>
                <div class="tile-edit-row">
                  <select
                    id="snapshot-view-select"
                    class="tile-edit-input"
                    v-model="snapshotViewId"
                  >
                    <option value="">Live map</option>
                    <option
                      v-for="snapshot in snapshots"
                      :key="snapshot.id"
                      :value="snapshot.id"
                    >
                      {{ formatSnapshotLabel(snapshot) }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="tile-edit-group">
                <label class="tile-edit-label" for="snapshot-compare-select">
                  Compare To
                </label>
                <div class="tile-edit-row">
                  <select
                    id="snapshot-compare-select"
                    class="tile-edit-input"
                    v-model="snapshotCompareId"
                    :disabled="!snapshotViewId"
                  >
                    <option value="">None</option>
                    <option v-if="snapshotViewId" value="__live__">
                      Live Map
                    </option>
                    <option
                      v-for="snapshot in snapshots"
                      :key="`compare-${snapshot.id}`"
                      :value="snapshot.id"
                    >
                      {{ formatSnapshotLabel(snapshot) }}
                    </option>
                  </select>
                </div>
              </div>
              <div v-if="snapshotDiffList.length" class="tile-snapshot-diff">
                <div class="tile-info-label">
                  Changed Tiles ({{ snapshotDiffList.length }})
                </div>
                <div
                  v-if="snapshotDiffLegend.length"
                  class="tile-snapshot-legend"
                >
                  <span class="tile-snapshot-legend-label">Changes:</span>
                  <span
                    v-for="item in snapshotDiffLegend"
                    :key="`legend-${item.id}`"
                    class="tile-snapshot-chip"
                  >
                    {{ item.label }} {{ item.count }}
                  </span>
                </div>
                <div class="tile-snapshot-diff-list">
                  <details
                    v-if="snapshotCityChanges.founded.length"
                    class="tile-snapshot-diff-section"
                  >
                    <summary class="tile-snapshot-diff-title">
                      New Cities ({{ snapshotCityChanges.founded.length }})
                    </summary>
                    <div
                      v-for="entry in snapshotCityChanges.founded"
                      :key="`founded-${entry.key}-${entry.name}`"
                      class="tile-snapshot-diff-item"
                    >
                      {{ snapshotCityLabel(entry) }}
                    </div>
                  </details>
                  <details
                    v-if="snapshotCityChanges.captured.length"
                    class="tile-snapshot-diff-section"
                  >
                    <summary class="tile-snapshot-diff-title">
                      Captured Cities ({{
                        snapshotCityChanges.captured.length
                      }})
                    </summary>
                    <div
                      v-for="entry in snapshotCityChanges.captured"
                      :key="`captured-${entry.key}-${entry.name}`"
                      class="tile-snapshot-diff-item"
                    >
                      {{ snapshotCityLabel(entry) }}
                    </div>
                  </details>
                  <details
                    v-if="snapshotCityChanges.removed.length"
                    class="tile-snapshot-diff-section"
                  >
                    <summary class="tile-snapshot-diff-title">
                      Cities Razed/Removed ({{
                        snapshotCityChanges.removed.length
                      }})
                    </summary>
                    <div
                      v-for="entry in snapshotCityChanges.removed"
                      :key="`removed-${entry.key}-${entry.name}`"
                      class="tile-snapshot-diff-item"
                    >
                      {{ snapshotCityLabel(entry) }}
                    </div>
                  </details>
                  <div
                    v-if="
                      !snapshotCityChanges.founded.length &&
                      !snapshotCityChanges.captured.length &&
                      !snapshotCityChanges.removed.length
                    "
                    class="tile-snapshot-diff-empty"
                  >
                    No city changes detected.
                  </div>
                </div>
              </div>
              <div
                v-else-if="snapshotViewId && snapshotCompareId"
                class="tile-edit-hint"
              >
                No differences found between snapshots.
              </div>
              <div v-if="isAdmin" class="tile-snapshot-admin">
                <div class="tile-edit-group">
                  <label class="tile-edit-label" for="snapshot-episode-input">
                    Episode # Snapshot
                  </label>
                  <div class="tile-edit-row">
                    <input
                      id="snapshot-episode-input"
                      class="tile-edit-input"
                      type="number"
                      min="1"
                      placeholder="Episode #"
                      v-model="snapshotEpisodeNumber"
                    />
                    <input
                      class="tile-edit-input"
                      type="datetime-local"
                      placeholder="UTC date/time"
                      v-model="snapshotEpisodeAt"
                    />
                    <button
                      type="button"
                      class="tile-edit-button"
                      :disabled="snapshotSaving"
                      @click="saveSnapshot"
                    >
                      Save
                    </button>
                  </div>
                  <div v-if="snapshotMessage" class="tile-edit-hint">
                    {{ snapshotMessage }}
                  </div>
                </div>
                <div
                  v-if="adminSnapshots.length"
                  class="tile-snapshot-admin-list"
                >
                  <div
                    v-for="snapshot in adminSnapshots"
                    :key="`publish-${snapshot.id}`"
                    class="tile-snapshot-admin-item"
                  >
                    <div class="tile-snapshot-admin-meta">
                      <span class="tile-snapshot-admin-label">
                        {{ formatSnapshotLabel(snapshot) }}
                      </span>
                      <span
                        class="tile-snapshot-admin-status"
                        :class="{
                          'is-published': snapshot.is_published,
                          'is-draft': !snapshot.is_published,
                        }"
                      >
                        {{ snapshot.is_published ? "Published" : "Draft" }}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="tile-edit-button"
                      :disabled="snapshotPublishLoadingId === snapshot.id"
                      @click="toggleSnapshotPublish(snapshot)"
                    >
                      {{ snapshot.is_published ? "Unpublish" : "Publish" }}
                    </button>
                    <button
                      type="button"
                      class="tile-edit-button"
                      :disabled="
                        snapshotResetLoadingId === snapshot.id ||
                        snapshotPublishLoadingId === snapshot.id
                      "
                      title="Publish snapshot and clear overrides from previous snapshot"
                      @click="publishSnapshotAndClearOverrides(snapshot)"
                    >
                      Publish + Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-show="editPanelTab === 'overlays'"
            class="tile-info-card tile-overlay-card"
          >
            <div class="tile-info-title">Overlays</div>
            <div class="tile-overlay-body">
              <div class="tile-map-toolbar-group tile-map-mode-toggle">
                <button
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': overlayView === 'civilization' }"
                  @click="overlayView = 'civilization'"
                >
                  Civilization
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': overlayView === 'population' }"
                  @click="overlayView = 'population'"
                >
                  Population
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': overlayView === 'religion' }"
                  @click="overlayView = 'religion'"
                >
                  Religion
                </button>
                <button
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': overlayView === 'contrast' }"
                  @click="overlayView = 'contrast'"
                >
                  Contrast
                </button>
              </div>

              <div
                v-if="overlayView === 'civilization'"
                class="tile-overlay-section"
              >
                <div class="tile-edit-group">
                  <label class="tile-edit-label" for="overlay-civ-input">
                    Civilization
                  </label>
                  <div class="tile-edit-row">
                    <div class="tile-edit-combobox">
                      <input
                        id="overlay-civ-input"
                        class="tile-edit-input"
                        type="text"
                        placeholder="Search civ..."
                        v-model="overlayOwnerName"
                        @focus="
                          openCombo('overlayOwner', overlayOwnerOptionMatches)
                        "
                        @blur="handleComboBlur('overlayOwner')"
                        @input="
                          onComboInput(
                            'overlayOwner',
                            overlayOwnerOptionMatches
                          )
                        "
                        @keydown="
                          onComboKeydown(
                            $event,
                            'overlayOwner',
                            overlayOwnerOptionMatches
                          )
                        "
                        :style="ownerInputStyle(overlayOwnerName)"
                      />
                      <div
                        v-if="comboOpen.overlayOwner"
                        class="tile-edit-combobox-list"
                      >
                        <button
                          v-for="(owner, index) in overlayOwnerOptionMatches"
                          :key="`overlay-owner-${owner.name}-${index}`"
                          type="button"
                          class="tile-edit-combobox-option"
                          :class="{
                            'is-active': comboHighlight.overlayOwner === index,
                          }"
                          @mousedown.prevent="
                            selectComboOption('overlayOwner', owner)
                          "
                          @mouseenter="setComboHighlight('overlayOwner', index)"
                        >
                          <span class="tile-edit-combobox-option-title">
                            {{ owner.name }}
                          </span>
                          <span
                            v-if="owner.leader"
                            class="tile-edit-combobox-option-meta"
                          >
                            {{ owner.leader }}
                          </span>
                        </button>
                        <div
                          v-if="!overlayOwnerOptionMatches.length"
                          class="tile-edit-combobox-empty"
                        >
                          No matches
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="tile-edit-button"
                      @click="overlayOwnerName = ''"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div
                  v-if="civilizationOverlayMetrics"
                  class="tile-info-list tile-overlay-metrics"
                >
                  <div class="tile-info-row">
                    <div class="tile-info-label">Civilization</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.ownerLabel }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Tiles Owned</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.tilesOwned }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Cities</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.cities }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Total Population</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.population }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Avg City Size</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.avgCitySize }}
                    </div>
                  </div>
                  <!-- <div class="tile-info-row">
                    <div class="tile-info-label">Combat Units</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.combatUnits }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Civilian Units</div>
                    <div class="tile-info-value">
                      {{ civilizationOverlayMetrics.civilianUnits }}
                    </div>
                  </div> -->
                </div>
                <div v-else class="tile-info-empty">
                  Select a civilization to isolate its owned tiles, cities, and
                  units.
                </div>
              </div>

              <div
                v-else-if="overlayView === 'population'"
                class="tile-overlay-section"
              >
                <div class="tile-info-list tile-overlay-metrics">
                  <div class="tile-info-row">
                    <div class="tile-info-label">Total Population</div>
                    <div class="tile-info-value">
                      {{ populationOverlayMetrics.totalPopulation }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Total Cities</div>
                    <div class="tile-info-value">
                      {{ populationOverlayMetrics.totalCities }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Owned Tiles</div>
                    <div class="tile-info-value">
                      {{ populationOverlayMetrics.totalOwnedTiles }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Average Density</div>
                    <div class="tile-info-value">
                      {{
                        formatOverlayDensity(
                          populationOverlayMetrics.averageDensity
                        )
                      }}
                    </div>
                  </div>
                  <div class="tile-info-row">
                    <div class="tile-info-label">Highest Density</div>
                    <div class="tile-info-value">
                      {{
                        populationOverlayMetrics.densestOwner
                          ? `${
                              populationOverlayMetrics.densestOwner.label
                            } (${formatOverlayDensity(
                              populationOverlayMetrics.densestOwner.density
                            )})`
                          : "None"
                      }}
                    </div>
                  </div>
                </div>
                <div
                  v-if="populationOverlayTopPopulationCivilizations.length"
                  class="tile-overlay-ranking"
                >
                  <div class="tile-info-label">
                    Top Population Civilizations
                  </div>
                  <div
                    v-for="(
                      entry, index
                    ) in populationOverlayTopPopulationCivilizations"
                    :key="`population-${entry.owner}`"
                    class="tile-overlay-ranking-item"
                  >
                    <span class="tile-overlay-ranking-label">
                      {{ index + 1 }}. {{ entry.label }}
                    </span>
                    <span class="tile-overlay-ranking-value">
                      {{ formatOverlayCount(entry.population) }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="populationOverlayTopTilesCivilizations.length"
                  class="tile-overlay-ranking"
                >
                  <div class="tile-info-label">Top Tiles Civilizations</div>
                  <div
                    v-for="(
                      entry, index
                    ) in populationOverlayTopTilesCivilizations"
                    :key="`tiles-${entry.owner}`"
                    class="tile-overlay-ranking-item"
                  >
                    <span class="tile-overlay-ranking-label">
                      {{ index + 1 }}. {{ entry.label }}
                    </span>
                    <span class="tile-overlay-ranking-value">
                      {{ formatOverlayCount(entry.tiles) }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="populationOverlayTopCitiesCivilizations.length"
                  class="tile-overlay-ranking"
                >
                  <div class="tile-info-label">Top Cities Owned</div>
                  <div
                    v-for="(
                      entry, index
                    ) in populationOverlayTopCitiesCivilizations"
                    :key="`cities-${entry.owner}`"
                    class="tile-overlay-ranking-item"
                  >
                    <span class="tile-overlay-ranking-label">
                      {{ index + 1 }}. {{ entry.label }}
                    </span>
                    <span class="tile-overlay-ranking-value">
                      {{ formatOverlayCount(entry.cities) }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="populationOverlayTopDensityCivilizations.length"
                  class="tile-overlay-ranking"
                >
                  <div class="tile-info-label">
                    Top Density (sans Water tiles)
                  </div>
                  <div
                    v-for="(
                      entry, index
                    ) in populationOverlayTopDensityCivilizations"
                    :key="`density-${entry.owner}`"
                    class="tile-overlay-ranking-item"
                  >
                    <span class="tile-overlay-ranking-label">
                      {{ index + 1 }}. {{ entry.label }}
                    </span>
                    <span class="tile-overlay-ranking-value">
                      {{ formatOverlayDensity(entry.density) }}
                    </span>
                  </div>
                </div>
              </div>
              <div
                v-else-if="overlayView === 'religion'"
                class="tile-overlay-section"
              >
                <div class="tile-info-list tile-overlay-metrics">
                  <!-- <div class="tile-info-row">
                    <div class="tile-info-label">Founded Religions</div>
                    <div class="tile-info-value">
                      {{ religionOverlaySummary.length }}
                    </div>
                  </div> -->
                  <div class="tile-info-row">
                    <div class="tile-info-label">
                      Civilizations With Religion
                    </div>
                    <div class="tile-info-value">
                      {{ religionOverlayCivilizationCount }}
                    </div>
                  </div>
                </div>
                <div
                  v-if="religionOverlaySummary.length"
                  class="tile-overlay-ranking"
                >
                  <div class="tile-info-label">Active Religions</div>
                  <div
                    v-for="entry in religionOverlaySummary"
                    :key="`religion-${entry.key}`"
                    class="tile-overlay-ranking-item"
                  >
                    <span class="tile-overlay-ranking-label">
                      <span
                        class="tile-overlay-religion-swatch"
                        :style="{ backgroundColor: entry.color }"
                      />
                      {{ entry.religion }}
                    </span>
                    <span class="tile-overlay-ranking-value">
                      {{ entry.civilizations }} civ{{
                        entry.civilizations === 1 ? "" : "s"
                      }}
                    </span>
                  </div>
                </div>
                <div v-else class="tile-info-empty">
                  No capitals currently have a religion assigned.
                </div>
              </div>
              <div v-else class="tile-overlay-section">
                <!-- <div class="tile-info-list tile-overlay-metrics">
                  <div class="tile-info-row">
                    <div class="tile-info-label">Active Contrast Toggles</div>
                    <div class="tile-info-value">
                      {{ activeContrastToggleCount }}
                    </div>
                  </div>
                </div> -->
                <div class="tile-overlay-contrast-toggles">
                  <label class="tile-edit-checkbox">
                    <input type="checkbox" v-model="contrastHideDecorations" />
                    Hide Terrain Details
                  </label>
                  <label class="tile-edit-checkbox">
                    <input type="checkbox" v-model="contrastFlattenLandWater" />
                    Flatten Terrain Colors
                  </label>
                  <label class="tile-edit-checkbox">
                    <input type="checkbox" v-model="contrastGrayscaleTerrain" />
                    Grayscale Terrain
                  </label>
                  <label class="tile-edit-checkbox">
                    <input
                      type="checkbox"
                      v-model="contrastBoostOwnerOpacity"
                    />
                    Increase Civilization Opacity
                  </label>
                  <label class="tile-edit-checkbox">
                    <input type="checkbox" v-model="contrastLargeCityBanners" />
                    Larger City Banners
                  </label>
                </div>
                <div class="tile-edit-row">
                  <button
                    type="button"
                    class="tile-edit-button"
                    @click="resetContrastOptions"
                  >
                    Reset Contrasts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="!embedded" class="tile-map-legend">
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
      </div>
    </div>
  </section>
</template>

<script>
import { createClient } from "@supabase/supabase-js";
import { mapConfig, ownerPalette } from "../../../data/communityTileMap";
import { parseCiv5Map } from "./civ5MapParser";
import {
  s5OwnerList,
  normalizeOwnerKey,
  OWNER_COLOR_MAP,
  SQRT3,
  RESOURCE_COLOR_OPTIONS,
  IMPROVEMENT_COLOR_OPTIONS,
  FEATURE_COLORS,
  WONDER_COLORS,
  ALL_UNITS,
  BASE_UNIT_IDS,
  NOTE_PIN_PATHS,
  RUINS_PATHS,
} from "./communityTileMapConstants";
import {
  buildSnapshotLookup,
  snapshotPayloadEqual,
  snapshotValueEqual,
  buildCityChangeSummary,
} from "./communityTileMapSnapshotUtils";
import {
  computeTooltipCoords,
  computeTooltipBridgeRect,
} from "./communityTileMapTooltipUtils";
import {
  resolveBrushOwnerId,
  getBrushOwnerChange,
  getBrushOverlayStyle,
} from "./communityTileMapBrushUtils";
import { SUPABASE_USER_SETTINGS_TABLE } from "../../supabaseClient";
const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";
const SUPABASE_MAP_ID = "s5";
const SUPABASE_OVERRIDE_TABLE = "tile_overrides";
const SUPABASE_EDIT_LOG_TABLE = "tile_edits";
const SUPABASE_SNAPSHOT_TABLE = "map_snapshots";
const SUPABASE_ADMIN_TABLE = "map_admins";
const SUPABASE_CHECK_FUNCTION = "check-kofi-subscriber";
const REQUIRE_AUTH_FOR_LOCAL = false;
const ENABLE_OVERRIDE_CLEANUP = false;
const SUPABASE_UNDO_FUNCTION = "undo-tile-edits";
const MINI_MAP_MAX_WIDTH = 180;
const MINI_MAP_MAX_HEIGHT = 120;
const COMBO_MAX_RESULTS = 20;
const QUICK_JUMP_FOCUS_SCALE = 1.5;
const MAP_PINS_STORAGE_KEY = "cbr.mapPins.v1";
const MAP_CONTRAST_SETTINGS_KEY = "cbr.mapContrast.v1";
const MAP_CONTRAST_CLOUD_KEYS = Object.freeze({
  contrastHideDecorations: "mapContrastHideDecorations",
  contrastFlattenLandWater: "mapContrastFlattenLandWater",
  contrastGrayscaleTerrain: "mapContrastGrayscaleTerrain",
  contrastBoostOwnerOpacity: "mapContrastBoostOwnerOpacity",
  contrastLargeCityBanners: "mapContrastLargeCityBanners",
});
const RELIGION_OVERLAY_DEFINITIONS = Object.freeze([
  {
    religion: "Anito",
    holyCity: "Singhapala",
    controlledBy: "Cebu",
    color: "hsl(210deg 100% 15%)",
  },
  {
    religion: "Bogomilism",
    holyCity: "Targoviste",
    controlledBy: "Wallachia",
    color: "hsl(179deg 75% 21%)",
  },
  {
    religion: "Bole Maru",
    holyCity: "Co'kadjal",
    controlledBy: "Pomo",
    color: "hsl(16deg 65% 54%)",
  },
  {
    religion: "Catholicism",
    holyCity: "Gelonus",
    controlledBy: "Scythia",
    color: "hsl(37deg 85% 40%)",
  },
  {
    religion: "Eastern Orthodoxy",
    holyCity: "Shache",
    controlledBy: "Circassia",
    color: "hsl(226deg 100% 65%)",
  },
  {
    religion: "Forn Sidr",
    holyCity: "Vina",
    controlledBy: "Bjarmians",
    color: "hsl(295deg 99% 11%)",
  },
  {
    religion: "Methodism",
    holyCity: "Michilimackinac",
    controlledBy: "Anishinaabe",
    color: "hsl(328deg 100% 13%)",
  },
  {
    religion: "Midewiwin",
    holyCity: "Onondaga",
    controlledBy: "Onondaga",
    color: "hsl(19deg 30% 90%)",
  },
  {
    religion: "Ngarranggarni",
    holyCity: "Junjuwa",
    controlledBy: "Bunuba",
    color: "hsl(359deg 95% 25%)",
  },
  {
    religion: "Pachaism",
    holyCity: "Caral",
    controlledBy: "Caral",
    color: "hsl(332deg 45% 35%)",
  },
  {
    religion: "Pesedjet",
    holyCity: "Avaris",
    controlledBy: "Hyksos",
    color: "hsl(5deg 100% 17.5%)",
  },
  {
    religion: "Pohakantenna",
    holyCity: "Nanza",
    controlledBy: "Ponca",
    color: "hsl(46deg 69% 64%)",
  },
  {
    religion: "Puata Tupuna",
    holyCity: "Anakena",
    controlledBy: "Rapa Nui",
    color: "hsl(211deg 35% 65%)",
  },
  {
    religion: "Samanism",
    holyCity: "Kellog",
    controlledBy: "Ket",
    color: "hsl(167deg 20% 50%)",
  },
  {
    religion: "Sgaanaang",
    holyCity: "Kaachxana Aak'w",
    controlledBy: "Tlingit",
    color: "hsl(44deg 35% 70%)",
  },
  {
    religion: "Shaktism",
    holyCity: "Dhaka",
    controlledBy: "Bangladesh",
    color: "hsl(164deg 88% 16%)",
  },
  {
    religion: "Sunni",
    holyCity: "Karachi",
    controlledBy: "Pakistan",
    color: "hsl(86deg 95% 45%)",
  },
  {
    religion: "Tlateomatiliztli",
    holyCity: "Teotihuacan",
    controlledBy: "Teotihuacan",
    color: "hsl(186deg 100% 15%)",
  },
]);
const RELIGION_OVERLAY_FALLBACK_COLORS = [
  "#d8cf67",
  "#b277d9",
  "#f39b4a",
  "#71c5ef",
  "#e5744d",
  "#7ac65c",
  "#cd4f99",
  "#5a9dd9",
];

export default {
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
    embeddedMode: {
      type: String,
      default: "live",
      validator: (value) => ["live", "snapshot"].includes(value),
    },
    snapshotPayload: {
      type: Array,
      default: null,
    },
    useBaseSnapshot: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    resolvedEmbeddedMode() {
      return ["live", "snapshot"].includes(this.embeddedMode)
        ? this.embeddedMode
        : "live";
    },
  },
  data() {
    return {
      // Map data
      tiles: [],
      mapConfig: { ...mapConfig },
      ownerPalette: [...ownerPalette],
      ownerColors: {},
      ownerLegend: [],
      mapName: "",
      mapDescription: "",
      isLoading: false,
      loadError: "",
      // Supabase/auth
      supabase: null,
      authEmail: "",
      authUser: null,
      authMessage: "",
      authChecking: false,
      authLoading: false,
      canEdit: false,
      isAdmin: false,
      undoLoading: false,
      localEditsEnabled: false,
      localOverrides: new Map(),
      tileSaveQueue: new Map(),
      tileSaveTimer: null,
      tileSaveRetryTimer: null,
      tileSaveRetryCount: 0,
      contrastSettingsSaveTimer: null,
      contrastSettingsSyncing: false,
      tileOverrideSubscription: null,
      authSubscription: null,
      modeSwitching: false,
      // Viewport + interaction
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
      miniMapEnabled: false,
      // Hover + selection
      hoveredTile: null,
      hoverTooltipTile: null,
      hoverTooltipVisible: false,
      hoverTooltipTimer: null,
      hoverTooltipLocked: false,
      hoverTooltipHideTimer: null,
      hoverTooltipUpdateTimer: null,
      hoverTooltipSizeCache: new Map(),
      hoverTooltipPosition: { x: 0, y: 0 },
      hoverTooltipSize: { width: 0, height: 0 },
      selectedTile: null,
      pendingRouteTileKey: "",
      quickJumpRequestedTileKey: "",
      quickJumpRequestedCityName: "",
      quickJumpRequestedOwnerName: "",
      quickJumpRequestedSnapshotId: "",
      ownerJumpCycleByOwner: {},
      mapPins: [],
      mapPinInput: "",
      mapPinStatus: "",
      mapPinStatusTimer: null,
      tileLookup: null,
      showUnits: false,
      ownerSecondaryColors: {},
      // Edit form state
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
      editRuins: false,
      editTileNotes: "",
      tileNotesStatus: "",
      tileNotesStatusTimer: null,
      // Panel UI state
      editPanelCollapsed: true,
      editPanelTab: "edit",
      overlayView: "civilization",
      overlayOwnerName: "",
      contrastHideDecorations: false,
      contrastFlattenLandWater: false,
      contrastGrayscaleTerrain: false,
      contrastBoostOwnerOpacity: false,
      contrastLargeCityBanners: false,
      contrastSettingsLoading: false,
      isMobileView: false,
      isMobileBrowser: false,
      lowMemoryMode: false,
      lastPointerType: null,
      deferOwnerBorders: false,
      // Render timers
      recentEditTick: 0,
      recentEditFrameId: null,
      canvasDrawFrameId: null,
      terrainBaseCanvas: null,
      terrainBaseCacheKey: "",
      ownerBordersRebuildId: null,
      miniMapFrameId: null,
      unitEditTimers: {
        combat: null,
        civilian: null,
      },
      editDebounceTimers: {
        owner: null,
        originalOwner: null,
        cityName: null,
        cityValue: null,
        cityReligion: null,
        worldWonders: null,
      },
      forceLegacyOverrideConflict: false,
      comboOpen: {
        owner: false,
        originalOwner: false,
        combatUnit: false,
        combatOwner: false,
        civilianUnit: false,
        civilianOwner: false,
        overlayOwner: false,
      },
      comboHighlight: {
        owner: -1,
        originalOwner: -1,
        combatUnit: -1,
        combatOwner: -1,
        civilianUnit: -1,
        civilianOwner: -1,
        overlayOwner: -1,
      },
      hasLoadedOverrides: false,
      ownerBrushEnabled: false,
      ownerBrushMode: "paint",
      isPaintingOwner: false,
      ownerBrushId: null,
      brushFrameId: null,
      brushPendingTile: null,
      brushDirtyKeys: new Set(),
      nextUnitId: 1,
      // Legends
      terrainLegend: [],
      featureLegend: [],
      wonderLegend: [],
      resourceLegend: [],
      improvementLegend: [],
      // Snapshots
      snapshots: [],
      snapshotPayloadCache: Object.create(null),
      snapshotPayloadRequests: Object.create(null),
      snapshotViewId: "",
      snapshotCompareId: "",
      snapshotApplyRequestId: 0,
      snapshotDiffRequestId: 0,
      snapshotDiffLookup: {},
      snapshotDiffList: [],
      snapshotLoading: false,
      snapshotSaving: false,
      snapshotMessage: "",
      snapshotEpisodeNumber: "",
      snapshotEpisodeAt: "",
      snapshotPublishLoadingId: null,
      snapshotResetLoadingId: null,
      baseSnapshotPayload: null,
      liveBaseSnapshotId: null,
      liveBaseSnapshotPayload: null,
      liveOverrideLookup: {},
      liveSnapshotPayload: [],
      lastSupabaseError: "",
      snapshotDiffSummary: {
        owner: 0,
        city: 0,
        units: 0,
        other: 0,
      },
      snapshotCityChanges: {
        founded: [],
        captured: [],
        removed: [],
      },
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
    resolvedEmbeddedMode() {
      return ["live", "snapshot"].includes(this.embeddedMode)
        ? this.embeddedMode
        : "live";
    },
    isSnapshotEmbed() {
      return this.embedded && this.resolvedEmbeddedMode === "snapshot";
    },
    canvasRenderScale() {
      if (this.lowMemoryMode) {
        return this.isSnapshotEmbed ? 0.4 : 0.6;
      }
      if (this.isSnapshotEmbed && this.isMobileBrowser) {
        return 0.45;
      }
      return 1;
    },
    editAccessAllowed() {
      if (this.snapshotViewId) {
        return false;
      }
      if (this.localEditsEnabled) {
        return REQUIRE_AUTH_FOR_LOCAL ? !!this.authUser : true;
      }
      return this.canEdit;
    },
    isSnapshotViewing() {
      return !!this.snapshotViewId;
    },
    snapshotView() {
      return (
        this.snapshots.find(
          (snapshot) => snapshot.id === this.snapshotViewId
        ) || null
      );
    },
    snapshotCompare() {
      return (
        this.snapshots.find(
          (snapshot) => snapshot.id === this.snapshotCompareId
        ) || null
      );
    },
    snapshotComparePayload() {
      if (this.snapshotCompareId === "__live__") {
        return this.liveSnapshotPayload || [];
      }
      if (!this.snapshotCompareId) {
        return [];
      }
      if (
        this.snapshotPayloadCache &&
        Array.isArray(this.snapshotPayloadCache[this.snapshotCompareId])
      ) {
        return this.snapshotPayloadCache[this.snapshotCompareId];
      }
      return this.snapshotCompare && Array.isArray(this.snapshotCompare.payload)
        ? this.snapshotCompare.payload
        : [];
    },
    snapshotDiffLegend() {
      const summary = this.snapshotDiffSummary || {};
      return [
        { id: "owner", label: "Owner", count: summary.owner || 0 },
        { id: "city", label: "City", count: summary.city || 0 },
        { id: "units", label: "Units", count: summary.units || 0 },
      ].filter((entry) => entry.count > 0);
    },
    adminSnapshots() {
      return (this.snapshots || []).filter((snapshot) => !snapshot.is_virtual);
    },
    showNotesTab() {
      return (
        this.editAccessAllowed ||
        (this.selectedTile && !!this.selectedTile.notes)
      );
    },
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
      const size = this.hexSize * 0.2;
      return `${-size} 0 0 ${-size} ${size} 0 0 ${size}`;
    },

    routePath() {
      const size = this.hexSize * 0.45;
      return `M ${-size} ${size * 0.6} L ${size} ${size * 0.6}`;
    },

    wonderPath() {
      const outer = this.hexSize * 0.25;
      const inner = this.hexSize * 0.25;
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
      if (!this.hoverTooltipCoords) {
        return null;
      }
      return {
        left: `${this.hoverTooltipCoords.left}px`,
        top: `${this.hoverTooltipCoords.top}px`,
      };
    },
    hoverTooltipCoords() {
      return computeTooltipCoords({
        viewportWidth: this.viewportSize.width,
        viewportHeight: this.viewportSize.height,
        tooltipWidth: this.hoverTooltipSize.width || 240,
        tooltipHeight: this.hoverTooltipSize.height || 200,
        position: this.hoverTooltipPosition,
      });
    },
    hoverTooltipBridgeStyle() {
      const rect = computeTooltipBridgeRect({
        position: this.hoverTooltipPosition,
        tooltipCoords: this.hoverTooltipCoords,
      });
      if (!rect) {
        return null;
      }
      return {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      };
    },

    scaleLabel() {
      return `${Math.round(this.scale * 100)}%`;
    },

    featureRadius() {
      return this.hexSize * 0.25;
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
      return this.scale >= 0.55 && !this.contrastHideDecorations;
    },

    showLabels() {
      if (this.lowMemoryMode && this.useTerrainCanvas) {
        return false;
      }
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
      return this.lowMemoryMode || this.scale <= 1;
    },

    renderOwnerBorders() {
      return !this.lowMemoryMode;
    },

    ownerOptions() {
      return s5OwnerList;
    },

    ownerOptionMatches() {
      return this.filterOwnerOptions(this.editOwnerName);
    },

    originalOwnerOptionMatches() {
      return this.filterOwnerOptions(this.editOriginalOwnerName);
    },

    combatOwnerOptionMatches() {
      return this.filterOwnerOptions(this.editCombatUnitOwnerName);
    },

    civilianOwnerOptionMatches() {
      return this.filterOwnerOptions(this.editCivilianUnitOwnerName);
    },

    overlayOwnerOptionMatches() {
      return this.filterOwnerOptions(this.overlayOwnerName);
    },

    combatUnitOptions() {
      return ALL_UNITS.filter((unit) => unit.role === "combat");
    },

    civilianUnitOptions() {
      return ALL_UNITS.filter((unit) => unit.role === "civilian");
    },

    combatUnitOptionMatches() {
      return this.filterUnitOptions(
        this.editCombatUnitType,
        this.combatUnitOptions
      );
    },

    civilianUnitOptionMatches() {
      return this.filterUnitOptions(
        this.editCivilianUnitType,
        this.civilianUnitOptions
      );
    },

    canvasWidth() {
      const scale = this.canvasRenderScale || 1;
      return Math.max(1, Math.ceil(this.gridWidth * scale));
    },

    canvasHeight() {
      const scale = this.canvasRenderScale || 1;
      return Math.max(1, Math.ceil(this.gridHeight * scale));
    },

    showMiniMap() {
      return this.miniMapEnabled;
    },

    showEmbeddedMiniMapToggle() {
      return this.embedded && this.scale > 1;
    },

    miniMapScale() {
      if (!this.gridWidth || !this.gridHeight) {
        return 0;
      }
      const scaleX = MINI_MAP_MAX_WIDTH / this.gridWidth;
      const scaleY = MINI_MAP_MAX_HEIGHT / this.gridHeight;
      return Math.min(scaleX, scaleY);
    },

    miniMapWidth() {
      return Math.max(0, Math.round(this.gridWidth * this.miniMapScale));
    },

    miniMapHeight() {
      return Math.max(0, Math.round(this.gridHeight * this.miniMapScale));
    },

    miniMapViewport() {
      if (!this.gridWidth || !this.gridHeight) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const width = this.viewportSize.width / this.scale;
      const height = this.viewportSize.height / this.scale;
      const maxX = Math.max(0, this.gridWidth - width);
      const maxY = Math.max(0, this.gridHeight - height);
      const x = clampValue(-this.translate.x / this.scale, 0, maxX);
      const y = clampValue(-this.translate.y / this.scale, 0, maxY);
      return {
        x,
        y,
        width: Math.min(width, this.gridWidth),
        height: Math.min(height, this.gridHeight),
      };
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
      return this.visibleTiles.filter(
        (tile) => tile.city && tile.city.name && this.shouldShowCity(tile)
      );
    },

    mapPinTiles() {
      if (!this.mapPins.length || !this.tileLookup) {
        return [];
      }
      return this.mapPins
        .map((pin) => {
          if (!pin || !pin.nameKey) {
            return null;
          }
          const tile = pin.tileKey ? this.tileLookup.get(pin.tileKey) : null;
          if (!tile) {
            return null;
          }
          return {
            ...pin,
            tile,
          };
        })
        .filter(Boolean);
    },

    visibleMapPinTiles() {
      if (this.useTerrainCanvas || !this.mapPinTiles.length) {
        return [];
      }
      if (!this.visibleTiles.length) {
        return this.mapPinTiles;
      }
      const visibleKeys = new Set(this.visibleTiles.map((tile) => tile.key));
      return this.mapPinTiles.filter(
        (pin) => pin.tile && visibleKeys.has(pin.tile.key)
      );
    },

    showMapPinLabels() {
      return this.scale >= 1.2;
    },
  },

  watch: {
    $route() {
      this.applyRequestedTileFromRoute();
    },
    useTerrainCanvas(nextValue) {
      if (nextValue) {
        this.$nextTick(() => {
          this.drawTerrainCanvas();
        });
      }
      this.scheduleMiniMapDrawIfVisible();
    },
    editPanelTab(nextValue) {
      if (nextValue === "snapshots") {
        this.loadSnapshotsIfActive();
      }
      this.handleOverlayVisualizationChange();
    },
    overlayView() {
      this.handleOverlayVisualizationChange();
    },
    overlayOwnerName() {
      this.handleOverlayVisualizationChange();
    },
    contrastVisualizationKey() {
      this.handleOverlayVisualizationChange();
      this.persistContrastSettingsForAuthUser();
    },
    scale: "handleScaleChange",
    translate: {
      deep: true,
      handler: "scheduleMiniMapDrawIfVisible",
    },
    tiles: "scheduleMiniMapDrawIfVisible",
    viewportSize: "scheduleMiniMapDrawIfVisible",
    mapPins() {
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },
    hoveredTile(nextTile) {
      if (!nextTile) {
        if (this.hoverTooltipVisible) {
          return;
        }
        if (!this.hoverTooltipLocked) {
          this.hideHoverTooltip();
        }
        return;
      }
      this.scheduleHoverTooltip(nextTile);
    },
    editAccessAllowed() {
      this.ensureEditPanelTab();
    },
    editPanelCollapsed() {
      this.$nextTick(() => {
        this.updateViewportSize();
        this.clampView();
      });
    },
    isMobileView(nextValue) {
      if (nextValue && this.editPanelCollapsed) {
        this.editPanelCollapsed = false;
      }
    },
    snapshotViewId() {
      this.applySnapshotView();
      this.computeSnapshotDiffs();
    },
    snapshotCompareId() {
      this.computeSnapshotDiffs();
    },
    snapshots() {
      this.computeSnapshotDiffs();
    },
    selectedTile(nextTile) {
      this.ensureEditPanelTab();
      this.syncEditFieldsFromTile(nextTile);
      if (!nextTile) {
        this.hoverTooltipLocked = false;
        this.hideHoverTooltip();
      }
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.updateViewportSize();
      this.fitToView();
    });
    this.isMobileView = window.innerWidth <= 900;
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      this.isMobileBrowser = /Mobi|Android|iP(hone|ad|od)/.test(ua);
      const deviceMemory = Number(navigator.deviceMemory || 0);
      const hardwareThreads = Number(navigator.hardwareConcurrency || 0);
      const hasBudgetSignals = !!(deviceMemory || hardwareThreads);
      const isLikelyLowMemory =
        (deviceMemory > 0 && deviceMemory <= 4) ||
        (hardwareThreads > 0 && hardwareThreads <= 4) ||
        (!hasBudgetSignals && this.isMobileBrowser);
      this.lowMemoryMode = this.isMobileBrowser && isLikelyLowMemory;
    }
    if (this.isMobileView) {
      this.editPanelCollapsed = false;
    }
    const useLiveMap =
      !this.snapshotPayload && this.resolvedEmbeddedMode !== "snapshot";
    if (useLiveMap) {
      this.initSupabase();
    }
    this.loadMapPins();
    this.loadMap();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("quick-jump-map-tile", this.handleQuickJumpTile);
    window.addEventListener("storage", this.handleMapPinStorageChange);
    this.applyRequestedTileFromRoute();
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("quick-jump-map-tile", this.handleQuickJumpTile);
    window.removeEventListener("storage", this.handleMapPinStorageChange);
    this.teardownSupabase();
    if (this.canvasDrawFrameId) {
      window.cancelAnimationFrame(this.canvasDrawFrameId);
      this.canvasDrawFrameId = null;
    }
    if (this.ownerBordersRebuildId) {
      window.cancelAnimationFrame(this.ownerBordersRebuildId);
      this.ownerBordersRebuildId = null;
    }
    if (this.unitEditTimers) {
      Object.values(this.unitEditTimers).forEach((timer) => {
        if (timer) {
          window.clearTimeout(timer);
        }
      });
    }
    if (this.editDebounceTimers) {
      Object.values(this.editDebounceTimers).forEach((timer) => {
        if (timer) {
          window.clearTimeout(timer);
        }
      });
    }
    if (this.brushFrameId) {
      window.cancelAnimationFrame(this.brushFrameId);
      this.brushFrameId = null;
    }
    if (this.mapPinStatusTimer) {
      window.clearTimeout(this.mapPinStatusTimer);
      this.mapPinStatusTimer = null;
    }
    if (this.contrastSettingsSaveTimer) {
      window.clearTimeout(this.contrastSettingsSaveTimer);
      this.contrastSettingsSaveTimer = null;
    }
    this.resetTerrainBaseCache();
  },

  methods: {
    loadSnapshotsIfActive() {
      if (this.editPanelTab !== "snapshots") {
        return;
      }
      this.loadSnapshots();
    },

    resetTerrainBaseCache() {
      this.terrainBaseCanvas = null;
      this.terrainBaseCacheKey = "";
    },

    shouldUseTerrainBaseCache() {
      if (this.lowMemoryMode) {
        return false;
      }
      if (this.hasActiveCivilizationOverlay || this.isPopulationOverlayActive) {
        return false;
      }
      return true;
    },

    terrainBaseLayerKey(width, height, scale) {
      return [
        width,
        height,
        Number(scale || 1).toFixed(4),
        this.hexSize,
        this.gridWidth,
        this.gridHeight,
        this.tiles.length,
        this.contrastFlattenLandWater ? 1 : 0,
        this.contrastGrayscaleTerrain ? 1 : 0,
      ].join("|");
    },

    clearSnapshotPayloadCache(validIds) {
      const source = this.snapshotPayloadCache || Object.create(null);
      if (!source || !Object.keys(source).length) {
        return;
      }
      const next = Object.create(null);
      Object.keys(source).forEach((id) => {
        if (validIds && !validIds.has(id)) {
          return;
        }
        next[id] = source[id];
      });
      this.snapshotPayloadCache = next;
    },

    async getSnapshotPayloadById(snapshotId) {
      const id = String(snapshotId || "").trim();
      if (!id) {
        return null;
      }
      if (id === "__live__") {
        if (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length) {
          this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
            this.liveOverrideLookup
          );
        }
        return this.liveSnapshotPayload || [];
      }
      if (id === "episode-0-base") {
        return this.getBaseSnapshotPayload();
      }
      const cache = this.snapshotPayloadCache || Object.create(null);
      if (Array.isArray(cache[id])) {
        return cache[id];
      }
      const currentRequests =
        this.snapshotPayloadRequests || Object.create(null);
      if (currentRequests[id]) {
        return currentRequests[id];
      }
      const snapshot = Array.isArray(this.snapshots)
        ? this.snapshots.find((entry) => entry && entry.id === id)
        : null;
      if (snapshot && Array.isArray(snapshot.payload)) {
        this.snapshotPayloadCache = {
          ...cache,
          [id]: snapshot.payload,
        };
        return snapshot.payload;
      }
      if (!this.supabase) {
        return null;
      }
      const request = (async () => {
        const { data, error } = await this.supabase
          .from(SUPABASE_SNAPSHOT_TABLE)
          .select("payload")
          .eq("map_id", SUPABASE_MAP_ID)
          .eq("id", id)
          .maybeSingle();
        if (error || !data) {
          return null;
        }
        const payload = Array.isArray(data.payload) ? data.payload : [];
        this.snapshotPayloadCache = {
          ...(this.snapshotPayloadCache || Object.create(null)),
          [id]: payload,
        };
        return payload;
      })();
      this.snapshotPayloadRequests = {
        ...currentRequests,
        [id]: request,
      };
      try {
        return await request;
      } finally {
        const nextRequests = { ...(this.snapshotPayloadRequests || {}) };
        delete nextRequests[id];
        this.snapshotPayloadRequests = nextRequests;
      }
    },
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
      if (this.tileSaveRetryTimer) {
        window.clearTimeout(this.tileSaveRetryTimer);
        this.tileSaveRetryTimer = null;
      }
    },

    handleAuthSession(session) {
      this.authUser = session ? session.user : null;
      this.restoreContrastSettingsForAuthUser();
      if (this.authUser) {
        if (!this.authEmail) {
          this.authEmail = this.authUser.email || "";
        }
        this.refreshEditPermission();
        this.updateAdminStatus();
        this.updateConnectionStatus();
        this.loadTileOverrides();
        this.subscribeToTileOverrides();
      } else {
        this.canEdit = false;
        this.isAdmin = false;
        this.ownerBrushEnabled = false;
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
      }
    },

    async signInWithEmail() {
      if (!this.supabase) {
        return;
      }
      this.updateConnectionStatus();
      const email = String(this.authEmail || "").trim();
      if (!email) {
        this.authMessage = "Enter your email to receive a login link.";
        return;
      }
      this.authLoading = true;
      this.authMessage = "";
      const isLocal = window.location.hostname === "localhost";
      const redirectBase = isLocal
        ? `${window.location.origin}${window.location.pathname}`
        : "https://civbattleroyale.tv/community-tile-map/";
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
      if (this.contrastSettingsSaveTimer) {
        window.clearTimeout(this.contrastSettingsSaveTimer);
        this.contrastSettingsSaveTimer = null;
      }
      await this.supabase.auth.signOut();
      this.authUser = null;
      this.canEdit = false;
      this.isAdmin = false;
      this.authMessage = "Signed out.";
      this.ownerBrushEnabled = false;
      this.isPaintingOwner = false;
      this.ownerBrushId = null;
    },

    handleOnline() {
      this.refreshSupabaseConnections();
    },

    refreshSupabaseConnections() {
      if (!this.supabase) {
        return;
      }
      this.lastSupabaseError = "";
      this.updateConnectionStatus();
      if (this.tileOverrideSubscription) {
        this.supabase.removeChannel(this.tileOverrideSubscription);
        this.tileOverrideSubscription = null;
      }
      this.loadTileOverrides();
      this.loadSnapshotsIfActive();
      this.subscribeToTileOverrides();
      if (this.tileSaveQueue.size) {
        this.scheduleTileSaveRetry();
      }
    },

    updateConnectionStatus() {
      if (!navigator.onLine) {
        this.authMessage = "Offline. Edits will sync when back online.";
        return;
      }
      if (this.lastSupabaseError) {
        this.authMessage = "Connection issue. Retrying to sync edits...";
      }
    },

    async updateAdminStatus() {
      if (!this.supabase || !this.authUser) {
        this.isAdmin = false;
        return;
      }
      const { data, error } = await this.supabase
        .from(SUPABASE_ADMIN_TABLE)
        .select("user_id")
        .eq("map_id", SUPABASE_MAP_ID)
        .eq("user_id", this.authUser.id)
        .maybeSingle();
      if (error) {
        this.isAdmin = false;
        return;
      }
      this.isAdmin = !!data;
      this.loadSnapshotsIfActive();
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

    async undoRecentEdits() {
      if (!this.ensureEditAccess() || !this.supabase) {
        return;
      }
      this.undoLoading = true;
      this.authMessage = "";
      const { data: sessionData } = await this.supabase.auth.getSession();
      const accessToken =
        sessionData && sessionData.session
          ? sessionData.session.access_token
          : null;
      const { data, error } = await this.supabase.functions.invoke(
        SUPABASE_UNDO_FUNCTION,
        {
          body: {
            map_id: SUPABASE_MAP_ID,
            window_seconds: 60,
          },
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        }
      );
      this.undoLoading = false;
      if (error) {
        this.authMessage = error.message || "Unable to undo edits.";
        return;
      }
      const reverted =
        data && Number.isFinite(data.reverted) ? data.reverted : 0;
      this.authMessage = reverted
        ? `Reverted ${reverted} tile${reverted === 1 ? "" : "s"}.`
        : "No recent edits to undo.";
    },

    ensureEditAccess() {
      if (this.snapshotViewId) {
        this.authMessage = "Snapshots are view-only.";
        return false;
      }
      if (this.localEditsEnabled) {
        if (REQUIRE_AUTH_FOR_LOCAL && !this.authUser) {
          this.authMessage = "Sign in to enable local edits.";
          return false;
        }
        return true;
      }
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

    setLocalEdits(enabled) {
      const nextValue = !!enabled;
      if (this.localEditsEnabled === nextValue) {
        return;
      }
      this.localEditsEnabled = nextValue;
      if (this.localEditsEnabled) {
        // this.authMessage = REQUIRE_AUTH_FOR_LOCAL
        //   ? "Local mode requires sign-in."
        //   : "Local mode: edits stay on this device only.";
      } else {
        // this.authMessage = "Local mode off. Syncing live map.";
        this.localOverrides.clear();
        this.modeSwitching = true;
        this.resetTilesToBaseState();
        const maybePromise = this.loadTileOverrides();
        if (maybePromise && typeof maybePromise.finally === "function") {
          maybePromise.finally(() => {
            this.modeSwitching = false;
          });
        } else {
          this.modeSwitching = false;
        }
      }
    },

    toggleEditPanel() {
      if (this.isMobileView) {
        return;
      }
      this.editPanelCollapsed = !this.editPanelCollapsed;
    },

    ensureEditPanelTab() {
      if (!this.showNotesTab && this.editPanelTab === "notes") {
        this.editPanelTab = "edit";
      }
    },

    resetTilesToBaseState() {
      if (!Array.isArray(this.tiles) || !this.tiles.length) {
        return;
      }
      let needsBorderRebuild = false;
      this.tiles.forEach((tile) => {
        const ownerChanged = this.applyTileOverride(tile, { __clear: true });
        if (ownerChanged) {
          needsBorderRebuild = true;
        }
      });
      if (needsBorderRebuild) {
        this.scheduleOwnerBordersRebuild();
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
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
        this.editRuins = !!tile.ruins;
        this.editTileNotes = tile.notes || "";
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
        this.editRuins = false;
        this.editTileNotes = "";
      }
    },

    async loadTileOverrides() {
      if (!this.supabase) {
        return;
      }
      try {
        const pageSize = 1000;
        const allRows = [];
        let page = 0;
        while (page < 50) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          let query = this.supabase
            .from(SUPABASE_OVERRIDE_TABLE)
            .select("tile_key,payload")
            .eq("map_id", SUPABASE_MAP_ID)
            .order("tile_key", { ascending: true });
          if (!this.forceLegacyOverrideConflict) {
            if (this.liveBaseSnapshotId) {
              query = query.eq("snapshot_id", this.liveBaseSnapshotId);
            } else {
              query = query.is("snapshot_id", null);
            }
          }
          const { data, error } = await query.range(from, to);
          if (error || !Array.isArray(data)) {
            return;
          }
          if (!data.length) {
            break;
          }
          allRows.push(...data);
          if (data.length < pageSize) {
            break;
          }
          page += 1;
        }
        const filtered = ENABLE_OVERRIDE_CLEANUP
          ? this.filterOverrideRows(allRows)
          : allRows;
        this.liveOverrideLookup = buildSnapshotLookup(filtered);
        this.liveSnapshotPayload = [];
        if (!this.snapshotViewId) {
          this.applyTileOverrides(filtered, { markRecent: false });
        }
      } finally {
        this.hasLoadedOverrides = true;
      }
    },

    async loadSnapshots() {
      if (!this.supabase) {
        return;
      }
      this.snapshotLoading = true;
      let query = this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .select("id,episode_label,episode_at,created_at,is_published")
        .eq("map_id", SUPABASE_MAP_ID);
      if (!this.isAdmin) {
        query = query.eq("is_published", true);
      }
      const { data, error } = await query.order("episode_at", {
        ascending: false,
      });
      this.snapshotLoading = false;
      if (error || !Array.isArray(data)) {
        return;
      }
      this.snapshots = this.withBaseSnapshot(data);
      this.clearSnapshotPayloadCache(
        new Set((this.snapshots || []).map((snapshot) => snapshot.id))
      );
      if (
        this.snapshotViewId &&
        !this.snapshots.find((snapshot) => snapshot.id === this.snapshotViewId)
      ) {
        this.snapshotViewId = "";
      }
      if (
        this.snapshotCompareId &&
        !this.snapshots.find(
          (snapshot) => snapshot.id === this.snapshotCompareId
        )
      ) {
        this.snapshotCompareId = "";
      }
    },

    async loadLiveBaseSnapshot() {
      if (!this.supabase) {
        return;
      }
      const { data, error } = await this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .select("id,episode_label,episode_at,created_at,payload,is_published")
        .eq("map_id", SUPABASE_MAP_ID)
        .eq("is_published", true)
        .order("episode_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (error || !Array.isArray(data) || !data.length) {
        this.liveBaseSnapshotId = null;
        this.liveBaseSnapshotPayload = null;
        return;
      }
      const snapshot = data[0];
      this.liveBaseSnapshotId = snapshot.id || null;
      this.liveBaseSnapshotPayload = Array.isArray(snapshot.payload)
        ? snapshot.payload
        : null;
    },

    applyLiveBaseSnapshot() {
      if (
        !this.liveBaseSnapshotPayload ||
        !this.liveBaseSnapshotPayload.length
      ) {
        return;
      }
      this.resetTilesToBaseState();
      this.applyTileOverrides(this.liveBaseSnapshotPayload, {
        markRecent: false,
        applyLocal: false,
      });
      if (Array.isArray(this.tiles) && this.tiles.length) {
        this.tiles.forEach((tile) => {
          tile.baseState = buildBaseState(tile);
        });
      }
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
      this.liveOverrideLookup = {};
      this.liveSnapshotPayload = [];
    },

    withBaseSnapshot(rows) {
      const snapshots = Array.isArray(rows) ? [...rows] : [];
      if (!Array.isArray(this.tiles) || !this.tiles.length) {
        return snapshots;
      }
      const existingBase = snapshots.find(
        (snapshot) => snapshot.id === "episode-0-base"
      );
      if (existingBase) {
        return snapshots;
      }
      snapshots.push({
        id: "episode-0-base",
        map_id: SUPABASE_MAP_ID,
        episode_label: "Episode 0 Snapshot",
        episode_at: null,
        created_at: null,
        is_published: true,
        is_virtual: true,
      });
      return snapshots;
    },

    getBaseSnapshotPayload() {
      if (this.baseSnapshotPayload) {
        return this.baseSnapshotPayload;
      }
      if (!Array.isArray(this.tiles) || !this.tiles.length) {
        return [];
      }
      const payload = this.tiles.map((tile) => ({
        tile_key: tile.key,
        payload: this.buildBaseSnapshotPayload(tile),
      }));
      this.baseSnapshotPayload = payload;
      return payload;
    },

    buildBaseSnapshotPayload(tile) {
      const base =
        tile && (tile.baseStateOriginal || tile.baseState)
          ? tile.baseStateOriginal || tile.baseState
          : null;
      if (!base) {
        return this.buildTileOverridePayload(tile);
      }
      return {
        owner: Number.isFinite(base.owner) ? base.owner : null,
        originalOwner: Number.isFinite(base.originalOwner)
          ? base.originalOwner
          : null,
        notes: base.notes ? String(base.notes) : null,
        pillaged: !!base.pillaged,
        ruins: !!base.ruins,
        citadel:
          !!base.improvement &&
          isCitadelImprovement({ improvement: base.improvement }),
        combatUnit: base.combatUnit ? { ...base.combatUnit } : null,
        civilianUnit: base.civilianUnit ? { ...base.civilianUnit } : null,
        city: base.city ? { ...base.city } : null,
      };
    },

    async applySnapshotView() {
      const requestId = this.snapshotApplyRequestId + 1;
      this.snapshotApplyRequestId = requestId;
      if (!this.snapshotViewId) {
        this.restoreLiveView();
        return;
      }
      if (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length) {
        this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
          this.liveOverrideLookup
        );
      }
      const payload = await this.getSnapshotPayloadById(this.snapshotViewId);
      if (this.snapshotApplyRequestId !== requestId) {
        return;
      }
      if (!Array.isArray(payload)) {
        return;
      }
      this.resetTilesToBaseState();
      this.applyTileOverrides(payload, {
        markRecent: false,
        applyLocal: false,
      });
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    restoreLiveView() {
      this.resetTilesToBaseState();
      this.loadTileOverrides();
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
      this.snapshotDiffLookup = {};
      this.snapshotDiffList = [];
    },

    async computeSnapshotDiffs() {
      const requestId = this.snapshotDiffRequestId + 1;
      this.snapshotDiffRequestId = requestId;
      if (!this.snapshotViewId || !this.snapshotCompareId) {
        this.snapshotDiffLookup = {};
        this.snapshotDiffList = [];
        this.snapshotDiffSummary = { owner: 0, city: 0, units: 0, other: 0 };
        this.snapshotCityChanges = { founded: [], captured: [], removed: [] };
        return;
      }
      if (
        this.snapshotCompareId === "__live__" &&
        (!this.liveSnapshotPayload || !this.liveSnapshotPayload.length)
      ) {
        this.liveSnapshotPayload = this.buildLiveSnapshotPayload(
          this.liveOverrideLookup
        );
      }
      const viewPayload = await this.getSnapshotPayloadById(
        this.snapshotViewId
      );
      const comparePayload = await this.getSnapshotPayloadById(
        this.snapshotCompareId
      );
      if (this.snapshotDiffRequestId !== requestId) {
        return;
      }
      if (!Array.isArray(viewPayload) || !Array.isArray(comparePayload)) {
        this.snapshotDiffLookup = {};
        this.snapshotDiffList = [];
        this.snapshotDiffSummary = { owner: 0, city: 0, units: 0, other: 0 };
        this.snapshotCityChanges = { founded: [], captured: [], removed: [] };
        return;
      }
      const viewLookup = buildSnapshotLookup(viewPayload);
      const compareLookup = buildSnapshotLookup(comparePayload);
      const keys = new Set([
        ...Object.keys(viewLookup),
        ...Object.keys(compareLookup),
      ]);
      const diffLookup = {};
      const diffList = [];
      const summary = { owner: 0, city: 0, units: 0, other: 0 };
      keys.forEach((key) => {
        const a = viewLookup[key] || null;
        const b = compareLookup[key] || null;
        if (!snapshotPayloadEqual(a, b)) {
          diffLookup[key] = true;
          const ownerChanged = (a && a.owner) !== (b && b.owner);
          const cityChanged = !snapshotValueEqual(
            a ? a.city : null,
            b ? b.city : null
          );
          const unitsChanged =
            !snapshotValueEqual(
              a ? a.combatUnit : null,
              b ? b.combatUnit : null
            ) ||
            !snapshotValueEqual(
              a ? a.civilianUnit : null,
              b ? b.civilianUnit : null
            );
          if (ownerChanged) {
            summary.owner += 1;
          }
          if (cityChanged) {
            summary.city += 1;
          }
          if (unitsChanged) {
            summary.units += 1;
          }
          if (!ownerChanged && !cityChanged && !unitsChanged) {
            summary.other += 1;
          }
          diffList.push({ key, from: a, to: b });
        }
      });
      const cityChanges = buildCityChangeSummary(compareLookup, viewLookup);
      summary.city =
        cityChanges.founded.length +
        cityChanges.captured.length +
        cityChanges.removed.length;
      this.snapshotDiffLookup = diffLookup;
      this.snapshotDiffList = diffList;
      this.snapshotDiffSummary = summary;
      this.snapshotCityChanges = cityChanges;
    },

    buildLiveSnapshotPayload(overrideLookup) {
      if (!Array.isArray(this.tiles) || !this.tiles.length) {
        return [];
      }
      return this.tiles.map((tile) => ({
        tile_key: tile.key,
        payload: this.buildFullPayloadFromBase(
          tile.baseState,
          overrideLookup ? overrideLookup[tile.key] : null
        ),
      }));
    },

    buildFullPayloadFromBase(baseState, overridePayload) {
      const base = baseState || {};
      const payload = overridePayload || {};
      return {
        owner: Object.prototype.hasOwnProperty.call(payload, "owner")
          ? payload.owner
          : base.owner ?? null,
        originalOwner: Object.prototype.hasOwnProperty.call(
          payload,
          "originalOwner"
        )
          ? payload.originalOwner
          : base.originalOwner ?? null,
        notes: Object.prototype.hasOwnProperty.call(payload, "notes")
          ? payload.notes
          : base.notes || null,
        pillaged: Object.prototype.hasOwnProperty.call(payload, "pillaged")
          ? !!payload.pillaged
          : !!base.pillaged,
        ruins: Object.prototype.hasOwnProperty.call(payload, "ruins")
          ? !!payload.ruins
          : !!base.ruins,
        citadel: Object.prototype.hasOwnProperty.call(payload, "citadel")
          ? !!payload.citadel
          : !!base.improvement &&
            isCitadelImprovement({ improvement: base.improvement }),
        combatUnit: Object.prototype.hasOwnProperty.call(payload, "combatUnit")
          ? payload.combatUnit
          : base.combatUnit || null,
        civilianUnit: Object.prototype.hasOwnProperty.call(
          payload,
          "civilianUnit"
        )
          ? payload.civilianUnit
          : base.civilianUnit || null,
        city: Object.prototype.hasOwnProperty.call(payload, "city")
          ? payload.city
          : base.city || null,
      };
    },

    snapshotCityLabel(entry) {
      if (!entry) {
        return "";
      }
      const owner = Number.isFinite(entry.owner)
        ? this.ownerLabel(entry.owner)
        : "Unknown";
      const original = Number.isFinite(entry.originalOwner)
        ? this.ownerLabel(entry.originalOwner)
        : null;
      const suffix = original ? ` (was ${original})` : "";
      return `${entry.name} @ ${entry.key} \u2014 ${owner}${suffix}`;
    },

    formatSnapshotLabel(snapshot) {
      if (!snapshot) {
        return "Snapshot";
      }
      const label = snapshot.episode_label || "Snapshot";
      // const date = snapshot.episode_at
      //   ? this.formatSnapshotDate(snapshot.episode_at)
      //   : null;
      // const base = date ? `${label} \u2014 ${date}` : label;
      const base = label;
      if (this.isAdmin && snapshot.is_published === false) {
        return `${base} (Unpublished)`;
      }
      return base;
    },

    formatSnapshotDate(value) {
      try {
        const date = new Date(value);
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false,
        });
      } catch (error) {
        return String(value);
      }
    },

    parseUtcDateTimeInput(value) {
      if (!value) {
        return null;
      }
      const normalized = value.includes("Z")
        ? value
        : `${value}:00Z`.replace("T", "T");
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString();
    },

    async saveSnapshot() {
      if (!this.supabase || !this.isAdmin) {
        return;
      }
      const number = String(this.snapshotEpisodeNumber || "").trim();
      if (!number) {
        this.snapshotMessage = "Enter an episode number.";
        return;
      }
      const episodeLabel = `Episode ${number} Snapshot`;
      const episodeAt =
        this.parseUtcDateTimeInput(this.snapshotEpisodeAt) ||
        new Date().toISOString();
      const payload = this.tiles.map((tile) => ({
        tile_key: tile.key,
        payload: this.buildTileOverridePayload(tile),
      }));
      this.snapshotSaving = true;
      this.snapshotMessage = "";
      const { error } = await this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .insert([
          {
            map_id: SUPABASE_MAP_ID,
            episode_label: episodeLabel,
            episode_at: episodeAt,
            payload,
            created_by: this.authUser ? this.authUser.id : null,
            is_published: true,
          },
        ]);
      this.snapshotSaving = false;
      if (error) {
        this.snapshotMessage = "Unable to save snapshot.";
        return;
      }
      this.snapshotEpisodeNumber = "";
      this.snapshotEpisodeAt = "";
      this.snapshotMessage = "Snapshot saved.";
      await this.loadSnapshots();
    },

    async toggleSnapshotPublish(snapshot) {
      if (!this.supabase || !this.isAdmin || !snapshot) {
        return;
      }
      this.snapshotPublishLoadingId = snapshot.id;
      const nextValue = !snapshot.is_published;
      const { error } = await this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .update({ is_published: nextValue })
        .eq("id", snapshot.id);
      this.snapshotPublishLoadingId = null;
      if (error) {
        this.snapshotMessage = "Unable to update publish status.";
        return;
      }
      this.snapshotMessage = nextValue
        ? "Snapshot published."
        : "Snapshot unpublished.";
      await this.loadSnapshots();
    },

    async publishSnapshotAndClearOverrides(snapshot) {
      if (!this.supabase || !this.isAdmin || !snapshot) {
        return;
      }
      if (snapshot.is_virtual) {
        return;
      }
      const previousSnapshotId = this.liveBaseSnapshotId || null;
      this.snapshotResetLoadingId = snapshot.id;
      const { error: publishError } = await this.supabase
        .from(SUPABASE_SNAPSHOT_TABLE)
        .update({ is_published: true })
        .eq("id", snapshot.id);
      if (publishError) {
        this.snapshotMessage = "Unable to publish snapshot.";
        this.snapshotResetLoadingId = null;
        return;
      }
      if (previousSnapshotId !== snapshot.id) {
        let deleteQuery = this.supabase
          .from(SUPABASE_OVERRIDE_TABLE)
          .delete()
          .eq("map_id", SUPABASE_MAP_ID);
        if (previousSnapshotId) {
          deleteQuery = deleteQuery.eq("snapshot_id", previousSnapshotId);
        } else {
          deleteQuery = deleteQuery.is("snapshot_id", null);
        }
        const { error: deleteError } = await deleteQuery;
        if (deleteError) {
          this.snapshotMessage =
            "Snapshot published, but overrides could not be cleared.";
          this.snapshotResetLoadingId = null;
          await this.loadSnapshots();
          return;
        }
      }
      await this.loadSnapshots();
      await this.loadLiveBaseSnapshot();
      this.applyLiveBaseSnapshot();
      this.loadTileOverrides();
      this.snapshotMessage = "Snapshot published and overrides cleared.";
      this.snapshotResetLoadingId = null;
    },

    applyTileOverrides(rows, options = {}) {
      if (!this.tileLookup || !Array.isArray(rows) || !rows.length) {
        return;
      }
      const { markRecent = false, applyLocal = true } = options;
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
        if (markRecent) {
          this.markTileRecentlyEdited(tile);
        }
        if (
          applyLocal &&
          this.localEditsEnabled &&
          this.localOverrides.has(tileKey)
        ) {
          const localPayload = this.localOverrides.get(tileKey);
          if (localPayload) {
            const localChanged = this.applyTileOverride(tile, localPayload);
            if (localChanged) {
              needsBorderRebuild = true;
            }
          }
        }
      });
      if (needsBorderRebuild) {
        this.scheduleOwnerBordersRebuild();
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
      if (payload.__clear && tile.baseState) {
        const base = tile.baseState;
        const ownerChanged = tile.owner !== base.owner;
        tile.owner = Number.isFinite(base.owner) ? base.owner : null;
        tile.customOwner = false;
        tile.originalOwner = Number.isFinite(base.originalOwner)
          ? base.originalOwner
          : null;
        tile.customOriginalOwner = false;
        tile.pillaged = !!base.pillaged;
        tile.ruins = !!base.ruins;
        tile.improvement = base.improvement || null;
        tile.improvementId = base.improvementId || "";
        tile.improvementColor = base.improvementColor || null;
        tile.notes = base.notes || null;
        tile.combatUnit = cloneUnit(base.combatUnit);
        tile.civilianUnit = cloneUnit(base.civilianUnit);
        tile.city = cloneCity(base.city);
        if (Number.isFinite(tile.owner)) {
          this.ensureOwnerColors(tile.owner);
        }
        if (tile.city && Number.isFinite(tile.city.owner)) {
          this.ensureOwnerColors(tile.city.owner);
        }
        if (tile.combatUnit && Number.isFinite(tile.combatUnit.owner)) {
          this.ensureOwnerColors(tile.combatUnit.owner);
        }
        if (tile.civilianUnit && Number.isFinite(tile.civilianUnit.owner)) {
          this.ensureOwnerColors(tile.civilianUnit.owner);
        }
        if (this.selectedTile && this.selectedTile.key === tile.key) {
          this.syncEditFieldsFromTile(tile);
        }
        return ownerChanged;
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
        this.syncCityOwnerWithTileOwner(tile);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "originalOwner")) {
        const nextOriginal = Number.isFinite(payload.originalOwner)
          ? payload.originalOwner
          : null;
        tile.originalOwner = nextOriginal;
        tile.customOriginalOwner = Number.isFinite(nextOriginal);
      }
      if (
        tile.city &&
        Number.isFinite(tile.owner) &&
        !Number.isFinite(tile.originalOwner)
      ) {
        tile.originalOwner = tile.owner;
        tile.customOriginalOwner = false;
      }
      if (Object.prototype.hasOwnProperty.call(payload, "pillaged")) {
        tile.pillaged = !!payload.pillaged;
      }
      if (Object.prototype.hasOwnProperty.call(payload, "ruins")) {
        tile.ruins = !!payload.ruins;
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
      if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
        const nextNotes = payload.notes ? String(payload.notes).trim() : "";
        tile.notes = nextNotes || null;
        this.invalidateTooltipCache(tile.key);
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
        notes: tile.notes ? String(tile.notes) : null,
        pillaged: !!tile.pillaged,
        ruins: !!tile.ruins,
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

    buildTileOverrideDiff(tile) {
      if (!tile) {
        return null;
      }
      const current = this.buildTileOverridePayload(tile);
      if (!tile.baseState) {
        return current;
      }
      const base = this.buildFullPayloadFromBase(tile.baseState, null);
      const diff = {};
      Object.keys(current).forEach((key) => {
        if (!snapshotValueEqual(current[key], base[key])) {
          diff[key] = current[key];
        }
      });
      return Object.keys(diff).length ? diff : null;
    },

    filterOverrideRows(rows) {
      if (!Array.isArray(rows)) {
        return [];
      }
      if (!this.tileLookup) {
        return rows;
      }
      const filtered = [];
      const deleteKeys = [];
      rows.forEach((row) => {
        const key = row.tile_key || row.tileKey;
        if (!key) {
          return;
        }
        const tile = this.tileLookup.get(key);
        if (!tile || !tile.baseState) {
          filtered.push(row);
          return;
        }
        const basePayload = this.buildFullPayloadFromBase(tile.baseState, null);
        const mergedPayload = this.buildFullPayloadFromBase(
          tile.baseState,
          row.payload || null
        );
        if (snapshotValueEqual(mergedPayload, basePayload)) {
          deleteKeys.push(key);
          return;
        }
        filtered.push(row);
      });
      if (ENABLE_OVERRIDE_CLEANUP && deleteKeys.length) {
        // Cleanup currently disabled; left as a hook for future use.
      }
      return filtered;
    },

    queueTileSave(tile) {
      if (this.snapshotViewId) {
        return;
      }
      if (this.modeSwitching) {
        return;
      }
      if (!this.supabase || !this.canEdit || !tile) {
        if (this.localEditsEnabled && tile) {
          const payload = this.buildTileOverrideDiff(tile);
          if (payload) {
            this.localOverrides.set(tile.key, payload);
          } else {
            this.localOverrides.delete(tile.key);
          }
          this.markTileRecentlyEdited(tile);
        }
        return;
      }
      if (this.localEditsEnabled) {
        const payload = this.buildTileOverrideDiff(tile);
        if (payload) {
          this.localOverrides.set(tile.key, payload);
        } else {
          this.localOverrides.delete(tile.key);
        }
        this.markTileRecentlyEdited(tile);
        return;
      }
      const payload = this.buildTileOverridePayload(tile);
      this.tileSaveQueue.set(tile.key, {
        tile_key: tile.key,
        payload,
      });
      this.markTileRecentlyEdited(tile);
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
        snapshot_id: this.liveBaseSnapshotId || null,
        updated_at: now,
        updated_by: this.authUser ? this.authUser.id : null,
      }));
      this.tileSaveTimer = null;
      let upsertError = null;
      if (rows.length) {
        const useSnapshotConflict =
          this.liveBaseSnapshotId && !this.forceLegacyOverrideConflict;
        const conflictTarget = useSnapshotConflict
          ? "map_id,snapshot_id,tile_key"
          : "map_id,tile_key";
        const { error } = await this.supabase
          .from(SUPABASE_OVERRIDE_TABLE)
          .upsert(rows, {
            onConflict: conflictTarget,
          });
        upsertError = error;
        if (
          upsertError &&
          useSnapshotConflict &&
          this.isSnapshotConflictError(upsertError)
        ) {
          const fallback = await this.supabase
            .from(SUPABASE_OVERRIDE_TABLE)
            .upsert(rows, {
              onConflict: "map_id,tile_key",
            });
          if (!fallback.error) {
            this.forceLegacyOverrideConflict = true;
          }
          upsertError = fallback.error;
        }
      }
      if (upsertError) {
        const message = upsertError.message || "Unable to sync edits.";
        this.lastSupabaseError = message;
        this.authMessage = "Unable to sync edits. Retrying...";
        this.scheduleTileSaveRetry();
        return;
      }
      this.lastSupabaseError = "";
      this.updateConnectionStatus();
      this.tileSaveQueue.clear();
      this.tileSaveRetryCount = 0;
      if (rows.length) {
        const logRows = rows.map((row) => ({
          map_id: row.map_id,
          tile_key: row.tile_key,
          payload: row.payload,
          edited_by: row.updated_by,
          edited_at: now,
        }));
        await this.supabase.from(SUPABASE_EDIT_LOG_TABLE).insert(logRows);
      }
    },

    scheduleTileSaveRetry() {
      if (this.tileSaveRetryTimer) {
        return;
      }
      const retryDelay = Math.min(8000, 1000 * (this.tileSaveRetryCount + 1));
      this.tileSaveRetryTimer = window.setTimeout(() => {
        this.tileSaveRetryTimer = null;
        this.tileSaveRetryCount += 1;
        this.flushTileSaves();
      }, retryDelay);
    },

    isSnapshotConflictError(error) {
      if (!error) {
        return false;
      }
      const code = String(error.code || "");
      if (code === "23505") {
        return true;
      }
      const message = String(error.message || "").toLowerCase();
      return message.includes("tile_overrides_pkey");
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
            if (this.snapshotViewId) {
              return;
            }
            const record = payload.new || payload.old;
            if (!record || !this.tileLookup) {
              return;
            }
            const expectedSnapshotId = this.liveBaseSnapshotId || null;
            const recordSnapshotId = Object.prototype.hasOwnProperty.call(
              record,
              "snapshot_id"
            )
              ? record.snapshot_id
              : null;
            if (
              !this.forceLegacyOverrideConflict &&
              recordSnapshotId !== expectedSnapshotId
            ) {
              return;
            }
            this.applyTileOverrides([record], {
              markRecent: this.hasLoadedOverrides,
            });
          }
        )
        .subscribe();
    },

    async parseMapBuffer(buffer) {
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error("Unable to parse map data.");
      }
      if (typeof window === "undefined" || typeof Worker === "undefined") {
        return parseCiv5Map(buffer);
      }
      const workerPath = this.$withBase
        ? this.$withBase("/community/civ5map-parser-worker.js")
        : "/community/civ5map-parser-worker.js";
      if (!workerPath) {
        return parseCiv5Map(buffer);
      }
      let worker = null;
      try {
        worker = new Worker(workerPath);
      } catch (error) {
        return parseCiv5Map(buffer);
      }
      try {
        return await new Promise((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            if (worker) {
              worker.onmessage = null;
              worker.onerror = null;
              worker.terminate();
              worker = null;
            }
          };
          const finalize = (fn) => {
            if (settled) {
              return;
            }
            settled = true;
            cleanup();
            fn();
          };
          worker.onmessage = (event) => {
            const payload = event && event.data ? event.data : {};
            if (!payload || payload.ok === false || !payload.result) {
              const message =
                (payload && payload.error) || "Unable to parse map data.";
              finalize(() => reject(new Error(message)));
              return;
            }
            finalize(() => resolve(payload.result));
          };
          worker.onerror = () => {
            finalize(() => reject(new Error("Unable to parse map data.")));
          };
          try {
            worker.postMessage({ buffer });
          } catch (error) {
            finalize(() => reject(error));
          }
        });
      } catch (error) {
        return parseCiv5Map(buffer);
      }
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
          mapData = await this.parseMapBuffer(buffer);
        }
        const stateData = await this.loadJson(this.mapConfig.stateCacheUrl);
        await this.applyMapData(mapData, stateData);
        if (
          Array.isArray(this.snapshotPayload) &&
          this.snapshotPayload.length
        ) {
          this.applyTileOverrides(this.snapshotPayload, {
            markRecent: false,
            applyLocal: false,
          });
        } else if (this.useBaseSnapshot) {
          const payload = this.getBaseSnapshotPayload();
          if (payload && payload.length) {
            this.applyTileOverrides(payload, {
              markRecent: false,
              applyLocal: false,
            });
          }
        }
      } catch (error) {
        this.loadError = error.message || "Unable to load map data.";
      } finally {
        this.isLoading = false;
        this.$nextTick(() => {
          this.updateViewportSize();
          this.fitToView();
          this.applyRequestedTileFromRoute();
        });
      }
    },

    normalizeMapPinName(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    },

    mapPinLabel(pin) {
      if (!pin) {
        return "";
      }
      const parts = [];
      if (pin.cityName) {
        parts.push(pin.cityName);
      } else if (pin.ownerName) {
        parts.push(pin.ownerName);
      }
      if (pin.tileKey) {
        parts.push(`Tile ${pin.tileKey}`);
      }
      return parts.join(" · ");
    },

    sanitizeStoredMapPin(entry) {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const name = String(entry.name || "").trim();
      const nameKey = this.normalizeMapPinName(name);
      if (!name || !nameKey) {
        return null;
      }
      const tileKey = this.parseTileKeyFromInput(entry.tileKey || entry.tile);
      const cityName = this.parseCityNameFromInput(entry.cityName);
      const ownerName = this.parseOwnerNameFromInput(entry.ownerName);
      if (!tileKey && !cityName && !ownerName) {
        return null;
      }
      return {
        name,
        nameKey,
        tileKey,
        cityName,
        ownerName,
        updatedAt: Number(entry.updatedAt) || Date.now(),
      };
    },

    readMapPinsFromStorage() {
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
        const seen = new Set();
        return parsed
          .map((entry) => this.sanitizeStoredMapPin(entry))
          .filter((entry) => {
            if (!entry || seen.has(entry.nameKey)) {
              return false;
            }
            seen.add(entry.nameKey);
            return true;
          })
          .sort((a, b) => {
            if ((b.updatedAt || 0) !== (a.updatedAt || 0)) {
              return (b.updatedAt || 0) - (a.updatedAt || 0);
            }
            return a.name.localeCompare(b.name, "en");
          })
          .map((entry) => ({
            ...entry,
            label: this.mapPinLabel(entry),
          }));
      } catch (error) {
        return [];
      }
    },

    handleMapPinStorageChange(event) {
      if (!event || event.key !== MAP_PINS_STORAGE_KEY) {
        return;
      }
      this.loadMapPins();
    },

    notifyMapPinsUpdated() {
      if (typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new CustomEvent("community-map-pins-updated"));
    },

    loadMapPins() {
      this.mapPins = this.readMapPinsFromStorage();
    },

    setMapPinStatus(message) {
      this.mapPinStatus = String(message || "").trim();
      if (this.mapPinStatusTimer) {
        window.clearTimeout(this.mapPinStatusTimer);
        this.mapPinStatusTimer = null;
      }
      if (!this.mapPinStatus) {
        return;
      }
      this.mapPinStatusTimer = window.setTimeout(() => {
        this.mapPinStatus = "";
        this.mapPinStatusTimer = null;
      }, 2600);
    },

    persistMapPins(pins) {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      try {
        const storedPins = Array.isArray(pins)
          ? pins.map((pin) => ({
              name: pin.name,
              tileKey: pin.tileKey || "",
              cityName: pin.cityName || "",
              ownerName: pin.ownerName || "",
              updatedAt: pin.updatedAt || Date.now(),
            }))
          : [];
        window.localStorage.setItem(
          MAP_PINS_STORAGE_KEY,
          JSON.stringify(storedPins)
        );
        this.loadMapPins();
        this.notifyMapPinsUpdated();
        return true;
      } catch (error) {
        return false;
      }
    },

    contrastSettingsStorageKeyForUser(userId) {
      const id = String(userId || "").trim();
      if (!id) {
        return "";
      }
      return `${MAP_CONTRAST_SETTINGS_KEY}:${SUPABASE_MAP_ID}:${id}`;
    },

    currentContrastSettings() {
      return {
        contrastHideDecorations: !!this.contrastHideDecorations,
        contrastFlattenLandWater: !!this.contrastFlattenLandWater,
        contrastGrayscaleTerrain: !!this.contrastGrayscaleTerrain,
        contrastBoostOwnerOpacity: !!this.contrastBoostOwnerOpacity,
        contrastLargeCityBanners: !!this.contrastLargeCityBanners,
      };
    },

    toCloudContrastSettings(settings) {
      const source =
        settings && typeof settings === "object"
          ? settings
          : this.currentContrastSettings();
      return {
        [MAP_CONTRAST_CLOUD_KEYS.contrastHideDecorations]:
          !!source.contrastHideDecorations,
        [MAP_CONTRAST_CLOUD_KEYS.contrastFlattenLandWater]:
          !!source.contrastFlattenLandWater,
        [MAP_CONTRAST_CLOUD_KEYS.contrastGrayscaleTerrain]:
          !!source.contrastGrayscaleTerrain,
        [MAP_CONTRAST_CLOUD_KEYS.contrastBoostOwnerOpacity]:
          !!source.contrastBoostOwnerOpacity,
        [MAP_CONTRAST_CLOUD_KEYS.contrastLargeCityBanners]:
          !!source.contrastLargeCityBanners,
      };
    },

    fromCloudContrastSettings(settings) {
      if (!settings || typeof settings !== "object") {
        return { values: null, hasAny: false };
      }
      const values = {};
      let hasAny = false;
      Object.keys(MAP_CONTRAST_CLOUD_KEYS).forEach((localKey) => {
        const cloudKey = MAP_CONTRAST_CLOUD_KEYS[localKey];
        if (Object.prototype.hasOwnProperty.call(settings, cloudKey)) {
          values[localKey] = !!settings[cloudKey];
          hasAny = true;
        }
      });
      return { values: hasAny ? values : null, hasAny };
    },

    applyContrastSettings(settings) {
      const source =
        settings && typeof settings === "object"
          ? settings
          : Object.create(null);
      this.contrastSettingsLoading = true;
      this.contrastHideDecorations = !!source.contrastHideDecorations;
      this.contrastFlattenLandWater = !!source.contrastFlattenLandWater;
      this.contrastGrayscaleTerrain = !!source.contrastGrayscaleTerrain;
      this.contrastBoostOwnerOpacity = !!source.contrastBoostOwnerOpacity;
      this.contrastLargeCityBanners = !!source.contrastLargeCityBanners;
      this.$nextTick(() => {
        this.contrastSettingsLoading = false;
      });
    },

    readLocalContrastSettingsForAuthUser() {
      if (
        typeof window === "undefined" ||
        !window.localStorage ||
        !this.authUser ||
        !this.authUser.id
      ) {
        return null;
      }
      const key = this.contrastSettingsStorageKeyForUser(this.authUser.id);
      if (!key) {
        return null;
      }
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (error) {
        return null;
      }
    },

    writeLocalContrastSettingsForAuthUser(settings) {
      if (
        typeof window === "undefined" ||
        !window.localStorage ||
        !this.authUser ||
        !this.authUser.id
      ) {
        return false;
      }
      const key = this.contrastSettingsStorageKeyForUser(this.authUser.id);
      if (!key) {
        return false;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(settings));
        return true;
      } catch (error) {
        return false;
      }
    },

    restoreContrastSettingsForAuthUser() {
      if (!this.supabase || !this.authUser || !this.authUser.id) {
        return;
      }
      if (this.contrastSettingsSyncing) {
        return;
      }
      this.contrastSettingsSyncing = true;
      (async () => {
        let didApplyCloud = false;
        try {
          const { data, error } = await this.supabase
            .from(SUPABASE_USER_SETTINGS_TABLE)
            .select("settings")
            .eq("user_id", this.authUser.id)
            .maybeSingle();
          if (!error) {
            const cloudSettings =
              data && data.settings && typeof data.settings === "object"
                ? data.settings
                : {};
            const mapped = this.fromCloudContrastSettings(cloudSettings);
            if (mapped.hasAny && mapped.values) {
              this.applyContrastSettings(mapped.values);
              this.writeLocalContrastSettingsForAuthUser(mapped.values);
              didApplyCloud = true;
            } else {
              const localFallback = this.readLocalContrastSettingsForAuthUser();
              if (localFallback) {
                this.applyContrastSettings(localFallback);
                const merged = {
                  ...cloudSettings,
                  ...this.toCloudContrastSettings(localFallback),
                };
                await this.supabase
                  .from(SUPABASE_USER_SETTINGS_TABLE)
                  .upsert(
                    { user_id: this.authUser.id, settings: merged },
                    { onConflict: "user_id" }
                  );
              }
            }
          }
        } catch (error) {
          // Fall back to local settings only when cloud read fails.
        }
        if (!didApplyCloud) {
          const localFallback = this.readLocalContrastSettingsForAuthUser();
          if (localFallback) {
            this.applyContrastSettings(localFallback);
          }
        }
      })().finally(() => {
        this.contrastSettingsSyncing = false;
      });
    },

    queueContrastSettingsCloudSave() {
      if (
        typeof window === "undefined" ||
        !this.supabase ||
        !this.authUser ||
        !this.authUser.id
      ) {
        return;
      }
      if (this.contrastSettingsSaveTimer) {
        window.clearTimeout(this.contrastSettingsSaveTimer);
      }
      this.contrastSettingsSaveTimer = window.setTimeout(() => {
        this.contrastSettingsSaveTimer = null;
        this.persistContrastSettingsToCloud();
      }, 250);
    },

    async persistContrastSettingsToCloud() {
      if (!this.supabase || !this.authUser || !this.authUser.id) {
        return false;
      }
      try {
        const { data, error } = await this.supabase
          .from(SUPABASE_USER_SETTINGS_TABLE)
          .select("settings")
          .eq("user_id", this.authUser.id)
          .maybeSingle();
        if (error) {
          return false;
        }
        const existing =
          data && data.settings && typeof data.settings === "object"
            ? data.settings
            : {};
        const merged = {
          ...existing,
          ...this.toCloudContrastSettings(this.currentContrastSettings()),
        };
        const { error: upsertError } = await this.supabase
          .from(SUPABASE_USER_SETTINGS_TABLE)
          .upsert(
            {
              user_id: this.authUser.id,
              settings: merged,
            },
            { onConflict: "user_id" }
          );
        return !upsertError;
      } catch (error) {
        return false;
      }
    },

    persistContrastSettingsForAuthUser() {
      if (this.contrastSettingsLoading || !this.authUser || !this.authUser.id) {
        return false;
      }
      const savedLocal = this.writeLocalContrastSettingsForAuthUser(
        this.currentContrastSettings()
      );
      this.queueContrastSettingsCloudSave();
      return savedLocal;
    },

    pinPayloadFromSelectedTile(name) {
      if (!this.selectedTile || !name) {
        return null;
      }
      const tile = this.selectedTile;
      const tileKey = this.parseTileKeyFromInput(tile.key);
      if (!tileKey) {
        return null;
      }
      const cityName =
        tile && tile.city && tile.city.name
          ? String(tile.city.name).trim()
          : "";
      const ownerId = tile.city ? this.ownerIdForCity(tile) : tile.owner;
      const ownerName = Number.isFinite(ownerId) ? ownerNameForId(ownerId) : "";
      const normalizedName = String(name).trim();
      return {
        name: normalizedName,
        nameKey: this.normalizeMapPinName(normalizedName),
        tileKey,
        cityName,
        ownerName: String(ownerName || "").trim(),
        updatedAt: Date.now(),
      };
    },

    saveCurrentMapPin() {
      const name = String(this.mapPinInput || "").trim();
      if (!name) {
        this.setMapPinStatus("Enter a pin name.");
        return;
      }
      const pin = this.pinPayloadFromSelectedTile(name);
      if (!pin) {
        this.setMapPinStatus("Select a tile before saving a pin.");
        return;
      }
      const existing = this.readMapPinsFromStorage();
      const withoutCurrent = existing.filter(
        (entry) => entry && entry.nameKey !== pin.nameKey
      );
      const didPersist = this.persistMapPins([pin, ...withoutCurrent]);
      if (!didPersist) {
        this.setMapPinStatus("Unable to save pin.");
        return;
      }
      this.mapPinInput = "";
      this.setMapPinStatus(`Saved pin "${pin.name}".`);
    },

    removeMapPin(name) {
      const nameKey = this.normalizeMapPinName(name);
      if (!nameKey) {
        return;
      }
      const existing = this.readMapPinsFromStorage();
      const nextPins = existing.filter((entry) => entry.nameKey !== nameKey);
      if (nextPins.length === existing.length) {
        return;
      }
      const didPersist = this.persistMapPins(nextPins);
      if (!didPersist) {
        this.setMapPinStatus("Unable to remove pin.");
        return;
      }
      this.setMapPinStatus(`Removed pin "${String(name).trim()}".`);
    },

    jumpToMapPin(name) {
      const nameKey = this.normalizeMapPinName(name);
      if (!nameKey) {
        return false;
      }
      const pin = this.mapPins.find((entry) => entry.nameKey === nameKey);
      if (!pin) {
        this.setMapPinStatus("Pin not found.");
        return false;
      }
      let focused = false;
      if (pin.cityName) {
        focused = this.focusTileByCityName(pin.cityName, {
          forceCenter: true,
          enforceSearchZoom: true,
        });
      }
      if (!focused && pin.tileKey) {
        focused = this.focusTileByKey(pin.tileKey, {
          forceCenter: true,
          enforceSearchZoom: true,
        });
      }
      if (!focused && pin.ownerName) {
        focused = this.focusOwnerByName(pin.ownerName, {
          forceCenter: true,
          enforceSearchZoom: true,
          cycle: false,
        });
      }
      if (!focused) {
        this.setMapPinStatus("Pin target not found on this map.");
        return false;
      }
      this.setMapPinStatus(`Jumped to "${pin.name}".`);
      return true;
    },

    mapPinTipPath() {
      const yTop = this.mapPinTipTopY();
      const yBase = this.mapPinTipBaseY();
      const width = this.mapPinTipWidth();
      return `M 0 ${yTop} L ${width} ${yBase} L ${-width} ${yBase} Z`;
    },

    mapPinLabelText(value) {
      const name = String(value || "").trim();
      if (!name) {
        return "Pin";
      }
      return name.length > 18 ? `${name.slice(0, 17)}…` : name;
    },

    mapPinLabelWidth(value) {
      const text = this.mapPinLabelText(value);
      return Math.max(
        this.hexSize * 1.5,
        text.length * (this.hexSize * 0.34) + this.hexSize * 0.3
      );
    },

    mapPinTipTopY() {
      return -this.hexSize * 0.15;
    },

    mapPinTipBaseY() {
      return -this.hexSize * 0.5;
    },

    mapPinTipWidth() {
      return this.hexSize * 0.28;
    },

    mapPinDotY() {
      return -this.hexSize * 0.74;
    },

    mapPinDotRadius() {
      return this.hexSize * 0.24;
    },

    mapPinCoreRadius() {
      return this.hexSize * 0.11;
    },

    mapPinLabelHeight() {
      return this.hexSize * 0.9;
    },

    mapPinLabelY() {
      return -this.hexSize * 1.45;
    },

    mapPinLabelTextY() {
      return this.mapPinLabelY() + this.mapPinLabelHeight() / 2;
    },

    drawCanvasMapPins(context) {
      if (!context || !this.mapPinTiles.length) {
        return;
      }
      const viewportPadding = this.hexSize * 4;
      const minX = -this.translate.x / this.scale - viewportPadding;
      const minY = -this.translate.y / this.scale - viewportPadding;
      const maxX =
        minX + this.viewportSize.width / this.scale + viewportPadding * 2;
      const maxY =
        minY + this.viewportSize.height / this.scale + viewportPadding * 2;
      const showLabel = this.scale >= 0.9;
      let didDrawPin = false;
      this.mapPinTiles.forEach((pin) => {
        const tile = pin && pin.tile ? pin.tile : null;
        if (!tile) {
          return;
        }
        if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) {
          return;
        }
        if (!didDrawPin) {
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = '700 6.6px "Avenir Next", "Segoe UI", sans-serif';
          didDrawPin = true;
        }
        const dotY = tile.y + this.mapPinDotY();
        const tipY = tile.y + this.mapPinTipTopY();
        const tipBaseY = tile.y + this.mapPinTipBaseY();
        const tipWidth = this.mapPinTipWidth();

        context.beginPath();
        context.moveTo(tile.x, tipY);
        context.lineTo(tile.x + tipWidth, tipBaseY);
        context.lineTo(tile.x - tipWidth, tipBaseY);
        context.closePath();
        context.fillStyle = "#f2b84f";
        context.fill();

        context.beginPath();
        context.arc(tile.x, dotY, this.mapPinDotRadius(), 0, Math.PI * 2);
        context.fillStyle = "#ffd37a";
        context.fill();
        context.lineWidth = 0.8;
        context.strokeStyle = "rgba(0, 0, 0, 0.65)";
        context.stroke();

        context.beginPath();
        context.arc(tile.x, dotY, this.mapPinCoreRadius(), 0, Math.PI * 2);
        context.fillStyle = "#16120a";
        context.fill();

        if (!showLabel) {
          return;
        }
        const text = this.mapPinLabelText(pin.name);
        const labelWidth = this.mapPinLabelWidth(pin.name);
        const labelHeight = this.mapPinLabelHeight();
        const labelX = tile.x - labelWidth / 2;
        const labelY = tile.y + this.mapPinLabelY();
        context.fillStyle = "rgba(10, 10, 10, 0.88)";
        context.fillRect(labelX, labelY, labelWidth, labelHeight);
        context.strokeStyle = "rgba(255, 211, 122, 0.6)";
        context.lineWidth = 0.5;
        context.strokeRect(labelX, labelY, labelWidth, labelHeight);
        context.fillStyle = "#f6d99a";
        context.fillText(text, tile.x, tile.y + this.mapPinLabelTextY() + 0.2);
      });
    },

    parseTileKeyFromInput(value) {
      const input = String(value || "").trim();
      if (!input) {
        return "";
      }
      const match = input.match(
        /(?:tile[\s#:,-]*)?(-?\d{1,3})\s*[, ]\s*(-?\d{1,3})/i
      );
      if (!match) {
        return "";
      }
      const x = parseInt(match[1], 10);
      const y = parseInt(match[2], 10);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return "";
      }
      return `${x},${y}`;
    },

    normalizeMapCityName(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    },

    parseCityNameFromInput(value) {
      const decoded = String(value || "").trim();
      if (!decoded) {
        return "";
      }
      try {
        return decodeURIComponent(decoded);
      } catch (error) {
        return decoded;
      }
    },

    parseOwnerNameFromInput(value) {
      const decoded = String(value || "").trim();
      if (!decoded) {
        return "";
      }
      try {
        return decodeURIComponent(decoded);
      } catch (error) {
        return decoded;
      }
    },

    parseSnapshotIdFromInput(value) {
      const decoded = String(value || "").trim();
      if (!decoded) {
        return "";
      }
      try {
        return decodeURIComponent(decoded);
      } catch (error) {
        return decoded;
      }
    },

    resolveRouteSnapshotId() {
      if (this.embedded) {
        return "";
      }
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        return "";
      }
      if (
        route.query &&
        Object.prototype.hasOwnProperty.call(route.query, "snapshot")
      ) {
        return this.parseSnapshotIdFromInput(route.query.snapshot);
      }
      return "";
    },

    async ensureSnapshotSelection(snapshotId) {
      const nextSnapshotId = this.parseSnapshotIdFromInput(snapshotId);
      if (!nextSnapshotId) {
        if (this.snapshotViewId) {
          this.snapshotViewId = "";
          this.snapshotCompareId = "";
        }
        return true;
      }
      let availableSnapshots = Array.isArray(this.snapshots)
        ? this.snapshots
        : [];
      if (!availableSnapshots.length) {
        await this.loadSnapshots();
        availableSnapshots = Array.isArray(this.snapshots)
          ? this.snapshots
          : [];
      }
      const hasSnapshot = availableSnapshots.some(
        (snapshot) => snapshot && snapshot.id === nextSnapshotId
      );
      if (!hasSnapshot) {
        return false;
      }
      if (this.snapshotViewId !== nextSnapshotId) {
        this.snapshotViewId = nextSnapshotId;
      }
      if (!this.snapshotCompareId) {
        this.snapshotCompareId = "__live__";
      }
      return true;
    },

    resolveRouteTileKey() {
      if (this.embedded) {
        return "";
      }
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        return "";
      }
      const queryTile =
        route.query && Object.prototype.hasOwnProperty.call(route.query, "tile")
          ? this.parseTileKeyFromInput(route.query.tile)
          : "";
      if (queryTile) {
        return queryTile;
      }
      let hash = String(route.hash || "");
      try {
        hash = decodeURIComponent(hash);
      } catch (error) {
        // Ignore malformed hash and fall back to raw value.
      }
      if (!hash) {
        return "";
      }
      return this.parseTileKeyFromInput(hash.replace(/^#/, ""));
    },

    resolveRouteCityName() {
      if (this.embedded) {
        return "";
      }
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        return "";
      }
      if (
        route.query &&
        Object.prototype.hasOwnProperty.call(route.query, "city")
      ) {
        return this.parseCityNameFromInput(route.query.city);
      }
      return "";
    },

    resolveRouteOwnerName() {
      if (this.embedded) {
        return "";
      }
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        return "";
      }
      if (
        route.query &&
        Object.prototype.hasOwnProperty.call(route.query, "owner")
      ) {
        return this.parseOwnerNameFromInput(route.query.owner);
      }
      return "";
    },

    centerTileInViewport(tile) {
      if (!tile) {
        return;
      }
      if (!this.viewportSize.width || !this.viewportSize.height) {
        this.updateViewportSize();
      }
      if (!this.viewportSize.width || !this.viewportSize.height) {
        return;
      }
      const nextTranslate = {
        x: this.viewportSize.width / 2 - tile.x * this.scale,
        y: this.viewportSize.height / 2 - tile.y * this.scale,
      };
      this.translate = this.clampTranslate(nextTranslate, this.scale);
    },

    ensureTileInViewport(tile, forceCenter = false) {
      if (!tile) {
        return;
      }
      if (!this.viewportSize.width || !this.viewportSize.height) {
        this.updateViewportSize();
      }
      if (!this.viewportSize.width || !this.viewportSize.height) {
        return;
      }
      const tileScreenX = tile.x * this.scale + this.translate.x;
      const tileScreenY = tile.y * this.scale + this.translate.y;
      const padX = Math.min(120, Math.max(36, this.viewportSize.width * 0.14));
      const padY = Math.min(96, Math.max(28, this.viewportSize.height * 0.14));
      const outOfView =
        tileScreenX < padX ||
        tileScreenX > this.viewportSize.width - padX ||
        tileScreenY < padY ||
        tileScreenY > this.viewportSize.height - padY;
      if (forceCenter || outOfView) {
        this.centerTileInViewport(tile);
      }
    },

    focusTileByKey(tileKey, options = {}) {
      const normalizedOptions =
        typeof options === "boolean" ? { forceCenter: options } : options || {};
      const forceCenter = normalizedOptions.forceCenter !== false;
      const enforceSearchZoom = !!normalizedOptions.enforceSearchZoom;
      const normalizedKey = this.parseTileKeyFromInput(tileKey);
      if (!normalizedKey) {
        return false;
      }
      if (!this.tileLookup) {
        this.pendingRouteTileKey = normalizedKey;
        return false;
      }
      const tile = this.tileLookup.get(normalizedKey);
      if (!tile) {
        this.pendingRouteTileKey = normalizedKey;
        return false;
      }
      this.pendingRouteTileKey = "";
      this.selectedTile = tile;
      this.syncEditFieldsFromTile(tile);
      if (this.isMobileView && this.editPanelCollapsed) {
        this.editPanelCollapsed = false;
      }
      this.$nextTick(() => {
        if (enforceSearchZoom) {
          this.updateViewportSize();
          const targetScale = Math.min(
            this.maxScale,
            Math.max(this.minScale, QUICK_JUMP_FOCUS_SCALE)
          );
          if (Math.abs(this.scale - targetScale) > 0.001) {
            this.applyZoom(targetScale, {
              x: this.viewportSize.width / 2,
              y: this.viewportSize.height / 2,
            });
          }
        }
        this.ensureTileInViewport(tile, forceCenter);
        window.requestAnimationFrame(() => {
          if (enforceSearchZoom) {
            const targetScale = Math.min(
              this.maxScale,
              Math.max(this.minScale, QUICK_JUMP_FOCUS_SCALE)
            );
            if (Math.abs(this.scale - targetScale) > 0.001) {
              this.applyZoom(targetScale, {
                x: this.viewportSize.width / 2,
                y: this.viewportSize.height / 2,
              });
            }
          }
          this.ensureTileInViewport(tile, false);
        });
        if (this.useTerrainCanvas) {
          this.drawTerrainCanvas();
        }
      });
      return true;
    },

    focusTileByCityName(cityName, options = {}) {
      const needle = this.normalizeMapCityName(cityName);
      if (!needle || !Array.isArray(this.tiles) || !this.tiles.length) {
        return false;
      }
      const match = this.tiles.find((tile) => {
        if (!tile || !tile.city || !tile.city.name) {
          return false;
        }
        return this.normalizeMapCityName(tile.city.name) === needle;
      });
      if (!match || !match.key) {
        return false;
      }
      return this.focusTileByKey(match.key, options);
    },

    buildOwnerFocusTargets(ownerId) {
      if (
        !Number.isFinite(ownerId) ||
        !Array.isArray(this.tiles) ||
        !this.tiles.length
      ) {
        return [];
      }
      const cityTargets = this.tiles
        .filter(
          (tile) =>
            tile &&
            tile.city &&
            tile.city.name &&
            this.ownerIdForCity(tile) === ownerId
        )
        .slice()
        .sort((a, b) => {
          const aCapital = a.city && a.city.isCapital ? 1 : 0;
          const bCapital = b.city && b.city.isCapital ? 1 : 0;
          if (aCapital !== bCapital) {
            return bCapital - aCapital;
          }
          const aSize = Number(a.city && a.city.size) || 0;
          const bSize = Number(b.city && b.city.size) || 0;
          if (aSize !== bSize) {
            return bSize - aSize;
          }
          const aName = String((a.city && a.city.name) || "");
          const bName = String((b.city && b.city.name) || "");
          return aName.localeCompare(bName, "en");
        });
      const tileTargets = this.tiles
        .filter((tile) => tile && !tile.city && tile.owner === ownerId)
        .slice()
        .sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }
          return a.col - b.col;
        });
      const seen = new Set();
      return [...cityTargets, ...tileTargets].filter((tile) => {
        if (!tile || !tile.key || seen.has(tile.key)) {
          return false;
        }
        seen.add(tile.key);
        return true;
      });
    },

    focusOwnerByName(ownerName, options = {}) {
      const normalizedOptions =
        typeof options === "boolean" ? { forceCenter: options } : options || {};
      const forceCenter = normalizedOptions.forceCenter !== false;
      const enforceSearchZoom = !!normalizedOptions.enforceSearchZoom;
      const cycle = !!normalizedOptions.cycle;
      const ownerId = resolveOwnerInput(ownerName);
      if (!Number.isFinite(ownerId) || ownerId < 0) {
        return false;
      }
      const targets = this.buildOwnerFocusTargets(ownerId);
      if (!targets.length) {
        return false;
      }
      let nextIndex = 0;
      if (cycle) {
        const currentIndex = Number(this.ownerJumpCycleByOwner[ownerId]);
        nextIndex = Number.isFinite(currentIndex)
          ? (currentIndex + 1) % targets.length
          : 0;
      }
      this.ownerJumpCycleByOwner = {
        ...this.ownerJumpCycleByOwner,
        [ownerId]: nextIndex,
      };
      const target = targets[nextIndex];
      if (!target || !target.key) {
        return false;
      }
      return this.focusTileByKey(target.key, {
        forceCenter,
        enforceSearchZoom,
      });
    },

    async handleQuickJumpTile(event) {
      if (this.embedded) {
        return;
      }
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        return;
      }
      const tileKey =
        event && event.detail
          ? this.parseTileKeyFromInput(event.detail.tileKey)
          : "";
      const cityName =
        event && event.detail
          ? this.parseCityNameFromInput(event.detail.cityName)
          : "";
      const ownerName =
        event && event.detail
          ? this.parseOwnerNameFromInput(event.detail.ownerName)
          : "";
      const snapshotId =
        event && event.detail
          ? this.parseSnapshotIdFromInput(event.detail.snapshotId)
          : "";
      if (!tileKey && !cityName && !ownerName && !snapshotId) {
        return;
      }
      if (snapshotId) {
        this.quickJumpRequestedSnapshotId = snapshotId;
        await this.ensureSnapshotSelection(snapshotId);
      } else {
        this.quickJumpRequestedSnapshotId = "";
      }
      if (ownerName) {
        const currentOwnerQuery = this.resolveRouteOwnerName();
        const requestedOwnerId = resolveOwnerInput(ownerName);
        const currentOwnerId = resolveOwnerInput(currentOwnerQuery);
        if (
          Number.isFinite(requestedOwnerId) &&
          Number.isFinite(currentOwnerId) &&
          requestedOwnerId === currentOwnerId
        ) {
          this.focusOwnerByName(ownerName, {
            forceCenter: true,
            enforceSearchZoom: true,
            cycle: true,
          });
          return;
        }
        this.quickJumpRequestedOwnerName = ownerName;
        if (!tileKey && !cityName) {
          return;
        }
      }
      this.quickJumpRequestedTileKey = tileKey;
      this.quickJumpRequestedCityName = cityName;
      if (cityName) {
        const focusedCity = this.focusTileByCityName(cityName, {
          forceCenter: true,
          enforceSearchZoom: true,
        });
        if (focusedCity) {
          return;
        }
      }
      if (tileKey) {
        this.focusTileByKey(tileKey, {
          forceCenter: true,
          enforceSearchZoom: true,
        });
      }
    },

    async applyRequestedTileFromRoute() {
      const route = this.$route || {};
      const path = String(route.path || "");
      if (!path.includes("/community-tile-map")) {
        this.pendingRouteTileKey = "";
        this.quickJumpRequestedCityName = "";
        this.quickJumpRequestedOwnerName = "";
        this.quickJumpRequestedSnapshotId = "";
        return;
      }
      const snapshotId = this.resolveRouteSnapshotId();
      if (snapshotId) {
        const snapshotApplied = await this.ensureSnapshotSelection(snapshotId);
        if (snapshotApplied) {
          this.quickJumpRequestedSnapshotId = "";
        }
      } else if (
        this.snapshotViewId &&
        (!this.quickJumpRequestedSnapshotId ||
          this.quickJumpRequestedSnapshotId !== this.snapshotViewId)
      ) {
        await this.ensureSnapshotSelection("");
      }
      const query = route.query || {};
      const hasSearchQuery =
        Object.prototype.hasOwnProperty.call(query, "owner") ||
        Object.prototype.hasOwnProperty.call(query, "city") ||
        Object.prototype.hasOwnProperty.call(query, "tile");
      const ownerName = this.resolveRouteOwnerName();
      if (ownerName) {
        const requestedOwnerId = resolveOwnerInput(
          this.quickJumpRequestedOwnerName
        );
        const routeOwnerId = resolveOwnerInput(ownerName);
        const enforceSearchZoomRequested =
          Number.isFinite(requestedOwnerId) &&
          Number.isFinite(routeOwnerId) &&
          requestedOwnerId === routeOwnerId;
        const enforceSearchZoom = enforceSearchZoomRequested || hasSearchQuery;
        if (enforceSearchZoomRequested) {
          this.quickJumpRequestedOwnerName = "";
          this.quickJumpRequestedCityName = "";
          this.quickJumpRequestedTileKey = "";
        }
        const focusedOwner = this.focusOwnerByName(ownerName, {
          forceCenter: true,
          enforceSearchZoom,
          cycle: false,
        });
        if (focusedOwner) {
          return;
        }
      }
      const cityName = this.resolveRouteCityName();
      if (cityName) {
        const enforceSearchZoomRequested =
          !!this.quickJumpRequestedCityName &&
          this.normalizeMapCityName(this.quickJumpRequestedCityName) ===
            this.normalizeMapCityName(cityName);
        const enforceSearchZoom = enforceSearchZoomRequested || hasSearchQuery;
        if (enforceSearchZoomRequested) {
          this.quickJumpRequestedCityName = "";
          this.quickJumpRequestedTileKey = "";
        }
        const focusedCity = this.focusTileByCityName(cityName, {
          forceCenter: true,
          enforceSearchZoom,
        });
        if (focusedCity) {
          return;
        }
      }
      const tileKey = this.resolveRouteTileKey();
      if (tileKey) {
        const enforceSearchZoomRequested =
          !!this.quickJumpRequestedTileKey &&
          this.quickJumpRequestedTileKey === tileKey;
        const enforceSearchZoom =
          enforceSearchZoomRequested ||
          hasSearchQuery ||
          String(route.hash || "").includes("tile-");
        if (enforceSearchZoomRequested) {
          this.quickJumpRequestedTileKey = "";
        }
        this.focusTileByKey(tileKey, {
          forceCenter: true,
          enforceSearchZoom,
        });
        return;
      }
      if (!this.pendingRouteTileKey) {
        return;
      }
      this.focusTileByKey(this.pendingRouteTileKey, {
        forceCenter: true,
        enforceSearchZoom: false,
      });
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

    async applyMapData(mapData, stateData) {
      const mergedMapData = mergeMapState(mapData, stateData);
      this.mapConfig.columns = mergedMapData.width;
      this.mapConfig.rows = mergedMapData.height;
      this.mapName = mergedMapData.mapName || "";
      this.mapDescription = mergedMapData.mapDescription || "";
      this.hoveredTile = null;
      this.selectedTile = null;
      this.resetTerrainBaseCache();
      this.baseSnapshotPayload = null;
      this.snapshotPayloadCache = Object.create(null);
      this.snapshotPayloadRequests = Object.create(null);

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
      await this.loadLiveBaseSnapshot();
      this.applyLiveBaseSnapshot();
      this.deferOwnerBorders =
        this.lowMemoryMode || (this.isSnapshotEmbed && this.isMobileBrowser);
      this.scheduleOwnerBordersRebuild();
      this.hasLoadedOverrides = false;
      this.loadTileOverrides();
      this.subscribeToTileOverrides();
      this.$nextTick(() => {
        if (this.useTerrainCanvas) {
          this.drawTerrainCanvas();
        }
      });
    },

    handleResize() {
      this.isMobileView = window.innerWidth <= 900;
      if (this.isMobileView && this.editPanelCollapsed) {
        this.editPanelCollapsed = false;
      }
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

    zoomIn() {
      this.applyZoom(this.scale * 1.15);
    },

    zoomOut() {
      this.applyZoom(this.scale * 0.85);
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

    scheduleMiniMapDraw() {
      if (!this.showMiniMap) {
        return;
      }
      if (!this.tiles.length) {
        return;
      }
      if (this.miniMapFrameId) {
        return;
      }
      this.miniMapFrameId = window.requestAnimationFrame(() => {
        this.miniMapFrameId = null;
        this.drawMiniMap();
      });
    },

    drawMiniMap() {
      if (!this.gridWidth || !this.gridHeight) {
        return;
      }
      const canvas = this.$refs.miniMapCanvas;
      if (!canvas) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const width = this.miniMapWidth;
      const height = this.miniMapHeight;
      if (!width || !height) {
        return;
      }
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      const scale = this.miniMapScale;
      if (!scale) {
        return;
      }
      const vertices = buildHexVertices(this.hexSize);
      const terrainCache = new Map();
      const getColor = (terrainId) => {
        if (!terrainCache.has(terrainId)) {
          terrainCache.set(terrainId, terrainColor(terrainId));
        }
        return terrainCache.get(terrainId);
      };
      context.setTransform(scale, 0, 0, scale, 0, 0);
      this.tiles.forEach((tile) => {
        const fill = getColor(tile.terrainId);
        context.beginPath();
        context.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          context.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
        }
        context.closePath();
        context.fillStyle = fill;
        context.fill();
      });
      context.setTransform(1, 0, 0, 1, 0, 0);
      const viewport = this.miniMapViewport;
      context.fillStyle = "rgba(255, 255, 255, 0.05)";
      context.strokeStyle = "rgba(255, 255, 255, 0.75)";
      context.lineWidth = 1.15;
      context.fillRect(
        viewport.x * scale,
        viewport.y * scale,
        viewport.width * scale,
        viewport.height * scale
      );
      context.strokeRect(
        viewport.x * scale,
        viewport.y * scale,
        viewport.width * scale,
        viewport.height * scale
      );
    },

    updateTooltipPosition(event) {
      const viewport = this.$refs.viewport;
      if (!viewport || !event) {
        return;
      }
      if (this.hoverTooltipVisible) {
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
      if (this.hoverTooltipTile) {
        if (this.hoverTooltipSizeCache.size >= 256) {
          const oldestKey = this.hoverTooltipSizeCache.keys().next().value;
          if (oldestKey !== undefined) {
            this.hoverTooltipSizeCache.delete(oldestKey);
          }
        }
        this.hoverTooltipSizeCache.set(this.hoverTooltipTile.key, {
          ...this.hoverTooltipSize,
        });
      }
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
          const cached = this.hoverTooltipSizeCache.get(targetTile.key);
          if (cached) {
            this.hoverTooltipSize = { ...cached };
          }
          this.hoverTooltipTile = targetTile;
          this.hoverTooltipVisible = true;
          this.scheduleHoverTooltipSizeUpdate();
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
      if (this.hoverTooltipHideTimer) {
        window.clearTimeout(this.hoverTooltipHideTimer);
        this.hoverTooltipHideTimer = null;
      }
      if (this.hoverTooltipUpdateTimer) {
        window.clearTimeout(this.hoverTooltipUpdateTimer);
        this.hoverTooltipUpdateTimer = null;
      }
      this.hoverTooltipVisible = false;
      this.hoverTooltipTile = null;
    },

    lockHoverTooltip() {
      this.hoverTooltipLocked = true;
      if (this.hoverTooltipHideTimer) {
        window.clearTimeout(this.hoverTooltipHideTimer);
        this.hoverTooltipHideTimer = null;
      }
    },

    unlockHoverTooltip() {
      this.hoverTooltipLocked = false;
      if (!this.hoveredTile) {
        this.hideHoverTooltip();
      }
    },

    invalidateTooltipCache(tileKey) {
      if (!tileKey) {
        return;
      }
      this.hoverTooltipSizeCache.delete(tileKey);
    },

    scheduleHoverTooltipSizeUpdate() {
      if (this.hoverTooltipUpdateTimer) {
        window.clearTimeout(this.hoverTooltipUpdateTimer);
      }
      this.hoverTooltipUpdateTimer = window.setTimeout(() => {
        this.$nextTick(() => {
          this.updateHoverTooltipSize();
        });
      }, 120);
    },

    showSelectedTooltip(tile) {
      if (!tile) {
        return;
      }
      this.clearHoverTooltipTimer();
      if (this.hoverTooltipHideTimer) {
        window.clearTimeout(this.hoverTooltipHideTimer);
        this.hoverTooltipHideTimer = null;
      }
      const viewport = this.$refs.viewport;
      if (!viewport) {
        return;
      }
      const cached = this.hoverTooltipSizeCache.get(tile.key);
      if (cached) {
        this.hoverTooltipSize = { ...cached };
      }
      this.hoverTooltipTile = tile;
      this.hoverTooltipVisible = true;
      this.hoverTooltipLocked = true;
      this.hoverTooltipPosition = {
        x: tile.x * this.scale + this.translate.x,
        y: tile.y * this.scale + this.translate.y,
      };
      this.scheduleHoverTooltipSizeUpdate();
    },

    onPointerDown(event) {
      this.lastPointerType = event.pointerType || null;
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
        const ownerId = resolveBrushOwnerId(
          this.editOwnerName,
          resolveOwnerInput
        );
        if (this.ownerBrushMode === "paint" && !Number.isFinite(ownerId)) {
          return;
        }
        this.isPaintingOwner = true;
        this.ownerBrushId = ownerId;
        if (event.currentTarget && event.currentTarget.setPointerCapture) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        this.clearBrushOverlay();
        const tile = this.getTileAtPointer(event);
        if (tile) {
          this.applyBrushTile(tile);
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
      const isNavigating = this.isDragging || this.isPinching;
      if (!isNavigating && !this.isPaintingOwner) {
        this.updateTooltipPosition(event);
      }
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
      if (this.useTerrainCanvas && !this.isDragging && !this.isPinching) {
        const tile = this.getTileAtPointer(event);
        if (tile !== this.hoveredTile) {
          this.hoveredTile = tile;
          this.drawTerrainCanvas();
        }
      }
      if (!this.useTerrainCanvas && !this.isDragging && !this.isPinching) {
        const tile = this.getTileAtPointer(event);
        if (tile !== this.hoveredTile) {
          this.hoveredTile = tile;
        }
      }
      if (
        this.isPaintingOwner &&
        (this.ownerBrushMode === "clear" || Number.isFinite(this.ownerBrushId))
      ) {
        const tile = this.getTileAtPointer(event);
        if (tile) {
          this.scheduleBrushApply(tile);
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
      this.lastPointerType = event.pointerType || this.lastPointerType;
      if (event.type === "pointerleave") {
        if (this.isPaintingOwner) {
          this.isPaintingOwner = false;
          this.ownerBrushId = null;
          this.flushBrushEdits();
        }
        if (this.hoveredTile) {
          this.hoveredTile = null;
          if (this.useTerrainCanvas) {
            this.drawTerrainCanvas();
          }
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
        this.flushBrushEdits();
        if (
          event.currentTarget &&
          event.currentTarget.hasPointerCapture &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
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
          if (this.lastPointerType === "touch") {
            this.showSelectedTooltip(tile);
          }
          if (this.useTerrainCanvas) {
            this.drawTerrainCanvas();
          }
          return;
        }
        if (this.lastPointerType === "touch") {
          this.selectedTile = null;
        }
      }
    },

    requestTerrainCanvasDraw() {
      if (!this.useTerrainCanvas) {
        return;
      }
      if (this.canvasDrawFrameId) {
        return;
      }
      this.canvasDrawFrameId = window.requestAnimationFrame(() => {
        this.canvasDrawFrameId = null;
        this.drawTerrainCanvasImmediate();
      });
    },

    drawTerrainCanvas() {
      this.requestTerrainCanvasDraw();
    },

    drawTerrainCanvasImmediate() {
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
      const scale = this.canvasRenderScale || 1;
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const tiles = this.tiles;
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
      const drawTerrainLayer = (targetContext) => {
        tiles.forEach((tile) => {
          const fill = this.tileTerrainFillStyle(tile, getColor);
          const previousAlpha = targetContext.globalAlpha;
          const fillColor = fill.color;
          const fillAlpha = Number.isFinite(fill.alpha)
            ? fill.alpha
            : previousAlpha;
          targetContext.globalAlpha = fillAlpha;
          targetContext.beginPath();
          targetContext.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
          for (let i = 1; i < vertices.length; i += 1) {
            targetContext.lineTo(
              tile.x + vertices[i].x,
              tile.y + vertices[i].y
            );
          }
          targetContext.closePath();
          targetContext.fillStyle = fillColor;
          targetContext.fill();
          targetContext.globalAlpha = previousAlpha;
        });
        targetContext.lineWidth = 0.2;
        targetContext.strokeStyle = "rgba(0, 0, 0, 0.05)";
        tiles.forEach((tile) => {
          targetContext.beginPath();
          targetContext.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
          for (let i = 1; i < vertices.length; i += 1) {
            targetContext.lineTo(
              tile.x + vertices[i].x,
              tile.y + vertices[i].y
            );
          }
          targetContext.closePath();
          targetContext.stroke();
        });
      };
      const shouldCacheTerrainBase = this.shouldUseTerrainBaseCache();
      if (shouldCacheTerrainBase) {
        const cacheKey = this.terrainBaseLayerKey(width, height, scale);
        if (!this.terrainBaseCanvas || this.terrainBaseCacheKey !== cacheKey) {
          const baseCanvas =
            this.terrainBaseCanvas || document.createElement("canvas");
          if (baseCanvas.width !== width) {
            baseCanvas.width = width;
          }
          if (baseCanvas.height !== height) {
            baseCanvas.height = height;
          }
          const baseContext = baseCanvas.getContext("2d");
          if (baseContext) {
            baseContext.setTransform(1, 0, 0, 1, 0, 0);
            baseContext.clearRect(0, 0, width, height);
            baseContext.setTransform(scale, 0, 0, scale, 0, 0);
            drawTerrainLayer(baseContext);
            this.terrainBaseCanvas = baseCanvas;
            this.terrainBaseCacheKey = cacheKey;
          } else {
            this.resetTerrainBaseCache();
          }
        }
        if (this.terrainBaseCanvas && this.terrainBaseCacheKey === cacheKey) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.drawImage(this.terrainBaseCanvas, 0, 0);
          context.setTransform(scale, 0, 0, scale, 0, 0);
        } else {
          drawTerrainLayer(context);
        }
      } else {
        if (this.terrainBaseCanvas || this.terrainBaseCacheKey) {
          this.resetTerrainBaseCache();
        }
        drawTerrainLayer(context);
      }

      const previousAlpha = context.globalAlpha;
      let hasOverlayTiles = false;
      tiles.forEach((tile) => {
        if (!this.shouldShowOwnerOverlay(tile)) {
          return;
        }
        const style = this.ownerOverlayStyle(tile);
        if (!style || !style.fill || !Number.isFinite(style.fillOpacity)) {
          return;
        }
        if (style.fillOpacity <= 0) {
          return;
        }
        hasOverlayTiles = true;
        context.globalAlpha = style.fillOpacity;
        drawHexPath(tile);
        context.fillStyle = style.fill;
        context.fill();
      });
      context.globalAlpha = previousAlpha;

      if (hasOverlayTiles && this.renderOwnerBorders) {
        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        const previousBorderAlpha = context.globalAlpha;
        tiles.forEach((tile) => {
          if (!this.shouldShowOwnerOverlay(tile)) {
            return;
          }
          const borderSegments = this.ownerBorderSegmentsForTile(tile);
          if (!borderSegments.length) {
            return;
          }
          borderSegments.forEach((segment) => {
            const borderStyle = this.ownerBorderStyle(tile, segment);
            context.beginPath();
            context.moveTo(tile.x + segment.x1, tile.y + segment.y1);
            context.lineTo(tile.x + segment.x2, tile.y + segment.y2);
            context.strokeStyle =
              (borderStyle && borderStyle.stroke) ||
              this.ownerBorderColor(tile, segment);
            context.lineWidth =
              (borderStyle && Number(borderStyle.strokeWidth)) || 2;
            context.globalAlpha =
              borderStyle && Number.isFinite(borderStyle.opacity)
                ? borderStyle.opacity
                : previousBorderAlpha;
            context.stroke();
          });
        });
        context.globalAlpha = previousBorderAlpha;
      }

      const capitalOuter = this.hexSize * 0.44;
      const capitalInner = this.hexSize * 0.2;
      const capitalVertices = buildStarVertices(capitalOuter, capitalInner);
      context.globalAlpha = 1;
      tiles.forEach((tile) => {
        if (!this.shouldShowCity(tile)) {
          return;
        }
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
          return;
        }
        context.beginPath();
        context.arc(tile.x, tile.y, this.hexSize * 0.35, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
        context.strokeStyle = "rgba(0, 0, 0, 0.9)";
        context.lineWidth = 1.5;
        context.stroke();
      });

      this.drawCanvasMapPins(context);

      context.lineJoin = "round";
      context.lineCap = "round";
      tiles.forEach((tile) => {
        if (!this.isRecentlyEdited(tile)) {
          return;
        }
        const pulse = this.recentEditPulse(tile);
        if (!pulse) {
          return;
        }
        drawHexPath(tile);
        context.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        context.lineWidth = 1.25 + pulse * 1.75;
        context.stroke();
      });

      const diffKeys = this.snapshotDiffLookup || null;
      let hasDiffKeys = false;
      if (diffKeys) {
        for (const key in diffKeys) {
          if (diffKeys[key]) {
            hasDiffKeys = true;
            break;
          }
        }
      }
      if (hasDiffKeys) {
        context.lineJoin = "round";
        context.lineCap = "round";
        tiles.forEach((tile) => {
          if (!diffKeys[tile.key]) {
            return;
          }
          drawHexPath(tile);
          context.strokeStyle = "rgba(255, 210, 90, 0.9)";
          context.lineWidth = 2.5;
          context.stroke();
        });
      }

      // Unit markers render in SVG at higher zoom levels.

      if (this.hoveredTile) {
        drawHexPath(this.hoveredTile);
        context.strokeStyle = "rgba(255, 255, 255, 0.65)";
        context.lineWidth = 1.5;
        context.stroke();
      }
      if (this.selectedTile) {
        drawHexPath(this.selectedTile);
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2.5;
        context.stroke();
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
      if (this.isDragging || this.isPinching) {
        return;
      }
      this.hoveredTile = tile;
    },

    clearHover() {
      this.hoveredTile = null;
      if (this.hoverTooltipVisible) {
        this.clearHoverTooltipTimer();
        if (this.hoverTooltipHideTimer) {
          window.clearTimeout(this.hoverTooltipHideTimer);
        }
        this.hoverTooltipHideTimer = window.setTimeout(() => {
          if (!this.hoverTooltipLocked) {
            this.hideHoverTooltip();
          }
          this.hoverTooltipHideTimer = null;
        }, 1500);
      }
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

    isSnapshotDiff(tile) {
      if (!tile || !this.snapshotDiffLookup) {
        return false;
      }
      return !!this.snapshotDiffLookup[tile.key];
    },

    isRecentlyEdited(tile) {
      if (!tile || !tile.recentlyEditedUntil) {
        return false;
      }
      return tile.recentlyEditedUntil > this.recentEditTick;
    },

    recentEditPulse(tile) {
      if (!this.isRecentlyEdited(tile)) {
        return 0;
      }
      const elapsed = this.recentEditTick - (tile.recentlyEditedAt || 0);
      const remaining = tile.recentlyEditedUntil - this.recentEditTick;
      const phase = (elapsed / 1200) * Math.PI * 2;
      const pulse = 0.4 + 0.4 * Math.sin(phase);
      const fade = Math.min(1, Math.max(0, remaining / 1000));
      return Math.max(0.12, pulse) * fade;
    },

    hasActiveRecentEdits() {
      return this.tiles.some(
        (tile) => tile.recentlyEditedUntil > this.recentEditTick
      );
    },

    startRecentEditAnimation() {
      if (this.recentEditFrameId) {
        return;
      }
      const tick = (now) => {
        this.recentEditTick = now;
        if (!this.hasActiveRecentEdits()) {
          this.recentEditFrameId = null;
          return;
        }
        if (this.useTerrainCanvas) {
          this.drawTerrainCanvas();
        }
        this.recentEditFrameId = window.requestAnimationFrame(tick);
      };
      this.recentEditFrameId = window.requestAnimationFrame(tick);
    },

    markTileRecentlyEdited(tile, durationMs = 4000) {
      if (!tile) {
        return;
      }
      const now = performance.now();
      tile.recentlyEditedAt = now;
      tile.recentlyEditedUntil = now + durationMs;
      this.startRecentEditAnimation();
    },

    handleOverlayVisualizationChange() {
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    resetContrastOptions() {
      this.contrastHideDecorations = false;
      this.contrastFlattenLandWater = false;
      this.contrastGrayscaleTerrain = false;
      this.contrastBoostOwnerOpacity = false;
      this.contrastLargeCityBanners = false;
    },

    isWaterTile(tile) {
      return (
        !!tile && (tile.terrainId === "ocean" || tile.terrainId === "coast")
      );
    },

    contrastTerrainColor(tile, color) {
      let nextColor = color;
      if (this.contrastFlattenLandWater) {
        nextColor = this.isWaterTile(tile) ? "#294a5f" : "#8e8e69";
      }
      if (this.contrastGrayscaleTerrain) {
        nextColor = desaturateColor(nextColor, 1);
      }
      return nextColor;
    },

    tileTerrainFillStyle(tile, getColor) {
      const fill = adjustedTerrainFill(tile, getColor);
      let fillColor = this.contrastTerrainColor(tile, fill.color);
      let fillAlpha = Number.isFinite(fill.alpha) ? fill.alpha : 1;
      if (
        this.hasActiveCivilizationOverlay &&
        !this.tileBelongsToOverlayCiv(tile)
      ) {
        fillColor = desaturateColor(fillColor, 0.6);
        fillAlpha = this.isWaterTile(tile) ? 0.12 : 0.3;
      } else if (this.isPopulationOverlayActive) {
        fillColor = desaturateColor(fillColor, 0.35);
      }
      return {
        color: fillColor,
        alpha: fillAlpha,
      };
    },

    ownerIdForCity(tile) {
      if (!tile || !tile.city) {
        return null;
      }
      if (Number.isFinite(tile.city.owner)) {
        return tile.city.owner;
      }
      return Number.isFinite(tile.owner) ? tile.owner : null;
    },

    ownerIdForUnit(unit, tile) {
      if (unit && Number.isFinite(unit.owner)) {
        return unit.owner;
      }
      if (tile && Number.isFinite(tile.owner)) {
        return tile.owner;
      }
      return null;
    },

    tileBelongsToOverlayCiv(tile) {
      if (!tile || !this.hasActiveCivilizationOverlay) {
        return false;
      }
      return tile.owner === this.activeOverlayOwnerId;
    },

    unitBelongsToOverlayCiv(unit, tile) {
      if (!this.hasActiveCivilizationOverlay) {
        return true;
      }
      return this.ownerIdForUnit(unit, tile) === this.activeOverlayOwnerId;
    },

    shouldShowOwnerOverlay(tile) {
      if (!tile || !Number.isFinite(tile.owner)) {
        return false;
      }
      if (!this.hasActiveCivilizationOverlay) {
        return true;
      }
      return this.tileBelongsToOverlayCiv(tile);
    },

    ownerBorderSegmentsForTile(tile) {
      if (!this.renderOwnerBorders) {
        return [];
      }
      if (!tile || !Array.isArray(tile.ownerBorderSegments)) {
        return [];
      }
      if (!this.hasActiveCivilizationOverlay) {
        return tile.ownerBorderSegments;
      }
      return this.tileBelongsToOverlayCiv(tile) ? tile.ownerBorderSegments : [];
    },

    ownerBorderColor(tile, segment) {
      if (this.isPopulationOverlayActive) {
        const style = this.populationOverlayStyle(tile);
        return (style && style.fill) || "#ffffff";
      }
      if (this.isReligionOverlayActive) {
        const style = this.religionOverlayStyle(tile);
        return (style && style.fill) || "#ffffff";
      }
      return (segment && segment.color) || "#ffffff";
    },

    ownerBorderStyle(tile, segment) {
      const stroke = this.ownerBorderColor(tile, segment);
      return { stroke };
    },

    shouldShowCity(tile) {
      if (!tile || !tile.city) {
        return false;
      }
      if (!this.hasActiveCivilizationOverlay) {
        return true;
      }
      return this.ownerIdForCity(tile) === this.activeOverlayOwnerId;
    },

    shouldShowPrimaryUnit(tile) {
      if (!tile) {
        return false;
      }
      const unit = this.primaryUnit(tile);
      if (!unit) {
        return false;
      }
      return this.unitBelongsToOverlayCiv(unit, tile);
    },

    showUnitMarker(tile, role) {
      if (!tile || this.scale <= 1) {
        return false;
      }
      const unit = role === "combat" ? tile.combatUnit : tile.civilianUnit;
      if (!unit) {
        return false;
      }
      return this.unitBelongsToOverlayCiv(unit, tile);
    },

    overlayDensityColor(ratio) {
      const clamped = clampValue(Number(ratio) || 0, 0, 1);
      const steps = [
        "hsl(50, 100%, 77.5%)",
        "hsl(30, 90%, 70%)",
        "hsl(25, 100%, 62.5%)",
        "hsl(0, 75%, 57.5%)",
        "hsl(340, 75%, 52.5%)",
        "hsl(315, 60%, 45%)",
        "hsl(290, 80%, 37.5%)",
        "hsl(280, 80%, 22.5%)",
      ];
      if (clamped >= 1) {
        return steps[steps.length - 1];
      }
      const index = Math.min(
        steps.length - 2,
        Math.floor(clamped * (steps.length - 1))
      );
      return steps[index];
    },

    populationOverlayStyle(tile) {
      if (!tile || !Number.isFinite(tile.owner)) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      if (
        Number.isFinite(this.babylonOwnerId) &&
        tile.owner === this.babylonOwnerId
      ) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      const density = this.populationDensityByOwner[tile.owner] || 0;
      const maxDensity = this.populationOverlayMetrics.maxDensity || 0;
      const ratio = maxDensity > 0 ? clampValue(density / maxDensity, 0, 1) : 0;
      const isWater = this.isWaterTile(tile);
      const fillOpacity = clampValue(
        isWater ? 0.1 + ratio * 0.04 : 0.5 + ratio * 0.75,
        0,
        1
      );
      return {
        fill: this.overlayDensityColor(ratio),
        fillOpacity,
      };
    },

    religionOverlayStyle(tile) {
      if (!tile || !Number.isFinite(tile.owner)) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      const religion = this.religionOverlayByOwner[tile.owner];
      if (!religion || !religion.color) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      const isWater = this.isWaterTile(tile);
      let fillOpacity = isWater ? 0.14 : 0.8;
      if (this.contrastBoostOwnerOpacity) {
        fillOpacity = isWater ? fillOpacity : 1;
      }
      return {
        fill: religion.color,
        fillOpacity,
      };
    },

    formatOverlayDensity(value) {
      if (!Number.isFinite(value)) {
        return "0.00";
      }
      return Number(value).toFixed(2);
    },

    formatOverlayCount(value) {
      if (!Number.isFinite(value)) {
        return "0";
      }
      return Math.round(value).toLocaleString("en-US");
    },

    tileStrokeStyle(tile) {
      return { stroke: "rgba(0, 0, 0, 0.05)", strokeWidth: 1 };
    },

    tileHexStyle(tile) {
      const stroke = this.tileStrokeStyle(tile);
      if (!tile) {
        return stroke;
      }
      const baseColor = terrainColor(tile.terrainId);
      const fill = this.tileTerrainFillStyle(tile, () => baseColor);
      const nextStyle = { ...stroke, fill: fill.color };
      if (Number.isFinite(fill.alpha) && fill.alpha < 1) {
        nextStyle.fillOpacity = fill.alpha;
      }
      return nextStyle;
    },

    ownerOverlayStyle(tile) {
      if (!tile || !Number.isFinite(tile.owner)) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      if (this.isPopulationOverlayActive) {
        return this.populationOverlayStyle(tile);
      }
      if (this.isReligionOverlayActive) {
        return this.religionOverlayStyle(tile);
      }
      const color = this.ownerColors[tile.owner] || "#ffffff";
      const isWater = this.isWaterTile(tile);
      if (
        this.hasActiveCivilizationOverlay &&
        !this.tileBelongsToOverlayCiv(tile)
      ) {
        return { fill: "transparent", fillOpacity: 0 };
      }
      let fillOpacity = this.hasActiveCivilizationOverlay
        ? isWater
          ? 0.2
          : 0.9
        : isWater
        ? 0.1
        : 0.72;
      if (this.contrastBoostOwnerOpacity) {
        fillOpacity = isWater ? fillOpacity : 1;
      }
      return {
        fill: color,
        fillOpacity,
      };
    },

    miniMapHexStyle(tile) {
      const baseColor = terrainColor(tile.terrainId);
      return { fill: baseColor };
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

    notePinPaths() {
      return NOTE_PIN_PATHS;
    },

    notePinTransform() {
      const offsetX = this.hexSize * 0.3;
      const offsetY = this.hexSize * 0.5;
      const scale = (this.hexSize * 0.8) / 640;
      return `translate(${offsetX}, ${offsetY}) scale(${scale}) translate(-320, -576)`;
    },

    notePinStyle(tile) {
      let fill = "#fff";
      if (tile && Number.isFinite(tile.owner)) {
        const ownerId = tile.owner;
        const override = ownerColorEntryById(ownerId);
        if (override && override.secondary) {
          fill = override.secondary;
        } else if (this.ownerSecondaryColors[ownerId]) {
          fill = this.ownerSecondaryColors[ownerId];
        } else {
          const baseColor =
            (override && override.primary) ||
            this.ownerColors[ownerId] ||
            this.ownerPalette[ownerId % this.ownerPalette.length];
          fill = deriveSecondaryColor(baseColor);
        }
      }
      return {
        fill,
        stroke: "rgba(0, 0, 0, 0.8)",
      };
    },

    ruinsPaths() {
      return RUINS_PATHS;
    },

    ruinsTransform() {
      const offsetX = 0;
      const offsetY = this.hexSize * 0.05;
      const scale = (this.hexSize * 1.1) / 640;
      return `translate(${offsetX}, ${offsetY}) scale(${scale}) translate(-320, -320)`;
    },

    ruinsStyle(tile) {
      let ownerId = null;
      if (tile && Number.isFinite(tile.originalOwner)) {
        ownerId = tile.originalOwner;
      } else if (tile && Number.isFinite(tile.owner)) {
        ownerId = tile.owner;
      }
      let fill = "#ffffff";
      let stroke = "rgba(0, 0, 0, 0.7)";
      let primary = fill;
      let secondary = fill;
      if (Number.isFinite(ownerId)) {
        const override = ownerColorEntryById(ownerId);
        primary =
          (override && override.primary) ||
          this.ownerColors[ownerId] ||
          this.ownerPalette[ownerId % this.ownerPalette.length];
        secondary =
          (override && override.secondary) ||
          this.ownerSecondaryColors[ownerId] ||
          deriveSecondaryColor(primary);
        fill = primary;
        stroke = secondary;
      }
      return { fill, stroke, primary, secondary };
    },

    ruinsPathStyle(ruinsPath, index, tile) {
      const colors = this.ruinsStyle(tile) || {};
      if (index === 0) {
        return { fill: colors.primary || colors.fill };
      }
      if (index === 1) {
        return { fill: colors.secondary || colors.stroke || colors.fill };
      }
      return null;
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
      const base = Math.max(10, this.hexSize * 0.8);
      return this.contrastLargeCityBanners ? base * 1.75 : base;
    },

    cityLabelBadgeRadius() {
      return this.cityLabelHeight() * 0.46;
    },

    cityLabelOriginalBadgeRadius() {
      return this.cityLabelHeight() * 0.3;
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

    cityLabelTextFontSize() {
      const size = this.cityLabelHeight() * 0.52;
      return Math.max(6, Math.round(size * 10) / 10);
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
      const originalBadgeWidth = this.cityHasOriginalOwnerBadge(tile)
        ? this.cityLabelOriginalBadgeRadius() * 1.25 + height * 0.2
        : 0;
      return (
        badgeDiameter +
        this.cityLabelTextGap() +
        nameWidth +
        rightPad +
        originalBadgeWidth
      );
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
      return {
        fill: colors.secondary,
        stroke: "none",
        fontSize: `${this.cityLabelTextFontSize()}px`,
      };
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
      return {
        fill,
        ...textStrokeStyleForFill(fill),
        fontSize: `${this.cityLabelTextFontSize()}px`,
      };
    },

    cityHasOriginalOwnerBadge(tile) {
      if (!tile || !tile.city) {
        return false;
      }
      const ownerId = Number.isFinite(tile.city.owner) ? tile.city.owner : null;
      const originalOwner = Number.isFinite(tile.originalOwner)
        ? tile.originalOwner
        : null;
      return (
        Number.isFinite(originalOwner) &&
        Number.isFinite(ownerId) &&
        originalOwner !== ownerId
      );
    },

    cityLabelOriginalOwnerStyle(tile) {
      if (!this.cityHasOriginalOwnerBadge(tile)) {
        return null;
      }
      const ownerId = tile.originalOwner;
      const override = ownerColorEntryById(ownerId);
      const primary =
        (override && override.primary) ||
        this.ownerColors[ownerId] ||
        this.ownerPalette[ownerId % this.ownerPalette.length];
      const secondary =
        (override && override.secondary) ||
        this.ownerSecondaryColors[ownerId] ||
        deriveSecondaryColor(primary);
      return { fill: primary, stroke: secondary };
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
      this.syncCityOwnerWithTileOwner(this.selectedTile);
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

    applyRuinsEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      this.selectedTile.ruins = !!this.editRuins;
      this.queueTileSave(this.selectedTile);
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
    },

    applyTileNotesEdit() {
      if (!this.ensureEditAccess() || !this.selectedTile) {
        return;
      }
      const trimmed = String(this.editTileNotes || "").trim();
      const nextNotes = trimmed || null;
      if (this.selectedTile.notes === nextNotes) {
        return;
      }
      this.selectedTile.notes = nextNotes;
      this.queueTileSave(this.selectedTile);
      this.invalidateTooltipCache(this.selectedTile.key);
      if (this.tileNotesStatusTimer) {
        window.clearTimeout(this.tileNotesStatusTimer);
      }
      this.tileNotesStatus = "Saved";
      this.tileNotesStatusTimer = window.setTimeout(() => {
        this.tileNotesStatus = "";
        this.tileNotesStatusTimer = null;
      }, 2000);
    },

    clearCombatUnitEdit() {
      this.clearUnitEditForRole("combat");
    },

    clearCivilianUnitEdit() {
      this.clearUnitEditForRole("civilian");
    },

    scheduleUnitEdit(role) {
      if (!this.unitEditTimers) {
        return;
      }
      const timer = this.unitEditTimers[role];
      if (timer) {
        window.clearTimeout(timer);
      }
      this.unitEditTimers[role] = window.setTimeout(() => {
        if (role === "combat") {
          this.applyCombatUnitEdit();
        } else {
          this.applyCivilianUnitEdit();
        }
        this.unitEditTimers[role] = null;
      }, 500);
    },

    scheduleFieldEdit(field) {
      if (!this.editDebounceTimers) {
        return;
      }
      const timer = this.editDebounceTimers[field];
      if (timer) {
        window.clearTimeout(timer);
      }
      this.editDebounceTimers[field] = window.setTimeout(() => {
        switch (field) {
          case "owner":
            this.applyOwnerEdit();
            break;
          case "originalOwner":
            this.applyOriginalOwnerEdit();
            break;
          case "cityName":
            this.applyCityNameEdit();
            break;
          case "cityValue":
            this.applyCityEdit();
            break;
          case "cityReligion":
            this.applyCityReligionEdit();
            break;
          case "worldWonders":
            this.applyWorldWondersEdit();
            break;
          default:
            break;
        }
        this.editDebounceTimers[field] = null;
      }, 500);
    },

    filterOwnerOptions(query) {
      const options = this.ownerOptions || [];
      if (!options.length) {
        return [];
      }
      const needle = String(query || "")
        .trim()
        .toLowerCase();
      if (!needle) {
        return options.slice(0, COMBO_MAX_RESULTS);
      }
      return options
        .filter((owner, index) =>
          this.ownerOptionLabel(owner, index).toLowerCase().includes(needle)
        )
        .slice(0, COMBO_MAX_RESULTS);
    },

    filterUnitOptions(query, options) {
      const list = options || [];
      if (!list.length) {
        return [];
      }
      const needle = String(query || "")
        .trim()
        .toLowerCase();
      if (!needle) {
        return list.slice(0, COMBO_MAX_RESULTS);
      }
      return list
        .filter((unit) =>
          String(unit.name || "")
            .toLowerCase()
            .includes(needle)
        )
        .slice(0, COMBO_MAX_RESULTS);
    },

    getComboValue(key) {
      switch (key) {
        case "owner":
          return this.editOwnerName;
        case "originalOwner":
          return this.editOriginalOwnerName;
        case "combatUnit":
          return this.editCombatUnitType;
        case "combatOwner":
          return this.editCombatUnitOwnerName;
        case "civilianUnit":
          return this.editCivilianUnitType;
        case "civilianOwner":
          return this.editCivilianUnitOwnerName;
        case "overlayOwner":
          return this.overlayOwnerName;
        default:
          return "";
      }
    },

    setComboValue(key, value) {
      switch (key) {
        case "owner":
          this.editOwnerName = value;
          break;
        case "originalOwner":
          this.editOriginalOwnerName = value;
          break;
        case "combatUnit":
          this.editCombatUnitType = value;
          break;
        case "combatOwner":
          this.editCombatUnitOwnerName = value;
          break;
        case "civilianUnit":
          this.editCivilianUnitType = value;
          break;
        case "civilianOwner":
          this.editCivilianUnitOwnerName = value;
          break;
        case "overlayOwner":
          this.overlayOwnerName = value;
          break;
        default:
          break;
      }
    },

    comboOptionValue(key, option) {
      if (!option) {
        return "";
      }
      switch (key) {
        case "owner":
        case "originalOwner":
        case "combatOwner":
        case "civilianOwner":
        case "overlayOwner":
          return option.name || "";
        case "combatUnit":
        case "civilianUnit":
          return option.name || "";
        default:
          return "";
      }
    },

    openCombo(key, options) {
      if (!this.comboOpen || !(key in this.comboOpen)) {
        return;
      }
      this.comboOpen[key] = true;
      this.syncComboHighlight(key, options);
    },

    closeCombo(key) {
      if (!this.comboOpen || !(key in this.comboOpen)) {
        return;
      }
      this.comboOpen[key] = false;
      if (this.comboHighlight && key in this.comboHighlight) {
        this.comboHighlight[key] = -1;
      }
    },

    syncComboHighlight(key, options) {
      if (!this.comboHighlight || !(key in this.comboHighlight)) {
        return;
      }
      if (!options || !options.length) {
        this.comboHighlight[key] = -1;
        return;
      }
      const currentValue = this.getComboValue(key);
      const normalized = String(currentValue || "")
        .trim()
        .toLowerCase();
      let index = -1;
      if (normalized) {
        index = options.findIndex(
          (option) =>
            this.comboOptionValue(key, option).toLowerCase() === normalized
        );
      }
      this.comboHighlight[key] = index >= 0 ? index : 0;
    },

    onComboInput(key, options) {
      if (!this.comboOpen[key]) {
        this.comboOpen[key] = true;
      }
      this.syncComboHighlight(key, options);
    },

    setComboHighlight(key, index) {
      if (!this.comboHighlight || !(key in this.comboHighlight)) {
        return;
      }
      this.comboHighlight[key] = index;
    },

    selectComboOption(key, option, applyFn) {
      const value = this.comboOptionValue(key, option);
      this.setComboValue(key, value);
      if (typeof applyFn === "function") {
        applyFn.call(this);
      }
      this.closeCombo(key);
    },

    handleComboBlur(key, applyFn) {
      this.closeCombo(key);
      if (typeof applyFn === "function") {
        applyFn.call(this);
      }
    },

    onComboKeydown(event, key, options, applyFn) {
      const list = options || [];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!this.comboOpen[key]) {
          this.comboOpen[key] = true;
        }
        if (!list.length) {
          this.setComboHighlight(key, -1);
          return;
        }
        const maxIndex = list.length - 1;
        let index = this.comboHighlight[key];
        if (!Number.isFinite(index) || index < 0 || index > maxIndex) {
          index = event.key === "ArrowUp" ? maxIndex : 0;
        } else {
          index += event.key === "ArrowUp" ? -1 : 1;
          if (index < 0) {
            index = maxIndex;
          }
          if (index > maxIndex) {
            index = 0;
          }
        }
        this.setComboHighlight(key, index);
        return;
      }
      if (event.key === "Enter") {
        if (this.comboOpen[key] && list.length) {
          const index = this.comboHighlight[key];
          if (Number.isFinite(index) && index >= 0 && index < list.length) {
            event.preventDefault();
            this.selectComboOption(key, list[index], applyFn);
            return;
          }
        }
        if (typeof applyFn === "function") {
          applyFn.call(this);
        }
        this.closeCombo(key);
        return;
      }
      if (event.key === "Escape") {
        if (this.comboOpen[key]) {
          event.preventDefault();
          this.closeCombo(key);
        }
      }
    },

    clearUnitEdits() {
      this.clearUnitEditForRole("combat");
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
      if (!this.ensureEditAccess()) {
        return;
      }
      if (this.ownerBrushEnabled) {
        this.ownerBrushMode =
          this.ownerBrushMode === "clear" ? "paint" : "clear";
        return;
      }
      if (!this.selectedTile) {
        return;
      }
      this.selectedTile.owner = null;
      this.selectedTile.customOwner = false;
      this.syncCityOwnerWithTileOwner(this.selectedTile);
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
      if (!this.ownerBrushEnabled || this.ownerBrushMode !== "paint") {
        this.ownerBrushEnabled = true;
        this.ownerBrushMode = "paint";
      } else {
        this.ownerBrushEnabled = false;
      }
      if (!this.ownerBrushEnabled) {
        this.isPaintingOwner = false;
        this.ownerBrushId = null;
        this.flushBrushEdits();
      }
    },

    scheduleBrushApply(tile) {
      if (!tile) {
        return;
      }
      this.brushPendingTile = tile;
      if (this.brushFrameId) {
        return;
      }
      this.brushFrameId = window.requestAnimationFrame(() => {
        this.brushFrameId = null;
        const nextTile = this.brushPendingTile;
        this.brushPendingTile = null;
        if (nextTile) {
          this.applyBrushTile(nextTile);
        }
      });
    },

    applyBrushTile(tile) {
      if (!tile) {
        return;
      }
      const canApply =
        this.ownerBrushMode === "clear" || Number.isFinite(this.ownerBrushId);
      if (!canApply) {
        return;
      }
      const key = tile.key;
      const alreadyTouched = this.brushDirtyKeys
        ? this.brushDirtyKeys.has(key)
        : false;
      this.applyOwnerToTile(tile, this.ownerBrushId, {
        deferSave: true,
        deferBorders: true,
        deferRender: true,
        mode: this.ownerBrushMode,
      });
      if (this.brushDirtyKeys) {
        this.brushDirtyKeys.add(key);
      }
      if (this.useTerrainCanvas && !alreadyTouched) {
        this.drawBrushOverlayTile(tile);
      }
    },

    flushBrushEdits() {
      if (this.brushFrameId) {
        window.cancelAnimationFrame(this.brushFrameId);
        this.brushFrameId = null;
      }
      this.brushPendingTile = null;
      if (!this.brushDirtyKeys || !this.brushDirtyKeys.size) {
        this.clearBrushOverlay();
        return;
      }
      const lookup = this.tileLookup;
      const useMap = lookup instanceof Map;
      this.rebuildOwnerBorders();
      this.brushDirtyKeys.forEach((key) => {
        const tile = useMap ? lookup.get(key) : lookup ? lookup[key] : null;
        if (tile) {
          this.queueTileSave(tile);
        }
      });
      if (this.useTerrainCanvas) {
        this.drawTerrainCanvas();
      }
      this.clearBrushOverlay();
      this.brushDirtyKeys.clear();
    },

    clearBrushOverlay() {
      const canvas = this.$refs.brushCanvas;
      if (!canvas) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    },

    drawBrushOverlayTile(tile) {
      const canvas = this.$refs.brushCanvas;
      if (!canvas || !tile) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const width = this.canvasWidth;
      const height = this.canvasHeight;
      const scale = this.canvasRenderScale || 1;
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const vertices = buildHexVertices(this.hexSize);
      context.beginPath();
      context.moveTo(tile.x + vertices[0].x, tile.y + vertices[0].y);
      for (let i = 1; i < vertices.length; i += 1) {
        context.lineTo(tile.x + vertices[i].x, tile.y + vertices[i].y);
      }
      context.closePath();
      const style = getBrushOverlayStyle({
        mode: this.ownerBrushMode,
        ownerId: this.ownerBrushId,
        ownerColors: this.ownerColors,
      });
      const previousAlpha = context.globalAlpha;
      context.globalAlpha = style.fillAlpha;
      context.fillStyle = style.color;
      context.fill();
      context.globalAlpha = style.strokeAlpha;
      context.lineWidth = 1.5;
      context.strokeStyle = style.color;
      context.stroke();
      context.globalAlpha = previousAlpha;
    },

    applyOwnerToTile(tile, ownerId, options = {}) {
      if (!this.ensureEditAccess() || !tile) {
        return;
      }
      const mode = options.mode || this.ownerBrushMode;
      const change = getBrushOwnerChange({
        tileOwner: tile.owner,
        tileCustomOwner: tile.customOwner,
        ownerId,
        mode,
      });
      if (!change) {
        return;
      }
      tile.owner = change.owner;
      tile.customOwner = change.customOwner;
      if (Number.isFinite(tile.owner)) {
        this.ensureOwnerColors(tile.owner);
      }
      this.syncCityOwnerWithTileOwner(tile);
      if (!options.deferBorders) {
        this.rebuildOwnerBorders();
      }
      if (!options.deferSave) {
        this.queueTileSave(tile);
      }
      if (this.useTerrainCanvas && !options.deferRender) {
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

    syncCityOwnerWithTileOwner(tile) {
      if (!tile || !tile.city) {
        return;
      }
      const nextOwner = Number.isFinite(tile.owner) ? tile.owner : null;
      if (tile.city.owner === nextOwner) {
        return;
      }
      tile.city = {
        ...tile.city,
        owner: nextOwner,
      };
    },

    rebuildOwnerBorders() {
      if (!this.renderOwnerBorders) {
        if (Array.isArray(this.tiles)) {
          this.tiles.forEach((tile) => {
            if (
              tile &&
              Array.isArray(tile.ownerBorderSegments) &&
              tile.ownerBorderSegments.length
            ) {
              tile.ownerBorderSegments = [];
            }
          });
        }
        return;
      }
      this.tiles = buildOwnerBorders(
        this.tiles,
        this.mapConfig.columns,
        this.mapConfig.rows,
        this.ownerSecondaryColors,
        this.hexSize
      );
    },

    scheduleOwnerBordersRebuild() {
      if (!this.deferOwnerBorders) {
        this.rebuildOwnerBorders();
        return;
      }
      if (this.ownerBordersRebuildId) {
        return;
      }
      this.ownerBordersRebuildId = window.requestAnimationFrame(() => {
        this.ownerBordersRebuildId = null;
        this.deferOwnerBorders = false;
        this.rebuildOwnerBorders();
      });
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

function normalizeReligionKey(value) {
  if (!value) {
    return "";
  }
  const input = String(value).trim();
  if (!input) {
    return "";
  }
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/[œŒ]/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9]+/g, "")
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
        ruins: false,
        notes: null,
        owner: Number.isFinite(owner) ? owner : null,
        customOwner: Number.isFinite(owner),
        originalOwner: Number.isFinite(owner) ? owner : null,
        customOriginalOwner: false,
        ownerBorderSegments: [],
        combatUnit,
        civilianUnit,
        city: cityData ? { ...cityData } : null,
        recentlyEditedAt: 0,
        recentlyEditedUntil: 0,
      });
      if (tiles[tiles.length - 1].city && Number.isFinite(owner)) {
        tiles[tiles.length - 1].originalOwner = owner;
      }
      tiles[tiles.length - 1].baseState = buildBaseState(
        tiles[tiles.length - 1]
      );
      tiles[tiles.length - 1].baseStateOriginal = buildBaseState(
        tiles[tiles.length - 1]
      );
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

function cloneUnit(unit) {
  if (!unit) {
    return null;
  }
  return {
    id: Number.isFinite(unit.id) ? unit.id : null,
    type: unit.type,
    owner: Number.isFinite(unit.owner) ? unit.owner : null,
  };
}

function cloneCity(city) {
  if (!city) {
    return null;
  }
  return {
    id: city.id !== undefined && city.id !== null ? city.id : null,
    name: city.name || "",
    size: Number.isFinite(city.size) ? city.size : 1,
    owner: Number.isFinite(city.owner) ? city.owner : null,
    religion: city.religion || "",
    worldWonders: Array.isArray(city.worldWonders)
      ? [...city.worldWonders]
      : [],
    isPuppeted: !!city.isPuppeted,
    isOccupied: !!city.isOccupied,
    isResistance: !!city.isResistance,
    isCustom: !!city.isCustom,
    isCapital: !!city.isCapital,
  };
}

function buildBaseState(tile) {
  if (!tile) {
    return null;
  }
  return {
    owner: Number.isFinite(tile.owner) ? tile.owner : null,
    originalOwner: Number.isFinite(tile.originalOwner)
      ? tile.originalOwner
      : null,
    pillaged: !!tile.pillaged,
    ruins: !!tile.ruins,
    notes: tile.notes || null,
    improvement: tile.improvement || null,
    improvementId: tile.improvementId || "",
    improvementColor: tile.improvementColor || null,
    combatUnit: cloneUnit(tile.combatUnit),
    civilianUnit: cloneUnit(tile.civilianUnit),
    city: cloneCity(tile.city),
  };
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
  return index >= 0 ? ALL_UNITS[index].name : raw;
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
  return index >= 0 ? ALL_UNITS[index].role : "combat";
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

<style>
.tile-map {
  display: grid;
  gap: 0.5rem;
}
.tile-map button {
  user-select: none;
}
.tile-map .tile-map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.tile-map .tile-map-title,
.tile-map .title-map-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-block-end: 1rem;
}
.tile-map .tile-map-subtitle {
  color: color-mix(in srgb, var(--page-text-color), white 25%);
  font-size: 0.95rem;
  margin-block: 0.2rem 0;
  margin-inline: 0;
}
.tile-map .tile-map-subtitle-hint {
  color: color-mix(in srgb, var(--page-text-color), white 40%);
  font-size: 0.85rem;
}
.tile-map .tile-map-controls {
  inline-size: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.tile-map .tile-map-controls .tile-map-control-group {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar {
  inline-size: 100%;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 1rem;
  padding-block: 0.35rem;
  padding-inline: 0.6rem;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar > .tile-map-toolbar-row {
  inline-size: 100%;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-map-toolbar-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-map-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-map-toolbar-spacer {
  min-inline-size: 0.5rem;
  flex: 1 1 auto;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-map-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0;
}
.tile-map
  .tile-map-controls
  .tile-map-auth-toolbar
  .tile-map-mode-toggle
  .tile-edit-button {
  min-block-size: 1.75rem;
  min-inline-size: 4rem;
  font-size: 0.75rem;
  font-weight: 800;
  border-radius: 999px;
}
.tile-map
  .tile-map-controls
  .tile-map-auth-toolbar
  .tile-map-mode-toggle
  .tile-edit-button:first-child {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
.tile-map
  .tile-map-controls
  .tile-map-auth-toolbar
  .tile-map-mode-toggle
  .tile-edit-button:last-child {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.tile-map
  .tile-map-controls
  .tile-map-auth-toolbar
  .tile-map-control-group-compact {
  gap: 0.35rem;
  margin-inline-start: auto;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-edit-auth-actions {
  margin: 0;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-edit-auth-status {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-edit-auth-user {
  font-size: 0.75rem;
}
.tile-map .tile-map-controls .tile-map-auth-toolbar .tile-edit-hint {
  font-size: 0.7rem;
  margin: 0;
}
.tile-map .tile-map-controls .tile-map-control-label {
  color: var(--panel-muted-color);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-map-controls .tile-map-control-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--panel-bg-elevated-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  padding-block: 0.25rem;
  padding-inline: 0.35rem;
}
.tile-map .tile-map-controls .tile-map-control {
  block-size: 2.4rem;
  min-inline-size: 2.4rem;
  color: var(--panel-text-color);
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  padding-inline: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tile-map .tile-map-controls .tile-map-control:hover {
  color: var(--back-color);
  background: var(--accent-color);
}
.tile-map .tile-map-controls .tile-map-control-icon {
  block-size: 2.1rem;
  min-inline-size: 2.1rem;
  font-size: 1.1rem;
  border-radius: 50%;
  border-color: var(--panel-border-color);
  padding: 0;
}
.tile-map .tile-map-controls .tile-map-control-ghost {
  white-space: nowrap;
  background: var(--panel-bg-elevated-color);
  border-color: var(--panel-border-color);
}
.tile-map .tile-map-controls .tile-map-control-ghost:hover {
  color: #111;
  background: rgba(255, 255, 255, 0.92);
}
.tile-map .tile-map-controls .tile-map-scale {
  min-inline-size: 3.2rem;
  color: var(--panel-muted-color);
  text-align: center;
  font-size: 0.9rem;
  font-weight: 800;
}
.tile-map .tile-map-body {
  display: grid;
  align-items: start;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) 24rem;
}
.tile-map .tile-map-body.is-collapsed {
  grid-template-columns: 1fr;
}
.tile-map .tile-map-viewport {
  position: relative;
  block-size: auto;
  min-block-size: 18rem;
  inline-size: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  touch-action: none;
  user-select: none;
}
.tile-map .tile-map-viewport:focus {
  box-shadow: 0 0 0 2px var(--accent-color);
}
.tile-map .tile-map-viewport.dragging {
  cursor: grabbing;
}
.tile-map .tile-map-viewport.brush-active {
  cursor: crosshair;
}
.tile-map .tile-map-viewport .tile-map-loading,
.tile-map .tile-map-viewport .tile-map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--panel-muted-color);
  text-align: center;
  font-weight: 700;
  padding: 1rem;
}
.tile-map .tile-map-viewport .tile-mini-map {
  position: absolute;
  inset-block-end: 0.75rem;
  inset-inline-end: 0.75rem;
  background: rgba(8, 8, 8, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.25rem;
  box-shadow: 0 10px 10px rgba(0, 0, 0, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 0.25rem;
  transform-origin: 100% 100%;
  pointer-events: auto;
}
.tile-map .tile-map-viewport .tile-mini-map.is-embedded {
  inset-block-end: 3rem;
}
.tile-map .tile-map-viewport .tile-mini-toggle {
  position: absolute;
  inset-block-end: 0.75rem;
  inset-inline-end: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  pointer-events: auto;
}
.tile-map .tile-map-viewport .tile-mini-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-block: 0.35rem;
  padding-inline: 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(12, 12, 12, 0.75);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.tile-map .tile-map-viewport .tile-mini-toggle-button:hover {
  transform: translateY(-1px);
  background: rgba(20, 20, 20, 0.85);
}
.tile-map .tile-map-viewport .tile-mini-toggle-button.is-active {
  border-color: var(--accent-color);
}
.tile-map .tile-map-viewport .tile-mini-toggle-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.tile-map .tile-map-viewport .tile-mini-map-canvas {
  display: block;
  cursor: pointer;
}
.tile-map .tile-map-viewport .tile-map-canvas {
  position: relative;
  block-size: 100%;
  inline-size: 100%;
  cursor: grab;
  transform-origin: top left;
}
.tile-map .tile-map-viewport .tile-map-canvas .tile-map-svg,
.tile-map .tile-map-viewport .tile-map-canvas .tile-map-canvas-layer {
  display: block;
}
.tile-map .tile-map-viewport .tile-map-hint {
  position: absolute;
  inset-block-end: 0.75rem;
  inset-inline-start: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 999px;
  padding-block: 0.35rem;
  padding-inline: 0.6rem;
}
.tile-map .tile-map-viewport .tile-map-tooltip-bridge {
  position: absolute;
  z-index: 4;
  background: transparent;
  pointer-events: auto;
}
.tile-map .tile-map-viewport .tile-map-tooltip {
  position: absolute;
  z-index: 5;
  min-inline-size: 12rem;
  max-inline-size: 18rem;
  background: rgba(8, 10, 12, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
  padding-block: 0.7rem;
  padding-inline: 0.85rem;
  pointer-events: auto;
  backdrop-filter: blur(6px);
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-tooltip-title {
  color: color-mix(in srgb, var(--text-color), white 35%);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-block-end: 0.35rem;
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-tooltip-list {
  display: grid;
  gap: 0.35rem;
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-info-row {
  font-size: 0.78rem;
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-info-label {
  color: color-mix(in srgb, var(--text-color), white 30%);
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-info-value {
  color: rgba(245, 247, 250, 0.92);
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-info-notes {
  display: grid;
  gap: 0.35rem;
  border-block-start: 1px solid rgba(255, 255, 255, 0.08);
  padding-block-start: 0.75rem;
  margin-block-start: 0.5rem;
}
.tile-map
  .tile-map-viewport
  .tile-map-tooltip
  .tile-info-notes
  .tile-info-label {
  color: color-mix(in srgb, var(--text-color), white 35%);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-map-viewport .tile-map-tooltip .tile-info-notes-value {
  max-block-size: 6rem;
  overflow: auto;
  color: color-mix(in srgb, var(--text-color), white 20%);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: left;
  white-space: pre-wrap;
  padding-inline-end: 0.25rem;
  text-indent: 0;
}
.tile-map .tile-map-viewport .tile-group {
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-hex {
  fill: #3c3c3c;
  stroke: rgba(0, 0, 0, 0.25);
  stroke-width: 1;
  transition: stroke 0.2s ease;
  paint-order: stroke;
}
.tile-map .tile-map-viewport .tile-hex.is-recent {
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 2;
  animation: recent-pulse 1.5s ease-in-out infinite;
}
.tile-map .tile-map-viewport .tile-hex.is-snapshot-diff {
  stroke: rgba(255, 210, 90, 0.95);
  stroke-width: 2.5;
}
.tile-map .tile-map-viewport .tile-hex.terrain-grass {
  fill: #6b973e;
}
.tile-map .tile-map-viewport .tile-hex.terrain-plains {
  fill: #a0b24d;
}
.tile-map .tile-map-viewport .tile-hex.terrain-desert {
  fill: #d5b866;
}
.tile-map .tile-map-viewport .tile-hex.terrain-tundra {
  fill: #95a994;
}
.tile-map .tile-map-viewport .tile-hex.terrain-snow {
  fill: #d9e4e7;
}
.tile-map .tile-map-viewport .tile-hex.terrain-coast {
  fill: #4796b6;
}
.tile-map .tile-map-viewport .tile-hex.terrain-ocean {
  fill: #28658c;
}
.tile-map .tile-map-viewport .tile-hex.is-pillaged {
  filter: saturate(0.75);
}
.tile-map .tile-map-viewport .tile-selection-outline,
.tile-map .tile-map-viewport .tile-hover-outline {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-selection-outline {
  stroke: #fff;
  stroke-width: 2.5;
}
.tile-map .tile-map-viewport .tile-hover-outline {
  stroke: rgba(255, 255, 255, 0.65);
  stroke-width: 2;
}
.tile-map .tile-map-viewport .tile-owner-overlay {
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-owner-border {
  stroke-width: 2;
  stroke-linejoin: round;
  opacity: 0.85;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-elevation {
  fill: rgba(255, 255, 255, 0.35);
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .tile-feature,
.tile-map .tile-map-viewport .tile-wonder {
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .tile-resource {
  fill: #f3c969;
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .tile-improvement {
  fill: #d7d0c0;
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .tile-ruins {
  stroke-width: 1.1;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-note-pin {
  fill: #ffd25a;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-route {
  stroke: #f3d18c;
  stroke-width: 1.4;
}
.tile-map .tile-map-viewport .tile-citadel {
  fill: rgba(255, 255, 255, 0.92);
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 1.2;
}
.tile-map .tile-map-viewport .tile-river {
  fill: none;
  stroke: #4fc3f7;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.tile-map .tile-map-viewport .tile-unit {
  fill: #111;
  stroke: #fff;
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .tile-unit-label {
  font-size: 5px;
  font-weight: 700;
  fill: #fff;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-unit-marker {
  stroke-width: 1;
  stroke-linejoin: round;
  stroke-linecap: round;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-city {
  fill: #131313;
  stroke: #fff;
  stroke-width: 1.2;
}
.tile-map .tile-map-viewport .tile-city-capital {
  fill: #fff;
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 0.75;
  scale: 1.5;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-city-labels,
.tile-map .tile-map-viewport .tile-city-label {
  pointer-events: none;
}
.tile-map .tile-map-viewport .city-label-pill {
  fill: rgba(86, 42, 36, 0.88);
  stroke: rgba(0, 0, 0, 0.7);
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .city-label-badge {
  fill: rgba(38, 16, 14, 0.9);
  stroke: rgba(0, 0, 0, 0.75);
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .city-label-original-badge {
  stroke-width: 0.6;
}
.tile-map .tile-map-viewport .city-label-text {
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.02em;
  stroke: rgba(0, 0, 0, 0.7);
  stroke-width: 1.2;
  paint-order: stroke;
}
.tile-map .tile-map-viewport .city-label-pop {
  fill: #f5f1e6;
}
.tile-map .tile-map-viewport .city-label-name {
  font-weight: 800;
  fill: #e6c07a;
}
.tile-map .tile-map-viewport .tile-map-pin-overlays,
.tile-map .tile-map-viewport .tile-map-pin-overlay {
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-map-pin-overlay-tip {
  fill: rgba(242, 184, 79, 0.95);
  stroke: rgba(45, 24, 8, 0.9);
  stroke-width: 0.5;
}
.tile-map .tile-map-viewport .tile-map-pin-overlay-dot {
  fill: #ffd37a;
  stroke: rgba(30, 15, 6, 0.9);
  stroke-width: 0.55;
}
.tile-map .tile-map-viewport .tile-map-pin-overlay-core {
  fill: #181005;
}
.tile-map .tile-map-viewport .tile-map-pin-overlay-pill {
  fill: rgba(10, 10, 10, 0.9);
  stroke: rgba(255, 211, 122, 0.72);
  stroke-width: 0.5;
}
.tile-map .tile-map-viewport .tile-map-pin-overlay-text {
  fill: #f6d99a;
  font-size: 6.6px;
  font-weight: 800;
  letter-spacing: 0.01em;
}
@-moz-keyframes recent-pulse {
  0% {
    stroke-opacity: 0.35;
  }
  50% {
    stroke-opacity: 0.9;
  }
  100% {
    stroke-opacity: 0.35;
  }
}
@-webkit-keyframes recent-pulse {
  0% {
    stroke-opacity: 0.35;
  }
  50% {
    stroke-opacity: 0.9;
  }
  100% {
    stroke-opacity: 0.35;
  }
}
@-o-keyframes recent-pulse {
  0% {
    stroke-opacity: 0.35;
  }
  50% {
    stroke-opacity: 0.9;
  }
  100% {
    stroke-opacity: 0.35;
  }
}
@keyframes recent-pulse {
  0% {
    stroke-opacity: 0.35;
  }
  50% {
    stroke-opacity: 0.9;
  }
  100% {
    stroke-opacity: 0.35;
  }
}
.tile-map .tile-map-info {
  position: relative;
  display: grid;
  gap: 0.5rem;
  align-content: start;
}
.tile-map .tile-map-info.is-collapsed {
  align-content: start;
  justify-items: center;
}
.tile-map .tile-map-info.is-collapsed .tile-map-info-header {
  justify-content: center;
}
.tile-map .tile-map-info-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.tile-map .tile-map-info-toggle {
  block-size: 2.5rem;
  inline-size: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--panel-text-color);
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tile-map .tile-map-info-toggle:hover {
  color: var(--back-color);
  background: var(--accent-color);
}
.tile-map .tile-map-info-toggle-icon {
  block-size: 1.4rem;
  inline-size: 1.4rem;
  fill: currentColor;
}
.tile-map .tile-map-toolbar-divider {
  block-size: 1.8rem;
  inline-size: 1px;
  background: var(--panel-border-color);
  margin-inline: 0.5rem;
}
.tile-map .tile-map-info-tabs {
  display: inline-flex;
  align-items: center;
  gap: 0;
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 1rem;
  padding: 0.5rem;
}
.tile-map .tile-map-info-tabs .tile-edit-button {
  border-radius: 0;
}
.tile-map .tile-map-info-tabs .tile-edit-button:first-child {
  border-start-start-radius: 0.75rem;
  border-end-start-radius: 0.75rem;
}
.tile-map .tile-map-info-tabs .tile-edit-button:last-child {
  border-start-end-radius: 0.75rem;
  border-end-end-radius: 0.75rem;
}
.tile-map .tile-map-info-panel {
  display: grid;
  gap: 1rem;
}
.tile-map .tile-info-card {
  color: var(--panel-text-color);
  background: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 14px;
  padding: 1rem;
}
.tile-map .tile-legend-card {
  background: var(--map-legend-card-bg);
  border: 1px solid var(--map-legend-card-border);
  border-radius: 14px;
  padding: 1rem;
}
.tile-map .tile-info-summary {
  display: none;
}
.tile-map .tile-info-title {
  display: flex;
  font-size: 1.25rem;
  font-weight: 800;
  margin-block-end: 0.8rem;
}
.tile-map .tile-info-title-actions {
  display: inline-flex;
  align-items: center;
  margin-inline-start: auto;
}
.tile-map .tile-info-title-meta {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 0.35rem;
  color: var(--panel-muted-color);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--panel-bg-elevated-color);
  border-radius: 999px;
  padding-block: 0.25rem;
  padding-inline: 0.75rem;
  margin-inline-start: 0.75rem;
}
.tile-map .tile-info-title-meta-local {
  color: #1f2b26;
  background: rgba(122, 230, 171, 0.8);
}
.tile-map .tile-map-pins {
  display: grid;
  gap: 0.5rem;
  border: 1px solid var(--panel-border-color);
  border-radius: 12px;
  background: var(--panel-bg-elevated-color);
  padding: 0.7rem;
  margin-block-end: 0.9rem;
}
.tile-map .tile-map-pins-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.6rem;
}
.tile-map .tile-map-pins-label {
  color: var(--panel-text-color);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tile-map .tile-map-pins-hint {
  color: var(--panel-muted-color);
  font-size: 0.74rem;
}
.tile-map .tile-map-pins-save {
  display: flex;
  gap: 0.5rem;
}
.tile-map .tile-map-pin-input {
  flex: 1 1 auto;
  min-inline-size: 0;
}
.tile-map .tile-map-pin-status {
  margin: 0;
}
.tile-map .tile-map-pins-list {
  display: grid;
  gap: 0.4rem;
}
.tile-map .tile-map-pin-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
}
.tile-map .tile-map-pin-jump {
  min-inline-size: 0;
  justify-content: flex-start;
}
.tile-map .tile-map-pin-meta {
  color: var(--panel-muted-color);
  font-size: 0.72rem;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile-map .tile-map-pin-remove {
  font-size: 0.68rem;
}
.tile-map .tile-edit-auth {
  display: grid;
  gap: 0.5rem;
  border-block-end: 1px solid var(--panel-border-color);
  padding-block-end: 0.75rem;
  margin-block-end: 1rem;
}
.tile-map .tile-edit-auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.tile-map .tile-edit-auth-label {
  color: var(--panel-muted-color);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-edit-auth-status {
  color: var(--panel-muted-color);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--panel-bg-elevated-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  padding-block: 0.2rem;
  padding-inline: 0.6rem;
}
.tile-map .tile-edit-auth-status.is-enabled {
  color: #c7f3d1;
  background: rgba(77, 186, 109, 0.18);
  border-color: rgba(129, 210, 145, 0.5);
}
.tile-map .tile-edit-auth-status.is-denied {
  color: #ffd0d0;
  background: rgba(255, 90, 90, 0.18);
  border-color: rgba(255, 161, 161, 0.5);
}
.tile-map .tile-edit-auth-status.is-loading {
  color: var(--panel-muted-color);
  background: var(--panel-bg-elevated-color);
  border-color: var(--panel-border-color);
}
.tile-map .tile-edit-auth-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tile-map .tile-edit-auth-user {
  color: var(--panel-text-color);
  font-size: 0.8rem;
  font-weight: 700;
}
.tile-map .tile-info-list {
  display: grid;
  gap: 0.5rem;
}
.tile-map .tile-info-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.tile-map .tile-info-label {
  color: var(--panel-muted-color);
}
.tile-map .tile-info-value {
  font-weight: 700;
}
.tile-map .tile-info-empty {
  color: var(--panel-muted-color);
  font-size: 0.9rem;
}
.tile-map .tile-edit-form {
  display: grid;
  gap: 1rem;
}
.tile-map .tile-edit-form-locked {
  cursor: help;
}
.tile-map .tile-edit-fieldset {
  min-inline-size: 0;
  display: grid;
  gap: 1rem;
  border: 0;
  padding: 0;
  margin: 0;
}
.tile-map .tile-edit-fieldset:disabled {
  opacity: 0.6;
}
.tile-map .tile-edit-group {
  display: grid;
  gap: 0.25rem;
}
.tile-map .tile-edit-label {
  color: var(--field-label-color);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-edit-units {
  display: grid;
  gap: 0.6rem;
}
.tile-map .tile-edit-units-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}
.tile-map .tile-edit-unit-group {
  display: grid;
  gap: 0.5rem;
}
.tile-map .tile-edit-unit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.tile-map .tile-edit-unit-label {
  color: var(--field-label-color);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-edit-unit-clear {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  padding-inline: 0.7rem;
}
.tile-map .tile-edit-label-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.tile-map .tile-edit-row-split {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 0.325fr));
  gap: 0.5rem;
}
.tile-map .tile-edit-split {
  display: grid;
  gap: 0.35rem;
}
.tile-map .tile-edit-split .tile-edit-row {
  flex-wrap: nowrap;
}
.tile-map .tile-edit-split .tile-edit-input {
  min-inline-size: 0;
}
.tile-map .tile-edit-input-compact {
  max-inline-size: 4rem;
}
.tile-map .tile-edit-checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: var(--panel-text-color);
  font-size: 0.35rem;
  letter-spacing: 0;
  text-transform: none;
  background: var(--panel-bg-elevated-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 999px;
  padding-block: 0.2rem;
  padding-inline: 0.5rem;
  user-select: none;
}
.tile-map .tile-edit-checkbox-inline input {
  block-size: 0.9rem;
  inline-size: 0.9rem;
  accent-color: var(--accent-color);
}
.tile-map .tile-edit-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--panel-text-color);
  font-size: 0.85rem;
  letter-spacing: 0;
  text-transform: none;
}
.tile-map .tile-edit-checkbox input {
  block-size: 1rem;
  inline-size: 1rem;
  accent-color: var(--accent-color);
}
.tile-map .tile-edit-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.tile-map .tile-edit-input {
  min-inline-size: 0;
  inline-size: -webkit-fill-available;
  flex: 1;
  color: var(--panel-text-color);
  font-weight: 700;
  background: var(--panel-bg-elevated-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 8px;
  padding-block: 0.35rem;
  padding-inline: 0.5rem;
}
.tile-map .tile-edit-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.25);
}
.tile-map .tile-edit-input::placeholder {
  color: var(--panel-muted-color);
}
.tile-map .tile-edit-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.tile-map .tile-edit-combobox {
  position: relative;
  min-inline-size: 0;
  flex: 1;
}
.tile-map .tile-edit-combobox-list {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(100% + 0.3rem);
  z-index: 12;
  max-block-size: 14rem;
  display: grid;
  gap: 0.2rem;
  overflow: auto;
  background: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 0.65rem;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  padding: 0.35rem;
}
.tile-map .tile-edit-combobox-option {
  inline-size: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--panel-text-color);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  padding-block: 0.35rem;
  padding-inline: 0.5rem;
  cursor: pointer;
}
.tile-map .tile-edit-combobox-option.is-active,
.tile-map .tile-edit-combobox-option:hover {
  color: var(--back-color);
  background: var(--accent-color);
}
.tile-map .tile-edit-combobox-option-meta {
  font-size: 0.6rem;
  font-weight: 600;
  opacity: 0.7;
}
.tile-map .tile-edit-combobox-empty {
  color: var(--panel-muted-color);
  font-size: 0.7rem;
  padding-block: 0.35rem;
  padding-inline: 0.5rem;
}
.tile-map .tile-edit-button {
  color: var(--panel-text-color);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--field-label-color);
  border-radius: 999px;
  padding-block: 0.35rem;
  padding-inline: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tile-map .tile-edit-button:hover {
  color: var(--back-color);
  background: var(--accent-color);
}
.tile-map .tile-edit-button:disabled {
  color: var(--panel-muted-color);
  background: var(--panel-bg-elevated-color);
  cursor: not-allowed;
  opacity: 0.6;
}
.tile-map .tile-edit-button.is-active {
  color: var(--back-color);
  background: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
}
.tile-map .tile-edit-hint {
  color: var(--panel-muted-color);
  font-size: 0.75rem;
  margin-block: 0.2rem 0;
  margin-inline: 0;
}
.tile-map .tile-map-legend {
  margin-block-start: 0.5rem;
  color: var(--map-legend-text-color);
}
.tile-map .tile-map-legend .terrain-grass {
  background-color: #6b973e;
}
.tile-map .tile-map-legend .terrain-plains {
  background-color: #a0b24d;
}
.tile-map .tile-map-legend .terrain-desert {
  background-color: #d5b866;
}
.tile-map .tile-map-legend .terrain-tundra {
  background-color: #95a994;
}
.tile-map .tile-map-legend .terrain-snow {
  background-color: #d9e4e7;
}
.tile-map .tile-map-legend .terrain-coast {
  background-color: #4796b6;
}
.tile-map .tile-map-legend .terrain-ocean {
  background-color: #28658c;
}
.tile-map .tile-notes-card {
  margin-block-end: 0.75rem;
}
.tile-map .tile-notes-card .tile-info-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.6rem;
}
.tile-map .tile-notes-text {
  color: var(--panel-text-color);
  font-size: 0.9rem;
  line-height: 1.45;
  white-space: pre-wrap;
}
.tile-map .tile-notes-body {
  display: grid;
  gap: 0.6rem;
}
.tile-map .tile-notes-editor {
  display: grid;
  gap: 0.5rem;
}
.tile-map .tile-notes-input {
  min-block-size: 6rem;
  resize: vertical;
}
.tile-map .tile-snapshot-card {
  margin-block-end: 0.75rem;
}
.tile-map .tile-overlay-card {
  margin-block-end: 0.75rem;
}
.tile-map .tile-overlay-body {
  display: grid;
  gap: 0.75rem;
}
.tile-map .tile-overlay-body .tile-map-mode-toggle {
  display: inline-flex;
  inline-size: fit-content;
  align-items: center;
  gap: 0;
}
.tile-map .tile-overlay-body .tile-map-mode-toggle .tile-edit-button {
  border-radius: 0;
}
.tile-map
  .tile-overlay-body
  .tile-map-mode-toggle
  .tile-edit-button:first-child {
  border-start-start-radius: 0.75rem;
  border-end-start-radius: 0.75rem;
}
.tile-map
  .tile-overlay-body
  .tile-map-mode-toggle
  .tile-edit-button:last-child {
  border-start-end-radius: 0.75rem;
  border-end-end-radius: 0.75rem;
}
.tile-map .tile-overlay-section {
  display: grid;
  gap: 0.65rem;
}
.tile-map .tile-overlay-contrast-toggles {
  display: grid;
  gap: 0.45rem;
  border-block-start: 1px solid var(--panel-border-color);
  padding-block-start: 0.55rem;
}
.tile-map .tile-overlay-contrast-toggles .tile-edit-checkbox {
  font-size: 0.78rem;
}
.tile-map .tile-overlay-metrics {
  display: grid;
  gap: 0.45rem;
  border-block-start: 1px solid var(--panel-border-color);
  padding-block-start: 0.55rem;
}
.tile-map .tile-overlay-ranking {
  display: grid;
  gap: 0.4rem;
  border-block-start: 1px solid var(--panel-border-color);
  padding-block-start: 0.55rem;
}
.tile-map .tile-overlay-ranking-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--panel-text-color);
  font-size: 0.82rem;
}
.tile-map .tile-overlay-ranking-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 700;
}
.tile-map .tile-overlay-ranking-value {
  color: var(--panel-muted-color);
  font-weight: 700;
}
.tile-map .tile-overlay-religion-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
}
.tile-map .tile-snapshot-body {
  display: grid;
  gap: 0.75rem;
}
.tile-map .tile-snapshot-diff {
  display: grid;
  gap: 0.4rem;
  border-block-start: 1px solid var(--panel-border-color);
  padding-block-start: 0.5rem;
}
.tile-map .tile-snapshot-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.75rem;
}
.tile-map .tile-snapshot-legend-label {
  color: var(--field-label-color);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-snapshot-chip {
  color: var(--field-label-color);
  font-weight: 700;
  background: rgba(255, 210, 90, 0.15);
  border-radius: 999px;
  padding-block: 0.2rem;
  padding-inline: 0.5rem;
}
.tile-map .tile-snapshot-diff-list {
  max-block-size: 8rem;
  display: grid;
  gap: 0.25rem;
  overflow: auto;
  color: var(--panel-text-color);
  font-size: 0.8rem;
  padding-inline-end: 0.35rem;
}
.tile-map .tile-snapshot-diff-item {
  font-weight: 700;
}
.tile-map .tile-snapshot-diff-section {
  display: grid;
  gap: 0.25rem;
  border-block-end: 1px solid var(--panel-border-color);
  padding-block-end: 0.4rem;
}
.tile-map .tile-snapshot-diff-section summary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  list-style: none;
}
.tile-map .tile-snapshot-diff-section summary::-webkit-details-marker {
  display: none;
}
.tile-map .tile-snapshot-diff-section summary::before {
  content: "";
  block-size: 0;
  inline-size: 0;
  border-block-start: 5px solid transparent;
  border-block-end: 5px solid transparent;
  border-inline-start: 7px solid var(--panel-muted-color);
  transition: transform 0.2s ease;
}
.tile-map .tile-snapshot-diff-section[open] summary::before {
  transform: rotate(90deg);
}
.tile-map .tile-snapshot-diff-section:last-child {
  border-block-end: 0;
  padding-block-end: 0;
}
.tile-map .tile-snapshot-diff-title {
  color: var(--field-label-color);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-snapshot-diff-empty {
  color: var(--panel-muted-color);
  font-size: 0.75rem;
}
.tile-map .tile-snapshot-diff-more {
  color: var(--panel-muted-color);
  font-size: 0.75rem;
}
.tile-map .tile-snapshot-admin-list {
  display: grid;
  gap: 0.4rem;
  margin-block-start: 0.6rem;
}
.tile-map .tile-snapshot-admin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.tile-map .tile-snapshot-admin-meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tile-map .tile-snapshot-admin-label {
  color: var(--panel-text-color);
  font-size: 0.8rem;
  font-weight: 700;
}
.tile-map .tile-snapshot-admin-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding-block: 0.1rem;
  padding-inline: 0.45rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-snapshot-admin-status.is-published {
  background: rgba(255, 191, 70, 0.16);
  color: #ffbf46;
  border: 1px solid rgba(255, 191, 70, 0.45);
}
.tile-map .tile-snapshot-admin-status.is-draft {
  background: var(--panel-bg-elevated-color);
  color: var(--panel-muted-color);
  border: 1px solid var(--panel-border-color);
}
.tile-map .tile-legend-section {
  margin-block-start: 1rem;
}
.tile-map .tile-legend-accordion {
  background: var(--map-legend-section-bg);
  border: 1px solid var(--map-legend-section-border);
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  padding-block: 0.6rem 0.75rem;
  padding-inline: 0.75rem;
}
.tile-map .tile-legend-accordion[open] {
  background: var(--map-legend-section-open-bg);
}
.tile-map .tile-legend-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: var(--map-legend-text-color);
  outline: none;
  cursor: pointer;
  list-style: none;
}
.tile-map .tile-legend-summary::-webkit-details-marker {
  display: none;
}
.tile-map .tile-legend-summary:focus-visible {
  border-radius: 10px;
  box-shadow: 0 0 0 2px var(--accent-color);
}
.tile-map .tile-legend-title {
  color: var(--map-legend-text-color);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tile-map .tile-legend-grid {
  inline-size: 100%;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
}
.tile-map .tile-legend-accordion .tile-legend-grid {
  margin-block-start: 0.6rem;
}
.tile-map .tile-legend-scroll {
  max-block-size: 12rem;
  overflow-y: auto;
  padding-inline-end: 0.2rem;
}
.tile-map .tile-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--map-legend-text-color);
  font-size: 0.85rem;
}
.tile-map .legend-label {
  color: var(--map-legend-text-color);
}
.tile-map .legend-swatch {
  block-size: 1rem;
  inline-size: 1rem;
  border: 2px solid var(--map-legend-swatch-border);
  border-radius: 4px;
}
.tile-map .legend-hex,
.tile-map .legend-hex-outline {
  clip-path: polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%);
}
.tile-map .legend-hex-outline {
  background: transparent;
  border-width: 2px;
}
.tile-map .legend-triangle {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
.tile-map .legend-circle {
  border-radius: 50%;
}
.tile-map .legend-star {
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
.tile-map .legend-diamond {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.tile-map .legend-trapezoid {
  clip-path: polygon(22% 18%, 78% 18%, 92% 88%, 8% 88%);
}
.tile-map .legend-square {
  border-radius: 4px;
}
.tile-map .legend-line {
  position: relative;
  block-size: 0.6rem;
  inline-size: 1.5rem;
  background: transparent;
  border: none;
}
.tile-map .legend-line::before {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 50%;
  content: "";
  block-size: 2px;
  background: currentColor;
  border-radius: 999px;
  transform: translateY(-50%);
}
.tile-map .legend-feature {
  border-radius: 50%;
}
.tile-map .legend-wonder {
  border-radius: 6px;
}
.tile-map .legend-resource,
.tile-map .legend-improvement {
  border-radius: 3px;
}
.tile-map .legend-route {
  background: #f3d18c;
  border-radius: 8px;
}
.tile-map .elevation-hill {
  fill: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.35);
}
.tile-map .elevation-mountain {
  fill: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.6);
}
.tile-map .resource-strategic {
  fill: #ff7043;
}
.tile-map .resource-bonus {
  fill: #81c784;
}
.tile-map .resource-luxury {
  fill: #ffd54f;
}
.tile-map .improvement-farm {
  fill: #c7a85a;
}
.tile-map .improvement-mine {
  fill: #8b8b8b;
}
.tile-map .improvement-pasture {
  fill: #c0b08d;
}
.tile-map .improvement-plantation {
  fill: #b9965a;
}
.tile-map .improvement-camp {
  fill: #a8764f;
}
.tile-map .improvement-boats {
  fill: #6fa8dc;
}
.tile-map .improvement-quarry {
  fill: #9e9e9e;
}
.tile-map .improvement-lumber {
  fill: #7a6a5c;
}
.tile-map .improvement-trade {
  fill: #8bc34a;
}
.tile-map .improvement-well {
  fill: #607d8b;
}
.tile-map .improvement-fort {
  fill: #6d4c41;
}
.tile-map .improvement-landmark {
  fill: #ffcc80;
}
.tile-map .improvement-special {
  fill: #b0bec5;
}
.tile-map .route-road {
  color: #f3d18c;
  stroke: #f3d18c;
  background: #f3d18c;
}
.tile-map .route-railroad {
  color: #cfd8dc;
  stroke: #cfd8dc;
  background: #cfd8dc;
}
@media (max-width: 900px) {
  .tile-map .tile-map-body {
    grid-template-columns: 1fr;
  }
  .tile-map .tile-map-info {
    order: 2;
  }
  .tile-map .tile-map-legend {
    order: 3;
  }
  .tile-map .tile-map-controls {
    inline-size: 100%;
    flex-wrap: wrap;
    gap: 0.5rem;
    overflow-x: hidden;
  }
  .tile-map .tile-map-controls .tile-map-control-group {
    flex-wrap: wrap;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .tile-map .tile-map-controls .tile-map-auth-toolbar {
    flex-wrap: wrap;
    min-inline-size: 0;
  }
  .tile-map .tile-map-controls .tile-map-auth-toolbar .tile-map-toolbar-row {
    flex-wrap: wrap;
    min-inline-size: 0;
  }
  .tile-map .tile-map-control {
    block-size: 2.8rem;
    min-inline-size: 2.8rem;
    max-inline-size: 100%;
    font-size: 0.95rem;
    padding-inline: 0.9rem;
  }
  .tile-map .tile-map-control-pill {
    inline-size: fit-content;
    max-inline-size: 100%;
    justify-content: space-between;
  }
  .tile-map .tile-map-viewport {
    min-block-size: 15rem;
  }
  .tile-map .tile-mini-map {
    inset-block-end: 0.6rem;
    inset-inline-end: 0.6rem;
    padding: 0.2rem;
    transform: scale(0.85);
  }
  .tile-map .tile-info-accordion {
    padding-block: 0.8rem 0.9rem;
    padding-inline: 0.9rem;
  }
  .tile-map .tile-info-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    color: var(--panel-muted-color);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    list-style: none;
  }
  .tile-map .tile-info-summary::-webkit-details-marker {
    display: none;
  }
  .tile-map .tile-info-accordion > .tile-info-title {
    display: none;
  }
  .tile-map .tile-info-accordion[open] .tile-info-summary {
    margin-block-end: 0.75rem;
  }
  .tile-map .tile-map-info-tabs {
    inline-size: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
    padding: 0.35rem;
  }
  .tile-map .tile-map-info-tabs .tile-edit-button {
    border-radius: 0.65rem;
    min-block-size: 2.15rem;
    font-size: 0.82rem;
    letter-spacing: 0.02em;
    padding-inline: 0.5rem;
  }
  .tile-map .tile-map-info-tabs .tile-edit-button:first-child,
  .tile-map .tile-map-info-tabs .tile-edit-button:last-child {
    border-radius: 0.65rem;
  }
  .tile-map .tile-info-card,
  .tile-map .tile-legend-card {
    padding: 0.85rem;
  }
  .tile-map .tile-edit-input,
  .tile-map .tile-edit-button {
    min-block-size: 2.15rem;
    font-size: 0.9rem;
  }
  .tile-map .tile-edit-unit-clear {
    font-size: 0.68rem;
    padding-inline: 0.55rem;
  }
  .tile-map .tile-edit-checkbox-inline {
    font-size: 0.72rem;
    gap: 0.35rem;
    padding-block: 0.3rem;
    padding-inline: 0.6rem;
  }
  .tile-map .tile-info-row,
  .tile-map .tile-overlay-ranking-item {
    font-size: 0.92rem;
  }
  .tile-map .tile-info-label,
  .tile-map .tile-overlay-ranking-label {
    max-inline-size: 75%;
    overflow-wrap: anywhere;
  }
  .tile-map .tile-info-value,
  .tile-map .tile-overlay-ranking-value {
    flex: 0 0 auto;
    text-align: right;
    white-space: nowrap;
  }
  .tile-map .tile-snapshot-diff-list {
    max-block-size: 10rem;
  }
  .tile-map .tile-edit-units-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .tile-map .tile-edit-row-split {
    grid-template-columns: minmax(0, 1fr);
  }
  .tile-map .tile-map-pin-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.3rem 0.45rem;
  }
  .tile-map .tile-map-pin-jump {
    grid-column: 1 / 2;
  }
  .tile-map .tile-map-pin-remove {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }
  .tile-map .tile-map-pin-meta {
    grid-column: 1 / 3;
  }
}
@media (max-width: 799px) {
  .tile-map .tile-map-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .tile-map .tile-map-body.is-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }
  .tile-map .tile-map-viewport {
    min-block-size: 14rem;
  }
  .tile-map .tile-map-toolbar-spacer {
    display: none;
  }
  .tile-map .tile-map-control-group-compact {
    gap: 0.5rem !important;
    margin-inline-start: 0 !important;
  }
  .tile-map .tile-map-toolbar-toggle,
  .tile-map .tile-map-toolbar-divider {
    display: none;
  }
  .tile-map .tile-map-info {
    gap: 0.75rem;
  }
  .tile-map .tile-edit-form,
  .tile-map .tile-overlay-body,
  .tile-map .tile-snapshot-body {
    gap: 0.85rem;
  }
  .tile-map .tile-edit-row {
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .tile-map .tile-edit-row > .tile-edit-button {
    flex: 0 0 auto;
  }
  .tile-map .tile-edit-group {
    gap: 0.4rem;
  }
  .tile-map .tile-edit-label {
    font-size: 0.72rem;
  }
  .tile-map .tile-overlay-ranking,
  .tile-map .tile-overlay-metrics {
    gap: 0.55rem;
  }
  .tile-map .tile-snapshot-diff-title {
    font-size: 0.78rem;
  }
  .tile-map .tile-snapshot-diff-list {
    max-block-size: 12rem;
    font-size: 0.84rem;
  }
  .tile-map .tile-mini-map {
    inset-block-end: 0.5rem;
    inset-inline-end: 0.5rem;
    padding: 0.15rem;
    transform: scale(0.7);
  }
}
</style>
