<template>
  <article class="collection-entry" :class="{ 'collection-entry--text': !media }" :aria-label="`Entry ${card.entryNumber}: ${card.title}`">
    <button v-if="media && image" class="collection-entry-image" type="button" :aria-label="`View entry ${card.entryNumber} fullscreen: ${card.title}`" @click="$emit('enlarge')">
      <img :src="$assetUrl(image)" :alt="card.title" loading="lazy" decoding="async" />
    </button>
    <div class="collection-entry-text">
      <p class="collection-entry-source">Season {{ card.season.slice(1) }} · {{ albumLabel(card) }} · Scene {{ card.sceneNumber }}</p>
      <h2 tabindex="-1">{{ card.entryNumber }}. {{ card.title }}</h2>
      <p v-if="narrator" class="collection-entry-narrator">Narrated by {{ narrator }}</p>
      <p v-if="status !== 'ready' && status !== 'error'" class="collection-entry-status" :role="status === 'loading' ? 'status' : undefined">Loading narration…</p>
      <div v-else-if="status === 'error'" class="collection-entry-status"><p role="status">This entry could not be loaded.</p><button type="button" @click="$emit('retry')">Try again</button></div>
      <template v-else>
        <div class="collection-entry-narration" v-html="content.narration"></div>
        <div v-if="content.reporter" class="collection-entry-reporter" v-html="content.reporter"></div>
      </template>
      <p v-if="card.note" class="collection-entry-note"><strong>Curator’s note</strong><br />{{ card.note }}</p>
      <router-link class="collection-entry-original" :to="card.to">Open original album →</router-link>
    </div>
  </article>
</template>
<script>
import { sceneAlbumLabel } from '../spotlight/spotlightModel.mjs';
export default {
  props: { card: { type: Object, required: true }, content: Object, status: String, narrator: String, media: { type: Boolean, default: true } },
  emits: ['retry', 'enlarge'],
  computed: { image() { return this.content?.slide_svg || this.content?.slide_url || this.card.previewUrl; } },
  methods: { albumLabel: sceneAlbumLabel },
};
</script>
<style scoped>
.collection-entry { min-inline-size:0; color:var(--panel-text-color); }
.collection-entry .collection-entry-image { display:block; inline-size:100%; padding:0; min-block-size:0; border:0; border-radius:10px; overflow:hidden; background:var(--panel-bg-soft-color); cursor:zoom-in; }
.collection-entry-image img { display:block; inline-size:100%; block-size:auto; object-fit:contain; }
.collection-entry-text { padding-block:1.1rem 1.5rem; }
.collection-entry .collection-entry-source { margin:0 0 .45rem; font-size:.8rem; letter-spacing:.05em; text-transform:uppercase; color:var(--field-label-color); }
.collection-entry h2 { margin:0 0 .6rem; font-size:clamp(1.3rem,2.4vw,1.8rem); line-height:1.25; }
.collection-entry .collection-entry-narrator { font-size:.9rem; color:var(--color-text-muted); margin:0 0 .75rem; }
.collection-entry-narration { font-size:1.2rem; line-height:1.6; text-shadow:var(--narration-shadow); }
.collection-entry-narration :deep(p) { font-size:inherit; line-height:inherit; margin-block:.7rem; }
.collection-entry-narration :deep(details) { margin-block:.8rem; padding:.7rem; border:1px solid var(--panel-border-color); border-radius:8px; }
.collection-entry-narration :deep(summary) { cursor:pointer; font-weight:700; }
.collection-entry-reporter { font-size:1.05rem; line-height:1.6; }
.collection-entry .collection-entry-note { white-space:pre-wrap; border-inline-start:3px solid var(--accent-color); padding:.6rem 1rem; margin-block:1rem; }
.collection-entry-original { display:inline-block; margin-block-start:.75rem; font-size:.9rem; }
.collection-entry-status { min-block-size:4rem; color:var(--color-text-muted); }
.collection-entry--text .collection-entry-text { padding:1rem; }
.collection-entry--text .collection-entry-narration { font-size:1.05rem; }
.collection-entry :is(button,a,summary):focus-visible { outline:3px solid var(--field-label-color); outline-offset:3px; }
@media(max-width:599px) { .collection-entry-narration { font-size:1.05rem; } }
</style>
