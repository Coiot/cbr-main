<template><router-link v-if="link" :to="link" class="supporter-name-link">{{ name || 'CBR supporter' }}</router-link><span v-else>{{ name || 'CBR supporter' }}</span></template>
<script>
import { getSupabaseClient } from '../../supabaseClient';
import { lookupShowcaseName } from './showcaseApi.mjs';
import { showcaseLink } from './showcaseModel.mjs';
export default {
  props: { userId: String, name: String }, data: () => ({ link: '' }),
  mounted() { this._alive = true; this.load(); }, beforeUnmount() { this._alive = false; this._request++; },
  watch: { userId() { this.load(); } },
  methods: { async load() { const request = this._request = (this._request || 0) + 1; this.link = ''; const id = await lookupShowcaseName(getSupabaseClient(), this.userId); if (this._alive && request === this._request) this.link = showcaseLink(id); } },
};
</script>
<style scoped>.supporter-name-link { color: inherit; text-decoration: underline; text-decoration-color: var(--accent-color); text-underline-offset: .2em; }.supporter-name-link:focus-visible { outline: 3px solid var(--accent-color); outline-offset: 3px; }</style>
