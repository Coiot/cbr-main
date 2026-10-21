<template>
  <section ref="mapRoot" class="tile-map" :class="{ 'is-fullscreen': isMapFullscreen }" @keydown="onMapViewKeydown">
    <div v-if="!embedded" class="tile-map-header">
      <div v-if="showMapHeading" class="tile-map-meta">
        <!-- <h2 class="tile-map-title">{{ mapName || "Map Viewer" }}</h2>
        <p class="tile-map-subtitle" v-if="mapDescription">
          {{ mapDescription }}
        </p> -->
        <div class="tile-map-heading"><h1 class="title-map-title">{{archiveMode?'Community archive':'Community Tile Map'}}</h1><span v-if="localEditsEnabled" class="tile-map-local-badge" role="status">Local only</span></div>
        <!-- <p class="tile-map-subtitle tile-map-subtitle-hint">
          {{ officialSource ? 'Drag to pan. Select a tile to view details.' : archiveMode ? 'Preserved community snapshots. Select an episode to explore its original map.' : 'Drag to pan. Click a tile to view details. Supporters can edit the live map.' }}
        </p> -->
      </div>
      <MapToolbar :scale-label="scaleLabel" :mini-map-enabled="miniMapEnabled" :show-shortcuts="showMapShortcuts"
        :private-preview="!!officialSource?.preview"
        :fullscreen="isMapFullscreen" :panel-collapsed="editPanelCollapsed" :view-unavailable="isLoading || !tiles.length"
        @zoom-out="zoomOut" @zoom-in="zoomIn" @fit="fitToView"
        @browse-views="$refs.savedViews.open($event)" @save-view="$refs.savedViews.create()" @copy-view="copyMapViewLink"
        @toggle-mini-map="toggleMiniMap" @toggle-shortcuts="showMapShortcuts = !showMapShortcuts"
        @toggle-fullscreen="toggleMapFullscreen" @toggle-panel="toggleEditPanel" />
    </div>
    <slot v-if="!embedded" name="map-timeline" />
    <div v-if="!embedded && (mapViewStatus || showMapShortcuts)" class="tile-map-view-help">
      <p v-if="mapViewStatus" role="status">{{ mapViewStatus }}</p>
      <input v-if="showMapViewLink" ref="mapViewLink" class="tile-edit-input" :value="mapViewLink" readonly aria-label="Link to this map view" @focus="$event.target.select()" />
      <p v-if="showMapShortcuts">Focus the map with Tab. Arrow keys pan; Shift + arrow keys select neighboring tiles;
        Enter opens tile details. + / − zoom, F fits the map, ? toggles this guide, and Escape closes details or fullscreen.</p>
    </div>
    <SavedMapViews v-if="!embedded && !officialSource?.preview" ref="savedViews" :client="supabase" :user="authUser" :allowed="viewLayerTools?viewLayerTools.allowed:canEdit" :layer-tools="viewLayerTools" :checking="authChecking"
      :access-failed="supporterCheckFailed" :supporter-status="supporterStatus" :local="localEditsEnabled" :admin="isAdmin"
      :map-ready="!!tiles.length && !isLoading && !loadError && !isLiveSyncing && !liveSyncError" :map-id="savedViewsMapId" :snapshots="snapshots"
      :get-settings="captureMapViewSettings" :active-view="activeSavedView" :loading-view="savedViewLoading" :view-error="savedViewError"
      @open-view="openSavedMapView" @reset="retrySavedMapView" @close-view="closeSavedMapView" @changed="handleSavedViewChanged" />
    <span class="tile-map-screen-reader" role="status" aria-live="polite" aria-atomic="true">{{ selectedTileAnnouncement }}</span>
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
        @wheel.prevent="onWheel"
        @keydown="onKeydown"
      >
        <div v-if="!isLoading && (isLiveSyncing || liveSyncError)" class="tile-map-sync-status" role="status">
          <template v-if="isLiveSyncing">Updating to the latest map…</template>
          <template v-else>
            {{ liveSyncError }}
            <button type="button" @pointerdown.stop @pointerup.stop @click.stop="refreshLiveMap">Retry</button>
          </template>
        </div>
        <div v-if="isLoading" class="tile-map-loading">Loading map data...</div>
        <div v-else-if="loadError" class="tile-map-error">
          {{ loadError }}
        </div>
        <div v-else-if="!tiles.length" class="tile-map-error">
          No tile data found.
        </div>
        <div v-else class="tile-map-canvas" :style="canvasStyle">
          <template v-if="useTerrainCanvas">
            <canvas
              ref="terrainCanvas"
              class="tile-map-canvas-layer"
              :width="canvasWidth"
              :height="canvasHeight"
              aria-hidden="true"
            ></canvas>
            <canvas v-for="copy in wrapCopies" :key="`terrain-${copy}`" ref="terrainWrapCanvases"
              class="tile-map-canvas-layer" :width="canvasWidth" :height="canvasHeight"
              :style="{ transform: `translateX(${copy * worldPeriod}px)` }" aria-hidden="true" />
            <canvas
              v-if="ownerBrushEnabled"
              ref="brushCanvas"
              class="tile-map-canvas-layer tile-map-brush-layer"
              :width="canvasWidth"
              :height="canvasHeight"
              aria-hidden="true"
            ></canvas>
            <template v-if="ownerBrushEnabled"><canvas v-for="copy in wrapCopies" :key="`brush-${copy}`" ref="brushWrapCanvases"
              class="tile-map-canvas-layer tile-map-brush-layer" :width="canvasWidth" :height="canvasHeight"
              :style="{ transform: `translateX(${copy * worldPeriod}px)` }" aria-hidden="true" /></template>
            <svg
              :style="{ overflow: wrapActive ? 'visible' : 'hidden' }"
              class="tile-map-interaction-layer"
              :width="gridWidth"
              :height="gridHeight"
              :viewBox="`0 0 ${gridWidth} ${gridHeight}`"
              aria-hidden="true"
            >
              <g v-for="copy in visibleWorldCopies" :key="copy" :transform="`translate(${copy * worldPeriod}, 0)`">
              <polygon v-if="hoveredTile" class="tile-hover-outline" :points="hexPoints"
                :transform="`translate(${hoveredTile.x}, ${hoveredTile.y})`" />
              <polygon v-if="selectedTile" class="tile-selection-outline" :points="hexPoints"
                :transform="`translate(${selectedTile.x}, ${selectedTile.y})`" />
              </g>
            </svg>
          </template>
          <svg
            v-else
            class="tile-map-svg"
            :style="{ overflow: wrapActive ? 'visible' : 'hidden' }"
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
              <symbol id="feature-hex" overflow="visible">
                <polygon :points="featureHexPoints" />
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
            <g v-for="world in visibleTileWorlds" :key="world.copy" :transform="`translate(${world.copy * worldPeriod}, 0)`">
            <g
              v-for="tile in world.tiles"
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
              <use
                v-if="showDecorations && tile.feature"
                class="tile-feature"
                href="#feature-hex"
                xlink:href="#feature-hex"
                :style="featureStyle(tile)"
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
              v-if="showDecorations && world.rivers.paths.length"
              class="tile-river-overlay"
            >
              <path
                v-for="(path, index) in world.rivers.paths"
                :key="`river-back-${index}`"
                class="tile-river tile-river-back"
                :d="riverOverlayPathData(path)"
                :style="riverOverlayLayerStyle('back')"
              />
              <path
                v-for="(path, index) in world.rivers.paths"
                :key="`river-mid-${index}`"
                class="tile-river tile-river-mid"
                :d="riverOverlayPathData(path)"
                :style="riverOverlayLayerStyle('mid')"
              />
              <path
                v-for="(path, index) in world.rivers.paths"
                :key="`river-top-${index}`"
                class="tile-river tile-river-top"
                :d="riverOverlayPathData(path)"
                :style="riverOverlayLayerStyle('top')"
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
            <g v-if="world.cityLabels.length" class="tile-city-labels">
              <MapCityBanner
                v-for="tile in world.cityLabels"
                :key="`city-name-${tile.key}`"
                :tile="tile"
                :hex-size="hexSize"
                :owner-colors="ownerColors"
                :owner-secondary-colors="ownerSecondaryColors"
                :large="contrastLargeCityBanners"
              />
            </g>
            <g
              v-if="world.pins.length"
              class="tile-map-pin-overlays"
              aria-hidden="true"
            >
              <g
                v-for="pin in world.pins"
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
            </g>
          </svg>
          <svg v-if="recentEditTiles.length && !snapshotViewId" class="tile-map-interaction-layer"
            :style="{ overflow: wrapActive ? 'visible' : 'hidden' }"
            :width="gridWidth" :height="gridHeight" :viewBox="`0 0 ${gridWidth} ${gridHeight}`" aria-hidden="true">
            <g v-for="copy in visibleWorldCopies" :key="copy" :transform="`translate(${copy * worldPeriod}, 0)`">
            <polygon v-for="entry in recentEditTiles" :key="entry.animationKey" class="tile-recent-outline"
              :points="hexPoints" :transform="`translate(${entry.x}, ${entry.y})`"
              :style="{ animationDuration: `${entry.durationMs}ms` }" />
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
            <div v-if="hoverTooltipTile.improvement" class="tile-info-row"><div class="tile-info-label">Improvement</div><div class="tile-info-value">{{formatLabel(hoverTooltipTile.improvement)}}</div></div>
            <div v-if="hoverTooltipTile.ruins" class="tile-info-row"><div class="tile-info-label">Ruins</div><div class="tile-info-value">Former city site</div></div>
            <div v-if="hoverTooltipTile.ideology" class="tile-info-row"><div class="tile-info-label">Ideology</div><div class="tile-info-value">{{hoverTooltipTile.ideology}}</div></div>
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
            <div v-for="(unit,index) in officialSource ? (hoverTooltipTile.units||[]) : []" :key="`detail-unit-${index}`" class="tile-info-row"><div class="tile-info-label">{{unit.role==='civilian'?'Civilian Unit':'Combat Unit'}}</div><div class="tile-info-value">{{describeUnit(unit)}}</div></div>
            <div v-if="!officialSource && hoverTooltipTile.combatUnit" class="tile-info-row">
              <div class="tile-info-label">Combat Unit</div>
              <div class="tile-info-value">
                {{ describeUnit(hoverTooltipTile.combatUnit) }}
              </div>
            </div>
            <div v-if="!officialSource && hoverTooltipTile.civilianUnit" class="tile-info-row">
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
            <button v-if="extraPanelLabel"
              type="button" class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'extra' }"
              :aria-pressed="editPanelTab === 'extra'"
              @click="editPanelTab = 'extra'"
            >{{extraPanelLabel}}</button>
            <button
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'overlays' }"
              @click="editPanelTab = 'overlays'"
            >
              Overlays
            </button>
            <button v-if="!officialSource"
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'snapshots' }"
              @click="editPanelTab = 'snapshots'"
            >
              Snapshots
            </button>
            <button v-if="!officialSource || detailEditing"
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'edit' }"
              @click="editPanelTab = 'edit'"
            >
              Edit
            </button>
            <button v-if="!officialSource || detailEditing"
              type="button"
              class="tile-edit-button"
              :class="{ 'is-active': editPanelTab === 'notes' }"
              :disabled="!showNotesTab"
              @click="editPanelTab = 'notes'"
            >
              Notes
            </button>
          </div>
        </div>
        <div
          v-show="!editPanelCollapsed || isMobileView"
          class="tile-map-info-panel"
        >
          <div v-if="extraPanelLabel" v-show="editPanelTab === 'extra'"><slot name="extra-panel" /></div>
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
                v-if="localEditsEnabled || officialSource?.preview"
                class="tile-info-title-meta tile-info-title-meta-local"
              >
                Local Only
              </span>
              <span class="tile-info-title-actions">
                <button
                  v-if="!localEditsEnabled && !officialSource"
                  type="button"
                  class="tile-edit-button"
                  title="Undoes last 60 seconds of edits"
                  :disabled="!editAccessAllowed || undoLoading"
                  @click="undoRecentEdits"
                >
                  Undo
                </button>
              </span>
            </div>

            <div v-if="!officialSource" class="tile-edit-mode-controls">
              <span class="tile-edit-label">Editing mode</span>
              <div class="tile-edit-mode-toggle" role="group" aria-label="Editing mode">
                <button type="button" class="tile-edit-button" :class="{ 'is-active': !localEditsEnabled }" :aria-pressed="!localEditsEnabled" @click="setLocalEdits(false)">Live</button>
                <button type="button" class="tile-edit-button" :class="{ 'is-active': localEditsEnabled }" :aria-pressed="localEditsEnabled" @click="setLocalEdits(true)">Local</button>
              </div>
            </div>
            <FeatureNotice :notice="editAccessNotice" @action="handleEditAccessAction" />
            <slot name="edit-layer-tools" :tile="selectedTile" />
            <p v-if="detailEditError || detailEditStatus" class="tile-edit-hint" role="status">{{detailEditError || detailEditStatus}}</p>
            <div
              v-if="selectedTile"
              class="tile-edit-form"
              :class="{ 'tile-edit-form-locked': !editAccessAllowed }"
              :title="editAccessNotice?.message || null"
            >
              <fieldset
                class="tile-edit-fieldset"
                :disabled="!editAccessAllowed"
              >
                <div v-if="!officialSource" class="tile-edit-group">
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
                  v-if="selectedTile && selectedTile.city && !officialSource"
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
                <div v-if="!officialSource" class="tile-edit-group">
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
                  v-if="selectedTile && selectedTile.city && !officialSource"
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
                          :max="officialSource?10000:99"
                          v-model.number="editCityValue"
                          @keydown.enter.prevent="applyCityEdit"
                          @blur="applyCityEdit"
                          @change="applyCityEdit"
                          @input="scheduleFieldEdit('cityValue')"
                        />
                        <button
                          v-if="!officialSource"
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
                <div v-if="officialSource" class="tile-edit-group tile-edit-units">
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
                </div>
                <template v-if="officialSource">
                  <div v-if="!selectedTile.city" class="tile-edit-group">
                    <label class="tile-edit-label" for="tile-improvement-input">Improvement</label>
                    <input id="tile-improvement-input" class="tile-edit-input" v-model="editImprovement" maxlength="160" @change="applySupplementalDetailEdit('improvement')" @keydown.enter.prevent="applySupplementalDetailEdit('improvement')" />
                    <label class="tile-edit-label" for="tile-route-input">Route</label>
                    <select id="tile-route-input" class="tile-edit-input" v-model="editRoute" @change="applySupplementalDetailEdit('route')"><option value="">None</option><option value="road">Road</option><option value="railroad">Railroad</option></select>
                  </div>
                  <div v-if="Number.isFinite(selectedTile.owner)" class="tile-edit-group">
                    <label class="tile-edit-label" for="tile-ideology-input">Civilization ideology</label>
                    <input id="tile-ideology-input" class="tile-edit-input" v-model="editIdeology" maxlength="160" @change="applySupplementalDetailEdit('ideology')" @keydown.enter.prevent="applySupplementalDetailEdit('ideology')" />
                  </div>
                </template>
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
              <p v-if="!officialSource" class="tile-edit-hint">
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
            <slot name="tile-notes" :tile="selectedTile">
            <div v-if="selectedTile" class="tile-notes-body">
              <FeatureNotice :notice="editAccessNotice" @action="handleEditAccessAction" />
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
            </slot>
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
                    <option v-if="!archiveMode" value="">Live map</option>
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
                    <option v-if="snapshotViewId && !archiveMode" value="__live__">
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
            <div class="tile-overlay-header">
              <div class="tile-info-title">Overlays</div>
              <label class="tile-map-overlay-toggle">
                <input type="checkbox" v-model="overlayEnabled" />
                <span>Show on map</span>
              </label>
            </div>
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
                <button v-if="!officialSource"
                  type="button"
                  class="tile-edit-button"
                  :class="{ 'is-active': overlayView === 'population' }"
                  @click="overlayView = 'population'"
                >
                  Population
                </button>
                <button v-if="!officialSource"
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
                <p v-if="officialSource" class="tile-edit-hint">Population recorded for {{recordedPopulationCoverage.known}} of {{recordedPopulationCoverage.total}} cities at this turn. A civilization is coloured only when all its city populations are recorded.</p>
                <div class="tile-info-list tile-overlay-metrics">
                  <div class="tile-info-row">
                    <div class="tile-info-label">{{officialSource?'Recorded Population':'Total Population'}}</div>
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
                <p v-if="officialSource" class="tile-edit-hint">Uses the recorded majority religion of each current capital. Civilizations without a recorded capital religion remain uncoloured.</p>
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
                  <label class="tile-edit-checkbox check-row">
                    <input type="checkbox" v-model="contrastHideDecorations" />
                    <span class="check-row-copy">
                      <span class="check-row-title">Hide Terrain Details</span>
                      <span class="check-row-hint">
                        Simplifies the map by removing terrain glyph overlays.
                      </span>
                    </span>
                  </label>
                  <label class="tile-edit-checkbox check-row">
                    <input type="checkbox" v-model="contrastFlattenLandWater" />
                    <span class="check-row-copy">
                      <span class="check-row-title"
                        >Flatten Terrain Colors</span
                      >
                      <span class="check-row-hint">
                        Uses a simpler land/water palette for stronger contrast.
                      </span>
                    </span>
                  </label>
                  <label class="tile-edit-checkbox check-row">
                    <input type="checkbox" v-model="contrastGrayscaleTerrain" />
                    <span class="check-row-copy">
                      <span class="check-row-title">Grayscale Terrain</span>
                      <span class="check-row-hint">
                        Desaturates terrain colors so ownership overlays stand
                        out.
                      </span>
                    </span>
                  </label>
                  <label class="tile-edit-checkbox check-row">
                    <input
                      type="checkbox"
                      v-model="contrastBoostOwnerOpacity"
                    />
                    <span class="check-row-copy">
                      <span class="check-row-title">
                        Increase Civilization Opacity
                      </span>
                      <span class="check-row-hint">
                        Makes owner overlays denser and easier to compare.
                      </span>
                    </span>
                  </label>
                  <label class="tile-edit-checkbox check-row">
                    <input type="checkbox" v-model="contrastLargeCityBanners" />
                    <span class="check-row-copy">
                      <span class="check-row-title">Larger City Banners</span>
                      <span class="check-row-hint">
                        Enlarges city labels for quicker scanning at a glance.
                      </span>
                    </span>
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
import { mapWrappingComputed, mapWrappingMethods } from './map/mapWrapping.mjs';
import SavedMapViews from './SavedMapViews.vue';
import MapToolbar from './MapToolbar.vue';
import MapCityBanner from './map/MapCityBanner.vue';
import { mapSavedViewsMethods } from './map/mapSavedViews.js';
import { SUPABASE_MAP_ID } from './map/mapSettings.js';
import FeatureNotice from '../FeatureNotice.vue';
import { mapViewMethods, mapViewComputed } from "./map/mapView.js";
import { mapConfig, ownerPalette } from "../../../data/communityTileMap";
import { mapSnapshotsComputed, mapSnapshotsMethods } from "./map/mapSnapshots.js";
import { mapAccessComputed, mapAccessMethods } from "./map/mapAccess.js";
import { mapPersistenceMethods } from "./map/mapPersistence.js";
import { mapLoadingMethods } from "./map/mapLoading.js";
import { mapPinsComputed, mapPinsMethods } from "./map/mapPins.js";
import { mapContrastMethods } from "./map/mapContrast.js";
import { mapOverlaysComputed } from "./map/mapOverlays.js";
import { mapNavigationMethods } from "./map/mapNavigation.js";
import { mapViewportMethods } from "./map/mapViewport.js";
import { mapRenderingComputed, mapRenderingMethods } from "./map/mapRendering.js";
import { mapInteractionComputed, mapInteractionMethods } from "./map/mapInteraction.js";
import { mapEditingComputed, mapEditingMethods } from "./map/mapEditing.js";

