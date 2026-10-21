<template>
  <div class="support-page">
    <section class="support-hero" aria-labelledby="support-title">
      <header>
        <h1 id="support-title">Help keep<br />the show going</h1>
        <p class="support-intro">The CPU mad lads supply the chaos. Your support helps us bring it to you. Support helps cover the website, image delivery, and the work behind each release.</p>
      </header>
      <section class="support-choice" aria-labelledby="support-choice-title">
        <h2 id="support-choice-title">Choose how to support</h2>
        <div class="support-frequency" role="group" aria-label="Support frequency">
          <button type="button" :aria-pressed="frequency === 'once'" @click="frequency = 'once'">Support once</button>
          <button type="button" :aria-pressed="frequency === 'monthly'" @click="frequency = 'monthly'">Support monthly</button>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <p class="support-duration">{{ monthly ? 'Keep your support going' : '32 days of supporter perks' }}</p>
          <p class="support-duration-copy">{{ monthly ? 'Support CBR each month. Your website supporter access renews with each successful payment.' : 'Make a one-time donation and enjoy website supporter features for 32 days from your payment.' }}</p>
        </div>
        <a class="support-primary" :href="monthly ? 'https://ko-fi.com/coiot/tiers' : 'https://ko-fi.com/coiot'" target="_blank" rel="noopener noreferrer">
          {{ monthly ? 'Support monthly on Ko-fi' : 'Support once on Ko-fi' }} <span aria-hidden="true">↗</span>
        </a>
        <p class="support-checkout-note">{{ monthly ? 'Choose your membership and complete payment on Ko-fi.' : 'Choose your amount and complete payment on Ko-fi.' }}</p>
      </section>
    </section>

    <section class="support-section support-funding" aria-labelledby="support-funding-title">
      <div>
        <p class="support-eyebrow">What your support makes possible</p>
        <h2 id="support-funding-title">A home for all<br />this glorious chaos.</h2>
        <p>Every episode joins a growing archive. Support helps keep that archive available and the next release moving.</p>
      </div>
      <ul>
        <li><h3>Keep the website running</h3><p>An interactive archive readers can return to without ads or trackers.</p></li>
        <li><h3>Keep the screenshots flowing</h3><p>Paid CDN network storing and delivering the images super fast.</p></li>
        <li><h3>Keep releases coming</h3><p>The long hours and hoops we jump through that goes into running this.</p></li>
      </ul>
    </section>

    <section id="support-perks" class="support-section support-perks-section" aria-labelledby="support-perks-title">
      <h2 id="support-perks-title">See what supporters can do</h2>
      <p class="support-section-intro">Your support comes with ways to contribute to the show and make your mark.</p>
      <div class="support-perks">
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10h8M8 14h5M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.9-5A9 9 0 1 1 21 11Z" /></svg>
          <h3>Join episode discussions</h3>
          <p>Leave comments on a new episode, with a civ flair of your choice beside your name.</p>
          <p class="support-perk-detail">Supporters can leave one comment per episode during the first week after release.</p>
        </article>
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></svg>
          <h3>{{officialMapEnabled?'Explore the cylinder together':'Build the community map'}}</h3>
          <p>{{officialMapEnabled?'Help fill in city details, improvements, units, and location notes as the story develops. Save a map view to revisit after the next release.':'Update borders, cities, and units on the live map. Add location notes to explain events worth sharing.'}}</p>
          <p class="support-perk-detail">{{officialMapEnabled?'Supporters can maintain dated map details and share views. Cities, borders, and geography follow the game history.':'Anyone can explore overlays and compare view only snapshots. Supporters can edit and add notes on the live map.'}}</p>
          <router-link class="support-see-perks" to="/community-tile-map/">Explore the community map →</router-link>
        </article>
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
          <h3>A place in the credits</h3>
          <p>Your public name and favourite civ can appear in newly generated episode supporters credits.</p>
          <p class="support-perk-detail">Your account details take priority, and private donations are acknowledged anonymously. Existing episode credits stay unchanged.</p>
        </article>
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h13M4 6h16M3 9h16v12H3zM7 13h8M7 17h5" /></svg>
          <h3>Create scene collections</h3>
          <p>Create scene collections, arrange favourite moments, and add your own curator notes.</p>
          <p class="support-perk-detail">Keep collections private or publish them for everyone to read, then feature them on your showcase.</p>
          <router-link class="support-see-perks" to="/collections/">Explore scene collections →</router-link>
        </article>
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M12 7v10M7 12h10" /><circle cx="12" cy="12" r="3" /></svg>
          <h3>Save and share map views</h3>
          <p>Save map locations, zoom levels, and overlays to return to the places you want to follow.</p>
          <p class="support-perk-detail">Keep views private or share them publicly. Follow the live map or preserve an episode snapshot.</p>
          <router-link class="support-see-perks" to="/community-tile-map/">Explore community map views →</router-link>
        </article>
        <article class="support-perk">
          <svg class="support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2M3 21h18" /></svg>
          <h3>Showcase your favourites</h3>
          <p>Create a public supporter showcase with an introduction, favourite scenes and competitors, collections, and map views.</p>
          <p class="support-perk-detail">Share your favourites with other readers and appear in the supporters directory while your support is active.</p>
          <router-link class="support-see-perks" to="/supporters/">Meet the supporters →</router-link>
        </article>
      </div>
      <p class="support-account-features">Account features open to everyone without donating: scene reactions, Spotlight favourites, and synced reading progress.</p>
    </section>

    <!-- <section class="support-section" aria-labelledby="support-connect-title">
      <h2 id="support-connect-title">From support to supporter</h2>
      <ol class="support-steps">
        <li><h3>Support through Ko-fi</h3><p>Choose a one-time donation or monthly support.</p></li>
        <li><h3>Use the same email here</h3><p>Sign in to CBR with the email you used for your payment.</p></li>
        <li><h3>Make yourself at home</h3><p>Your payment is matched automatically. Set your flair and favourite civ in your account menu.</p></li>
      </ol>
      <button class="support-account" type="button" @click="openAccount">Already donated? Open your account</button>
    </section> -->

    <section class="support-section support-questions" aria-labelledby="support-questions-title">
      <h2 id="support-questions-title">A few useful details</h2>
      <details>
        <summary>How long does access last?</summary>
        <p>A one-time donation gives 32 days of website supporter access from payment. Monthly support renews access with each successful payment. Existing comments and saved preferences remain when access ends.</p>
      </details>
      <details>
        <summary>I already donated. How do I connect my account?</summary>
        <p>Sign in using your Ko-fi payment email, then choose “Check donation access” in the account menu if your perks haven’t appeared yet. If you paid with a different email, sign in with that email to connect the donation.</p>
        <button class="support-account" type="button" @click="openAccount">Open your account</button>
      </details>
      <details>
        <summary>Why can’t I comment on an older episode or edit a snapshot?</summary>
        <p>Episode comments close a week after release for everyone. Map snapshots preserve an earlier state and are view only. {{officialMapEnabled?'Supporters can maintain dated details on the official timeline and create shared views. City placement, borders, and geography follow the recorded game.':'Current supporter access lets you comment during an episode’s open window and edit the live community map.'}}</p>
      </details>
      <details>
        <summary>Will my name appear in every episode?</summary>
        <p>New supporters credits use current active support when the artwork is generated. Your website username and favourite civ take priority. Existing episode credits are historical snapshots, and private donations receive anonymous acknowledgement.</p>
      </details>
    </section>
    <p class="support-thanks"><strong>Thank you for helping keep CBR going.</strong><br />Every contribution helps make the next episode possible.</p>
  </div>
