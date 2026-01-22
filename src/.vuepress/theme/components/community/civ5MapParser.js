const TEXT_DECODER = new TextDecoder("utf-8");

export function parseCiv5Map(buffer) {
  const view = new DataView(buffer);
  let offset = 0;

  const scenarioVersion = view.getUint8(offset);
  offset += 1;
  const version = scenarioVersion & 0x0f;

  const width = view.getUint32(offset, true);
  offset += 4;
  const height = view.getUint32(offset, true);
  offset += 4;

  const playerCount = view.getUint8(offset);
  offset += 1;
  const settings = new Uint8Array(buffer, offset, 4);
  offset += 4;

  const terrainDataSize = view.getUint32(offset, true);
  offset += 4;
  const featureTerrainDataSize = view.getUint32(offset, true);
  offset += 4;
  const featureWonderDataSize = view.getUint32(offset, true);
  offset += 4;
  const resourceDataSize = view.getUint32(offset, true);
  offset += 4;
  const modDataSize = view.getUint32(offset, true);
  offset += 4;
  const mapNameLength = view.getUint32(offset, true);
  offset += 4;
  const mapDescriptionLength = view.getUint32(offset, true);
  offset += 4;

  const terrainList = readStringList(buffer, offset, terrainDataSize);
  offset += terrainDataSize;
  const featureTerrainList = readStringList(buffer, offset, featureTerrainDataSize);
  offset += featureTerrainDataSize;
  const featureWonderList = readStringList(buffer, offset, featureWonderDataSize);
  offset += featureWonderDataSize;
  const resourceList = readStringList(buffer, offset, resourceDataSize);
  offset += resourceDataSize;
  const modData = readString(buffer, offset, modDataSize);
  offset += modDataSize;
  const mapName = readString(buffer, offset, mapNameLength);
  offset += mapNameLength;
  const mapDescription = readString(buffer, offset, mapDescriptionLength);
  offset += mapDescriptionLength;

  let worldSize = null;
  if (version >= 11) {
    const worldSizeLength = view.getUint32(offset, true);
    offset += 4;
    worldSize = readString(buffer, offset, worldSizeLength);
    offset += worldSizeLength;
  }

  const mapGeoOffset = offset;
  const tileCount = width * height;
  const mapGeoSize = tileCount * 8;
  offset += mapGeoSize;

  const gameHeaderOffset = offset;
  offset += 68;
  const maxTurns = view.getUint32(offset, true);
  offset += 4;
  offset += 4;
  const startYear = view.getUint32(offset, true);
  offset += 4;
  const playableCount = view.getUint8(offset);
  offset += 1;
  const cityStateCount = view.getUint8(offset);
  offset += 1;
  const teamCount = view.getUint8(offset);
  offset += 1;
  offset += 1;

  const improvementDataSize = view.getUint32(offset, true);
  offset += 4;
  const unitTypeDataSize = view.getUint32(offset, true);
  offset += 4;
  const techTypeDataSize = view.getUint32(offset, true);
  offset += 4;
  const policyTypeDataSize = view.getUint32(offset, true);
  offset += 4;
  const buildingTypeDataSize = view.getUint32(offset, true);
  offset += 4;
  const promotionTypeDataSize = view.getUint32(offset, true);
  offset += 4;
  const unitDataSize = view.getUint32(offset, true);
  offset += 4;
  const unitNameDataSize = view.getUint32(offset, true);
  offset += 4;
  const cityDataSize = view.getUint32(offset, true);
  offset += 4;
  let victoryDataSize = 0;
  let gameOptionDataSize = 0;
  if (version >= 11) {
    victoryDataSize = view.getUint32(offset, true);
    offset += 4;
    gameOptionDataSize = view.getUint32(offset, true);
    offset += 4;
  }

  const improvementList = readStringList(buffer, offset, improvementDataSize);
  offset += improvementDataSize;
  const unitTypeList = readStringList(buffer, offset, unitTypeDataSize);
  offset += unitTypeDataSize;
  offset += techTypeDataSize;
  offset += policyTypeDataSize;
  offset += buildingTypeDataSize;
  offset += promotionTypeDataSize;

  const unitDataOffset = offset;
  offset += unitDataSize;
  const unitNameOffset = offset;
  offset += unitNameDataSize;
  const cityDataOffset = offset;
  offset += cityDataSize;

  offset += victoryDataSize;
  offset += gameOptionDataSize;

  const improvementBlockOffset = buffer.byteLength - tileCount * 8;

  const mapTiles = parseMapTiles(view, mapGeoOffset, width, height);
  const improvementTiles = parseImprovementTiles(
    view,
    improvementBlockOffset,
    tileCount
  );
  const units = parseUnits(
    view,
    unitDataOffset,
    unitDataSize,
    version,
    unitTypeList,
    unitNameOffset,
    unitNameDataSize
  );
  const cities = parseCities(view, cityDataOffset, cityDataSize, version);

  return {
    version,
    width,
    height,
    playerCount,
    settings: Array.from(settings),
    terrainList,
    featureTerrainList,
    featureWonderList,
    resourceList,
    improvementList,
    unitTypeList,
    modData,
    mapName,
    mapDescription,
    worldSize,
    maxTurns,
    startYear,
    playableCount,
    cityStateCount,
    teamCount,
    mapTiles,
    improvementTiles,
    units,
    cities,
    offsets: {
      mapGeoOffset,
      gameHeaderOffset,
      improvementBlockOffset,
    },
  };
}

