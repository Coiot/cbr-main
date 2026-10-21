import {
  FEATURE_COLORS,
  WONDER_COLORS,
  SQRT3,
  RESOURCE_COLOR_OPTIONS,
  IMPROVEMENT_COLOR_OPTIONS,
  s5OwnerList,
  OWNER_COLOR_MAP,
  normalizeOwnerKey,
  BASE_UNIT_IDS,
  ALL_UNITS,
} from "../communityTileMapConstants";
import { ownerPalette } from "../../../../data/communityTileMap";
import { wrapValue } from './mapWrapping.mjs';

export function buildHexPoints(size) {
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

export function buildHexVertices(size) {
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

export function buildStarPath(outerRadius, innerRadius) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(`${Math.cos(angle) * radius} ${Math.sin(angle) * radius}`);
  }
  return `M ${points[0]} L ${points.slice(1).join(" L ")} Z`;
}

export function buildStarVertices(outerRadius, innerRadius) {
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

export function buildRegularStarVertices(pointCount, outerRadius, innerRadius) {
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

export function buildRegularStarPoints(pointCount, outerRadius, innerRadius) {
  return buildRegularStarVertices(pointCount, outerRadius, innerRadius)
    .map((point) => `${point.x} ${point.y}`)
    .join(" ");
}

export function buildLegendItems(list) {
  return (list || []).map((name, index) => ({
    id: normalizeId(name) || `entry-${index}`,
    name,
    label: formatEnumLabel(name),
  }));
}

export function normalizeId(name) {
  if (!name) {
    return "";
  }
  return name
    .replace(/^(TERRAIN|FEATURE|RESOURCE|IMPROVEMENT|UNIT)_/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase();
}

export function normalizeReligionKey(value) {
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

export function formatEnumLabel(value) {
  if (!value) {
    return "None";
  }
  return value
    .replace(/^(TERRAIN|FEATURE|RESOURCE|IMPROVEMENT|UNIT)_/, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getImprovementName(list, index) {
  if (index === 0xff || index === undefined || index === null) {
    return null;
  }
  if (list && index >= 0 && index < list.length && list[index]) {
    return list[index];
  }
  return `IMPROVEMENT_${index}`;
}

export function buildColorLookup(list, options) {
  const lookup = new Map();
  (list || []).forEach((entry) => {
    if (!entry) {
      return;
    }
    lookup.set(entry, colorFromString(entry, options));
  });
  return lookup;
}

export function colorFromString(name, options = {}) {
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

export function featureColor(id) {
  if (!id) {
    return "#1f5e3b";
  }
  return FEATURE_COLORS[id] || "#1f5e3b";
}

export function wonderColor(id) {
  if (!id) {
    return "#ffca28";
  }
  return WONDER_COLORS[id] || "#ffca28";
}

export function terrainColor(id) {
  return (
    {
      grass: "#6b973e",
      plains: "#a0b24d",
      desert: "#d5b866",
      tundra: "#b6b6aa",
      snow: "#d9e4e7",
      coast: "#4796b6",
      ocean: "#28658c",
    }[id] || "#3c3c3c"
  );
}

export const FEATURE_TINTS = Object.freeze({
  forest: "#4f7f48",
  jungle: "#2f6f44",
  marsh: "#597b52",
  ice: "#e2f3ff",
});

export function blendHexColors(baseHex, tintHex, amount) {
  const base = parseHexColor(baseHex);
  const tint = parseHexColor(tintHex);
  if (!base || !tint) {
    return baseHex;
  }
  const clamped = Math.min(Math.max(Number(amount) || 0, 0), 1);
  const mix = (channel) =>
    Math.round(base[channel] + (tint[channel] - base[channel]) * clamped);
  return `#${toHex(mix("r"))}${toHex(mix("g"))}${toHex(mix("b"))}`;
}

export function collectImprovementNames(improvementList, stateData) {
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

export function normalizeEntityId(rawId, zeroIsNone) {
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

export function shouldTreatZeroAsNone(values) {
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

export function shouldTreatZeroIdAsNone(values) {
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

export function buildStateNormalization(stateData) {
  return {
    ownerZeroIsNone: shouldTreatZeroAsNone(stateData.owner),
    improvementZeroIsNone: shouldTreatZeroAsNone(stateData.improvement),
    routeZeroIsNone: shouldTreatZeroAsNone(stateData.routeType),
    cityZeroIsNone: shouldTreatZeroIdAsNone(stateData.cityId),
    unitZeroIsNone: shouldTreatZeroIdAsNone(stateData.unitId),
  };
}

export function createEmptyImprovementTiles(tileCount) {
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

export function normalizeRouteType(value, zeroIsNone) {
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

export function buildImprovementTilesFromState(stateData, tileCount, normalization) {
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

export function buildEntitiesFromState(improvementTiles, normalization, stateCities) {
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

export function mergeMapState(mapData, stateData) {
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

export function buildRiverSegments(riverData, hexSize) {
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

export function insetSegment(start, end, inset) {
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

export function buildRiverOverlayFromTiles(tiles) {
  const segments = [];
  (tiles || []).forEach((tile) => {
    if (
      !tile ||
      !Array.isArray(tile.riverSegments) ||
      !tile.riverSegments.length
    ) {
      return;
    }
    tile.riverSegments.forEach((segment) => {
      segments.push({
        x1: tile.x + segment.x1,
        y1: tile.y + segment.y1,
        x2: tile.x + segment.x2,
        y2: tile.y + segment.y2,
      });
    });
  });
  if (!segments.length) {
    return { paths: [], endpoints: [] };
  }
  return buildRiverPaths(segments);
}

export function buildRiverPaths(segments) {
  const pointByKey = new Map();
  const adjacency = new Map();
  const edges = [];
  const nodeRef = { nextId: 0 };
  (segments || []).forEach((segment, index) => {
    const a = resolveRiverNodeKey(
      pointByKey,
      segment.x1,
      segment.y1,
      2.2,
      nodeRef
    );
    const b = resolveRiverNodeKey(
      pointByKey,
      segment.x2,
      segment.y2,
      2.2,
      nodeRef
    );
    if (!adjacency.has(a)) {
      adjacency.set(a, new Set());
    }
    if (!adjacency.has(b)) {
      adjacency.set(b, new Set());
    }
    adjacency.get(a).add(index);
    adjacency.get(b).add(index);
    edges.push({ a, b });
  });

  const visited = new Set();
  const paths = [];
  const endpoints = [];
  adjacency.forEach((linked, key) => {
    if (linked.size !== 1) {
      return;
    }
    const point = pointByKey.get(key);
    if (point) {
      endpoints.push(point);
    }
  });

  const walkPath = (startEdgeIndex, startKey) => {
    const first = pointByKey.get(startKey);
    if (!first) {
      return null;
    }
    const path = [first];
    const keys = [startKey];
    let currentEdgeIndex = startEdgeIndex;
    let currentKey = startKey;
    while (
      Number.isInteger(currentEdgeIndex) &&
      !visited.has(currentEdgeIndex)
    ) {
      visited.add(currentEdgeIndex);
      const edge = edges[currentEdgeIndex];
      if (!edge) {
        break;
      }
      const nextKey = edge.a === currentKey ? edge.b : edge.a;
      const nextPoint = pointByKey.get(nextKey);
      if (!nextPoint) {
        break;
      }
      path.push(nextPoint);
      keys.push(nextKey);
      const nextOptions = [...(adjacency.get(nextKey) || [])].filter(
        (candidate) => !visited.has(candidate)
      );
      if (!nextOptions.length) {
        break;
      }
      currentEdgeIndex = pickRiverContinuationEdge(
        currentKey,
        nextKey,
        nextOptions,
        edges,
        pointByKey
      );
      currentKey = nextKey;
    }
    const endKey = keys[keys.length - 1];
    return {
      points: path,
      startKey,
      endKey,
      startIsEndpoint: (adjacency.get(startKey) || new Set()).size === 1,
      endIsEndpoint: (adjacency.get(endKey) || new Set()).size === 1,
    };
  };

  adjacency.forEach((linked, key) => {
    if (linked.size !== 1) {
      return;
    }
    const edgeIndex = [...linked][0];
    if (visited.has(edgeIndex)) {
      return;
    }
    const path = walkPath(edgeIndex, key);
    if (path && path.points.length >= 2) {
      paths.push(path);
    }
  });

  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    if (visited.has(edgeIndex)) {
      continue;
    }
    const path = walkPath(edgeIndex, edges[edgeIndex].a);
    if (path && path.points.length >= 2) {
      paths.push(path);
    }
  }

  return { paths, endpoints };
}

export function pickRiverContinuationEdge(
  previousKey,
  currentKey,
  candidateEdgeIndexes,
  edges,
  pointByKey
) {
  if (!Array.isArray(candidateEdgeIndexes) || !candidateEdgeIndexes.length) {
    return null;
  }
  if (candidateEdgeIndexes.length === 1) {
    return candidateEdgeIndexes[0];
  }
  const previous = pointByKey.get(previousKey);
  const current = pointByKey.get(currentKey);
  if (!previous || !current) {
    return candidateEdgeIndexes[0];
  }
  const inX = current.x - previous.x;
  const inY = current.y - previous.y;
  const inLength = Math.hypot(inX, inY) || 1;
  let bestEdge = candidateEdgeIndexes[0];
  let bestScore = -Infinity;
  candidateEdgeIndexes.forEach((edgeIndex) => {
    const edge = edges[edgeIndex];
    if (!edge) {
      return;
    }
    const nextKey = edge.a === currentKey ? edge.b : edge.a;
    const next = pointByKey.get(nextKey);
    if (!next) {
      return;
    }
    const outX = next.x - current.x;
    const outY = next.y - current.y;
    const outLength = Math.hypot(outX, outY) || 1;
    const score = (inX * outX + inY * outY) / (inLength * outLength);
    if (score > bestScore) {
      bestScore = score;
      bestEdge = edgeIndex;
    }
  });
  return bestEdge;
}

export function riverPointKey(x, y) {
  return `${Number(x).toFixed(2)}:${Number(y).toFixed(2)}`;
}

export function resolveRiverNodeKey(pointByKey, x, y, tolerance, nodeRef) {
  let bestKey = "";
  let bestDistanceSq = Infinity;
  pointByKey.forEach((point, key) => {
    const distanceSq = riverDistanceSq(point, { x, y });
    if (distanceSq > tolerance * tolerance) {
      return;
    }
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestKey = key;
    }
  });
  if (bestKey) {
    const existing = pointByKey.get(bestKey);
    if (existing) {
      existing.x = (existing.x + x) / 2;
      existing.y = (existing.y + y) / 2;
    }
    return bestKey;
  }
  const key = `river-${nodeRef.nextId}:${riverPointKey(x, y)}`;
  nodeRef.nextId += 1;
  pointByKey.set(key, { x, y });
  return key;
}

export function riverDistanceSq(a, b) {
  const dx = (a && Number(a.x)) || 0;
  const dy = (a && Number(a.y)) || 0;
  const tx = (b && Number(b.x)) || 0;
  const ty = (b && Number(b.y)) || 0;
  const x = dx - tx;
  const y = dy - ty;
  return x * x + y * y;
}

export function trimRiverPathPoint(points, index, towardIndex, trimDistance) {
  if (
    !Array.isArray(points) ||
    index < 0 ||
    towardIndex < 0 ||
    index >= points.length ||
    towardIndex >= points.length
  ) {
    return;
  }
  const point = points[index];
  const toward = points[towardIndex];
  if (!point || !toward) {
    return;
  }
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const distance = Math.hypot(dx, dy) || 0;
  if (distance <= 0) {
    return;
  }
  const amount = Math.min(trimDistance, distance * 0.45);
  point.x += (dx / distance) * amount;
  point.y += (dy / distance) * amount;
}

export function riverPathPointsForStroke(pathEntry, trimDistance = 0) {
  const rawPoints = Array.isArray(pathEntry)
    ? pathEntry
    : pathEntry && Array.isArray(pathEntry.points)
    ? pathEntry.points
    : [];
  if (!rawPoints.length) {
    return [];
  }
  const shouldTrimStart = !!(pathEntry && pathEntry.startIsEndpoint);
  const shouldTrimEnd = !!(pathEntry && pathEntry.endIsEndpoint);
  if (!trimDistance || (!shouldTrimStart && !shouldTrimEnd)) {
    return rawPoints;
  }
  const points = rawPoints.map((point) => ({ x: point.x, y: point.y }));
  if (shouldTrimStart && points.length > 1) {
    trimRiverPathPoint(points, 0, 1, trimDistance);
  }
  if (shouldTrimEnd && points.length > 1) {
    trimRiverPathPoint(
      points,
      points.length - 1,
      points.length - 2,
      trimDistance
    );
  }
  return points;
}

export function strokeRiverPathsOnCanvas(context, paths, trimDistance = 0) {
  if (!context || !Array.isArray(paths) || !paths.length) {
    return;
  }
  paths.forEach((pathEntry) => {
    const path = riverPathPointsForStroke(pathEntry, trimDistance);
    if (!Array.isArray(path) || path.length < 2) {
      return;
    }
    context.beginPath();
    context.moveTo(path[0].x, path[0].y);
    if (path.length === 2) {
      context.lineTo(path[1].x, path[1].y);
      context.stroke();
      return;
    }
    for (let index = 1; index < path.length - 1; index += 1) {
      const current = path[index];
      const next = path[index + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      context.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    const last = path[path.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
  });
}

export function buildTiles(
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

export function resolveOwner(improvementOwner, combatUnit, civilianUnit, city) {
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

export function routeFromType(routeType) {
  if (routeType === 0) {
    return "road";
  }
  if (routeType === 1) {
    return "railroad";
  }
  return null;
}

export function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function buildSecondaryColorMap(ownerColors) {
  const secondary = {};
  Object.keys(ownerColors || {}).forEach((key) => {
    secondary[key] = deriveSecondaryColor(ownerColors[key]);
  });
  return secondary;
}

export function buildOwnerLegend(
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

export function ownerNameForId(ownerId) {
  if (!Number.isFinite(ownerId)) {
    return "";
  }
  const entry = s5OwnerList[ownerId];
  return entry && entry.name ? entry.name : "";
}

export function ownerColorEntryById(ownerId) {
  if (!Number.isFinite(ownerId)) {
    return null;
  }
  const entry = s5OwnerList[ownerId];
  if (!entry || !entry.name) {
    return null;
  }
  return OWNER_COLOR_MAP[normalizeOwnerKey(entry.name)] || null;
}

export function isWorldWonderName(name) {
  return String(name || "").trim() === "World Wonder";
}

export function isWorldWonderCity(city) {
  if (!city) {
    return false;
  }
  return isWorldWonderName(city.name);
}

export function worldWondersFromInput(value) {
  if (!value) {
    return [];
  }
  const entries = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(entries));
}

export function worldWondersInputValue(value) {
  if (!Array.isArray(value) || !value.length) {
    return "";
  }
  return value.filter(Boolean).join(", ");
}

export function worldWondersLabel(city) {
  if (!city || !Array.isArray(city.worldWonders)) {
    return "None";
  }
  return city.worldWonders.length ? city.worldWonders.join(", ") : "None";
}

export function isCitadelImprovement(tile) {
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

export function setCitadelImprovement(tile) {
  if (!tile) {
    return;
  }
  const name = "IMPROVEMENT_CITADEL";
  tile.improvement = name;
  tile.improvementId = "citadel";
  tile.improvementColor = colorFromString(name, IMPROVEMENT_COLOR_OPTIONS);
}

export function clearCitadelImprovement(tile) {
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

export function cityLabelColors(tile, ownerColors, ownerSecondaryColors) {
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

export function applyOwnerColorOverrides(ownerColors, ownerSecondaryColors) {
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

export function cloneUnit(unit) {
  if (!unit) {
    return null;
  }
  return {
    id: Number.isFinite(unit.id) ? unit.id : null,
    type: unit.type,
    owner: Number.isFinite(unit.owner) ? unit.owner : null,
  };
}

export function cloneCity(city) {
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

export function buildBaseState(tile) {
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

export function formatOwnerOptionLabel(owner, index) {
  const leader = owner && owner.leader ? ` \u2014 ${owner.leader}` : "";
  return `${owner.name || "Unknown"}${leader}`;
}

export function normalizeUnitInput(value) {
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

export function unitInputValueForUnit(unit) {
  if (!unit || !unit.type) {
    return "";
  }
  return unitLabelFromType(unit.type);
}

export function unitOwnerInputValueForUnit(unit) {
  if (!unit || !Number.isFinite(unit.owner)) {
    return "";
  }
  return ownerNameForId(unit.owner);
}

export function unitLabelFromType(type) {
  const raw = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/^UNIT_/, "")
    .replace(/[^A-Z0-9]+/g, "_");
  const index = BASE_UNIT_IDS.indexOf(raw);
  return index >= 0 ? ALL_UNITS[index].name : raw;
}

export function nextUnitIdFromTiles(tiles) {
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

export function unitRoleFromType(type) {
  const raw = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/^UNIT_/, "")
    .replace(/[^A-Z0-9]+/g, "_");
  const index = BASE_UNIT_IDS.indexOf(raw);
  return index >= 0 ? ALL_UNITS[index].role : "combat";
}

export function unitMarkerColors(owner, ownerColors, ownerSecondaryColors) {
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

export function resolveOwnerInput(value) {
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

export function buildTileLookup(tiles) {
  const map = new Map();
  (tiles || []).forEach((tile) => {
    map.set(`${tile.col},${tile.row}`, tile);
  });
  return map;
}

// Grid coordinates match buildTiles: row 0 is the upper display row, while
// the source tiles array is ordered from the bottom row upward.
export function tilesInViewport(lookup, columns, rows, hexSize, translate, scale, viewport) {
  if (!lookup || !columns || !rows || scale <= 0) return [];
  const width = hexSize * SQRT3;
  const stepY = hexSize * 1.5;
  const halfWidth = width / 2 + hexSize * 3;
  const halfHeight = hexSize * 4;
  // Preserve the existing generous edge padding so decorations don't pop in.
  const left = -translate.x / scale - halfWidth * 2;
  const right = (-translate.x + viewport.width) / scale + halfWidth * 2;
  const top = -translate.y / scale - halfHeight * 2;
  const bottom = (-translate.y + viewport.height) / scale + halfHeight * 2;
  const firstRow = Math.max(0, Math.ceil((top - hexSize) / stepY));
  const lastRow = Math.min(rows - 1, Math.floor((bottom - hexSize) / stepY));
  const visible = [];
  for (let row = lastRow; row >= firstRow; row--) {
    const offsetX = width / 2 + (row % 2 ? 0 : width / 2);
    const firstCol = Math.max(0, Math.ceil((left - offsetX) / width));
    const lastCol = Math.min(columns - 1, Math.floor((right - offsetX) / width));
    for (let col = firstCol; col <= lastCol; col++) {
      const tile = lookup.get(`${col},${row}`);
      if (tile) visible.push(tile);
    }
  }
  return visible;
}

export function pointInPolygon(x, y, vertices) {
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

export function buildOwnerBorders(
  tiles,
  columns,
  rows,
  ownerSecondaryColors,
  hexSize,
  changedKeys = null,
  lookup = null,
  horizontalWrap = false
) {
  if (!Array.isArray(tiles) || !tiles.length) {
    return tiles;
  }
  const tileMap = lookup || buildTileLookup(tiles);
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

  let affected = tiles;
  if (changedKeys) {
    const changed = Array.from(changedKeys);
    const keys = new Set(changed);
    for (const key of changed) {
      const tile = tileMap.get(key);
      if (!tile) continue;
      for (const edge of edges) {
        const [dx, dy] = edge.offsets[tile.row % 2 === 0 ? "even" : "odd"];
        keys.add(`${horizontalWrap ? wrapValue(tile.col + dx, columns) : tile.col + dx},${tile.row + dy}`);
      }
    }
    affected = Array.from(keys, key => tileMap.get(key)).filter(Boolean);
  }
  affected.forEach((tile) => {
    tile.ownerBorderSegments = [];
    if (!Number.isFinite(tile.owner)) {
      return;
    }
    const parity = tile.row % 2 === 0 ? "even" : "odd";
    const borderColor = ownerSecondaryColors[tile.owner] || "#ffffff";
    edges.forEach((edge) => {
      const offset = edge.offsets[parity];
      const neighbor = tileMap.get(
        `${horizontalWrap ? wrapValue(tile.col + offset[0], columns) : tile.col + offset[0]},${tile.row + offset[1]}`
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

export function deriveSecondaryColor(color) {
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

export function parseHexColor(color) {
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

export function desaturateColor(color, amount = 0.25) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  const mix = (channel) =>
    Math.round(channel + (avg - channel) * Math.min(Math.max(amount, 0), 1));
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

export function adjustedTerrainFill(tile, getColor) {
  if (!tile) {
    return { color: "#3c3c3c", alpha: 1 };
  }
  const baseColor = getColor
    ? getColor(tile.terrainId)
    : terrainColor(tile.terrainId);
  let color = baseColor;
  if (tile.featureId && FEATURE_TINTS[tile.featureId]) {
    color = blendHexColors(color, FEATURE_TINTS[tile.featureId], 0.25);
  }
  if (Number(tile.elevation) === 2) {
    color = blendHexColors(color, "#eef3f8", 0.62);
  } else if (Number(tile.elevation) === 1) {
    color = blendHexColors(color, "#e4ebf0", 0.28);
  }
  if (tile.pillaged) {
    color = desaturateColor(color, 0.3);
  }
  return { color, alpha: 1 };
}

export function textStrokeStyleForFill(fill) {
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

export function toHex(value) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}
