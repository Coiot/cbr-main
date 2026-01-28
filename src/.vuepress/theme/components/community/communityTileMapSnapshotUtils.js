function normalizeSnapshotUnit(unit) {
  if (!unit) {
    return null;
  }
  return {
    id: unit.id !== undefined && unit.id !== null ? unit.id : null,
    type: unit.type || "",
    owner: Number.isFinite(unit.owner) ? unit.owner : null,
  };
}

function normalizeSnapshotCity(city) {
  if (!city) {
    return null;
  }
  const wonders = Array.isArray(city.worldWonders)
    ? [...city.worldWonders].sort()
    : [];
  return {
    id: city.id !== undefined && city.id !== null ? city.id : null,
    name: city.name || "",
    size: Number.isFinite(city.size) ? city.size : 1,
    owner: Number.isFinite(city.owner) ? city.owner : null,
    religion: city.religion || "",
    worldWonders: wonders,
    isPuppeted: !!city.isPuppeted,
    isOccupied: !!city.isOccupied,
    isResistance: !!city.isResistance,
    isCapital: !!city.isCapital,
  };
}

function normalizeSnapshotValue(value) {
  if (!value || typeof value !== "object") {
    return value || null;
  }
  if (Object.prototype.hasOwnProperty.call(value, "type")) {
    return normalizeSnapshotUnit(value);
  }
  if (
    Object.prototype.hasOwnProperty.call(value, "name") &&
    Object.prototype.hasOwnProperty.call(value, "size")
  ) {
    return normalizeSnapshotCity(value);
  }
  return value;
}

function normalizeSnapshotPayload(payload) {
  if (!payload) {
    return null;
  }
  return {
    owner: Number.isFinite(payload.owner) ? payload.owner : null,
    originalOwner: Number.isFinite(payload.originalOwner)
      ? payload.originalOwner
      : null,
    notes: payload.notes ? String(payload.notes) : null,
    pillaged: !!payload.pillaged,
    ruins: !!payload.ruins,
    citadel: !!payload.citadel,
    combatUnit: normalizeSnapshotUnit(payload.combatUnit),
    civilianUnit: normalizeSnapshotUnit(payload.civilianUnit),
    city: normalizeSnapshotCity(payload.city),
  };
}

function snapshotPayloadEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    JSON.stringify(normalizeSnapshotPayload(a)) ===
    JSON.stringify(normalizeSnapshotPayload(b))
  );
}

function snapshotValueEqual(a, b) {
  return (
    JSON.stringify(normalizeSnapshotValue(a)) ===
    JSON.stringify(normalizeSnapshotValue(b))
  );
}

function buildSnapshotLookup(payload) {
  if (!Array.isArray(payload)) {
    return {};
  }
  return payload.reduce((acc, row) => {
    const key = row.tile_key || row.tileKey;
    if (key) {
      acc[key] = row.payload || null;
    }
    return acc;
  }, {});
}

function buildCityChangeSummary(currentLookup, previousLookup) {
  const founded = new Map();
  const captured = new Map();
  const removed = new Map();
  const keys = new Set([
    ...Object.keys(currentLookup || {}),
    ...Object.keys(previousLookup || {}),
  ]);
  keys.forEach((key) => {
    const current = currentLookup[key] || null;
    const previous = previousLookup[key] || null;
    const currentCity = current ? current.city : null;
    const previousCity = previous ? previous.city : null;
    if (currentCity && !previousCity) {
      const entryKey = key;
      if (!founded.has(entryKey)) {
        founded.set(entryKey, {
          key,
          name: currentCity.name || "Unknown City",
          owner: currentCity.owner ?? current.owner ?? null,
          originalOwner: current.originalOwner ?? null,
        });
      }
    }
    if (!currentCity && previousCity) {
      const entryKey = key;
      if (!removed.has(entryKey)) {
        removed.set(entryKey, {
          key,
          name: previousCity.name || "Unknown City",
          owner: previousCity.owner ?? previous.owner ?? null,
          originalOwner: previous.originalOwner ?? null,
        });
      }
    }
    if (
      currentCity &&
      (current.originalOwner ?? null) !== null &&
      current.owner !== current.originalOwner
    ) {
      const entryKey = key;
      if (!captured.has(entryKey)) {
        captured.set(entryKey, {
          key,
          name: currentCity.name || "Unknown City",
          owner: currentCity.owner ?? current.owner ?? null,
          originalOwner: current.originalOwner ?? null,
        });
      }
    }
  });
  return {
    founded: Array.from(founded.values()),
    captured: Array.from(captured.values()),
    removed: Array.from(removed.values()),
  };
}

export {
  normalizeSnapshotUnit,
  normalizeSnapshotCity,
  normalizeSnapshotValue,
  normalizeSnapshotPayload,
  snapshotPayloadEqual,
  snapshotValueEqual,
  buildSnapshotLookup,
  buildCityChangeSummary,
};
