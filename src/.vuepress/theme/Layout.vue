<template>
  <div class="theme-container" :class="pageClasses">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <Navbar v-if="shouldShowNavbar" @toggle-sidebar="toggleSidebar" />

    <Sidebar
      v-if="shouldRenderSidebar"
      :items="sidebarItems"
      @toggle-sidebar="toggleSidebar"
    >
      <slot name="sidebar-top" slot="top" />
      <slot name="sidebar-bottom" slot="bottom" />
    </Sidebar>

    <main id="main-content" tabindex="-1">
      <Albums v-if="$page.frontmatter.edition" />

      <PR v-if="$page.frontmatter.pr" />

      <div v-else-if="$page.frontmatter.layout">
        <component :is="$page.frontmatter.layout" />
      </div>

      <Home v-else-if="$page.frontmatter.home" />

      <Page v-else> </Page>
    </main>
  </div>
</template>

<script>
import Vue from "vue";
import nprogress from "nprogress";
import Albums from "./layout/Albums.vue";
import PR from "./layout/PR.vue";
import Home from "./layout/Home.vue";
import Page from "./layout/Page.vue";
import Other from "./layout/Other.vue";
import CommunityTileMap from "./layout/CommunityTileMap.vue";
import CommunitySpotlight from "./layout/CommunitySpotlight.vue";
import Navbar from "./components/nav/Navbar.vue";
import Sidebar from "./components/sidebar/Sidebar.vue";
import { resolveSidebarItems } from "./util";
import VueLazyload from "vue-lazyload";

Vue.use(VueLazyload, {
  observer: true,
  observerOptions: {
    rootMargin: "3000px",
    threshold: 0.0,
  },
});

export default {
  components: {
    Albums,
    PR,
    Home,
    Page,
    Other,
    CommunityTileMap,
    CommunitySpotlight,
    Sidebar,
    Navbar,
  },

  data() {
    return {
      isSidebarOpen: false,
    };
  },

  computed: {
    shouldShowNavbar() {
      const { themeConfig } = this.$site;
      const { frontmatter } = this.$page;
      if (frontmatter.navbar === false || themeConfig.navbar === false) {
        return false;
      }
      return (
        this.$title ||
        themeConfig.logo ||
        themeConfig.repo ||
        themeConfig.nav ||
        this.$themeLocaleConfig.nav
      );
    },

    shouldShowSidebar() {
      const { frontmatter } = this.$page;
      return (
        !frontmatter.layout &&
        !frontmatter.home &&
        frontmatter.sidebar !== false &&
        this.sidebarItems.length
      );
    },

    shouldRenderSidebar() {
      return this.shouldShowSidebar || this.shouldShowNavbar;
    },

    sidebarItems() {
      return resolveSidebarItems(
        this.$page,
        this.$route,
        this.$site,
        this.$localePath
      );
    },

    pageClasses() {
      const userPageClass = this.$page.frontmatter.pageClass;
      return [
        {
          "no-navbar": !this.shouldShowNavbar,
          "sidebar-open": this.isSidebarOpen,
          "no-sidebar": !this.shouldShowSidebar,
        },
        userPageClass,
      ];
    },
  },

  mounted() {
    // configure progress bar
    nprogress.configure({
      showSpinner: false,
    });

    this.removeBeforeEach = this.$router.beforeEach((to, from, next) => {
      if (to.path !== from.path && !Vue.component(to.name)) {
        nprogress.start();
      }
      next();
    });

    this.removeAfterEach = this.$router.afterEach(() => {
      nprogress.done();
      this.isSidebarOpen = false;
      this.$nextTick(() => {
        const main = this.$el && this.$el.querySelector("#main-content");
        if (main && typeof main.focus === "function") {
          main.focus();
        }
      });
    });

    this.$on("sw-updated", this.onSWUpdated);
  },

  beforeDestroy() {
    if (typeof this.removeBeforeEach === "function") {
      this.removeBeforeEach();
      this.removeBeforeEach = null;
    }
    if (typeof this.removeAfterEach === "function") {
      this.removeAfterEach();
      this.removeAfterEach = null;
    }
  },

  methods: {
    toggleSidebar(to) {
      this.isSidebarOpen = typeof to === "boolean" ? to : !this.isSidebarOpen;
    },

    onSWUpdated(e) {
      this.swUpdateEvent = e;
    },
  },
};
</script>

<style src="prismjs/themes/prism-tomorrow.css"></style>
<style src="./styles/theme.css"></style>
<style>
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-link:focus {
  position: fixed;
  left: 1rem;
  top: 1rem;
  width: auto;
  height: auto;
  overflow: visible;
  z-index: 2000;
  color: #ffbf46;
  background: #1a1a1a;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
</style>
