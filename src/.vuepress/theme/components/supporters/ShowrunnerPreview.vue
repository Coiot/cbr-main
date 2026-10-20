<template>
  <article class="supporter-panel showrunner-preview" :class="{ 'has-images': images.length }">
    <div class="showrunner-preview-copy">
      <p class="supporter-eyebrow">Showrunner</p>
      <div class="supporter-card-header"><span v-if="profile.favorite_civ" class="supporter-dot" :style="civStyle(profile.favorite_civ)" aria-hidden="true"></span><h3>{{ profile.display_name }}</h3></div>
      <p v-if="profile.flair" class="supporter-flair">{{ profile.flair }}</p>
      <p v-if="profile.introduction" class="showrunner-preview-introduction">{{ profile.introduction }}</p>
      <p v-if="competitors.length" class="supporter-muted">Rooting for {{ competitors.slice(0, 3).join(', ') }}<template v-if="competitors.length > 3"> and {{ competitors.length - 3 }} more</template></p>
    </div>
    <div v-if="images.length" class="showrunner-preview-images" :style="{ '--preview-columns': images.length === 3 ? 3 : Math.min(images.length, 2) }" aria-label="Selected showcase highlights">
      <img v-for="image in images" :key="image.key" :src="$assetUrl(image.src)" :alt="image.title" loading="lazy" decoding="async" width="320" height="180" />
    </div>
    <dl v-if="sections.length" class="showrunner-preview-content" aria-label="Inside this showcase">
      <div v-for="section in sections" :key="section.key">
        <dt><strong>{{ section.count }}</strong> {{ section.label }}</dt>
        <dd v-if="section.detail">{{ section.detail }}</dd>
      </div>
    </dl>
    <router-link v-if="profile.id" class="showrunner-preview-link" :to="showcaseLink(profile.id)">Explore showcase →</router-link>
  </article>
</template>
<script>
import { civStyle, showcaseLink } from './showcaseModel.mjs';
import { showcasePreviewSections, showcasePreviewSelections, loadShowcasePreviewCatalog } from './showcasePreview.mjs';
import { getShowcaseContent } from './showcaseApi.mjs';
import { createCollectionSceneLoader } from '../collections/collectionReading.mjs';
export default {
  props: { profile: { type: Object, required: true }, client: Object },
  data: () => ({ images: [], publicContent: null }),
  computed: {
    competitors() { return [...new Set([this.profile.favorite_civ, ...(this.profile.competitors || [])].filter(Boolean))]; },
    sections() { return showcasePreviewSections(this.profile, this.publicContent, this.images.map(image => image.title)); },
  },
  watch: { profile() { this.load(); } },
  mounted() { this._alive = true; this.load(); },
  beforeUnmount() { this._alive = false; this._request++; this._loader?.dispose(); },
  methods: {
    civStyle, showcaseLink,
    async load() {
      const request = this._request = (this._request || 0) + 1, profile = this.profile;
      this._loader?.dispose(); this.images = []; this.publicContent = null;
      if (!profile.id) return;
      const loader = this._loader = createCollectionSceneLoader(async (album, signal) => {
        const response = await fetch(this.$withBase(album.scene_data_url), { signal });
        if (!response.ok) throw new Error('Preview unavailable.');
        return response.json();
      });
      const current = () => this._alive && request === this._request;
      await Promise.all([
        (async () => {
          if (!profile.scenes?.length) return;
          try {
            const catalog = await loadShowcasePreviewCatalog(path => this.$withBase(path));
            if (!current()) return;
            const images = await Promise.all(showcasePreviewSelections(catalog, profile.scenes).map(async selection => {
              try {
                const scene = await loader.load(selection.album, selection.number);
                const src = scene.slide_svg || scene.slide_url;
                return src ? { key: selection.key, src, title: scene.scene_title || `Scene ${selection.number}` } : null;
              } catch { return null; }
            }));
            if (current()) this.images = images.filter(Boolean);
          } catch { /* Optional previews never prevent the public showcase link from working. */ }
        })(),
        (async () => {
          try {
            const result = await getShowcaseContent(this.client, profile.id);
            if (current()) this.publicContent = result;
          } catch { /* Only public creations are eligible for a preview. */ }
        })(),
      ]);
    },
  },
};
</script>
