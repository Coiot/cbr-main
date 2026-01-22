#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const MAP_INPUT = path.join(
  ROOT,
  "src/.vuepress/public/community/CBRXMapOct62025_V2.civ5map"
);
const SAVE_INPUT = path.join(
  ROOT,
  "src/.vuepress/data/AutoSave_0167 AD-1070.Civ5Save"
);
const BASE_OUTPUT = path.join(
  ROOT,
  "src/.vuepress/public/community/CBRXMapOct62025_V2.base.json"
);
const STATE_OUTPUT = path.join(
  ROOT,
  "src/.vuepress/public/community/CBRXMapOct62025_V2.state.json"
);

function readStringList(buffer, offset, length) {
  if (!length) {
    return [];
  }
  const text = buffer.slice(offset, offset + length).toString("utf8");
  return text
    .split("\u0000")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readString(buffer, offset, length) {
  if (!length) {
    return "";
  }
  return buffer
    .slice(offset, offset + length)
    .toString("utf8")
    .replace(/\u0000+$/, "");
}

function parseMapTiles(buffer, offset, width, height) {
  const tiles = new Array(width * height);
  let cursor = offset;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const terrainType = buffer.readUInt8(cursor);
      cursor += 1;
      const resourceType = buffer.readUInt8(cursor);
      cursor += 1;
      const featureTerrainType = buffer.readUInt8(cursor);
      cursor += 1;
      const riverData = buffer.readUInt8(cursor);
      cursor += 1;
      const elevation = buffer.readUInt8(cursor);
      cursor += 1;
      const continent = buffer.readUInt8(cursor);
      cursor += 1;
      const featureWonderType = buffer.readUInt8(cursor);
      cursor += 1;
      const resourceAmount = buffer.readUInt8(cursor);
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

function parseCiv5Map(buffer) {
  let offset = 0;
  const scenarioVersion = buffer.readUInt8(offset);
  offset += 1;
  const version = scenarioVersion & 0x0f;

  const width = buffer.readUInt32LE(offset);
  offset += 4;
  const height = buffer.readUInt32LE(offset);
  offset += 4;

  offset += 1; // player count
  offset += 4; // settings

  const terrainDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const featureTerrainDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const featureWonderDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const resourceDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const modDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const mapNameLength = buffer.readUInt32LE(offset);
  offset += 4;
  const mapDescriptionLength = buffer.readUInt32LE(offset);
  offset += 4;

  const terrainList = readStringList(buffer, offset, terrainDataSize);
  offset += terrainDataSize;
  const featureTerrainList = readStringList(
    buffer,
    offset,
    featureTerrainDataSize
  );
  offset += featureTerrainDataSize;
  const featureWonderList = readStringList(
    buffer,
    offset,
    featureWonderDataSize
  );
  offset += featureWonderDataSize;
  const resourceList = readStringList(buffer, offset, resourceDataSize);
  offset += resourceDataSize;
  offset += modDataSize;
  const mapName = readString(buffer, offset, mapNameLength);
  offset += mapNameLength;
  const mapDescription = readString(buffer, offset, mapDescriptionLength);
  offset += mapDescriptionLength;

  if (version >= 11) {
    const worldSizeLength = buffer.readUInt32LE(offset);
    offset += 4 + worldSizeLength;
  }

  const mapGeoOffset = offset;
  const tileCount = width * height;
  const mapGeoSize = tileCount * 8;
  offset += mapGeoSize;

  offset += 68; // game header
  offset += 4; // max turns
  offset += 4; // unknown
  offset += 4; // start year
  offset += 1; // player count
  offset += 1; // city state count
  offset += 1; // team count
  offset += 1; // unknown

  const improvementDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const unitTypeDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const techTypeDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const policyTypeDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const buildingTypeDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const promotionTypeDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const unitDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const unitNameDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  const cityDataSize = buffer.readUInt32LE(offset);
  offset += 4;
  if (version >= 11) {
    offset += 4; // victory data size
    offset += 4; // game option data size
  }

  const improvementList = readStringList(buffer, offset, improvementDataSize);
  offset += improvementDataSize;
  offset += unitTypeDataSize;
  offset += techTypeDataSize;
  offset += policyTypeDataSize;
  offset += buildingTypeDataSize;
  offset += promotionTypeDataSize;
  offset += unitDataSize;
  offset += unitNameDataSize;
  offset += cityDataSize;

  const mapTiles = parseMapTiles(buffer, mapGeoOffset, width, height);

  return {
    version,
    width,
    height,
    mapName,
    mapDescription,
    terrainList,
    featureTerrainList,
    featureWonderList,
    resourceList,
    improvementList,
    mapTiles,
  };
}

function findCompressedBlock(buffer) {
  const marker = Buffer.from([
    0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x78, 0x9c,
  ]);
  const index = buffer.indexOf(marker);
  if (index === -1) {
    throw new Error("Unable to locate save file compressed block.");
  }
  return index + 8;
}

function inflateSaveBuffer(buffer) {
  const start = findCompressedBlock(buffer);
  const compressed = buffer.slice(start);

  return new Promise((resolve) => {
    const inflater = zlib.createInflate();
    const chunks = [];
    let total = 0;
    let errorMsg = null;

    inflater.on("data", (chunk) => {
      chunks.push(chunk);
      total += chunk.length;
    });

    inflater.on("error", (err) => {
      errorMsg = err.message;
      resolve({
        buffer: Buffer.concat(chunks, total),
        error: errorMsg,
        ended: false,
      });
    });

    inflater.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks, total),
        error: errorMsg,
        ended: true,
      });
    });

    inflater.end(compressed);
  });
}

