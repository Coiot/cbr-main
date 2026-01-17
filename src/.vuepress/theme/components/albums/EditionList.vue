<template>
  <transition name="fade">
    <div v-if="edition" class="album-list" :class="editionClass">
      <div class="header">
        <h1>{{ edition.title }}</h1>
        <span v-if="edition.subtitle">{{ edition.subtitle }}</span>
      </div>

      <div class="edition-controls">
        <label class="filter">
          <span>Search episodes</span>
          <input
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
          <h1>Results</h1>
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
          <h1>Competitors</h1>
          <button
            type="button"
            class="control-button"
            @click="competitorsOpen = !competitorsOpen"
          >
            {{ competitorsOpen ? "Hide" : "Show" }}
          </button>
        </div>
        <div class="competitor-controls">
          <label class="filter">
            <span>Search competitors</span>
            <input
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
        <a href="#competitors-end" class="skip-link"> Skip competitors list </a>
        <ul v-if="competitorsOpen" class="competitors">
          <li v-for="civ in filteredCompetitors" :key="civ.name" tabindex="0">
            <p>{{ civ.name }}</p>
            <span>{{ civ.leader }} &ndash; {{ civ.author }}</span>
          </li>
        </ul>
        <p v-else class="collapsed-hint">Competitors hidden.</p>
        <span id="competitors-end" class="skip-target" tabindex="-1"></span>
      </div>

      <template v-if="!hasEpisodeFilter">
        <template v-if="edition.sections && edition.sections.length">
          <template v-for="(section, sectionIndex) in edition.sections">
            <h1 v-if="section.title" :key="`section-title-${sectionIndex}`">
              {{ section.title }}
            </h1>
            <div
              v-for="(arc, arcIndex) in section.arcs"
              :key="`arc-${sectionIndex}-${arcIndex}`"
              class="arc"
            >
              <div class="arc-header">
                <h2 v-if="arc.title">{{ arc.title }}</h2>
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
          </template>
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
      const prefixes = this.edition.pathPrefixes || [];
      const pages = this.$site.pages.filter((page) => {
        if (page.frontmatter.exclude) {
          return false;
        }
        return prefixes.some((prefix) => page.path.startsWith(prefix));
      });

      return pages.sort((a, b) => {
        const aDate = new Date(a.frontmatter.date || 0);
        const bDate = new Date(b.frontmatter.date || 0);
        const diff = aDate - bDate;
        return this.edition.sortOrder === "desc" ? -diff : diff;
      });
    },
    hasEpisodeFilter() {
      return this.episodeQuery.trim().length > 0;
    },
    filteredAlbums() {
      const query = this.episodeQuery.trim().toLowerCase();
      if (!query) {
        return this.sortedAlbums;
      }
      const tokens = query.split(/\s+/).filter(Boolean);
      return this.sortedAlbums.filter((post) => {
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
    },
    filteredCompetitors() {
      if (!this.edition || !Array.isArray(this.edition.competitors)) {
        return [];
      }
      const query = this.competitorQuery.trim().toLowerCase();
      if (!query) {
        return this.edition.competitors;
      }
      const tokens = query.split(/\s+/).filter(Boolean);
      return this.edition.competitors.filter((civ) => {
        const fields = [civ.name, civ.leader, civ.author];
        const haystack = fields.filter(Boolean).join(" ").toLowerCase();
        return tokens.every((token) => haystack.indexOf(token) > -1);
      });
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
  margin: 0 5rem;
}

.header {
  display: inline-flex;
  align-items: baseline;
}

.header span {
  font-size: 1.5rem;
  font-weight: 300;
  text-shadow: 2px 2px #083832;
  margin-left: 2rem;
}

.edition-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.8rem 1.5rem;
  margin: 1.2rem 0 2.4rem;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 220px;
}

.filter span {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffbf46;
}

.edition-controls input,
.competitor-controls input {
  background: #141414;
  color: #fff;
  border: 1px solid #ffbf46;
  border-radius: 0.4rem;
  padding: 0.5rem 0.7rem;
  font-size: 0.95rem;
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
  background: transparent;
  color: #ffbf46;
  border: 1px solid #ffbf46;
  border-radius: 999px;
  padding: 0.2rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.control-button:hover {
  background: #ffbf46;
  color: #1a1a1a;
}

.filter-results .list {
  margin-bottom: 1.5rem;
}

.empty-state {
  color: #e6e6e6;
  font-size: 1.1rem;
}

.competitors-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h1 {
  padding-top: 0;
}

.competitor-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.8rem 1.2rem;
  margin: 1rem 0 1.5rem;
}

.collapsed-hint {
  color: #e6e6e6;
  font-style: italic;
  margin-top: 0.5rem;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-link:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
  color: #1a1a1a;
  background: #ffbf46;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
}

.skip-target {
  display: block;
  width: 1px;
  height: 1px;
}

.post {
  position: relative;
  display: block;
  text-decoration: none;
  color: inherit;
  min-height: 520px;
  width: 100%;
  height: 70vh;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  border: 1px solid #2a2a2a;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 2.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    140deg,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.15) 45%,
    rgba(0, 0, 0, 0.6) 100%
  );
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}

