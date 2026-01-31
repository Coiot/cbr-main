<template>
  <div class="sidebar">
    <NavLinks />
    <slot name="top" />
    <ul class="sidebar-links" v-if="items.length">
      <li v-for="(item, i) in items" :key="i">
        <SidebarGroup
          v-if="item.type === 'group'"
          :item="item"
          :first="i === 0"
          :open="i === openGroupIndex"
          :collapsable="item.collapsable || item.collapsible"
          @toggle="toggleGroup(i)"
        />
        <SidebarLink v-else :item="item" />
      </li>
    </ul>
    <div class="sidebar-social">
      <a
        class="sidebar-social-link"
        href="https://old.reddit.com/r/civbattleroyale/"
        aria-label="Reddit"
        title="Reddit"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          class="sidebar-social-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          aria-hidden="true"
        >
          <path
            d="M373 138.6c-25.2 0-46.3-17.5-51.9-41-30.6 4.3-54.2 30.7-54.2 62.4l0 .2c47.4 1.8 90.6 15.1 124.9 36.3 12.6-9.7 28.4-15.5 45.5-15.5 41.3 0 74.7 33.4 74.7 74.7 0 29.8-17.4 55.5-42.7 67.5-2.4 86.8-97 156.6-213.2 156.6S45.5 410.1 43 323.4c-25.4-11.9-43-37.7-43-67.7 0-41.3 33.4-74.7 74.7-74.7 17.2 0 33 5.8 45.7 15.6 34-21.1 76.8-34.4 123.7-36.4l0-.3c0-44.3 33.7-80.9 76.8-85.5 4.9-24.2 26.3-42.4 52.1-42.4 29.4 0 53.3 23.9 53.3 53.3s-23.9 53.3-53.3 53.3zM157.5 255.3c-20.9 0-38.9 20.8-40.2 47.9s17.1 38.1 38 38.1 36.6-9.8 37.8-36.9-14.7-49.1-35.7-49.1l.1 0zM395 303.1c-1.2-27.1-19.2-47.9-40.2-47.9s-36.9 22-35.7 49.1 16.9 36.9 37.8 36.9 39.3-11 38-38.1l.1 0zm-60.1 70.8c1.5-3.6-1-7.7-4.9-8.1-23-2.3-47.9-3.6-73.8-3.6s-50.8 1.3-73.8 3.6c-3.9 .4-6.4 4.5-4.9 8.1 12.9 30.8 43.3 52.4 78.7 52.4s65.8-21.6 78.7-52.4z"
          />
        </svg>
      </a>
      <a
        class="sidebar-social-link"
        href="https://discord.gg/565JwaMsuQ"
        aria-label="Discord"
        title="Discord"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          class="sidebar-social-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          aria-hidden="true"
        >
          <path
            d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"
          />
        </svg>
      </a>
    </div>
    <slot name="bottom" />
  </div>
</template>

<script>
import SidebarGroup from "./SidebarGroup.vue";
import SidebarLink from "./SidebarLink.vue";
import NavLinks from "../nav/NavLinks.vue";
import { isActive } from "../../util";

export default {
  components: { SidebarGroup, SidebarLink, NavLinks },

  props: ["items"],

  data() {
    return {
      openGroupIndex: 0,
    };
  },

  created() {
    this.refreshIndex();
  },

  watch: {
    $route() {
      this.refreshIndex();
    },
  },

  methods: {
    refreshIndex() {
      const index = resolveOpenGroupIndex(this.$route, this.items);
      if (index > -1) {
        this.openGroupIndex = index;
      }
    },

    toggleGroup(index) {
      this.openGroupIndex = index === this.openGroupIndex ? -1 : index;
    },

    isActive(page) {
      return isActive(this.$route, page.path);
    },
  },
};

function resolveOpenGroupIndex(route, items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (
      item.type === "group" &&
      item.children.some((c) => isActive(route, c.path))
    ) {
      return i;
    }
  }
  return -1;
}
</script>

<style>
.sidebar ul {
  padding: 0;
  margin: 0;
  list-style-type: none;
}
.sidebar a {
  display: inline-block;
}
.sidebar .nav-links {
  display: none;
  border-bottom: 1px solid var(--border-color);
  padding: 0.5rem 0 0.75rem 0;
}
.sidebar .nav-links a {
  font-weight: 800;
}
.sidebar .nav-links .nav-item,
.sidebar .nav-links .repo-link {
  display: block;
  line-height: 1.25rem;
  font-size: 1.1em;
  padding: 0.5rem 0 0.5rem 1.5rem;
}
.sidebar .sidebar-links {
  padding: 1.5rem 0;
}
.sidebar .sidebar-social {
  display: none;
}
@media (max-width: 799px) {
  .sidebar .nav-links {
    display: block;
  }
  .sidebar .nav-links .dropdown-wrapper .nav-dropdown .dropdown-item a.router-link-active::after {
    top: calc(1rem - 2px);
  }
  .sidebar .sidebar-links {
    padding: 1rem 0;
  }
  .sidebar .sidebar-social {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    padding: 0.75rem 1.5rem 1.2rem;
    border-top: 1px solid var(--border-color);
  }
  .sidebar .sidebar-social-link {
    width: 2.2rem;
    height: 2.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid transparent;
    color: var(--text-color);
    transition: all 0.2s ease-in-out;
  }
  .sidebar .sidebar-social-link:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }
  .sidebar .sidebar-social-icon {
    width: 1.3rem;
    height: 1.3rem;
    fill: currentColor;
    display: block;
  }
}
</style>
