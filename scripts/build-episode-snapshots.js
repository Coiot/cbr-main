/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const yamlFrontMatter = require("yaml-front-matter");
const { createClient } = require("@supabase/supabase-js");

const ROOT_DIR = path.join(__dirname, "..");
const EPISODES_DIR = path.join(ROOT_DIR, "src/albums/s5");
const PUBLIC_DIR = path.join(ROOT_DIR, "src/.vuepress/public");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "community/snapshots");
const STATE_CACHE_PATH = path.join(
  PUBLIC_DIR,
  "community/CBRXMapOct62025_V2.state.json"
);

const SUPABASE_URL = "https://ndgkvyldchkgyyoaeukt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EHgYIUVagLDrS166HDpv3g_seLG2CN_";
const SUPABASE_MAP_ID = "s5";
const SUPABASE_SNAPSHOT_TABLE = "map_snapshots";

const normalizeEpisodeNumber = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const raw = String(value).trim();
  if (!raw) {
    return "";
  }
  if (raw.includes(".")) {
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? String(numeric) : raw;
  }
  const numeric = Number.parseInt(raw, 10);
  return Number.isFinite(numeric) ? String(numeric) : raw;
};

const episodeNumberFromTitle = (title) => {
  const match = String(title || "").match(/episode\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? match[1] : "";
};

const snapshotSlug = (episodeNumber) => {
  const safe = String(episodeNumber || "").replace(/\./g, "-");
  return `s5-episode-${safe}`;
};

const getSeasonFiveEpisodes = () => {
  if (!fs.existsSync(EPISODES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(EPISODES_DIR)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .filter((file) => !file.toLowerCase().includes("readme"))
    .map((file) => {
      const fullPath = path.join(EPISODES_DIR, file);
      let frontmatter;
      try {
        frontmatter = yamlFrontMatter.loadFront(
          fs.readFileSync(fullPath, "utf8")
        );
      } catch (error) {
        return null;
      }
      const rawNumber =
        String(
          frontmatter.episode_number ||
            frontmatter.episodeNumber ||
            frontmatter.episode ||
            episodeNumberFromTitle(frontmatter.title)
        ).trim() || "";
      const number =
        normalizeEpisodeNumber(rawNumber) ||
        normalizeEpisodeNumber(frontmatter.episode_number) ||
        normalizeEpisodeNumber(frontmatter.episodeNumber) ||
        normalizeEpisodeNumber(frontmatter.episode) ||
        normalizeEpisodeNumber(episodeNumberFromTitle(frontmatter.title));
      if (!number) {
        return null;
      }
      return {
        file,
        number,
        rawNumber,
      };
    })
    .filter(Boolean);
};

const buildSnapshotLabel = (episodeNumber) =>
  `Episode ${episodeNumber} Snapshot`;

const buildEpisodeZeroPayload = () => {
  if (!fs.existsSync(STATE_CACHE_PATH)) {
    return null;
  }
  const stateData = JSON.parse(fs.readFileSync(STATE_CACHE_PATH, "utf8"));
  const width = Number(stateData.width || 0);
  const height = Number(stateData.height || 0);
  const tileCount = Number(stateData.tileCount || width * height || 0);
  if (!width || !height || !tileCount) {
    return null;
  }
  const owners = Array.isArray(stateData.owner) ? stateData.owner : [];
  const cityIds = Array.isArray(stateData.cityId) ? stateData.cityId : [];
  const cities = Array.isArray(stateData.cities) ? stateData.cities : [];
  const cityMap = new Map(cities.map((city) => [city.id, city]));
  const payload = new Array(tileCount);
  for (let i = 0; i < tileCount; i += 1) {
    const col = i % width;
    const row = Math.floor(i / width);
    const displayRow = height - 1 - row;
    const owner =
      Number.isFinite(owners[i]) && owners[i] !== 255 ? owners[i] : null;
    const cityId =
      Number.isFinite(cityIds[i]) && cityIds[i] !== 65535 ? cityIds[i] : null;
    const cityData = cityId !== null ? cityMap.get(cityId) : null;
    const city = cityData
      ? {
          id: cityData.id,
          name: cityData.name,
          size: cityData.population || cityData.size || 1,
          owner:
            Number.isFinite(cityData.owner) && cityData.owner !== 255
              ? cityData.owner
              : owner,
          religion: cityData.religion || "",
          worldWonders: Array.isArray(cityData.worldWonders)
            ? [...cityData.worldWonders]
            : [],
          isPuppeted: !!cityData.isPuppeted,
          isOccupied: !!cityData.isOccupied,
          isResistance: !!cityData.isResistance,
          isCapital: !!cityData.isCapital,
          isCustom: !!cityData.isCustom,
        }
      : null;
    payload[i] = {
      tile_key: `${col},${displayRow}`,
      payload: {
        owner,
        originalOwner: owner,
        notes: null,
        pillaged: false,
        ruins: false,
        citadel: false,
        combatUnit: null,
        civilianUnit: null,
        city,
      },
    };
  }
  return payload;
};

const writeSnapshotFile = (episodeNumber, payload) => {
  if (!Array.isArray(payload) || !payload.length) {
    return false;
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug = snapshotSlug(episodeNumber);
  const outputPath = path.join(OUTPUT_DIR, `${slug}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(payload), "utf8");
  return outputPath;
};

const buildSnapshots = async () => {
  const episodes = getSeasonFiveEpisodes();
  if (!episodes.length) {
    console.log("No Season 5 episodes found for snapshots.");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from(SUPABASE_SNAPSHOT_TABLE)
    .select("id,episode_label,episode_at,created_at,payload,is_published")
    .eq("map_id", SUPABASE_MAP_ID)
    .eq("is_published", true);
  if (error) {
    throw error;
  }
  const snapshotMap = new Map();
  (data || []).forEach((snapshot) => {
    if (snapshot && snapshot.episode_label) {
      snapshotMap.set(String(snapshot.episode_label).trim(), snapshot);
    }
  });
  let wrote = 0;
  episodes.forEach((episode) => {
    const label = buildSnapshotLabel(episode.number);
    const padded =
      episode.rawNumber && episode.rawNumber !== episode.number
        ? buildSnapshotLabel(episode.rawNumber)
        : "";
    const snapshot =
      snapshotMap.get(label) || (padded ? snapshotMap.get(padded) : null);
    if (!snapshot) {
      return;
    }
    const outputPath = writeSnapshotFile(episode.number, snapshot.payload);
    if (outputPath) {
      wrote += 1;
      console.log(`Wrote snapshot for ${label} to ${outputPath}`);
    }
  });
  const episodeZeroPayload = buildEpisodeZeroPayload();
  if (episodeZeroPayload) {
    const outputPath = writeSnapshotFile("0", episodeZeroPayload);
    if (outputPath) {
      wrote += 1;
      console.log(`Wrote snapshot for Episode 0 Snapshot to ${outputPath}`);
    }
  }
  if (!wrote) {
    console.log("No matching snapshots found for Season 5 episodes.");
  }
};

buildSnapshots().catch((error) => {
  console.error(error);
  console.warn("Skipping episode snapshot generation.");
  process.exit(0);
});
