<template>
  <div v-if="notice" class="feature-notice">
    <p role="status">{{ notice.message }}</p>
    <router-link v-if="notice.action === 'donate'" to="/support/">{{ notice.actionLabel }}</router-link>
    <button v-else-if="notice.action" type="button" @click="$emit('action', notice.action)">{{ notice.actionLabel }}</button>
  </div>
</template>

<script>
export default {
  props: { notice: { type: Object, default: null } },
  emits: ['action'],
};
</script>

<style scoped>
.feature-notice {
  margin-block: 0.75rem;
  padding: 0.85rem 1rem;
  color: var(--panel-text-color);
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-inline-start: 3px solid var(--accent-color);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
}
.feature-notice p { margin: 0; }
.feature-notice :is(a, button) {
  display: inline-block;
  margin-block-start: 0.65rem;
  padding: 0.4rem 0.8rem;
  font: inherit;
  font-weight: 800;
  color: var(--panel-text-color);
  background: var(--panel-bg-color);
  border: 1px solid var(--accent-color);
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
}
.feature-notice :is(a, button):focus-visible { outline: 2px solid var(--accent-color); outline-offset: 3px; }
</style>
