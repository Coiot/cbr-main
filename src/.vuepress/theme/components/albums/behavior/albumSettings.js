import { normalize } from "../../../util.js";

export const pageDir = (path) => {
  const normalized = normalize(path).replace(/\/$/, "");
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/") || "/";
};

export const REACTION_POLL_INTERVAL = 60000;

export const DEFAULT_REACTION_OPTIONS = [
  { key: "smart", label: "Smart", emoji: "🧠" },
  { key: "clap", label: "Clap", emoji: "👏" },
  { key: "mindblown", label: "MindBlown", emoji: "🤯" },
  { key: "pray", label: "Pray", emoji: "🙏" },
  { key: "fire", label: "Fire", emoji: "🔥" },
  { key: "facepalm", label: "FacePalm", emoji: "🤦" },
  { key: "popcorn", label: "Popcorn", emoji: "🍿" },
  { key: "star", label: "Star", emoji: "⭐" },
  { key: "salt", label: "Salt", emoji: "🧂" },
  { key: "hype", label: "Hype", emoji: "🚀" },
  { key: "heart", label: "Heart", emoji: "❤️" },
  { key: "laugh", label: "Laugh", emoji: "😂" },
  { key: "stress", label: "Stress", emoji: "😰" },
  { key: "scared", label: "Scared", emoji: "😱" },
  { key: "tears", label: "Tears", emoji: "😭" },
  { key: "rage", label: "Rage", emoji: "😡" },
  { key: "rip", label: "RIP", emoji: "🪦" },
];

export const COMMENT_WINDOW_DAYS = 7;

export const COMMENT_MAX_LENGTH = 600;

export const COMMENT_FALLBACK_PRIMARY = "#6c6c6c";

export const COMMENT_FALLBACK_SECONDARY = "#d1c3a1";

export const SEASON_FIVE_PR_COMMENT_CUTOFF = new Date(2026, 1, 11, 23, 59, 59, 999);

export const SEASON_FIVE_PR_COMMENT_LABEL = new Date(2026, 1, 11);

export const RESUME_SYNC_DEBOUNCE = 4000;

export const CINEMATIC_NARRATION_LAYOUT_KEY = "albumsCinematicNarrationLayout";

export const albumSceneCache = new Map();
