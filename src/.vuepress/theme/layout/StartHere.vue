<template>
  <div class="start-here">
    <header class="start-intro">
      <p class="start-eyebrow">New to Civ Battle Royale?</p>
      <h1>A whole world.<br />One survivor.</h1>
      <div class="start-description">
        <p>
          Historical civilizations compete in a CPU-only game of Civilization V.
          Empires rise, alliances crumble, and the world gradually turns a few colors.
        </p>
        <p>
          Follow the action through screenshots and playful narration. Pick a
          favorite civilization and enjoy the chaos.
        </p>
      </div>
    </header>

    <section class="start-episode" aria-labelledby="start-episode-title">
      <div class="start-episode-image">
        <img
          :src="episodeImage"
          :alt="`The opening world of Civ Battle Royale ${seasonLabel}`"
          width="1920"
          height="1080"
          fetchpriority="high"
          decoding="async"
        />
      </div>
      <div class="start-episode-copy">
        <p class="start-eyebrow">Start with {{ seasonLabel }}</p>
        <h2 id="start-episode-title">{{ episodeTitle }}</h2>
        <p>
          Begin a new world with a fresh cast of competing civilizations.
        </p>
        <router-link class="start-read-link" :to="episodePath">
          Read Episode 1 <span aria-hidden="true">→</span>
        </router-link>
      </div>
    </section>
    <p class="start-reassurance">No Civilization V experience needed.</p>

    <section class="start-guidance" aria-labelledby="start-guidance-title">
      <h2 id="start-guidance-title">How to follow along</h2>
      <div class="start-steps">
        <div>
          <h3><span aria-hidden="true">1</span> Read at your pace</h3>
          <p>
            Each scene pairs a screenshot with narration to guide you through the
            rivalries, surprises, and unfolding story.
          </p>
        </div>
        <div>
          <h3><span aria-hidden="true">2</span> Choose your view</h3>
          <p>
            Scroll vertically or choose a horizontal slideshow using the viewing
            controls in the episode.
          </p>
        </div>
        <div>
          <h3><span aria-hidden="true">3</span> Keep the story going</h3>
          <p>
            Leave a comment or share your own interpretation with the community to keep the story alive.
          </p>
        </div>
      </div>
    </section>

    <section class="start-community" aria-labelledby="start-community-title">
      <h2 id="start-community-title">Join the community</h2>
      <p>Cheer on your favorites and compare head canons with other viewers.</p>
      <div class="start-community-links">
        <a
          href="https://old.reddit.com/r/civbattleroyale/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            <strong>Reddit</strong>
            <small>Episode discussions and community posts</small>
          </span>
          <span class="start-community-arrow" aria-hidden="true">↗</span>
        </a>
        <a
          href="https://discord.gg/565JwaMsuQ"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            <strong>Discord</strong>
            <small>Live chat with fellow viewers</small>
          </span>
          <span class="start-community-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "StartHere",
  computed: {
    episodePath() {
      return this.$page.frontmatter.start_episode;
    },
    seasonLabel() {
      return this.$page.frontmatter.season_label;
    },
    firstEpisode() {
      const pages = (this.$site && this.$site.pages) || [];
      return pages.find((page) => page.path === this.episodePath);
    },
    episodeTitle() {
      return this.firstEpisode?.frontmatter.title || "Episode 01";
    },
    episodeImage() {
      return this.firstEpisode?.frontmatter.image || this.$page.frontmatter.image;
    },
  },
};
</script>

<style scoped>
.start-here {
  inline-size: min(1040px, calc(100% - 3rem));
  margin-inline: auto;
  padding-block: 3rem 1rem;
}
.start-intro {
  margin-block-end: 2rem;
}
.start-eyebrow {
  margin-block: 0 0.75rem;
  color: var(--field-label-color);
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1 {
  margin-block: 0 1.25rem;
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  line-height: 1.06;
  letter-spacing: -0.025em;
}
.start-description {
  max-inline-size: 70ch;
  font-size: 1.1rem;
  line-height: 1.65;
}
.start-description p {
  margin-block: 0 0.75rem;
}
.start-episode {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  overflow: hidden;
  border: 1px solid var(--panel-border-color);
  border-block-start: 4px solid var(--accent-color);
  border-radius: 0 0 14px 14px;
  background: linear-gradient(145deg, var(--panel-bg-color), var(--panel-bg-soft-color));
  color: var(--panel-text-color);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}
.start-episode-image {
  display: flex;
  align-items: center;
  background: var(--panel-bg-soft-color);
}
.start-episode-image img {
  display: block;
  inline-size: 100%;
  block-size: auto;
}
.start-episode-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 1.75rem;
}
.start-episode-copy h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.2;
}
.start-episode-copy > p:not(.start-eyebrow) {
  margin-block: 0.85rem 1.25rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}
.start-read-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-block-size: 2.75rem;
  padding: 0.65rem 1.25rem;
  border: 2px solid var(--accent-color);
  border-radius: 999px;
  background: var(--accent-color);
  color: #151515;
  font-weight: 800;
  line-height: 1.2;
  text-decoration: none;
  transition: box-shadow 0.2s ease;
}
.start-read-link:hover {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color), transparent 75%);
}
.start-reassurance {
  margin-block: 0.8rem 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}
.start-guidance,
.start-community {
  margin-block-start: 3rem;
}
.start-guidance > h2,
.start-community > h2 {
  margin-block: 0 1rem;
  font-size: 1.7rem;
  line-height: 1.25;
}
.start-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}
.start-steps h3 {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.4;
}
.start-steps h3 span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  inline-size: 1.65rem;
  block-size: 1.65rem;
  border-radius: 50%;
  background: var(--accent-color);
  color: #151515;
}
.start-steps p,
.start-community > p {
  margin-block: 0.6rem 0;
  line-height: 1.65;
}
.start-community-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-block-start: 1.25rem;
}
.start-community-links a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--panel-border-color);
  border-block-start: 3px solid var(--accent-color);
  border-radius: 0 0 10px 10px;
  background: linear-gradient(145deg, var(--panel-bg-color), var(--panel-bg-soft-color));
  color: var(--panel-text-color);
  text-decoration: none;
  transition: border-color 0.2s ease;
}
.start-community-links a:hover {
  border-color: var(--accent-color);
}
.start-community-links strong,
.start-community-links small {
  display: block;
}
.start-community-links strong {
  color: var(--field-label-color);
  font-size: 1.2rem;
}
.start-community-links small {
  margin-block-start: 0.3rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.start-community-arrow {
  flex-shrink: 0;
  color: var(--field-label-color);
  font-size: 1.5rem;
}
.start-here a:focus-visible {
  outline: 3px solid var(--page-text-color);
  outline-offset: 5px;
}
@media (max-width: 700px) {
  .start-here {
    padding-block-start: 2rem;
  }
  .start-episode,
  .start-steps,
  .start-community-links {
    grid-template-columns: minmax(0, 1fr);
  }
  .start-episode-copy {
    padding: 1.5rem;
  }
  .start-read-link {
    align-self: stretch;
  }
  .start-steps {
    gap: 1.25rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .start-here a {
    transition: none;
  }
}
</style>