export default {
  components: { FeatureNotice, SavedMapViews, MapToolbar, MapCityBanner },
  props: {
    horizontalWrap: { type: Boolean, default: false },
    viewLayerTools: { type: Object, default: null },
    detailEditing: { type: Boolean, default: false },
    detailEditStatus: { type: String, default: '' },
    showMapHeading: { type: Boolean, default: true },
    extraPanelLabel: { type: String, default: '' },
    archiveMode: { type: Boolean, default: false },
    officialSource: { type: Object, default: null },
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
      isMapFullscreen: false,
      fullscreenFallback: false,
      showMapShortcuts: false,
      mapViewLink: '',
      mapViewStatus: '',
      showMapViewLink: false,
      activeSavedView: null,
      savedViewLoading: false,
      savedViewError: '',
      savedViewsMapId: SUPABASE_MAP_ID,
      overlayEnabled: false,
      isLiveSyncing: false,
      liveSyncError: "",
      loadError: "",
      // Supabase/auth
      supabase: null,
      authEmail: "",
      authUser: null,
      authMessage: "",
      authChecking: false,
      supporterStatus: '',
      supporterCheckFailed: false,
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
      wrapFitted: true,
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
      pinchZoomRafId: null,
      pendingPinchScale: null,
      pendingPinchFocus: null,
      touchGestureHadPinch: false,
      zoomRendererMode: null,
      zoomRendererReleaseTimer: null,
      wheelZoomRafId: null,
      wheelZoomDelta: 0,
      wheelZoomFocus: null,
      hasUserViewportInteraction: false,
      initialFitTimer: null,
      initialFitAttempts: 0,
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
      editImprovement:'',editRoute:'',editIdeology:'',detailEditError:'',
      tileNotesStatus: "",
      tileNotesStatusTimer: null,
      // Panel UI state
      editPanelCollapsed: !this.extraPanelLabel,
      editPanelTab: this.extraPanelLabel ? 'extra' : "overlays",
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
      isMobileSafari: false,
      lastPointerType: null,
      deferOwnerBorders: false,
      mobileLoadTimer: null,
      mobileSupabaseInitTimer: null,
      deferredStateLoadTimer: null,
      // Render timers
      recentEditTiles: [],
      recentEditTimer: null,
      recentEditSequence: 0,
      canvasDrawFrameId: null,
      terrainBaseCanvas: null,
      terrainBaseCacheKey: "",
      miniMapBaseCanvas: null,
      miniMapBaseCacheKey: "",
      terrainRevision: 0,
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
      liveBaseSnapshotAppliedId: null,
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
    ...mapWrappingComputed,
    ...mapViewComputed,
    ...mapSnapshotsComputed,
    ...mapAccessComputed,
    ...mapPinsComputed,
    ...mapOverlaysComputed,
    ...mapRenderingComputed,
    ...mapInteractionComputed,
    ...mapEditingComputed,
    resolvedEmbeddedMode() {
      return ["live", "snapshot"].includes(this.embeddedMode)
        ? this.embeddedMode
        : "live";
    },
    isSnapshotEmbed() {
      return this.embedded && this.resolvedEmbeddedMode === "snapshot";
    },
  },

  watch: {
    wrapCopyKey: "refreshWrappedCanvases",
    ownerBrushEnabled: "refreshWrappedCanvases",
    officialSource() { this.applyOfficialFrame(); },
    $route() {
      this.applyRequestedTileFromRoute();
    },
    useTerrainCanvas(nextValue) {
      if (nextValue) {
        this.$nextTick(() => {
          this.drawTerrainCanvas();
        });
      } else {
        this.resetTerrainBaseCache();
      }
      this.scheduleMiniMapDrawIfVisible();
    },
    'authUser.id'() {
      this._savedViewFetchKey = null;
      this.activeSavedView = null;
      if (this.$route?.query?.saved_view) this.applyRequestedTileFromRoute();
    },
    editPanelTab(nextValue) {
      if (nextValue === "overlays") this.overlayEnabled = true;
      if (nextValue === "snapshots") {
        this.loadSnapshotsIfActive();
      }
      this.handleOverlayVisualizationChange();
    },
    overlayEnabled() { this.handleOverlayVisualizationChange(); },
    overlayView() {
      this.handleOverlayVisualizationChange();
    },
    overlayOwnerName() {
      this.handleOverlayVisualizationChange();
    },
    contrastVisualizationKey() {
      this.handleOverlayVisualizationChange();
      this.persistContrastSettingsForCurrentUser();
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
      if(this.officialSource)this.$emit('official-select',nextTile);
      this.ensureEditPanelTab();
      this.syncEditFieldsFromTile(nextTile);
      if (!nextTile) {
        this.hoverTooltipLocked = false;
        this.hideHoverTooltip();
      }
    },
  },

  mounted() {
    this._mapDisposed = false;
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    this.scheduleInitialFitToView();
    this.isMobileView = window.innerWidth <= 900;
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      const isDesktopModeIPad =
        /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      this.isMobileBrowser =
        /Mobi|Android|iP(hone|ad|od)/.test(ua) || isDesktopModeIPad;
      const isIOS = /iP(hone|ad|od)/.test(ua) || isDesktopModeIPad;
      const isSafariEngine = /WebKit/i.test(ua) && /Safari/i.test(ua);
      const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua);
      this.isMobileSafari = isIOS && isSafariEngine && !isOtherIOSBrowser;
    }
    if (this.isMobileView) {
      this.editPanelCollapsed = false;
    }
    const useLiveMap =
      this.archiveMode || (!this.officialSource?.preview && !this.snapshotPayload && this.resolvedEmbeddedMode !== "snapshot");
    this.loadMapPins();
    this.restoreContrastSettingsForAnonymous();
    if (this.isMobileSafari) {
      this.mobileLoadTimer = window.setTimeout(() => {
        this.mobileLoadTimer = null;
        this.loadMap({ deferStateData: true });
      }, 60);
      if (useLiveMap) {
        this.mobileSupabaseInitTimer = window.setTimeout(() => {
          this.mobileSupabaseInitTimer = null;
          this.initSupabase();
        }, 320);
      }
    } else {
      if (useLiveMap) {
        this.initSupabase();
      }
      this.loadMap();
    }
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("quick-jump-map-tile", this.handleQuickJumpTile);
    window.addEventListener("storage", this.handleMapPinStorageChange);
    window.addEventListener("supabase-auth-session", this.handleExternalAuth);
    this.applyRequestedTileFromRoute();
  },

  beforeUnmount() {
    this._mapDisposed = true;
    this.teardownMapView();
    if (this._liveSyncFrame) window.cancelAnimationFrame(this._liveSyncFrame);
    this.clearLiveTileOverrides();
    this.clearRecentEdits();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("quick-jump-map-tile", this.handleQuickJumpTile);
    window.removeEventListener("storage", this.handleMapPinStorageChange);
    window.removeEventListener(
      "supabase-auth-session",
      this.handleExternalAuth
    );
    this.teardownSupabase();
    if (this.canvasDrawFrameId) {
      window.cancelAnimationFrame(this.canvasDrawFrameId);
      this.canvasDrawFrameId = null;
    }
    this.clearWheelZoomFrame();
    this.clearPinchZoomFrame();
    this.clearZoomRendererRelease();
    this.activePointers.clear();
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
    if (this.mobileLoadTimer) {
      window.clearTimeout(this.mobileLoadTimer);
      this.mobileLoadTimer = null;
    }
    if (this.mobileSupabaseInitTimer) {
      window.clearTimeout(this.mobileSupabaseInitTimer);
      this.mobileSupabaseInitTimer = null;
    }
    if (this.deferredStateLoadTimer) {
      window.clearTimeout(this.deferredStateLoadTimer);
      this.deferredStateLoadTimer = null;
    }
    if (this.initialFitTimer) {
      window.clearTimeout(this.initialFitTimer);
      this.initialFitTimer = null;
    }
    this.resetTerrainBaseCache();
    this.resetMiniMapCache();
    if (this.miniMapFrameId) window.cancelAnimationFrame(this.miniMapFrameId);
  },

  methods: {
    ...mapWrappingMethods,
    ...mapViewMethods,
    ...mapSavedViewsMethods,
    ...mapSnapshotsMethods,
    ...mapAccessMethods,
    ...mapPersistenceMethods,
    ...mapLoadingMethods,
    ...mapPinsMethods,
    ...mapContrastMethods,
    ...mapNavigationMethods,
    ...mapViewportMethods,
    ...mapRenderingMethods,
    ...mapInteractionMethods,
    ...mapEditingMethods,
    loadSnapshotsIfActive() {
      if (this.editPanelTab !== "snapshots") {
        return;
      }
      this.loadSnapshots();
    },
  },
};
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
.tile-map .tile-map-heading { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; margin-block-end: 1rem; }
.tile-map .tile-map-heading .title-map-title { margin-block-end: 0; }
.tile-map .tile-map-local-badge { border: 1px solid var(--accent-color); border-radius: 999px; padding: .25rem .65rem; color: var(--field-label-color); font-size: .8rem; font-weight: 700; }
.tile-map .tile-edit-mode-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; margin-block-end: .85rem; }
.tile-map .tile-edit-mode-toggle { display: inline-flex; }
.tile-map .tile-edit-mode-toggle .tile-edit-button { min-inline-size: 4rem; }
.tile-map .tile-edit-mode-toggle .tile-edit-button:first-child { border-start-end-radius: 0; border-end-end-radius: 0; }
.tile-map .tile-edit-mode-toggle .tile-edit-button:last-child { border-start-start-radius: 0; border-end-start-radius: 0; }
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
.tile-map .tile-map-viewport .tile-map-canvas-layer {
  position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;
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
.tile-map .tile-map-viewport .tile-river-overlay {
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-river {
  fill: none;
  stroke-linecap: butt;
  stroke-linejoin: round;
  pointer-events: none;
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
.tile-map .tile-overlay-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-block-end: 0.8rem;
}
.tile-map .tile-overlay-header .tile-info-title {
  margin-block-end: 0;
}
.tile-map .tile-map-overlay-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-block-size: 32px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.tile-map .tile-map-overlay-toggle input {
  flex: 0 0 auto;
  inline-size: 1rem;
  block-size: 1rem;
  margin: 0;
  accent-color: var(--accent-color);
}
.tile-map .tile-map-overlay-toggle input:focus-visible {
  outline: 3px solid var(--field-label-color);
  outline-offset: 3px;
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
.tile-map .tile-overlay-contrast-toggles .check-row {
  align-items: flex-start;
  gap: 0.6rem;
  border: 1px solid var(--panel-border-color);
  border-radius: 0.65rem;
  background: var(--panel-bg-elevated-color);
  padding-block: 0.4rem;
  padding-inline: 0.55rem;
}
.tile-map .tile-overlay-contrast-toggles .check-row:hover {
  border-color: var(--field-label-color);
}
.tile-map .tile-overlay-contrast-toggles .check-row input {
  align-self: center;
}
.tile-map .tile-overlay-contrast-toggles .check-row-copy {
  display: grid;
  gap: 0.12rem;
}
.tile-map .tile-overlay-contrast-toggles .check-row-title {
  color: var(--panel-text-color);
  font-size: 0.78rem;
  font-weight: 700;
}
.tile-map .tile-overlay-contrast-toggles .check-row-hint {
  color: var(--panel-muted-color);
  font-size: 0.69rem;
  line-height: 1.35;
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


.tile-map-interaction-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.tile-map .tile-map-viewport .tile-map-interaction-layer .tile-hover-outline {
  vector-effect: none;
  stroke-width: 1.5;
}
.tile-map .tile-map-viewport .tile-map-interaction-layer .tile-selection-outline {
  vector-effect: none;
}


.tile-map-sync-status {
  position: absolute;
  z-index: 3;
  inset-block-start: 0.5rem;
  inset-inline-start: 0.5rem;
  max-inline-size: calc(100% - 1rem);
  padding: 0.4rem 0.65rem;
  border-radius: 0.4rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.8rem;
}


.tile-map .tile-recent-outline {
  fill: none;
  stroke: white;
  stroke-width: 2;
  pointer-events: none;
  animation: map-edit-flash 4s ease-in-out both;
}
@keyframes map-edit-flash {
  0%, 30%, 60% { opacity: 0.9; }
  15%, 45%, 75% { opacity: 0.2; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tile-map .tile-recent-outline { animation: none; opacity: 0.75; }
}


.tile-map .tile-map-view-help { font-size: 0.85rem; }
.tile-map .tile-map-view-help p { margin: 0.25rem 0; }
.tile-map .tile-map-screen-reader {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}
.tile-map.is-fullscreen {
  position: fixed; inset: 0; z-index: 10000;
  width: 100%; height: 100dvh; box-sizing: border-box;
  padding: 0.75rem; overflow: auto;
  background: var(--back-color, #171717); color: var(--page-text-color, white);
  display: flex; flex-direction: column;
}
.tile-map.is-fullscreen .tile-map-header { flex-shrink: 0; }
.tile-map.is-fullscreen .tile-map-body { flex: 1; min-height: 0; }
.tile-map.is-fullscreen .tile-map-viewport {
  max-width: none !important; max-height: none !important;
  height: 100%; min-height: 250px; aspect-ratio: auto !important;
}
.tile-map.is-fullscreen .tile-map-legend { display: none; }
@media (max-width: 900px) {
  .tile-map.is-fullscreen .tile-map-body { flex: none; }
  .tile-map.is-fullscreen .tile-map-viewport { height: 65dvh; }
}


.tile-map.is-fullscreen .tile-map-info { max-height: 100%; overflow: auto; }
.tile-map.is-fullscreen .tile-map-body { align-items: stretch; }
</style>
