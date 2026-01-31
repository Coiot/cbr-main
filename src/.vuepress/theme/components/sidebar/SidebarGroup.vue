<template>
  <div class="sidebar-group" :class="{ first, collapsable }">
    <p class="sidebar-heading" :class="{ open }" @click="$emit('toggle')">
      <span>{{ item.title }}</span>
      <span class="arrow" v-if="collapsable" :class="open ? 'down' : 'right'">
      </span>
    </p>

    <DropdownTransition>
      <ul ref="items" class="sidebar-group-items" v-if="open || !collapsable">
        <li v-for="child in item.children">
          <SidebarLink :item="child" />
        </li>
      </ul>
    </DropdownTransition>
  </div>
</template>

<script>
import SidebarLink from "./SidebarLink.vue";
import DropdownTransition from "../shared/DropdownTransition.vue";

export default {
  name: "SidebarGroup",
  props: ["item", "first", "open", "collapsable"],
  components: { SidebarLink, DropdownTransition },
};
</script>

<style>
.sidebar-group:not(.first) {
  margin-top: 1em;
}
.sidebar-group .sidebar-group {
  padding-left: 0.5em;
}
.sidebar-group:not(.collapsable) .sidebar-heading {
  cursor: auto;
  color: inherit;
}
.sidebar-heading {
  color: #999;
  transition: color 0.15s ease;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  padding: 0 1.5rem;
  margin-top: 0;
  margin-bottom: 0.5rem;
}
.sidebar-heading.open,
.sidebar-heading:hover {
  color: inherit;
}
.sidebar-heading .arrow {
  position: relative;
  top: -0.12em;
  left: 0.5em;
}
.sidebar-heading:.open .arrow {
  top: -0.18em;
}
.sidebar-group-items {
  transition: height 0.1s ease-out;
  overflow: hidden;
}
</style>
