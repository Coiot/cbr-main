import publicConfig from "../../../../../shared/publicConfig.json";

export const SUPABASE_MAP_ID = publicConfig.MAP_ID;

export const SUPABASE_OVERRIDE_TABLE = publicConfig.TILE_OVERRIDE_TABLE;

export const SUPABASE_EDIT_LOG_TABLE = "tile_edits";

export const SUPABASE_SNAPSHOT_TABLE = publicConfig.SNAPSHOT_TABLE;

export const SUPABASE_ADMIN_TABLE = "map_admins";

export const REQUIRE_AUTH_FOR_LOCAL = false;

export const ENABLE_OVERRIDE_CLEANUP = false;

export const SUPABASE_UNDO_FUNCTION = "undo-tile-edits";

export const MINI_MAP_MAX_WIDTH = 180;

export const MINI_MAP_MAX_HEIGHT = 120;

export const COMBO_MAX_RESULTS = 20;

export const QUICK_JUMP_FOCUS_SCALE = 1.5;

export const MAP_PINS_STORAGE_KEY = "cbr.mapPins.v1";

export const MAP_CONTRAST_SETTINGS_KEY = "cbr.mapContrast.v1";

export const MAP_SNAPSHOT_LIST_STORAGE_KEY = "cbr.mapSnapshots.v1";

export const MAP_SNAPSHOT_PAYLOAD_STORAGE_KEY = "cbr.mapSnapshotPayloads.v1";

export const SNAPSHOT_LIST_CACHE_TTL_MS = 30 * 1000;

export const SNAPSHOT_PAYLOAD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const SNAPSHOT_PAYLOAD_CACHE_MAX_ITEMS = 3;

export const MAP_CONTRAST_CLOUD_KEYS = Object.freeze({
  contrastHideDecorations: "mapContrastHideDecorations",
  contrastFlattenLandWater: "mapContrastFlattenLandWater",
  contrastGrayscaleTerrain: "mapContrastGrayscaleTerrain",
  contrastBoostOwnerOpacity: "mapContrastBoostOwnerOpacity",
  contrastLargeCityBanners: "mapContrastLargeCityBanners",
});

export const RELIGION_OVERLAY_DEFINITIONS = Object.freeze([
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

export const RELIGION_OVERLAY_FALLBACK_COLORS = [
  "#d8cf67",
  "#b277d9",
  "#f39b4a",
  "#71c5ef",
  "#e5744d",
  "#7ac65c",
  "#cd4f99",
  "#5a9dd9",
];

export function serializeSupabaseError(error) {
  if (!error) {
    return null;
  }
  const fallbackMessage =
    typeof error === "string" ? error : "Unknown Supabase error.";
  const payload = {
    message:
      error && typeof error.message === "string"
        ? error.message
        : fallbackMessage,
  };
  if (error && typeof error.name === "string") {
    payload.name = error.name;
  }
  if (error && typeof error.code !== "undefined") {
    payload.code = error.code;
  }
  if (error && typeof error.status !== "undefined") {
    payload.status = error.status;
  }
  if (error && typeof error.details !== "undefined") {
    payload.details = error.details;
  }
  if (error && typeof error.hint !== "undefined") {
    payload.hint = error.hint;
  }
  return payload;
}
