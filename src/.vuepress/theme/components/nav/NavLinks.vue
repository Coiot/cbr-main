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
        <li class="nav-item" v-for="edition in editionLinks" :key="edition.id">
          <router-link :to="edition.link">{{ edition.label }}</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import DropdownLink from "./DropdownLink.vue";
import NavLink from "./NavLink.vue";
import { resolveNavLinkItem } from "../../util";
import { editionNavItems } from "../../../data/editions";

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

    editionLinks() {
      return editionNavItems.map((edition) => ({
        id: edition.id,
        label: edition.navLabel || edition.title,
        link: {
          path: "/albums/",
          query: { edition: edition.id },
        },
      }));
    },
  },
};
</script>

<style lang="stylus">
@import '../../styles/config.styl';

.nav-links {
  display: inline-block;

  a {
    color: $backColor;

    &:hover {
      color: $accentColor;
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
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease-in;

    &:hover, &.router-link-active {
      margin-bottom: 0px;
      border-bottom: 3px solid lighten($accentColor, 20%);
    }
  }
}
</style>