function readStringList(buffer, offset, length) {
  if (!length) {
    return [];
  }
  const bytes = new Uint8Array(buffer, offset, length);
  const text = TEXT_DECODER.decode(bytes);
  return text
    .split("\u0000")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readString(buffer, offset, length) {
  if (!length) {
    return "";
  }
  const bytes = new Uint8Array(buffer, offset, length);
  return TEXT_DECODER.decode(bytes).replace(/\u0000+$/, "");
}

function readFixedString(view, offset, length) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  return TEXT_DECODER.decode(bytes).replace(/\u0000+$/, "");
}

function parseMapTiles(view, offset, width, height) {
  const tiles = new Array(width * height);
  let cursor = offset;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const terrainType = view.getUint8(cursor);
      cursor += 1;
      const resourceType = view.getUint8(cursor);
      cursor += 1;
      const featureTerrainType = view.getUint8(cursor);
      cursor += 1;
      const riverData = view.getUint8(cursor);
      cursor += 1;
      const elevation = view.getUint8(cursor);
      cursor += 1;
      const continent = view.getUint8(cursor);
      cursor += 1;
      const featureWonderType = view.getUint8(cursor);
      cursor += 1;
      const resourceAmount = view.getUint8(cursor);
      cursor += 1;

      tiles[index] = {
        col,
        row,
        terrainType,
        resourceType,
        featureTerrainType,
        riverData,
        elevation,
        continent,
        featureWonderType,
        resourceAmount,
      };
    }
  }
  return tiles;
}

function parseImprovementTiles(view, offset, tileCount) {
  const tiles = new Array(tileCount);
  let cursor = offset;
  for (let index = 0; index < tileCount; index += 1) {
    const cityId = view.getUint16(cursor, true);
    cursor += 2;
    const unitId = view.getUint16(cursor, true);
    cursor += 2;
    const owner = view.getUint8(cursor);
    cursor += 1;
    const improvement = view.getUint8(cursor);
    cursor += 1;
    const routeType = view.getUint8(cursor);
    cursor += 1;
    const routeOwner = view.getUint8(cursor);
    cursor += 1;
    tiles[index] = {
      cityId,
      unitId,
      owner,
      improvement,
      routeType,
      routeOwner,
    };
  }
  return tiles;
}

function parseUnits(
  view,
  offset,
  size,
  version,
  unitTypeList,
  unitNameOffset,
  unitNameSize
) {
  if (!size) {
    return [];
  }
  const unitStructSize = version >= 12 ? 84 : 48;
  const count = Math.floor(size / unitStructSize);
  const units = [];
  let cursor = offset;

  for (let index = 0; index < count; index += 1) {
    cursor += 2;
    const nameIndex = view.getUint16(cursor, true);
    cursor += 2;
    const experience = view.getUint32(cursor, true);
    cursor += 4;
    const health = view.getUint32(cursor, true);
    cursor += 4;
    const unitType = version >= 12 ? view.getUint32(cursor, true) : view.getUint8(cursor);
    cursor += version >= 12 ? 4 : 1;
    const owner = view.getUint8(cursor);
    cursor += 1;
    const facing = view.getUint8(cursor);
    cursor += 1;
    const status = view.getUint8(cursor);
    cursor += 1;
    if (version >= 12) {
      cursor += 1;
    }
    cursor += version >= 12 ? 64 : 32;

    units.push({
      id: index,
      nameIndex,
      name: readUnitName(view, unitNameOffset, unitNameSize, nameIndex),
      type: unitTypeList[unitType] || null,
      owner,
      experience,
      health,
      facing,
      status,
    });
  }
  return units;
}

function readUnitName(view, offset, size, nameIndex) {
  if (!size || nameIndex === 0xffff) {
    return "";
  }
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, size);
  const text = TEXT_DECODER.decode(bytes);
  const parts = text.split("\u0000").filter(Boolean);
  return parts[nameIndex] || "";
}

function parseCities(view, offset, size, version) {
  if (!size) {
    return [];
  }
  const cityStructSize = version >= 12 ? 136 : 104;
  const count = Math.floor(size / cityStructSize);
  const cities = [];
  let cursor = offset;
  for (let index = 0; index < count; index += 1) {
    const name = readFixedString(view, cursor, 64);
    cursor += 64;
    const owner = view.getUint8(cursor);
    cursor += 1;
    const settings = view.getUint8(cursor);
    cursor += 1;
    const population = view.getUint16(cursor, true);
    cursor += 2;
    const health = view.getUint32(cursor, true);
    cursor += 4;
    cursor += version >= 12 ? 64 : 32;
    cities.push({
      id: index,
      name,
      owner,
      settings,
      population,
      health,
    });
  }
  return cities;
}
