<template>
  <section class="album-supporter-thanks" aria-label="With thanks to our supporters">
    <svg class="supporter-thanks-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
    <div class="supporter-thanks-copy">
      <h2>Made possible by our supporters</h2>
      <p>Thank you to everyone helping keep the show going</p>
    </div>
    <div class="supporter-thanks-links">
      <router-link class="supporter-thanks-directory" to="/supporters/">Meet the supporters <span aria-hidden="true">→</span></router-link>
      <router-link v-if="showInvite" class="supporter-thanks-invite" to="/support/">Join the supporters</router-link>
    </div>
  </section>
</template>
<script>
export default {
  name: 'AlbumSupporterThanks',
  props: { showInvite: { type: Boolean, default: true } },
};
</script>
<style scoped>
.album-supporter-thanks { display:flex; align-items:center; gap:1rem; margin-block:2rem 1.5rem; padding:1.15rem 1.3rem; border:1px solid var(--panel-border-color); border-block-start:3px solid var(--accent-color); border-radius:0 0 12px 12px; background:linear-gradient(145deg,var(--panel-bg-color),var(--panel-bg-soft-color)); color:var(--panel-text-color); }
.supporter-thanks-icon { inline-size:1.5rem; block-size:1.5rem; flex:0 0 auto; color:var(--accent-color); }
.supporter-thanks-copy { min-inline-size:0; }
.supporter-thanks-copy h2 { margin:0 0 .3rem; font-size:1.1rem; line-height:1.35; }
.supporter-thanks-copy p { margin:0; font-size:.9rem; line-height:1.5; color:var(--color-text-muted); }
.supporter-thanks-links { display:flex; align-items:center; gap:.6rem; margin-inline-start:auto; flex:0 0 auto; }
.supporter-thanks-directory, .supporter-thanks-invite { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; padding:.45rem .85rem; min-block-size:44px; box-sizing:border-box; border:1px solid; border-radius:999px; font-size:.9rem; line-height:1.3; text-decoration:none; }
.supporter-thanks-directory { border-color:var(--accent-color); color:var(--panel-text-color); font-weight:800; }
.supporter-thanks-directory:hover { background:var(--panel-bg-soft-color); }
.supporter-thanks-invite { border-color:var(--panel-border-color); color:var(--color-text-muted); font-weight:500; }
.supporter-thanks-invite:hover { border-color:var(--accent-color); color:var(--panel-text-color); background:var(--panel-bg-soft-color); }
.album-supporter-thanks a:focus-visible { outline:3px solid var(--accent-color); outline-offset:3px; }
@media(max-width:650px) {
  .album-supporter-thanks { align-items:flex-start; flex-wrap:wrap; gap:.7rem; padding:1rem; }
  .supporter-thanks-icon { margin-block-start:.1rem; }
  .supporter-thanks-copy { flex:1 1 calc(100% - 2.5rem); }
  .supporter-thanks-links { margin-inline-start:2.2rem; flex:1 1 100%; flex-direction:row; flex-wrap:wrap; align-items:center; gap:.4rem 1rem; }
}
</style>