function scoreImprovementBlock(buffer, offset, tileCount, samples) {
  let ok = 0;
  for (let i = 0; i < samples; i += 1) {
    const index = Math.floor((tileCount - 1) * (i / samples));
    const base = offset + index * 8;
    if (base + 7 >= buffer.length) {
      return -1;
    }
    const cityId = buffer.readUInt16LE(base);
    const unitId = buffer.readUInt16LE(base + 2);
    const owner = buffer[base + 4];
    const improvement = buffer[base + 5];
    const routeType = buffer[base + 6];
    const routeOwner = buffer[base + 7];

    const routeOk = routeType === 0 || routeType === 1 || routeType === 0xff;
    const ownerOk = owner === 0xff || owner < 64;
    const improvementOk = improvement === 0xff || improvement < 256;
    const routeOwnerOk = routeOwner === 0xff || routeOwner < 64;
    const cityHigh = cityId >> 8;
    const unitHigh = unitId >> 8;
    const idOk =
      (cityHigh === 0x00 || cityHigh === 0xff) &&
      (unitHigh === 0x00 || unitHigh === 0xff);

    if (routeOk && ownerOk && improvementOk && routeOwnerOk && idOk) {
      ok += 1;
    }
  }
  return ok / samples;
}

function findImprovementBlock(buffer, width, height) {
  const tileCount = width * height;
  const blockSize = tileCount * 8;
  const samples = 64;
  const maxOffset = buffer.length - blockSize;
  let bestScore = -1;
  let bestOffset = 0;

  for (let offset = 0; offset < maxOffset; offset += 1024) {
    const score = scoreImprovementBlock(buffer, offset, tileCount, samples);
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  const refineStart = Math.max(0, bestOffset - 2048);
  const refineEnd = Math.min(maxOffset, bestOffset + 2048);
  for (let offset = refineStart; offset <= refineEnd; offset += 8) {
    const score = scoreImprovementBlock(buffer, offset, tileCount, samples);
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  return { offset: bestOffset, score: bestScore };
}

function buildStateData(buffer, width, height, offset) {
  const tileCount = width * height;
  const owner = new Array(tileCount);
  const improvement = new Array(tileCount);
  const routeType = new Array(tileCount);
  const routeOwner = new Array(tileCount);
  const cityId = new Array(tileCount);
  const unitId = new Array(tileCount);

  for (let i = 0; i < tileCount; i += 1) {
    const base = offset + i * 8;
    cityId[i] = buffer.readUInt16LE(base);
    unitId[i] = buffer.readUInt16LE(base + 2);
    owner[i] = buffer[base + 4];
    improvement[i] = buffer[base + 5];
    routeType[i] = buffer[base + 6];
    routeOwner[i] = buffer[base + 7];
  }

  return {
    width,
    height,
    tileCount,
    detectedOffset: offset,
    owner,
    improvement,
    routeType,
    routeOwner,
    cityId,
    unitId,
  };
}

async function main() {
  if (!fs.existsSync(MAP_INPUT)) {
    throw new Error(`Map file not found: ${MAP_INPUT}`);
  }

  const mapBuffer = fs.readFileSync(MAP_INPUT);
  const mapData = parseCiv5Map(mapBuffer);
  const basePayload = {
    width: mapData.width,
    height: mapData.height,
    mapName: mapData.mapName,
    mapDescription: mapData.mapDescription,
    terrainList: mapData.terrainList,
    featureTerrainList: mapData.featureTerrainList,
    featureWonderList: mapData.featureWonderList,
    resourceList: mapData.resourceList,
    improvementList: mapData.improvementList,
    mapTiles: mapData.mapTiles,
  };

  fs.writeFileSync(BASE_OUTPUT, JSON.stringify(basePayload));
  console.log(`Wrote base cache to ${BASE_OUTPUT}`);

  if (!fs.existsSync(SAVE_INPUT)) {
    console.warn(`Save file not found: ${SAVE_INPUT}`);
    return;
  }

  const saveBuffer = fs.readFileSync(SAVE_INPUT);
  const inflated = await inflateSaveBuffer(saveBuffer);
  console.log(
    `Inflated save data (${inflated.buffer.length} bytes). Error: ${
      inflated.error || "none"
    }`
  );

  const { offset, score } = findImprovementBlock(
    inflated.buffer,
    mapData.width,
    mapData.height
  );
  console.log(`Improvement block offset ${offset} (score ${score}).`);

  const statePayload = buildStateData(
    inflated.buffer,
    mapData.width,
    mapData.height,
    offset
  );
  fs.writeFileSync(STATE_OUTPUT, JSON.stringify(statePayload));
  console.log(`Wrote state cache to ${STATE_OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
