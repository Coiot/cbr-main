<template>
  <transition name="fade">
    <div v-if="edition" class="album-list" :class="editionClass">
      <div class="header">
        <h2 class="page-title">{{ edition.title }}</h2>
        <span v-if="edition.subtitle">{{ edition.subtitle }}</span>
      </div>

      <div class="edition-controls">
        <label class="filter" :for="episodeInputId">
          <span v-once>Search episodes</span>
          <input
            :id="episodeInputId"
            v-model="episodeQuery"
            type="search"
            placeholder="Title, narrator, date, episode"
          />
        </label>
        <div v-if="episodeQuery" class="control-meta">
          <span>
            {{ filteredAlbums.length }} match{{
              filteredAlbums.length === 1 ? "" : "es"
            }}
          </span>
          <button
            type="button"
            class="control-button"
            @click="episodeQuery = ''"
          >
            Clear
          </button>
        </div>
      </div>

      <template v-if="!hasEpisodeFilter">
        <router-link
          v-for="post in featuredAlbums"
          :to="post.path"
          :key="post.path"
          class="post"
          :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
        >
          <div class="hero-overlay"></div>
          <div class="title-info">
            <p>{{ post.frontmatter.title }}</p>
            <span v-if="titleSuffix(post)">{{ titleSuffix(post) }}</span>
          </div>

          <div class="album-info">
            <p>{{ post.frontmatter.narrated_by }}</p>
            <span>
              <template
                v-if="heroMeta.showStartingTurn && hasStartingTurn(post)"
              >
                Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;
              </template>
              Release Date: {{ post.frontmatter.release_date }}
            </span>
          </div>
        </router-link>
      </template>

      <template v-else>
        <div class="filter-results">
          <h3 v-once class="section-title">Results</h3>
          <div v-if="filteredAlbums.length">
            <router-link
              v-for="post in filteredAlbums"
              :to="post.path"
              :key="post.path"
            >
              <div class="list">
                <p class="list-title">
                  {{ post.frontmatter.title }}
                  <span v-if="titleSuffix(post)" class="list-suffix">
                    {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                  </span>
                </p>

                <p class="list-meta">
                  {{ post.frontmatter.narrated_by }}
                  <span>
                    <template
                      v-if="listMeta.showStartingTurn && hasStartingTurn(post)"
                    >
                      Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;
                    </template>
                    Release Date: {{ post.frontmatter.release_date }}
                  </span>
                </p>
              </div>
            </router-link>
          </div>
          <p v-else class="empty-state">
            No episodes match "{{ episodeQuery }}".
          </p>
        </div>
      </template>

      <div
        v-if="edition.competitors && edition.competitors.length"
        class="competitors-section"
      >
        <div class="section-header">
          <h3 class="section-title">Competitors</h3>
          <button
            type="button"
            class="control-button"
            @click="competitorsOpen = !competitorsOpen"
          >
            {{ competitorsOpen ? "Hide" : "Show" }}
          </button>
        </div>
        <div class="competitor-controls">
          <label class="filter" :for="competitorInputId">
            <span v-once>Search competitors</span>
            <input
              :id="competitorInputId"
              v-model="competitorQuery"
              type="search"
              placeholder="Civ, leader, author"
            />
          </label>
          <div class="control-meta">
            <span>
              {{ filteredCompetitors.length }} result{{
                filteredCompetitors.length === 1 ? "" : "s"
              }}
            </span>
            <button
              v-if="competitorQuery"
              type="button"
              class="control-button"
              @click="competitorQuery = ''"
            >
              Clear
            </button>
          </div>
        </div>
        <a href="#competitors-end" class="skip-link" v-once>
          Skip competitors list
        </a>
        <ul v-if="competitorsOpen" class="competitors">
          <li
            v-for="civ in filteredCompetitors"
            :key="civ.id || civ.name"
            tabindex="0"
          >
            <p>{{ civ.name }}</p>
            <span>{{ civ.leader }} &ndash; {{ civ.author }}</span>
          </li>
        </ul>
        <p v-else class="collapsed-hint" v-once>Competitors hidden.</p>
        <span id="competitors-end" class="skip-target" tabindex="-1"></span>
      </div>

      <template v-if="!hasEpisodeFilter">
        <template v-if="edition.sections && edition.sections.length">
          <section
            v-for="(section, sectionIndex) in edition.sections"
            :key="section.id || section.title || `section-${sectionIndex}`"
            class="section-block"
          >
            <h3 v-if="section.title" class="section-title">
              {{ section.title }}
            </h3>
            <div
              v-for="(arc, arcIndex) in section.arcs"
              :key="`arc-${sectionIndex}-${arcIndex}`"
              class="arc"
            >
              <div class="arc-header">
                <h4 v-if="arc.title" class="arc-title">{{ arc.title }}</h4>
                <span v-if="arc.label">{{ arc.label }}</span>
                <p v-if="arc.note">{{ arc.note }}</p>
              </div>
              <article class="arc-list">
                <div
                  v-if="arc.title || arc.label"
                  class="arc-mini-header"
                  aria-hidden="true"
                >
                  <span v-if="arc.title" class="arc-mini-title">
                    {{ arc.title }}
                  </span>
                  <span v-if="arc.label" class="arc-mini-label">
                    {{ arc.label }}
                  </span>
                </div>
                <router-link
                  v-for="post in arcItems(arc)"
                  :to="post.path"
                  :key="post.path"
                >
                  <div class="list">
                    <p class="list-title">
                      {{ post.frontmatter.title }}
                      <span v-if="titleSuffix(post)" class="list-suffix">
                        {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                      </span>
                    </p>

                    <p class="list-meta">
                      {{ post.frontmatter.narrated_by }}
                      <span>
                        <template
                          v-if="
                            listMeta.showStartingTurn && hasStartingTurn(post)
                          "
                        >
                          Starting Turn:
                          {{ post.frontmatter.starting_turn }}&emsp;
                        </template>
                        Release Date: {{ post.frontmatter.release_date }}
                      </span>
                    </p>

                    <p v-if="post.frontmatter.description" class="list-summary">
                      {{ post.frontmatter.description }}
                    </p>
                  </div>
                </router-link>
              </article>
            </div>
          </section>
        </template>

        <div v-else>
          <router-link
            v-for="post in listAlbums"
            :to="post.path"
            :key="post.path"
          >
            <div class="list">
              <p class="list-title">
                {{ post.frontmatter.title }}
                <span v-if="titleSuffix(post)" class="list-suffix">
                  {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                </span>
              </p>

              <p class="list-meta">
                {{ post.frontmatter.narrated_by }}
                <span>
                  <template
                    v-if="listMeta.showStartingTurn && hasStartingTurn(post)"
                  >
                    Starting Turn: {{ post.frontmatter.starting_turn }}&emsp;
                  </template>
                  Release Date: {{ post.frontmatter.release_date }}
                </span>
              </p>
            </div>
          </router-link>
        </div>
      </template>
    </div>
  </transition>
</template>

<script>
import { getEdition } from "../../../data/editions";

const defaultTitleFields = ["edition", "pr"];

export default {
  name: "EditionList",
  props: {
    editionId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      episodeQuery: "",
      competitorQuery: "",
      competitorsOpen: true,
      memoSortedKey: "",
      memoSortedAlbums: [],
      memoFilteredKey: "",
      memoFilteredAlbums: [],
      memoCompetitorsKey: "",
      memoFilteredCompetitors: [],
    };
  },
  computed: {
    edition() {
      return getEdition(this.editionId);
    },
    editionClass() {
      return this.edition ? `edition-${this.edition.id}` : "";
    },
    titleSuffixFields() {
      return this.edition && this.edition.titleSuffixFields
        ? this.edition.titleSuffixFields
        : defaultTitleFields;
    },
    listSuffixPrefix() {
      return this.edition && this.edition.listSuffixPrefix
        ? this.edition.listSuffixPrefix
        : "";
    },
    listMeta() {
      return this.edition && this.edition.listMeta
        ? this.edition.listMeta
        : { showStartingTurn: true };
    },
    heroMeta() {
      return this.edition && this.edition.heroMeta
        ? this.edition.heroMeta
        : { showStartingTurn: true };
    },
    featuredCount() {
      if (!this.edition || typeof this.edition.featuredCount !== "number") {
        return 0;
      }
      return this.edition.featuredCount;
    },
    sortedAlbums() {
      if (!this.edition) {
        return [];
      }
      const siteTime = (this.$site && this.$site.time) || "";
      const prefixes = this.edition.pathPrefixes || [];
      const sortOrder = this.edition.sortOrder || "asc";
      const key = `${this.editionId}:${siteTime}:${sortOrder}:${prefixes.join(
        ","
      )}`;
      if (this.memoSortedKey === key && this.memoSortedAlbums.length) {
        return this.memoSortedAlbums;
      }
      const pages = this.$site.pages.filter((page) => {
        if (page.frontmatter.exclude) {
          return false;
        }
        return prefixes.some((prefix) => page.path.startsWith(prefix));
      });

      const sorted = pages.sort((a, b) => {
        const aDate = new Date(a.frontmatter.date || 0);
        const bDate = new Date(b.frontmatter.date || 0);
        const diff = aDate - bDate;
        return sortOrder === "desc" ? -diff : diff;
      });
      this.memoSortedKey = key;
      this.memoSortedAlbums = sorted;
      return sorted;
    },
    hasEpisodeFilter() {
      return this.episodeTokens.length > 0;
    },
    episodeTokens() {
      const query = this.episodeQuery.trim().toLowerCase();
      if (!query) {
        return [];
      }
      return query.split(/\s+/).filter(Boolean);
    },
    filteredAlbums() {
      const tokens = this.episodeTokens;
      const key = `${this.editionId}:${tokens.join("|")}:${
        this.sortedAlbums.length
      }`;
      if (this.memoFilteredKey === key && this.memoFilteredAlbums.length) {
        return this.memoFilteredAlbums;
      }
      if (!tokens.length) {
        this.memoFilteredKey = key;
        this.memoFilteredAlbums = this.sortedAlbums;
        return this.sortedAlbums;
      }
      const filtered = this.sortedAlbums.filter((post) => {
        const fields = [
          post.frontmatter && post.frontmatter.title,
          post.title,
          post.frontmatter && post.frontmatter.narrated_by,
          post.frontmatter && post.frontmatter.release_date,
          post.frontmatter && post.frontmatter.edition,
          post.frontmatter && post.frontmatter.pr,
          post.frontmatter && post.frontmatter.starting_turn,
          post.path,
        ];
        const haystack = fields.filter(Boolean).join(" ").toLowerCase();
        return tokens.every((token) => haystack.indexOf(token) > -1);
      });
      this.memoFilteredKey = key;
      this.memoFilteredAlbums = filtered;
      return filtered;
    },
    competitorTokens() {
      const query = this.competitorQuery.trim().toLowerCase();
      if (!query) {
        return [];
      }
      return query.split(/\s+/).filter(Boolean);
    },
    filteredCompetitors() {
      if (!this.edition || !Array.isArray(this.edition.competitors)) {
        return [];
      }
      const tokens = this.competitorTokens;
      const key = `${this.editionId}:${tokens.join("|")}:${
        this.edition.competitors.length
      }`;
      if (
        this.memoCompetitorsKey === key &&
        this.memoFilteredCompetitors.length
      ) {
        return this.memoFilteredCompetitors;
      }
      if (!tokens.length) {
        this.memoCompetitorsKey = key;
        this.memoFilteredCompetitors = this.edition.competitors;
        return this.edition.competitors;
      }
      const filtered = this.edition.competitors.filter((civ) => {
        const fields = [civ.name, civ.leader, civ.author];
        const haystack = fields.filter(Boolean).join(" ").toLowerCase();
        return tokens.every((token) => haystack.indexOf(token) > -1);
      });
      this.memoCompetitorsKey = key;
      this.memoFilteredCompetitors = filtered;
      return filtered;
    },
    featuredAlbums() {
      return this.filteredAlbums.slice(0, this.featuredCount);
    },
    listAlbums() {
      return this.filteredAlbums.slice(this.featuredCount);
    },
    competitorsOpenKey() {
      return "edition-list:competitors-open";
    },
    episodeInputId() {
      return `edition-episode-filter-${this._uid}`;
    },
    competitorInputId() {
      return `edition-competitor-filter-${this._uid}`;
    },
  },
  watch: {
    editionId() {
      this.episodeQuery = "";
      this.competitorQuery = "";
      this.restoreCompetitorsOpen();
    },
    competitorsOpen(value) {
      this.saveCompetitorsOpen(value);
    },
  },
  mounted() {
    this.restoreCompetitorsOpen();
  },
  methods: {
    restoreCompetitorsOpen() {
      if (typeof window === "undefined" || !window.localStorage) {
        this.competitorsOpen = true;
        return;
      }
      try {
        const stored = window.localStorage.getItem(this.competitorsOpenKey);
        if (stored === null) {
          const legacyKey = `edition-list:competitors-open:${this.editionId}`;
          const legacyValue = window.localStorage.getItem(legacyKey);
          if (legacyValue === null) {
            this.competitorsOpen = true;
            return;
          }
          this.competitorsOpen = legacyValue === "true";
          this.saveCompetitorsOpen(this.competitorsOpen);
          return;
        }
        this.competitorsOpen = stored === "true";
      } catch (error) {
        this.competitorsOpen = true;
      }
    },
    saveCompetitorsOpen(value) {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      try {
        window.localStorage.setItem(this.competitorsOpenKey, String(value));
      } catch (error) {
        // Ignore storage failures (private mode, quota, etc.)
      }
    },
    titleSuffix(post) {
      for (const field of this.titleSuffixFields) {
        const value = post.frontmatter[field];
        if (value) {
          return value;
        }
      }
      return "";
    },
    arcItems(arc) {
      if (!arc || !Array.isArray(arc.range) || arc.range.length !== 2) {
        return [];
      }
      return this.sortedAlbums.slice(arc.range[0], arc.range[1]);
    },
    hasStartingTurn(post) {
      if (!post || !post.frontmatter) {
        return false;
      }
      const value = post.frontmatter.starting_turn;
      if (value === null || value === undefined) {
        return false;
      }
      return String(value).trim().length > 0;
    },
  },
};
</script>

<style scoped>
.album-list {
  margin-block: 0;
  margin-inline: 5rem;
}

.header {
  display: inline-flex;
  align-items: baseline;
}

.header span {
  font-size: 1.5rem;
  font-weight: 300;
  text-shadow: 2px 2px #083832;
  margin-inline-start: 2rem;
}

.edition-controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.8rem 1.5rem;
  margin-block: 1.2rem 2.4rem;
  margin-inline: 0;
}

.filter {
  min-inline-size: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter span {
  color: #ffbf46;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.edition-controls input,
.competitor-controls input {
  color: #fff;
  font-size: 0.95rem;
  border: 1px solid #ffbf46;
  border-radius: 0.4rem;
  background: #141414;
  padding: 0.5rem 0.7rem;
}

.edition-controls input:focus,
.competitor-controls input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.35);
}

.control-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #fff;
  font-size: 0.9rem;
}

