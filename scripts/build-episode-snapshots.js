/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const yamlFrontMatter = require("yaml-front-matter");
const { createClient } = require("@supabase/supabase-js");

const ROOT_DIR = path.join(__dirname, "..");
const EPISODES_DIR = path.join(ROOT_DIR, "src/albums/s5");
const POWER_RANKINGS_DIR = path.join(ROOT_DIR, "src/albums/pr");
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
const SUPABASE_OVERRIDE_TABLE = "tile_overrides";
const FORCE_SNAPSHOT_REBUILD = process.env.FORCE_SNAPSHOT_REBUILD === "1";
const BUILD_COMMIT =
  process.env.COMMIT_REF ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "HEAD";
let automaticSnapshotRequired = false;

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

const snapshotOutputPathForEpisode = (episodeNumber) =>
  path.join(OUTPUT_DIR, `${snapshotSlug(episodeNumber)}.json`);

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

const getNewSeasonFivePowerRankingEpisodes = () => {
  if (!fs.existsSync(POWER_RANKINGS_DIR)) {
    return [];
  }
  let addedFiles = [];
  try {
    const output = execFileSync(
      "git",
      [
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "--diff-filter=A",
        "--root",
        "-m",
        "-r",
        BUILD_COMMIT,
        "--",
        "src/albums/pr",
      ],
      { cwd: ROOT_DIR, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    addedFiles = output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    console.warn(
      `Unable to inspect ${BUILD_COMMIT} for newly added Power Rankings.`
    );
    return [];
  }

  return addedFiles
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .map((file) => {
      const fullPath = path.join(ROOT_DIR, file);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      let frontmatter;
      try {
        frontmatter = yamlFrontMatter.loadFront(
          fs.readFileSync(fullPath, "utf8")
        );
      } catch (error) {
        return null;
      }
      const season = String(frontmatter.pr || "").trim().toLowerCase();
      if (season !== "s5") {
        return null;
      }
      const rawNumber = episodeNumberFromTitle(frontmatter.title);
      const number = normalizeEpisodeNumber(rawNumber);
      return number ? { file, number, rawNumber } : null;
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
    return { wrote: false, skipped: false, outputPath: null };
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = snapshotOutputPathForEpisode(episodeNumber);
  if (!FORCE_SNAPSHOT_REBUILD && fs.existsSync(outputPath)) {
    return { wrote: false, skipped: true, outputPath };
  }
  fs.writeFileSync(outputPath, JSON.stringify(payload), "utf8");
  return { wrote: true, skipped: false, outputPath };
};

const fetchSnapshotPayload = async (supabase, snapshotId) => {
  const { data, error } = await supabase
    .from(SUPABASE_SNAPSHOT_TABLE)
    .select("payload")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data && Array.isArray(data.payload) ? data.payload : null;
};

const fetchLiveOverrides = async (supabase, snapshotId) => {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; from < 50000; from += pageSize) {
    let query = supabase
      .from(SUPABASE_OVERRIDE_TABLE)
      .select("tile_key,payload")
      .eq("map_id", SUPABASE_MAP_ID)
      .order("tile_key", { ascending: true });
    query = snapshotId
      ? query.eq("snapshot_id", snapshotId)
      : query.is("snapshot_id", null);
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      throw error;
    }
    if (!Array.isArray(data) || !data.length) {
      break;
    }
    rows.push(...data);
    if (data.length < pageSize) {
      break;
    }
  }
  return rows;
};

const buildLiveSnapshotPayload = async (supabase) => {
  const { data, error } = await supabase
    .from(SUPABASE_SNAPSHOT_TABLE)
    .select("id,payload")
    .eq("map_id", SUPABASE_MAP_ID)
    .eq("is_published", true)
    .order("episode_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    throw error;
  }
  const base = Array.isArray(data) && data.length ? data[0] : null;
  if (!base || !Array.isArray(base.payload) || !base.payload.length) {
    return null;
  }
  const overrides = await fetchLiveOverrides(supabase, base.id || null);
  const payloadByKey = new Map();
  base.payload.forEach((row) => {
    if (row && row.tile_key) {
      payloadByKey.set(row.tile_key, row);
    }
  });
  overrides.forEach((row) => {
    if (row && row.tile_key) {
      payloadByKey.set(row.tile_key, {
        tile_key: row.tile_key,
        payload: row.payload,
      });
    }
  });
  return Array.from(payloadByKey.values());
};

const buildSnapshots = async () => {
  const episodes = getSeasonFiveEpisodes();
  const newPowerRankings = getNewSeasonFivePowerRankingEpisodes();
  automaticSnapshotRequired = newPowerRankings.some(
    (episode) => !fs.existsSync(snapshotOutputPathForEpisode(episode.number))
  );
  const episodeByNumber = new Map(
    episodes.map((episode) => [episode.number, episode])
  );
  newPowerRankings.forEach((episode) => {
    if (!episodeByNumber.has(episode.number)) {
      episodeByNumber.set(episode.number, episode);
    }
  });
  const snapshotCandidates = Array.from(episodeByNumber.values());
  if (!snapshotCandidates.length) {
    console.log("No Season 5 episodes found for snapshots.");
    return;
  }
  const episodesNeedingWrite = FORCE_SNAPSHOT_REBUILD
    ? snapshotCandidates
    : snapshotCandidates.filter(
        (episode) =>
          !fs.existsSync(snapshotOutputPathForEpisode(episode.number))
      );
  const episodeZeroNeedsWrite =
    FORCE_SNAPSHOT_REBUILD || !fs.existsSync(snapshotOutputPathForEpisode("0"));
  if (!episodesNeedingWrite.length && !episodeZeroNeedsWrite) {
    console.log(
      "Episode snapshots already present locally. Skipping snapshot rebuild."
    );
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from(SUPABASE_SNAPSHOT_TABLE)
    .select("id,episode_label")
    .eq("map_id", SUPABASE_MAP_ID)
    .eq("is_published", true);
  if (error) {
    throw error;
  }
  const snapshotMap = new Map();
  (data || []).forEach((snapshot) => {
    if (snapshot && snapshot.episode_label) {
      snapshotMap.set(String(snapshot.episode_label).trim(), snapshot.id);
    }
  });
  let wrote = 0;
  let skipped = 0;
  episodesNeedingWrite.forEach((episode) => {
    const label = buildSnapshotLabel(episode.number);
    const padded =
      episode.rawNumber && episode.rawNumber !== episode.number
        ? buildSnapshotLabel(episode.rawNumber)
        : "";
    const snapshotId =
      snapshotMap.get(label) || (padded ? snapshotMap.get(padded) : null);
    if (!snapshotId) {
      return;
    }
    snapshotMap.set(episode.number, snapshotId);
  });
  for (const episode of episodesNeedingWrite) {
    const snapshotId = snapshotMap.get(episode.number);
    if (!snapshotId) {
      continue;
    }
    const payload = await fetchSnapshotPayload(supabase, snapshotId);
    const result = writeSnapshotFile(episode.number, payload);
    if (result.wrote) {
      wrote += 1;
      console.log(
        `Wrote snapshot for ${buildSnapshotLabel(episode.number)} to ${
          result.outputPath
        }`
      );
    } else if (result.skipped) {
      skipped += 1;
      console.log(
        `Skipped ${buildSnapshotLabel(
          episode.number
        )}; snapshot already exists.`
      );
    }
  }
  const triggeredEpisodes = newPowerRankings.filter(
    (episode) =>
      !fs.existsSync(snapshotOutputPathForEpisode(episode.number)) &&
      !snapshotMap.get(episode.number)
  );
  if (triggeredEpisodes.length) {
    const livePayload = await buildLiveSnapshotPayload(supabase);
    triggeredEpisodes.forEach((episode) => {
      const result = writeSnapshotFile(episode.number, livePayload);
      if (result.wrote) {
        wrote += 1;
        console.log(
          `Created snapshot for newly added S5 Power Ranking Episode ${episode.number} from the live map.`
        );
      }
    });
  }
  if (episodeZeroNeedsWrite) {
    const episodeZeroPayload = buildEpisodeZeroPayload();
    if (episodeZeroPayload) {
      const result = writeSnapshotFile("0", episodeZeroPayload);
      if (result.wrote) {
        wrote += 1;
        console.log(
          `Wrote snapshot for Episode 0 Snapshot to ${result.outputPath}`
        );
      } else if (result.skipped) {
        skipped += 1;
        console.log("Skipped Episode 0 Snapshot; snapshot already exists.");
      }
    }
  }
  if (automaticSnapshotRequired) {
    const missingTriggeredEpisodes = newPowerRankings.filter(
      (episode) => !fs.existsSync(snapshotOutputPathForEpisode(episode.number))
    );
    if (missingTriggeredEpisodes.length) {
      throw new Error(
        `Snapshot creation produced no payload for S5 Power Ranking Episode ${missingTriggeredEpisodes
          .map((episode) => episode.number)
          .join(", ")}.`
      );
    }
  }
  if (!wrote && !skipped) {
    console.log("No matching snapshots found for Season 5 episodes.");
  }
};

buildSnapshots().catch((error) => {
  console.error(error);
  if (automaticSnapshotRequired) {
    console.error(
      "Unable to create the required snapshot for the newly added Power Ranking."
    );
    process.exit(1);
  }
  console.warn("Skipping episode snapshot generation.");
  process.exit(0);
});
