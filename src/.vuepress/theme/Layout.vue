<template>
  <div
    class="theme-container"
    :class="pageClasses"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <Navbar v-if="shouldShowNavbar" @toggle-sidebar="toggleSidebar" />

    <Sidebar :items="sidebarItems" @toggle-sidebar="toggleSidebar">
      <slot name="sidebar-top" slot="top" />
      <slot name="sidebar-bottom" slot="bottom" />
    </Sidebar>

    <Albums v-if="$page.frontmatter.edition" :sidebar-items="sidebarItems" />

    <div class="custom-layout" v-else-if="$page.frontmatter.layout">
      <component :is="$page.frontmatter.layout" />
    </div>

    <Home v-else-if="$page.frontmatter.home" />

    <Page v-else :sidebar-items="sidebarItems">
      <slot name="page-top" slot="top" />
      <slot name="page-bottom" slot="bottom" />
    </Page>

    <SWUpdatePopup />
  </div>
</template>

<script>
import Vue from "vue";
import nprogress from "nprogress";
import Albums from "./layout/Albums.vue";
import Home from "./layout/Home.vue";
import Page from "./layout/Page.vue";
import Navbar from "./components/Navbar.vue";
import Sidebar from "./components/Sidebar.vue";
import SWUpdatePopup from "./components/SWUpdatePopup.vue";
import { resolveSidebarItems } from "./util";
import VueLazyload from "vue-lazyload";
import { VueperSlides, VueperSlide } from "vueperslides";
import "vueperslides/dist/vueperslides.css";

Vue.use(VueLazyload, {
  observer: true,
  observerOptions: {
    rootMargin: "2000px",
    threshold: 0.0,
  },
});

export default {
  components: {
    Albums,
    Home,
    Page,
    Sidebar,
    Navbar,
    SWUpdatePopup,
    VueperSlides,
    VueperSlide,
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
    window.addEventListener("scroll", this.onScroll);

    // configure progress bar
    nprogress.configure({
      showSpinner: false,
    });

    this.$router.beforeEach((to, from, next) => {
      if (to.path !== from.path && !Vue.component(to.name)) {
        nprogress.start();
      }
      next();
    });

    this.$router.afterEach(() => {
      nprogress.done();
      this.isSidebarOpen = false;
    });

    this.$on("sw-updated", this.onSWUpdated);
  },

  methods: {
    toggleSidebar(to) {
      this.isSidebarOpen = typeof to === "boolean" ? to : !this.isSidebarOpen;
    },

    // side swipe
    onTouchStart(e) {
      this.touchStart = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
    },

    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchStart.x;
      const dy = e.changedTouches[0].clientY - this.touchStart.y;
    },

    onSWUpdated(e) {
      this.swUpdateEvent = e;
    },
  },
};
</script>

<style src="prismjs/themes/prism-tomorrow.css"></style>
<style src="./styles/theme.styl" lang="stylus"></style>
<style>
.slide-wrapper {
  display: flex;
  -webkit-box-orient: vertical;
  flex-direction: column;
}

.vueperslides__fractions {
  border: 1px solid hsl(53.7, 89.4%, 51.3%) !important;
  border-radius: 0.3em !important;
  background: hsla(38.3, 42.2%, 63.4%, 0.8) !important;
  font-weight: 800;
  color: #fff;
  text-shadow: 1px 1px 1px #000;
  padding: 0.5em 1em;
}
</style>
