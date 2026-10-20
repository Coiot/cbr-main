<template><p v-if="isSupportersScene(scene)" class="supporters-credit-link"><router-link to="/supporters/">Meet the supporters <span aria-hidden="true">→</span></router-link></p></template>
<script>
import { isSupportersScene } from './showcaseModel.mjs';
export default { props: { scene: Object }, methods: { isSupportersScene } };
</script>
<style scoped>.supporters-credit-link { margin: 1rem 0; }.supporters-credit-link a { display: inline-flex; align-items: center; gap: .6rem; border: 1px solid var(--accent-color); border-radius: 999px; padding: .65rem 1rem; font-weight: 800; color: var(--panel-text-color); text-decoration: none; }.supporters-credit-link a:hover { background: var(--panel-bg-soft-color); }.supporters-credit-link a:focus-visible { outline: 3px solid var(--accent-color); outline-offset: 4px; }</style>
