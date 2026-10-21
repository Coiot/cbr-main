<template>
  <div class="theme-container" :class="pageClasses">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <Navbar ref="navbar" v-if="shouldShowNavbar" :sidebar-open="isSidebarOpen" @toggle-sidebar="toggleSidebar" />

    <div v-if="isMobileNavigation && isSidebarOpen" class="sidebar-mask" aria-hidden="true" @click="closeSidebar(true)" />

    <Sidebar
      v-if="shouldRenderSidebar"
      ref="sidebar"
      id="site-navigation"
      :inert="isMobileNavigation && !isSidebarOpen"
      :items="sidebarItems"
      @toggle-sidebar="toggleSidebar"
      @transitionend.self="focusSidebar"
    >
      <template #top>
        <slot name="sidebar-top" />
      </template>
      <template #bottom>
        <slot name="sidebar-bottom" />
      </template>
    </Sidebar>

    <main id="main-content" tabindex="-1">
      <slot>
      <Albums v-if="$page.frontmatter.edition || $page.frontmatter.pr" />

      <div v-else-if="$page.frontmatter.layout">
        <component :is="$page.frontmatter.layout" />
      </div>

      <Home v-else-if="$page.frontmatter.home" />

      <Page v-else> </Page>
      </slot>
    </main>

    <SiteFooter :footer="$page.frontmatter.footer" />

    <router-link v-if="$route.path !== '/support/'" class="site-support-link" to="/support/">
      Keep the Show Going!
    </router-link>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import nprogress from "nprogress";
import Navbar from "./components/nav/Navbar.vue";
import Sidebar from "./components/sidebar/Sidebar.vue";
import SiteFooter from "./components/SiteFooter.vue";
import { resolveSidebarItems } from "./util";

const Albums = defineAsyncComponent(() => import("./layout/Albums.vue"));
const Home = defineAsyncComponent(() => import("./layout/Home.vue"));
const StartHere = defineAsyncComponent(() => import("./layout/StartHere.vue"));
const SceneCollections = defineAsyncComponent(() => import("./layout/SceneCollections.vue"));
const Supporters = defineAsyncComponent(() => import("./layout/Supporters.vue"));
const SupporterProfile = defineAsyncComponent(() => import("./layout/SupporterProfile.vue"));
const Support = defineAsyncComponent(() => import("./layout/Support.vue"));
const Page = defineAsyncComponent(() => import("./layout/Page.vue"));
const Other = defineAsyncComponent(() => import("./layout/Other.vue"));
const CommunityTileMap = defineAsyncComponent(() =>
  import("./layout/CommunityTileMap.vue")
);
const MapReleaseAdmin = defineAsyncComponent(() => import("./layout/MapReleaseAdmin.vue"));
const CommunitySpotlight = defineAsyncComponent(() =>
  import("./layout/CommunitySpotlight.vue")
);

export default {
  components: {
    Albums,
    Home,
    StartHere,
    Support,
    Supporters,
    SupporterProfile,
    SceneCollections,
    Page,
    Other,
    CommunityTileMap,
    MapReleaseAdmin,
    CommunitySpotlight,
    Sidebar,
    Navbar,
    SiteFooter,
  },

  data() {
    return {
      isSidebarOpen: false,
      isMobileNavigation: false,
    };
  },

  computed: {
    shouldShowNavbar() {
      const site = this.$site || {};
      const themeConfig = site.themeConfig || this.$themeConfig || {};
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      const localeThemeConfig = this.$themeLocaleConfig || {};
      if (frontmatter.navbar === false || themeConfig.navbar === false) {
        return false;
      }
      return (
        this.$title ||
        themeConfig.logo ||
        themeConfig.repo ||
        themeConfig.nav ||
        localeThemeConfig.nav
      );
    },

    shouldShowSidebar() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
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
      const site = this.$site || {
        pages: [],
        themeConfig: this.$themeConfig || {},
      };
      return resolveSidebarItems(
        this.$page || { frontmatter: {} },
        this.$route,
        site,
        this.$localePath
      );
    },

    pageClasses() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      const userPageClass = frontmatter.pageClass;
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
    this._navigationMedia = window.matchMedia("(max-width: 799px)");
    this._navigationChange = () => {
      this.isMobileNavigation = this._navigationMedia.matches;
      if (!this.isMobileNavigation) this.isSidebarOpen = false;
    };
    this._navigationChange();
    this._navigationMedia.addEventListener("change", this._navigationChange);
    document.addEventListener("keydown", this.handleNavigationKeydown);
    document.addEventListener("focusin", this.handleNavigationFocus);
    // configure progress bar
    nprogress.configure({
      showSpinner: false,
    });

    this.removeBeforeEach = this.$router.beforeEach((to, from, next) => {
      if (to.path !== from.path) {
        nprogress.start();
      }
      next();
    });

    this.removeAfterEach = this.$router.afterEach((to, from) => {
      nprogress.done();
      this.isSidebarOpen = false;
      this.$nextTick(() => {
        const main = this.$el && this.$el.querySelector("#main-content");
        if (to.path !== from.path && main && typeof main.focus === "function") {
          main.focus();
        }
      });
    });
  },

  beforeUnmount() {
    window.cancelAnimationFrame(this._navigationFocusFrame);
    this._navigationMedia?.removeEventListener("change", this._navigationChange);
    document.removeEventListener("keydown", this.handleNavigationKeydown);
    document.removeEventListener("focusin", this.handleNavigationFocus);
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
      if (this.isSidebarOpen && this.isMobileNavigation) {
        this.$nextTick(() => {
          this._navigationFocusFrame = window.requestAnimationFrame(() => {
            if (this.isSidebarOpen) this.$refs.sidebar?.$el.querySelector("a[href]")?.focus({ preventScroll: true });
          });
        });
      }
    },
    closeSidebar(restoreFocus = false) {
      this.isSidebarOpen = false;
      if (restoreFocus) this.$refs.navbar?.$el.querySelector(".sidebar-button")?.focus();
    },
    focusSidebar() {
      if (this.isMobileNavigation && this.isSidebarOpen && document.activeElement?.closest(".sidebar-button")) {
        this.$refs.sidebar?.$el.querySelector("a[href]")?.focus({ preventScroll: true });
      }
    },
    handleNavigationKeydown(event) {
      if (event.key === "Escape" && this.isSidebarOpen) {
        event.preventDefault();
        this.closeSidebar(true);
      }
    },
    handleNavigationFocus(event) {
      if (!this.isMobileNavigation || !this.isSidebarOpen) return;
      if (this.$refs.sidebar?.$el.contains(event.target) || event.target.closest?.(".sidebar-button")) return;
      this.closeSidebar();
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
