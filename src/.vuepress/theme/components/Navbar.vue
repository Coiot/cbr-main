<template>
  <header class="navbar">
    <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')" />

    <router-link :to="$localePath" class="home-link">
      <img
        class="logo"
        v-if="$site.themeConfig.logo"
        :src="$withBase($site.themeConfig.logo)"
        :alt="$siteTitle"
      />
      <span
        ref="siteName"
        class="site-name"
        v-if="$siteTitle"
        :class="{ 'can-hide': $site.themeConfig.logo }"
      >{{ $siteTitle }}</span>
    </router-link>

    <div class="links" :style="{
        'max-width': linksWrapMaxWidth + 'px'
      }">
      <AlgoliaSearchBox v-if="isAlgoliaSearch" :options="algolia" />
      <SearchBox v-else-if="$site.themeConfig.search !== false" />
      <NavLinks class="can-hide" />
    </div>
  </header>
</template>

<script>
import SidebarButton from "./SidebarButton.vue";
import AlgoliaSearchBox from "./AlgoliaSearchBox.vue";
import SearchBox from "./SearchBox.vue";
import NavLinks from "./NavLinks.vue";

export default {
  components: {
    SidebarButton,
    NavLinks,
    SearchBox,
    AlgoliaSearchBox,
  },

  data() {
    return {
      linksWrapMaxWidth: null,
    };
  },

  mounted() {
    const MOBILE_DESKTOP_BREAKPOINT = 719; // refer to config.styl
    const NAVBAR_VERTICAL_PADDING =
      parseInt(css(this.$el, "paddingLeft")) +
      parseInt(css(this.$el, "paddingRight"));
    const handleLinksWrapWidth = () => {
      if (document.documentElement.clientWidth < MOBILE_DESKTOP_BREAKPOINT) {
        this.linksWrapMaxWidth = null;
      } else {
        this.linksWrapMaxWidth =
          this.$el.offsetWidth -
          NAVBAR_VERTICAL_PADDING -
          ((this.$refs.siteName && this.$refs.siteName.offsetWidth) || 0);
      }
    };
    handleLinksWrapWidth();
    window.addEventListener("resize", handleLinksWrapWidth, false);
  },

  computed: {
    algolia() {
      return (
        this.$themeLocaleConfig.algolia || this.$site.themeConfig.algolia || {}
      );
    },

    isAlgoliaSearch() {
      return this.algolia && this.algolia.apiKey && this.algolia.indexName;
    },
  },
};

function css(el, property) {
  // NOTE: Known bug, will return 'auto' if style value is 'auto'
  const win = el.ownerDocument.defaultView;
  // null means not to return pseudo styles
  return win.getComputedStyle(el, null)[property];
}
</script>

<style lang="stylus">
@import '../styles/config.styl';

$navbar-vertical-padding = 0.6rem;
$navbar-horizontal-padding = 1.4rem;

.navbar {
  padding: 0 4rem 0 0;
  position: relative;

  a, span, img {
    display: inline-block;
  }

  .logo {
    height: 3.5em;
    margin-right: 0.9rem;
    vertical-align: top;
  }

  .site-name {
    position: relative;
    font-size: 1.6rem;
    font-weight: 900;
    color: $backColor;
    text-shadow: 2px 2px #eee;
    margin-top: 0.7rem;
  }

  .links {
    padding-left: 1.5rem;
    box-sizing: border-box;
    background-color: $navColor;
    white-space: nowrap;
    font-size: 1rem;
    font-weight: 700;
    position: absolute;
    right: $navbar-horizontal-padding;
    top: $navbar-vertical-padding;
    display: flex;

    .search-box {
      flex: 0 0 auto;
      vertical-align: top;
    }

    .nav-links {
      flex: 1;
    }
  }
}

@media (max-width: $MQMobile) {
  .navbar {
    padding-left: 3.1rem;

    .can-hide {
      display: none;
    }

    .links {
      padding-left: 2rem;
    }

    .logo {
      height: 3.2rem;
      min-width: 3rem;
    }
  }
}
</style>
