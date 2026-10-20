<template>
  <form class="email-signin" @submit.prevent="sendLink">
    <label :for="`${fieldId}-email`">Email address</label>
    <input ref="emailInput" :id="`${fieldId}-email`" v-model="email" type="email" required autocomplete="email"
      placeholder="Your email address" :aria-describedby="`${fieldId}-hint`" :disabled="loading" />
    <p :id="`${fieldId}-hint`">You'll be emailed a sign-in link. The same link creates your account if you’re new.</p>
    <button type="submit" :disabled="loading">{{ loading ? 'Sending…' : 'Email me a sign-in link' }}</button>
    <p v-if="message" :class="{ 'is-error': failed }" role="status" aria-live="polite">{{ message }}</p>
  </form>
</template>

<script>
import { useId } from 'vue';
import { getSupabaseClient } from '../../supabaseClient';
import { sendSignInLink } from '../../account/signIn.mjs';

export default {
  name: 'EmailSignInForm',
  props: { sceneNumber: { type: Number, required: true } },
  setup() { return { fieldId: useId() }; },
  data: () => ({ email: '', loading: false, message: '', failed: false }),
  methods: {
    focusEmail() { this.$refs.emailInput?.focus({ preventScroll: true }); },
    async sendLink() {
      if (this.loading) return;
      this.loading = true;
      this.message = '';
      const result = await sendSignInLink(getSupabaseClient(), this.email, {
        location: window.location, history: window.history, scene: this.sceneNumber,
      });
      this.loading = false;
      this.failed = !result.ok;
      this.message = result.message;
    },
  },
};
</script>

<style scoped>
.email-signin { display: grid; grid-template-columns: minmax(0, 1fr); gap: .6rem; min-inline-size: 0; white-space: normal; text-align: start; }
.email-signin label { font-size: .85rem; font-weight: 800; }
.email-signin input { box-sizing: border-box; inline-size: 100%; min-inline-size: 0; border: 1px solid var(--panel-border-color); border-radius: 6px; background: var(--panel-bg-elevated-color); color: var(--panel-text-color); padding: .65rem .75rem; font: inherit; font-size: 1rem; }
.email-signin p { margin: 0; font-size: .8rem; line-height: 1.5; white-space: normal; overflow-wrap: anywhere; color: var(--panel-muted-color); }
.email-signin button { min-block-size: 44px; min-inline-size: 0; border: 1px solid var(--accent-color); border-radius: 999px; background: var(--accent-color); color: #1a1a1a; padding: .6rem .8rem; font: inherit; font-size: .9rem; font-weight: 800; white-space: normal; cursor: pointer; }
.email-signin button:disabled { opacity: .7; cursor: wait; }
.email-signin .is-error { color: var(--panel-text-color); }
.email-signin :is(input, button):focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 3px; }
</style>
