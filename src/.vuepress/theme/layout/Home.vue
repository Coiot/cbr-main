<template>
  <transition name="fade">
    <div class="home">
      <section class="home-content">
        <HomeAlbums />
        <div class="link-column">
          <PRListHome />
          <a href="https://civbattleroyale.tv/albums/pr/" class="list">
            Past Power Rankings
          </a>
          <a
            href="https://www.reddit.com/r/civbattleroyale/comments/xoafnn/cbrx_season_3_megathread/"
            class="list"
          >
            S3 Megathread
          </a>
          <a href="https://ko-fi.com/coiot" class="list"> Ko-Fi Donations </a>
          <a
            href="https://civbattleroyale.tv/archive/what-is-the-civ-battle-royale/"
            class="list"
          >
            New? Join the Show
          </a>
          <a href="https://www.youtube.com/@docido3976" class="list">
            Audio Narrations
          </a>
        </div>
      </section>
      <HomeAlbums2 />
      <Content custom />
      <div class="footer" v-if="data.footer">{{ data.footer }}</div>
    </div>
  </transition>
</template>

<script>
import NavLink from "../components/NavLink.vue";

export default {
  components: {
    NavLink,
  },

  computed: {
    data() {
      return this.$page.frontmatter;
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
  padding: 3rem 1rem 0;
  max-width: 1100px;
  margin: 0px auto;

	.home-content {
		width: 100%;
		display: flex;
		justify-content: flex-between;
		gap: 2rem;
		padding: 0;
		margin-block-end: 3rem;

		h1 {
			margin-block-start: 0;
		}
	}

  .hero {
    text-align: center;

    img {
      max-height: 280px;
      display: block;
      margin: 3rem auto 1.5rem;
    }

    h1 {
      font-size: 3rem;
    }

    h1, .description, .action {
      margin: 1.8rem auto;
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
      padding: 0.8rem 1.6rem;
      border-radius: 4px;
      transition: background-color 0.1s ease;
      box-sizing: border-box;
      border-bottom: 1px solid darken($accentColor, 10%);

      &:hover {
        background-color: lighten($accentColor, 10%);
      }
    }
  }

  .features {
    border-top: 1px solid $borderColor;
    padding: 1.2rem 0;
    margin-top: 2.5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: stretch;
    justify-content: space-between;
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
		align-items: center;
		gap: 1rem;
	}

	.list {
		width: 100%;
		color: #fff;
		font-size: 1.1rem;
		font-weight: 800;
		text-align: center;
		text-shadow: 1px 2px #083832;
		background-color: #202020;
		border: 1px double #fff;
		box-shadow: -4px 4px 0 0 #ffbf46;
		padding: 1em 0;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.list:hover {
		box-shadow: 0 6px 2px 0 rgba(8, 56, 50, 0.3);
		transform: scale(1.01);
	}

  .footer {
    color: lighten($textColor, 25%);
    text-align: center;
    border-top: 2px solid $borderColor;
    padding: 1.5rem 2.5rem 2.5rem;
    margin-block-start: 5rem;
  }
}

@media (max-width: $MQMobile) {
  .home {
		.home-content {
			flex-direction: column;
		}

    .features {
      flex-direction: column;
    }

    .feature {
      max-width: 100%;
      padding: 0 2.5rem;
    }
  }
}

@media (max-width: $MQMobileNarrow) {
  .home {
    padding-left: 1.5rem;
    padding-right: 1.5rem;

    .hero {
      img {
        max-height: 210px;
        margin: 2rem auto 1.2rem;
      }

      h1 {
        font-size: 2rem;
      }

      h1, .description, .action {
        margin: 1.2rem auto;
      }

      .description {
        font-size: 1.2rem;
      }

      .action-button {
        font-size: 1rem;
        padding: 0.6rem 1.2rem;
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