.title-info {
  position: absolute;
  max-width: 550px;
  z-index: 1;
  inset-block-start: 2rem;
  inset-inline-start: 0;
  text-shadow: 1px 2px rgba(8, 56, 50, 0.6);
  background: rgba(16, 16, 16, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-inline-start: 0;
  border-radius: 0 12px 12px 0;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  padding-block: 1.2rem;
  padding-inline: 1.6rem;
}

.title-info p {
  width: auto;
  display: inline-block;
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
  position: absolute;
  max-width: 900px;
  z-index: 1;
  inset-block-end: 2rem;
  inset-inline-end: 0;
  color: #1a1a1a;
  text-shadow: none;
  background: rgba(255, 250, 240, 0.95);
  border: 1px solid #f0d79b;
  border-inline-end: 0;
  border-radius: 12px 0 0 12px;
  box-shadow: -6px 10px 20px rgba(0, 0, 0, 0.2);
  padding-block: 1.1rem;
  padding-inline: 1.6rem;
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

h1 {
  font-size: 4rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  padding: 0.7em 0 0.1em;
  margin-top: 0;
}

.competitors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.6rem 1.4rem;
  list-style: none;
  padding: 0;
  margin: 0 0 3rem;
  counter-reset: civs;
}

.competitors li {
  width: 100%;
  display: grid;
  grid-template-columns: 2.2rem minmax(0, 1fr);
  align-items: start;
  gap: 0.2rem 0.8rem;
  min-width: 0;
  counter-increment: civs;
  transition: all 0.2s ease-in-out;
}

.competitors li:before {
  content: counter(civs);
  color: hsl(40, 80%, 60%);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  margin-right: 0;
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
  font-size: 1.1rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  padding-right: 0;
  margin: 0;
  min-width: 0;
}

.competitors span {
  grid-column: 2;
  color: #fff !important;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.3;
  overflow-wrap: anywhere;
  min-width: 0;
}

.arc {
  width: 100%;
  display: flex;
  flex-flow: row;
}

.arc + .arc {
  margin: 3em 0;
}

.arc-header {
  width: 40%;
}

.arc-header h2 {
  font-size: 2.2rem;
  font-weight: 900;
  text-shadow: 3px 3px #083832;
  margin: 0 0 0.5em;
}

.arc-header span {
  color: #ffbf46;
  font-size: 1.7rem;
  font-weight: 800;
}

.arc-header p {
  text-shadow: 2px 2px #083832;
  margin-right: 3em;
}

.arc-list {
  width: 80%;
  display: flex;
  flex-flow: column;
  flex-wrap: nowrap;
  flex-grow: 1;
  gap: 1.1rem;
}

.list {
  position: relative;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-decoration: none;
  color: #fff;
  background: linear-gradient(
    140deg,
    rgba(20, 20, 20, 0.95) 0%,
    rgba(32, 32, 32, 0.95) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0 12px 12px 0;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
  padding: 1.1rem 1.5rem;
  margin-bottom: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-shadow: none;
  overflow: hidden;
}

.list::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 4px;
  background: #ffbf46;
  opacity: 0.9;
}

.list:hover {
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
  border-color: rgba(255, 191, 70, 0.45);
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
  top: 1rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.9rem;
  background: rgba(12, 16, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(6px);
}

.arc-mini-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.arc-mini-label {
  font-size: 0.8rem;
  font-weight: 800;
  color: #ffbf46;
}

.list-title {
  font-size: 1.2rem;
  font-weight: 800;
  text-shadow: none;
  margin: 0;
}

.list-title .list-suffix {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  text-shadow: none;
  margin-inline-start: 0.5rem;
}

.list-meta {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  text-shadow: none;
}

.list-meta span {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.72);
  margin-inline-start: 0.5rem;
}

.list-summary {
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
  text-shadow: none;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateY(-2px);
  transition: max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.list:hover .list-summary,
.album-list a:focus .list-summary,
.album-list a:focus-visible .list-summary {
  max-height: 3.5em;
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
    margin: 1rem 0 1.6rem;
  }

  .filter {
    min-width: 100%;
  }

  .control-meta {
    width: 100%;
  }

  .header {
    flex-flow: column;
    margin-bottom: 2rem;
  }

  .header h1 {
    margin: 0;
  }

  .header span {
    margin-left: 0;
  }

  .arc {
    flex-flow: column;
  }

  .arc-header {
    width: 100%;
    line-height: 0.1;
    padding: 0;
  }

  .arc-header h2 {
    font-size: 3rem;
  }

  .arc-header span {
    font-size: 2.5rem;
  }

  .arc-header p {
    font-size: 1.5rem;
    padding: 1rem 0;
    margin-right: 0;
  }

  .arc-list {
    width: 100%;
  }

  .arc-mini-header {
    top: 0.5rem;
    padding: 0.3rem 0.7rem;
  }

  .list {
    padding: 0.9rem 1.1rem;
  }

  .competitors {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .competitors li {
    grid-template-columns: 1.8rem minmax(0, 1fr);
  }

  .competitors p {
    font-size: 1rem;
  }

  .album-list {
    margin: 1rem 1.5rem 0;
  }

  .post {
    min-height: 420px;
    height: auto;
  }

  h1 {
    word-break: break-word;
    padding: 0.4em 0 0.1em;
  }

  h2 {
    word-break: break-word;
    border-bottom: none;
  }
}
</style>
