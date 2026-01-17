<template>
  <transition name="fade">
    <div>
      <div
        ref="editionList"
        class="edition-list"
        role="tablist"
        aria-label="Edition selector"
      >
        <div v-for="edition in navEditions" :key="edition.id" class="list">
          <button
            type="button"
            class="list-button"
            role="tab"
            :aria-selected="clickedEdition === edition.id"
            :class="{ active: clickedEdition === edition.id }"
            @click="selectEdition(edition.id)"
          >
            <span>{{ edition.navLabel }}</span>
          </button>
        </div>
      </div>

      <EditionList v-if="clickedEdition" :edition-id="clickedEdition" />
    </div>
  </transition>
</template>

<script>
import EditionList from "../../theme/components/albums/EditionList.vue";
import { editionNavItems } from "../../data/editions";

export default {
  components: {
    EditionList,
  },
  data() {
    return {
      clickedEdition: editionNavItems[0] ? editionNavItems[0].id : null,
    };
  },
  computed: {
    navEditions() {
      return editionNavItems;
    },
    defaultEditionId() {
      return editionNavItems[0] ? editionNavItems[0].id : null;
    },
  },
  mounted() {
    this.syncFromRoute();
    this.scrollToActiveEdition();
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", this.syncFromRoute);
    }
  },
  beforeDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", this.syncFromRoute);
    }
  },
  watch: {
    $route() {
      this.syncFromRoute();
    },
  },
  methods: {
    selectEdition(id) {
      const nextId = this.normalizeEditionId(id);
      if (!nextId) {
        return;
      }
      this.clickedEdition = nextId;
      this.scrollToActiveEdition();
      if (this.$route && this.$router) {
        const query = Object.assign({}, this.$route.query, {
          edition: nextId,
        });
        this.$router.push({ query }).catch(() => {});
      }
    },
    normalizeEditionId(id) {
      const ids = editionNavItems.map((item) => item.id);
      if (ids.includes(id)) {
        return id;
      }
      return this.defaultEditionId;
    },
    syncFromRoute() {
      if (!this.$route) {
        return;
      }
      const routeEdition = this.$route.query && this.$route.query.edition;
      const nextId = this.normalizeEditionId(routeEdition);
      if (nextId && nextId !== this.clickedEdition) {
        this.clickedEdition = nextId;
        this.scrollToActiveEdition();
      }
      if (routeEdition && nextId && routeEdition !== nextId && this.$router) {
        const query = Object.assign({}, this.$route.query, {
          edition: nextId,
        });
        this.$router.replace({ query }).catch(() => {});
      }
    },
    scrollToActiveEdition() {
      this.$nextTick(() => {
        const container = this.$refs.editionList;
        if (!container) {
          return;
        }
        const active = container.querySelector(".list-button.active");
        if (active && typeof active.scrollIntoView === "function") {
          active.scrollIntoView({
            block: "nearest",
            inline: "center",
            behavior: "smooth",
          });
        }
      });
    },
  },
};
</script>

<style scoped>
.edition-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #fff;
  border: 1px solid #f2d28a;
  border-radius: 999px;
  padding: 0.45rem 0.6rem;
  margin: 1em auto 0;
  width: calc(100% - 4rem);
  max-width: 90vw;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  z-index: 5;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  scrollbar-width: thin;
  scrollbar-color: #f1d28c transparent;
}

.list {
  display: flex;
  flex: 0 0 auto;
}

.list-button {
  width: max-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2a2a2a;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease-in-out;
}

.list-button span {
  font-size: 0.95rem;
  font-weight: 800;
  text-shadow: none;
}

.list-button:hover {
  background: #fff3d5;
  border-color: #ffe1a4;
}

.list-button.active {
  background: #ffbf46;
  border-color: #f0ad32;
  color: #1a1a1a;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.list-button:focus-visible {
  outline: 2px solid #ffbf46;
  outline-offset: 3px;
}

@media (max-width: 799px) {
  .list-button span {
    font-size: 0.85rem;
  }

  .edition-list {
    width: calc(100% - 2rem);
    max-width: 90vw;
    padding: 0.4rem 0.5rem;
  }
}
</style>
