<template>
  <span class="collection-control" v-if="validScenes">
    <button ref="trigger" type="button" class="collection-icon" :class="{ active: contained, unavailable: !state?.allowed }"
      :aria-disabled="!state?.allowed" :aria-describedby="hint && !open && !state?.allowed ? `${popoverId}-hint` : undefined" :aria-label="label" :title="label" :aria-expanded="open" aria-haspopup="dialog"
      @click.stop="open = !open" @keydown.stop @keydown.esc.stop.prevent="open=false;hint=false" @mouseenter="hint=true" @mouseleave="hint=false" @focus="hint=true" @blur="hint=false">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 3h13M3 6h15M3 9h13v12H3zM20 10v8m-4-4h8" /></svg>
      <span v-if="text">{{ text }}</span>
    </button>
    <CollectionPopover v-if="hint && !open && !state?.allowed" :anchor="$refs.trigger" :popover-id="`${popoverId}-hint`" title="Scene collections" tooltip @close="hint=false"><p>Scene collections are a supporter feature.</p></CollectionPopover>
    <CollectionPopover v-if="open" :anchor="$refs.trigger" :popover-id="popoverId" title="Scene collections" @close="open = false">
      <div class="collection-picker" @keydown.stop>
        <p v-if="!store">The account connection is unavailable. Please try again.</p>
        <p v-else-if="state.loading" role="status">Loading your collections…</p>
        <template v-else-if="state.accessError"><p>Your supporter access could not be checked.</p><button @click="store.refresh()">Check again</button></template>
        <template v-else-if="!state.allowed">
          <p>{{ state.expired ? 'Your supporter access has ended. Your existing collections are still available.' : 'Scene collections are a supporter feature.' }}</p>
          <router-link to="/support/">{{ state.expired ? 'Support CBR again anytime' : 'See supporter perks' }}</router-link>
          <template v-if="!state.user"><p>Already a supporter? Sign in with your Ko-fi payment email.</p><EmailSignInForm :scene-number="scenes.length === 1 ? Number(scenes[0].number) : 0" /></template>
        </template>
        <template v-else-if="state.error"><p role="status">{{ state.error }}</p><button @click="store.refresh()">Try again</button></template>
        <template v-else>
          <p>{{ scenes.length === 1 ? 'Add this scene to a collection.' : `Add ${scenes.length} selected scenes to a collection.` }}</p>
          <div class="collection-picker-list"><button v-for="row in state.rows" :key="row.id" :disabled="busy || includesAll(row)" @click="add(row)">{{ includesAll(row) ? '✓ ' : '+ ' }}{{ row.title }} <small>{{ row.published ? 'Public' : 'Private' }}</small></button></div>
          <form v-if="state.rows.length < 20" @submit.prevent="add(null)"><label>New collection<input v-model="title" maxlength="80" placeholder="Japan’s greatest moments" required /></label><button :disabled="busy || !title.trim()">Create and add</button></form>
          <router-link to="/collections/?view=mine">Manage my collections →</router-link>
        </template>
        <p v-if="message" role="status" aria-live="polite">{{ message }}</p>
      </div>
    </CollectionPopover>
  </span>
</template>
<script>
import { useId } from 'vue';
import CollectionPopover from './CollectionPopover.vue';
import EmailSignInForm from '../account/EmailSignInForm.vue';
import { getCollectionStore } from './collectionStore.js';
import { sceneKey, validCollectionPath } from './collectionModel.mjs';
export default {
  components: { CollectionPopover, EmailSignInForm },
  props: { scenes: { type: Array, required: true }, text: { type: String, default: '' } },
  setup() { return { popoverId: `collection-${useId()}` }; },
  data: () => ({ store: null, state: null, open: false, hint: false, busy: false, title: '', message: '' }),
  computed: {
    validScenes() { return this.scenes.length > 0 && this.scenes.every(s => validCollectionPath(s.path)); },
    contained() { return this.state?.rows.some(this.includesAll) || false; },
    label() { return this.state?.allowed ? (this.contained ? 'In a collection · Add to another collection' : 'Add to collection') : 'Scene collections are a supporter feature.'; },
  },
  watch: { 'state.user.id'() { this.open = false; this.message = ''; }, scenes() { this.message = ''; } },
  mounted() { this.store = getCollectionStore(); if(this.store) { this.state = this.store.state; this._release = this.store.retain(); } },
  beforeUnmount() { this._release?.(); },
  methods: {
    includesAll(row) { return this.scenes.every(s => this.state?.memberships.get(sceneKey(s))?.has(row.id)); },
    async add(row) {
      if(this.busy || !this.state.allowed) return; this.busy = true; this.message = '';
      try { const saved = await this.store.change('add', row, { title: this.title }, this.scenes); this.message = `Added to ${saved.title}.`; this.title = ''; }
      catch(error) { this.message = error.message; }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.collection-control { display: inline-flex; vertical-align: middle; }
.collection-icon { display: inline-flex; align-items: center; gap: .4rem; padding: .15rem .35rem; border: 1px solid #ffbf46; border-radius: 999px; background: transparent; color: #ffbf46; cursor: pointer; font: inherit; }
.collection-icon svg { width: 1.1rem; height: 1.1rem; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; }
.collection-icon.active, .collection-icon:hover:not(.unavailable) { background: #ffbf46; color: #1b1b1b; }
.collection-icon.unavailable { color: var(--panel-muted-color); border-color: var(--panel-border-color); }
.collection-icon:focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 3px; }
.collection-picker { font-size: .95rem; font-weight: 400; }
.collection-picker p { margin: .6rem 0; }
.collection-picker :is(button,input) { box-sizing: border-box; font: inherit; max-width: 100%; min-width: 0; color: var(--panel-text-color); border: 1px solid var(--accent-color); background: var(--panel-bg-color); border-radius: 8px; padding: .5rem .7rem; }
.collection-picker input { display: block; width: 100%; margin: .4rem 0; }
.collection-picker form { margin: 1rem 0; }
.collection-picker button { cursor: pointer; }
.collection-picker button:disabled { opacity: .6; cursor: default; }
.collection-picker-list { display: grid; gap: .5rem; max-height: 14rem; overflow: auto; }
.collection-picker-list button { text-align: start; overflow-wrap: anywhere; }
.collection-picker-list small { display: block; }
.collection-picker :is(a,button,input):focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 2px; }
</style>
