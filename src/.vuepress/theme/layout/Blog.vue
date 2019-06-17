<template>
<div class="blog">
  <div class="blog__header">
    <div class="header">

      <div class="column">
        <Label class="label">Title:</Label>
        <span class="value">{{ $page.frontmatter.title }}</span>
      </div>

      <div class="column">
        <Label class="label">Release Date:</Label>
        <span class="value">{{ $page.frontmatter.release_date }}</span>
      </div>

      <div class="column">
        <Label class="label">Narrated by:</Label>
        <span class="value">{{ $page.frontmatter.narrated_by }}</span>
      </div>

      <div class="column">
        <Label class="label">Starting Turn:</Label>
        <span class="value">{{ $page.frontmatter.starting_turn }}</span>
      </div>

      <div class="column">
        <Label class="label">Audio Narration:</Label>
        <span class="value">{{ $page.frontmatter.audio_narration }}</span>
      </div>
    </div>
  </div>

  <section class="scenes">
    <p class="abstract">{{ $page.frontmatter.abstract }}</p>
    <div class="medium" v-for="scene in $page.frontmatter.scenes" :key="$page.frontmatter.scenes">
      <h2>{{ scene.scene_number }}</h2>
      <img v-lazy="scene.slide_url">
      <h3>{{ scene.scene_title }}</h3>
      <div v-html="scene.narration"></div>
      </li>
    </div>
  </section>

  <p>Testing</p>

  <Content class="custom" />

  <div class="page-nav" v-if="prev || next">
    <p class="inner">
      <span v-if="prev" class="prev">
        ←
        <router-link v-if="prev" class="prev" :to="prev.path">
          {{ prev.title || prev.path }}
        </router-link>
      </span>

      <span v-if="next" class="next">
        <router-link v-if="next" :to="next.path">
          {{ next.title || next.path }}
        </router-link>
        →
      </span>
    </p>
  </div>

  <slot name="bottom" />
</div>
</template>

<script>
import {
  resolvePage,
  normalize,
  outboundRE,
  endingSlashRE
} from '../util'

export default {
  name: 'Blog',

  props: ['sidebarItems'],

  computed: {

    prev() {
      const prev = this.$page.frontmatter.prev
      if (prev === false) {
        return
      } else if (prev) {
        return resolvePage(this.$site.pages, prev, this.$route.path)
      } else {
        return resolvePrev(this.$page, this.sidebarItems)
      }
    },

    next() {
      const next = this.$page.frontmatter.next
      if (next === false) {
        return
      } else if (next) {
        return resolvePage(this.$site.pages, next, this.$route.path)
      } else {
        return resolveNext(this.$page, this.sidebarItems)
      }
    },

    editLink() {
      if (this.$page.frontmatter.editLink === false) {
        return
      }
      const {
        repo,
        editLinks,
        docsDir = '',
        docsBranch = 'master',
        docsRepo = repo
      } = this.$site.themeConfig

      let path = normalize(this.$page.path)
      if (endingSlashRE.test(path)) {
        path += 'README.md'
      } else {
        path += '.md'
      }
      if (docsRepo && editLinks) {
        return this.createEditLink(repo, docsRepo, docsDir, docsBranch, path)
      }
    },

    editLinkText() {
      return (
        this.$themeLocaleConfig.editLinkText ||
        this.$site.themeConfig.editLinkText ||
        `Edit this page`
      )
    },

    publishDate() {
      const dateFormat = new Date(this.$frontmatter.date)
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }

      return dateFormat.toLocaleDateString(this.$lang, options)
    }
  },

  methods: {
    createEditLink(repo, docsRepo, docsDir, docsBranch, path) {
      const bitbucket = /bitbucket.org/
      if (bitbucket.test(repo)) {
        const base = outboundRE.test(docsRepo) ?
          docsRepo :
          repo
        return (
          base.replace(endingSlashRE, '') +
          `/${docsBranch}` +
          (docsDir ? '/' + docsDir.replace(endingSlashRE, '') : '') +
          path +
          `?mode=edit&spa=0&at=${docsBranch}&fileviewer=file-view-default`
        )
      }

      const base = outboundRE.test(docsRepo) ?
        docsRepo :
        `https://github.com/${docsRepo}`

      return (
        base.replace(endingSlashRE, '') +
        `/edit/${docsBranch}` +
        (docsDir ? '/' + docsDir.replace(endingSlashRE, '') : '') +
        path
      )
    }
  }
}

function resolvePrev(page, items) {
  return find(page, items, -1)
}

function resolveNext(page, items) {
  return find(page, items, 1)
}

function find(page, items, offset) {
  const res = []
  items.forEach(item => {
    if (item.type === 'group') {
      res.push(...item.children || [])
    } else {
      res.push(item)
    }
  })
  for (let i = 0; i < res.length; i++) {
    const cur = res[i]
    if (cur.type === 'page' && cur.path === page.path) {
      return res[i + offset]
    }
  }
}
</script>

<style lang="stylus" scoped>
@import '../styles/config.styl'
@require '../styles/wrapper.styl'

.label {
  font-size: 1.6rem;
  font-weight: 700;
  color: $accentColor;
}

.value {
  font-size: 1.4rem;
}

.abstract {
  font-size: 1.6rem;
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
  font-size: 3rem;
  font-weight: 600;
  color: $accentColor;
  margin: 5rem 0 0;
}

.scenes div {
  font-size: 1.4rem;
  line-height: 1.5;
  margin: .5rem 0 0;
}

img {
  width: 100%;
  line-height: 0;
  margin: 2rem 0;
}

.blog {
  @extend $wrapper
}

.blog__header {
  padding-top: 4.6rem;
}

.blog__title {
  margin-top: 0;
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

@media (max-width: $MQMobileNarrow) {
  .blog__title {
    font-size: 2.5rem;
  }
}
</style>
