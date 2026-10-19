<template>
  <article class="spotlight-scene" :class="{ 'is-featured': featured }">
    <router-link :to="scene.to" class="spotlight-scene-image" :aria-label="`Read ${scene.title}, Episode ${scene.episodeNumber}, Scene ${scene.sceneNumber}`">
      <img v-if="scene.previewUrl && !imageFailed" :src="scene.previewUrl" alt="" :loading="featured ? 'eager' : 'lazy'" decoding="async" @error="imageFailed = true" />
      <span v-else class="spotlight-image-missing">Scene preview unavailable</span>
    </router-link>
    <div class="spotlight-scene-body">
      <p class="spotlight-eyebrow">{{ featured ? (scene.editorial ? 'Editor’s pick · ' : 'Featured moment · ') : '' }}Episode {{ scene.episodeNumber }} · Scene {{ scene.sceneNumber }}</p>
      <h2><router-link :to="scene.to">{{ scene.title }}</router-link></h2>
      <p class="spotlight-scene-episode">{{ scene.episodeTitle }}</p>
      <ul v-if="badges.length" class="spotlight-badges" :aria-label="scene.personal ? 'Your reactions' : 'Community reactions'">
        <li v-for="badge in badges" :key="badge.key" :title="badge.label"><span aria-hidden="true">{{ badge.emoji }}</span><span class="sr-only">{{ badge.label }}: </span>{{ scene.personal ? badge.label : badge.count.toLocaleString() }}</li>
      </ul>
      <router-link v-if="featured" :to="scene.to" class="spotlight-read">Read this scene <span aria-hidden="true">→</span></router-link>
    </div>
  </article>
</template>
<script>
export default {
  props: { scene: { type: Object, required: true }, featured: Boolean, reactions: { type: Array, default: () => [] } },
  data: () => ({ imageFailed: false }),
  computed: {
    badges() { return Object.entries(this.scene.reactions).map(([key, count]) => ({ key, count, ...(this.reactions.find(r => r.key.toLowerCase().replace(/[\s_-]+/g, '') === key) || { label: key, emoji: '✦' }) })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 3); },
  },
  watch: { 'scene.previewUrl'() { this.imageFailed = false; } },
};
</script>
