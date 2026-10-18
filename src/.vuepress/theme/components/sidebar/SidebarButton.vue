<template>
  <button type="button" class="sidebar-button" :aria-label="open ? 'Close navigation' : 'Open navigation'" :aria-expanded="open" aria-controls="site-navigation" @click="$emit('toggle-sidebar')">
    <svg
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      viewBox="0 0 448 512"
    >
      <path
        fill="currentColor"
        d="M436 124H12c-6.627 0-12-5.373-12-12V80c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12z"
      ></path>
    </svg>
  </button>
</template>

<script>
export default { props: { open: Boolean }, emits: ['toggle-sidebar'] };
</script>

<style>
.sidebar-button {
  position: absolute;
  inset-block-start: 0.4rem;
  inset-inline-start: 0.4rem;
  display: none;
  align-items: center;
  justify-content: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  padding: 0.5rem;
  color: var(--back-color);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}
.sidebar-button .icon {
  display: block;
  inline-size: 1.35rem;
  block-size: 1.35rem;
  fill: currentColor;
}
.sidebar-button:hover,
.sidebar-button:focus-visible {
  color: var(--field-label-color);
  border-color: var(--accent-color);
}
.sidebar-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
@media (max-width: 799px) {
  .sidebar-button {
    display: flex;
  }
}
</style>
