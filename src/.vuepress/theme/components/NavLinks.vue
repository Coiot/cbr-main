<template>
  <div>
    <nav class="nav-links" v-if="userLinks.length || repoLink">
      <!-- user links -->
      <div class="nav-item" v-for="item in userLinks" :key="item.link">
        <DropdownLink v-if="item.type === 'links'" :item="item" />
        <NavLink v-else :item="item" />
      </div>
    </nav>
    <div class="nav-links">
      <ul class="edition-links">
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/s2/">CBRX Season Two</a>
        </li>
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/s1/">CBRX Season One</a>
        </li>
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/g1/">CGR Season One</a>
        </li>
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/mk2/">CBR Mark Two</a>
        </li>
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/pr/">Power Rankings</a>
        </li>
        <li class="nav-item">
          <a href="https://civbattleroyale.tv/albums/others/">Others</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import DropdownLink from "./DropdownLink.vue";
import NavLink from "./NavLink.vue";
import { resolveNavLinkItem } from "../util";

export default {
  components: {
    NavLink,
    DropdownLink,
  },

  computed: {
    userNav() {
      return this.$themeLocaleConfig.nav || this.$site.themeConfig.nav || [];
    },

    nav() {
      const { locales } = this.$site;
      if (locales && Object.keys(locales).length > 1) {
        const currentLink = this.$page.path;
        const routes = this.$router.options.routes;
        const themeLocales = this.$site.themeConfig.locales || {};
        const languageDropdown = {
          text: this.$themeLocaleConfig.selectText || "Languages",
          items: Object.keys(locales).map((path) => {
            const locale = locales[path];
            const text =
              (themeLocales[path] && themeLocales[path].label) || locale.lang;
            let link;
            // Stay on the current page
            if (locale.lang === this.$lang) {
              link = currentLink;
            } else {
              // Try to stay on the same page
              link = currentLink.replace(this.$localeConfig.path, path);
              // fallback to homepage
              if (!routes.some((route) => route.path === link)) {
                link = path;
              }
            }
            return {
              text,
              link,
            };
          }),
        };
        return [...this.userNav, languageDropdown];
      }
      return this.userNav;
    },

    userLinks() {
      return (this.nav || []).map((link) => {
        return Object.assign(resolveNavLinkItem(link), {
          items: (link.items || []).map(resolveNavLinkItem),
        });
      });
    },
  },
};
</script>

<style lang="stylus">
@import '../styles/config.styl';

.nav-links {
  display: inline-block;

  a {
    color: $backColor;

    &:hover {
      color: $accentColor;
      transform: scale(1.03);
    }
  }

  a:not(.external) {
    font-weight: 900;
    text-shadow: 1px 1px #eee;
  }

  .nav-item {
    position: relative;
    display: inline-block;
    margin-top: 0.3rem;
    margin-left: 1.2rem;
    line-height: 1.5rem;

    &:first-child {
      margin-left: 0;
    }
  }

  .repo-link {
    margin-left: 1.1rem;
  }
}

.edition-links {
  display: none;
}

@media (max-width: $MQMobile) {
  .nav-links {
    .nav-item, .repo-link {
      margin-left: 0;
    }
  }

  .edition-links {
    display: block !important;
  }
}

@media (min-width: $MQMobile) {
  .nav-links a {
    &:hover, &.router-link-active {
      color: $backColor;
    }
  }

  .nav-item {
    transition: all 0.2s ease-in;

    &:hover, &.router-link-active {
      margin-bottom: 0px;
      border-bottom: 3px solid lighten($accentColor, 20%);
    }
  }
}
</style>
