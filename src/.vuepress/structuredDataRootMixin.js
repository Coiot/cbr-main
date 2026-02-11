function normalizeStructuredData(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      if (item.payload && typeof item.payload === "object") {
        return item.payload;
      }
      return item;
    })
    .filter(Boolean);
}

function serializeStructuredData(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default {
  created() {
    if (this.$ssrContext) {
      this.$ssrContext.structuredDataTags = this.renderStructuredDataTags();
    }
  },

  mounted() {
    this.updateStructuredDataScripts();
  },

  watch: {
    $page() {
      this.updateStructuredDataScripts();
    },
  },

  beforeDestroy() {
    this.removeStructuredDataScripts();
  },

  methods: {
    getStructuredDataItems() {
      const frontmatter = (this.$page && this.$page.frontmatter) || {};
      return normalizeStructuredData(frontmatter.structuredData);
    },

    renderStructuredDataTags() {
      return this.getStructuredDataItems()
        .map(
          (item, index) =>
            `<script type="application/ld+json" data-vuepress-jsonld="${index}">${serializeStructuredData(
              item
            )}</script>`
        )
        .join("\n    ");
    },

    removeStructuredDataScripts() {
      if (typeof document === "undefined") {
        return;
      }
      const nodes = document.querySelectorAll("script[data-vuepress-jsonld]");
      nodes.forEach((node) => node.parentNode && node.parentNode.removeChild(node));
    },

    updateStructuredDataScripts() {
      if (typeof document === "undefined") {
        return;
      }
      this.removeStructuredDataScripts();
      this.getStructuredDataItems().forEach((item, index) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-vuepress-jsonld", String(index));
        script.text = serializeStructuredData(item);
        document.head.appendChild(script);
      });
    },
  },
};
