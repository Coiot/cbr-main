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

    <SiteFooter :footer="$page.frontmatter.footer" />

    <a
      class="site-support-link"
      href="https://ko-fi.com/coiot"
      target="_blank"
      rel="noopener noreferrer"
    >
      Keep the Show Going!
    </a>
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
import SiteFooter from "./components/SiteFooter.vue";
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
    SiteFooter,
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

.site-support-link {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  right: calc(1rem + env(safe-area-inset-right, 0px));
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 8;
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  box-sizing: border-box;
  color: #323842;
  background: #fcbf47;
  border: 1px solid rgba(50, 56, 66, 0.24);
  border-radius: 999px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.site-support-link:hover,
.site-support-link:focus-visible {
  color: #1f242b;
  background: #ffd067;
  transform: translateY(-1px);
}

.theme-container.sidebar-open .mobile-album-bar {
  display: none;
}

@media (max-width: 600px) {
  .site-support-link {
    display: none;
  }
}
</style>
