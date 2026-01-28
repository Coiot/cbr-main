<template>
  <transition name="fade">
    <div class="home">
      <section class="home-content">
        <div class="albums-column">
          <div class="hero-intro">
            <h1 class="hero-tagline">Latest from the frontlines</h1>
          </div>
          <HomeAlbums />
        </div>
        <aside class="link-column">
          <div class="quick-panel">
            <router-link
              v-if="latestEpisode"
              class="latest-card"
              :to="latestEpisode.path"
            >
              <div class="latest-kicker">Latest Episode</div>
              <div class="latest-title">
                {{ latestEpisode.frontmatter.title }}
              </div>
              <div class="latest-meta">
                <span v-if="latestEpisode.frontmatter.edition">
                  {{ latestEpisode.frontmatter.edition }}
                </span>
                <span v-if="latestEpisode.frontmatter.release_date">
                  Released {{ latestEpisode.frontmatter.release_date }}
                </span>
              </div>
              <!-- <span class="latest-cta">Open Episode</span> -->
            </router-link>

            <PRListHome />

            <a href="https://civbattleroyale.tv/albums/pr/" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 2l2.7 5.6 6.2.9-4.5 4.4 1.1 6.2L12 16.9 6.5 19.1l1.1-6.2L3 8.5l6.3-.9L12 2z"
                  />
                </svg>
              </span>
              <span class="list-text">Past Power Rankings</span>
            </a>
            <a
              href="https://www.reddit.com/r/civbattleroyale/comments/1jalax7/cbrx_season_5_megathread/"
              class="list"
            >
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 4v16M4 12h16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="list-text">New? Join the Show</span>
            </a>
            <a href="https://ko-fi.com/coiot" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 21l-1.1-1C6 16 3 13.1 3 9.5 3 7 5 5 7.5 5c1.6 0 3 .8 3.5 2 0 0 .7-2 3.5-2 2.5 0 4.5 2 4.5 4.5 0 3.6-3 6.5-7.9 10.5L12 21z"
                  />
                </svg>
              </span>
              <span class="list-text">Ko-Fi Donations</span>
            </a>
            <a href="https://www.youtube.com/@docido3976" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              </span>
              <span class="list-text">Episode Audio Narrations</span>
            </a>
            <a href="https://www.youtube.com/@cchassey" class="list">
              <span class="list-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              </span>
              <span class="list-text">PR Audio Narrations</span>
            </a>
          </div>
        </aside>
      </section>
      <HomeAlbums2 />
      <Content custom />
      <div class="footer" v-if="footerText">{{ footerText }}</div>
    </div>
  </transition>
</template>

<script>
import HomeAlbums from "../components/home/HomeAlbums.vue";
import HomeAlbums2 from "../components/home/HomeAlbums2.vue";
import PRListHome from "../components/home/PRListHome.vue";

export default {
  components: {
    HomeAlbums,
    HomeAlbums2,
    PRListHome,
  },

  computed: {
    data() {
      return this.$page.frontmatter;
    },
    latestEpisode() {
      const pages = (this.$site && this.$site.pages) || [];
      return (
        pages
          .filter(
            (page) =>
              page.path.startsWith("/albums/s") && !page.frontmatter.exclude
          )
          .sort(
            (a, b) =>
              new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
          )[0] || null
      );
    },
    footerText() {
      const footer = this.data && this.data.footer;
      if (!footer || typeof footer !== "string") {
        return "";
      }
      const year = new Date().getFullYear();
      return footer.replace(/©\s*\d{4}/, `© ${year}`);
    },

    actionLink() {
      return {
        link: this.data.actionLink,
        text: this.data.actionText,
      };
    },
  },
};
</script>

<style lang="stylus">
@import '../styles/config.styl';

