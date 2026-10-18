import { normalizeEpisodeNumber } from "../../../../../shared/episode.mjs";

// album Snapshot. Methods run on the owning Vue component instance.

export const albumSnapshotComputed = {
  isSeasonFive() {
    const edition =
      (this.$page &&
        this.$page.frontmatter &&
        (this.$page.frontmatter.edition || this.$page.frontmatter.pr)) ||
      "";
    const normalized = String(edition).trim().toLowerCase();
    return (
      normalized === "s5" ||
      normalized === "season5" ||
      normalized === "season 5" ||
      normalized.includes("s5")
    );
  },
  episodeSnapshotNumber() {
    if (!this.isSeasonFive) {
      return "";
    }
    const frontmatter = (this.$page && this.$page.frontmatter) || {};
    const explicit =
      frontmatter.episode_number ||
      frontmatter.episodeNumber ||
      frontmatter.episode;
    if (explicit !== undefined && explicit !== null) {
      return normalizeEpisodeNumber(explicit);
    }
    const title = frontmatter.title || "";
    const match = String(title).match(/episode\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match) {
      return normalizeEpisodeNumber(match[1]);
    }
    const prMatch = String(frontmatter.pr || "").match(
      /([0-9]+(?:\.[0-9]+)?)/
    );
    return prMatch ? normalizeEpisodeNumber(prMatch[1]) : "";
  },
  episodeSnapshotPath() {
    if (!this.isSeasonFive || !this.episodeSnapshotNumber) {
      return "";
    }
    const safeNumber = this.episodeSnapshotNumber.replace(/\./g, "-");
    return `/community/snapshots/s5-episode-${safeNumber}.json`;
  },
  previousEpisodeSnapshotPath() {
    const episode = Number(this.episodeSnapshotNumber);
    if (!Number.isInteger(episode) || episode <= 0) {
      return "";
    }
    return `/community/snapshots/s5-episode-${episode - 1}.json`;
  },
  episodeSnapshotIsBase() {
    return this.isSeasonFive && this.episodeSnapshotNumber === "0";
  },
  episodeSnapshotTitle() {
    if (!this.episodeSnapshotNumber) {
      return "Episode Map Snapshot";
    }
    return `Episode ${this.episodeSnapshotNumber} Snapshot`;
  },
  hasEpisodeSnapshot() {
    return Boolean(this.episodeSnapshotPath || this.episodeSnapshotIsBase);
  },
  isFinalScene() {
    if (!this.sceneCount) {
      return true;
    }
    return this.activeSceneIndex >= this.sceneCount - 1;
  },
  shouldTrackSnapshot() {
    return this.hasEpisodeSnapshot && !this.isToggle && !this.snapshotInView;
  },
  shouldRenderSnapshot() {
    if (!this.hasEpisodeSnapshot) {
      return false;
    }
    if (this.isToggle) {
      return this.isFinalScene;
    }
    return this.snapshotInView;
  },
};

export const albumSnapshotMethods = {
  setupSnapshotObserver() {
    if (typeof window === "undefined") {
      return;
    }
    this.teardownSnapshotObserver();
    if (!this.shouldTrackSnapshot) {
      return;
    }
    const sentinel = this.$refs.snapshotSentinel;
    if (!sentinel) {
      return;
    }
    if ("IntersectionObserver" in window) {
      this._snapshotObserver = new IntersectionObserver((entries) => {
        if (!entries || !entries.length) {
          return;
        }
        if (entries.some((entry) => entry.isIntersecting)) {
          this.snapshotInView = true;
          this.teardownSnapshotObserver();
        }
      });
      this._snapshotObserver.observe(sentinel);
      return;
    }
    this.checkSnapshotInView();
  },
  teardownSnapshotObserver() {
    if (this._snapshotObserver) {
      this._snapshotObserver.disconnect();
      this._snapshotObserver = null;
    }
  },
  checkSnapshotInView() {
    if (
      this.snapshotInView ||
      this.isToggle ||
      typeof window === "undefined" ||
      !this.hasEpisodeSnapshot
    ) {
      return;
    }
    const sentinel = this.$refs.snapshotSentinel;
    if (!sentinel || typeof sentinel.getBoundingClientRect !== "function") {
      return;
    }
    const rect = sentinel.getBoundingClientRect();
    if (rect.top <= window.innerHeight && rect.bottom >= 0) {
      this.snapshotInView = true;
      this.teardownSnapshotObserver();
    }
  },
};
