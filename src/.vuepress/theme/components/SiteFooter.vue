<template>
  <footer v-if="displayText" class="site-footer">
    <span class="site-footer-ornament" aria-hidden="true"></span>
    <span class="site-footer-signature">One more turn, 10+ years Later</span>
    <span class="site-footer-copyright">{{ displayText }}</span>
  </footer>
</template>

<script>
export default {
  name: "SiteFooter",
  props: {
    footer: {
      type: [String, Boolean],
      default: "",
    },
  },
  computed: {
    displayText() {
      if (this.footer === false) {
        return "";
      }
      const year = new Date().getFullYear();
      const text =
        typeof this.footer === "string" && this.footer.trim()
          ? this.footer.trim()
          : `© ${year} Blue Cassette`;
      return text.replace(/©\s*\d{4}/, `© ${year}`);
    },
  },
};
</script>

<style scoped>
.site-footer {
  position: relative;
  inline-size: min(1400px, calc(100% - 2rem));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  box-sizing: border-box;
  text-align: center;
  color: color-mix(in srgb, var(--page-text-color), white 25%);
  padding-block: 2.2rem 2.75rem;
  padding-inline: 2.5rem;
  margin-block: 2rem 0;
  margin-inline: auto;
}
.site-footer::before,
.site-footer::after {
  content: "";
  position: absolute;
  inset-block-start: 0;
  inline-size: calc(50% - 1.15rem);
  block-size: 1px;
}
.site-footer::before {
  inset-inline-start: 0;
  background: linear-gradient(to right, transparent, var(--border-color));
}
.site-footer::after {
  inset-inline-end: 0;
  background: linear-gradient(to left, transparent, var(--border-color));
}
.site-footer-ornament {
  position: absolute;
  inset-block-start: -0.65rem;
  inline-size: 1.3rem;
  block-size: 1.4rem;
  background: var(--accent-color);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  -webkit-clip-path: polygon(
    50% 0,
    100% 25%,
    100% 75%,
    50% 100%,
    0 75%,
    0 25%
  );
  filter: drop-shadow(
    0 0 4px color-mix(in srgb, var(--accent-color), transparent 25%)
  );
}
.site-footer-ornament::before,
.site-footer-ornament::after {
  content: "";
  position: absolute;
  clip-path: inherit;
  -webkit-clip-path: inherit;
}
.site-footer-ornament::before {
  inset: 1px;
  background: var(--page-background-color);
}
.site-footer-ornament::after {
  inset: 3.5px;
  background: var(--accent-color);
}
.site-footer-signature {
  color: var(--meta-value-color);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.site-footer-copyright {
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.025em;
}

@media (max-width: 600px) {
  .site-footer {
    inline-size: calc(100% - 1.5rem);
    padding-block: 1.9rem 2.25rem;
    padding-inline: 1rem;
  }
  .site-footer-signature {
    letter-spacing: 0.14em;
  }
}
</style>
