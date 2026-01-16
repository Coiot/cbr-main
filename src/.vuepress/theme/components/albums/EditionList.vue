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
          tag="div"
          :key="post.path"
          class="post"
          :style="{ backgroundImage: `url(${post.frontmatter.image})` }"
          :tabindex="0"
        >
          <div class="title-info">
            <p>{{ post.frontmatter.title }}</p>
            <span v-if="titleSuffix(post)">{{ titleSuffix(post) }}</span>
          </div>

          <div class="album-info">
            <p>{{ post.frontmatter.narrated_by }}</p>
            <span>
              <template v-if="heroMeta.showStartingTurn">
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
              tag="div"
              :key="post.path"
              :tabindex="0"
            >
              <div class="list">
                <p>
                  {{ post.frontmatter.title }}
                  <span v-if="titleSuffix(post)">
                    {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                  </span>
                </p>

                <p>
                  {{ post.frontmatter.narrated_by }}
                  <span>
                    <template v-if="listMeta.showStartingTurn">
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
        <ul v-if="competitorsOpen" class="competitors">
          <li v-for="civ in filteredCompetitors" :key="civ.name">
            <p>{{ civ.name }}</p>
            <span>{{ civ.leader }} &ndash; {{ civ.author }}</span>
          </li>
        </ul>
        <p v-else class="collapsed-hint">Competitors hidden.</p>
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
                <router-link
                  v-for="post in arcItems(arc)"
                  :to="post.path"
                  tag="div"
                  :key="post.path"
                  :tabindex="0"
                >
                  <div class="list">
                    <p>
                      {{ post.frontmatter.title }}
                      <span v-if="titleSuffix(post)">
                        {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                      </span>
                    </p>

                    <p>
                      {{ post.frontmatter.narrated_by }}
                      <span>
                        <template v-if="listMeta.showStartingTurn">
                          Starting Turn:
                          {{ post.frontmatter.starting_turn }}&emsp;
                        </template>
                        Release Date: {{ post.frontmatter.release_date }}
                      </span>
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
            tag="div"
            :key="post.path"
            :tabindex="0"
          >
            <div class="list">
              <p>
                {{ post.frontmatter.title }}
                <span v-if="titleSuffix(post)">
                  {{ listSuffixPrefix }}{{ titleSuffix(post) }}
                </span>
              </p>

              <p>
                {{ post.frontmatter.narrated_by }}
                <span>
                  <template v-if="listMeta.showStartingTurn">
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
  },
  watch: {
    editionId() {
      this.episodeQuery = "";
      this.competitorQuery = "";
      this.competitorsOpen = true;
    },
  },
  methods: {
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

.post {
  position: relative;
  width: 100%;
  height: 80vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 6px 0 0 #ffbf46;
  margin-bottom: 2.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.post:hover {
  box-shadow: 0 2px 0 0 #ffbf46;
  transform: scale(1.01);
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}

.title-info {
  position: absolute;
  left: 0;
  top: 2rem;
  padding: 1.5rem 2rem;
  text-shadow: 2px 2px #083832;
  background: #202020;
  border: 1px double #fff;
  border-left: 0;
  box-shadow: 1px 4px 3px 0 rgba(19, 0, 0, 0.3);
  max-width: 550px;
}

.title-info p {
  display: inline-block;
  width: auto;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
}

.title-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1.1rem;
}

.album-info {
  position: absolute;
  right: 0;
  bottom: 1rem;
  padding: 1.5rem 2rem;
  color: #1a1a1a;
  text-shadow: 2px 2px #eee;
  background: #fff;
  border: 1px double #1a1a1a;
  border-right: 0;
  box-shadow: -3px 4px 0 0 #ffbf46;
  max-width: 900px;
}

.album-info p {
  display: inline-block;
  width: auto;
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.album-info span {
  margin: 0;
  margin-left: 0.5rem;
  font-size: 1rem;
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
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  grid-template-rows: repeat(auto-fit, minmax(0.3rem, 1fr));
  list-style-type: none;
  counter-reset: civs;
}

.competitors li {
  width: 100%;
  display: flex;
  flex-flow: row;
  align-items: baseline;
  counter-increment: civs;
  transition: all 0.2s ease-in-out;
}

.competitors li:before {
  content: counter(civs);
  color: hsl(40, 80%, 60%);
  font-size: 0.9rem;
  margin-right: 0.9rem;
}

.competitors li:hover {
  color: #ffbf46;
  transform: scale(1.02);
}

.competitors p {
  font-size: 1.2rem;
  font-weight: 900;
  text-shadow: 2px 2px #083832;
  padding-right: 0.5rem;
  margin: 0.5rem 0;
}

.competitors span {
  color: #fff !important;
  font-size: 0.85rem;
  font-weight: 400;
  word-break: break-word;
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
  width: 50%;
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
}

.list {
  flex-grow: 1;
  text-shadow: 1px 2px #083832;
  background-color: #202020;
  border: 1px double #fff;
  box-shadow: -4px 4px 0 0 #ffbf46;
  padding: 0em 1.8em;
  margin-bottom: 2.5vw;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.list:hover {
  box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
  transform: scale(1.01);
}

.list p {
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 2px 2px #083832;
  line-height: 1.2;
}

.list p span {
  font-size: 65%;
  font-weight: 400;
  text-shadow: 2px 2px #083832;
  margin-left: 0.6rem;
}

.album-list.edition-s2 .competitors li:before,
.album-list.edition-s3 .competitors li:before,
.album-list.edition-s4 .competitors li:before {
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

  .album-list {
    margin: 1rem 1.5rem 0;
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