.home {
  max-width: 1200px;
  padding-block-start: 3rem;
  padding-block-end: 0;
  padding-inline: 1rem;
  margin-block: 0;
  margin-inline: auto;

	.home-content {
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 2rem;
		padding: 0;
		margin-block-end: 2rem;

		h1 {
			margin-block-start: 0;
		}
	}

  .albums-column {
    flex: 1.2;
    min-width: 0;
    width: 100%;
  }

  .hero-intro {
    margin-block: 0 1.5rem;
  }

  .hero-tagline {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: lighten($textColor, 35%);
    margin-block: 0 0.4rem;
  }

  .hero-subtitle {
    margin: 0;
    font-size: 1.55rem;
    font-weight: 800;
    color: lighten($textColor, 10%);
    max-width: 28rem;
  }

  .hero {
    text-align: center;

    img {
      display: block;
      max-height: 280px;
      margin-block: 3rem 1.5rem;
      margin-inline: auto;
    }

    h1 {
      font-size: 3rem;
    }

    h1, .description, .action {
      margin-block: 1.8rem;
      margin-inline: auto;
    }

    .description {
      max-width: 35rem;
      font-size: 1.6rem;
      line-height: 1.3;
      color: lighten($textColor, 40%);
    }

    .action-button {
      display: inline-block;
      font-size: 1.2rem;
      color: #fff;
      background-color: $accentColor;
      border-bottom: 1px solid darken($accentColor, 10%);
      border-radius: 4px;
      box-sizing: border-box;
      padding-block: 0.8rem;
      padding-inline: 1.6rem;
      transition: background-color 0.1s ease;

      &:hover {
        background-color: lighten($accentColor, 10%);
      }
    }
  }

  .features {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: stretch;
    justify-content: space-between;
    border-top: 1px solid $borderColor;
    padding-block: 1.2rem;
    padding-inline: 0;
    margin-block-start: 2.5rem;
  }

  .feature {
    flex-grow: 1;
    flex-basis: 30%;
    max-width: 30%;

    /* h2 {
      font-size: 1.4rem;
      font-weight: 500;
      border-bottom: none;
      padding-bottom: 0;
      color: lighten($textColor, 10%);
    } */

    p {
      color: lighten($textColor, 25%);
    }
  }

	.link-column {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1rem;
		flex: 0 0 340px;
		max-width: 380px;
	}

  .quick-panel {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    background: #fff;
    border: 1px solid #f1d9a0;
    border-radius: 16px;
    padding: 1.2rem;
  }

  .quick-title {
    font-size: 1.3rem;
    font-weight: 900;
    color: #1a1a1a;
    margin-block: 0 0.9rem;
  }

  .latest-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: #1a1a1a;
    background: linear-gradient(135deg, #fff, #fff, #fff4d8);
    border: 1px solid #d9a62b;
    border-radius: 12px;
    padding-block: 0.9rem;
    padding-inline: 1rem;
    margin-block-end: 1rem;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .latest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
  }

  .latest-kicker {
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b5b3b;
  }

  .latest-title {
    font-size: 1.1rem;
    font-weight: 900;
  }

  .latest-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    font-size: 0.85rem;
    color: #4f4f4f;
  }

  .latest-cta {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .link-column .album-list {
    margin-block: 0.8rem 0;
  }

	.list {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 0.95rem;
		font-weight: 800;
		text-align: left;
		color: #1a1a1a;
		background: linear-gradient(135deg, #fff, #fff, #fff6dc);
		border: 1px solid #d9a62b;
		border-radius: 12px;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		margin-block: 0.25rem;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		text-decoration: none;
	}

	.list:hover {
		border-color: #e5c27a;
		box-shadow: 0 10px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

  .list-icon {
    width: 2.1rem;
    height: 2.1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    color: #1a1a1a;
    background: #ffbf46;
    border-radius: 10px;
  }

  .list-icon svg {
    width: 1.1rem;
    height: 1.1rem;
    fill: currentColor;
    display: block;
  }

  .list-text {
    flex: 1;
  }


  .footer {
    color: lighten($textColor, 25%);
    text-align: center;
    border-top: 2px solid $borderColor;
    padding-block: 1.5rem 2.5rem;
    padding-inline: 2.5rem;
    margin-block-start: 3rem;
  }
}

@media (max-width: $MQMobile) {
  .home {
		.home-content {
			flex-direction: column;
		}

    .link-column {
      width: 100%;
      max-width: none;
    }

    .hero-subtitle {
      font-size: 1.2rem;
    }

    .features {
      flex-direction: column;
    }

    .feature {
      max-width: 100%;
      padding-inline: 2.5rem;
      padding-block: 0;
    }
  }
}

@media (max-width: $MQMobileNarrow) {
  .home {
    padding-inline: 1.5rem;

    .hero {
      img {
        max-height: 210px;
        margin-block: 2rem 1.2rem;
        margin-inline: auto;
      }

      h1 {
        font-size: 2rem;
      }

      h1, .description, .action {
        margin-block: 1.2rem;
        margin-inline: auto;
      }

      .description {
        font-size: 1.2rem;
      }

      .action-button {
        font-size: 1rem;
        padding-block: 0.6rem;
        padding-inline: 1.2rem;
      }
    }

    .feature {
      h2 {
        font-size: 1.25rem;
      }
    }
  }
}
</style>