</template>

<script>
import officialMapConfig from '../../../shared/officialMapConfig.json';
export default {
  name: 'Support',
  data: () => ({ frequency: 'monthly', officialMapEnabled: officialMapConfig.enabled }),
  computed: { monthly() { return this.frequency === 'monthly'; } },
  methods: { openAccount() { window.dispatchEvent(new CustomEvent('open-account-menu')); } },
};
</script>

<style scoped>
.support-page { --panel-muted-color: var(--color-text-muted); inline-size: min(1040px, calc(100% - 3rem)); margin-inline: auto; padding-block: 3rem 1.5rem; color: var(--panel-text-color); line-height: 1.55; }
.support-page :is(h1, h2, h3, p) { margin: 0; }
.support-page :is(h1, h2, h3, p, a, button, summary) { hyphens: none; }
.support-page p { line-height: 1.6; }
.support-page h1 { font-size: clamp(2.5rem, 5vw, 3.5rem); line-height: 1.08; letter-spacing: -0.025em; margin-block: .6rem 1.2rem; }
.support-page h2 { font-size: 1.7rem; line-height: 1.25; margin-block-end: .75rem; }
.support-page h3 { font-size: 1.1rem; line-height: 1.35; margin-block-end: .6rem; }
.support-eyebrow { color: var(--field-label-color); font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.support-hero { display: grid; grid-template-columns: 1.12fr 1fr; gap: 2rem; align-items: center; }
.support-intro { font-size: 1.1rem; color: var(--panel-muted-color); max-inline-size: 40ch; }
.support-page .support-hero-note { font-size: .9rem; color: var(--panel-muted-color); margin-block-start: 1.2rem; }
.support-see-perks { display: inline-flex; align-items: center; gap: .5rem; min-block-size: 44px; margin-block-start: 1rem; padding: .55rem 1rem; border: 1px solid var(--field-label-color); border-radius: 999px; font-size: .9rem; font-weight: 800; color: var(--panel-text-color); text-decoration: none; }
.support-see-perks:hover { background: var(--panel-bg-color); }
.support-perks-section { scroll-margin-block-start: calc(var(--navbar-height) + 1.5rem); }
.support-choice { background: linear-gradient(145deg, var(--panel-bg-color), var(--panel-bg-soft-color)); border: 1px solid var(--panel-border-color); border-block-start: 4px solid var(--accent-color); border-radius: 0 0 14px 14px; padding: 1.5rem; min-inline-size: 0; }
.support-choice h2 { font-size: 1.35rem; margin-block-end: 1rem; }
.support-frequency { display: flex; border: 1px solid var(--accent-color); border-radius: 999px; margin-block-end: 1.2rem; }
.support-frequency button { flex: 1; min-inline-size: 0; min-block-size: 44px; padding: .65rem .5rem; border: 0; background: transparent; color: var(--panel-text-color); font: inherit; font-size: .9rem; font-weight: 800; cursor: pointer; border-radius: 999px; }
.support-frequency button[aria-pressed="true"] { background: var(--accent-color); color: #151515; }
.support-page .support-duration { font-size: 1.75rem; line-height: 1.2; font-weight: 800; margin-block-end: .6rem; }
.support-duration-copy { min-block-size: 5rem; color: var(--panel-muted-color); font-size: .95rem; }
.support-primary { display: flex; gap: .5rem; align-items: center; justify-content: center; margin-block-start: 1.2rem; min-block-size: 44px; padding: .75rem 1rem; background: var(--accent-color); color: #151515; border: 1px solid var(--accent-color); border-radius: 999px; text-decoration: none; text-align: center; font-weight: 800; line-height: 1.4; }
.support-primary:hover { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color), transparent 75%); }
.support-page .support-checkout-note { font-size: .8rem; color: var(--panel-muted-color); text-align: center; margin-block-start: .7rem; }
.support-section { margin-block-start: 3rem; }
.support-page .support-section-intro { color: var(--panel-muted-color); font-size: .95rem; margin-block-end: 1.3rem; }
.support-perks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; align-items: stretch; grid-auto-rows: 1fr; }
.support-perk { display: flex; flex-direction: column; padding: 1.25rem; background: var(--panel-bg-color); border: 1px solid var(--panel-border-color); border-radius: 12px; min-inline-size: 0; }
.support-perk > .support-see-perks { align-self: flex-start; margin-block-start: auto; }
.support-icon { inline-size: 24px; block-size: 24px; color: var(--field-label-color); margin-block-end: 1rem; }
.support-perk > p { font-size: .9rem; color: var(--panel-muted-color); }
.support-perk .support-perk-detail { margin-block: .75rem 1rem; color: var(--field-label-color); font-size: .8rem; }
.support-page .support-account-features { color: var(--panel-muted-color); font-size: .85rem; margin-block-start: 1rem; }
.support-funding { display: grid; grid-template-columns: 1fr 1.05fr; gap: 2rem; padding: 1.75rem; border-block-start: 3px solid var(--accent-color); border-radius: 0 0 12px 12px; background: var(--panel-bg-color); }
.support-funding h2 { margin-block-start: .65rem; }
.support-funding > div > p:not(.support-eyebrow) { color: var(--panel-muted-color); font-size: .95rem; }
.support-funding ul { display: grid; gap: 1rem; list-style: none; padding: 0; margin: 0; }
.support-funding li { border-inline-start: 2px solid var(--accent-color); padding-inline-start: 1rem; }
.support-funding h3 { font-size: 1rem; margin-block-end: .25rem; }
.support-funding li p { font-size: .85rem; color: var(--panel-muted-color); }
.support-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; list-style: none; padding: 0; margin: 1.5rem 0; counter-reset: steps; }
.support-steps li { counter-increment: steps; }
.support-steps li::before { content: counter(steps, decimal-leading-zero); display: block; margin-block-end: .4rem; font-size: .85rem; font-weight: 800; color: var(--field-label-color); }
.support-steps h3 { font-size: 1rem; }
.support-steps p { font-size: .9rem; color: var(--panel-muted-color); }
.support-account { min-block-size: 44px; border: 1px solid var(--accent-color); border-radius: 999px; background: var(--panel-bg-color); color: var(--panel-text-color); padding: .6rem 1rem; font: inherit; font-size: .9rem; font-weight: 800; cursor: pointer; }
.support-questions details { padding-block: 1rem; border-block-end: 1px solid var(--panel-border-color); }
.support-questions summary { font-weight: 800; cursor: pointer; line-height: 1.5; }
.support-questions details p { margin-block-start: .75rem; font-size: .9rem; color: var(--panel-muted-color); }
.support-questions .support-account { margin-block-start: 1rem; }
.support-page .support-thanks { text-align: center; font-size: .95rem; color: var(--panel-muted-color); margin-block-start: 2rem; }
.support-thanks strong { color: var(--panel-text-color); }
.support-page :is(a, button, summary):focus-visible { outline: 3px solid var(--accent-color); outline-offset: 4px; }
@media (max-width: 800px) { .support-hero { grid-template-columns: 1fr; } .support-intro { max-inline-size: 60ch; } .support-perks { grid-template-columns: 1fr; grid-auto-rows: auto; } }
@media (max-width: 600px) { .support-page { inline-size: calc(100% - 2rem); padding-block-start: 1.5rem; } .support-funding { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.25rem; } .support-steps { grid-template-columns: 1fr; gap: 1.25rem; } .support-choice { padding: 1.25rem; } .support-section { margin-block-start: 2rem; } .support-duration-copy { min-block-size: 0; } .support-frequency button { font-size: .85rem; } }
@media (prefers-reduced-motion: no-preference) { .support-primary { transition: box-shadow .2s ease; } }
</style>