.control-button {
  color: #ffbf46;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  background: transparent;
  padding: 0.2rem 0.8rem;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
}

.control-button:hover {
  color: #1a1a1a;
  background: #ffbf46;
}

.filter-results .list {
  margin-block-end: 1.5rem;
}

.empty-state {
  color: #e6e6e6;
  font-size: 1.1rem;
}

.competitors-section {
  margin-block-start: 2rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header .section-title {
  padding-top: 0;
}

.competitor-controls {
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1.2rem;
  margin-block: 1rem 1.5rem;
  margin-inline: 0;
}

.collapsed-hint {
  color: #e6e6e6;
  font-style: italic;
  margin-block-start: 0.5rem;
}

.skip-link {
  inset-block-start: auto;
  inset-inline-start: -9999px;
  position: absolute;
  block-size: 1px;
  inline-size: 1px;
  overflow: hidden;
}

.skip-link:focus {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  overflow: visible;
  position: static;
  block-size: auto;
  border-radius: 999px;
  inline-size: auto;
  color: #1a1a1a;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  background: #ffbf46;
  padding-block: 0.3rem;
  padding-inline: 0.8rem;
  margin-block-end: 0.8rem;
}

.skip-target {
  display: block;
  block-size: 1px;
  inline-size: 1px;
}

.post {
  position: relative;
  inline-size: 100%;
  block-size: 70vh;
  min-block-size: 520px;
  display: block;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  border-radius: 18px;
  color: inherit;
  text-decoration: none;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  margin-block-end: 2.5rem;
}

.post:hover {
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.hero-overlay {
  inset: 0;
  position: absolute;
  background: linear-gradient(
    140deg,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.1) 45%,
    rgba(0, 0, 0, 0.4) 100%
  );
}

img {
  inline-size: 100%;
  line-height: 0;
  margin-block: 2rem;
  margin-inline: 0;
}

.title-info {
  inset-block-start: 2rem;
  inset-inline-start: 0;
  position: absolute;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-inline-start: 0;
  border-radius: 0 12px 12px 0;
  max-inline-size: 550px;
  padding-block: 1.2rem;
  padding-inline: 1.6rem;
  text-shadow: 1px 2px rgba(8, 56, 50, 0.6);
  background: rgba(16, 16, 16, 0.9);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
}

.title-info p {
  display: inline-block;
  width: auto;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.title-info span {
  font-size: 1.1rem;
  margin: 0;
  margin-inline-start: 0.5rem;
}

.album-info {
  inset-block-end: 2rem;
  inset-inline-end: 0;
  position: absolute;
  z-index: 1;
  border: 1px solid #f0d79b;
  border-inline-end: 0;
  border-radius: 12px 0 0 12px;
  max-inline-size: 900px;
  padding-block: 1.1rem;
  padding-inline: 1.6rem;
  color: #1a1a1a;
  text-shadow: none;
  background: rgba(255, 250, 240, 0.95);
  box-shadow: -6px 10px 20px rgba(0, 0, 0, 0.2);
}

.album-info p {
  width: auto;
  display: inline-block;
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.album-info span {
  font-size: 1rem;
  margin: 0;
  margin-inline-start: 0.5rem;
}

.page-title {
  font-size: 4rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  padding-block: 0.75em 0.1em;
  padding-inline: 0;
  margin-block-end: 1rem;
  margin-block-start: 0;
}
.section-title {
  font-size: 2.6rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  margin-block: 0.8rem 0.4rem;
  margin-inline: 0;
}

.competitors {
  counter-reset: civs;
  display: grid;
  gap: 0.6rem 1.4rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-block: 0 3rem;
  margin-inline: 0;
  padding: 0;
  list-style: none;
}

.competitors li {
  counter-increment: civs;
  inline-size: 100%;
  min-inline-size: 0;
  display: grid;
  align-items: start;
  gap: 0.2rem 0.8rem;
  grid-template-columns: 2.2rem minmax(0, 1fr);
  transition: all 0.2s ease-in-out;
}

.competitors li:before {
  content: counter(civs);
  color: hsl(40, 80%, 60%);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  margin-inline-end: 0;
}

.competitors li:hover {
  color: #ffbf46;
  transform: translateY(-1px);
}

.competitors li:focus-visible {
  outline: 2px solid rgba(255, 191, 70, 0.6);
  outline-offset: 4px;
}

.competitors p {
  min-inline-size: 0;
  padding-inline-end: 0;
  font-size: 1.1rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  margin: 0;
}

.competitors span {
  grid-column: 2;
  overflow-wrap: anywhere;
  min-inline-size: 0;
  color: #fff !important;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.3;
}

.arc {
  display: flex;
  flex-flow: row;
  inline-size: 100%;
}

.arc + .arc {
  margin-block: 3em;
  margin-inline: 0;
}

.arc-header {
  inline-size: 40%;
}

.arc-header .arc-title {
  font-size: 2.2rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  margin-block: 0 0.5em;
  margin-inline: 0;
}

.arc-header span {
  color: #ffbf46;
  font-size: 1.7rem;
  font-weight: 800;
}

.arc-header p {
  margin-inline-end: 3em;
  text-shadow: 2px 2px #083832;
}

.arc-list {
  inline-size: 80%;
  display: flex;
  flex-flow: column;
  flex-grow: 1;
  flex-wrap: nowrap;
  gap: 1.1rem;
}

.list {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 0.35rem;
  position: relative;
  color: #fff;
  text-decoration: none;
  text-shadow: none;
  background: linear-gradient(
    140deg,
    rgba(20, 20, 20, 0.95) 0%,
    rgba(32, 32, 32, 0.95) 100%
  );
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0 12px 12px 0;
  margin-block-end: 1.2rem;
  padding-block: 1.1rem;
  padding-inline: 1.5rem;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.list::before {
  content: "";
  inset-block: 0;
  inset-inline-start: 0;
  position: absolute;
  inline-size: 4px;
  background: #ffbf46;
  opacity: 0.9;
}

.list:hover {
  border-color: rgba(255, 191, 70, 0.45);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.arc-list .list {
  margin-bottom: 0;
}

.album-list a:focus .list,
.album-list a:focus-visible .list {
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.35),
    0 12px 24px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 191, 70, 0.6);
}

.arc-mini-header {
  position: sticky;
  inset-block-start: 1rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  background: rgba(12, 16, 16, 0.85);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(6px);
}

.arc-mini-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.arc-mini-label {
  color: #ffbf46;
  font-size: 0.8rem;
  font-weight: 800;
}

.list-title {
  font-size: 1.2rem;
  font-weight: 800;
  text-shadow: none;
  margin: 0;
}

.list-title .list-suffix {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
  font-weight: 500;
  text-shadow: none;
  margin-inline-start: 0.5rem;
}

.list-meta {
  font-size: 1rem;
  font-weight: 700;
  text-shadow: none;
  margin: 0;
}

.list-meta span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.85rem;
  font-weight: 500;
  margin-inline-start: 0.5rem;
}

.list-summary {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  max-block-size: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
  text-shadow: none;
  opacity: 0;
  transform: translateY(-2px);
  transition: max-block-size 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.list:hover .list-summary,
.album-list a:focus .list-summary,
.album-list a:focus-visible .list-summary {
  max-block-size: 3.5em;
  opacity: 1;
  transform: translateY(0);
}

.album-list.edition-s2 .competitors li:before,
.album-list.edition-s3 .competitors li:before,
.album-list.edition-s4 .competitors li:before,
.album-list.edition-s5 .competitors li:before {
  color: #444;
}

@media (max-width: 900px) {
  .edition-controls {
    margin-block: 1rem 1.6rem;
    margin-inline: 0;
  }

  .filter {
    min-inline-size: 100%;
  }

  .control-meta {
    inline-size: 100%;
  }

  .header {
    flex-flow: column;
    margin-block-end: 2rem;
  }

  .header .page-title {
    margin: 0;
  }

  .header span {
    margin-inline-start: 0;
  }

  .arc {
    flex-flow: column;
  }

  .arc-header {
    inline-size: 100%;
    line-height: 0.1;
    padding: 0;
  }

  .arc-header .arc-title {
    font-size: 3rem;
  }

  .arc-header span {
    font-size: 2.5rem;
  }

  .arc-header p {
    font-size: 1.5rem;
    padding-block: 1rem;
    padding-inline: 0;
    margin-inline-end: 0;
  }

  .arc-list {
    inline-size: 100%;
  }

  .arc-mini-header {
    inset-block-start: 0.5rem;
    padding-block: 0.3rem;
    padding-inline: 0.7rem;
  }

  .list {
    padding-block: 0.9rem;
    padding-inline: 1.1rem;
  }

  .competitors {
    gap: 0.6rem;
    grid-template-columns: 1fr;
  }

  .competitors li {
    grid-template-columns: 1.8rem minmax(0, 1fr);
  }

  .competitors p {
    font-size: 1rem;
  }

  .album-list {
    margin-block: 1rem 0;
    margin-inline: 1.5rem;
  }

  .post {
    min-block-size: 420px;
    block-size: auto;
  }

  .page-title,
  .section-title {
    word-break: break-word;
    padding-block: 0.4em 0.1em;
    padding-inline: 0;
  }

  .arc-title,
  .section-title {
    border-bottom: none;
    word-break: break-word;
  }
}
</style>
