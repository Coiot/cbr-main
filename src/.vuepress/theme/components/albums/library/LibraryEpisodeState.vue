<template>
  <div v-if="library.userId && library.loaded" class="library-episode-state">
    <span class="reading-badge" :class="`reading-badge--${status}`"><span v-if="status === 'finished'" aria-hidden="true">✓ </span>{{ statusLabel }}</span>
    <router-link class="reading-action" :to="target" @click="$emit('open')">{{ actionLabel }}</router-link>
    <label class="reading-status-control">
      <span class="reading-sr">Reading status for {{ post.frontmatter?.title || post.title }}</span>
      <select :value="status" :disabled="library.pending[post.path]" @change="changeStatus">
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="finished">Finished</option>
      </select>
    </label>
    <span v-if="library.pending[post.path]" role="status">Saving…</span>
    <p v-if="library.errors[post.path]" class="reading-error" role="alert">{{ library.errors[post.path] }}</p>
  </div>
</template>
<script>
import { readingLibrary, readingStatus, readingTarget } from './readingLibrary.js';
export default {
  props: { post: { type: Object, required: true } },
  emits: ['open'],
  data: () => ({ library: readingLibrary.state }),
  computed: {
    row() { return this.library.records[this.post.path]; },
    status() { return readingStatus(this.row); },
    statusLabel() { return { not_started: 'Not started', in_progress: 'In progress', finished: 'Finished' }[this.status]; },
    target() { return readingTarget(this.post, this.row); },
    actionLabel() {
      if (this.status === 'finished') return 'Read again';
      if (this.status === 'not_started') return 'Start episode';
      const scene = this.target.hash.replace('#scene-', '');
      const count = this.post.frontmatter?.scene_count || this.post.frontmatter?.scenes?.length;
      return `Resume at Scene ${scene}${count ? ` of ${count}` : ''}`;
    },
  },
  methods: { async changeStatus(event) {
    const select = event.target;
    await readingLibrary.setStatus(this.post.path, select.value);
    select.value = this.status;
  } },
};
</script>
<style scoped>
.library-episode-state {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 0.85rem;
  padding: 0.7rem 0.9rem; margin-block: -0.35rem 1.25rem;
  color: var(--panel-text-color); background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color); border-radius: 0 0 12px 12px;
  font-size: 0.85rem;
}
.reading-badge { font-weight: 800; color: var(--panel-muted-color); }
.reading-badge--finished, .reading-badge--in_progress { color: var(--accent-color); }
.reading-action { color: var(--accent-color); text-underline-offset: 0.2em; }
.reading-status-control { margin-inline-start: auto; }
select {
  max-width: 100%; min-height: 2.5rem; font: inherit; color: var(--panel-text-color);
  background: var(--panel-bg-elevated-color); border: 1px solid var(--panel-border-color); border-radius: 8px; padding: 0.35rem 0.5rem;
}
a:focus-visible, select:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 3px; }
.reading-error { flex-basis: 100%; margin: 0; color: var(--accent-color); }
.reading-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
