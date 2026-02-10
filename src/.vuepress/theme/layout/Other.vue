<template>
  <transition name="fade">
    <div ref="pageRoot" class="page">
      <div class="page-tools">
        <button
          type="button"
          class="fullscreen-button"
          :class="{ 'is-active': isPageFullscreen }"
          @click="togglePageFullscreen"
        >
          {{ isPageFullscreen ? "Exit Fullscreen" : "Fullscreen" }}
        </button>
      </div>
      <Content custom />

      <div class="footer" v-if="footerText">{{ footerText }}</div>
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      isPageFullscreen: false,
    };
  },
  computed: {
    data() {
      return this.$page.frontmatter;
    },
    footerText() {
      const footer = this.data && this.data.footer;
      if (!footer || typeof footer !== "string") {
        return "";
      }
      const year = new Date().getFullYear();
      return footer.replace(/©\s*\d{4}/, `© ${year}`);
    },
  },
  mounted() {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("keydown", this.handleKeydown, true);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange
    );
  },
  beforeDestroy() {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("keydown", this.handleKeydown, true);
    document.removeEventListener(
      "fullscreenchange",
      this.handleFullscreenChange
    );
    document.removeEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange
    );
  },
  methods: {
    getFullscreenElement() {
      if (typeof document === "undefined") {
        return null;
      }
      return document.fullscreenElement || document.webkitFullscreenElement;
    },
    handleFullscreenChange() {
      const active = this.getFullscreenElement();
      const root = this.$refs.pageRoot;
      this.isPageFullscreen = Boolean(
        active && root && (active === root || root.contains(active))
      );
    },
    async togglePageFullscreen() {
      if (typeof document === "undefined") {
        return;
      }
      const root = this.$refs.pageRoot;
      if (!root) {
        return;
      }
      const active = this.getFullscreenElement();
      if (active) {
        const exit =
          document.exitFullscreen || document.webkitExitFullscreen || null;
        if (typeof exit === "function") {
          await exit.call(document);
        }
        return;
      }
      const request =
        root.requestFullscreen || root.webkitRequestFullscreen || null;
      if (typeof request === "function") {
        await request.call(root);
      }
    },
    handleKeydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const key = event.key;
      const tagName = event.target && event.target.tagName;
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        (event.target && event.target.isContentEditable);
      if (isInput) {
        return;
      }
      if (key === "f" || key === "F") {
        event.preventDefault();
        this.togglePageFullscreen();
      }
    },
  },
};
</script>

<style>
.page {
  padding: 0 1rem 0;
  max-width: 100%;
  margin: 0 auto;
}
.page-tools {
  display: flex;
  justify-content: flex-end;
  margin-block: 1rem 1.2rem;
}
.fullscreen-button {
  padding-block: 0.4rem;
  padding-inline: 0.95rem;
  border: 1px solid #70284f;
  border-radius: 999px;
  background: #1a1a1a;
  color: #f3d8e9;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.fullscreen-button:hover,
.fullscreen-button.is-active {
  color: #fff;
  border-color: #d20083;
  background: #d20083;
}
.page:fullscreen,
.page:-webkit-full-screen {
  inline-size: 100vw;
  block-size: 100vh;
  overflow: auto;
  padding: 1rem;
  background: #0e0e0e;
}
.page .footer {
  color: color-mix(in srgb, var(--text-color), white 25%);
  text-align: center;
  border-top: 2px solid var(--border-color);
  padding: 1.5rem 2.5rem 2.5rem;
  margin-block-start: 5rem;
}
</style>
