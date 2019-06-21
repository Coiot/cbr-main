<template>
<transition name="fade">
  <div class="blog">

    <h1 class="">{{ $page.frontmatter.title }} <span>– {{ $page.frontmatter.edition }}</span></h1>

    <div class="albumInfo">

      <div class="column" tabindex="0">
        <Label class="label">Release Date:</Label>
        <p><span class="value">{{ $page.frontmatter.release_date }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Narrated by:</Label>
        <p><span class="value">{{ $page.frontmatter.narrated_by }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Starting Turn:</Label>
        <p><span class="value">{{ $page.frontmatter.starting_turn }}</span></p>
      </div>

      <div class="column" tabindex="0">
        <Label class="label">Video:</Label>
        <p><span class="value"><a :href="$page.frontmatter.audio_narration" target="_blank">Audio Narrations</a></span></p>
        <p v-if="$page.frontmatter.fullvideo"><span class="value"><a :href="$page.frontmatter.fullvideo" target="_blank">Full In-Game Turns</a></span></p>
      </div>
    </div>

    <section class="scenes">
      <p class="abstract" tabindex="0">{{ $page.frontmatter.abstract }}</p>
      <div class="medium" v-for="scene in $page.frontmatter.scenes" :key="$page.frontmatter.scenes">
        <h2 tabindex="0">{{ scene.scene_number }}</h2>
        <img v-lazy="scene.slide_url" tabindex="0">
        <h3>{{ scene.scene_title }}</h3>
        <div class="narrations" v-html="scene.narration" tabindex="0"></div>
        </li>
      </div>
    </section>

    <Content class="custom" />

  </div>
</transition>
</template>

<script>
import {
  resolvePage,
  normalize,
  outboundRE,
  endingSlashRE
} from '../util'

export default {
  name: 'Albums',

  props: ['sidebarItems'],

  computed: {},

  methods: {},
}
</script>

<style lang="stylus" scoped>
@import '../styles/config.styl'
@require '../styles/wrapper.styl'

.blog {
  text-shadow: 2px 2px #083832;
}

.blog h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.4;
  margin-top: 2.4em;
}

.blog h1 span{
  font-size: 65%;
  margin-left: .2rem;
}

.albumInfo {
  display: flex;
  flex-flow: row nowrap;
  padding: 2rem 0 0;
  width: 100%;
  margin: 0 auto 3rem auto;
}

.column {
  flex: 0 0 25%;
}

.label {
  font-size: 1.6rem;
  font-weight: 700;
  color: $navColor;
}

.value {
  font-size: 1.4rem;
  font-weight: 500;
  line-height: 1.4;
  color: $accentColor;
}

.abstract {
  font-size: 1.8rem;
  line-height: 1.4;
}

.scenes {
  display: block;
  padding: 0;
  width: 100%;
  max-width: 1000px;
  height: auto;
  padding: 0 auto 3rem;
}

.scenes h2 {
  font-size: 3.5rem;
  font-weight: 600;
  color: white;
  margin: 4rem 0 .5rem;
}

.scenes h3 {
  font-size: 1.7rem;
  margin: 2.5rem 0 0;
}

img {
  width: 100%;
  line-height: 0;
  box-shadow: 0 5px 1px 0 rgba(8, 56, 50, 0.2);
}

.narrations {
  font-size: 1.4rem;
  line-height: 1.8;
  text-shadow: 2px 2px rgba(8, 56, 50, 0.9);
  padding: 0 0 .5rem;
    margin: .5rem 0 0;
    border-top: 4px solid #1a1a1a;
  border-bottom: 2px solid #FFBF46;
}

blockquote {
    border-left: 2px solid #FFBF46;
    margin-bottom: 1rem
}

.blog {
  @extend $wrapper
}

.page-nav
  padding-top 1rem
  padding-bottom 0
  .inner
    min-height 2rem
    margin-top 0
    border-top 1px solid $borderColor
    padding-top 1rem
    overflow auto // clear float
  .next
    float right

@media (max-width: $MQMobile) {
  .albumInfo {
    flex-flow: column nowrap;
  }
  .column {
    flex: 0 1 auto;
  }
  img {
    box-shadow: none;
  }
  .scenes h2 {
    margin: 1.5rem 0 .5rem;
  }
  .scenes h3 {
    font-size: 1.5rem;
    margin: 1rem 0 0;
  }
  .narrations {
    font-size: 1rem;
    padding: .3rem .2rem;
    margin: 0;
    border-top: 0;
    border-bottom: 1px solid #FFBF46;
  }
}

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
