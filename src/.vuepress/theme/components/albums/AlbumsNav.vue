<template>
  <nav v-if="prev || next" class="page-nav" aria-label="Episode navigation">
    <div
      class="nextprev"
      :class="{
        'nextprev--single': (!!prev && !next) || (!!next && !prev),
        'nextprev--only-prev': !!prev && !next,
        'nextprev--only-next': !!next && !prev,
      }"
    >
      <router-link v-if="prev" class="nav-card prev" :to="prev.path">
        <span class="nav-arrow" aria-hidden="true">←</span>
        <span class="nav-kicker">Previous</span>
        <span class="nav-title">{{ prev.title || prev.path }}</span>
      </router-link>
      <router-link v-if="next" class="nav-card next" :to="next.path">
        <span class="nav-kicker">Next</span>
        <span class="nav-title">{{ next.title || next.path }}</span>
        <span class="nav-arrow" aria-hidden="true">→</span>
      </router-link>
    </div>
  </nav>
</template>

<script>
export default {
  name: "AlbumsNav",
  props: {
    prev: {
      type: Object,
      default: null,
    },
    next: {
      type: Object,
      default: null,
    },
  },
};
</script>

<style scoped>
.page-nav {
  padding-block-start: 0.2rem;
  margin-block: 0.6rem 1.6rem;
}
.nextprev {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  inline-size: 100%;
}
.nextprev--single {
  grid-template-columns: minmax(240px, calc((100% - 1rem) / 2));
  justify-content: start;
}
.nextprev--only-next {
  justify-content: end;
}
.nav-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-block: 0.95rem 1.05rem;
  padding-inline: 1.3rem;
  border: 1px solid #242424;
  border-radius: 0 0 14px 14px;
  background: linear-gradient(145deg, #111 0%, #161616 100%);
  color: #fff;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.nav-card::after {
  content: "";
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 4px;
  background: var(--accent-color);
}
.nav-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
  transform: translateY(-2px);
}
.nav-card.prev {
  padding-inline-start: 2.8rem;
}
.nav-card.next {
  padding-inline-end: 2.8rem;
  text-align: right;
}
.nav-kicker {
  color: color-mix(in srgb, var(--text-color), white 20%);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.nav-title {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
}
.nav-arrow {
  position: absolute;
  inset-block-start: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.1rem;
  block-size: 2.1rem;
  border-radius: 999px;
  background: oklch(from var(--accent-color) l c h / 0.9);
  color: #151515;
  font-size: 1.1rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  text-shadow: none;
  transform: translateY(-50%);
}
.nav-card.prev .nav-arrow {
  inset-inline-start: -0.9rem;
}
.nav-card.next .nav-arrow {
  inset-inline-end: -0.9rem;
}
@media (max-width: 799px) {
  .nextprev--single {
    grid-template-columns: minmax(240px, 1fr);
    justify-content: stretch;
  }
  .nav-card {
    text-align: left;
    gap: 0.2rem;
    padding-block: 0.6rem 0.7rem;
    padding-inline: 0.9rem;
    border-radius: 0 0 12px 12px;
  }
  .nav-card.next {
    padding-inline-end: 0.9rem;
  }
  .nav-card.next .nav-arrow {
    inset-inline-end: 0.5rem;
  }
  .nav-card.prev {
    padding-inline-start: 0.9rem;
  }
  .nav-card.prev .nav-arrow {
    inset-inline-start: 0.5rem;
  }
  .nav-arrow {
    inline-size: 1.8rem;
    block-size: 1.8rem;
    display: none;
  }
  .nav-kicker {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
  }
  .nav-title {
    font-size: 0.95rem;
  }
}
</style>
