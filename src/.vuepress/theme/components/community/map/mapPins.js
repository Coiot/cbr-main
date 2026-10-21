import { MAP_PINS_STORAGE_KEY } from "./mapSettings.js";
import { ownerNameForId } from "./mapModel.js";

// map Pins. Methods run on the owning Vue component instance.

export const mapPinsComputed = {
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
};

export const mapPinsMethods = {
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
      // A wrapping bitmap is reused at several offsets, independent of the camera.
      if (!this.wrappingEnabled && (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY)) {
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
};
