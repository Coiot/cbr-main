<template>
  <section v-if="library.userId" class="episode-reading-completion" aria-label="Reading progress">
    <template v-if="library.loaded">
      <p v-if="finished" class="reading-finished">✓ Finished</p>
      <button v-else type="button" class="reading-complete-button" :disabled="saving || library.pending[path]" @click="finishAndContinue">
        {{ saving || library.pending[path] ? 'Saving…' : next ? 'Mark finished → Next episode' : 'Mark finished' }}
      </button>
      <router-link v-if="finished && next" class="reading-next" :to="next.path">Next episode →</router-link>
      <button v-if="finished" type="button" class="reading-reset" :disabled="saving || library.pending[path]" @click="resetReading">Mark not started</button>
      <p v-if="library.errors[path]" class="reading-save-error" role="alert">{{ library.errors[path] }}</p>
    </template>
    <template v-else>
      <p role="status">{{ library.error || 'Loading your reading library…' }}</p>
      <button v-if="library.error" type="button" class="reading-reset" @click="retry">Retry</button>
    </template>
  </section>
</template>
<script>
import { readingLibrary, readingStatus } from './readingLibrary.js';
export default {
  props: {
    path: { type: String, required: true }, next: { type: Object, default: null },
    prepareSave: { type: Function, required: true },
  },
  data: () => ({ library: readingLibrary.state, saving: false }),
  computed: { finished() { return readingStatus(this.library.records[this.path]) === 'finished'; } },
  methods: {
    async finishAndContinue() {
      const next = this.next;
      if (await this.saveStatus('finished')) {
        if (next) this.$router.push(next.path);
      }
    },
    async saveStatus(status) {
      if (this.saving) return false;
      const path = this.path, userId = this.library.userId;
      this.saving = true;
      try {
        await this.prepareSave(status);
        if (this.path !== path || this.library.userId !== userId) return false;
        const saved = await readingLibrary.setStatus(path, status);
        return saved && this.path === path;
      } finally { this.saving = false; }
    },
    resetReading() { return this.saveStatus('not_started'); },
    retry() { readingLibrary.refresh(); },
  },
};
</script>
<style scoped>
.episode-reading-completion {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem 1rem;
  margin-block: 1.5rem; padding: 1rem 1.2rem;
  color: var(--panel-text-color); background: linear-gradient(145deg, var(--panel-bg-color), var(--panel-bg-soft-color));
  border: 1px solid var(--panel-border-color); border-block-start: 3px solid var(--accent-color); border-radius: 0 0 12px 12px;
}
.reading-complete-button, .reading-reset, .reading-next { font: inherit; font-size: 0.9rem; font-weight: 800; padding: 0.5rem 0.8rem; border-radius: 999px; cursor: pointer; }
.reading-complete-button { border: 1px solid var(--accent-color); color: #1a1a1a; background: var(--accent-color); }
.reading-reset, .reading-next { color: var(--accent-color); background: transparent; border: 1px solid var(--accent-color); text-decoration: none; }
.reading-finished { margin: 0; color: var(--accent-color); font-weight: 800; }
.reading-save-error { flex-basis: 100%; margin: 0; color: var(--accent-color); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 3px; }
button:disabled { opacity: 0.6; cursor: wait; }
</style>
