<template>
  <div class="saved-map-views">
    <div v-if="activeView || loadingView || viewError" class="saved-view-banner" role="region" aria-label="Saved map view">
      <template v-if="activeView">
        <div><strong>{{ activeView.title }}</strong><span>by <SupporterName :user-id="activeView.user_id" :name="activeView.creator_name" /> · {{ sourceLabel(activeView) }}</span></div>
        <div class="saved-view-actions">
          <button v-if="activeView.visibility === 'public'" type="button" :disabled="followBusy[activeView.id]" @click="toggleFollow(activeView)">{{ follows(activeView) ? 'Following · Unfollow' : 'Follow' }}</button>
          <button type="button" @click="$emit('reset')">Reset to saved view</button>
          <button v-if="activeView.visibility === 'public'" type="button" @click="share(activeView)">Share saved view</button>
          <button type="button" @click="$emit('close-view')">Close</button>
        </div>
      </template>
      <p v-else-if="loadingView" role="status">Opening saved map view…</p>
      <template v-else><p role="status">{{ viewError }}</p><button type="button" @click="open()">Browse community views</button><button type="button" @click="$emit('reset')">Retry</button><button type="button" @click="$emit('close-view')">Close</button></template>
    </div>
    <p v-if="outsideMessage" class="saved-view-status" role="status">{{ outsideMessage }}</p>
    <input v-if="shareLink" class="saved-view-share" :value="shareLink" readonly aria-label="Saved map view link" @focus="$event.target.select()" />

    <dialog ref="drawer" class="saved-views-dialog" aria-labelledby="saved-views-heading" @cancel.prevent="close" @close="opened = false" @keydown.stop @pointerdown.stop @pointerup.stop>
      <div class="saved-views-heading"><h2 id="saved-views-heading" ref="heading" tabindex="-1">{{ form ? (editing ? 'Manage view' : 'Save map view') : signInView ? 'Sign in to follow' : 'Community views' }}</h2><button type="button" aria-label="Close community views" @click="close">×</button></div>

      <div v-if="showAccessHelp" class="saved-view-notice"><p>{{ accessMessage }}</p><button v-if="!user" type="button" @click="signInView = { title: 'your saved views' }; showAccessHelp = false">Sign in</button> <router-link to="/support/" @click="close">Support CBR</router-link></div>

      <template v-if="signInView">
        <p><template v-if="signInView.id">Follow <strong>{{ signInView.title }}</strong> with an account and find it again on any device.</template><template v-else>Sign in with your Ko-fi payment email to find your supporter views.</template></p>
        <form class="saved-view-form" @submit.prevent="sendLink">
          <label for="map-view-email">Email address</label><input id="map-view-email" ref="emailField" v-model="email" type="email" required autocomplete="email" placeholder="Your email address" :disabled="emailBusy" />
          <p>We’ll email you a sign-in link. The same link creates your account if you’re new. Open the view and choose Follow after signing in.</p>
          <button type="submit" class="saved-view-primary" :disabled="emailBusy">{{ emailBusy ? 'Sending…' : 'Email me a sign-in link' }}</button>
        </form>
        <button type="button" @click="signInView = null">Back to views</button>
      </template>

      <template v-else-if="form">
        <p v-if="!canChange" class="saved-view-notice">{{ accessMessage }}</p>
        <form class="saved-view-form" @submit.prevent="save">
          <label for="saved-view-title">Title</label><input id="saved-view-title" ref="titleField" v-model="draft.title" maxlength="80" required :disabled="!canChange || saving" />
          <label for="saved-view-description">Description <span>(optional)</span></label><textarea id="saved-view-description" v-model="draft.description" maxlength="300" rows="3" :disabled="!canChange || saving"></textarea>
          <label for="saved-view-visibility">Visibility</label><select id="saved-view-visibility" v-model="draft.visibility" :disabled="!canChange || saving"><option value="private">Private — only you</option><option value="public">Public — anyone can open and follow</option></select>
          <div class="saved-view-summary"><strong>{{ sourceLabel({ settings: draft.settings }) }}</strong><span>{{ overlayLabel(draft.settings) }}</span><p>{{ layerTools ? 'Opens at the selected turn. You can still explore the timeline.' : draft.settings?.snapshot ? 'This view stays on this episode snapshot.' : 'This framing opens the current community map as it changes.' }}</p><p>Includes the map center, zoom, selected tile, and contrast options. {{layerTools?'Includes your turn-specific tile edits and personal notes. Community notes are separate.':'It does not change map tiles.'}}</p></div>
          <button v-if="editing && canChange" type="button" :disabled="saving || !mapReady || local" @click="replaceFraming">Update from current map</button>
          <p v-if="draft.visibility === 'public'">Your title, description, and website username will be public.</p>
          <button v-if="canChange" type="submit" class="saved-view-primary" :disabled="saving">{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Save view' }}</button>
        </form>
        <p v-if="editing?.is_hidden" class="saved-view-notice">An administrator has hidden this view from the community.</p>
        <div v-if="editing" class="saved-view-manage">
          <p>Making a view private hides it from followers and shared links.</p>
          <button v-if="editing.visibility === 'public'" type="button" :disabled="saving" @click="makePrivate">Make private</button>
          <template v-if="confirmDelete"><p>Delete this view and its follows? This cannot be undone.</p><button type="button" :disabled="saving" @click="remove">Delete view permanently</button><button type="button" :disabled="saving" @click="confirmDelete = false">Keep view</button></template>
          <button v-else type="button" :disabled="saving" @click="confirmDelete = true">Delete view…</button>
        </div>
        <button type="button" :disabled="saving" @click="backToList">Back to views</button>
      </template>

      <template v-else>
        <p>Find a new angle on the cylinder. Anyone can explore. Supporters can create views for everyone to follow.</p>
        <div class="saved-view-tabs" role="group" aria-label="View lists"><button v-for="tab in tabs" :key="tab.id" type="button" :aria-pressed="section === tab.id" @click="changeSection(tab.id)">{{ tab.label }}</button></div>
        <form v-if="section === 'explore' || user" class="saved-view-search" @submit.prevent="load(true)"><label for="map-view-search">Search titles or creators</label><div><input id="map-view-search" v-model="search" maxlength="80" type="search" /><button type="submit">Search</button></div></form>
        <p v-if="!user && section !== 'explore'">Sign in with an account to {{ section === 'following' ? 'follow community views across devices.' : 'find your saved views.' }}</p>
        <button v-if="section === 'mine'" type="button" class="saved-view-primary" @click="create">Save current map view</button>
        <p v-if="listLoading" role="status">Loading views…</p>
        <div v-if="listError" role="status"><p>{{ listError }}</p><button type="button" @click="load(true)">Retry</button></div>
        <p v-if="!listLoading && !listError && !rows.length && (section === 'explore' || user)">{{ search ? 'No matching views. Try another title or creator, or clear your search.' : section === 'following' ? 'Follow a public view from Explore to find it here.' : section === 'mine' ? 'Your saved views will appear here.' : 'No public views yet. Supporters can share the first one.' }}</p>
        <article v-for="row in rows" :key="row.id" class="saved-view-card">
          <h3>{{ row.title }}</h3><p class="saved-view-byline">By <SupporterName :user-id="row.user_id" :name="row.creator_name" /></p>
          <div class="saved-view-badges"><span>{{ sourceLabel(row) }}</span><span>{{ overlayLabel(row.settings) }}</span><span v-if="row.visibility === 'private'">Private</span><span v-if="row.is_hidden">Hidden by admin</span></div>
          <p v-if="row.description">{{ row.description }}</p>
          <div class="saved-view-actions"><button type="button" @click="openView(row)">Open view</button><button v-if="row.visibility === 'public' && !row.is_hidden" type="button" :disabled="followBusy[row.id]" @click="toggleFollow(row)">{{ follows(row) ? 'Following · Unfollow' : 'Follow' }}</button><button v-if="row.user_id === user?.id" type="button" @click="manage(row)">Manage</button><button v-if="admin && row.visibility === 'public' && !row.is_hidden" type="button" :disabled="saving" @click="hide(row)">Hide public view</button></div>
        </article>
        <button v-if="hasMore && !listError" type="button" :disabled="listLoading" @click="load(false)">Load more</button>
      </template>
      <p v-if="message" class="saved-view-status" role="status" aria-live="polite">{{ message }}</p>
    </dialog>
  </div>
</template>

<script>
import { savedViewSection } from './map/toolbarDisclosure.mjs';
import SupporterName from '../supporters/SupporterName.vue';
import { sendSignInLink } from '../../account/signIn.mjs';
import { listSavedViews, saveMapView, setViewPrivate, deleteSavedView, setSavedViewFollow, savedViewsUnavailable, MAP_VIEW_PAGE_SIZE } from './map/savedViewsApi.mjs';
import { savedViewLabel, savedViewCanChange, normalizeMapViewSettings } from './map/savedViewSettings.mjs';

export default {
  name: 'SavedMapViews',
  components: { SupporterName },
  props: {
    layerTools: Object, client: Object, user: Object, allowed: Boolean, checking: Boolean, accessFailed: Boolean, supporterStatus: String,
    local: Boolean, mapReady: Boolean, admin: Boolean, mapId: String, snapshots: Array,
    getSettings: { type: Function, required: true }, activeView: Object, loadingView: Boolean, viewError: String,
  },
  emits: ['open-view', 'reset', 'close-view', 'changed'],
  data: () => ({ opened: false, section: 'explore', search: '', rows: [], listLoading: false, listError: '', hasMore: false,
    form: false, editing: null, draft: {}, saving: false, message: '', outsideMessage: '', shareLink: '',
    signInView: null, email: '', emailBusy: false, followState: {}, followBusy: {}, showAccessHelp: false, confirmDelete: false,
    requestVersion: 0, dialogVersion: 0,
    tabs: [{ id: 'explore', label: 'Explore' }, { id: 'following', label: 'Following' }, { id: 'mine', label: 'My views' }],
  }),
  computed: {
    canChange() { return savedViewCanChange({ signedIn: this.user, allowed: this.allowed, checking: this.checking, failed: this.accessFailed, local: this.local, loading: !this.mapReady }); },
    accessMessage() {
      if (this.local) return 'Switch to Live mode before saving. Local tile edits cannot be shared with other readers.';
      if (!this.mapReady) return 'Wait for the map to finish loading before saving a view.';
      if (this.checking) return 'Checking your supporter access…';
      if (this.accessFailed) return 'Your supporter access could not be checked. Open your account menu to retry.';
      if (this.supporterStatus === 'expired') return 'Your supporter access has ended. Your views remain available, and you can still make them private or delete them. Support CBR again anytime to create or update views.';
      return this.user ? 'Creating and updating map views is a supporter perk. You can follow public views with an account.' : 'Sign in with your Ko-fi payment email to create views. Anyone can explore; sign in to follow views.';
    },
  },
  watch: {
    'user.id'() {
      this.requestVersion++; this.dialogVersion++; this.rows = []; this.followState = {}; this.followBusy = {};
      this.message = ''; this.outsideMessage = ''; this.form = false; this.editing = null; this.signInView = null;
      this.saving = false; this.emailBusy = false; this.listLoading = false;
      if (this.opened) this.load(true);
    },
  },
  beforeUnmount() { this.requestVersion++; this.dialogVersion++; this.$refs.drawer?.close(); },
  methods: {
    sourceLabel(row) {
      if(row.settings?.snapshot?.startsWith('timeline:'))return savedViewLabel(row.settings);
      return !row.settings?.snapshot ? 'Live map' : this.snapshots?.find(snapshot => snapshot.id === row.settings.snapshot)?.episode_label || row.source_label || savedViewLabel(row.settings);
    },
    overlayLabel(settings) { return !settings || settings.overlay === 'none' ? 'Standard map' : settings.overlay === 'civilization' && settings.owner ? `${settings.owner} overlay` : `${settings.overlay[0].toUpperCase()}${settings.overlay.slice(1)} overlay`; },
    present() {
      this.dialogVersion++; this.message = ''; this.outsideMessage = ''; this.shareLink = ''; this.saving = false; this.emailBusy = false; this.opened = true;
      this.$nextTick(() => { this.$refs.drawer.scrollTop = 0; if (!this.$refs.drawer.open) this.$refs.drawer.showModal(); });
    },
    open(section) { const selected = savedViewSection(section); if (selected) { this.section = selected; this.search = ''; } this.form = false; this.signInView = null; this.showAccessHelp = false; this.present(); this.load(true); },
    close() { this.dialogVersion++; this.requestVersion++; this.opened = false; this.$refs.drawer.close(); },
    async load(reset = true) {
      const request = ++this.requestVersion, userId = this.user?.id;
      if (reset) { this.rows = []; this.hasMore = false; }
      this.listError = '';
      if (!userId && this.section !== 'explore') { this.listLoading = false; return; }
      this.listLoading = true;
      try {
        const rows = await listSavedViews(this.client, { mapId: this.mapId, section: this.section, search: this.search, offset: reset ? 0 : this.rows.length });
        if (request !== this.requestVersion || this.user?.id !== userId) return;
        this.rows = reset ? rows : [...this.rows, ...rows.filter(row => !this.rows.some(old => old.id === row.id))];
        this.hasMore = rows.length === MAP_VIEW_PAGE_SIZE;
        rows.forEach(row => { if (!this.followBusy[row.id]) this.followState[row.id] = row.is_following; });
      } catch { if (request === this.requestVersion) this.listError = savedViewsUnavailable; }
      finally { if (request === this.requestVersion) this.listLoading = false; }
    },
    changeSection(section) { this.section = section; this.search = ''; this.message = ''; this.load(true); },
    capture() {
      const settings = normalizeMapViewSettings(this.getSettings());
      if (!settings) throw new Error('The map settings are unavailable. Please try again when the map has loaded.');
      if (settings.snapshot && !this.layerTools && !this.snapshots?.some(row => row.id === settings.snapshot && row.is_published !== false)) throw new Error('Choose a published episode snapshot before saving this view.');
      return settings;
    },
    async create() {
      this.form = false; this.signInView = null; this.showAccessHelp = false; this.present();
      if (!this.canChange) { this.showAccessHelp = true; this.load(true); return; }
      const version=this.dialogVersion,userId=this.user?.id;
      try { const data=this.layerTools?await this.layerTools.read(null):null;if(version!==this.dialogVersion||userId!==this.user?.id)return;this.draft = { title: '', description: '', visibility: 'private', settings: this.capture(),...(data?{layer:data.layer,layerRevision:0}:{}) }; this.editing = null; this.confirmDelete = false; this.form = true;
        this.$nextTick(() => this.$refs.titleField?.focus({ preventScroll: true }));
      } catch (error) { this.message = error.message; }
    },
    async manage(row) { if(!row)return;this.message='';const version=this.dialogVersion,userId=this.user?.id;try{const data=this.layerTools?await this.layerTools.read(row):null;if(version!==this.dialogVersion||userId!==this.user?.id)return;this.editing=row;this.draft={title:row.title,description:row.description,visibility:row.visibility,settings:{...row.settings},...(data?{layer:data.layer,layerRevision:data.revision}:{})};this.form=true;this.confirmDelete=false;this.$nextTick(()=>{this.$refs.drawer.scrollTop=0;(this.canChange?this.$refs.titleField:this.$refs.heading)?.focus({preventScroll:true});});}catch(error){this.message=error.message;} },
    replaceFraming() { try { this.draft.settings = this.capture();if(this.layerTools)this.draft.layer=this.layerTools.capture(); this.message = 'Current framing selected. Save changes to update this view for its followers.'; } catch (error) { this.message = error.message; } },
    backToList() { this.form = false; this.editing = null; this.message = ''; this.load(true); },
    async save() {
      if (this.saving || !this.canChange) return;
      const userId = this.user?.id, version = this.dialogVersion;
      this.saving = true; this.message = '';
      try {
        const row = this.layerTools?await this.layerTools.save(this.draft,this.editing):await saveMapView(this.client, userId, this.mapId, this.draft, this.editing);
        if (this.user?.id !== userId || this.dialogVersion !== version) return;
        this.$emit('changed', row); this.form = false; this.section = 'mine'; this.search = ''; await this.load(true); this.message = 'View saved.';
      } catch (error) { if (this.user?.id === userId && this.dialogVersion === version) this.message = error.message; }
      finally { if (this.user?.id === userId && this.dialogVersion === version) this.saving = false; }
    },
    async ownerAction(action) {
      if (this.saving || !this.editing || this.editing.user_id !== this.user?.id) return;
      this.saving = true; this.message = ''; const userId = this.user.id, version = this.dialogVersion, id = this.editing.id;
      try {
        const row = action === 'private' ? await setViewPrivate(this.client, userId, id) : await deleteSavedView(this.client, userId, id);
        if (this.user?.id !== userId || version !== this.dialogVersion) return;
        this.$emit('changed', action === 'private' ? row : { id, deleted: true }); this.backToList(); this.message = action === 'private' ? 'View is now private.' : 'View deleted.';
      } catch (error) { if (this.user?.id === userId && version === this.dialogVersion) this.message = error.message; }
      finally { if (this.user?.id === userId && version === this.dialogVersion) this.saving = false; }
    },
    makePrivate() { this.ownerAction('private'); }, remove() { this.ownerAction('delete'); },
    openView(row) { this.close(); this.$emit('open-view', row); },
    follows(row) { return this.followState[row.id] ?? row.is_following ?? false; },
    async toggleFollow(row) {
      if (!this.user) { this.signInView = row; this.form = false; this.present(); this.$nextTick(() => this.$refs.emailField?.focus({ preventScroll: true })); return; }
      if (this.followBusy[row.id]) return;
      const userId = this.user.id, before = this.follows(row), after = !before;
      this.followBusy[row.id] = true; this.followState[row.id] = after;
      try { await setSavedViewFollow(this.client, userId, row.id, after); }
      catch (error) { if (this.user?.id === userId) { this.followState[row.id] = before; if (this.opened) this.message = error.message; else this.outsideMessage = error.message; } }
      finally { if (this.user?.id === userId) { this.followBusy[row.id] = false; if (this.section === 'following' && this.opened && !this.form) this.load(true); } }
    },
    async sendLink() {
      if (this.emailBusy) return;
      const version = this.dialogVersion; this.emailBusy = true; this.message = '';
      const url = new URL(window.location.href); url.hash = ''; if (this.signInView.id) { url.search = ''; url.searchParams.set('saved_view', this.signInView.id); }
      const result = await sendSignInLink(this.client, this.email, { location: url });
      if (version !== this.dialogVersion) return;
      this.emailBusy = false; this.message = result.message;
    },
    async share(row) {
      const url = new URL(window.location.href); url.search = ''; url.hash = ''; url.searchParams.set('saved_view', row.id);
      try { await navigator.clipboard.writeText(url.href); this.outsideMessage = 'Saved view link copied.'; this.shareLink = ''; }
      catch { this.outsideMessage = 'Select and copy this saved view link:'; this.shareLink = url.href; }
    },
    async hide(row) {
      if (!this.admin || this.saving) return;
      this.saving = true; const userId = this.user?.id;
      try { const { error } = await this.client.rpc('hide_map_saved_view', { p_id: row.id }); if (error) throw new Error('The view could not be hidden. Please try again.'); if (userId === this.user?.id) { this.$emit('changed', { ...row, is_hidden: true }); this.load(true); } }
      catch (error) { if (userId === this.user?.id) this.message = error.message; }
      finally { if (userId === this.user?.id) this.saving = false; }
    },
  },
};
</script>

<style scoped>
.saved-map-views { min-width: 0; color: var(--panel-text-color); }
.saved-map-views:empty { display: none; }
.saved-view-banner { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: space-between; align-items: center; padding: .8rem 1rem; border: 1px solid var(--panel-border-color); border-inline-start: 3px solid var(--accent-color); border-radius: 10px; background: var(--panel-bg-soft-color); font-size: .85rem; }
.saved-view-banner strong, .saved-view-banner span, .saved-view-summary span { display: block; overflow-wrap: anywhere; }
.saved-view-banner span, .saved-view-byline { color: var(--panel-muted-color); font-size: .8rem; }
.saved-view-banner p { margin: 0; }
.saved-map-views button { min-height: 40px; border: 1px solid var(--panel-border-color); background: var(--panel-bg-soft-color); color: var(--panel-text-color); border-radius: 999px; padding: .4rem .85rem; font: inherit; font-size: .85rem; font-weight: 700; white-space: normal; cursor: pointer; }
.saved-map-views button:disabled { opacity: .55; cursor: wait; }
.saved-map-views :is(button, input, select, textarea, a):focus-visible { outline: 3px solid var(--field-label-color); outline-offset: 3px; }
.saved-map-views .saved-view-primary, .saved-view-tabs button[aria-pressed="true"] { background: var(--accent-color); color: #1a1a1a; border-color: var(--accent-color); }
.saved-view-actions { display: flex; flex-wrap: wrap; gap: .45rem; }
.saved-views-dialog { position: fixed; inset: 0 0 0 auto; margin: 0; width: min(29rem, 100%); max-width: 100%; height: 100dvh; max-height: 100dvh; box-sizing: border-box; padding: 1.25rem; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; border: 0; border-inline-start: 2px solid var(--accent-color); background: var(--panel-bg-color); color: var(--panel-text-color); font-size: 1rem; line-height: 1.5; text-shadow: none; }
.saved-views-dialog::backdrop { background: rgb(0 0 0 / .45); }
.saved-views-dialog p { font-size: .85rem; line-height: 1.5; margin: .65rem 0; white-space: normal; overflow-wrap: anywhere; }
.saved-views-heading { display: flex; align-items: center; gap: .5rem; justify-content: space-between; margin-block-end: .75rem; }
.saved-views-heading h2 { font-size: 1.35rem; line-height: 1.3; margin: 0; text-shadow: none; }
.saved-views-heading button { flex: 0 0 40px; padding: 0; font-size: 1.5rem; }
.saved-view-tabs { display: flex; gap: .3rem; flex-wrap: wrap; margin: 1rem 0; }
.saved-view-form, .saved-view-search { display: grid; grid-template-columns: minmax(0, 1fr); gap: .6rem; margin: 1rem 0; }
.saved-map-views :is(input, textarea, select) { min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; border: 1px solid var(--panel-border-color); border-radius: 6px; background: var(--panel-bg-elevated-color); color: var(--panel-text-color); padding: .6rem; font: inherit; font-size: 1rem; }
.saved-view-form label, .saved-view-search label { font-size: .85rem; font-weight: 800; }
.saved-view-form label span { font-weight: 400; }
.saved-view-search > div { display: flex; gap: .5rem; }
.saved-view-card { padding: 1rem; border: 1px solid var(--panel-border-color); border-block-start: 3px solid var(--accent-color); border-radius: 10px; background: var(--panel-bg-soft-color); margin-block: .85rem; overflow-wrap: anywhere; }
.saved-view-card h3 { font-size: 1.1rem; line-height: 1.4; margin: 0; text-shadow: none; }
.saved-view-card .saved-view-byline { margin-block-start: .25rem; }
.saved-view-badges { display: flex; flex-wrap: wrap; gap: .4rem; margin-block: .6rem; }
.saved-view-badges span { border: 1px solid var(--panel-border-color); border-radius: 999px; padding: .15rem .5rem; font-size: .7rem; }
.saved-view-summary, .saved-view-notice, .saved-view-manage { padding: .8rem; background: var(--panel-bg-soft-color); border: 1px solid var(--panel-border-color); border-radius: 8px; margin-block: .75rem; }
.saved-view-summary { font-size: .85rem; }
.saved-view-status { font-size: .85rem; overflow-wrap: anywhere; }
.saved-view-share { margin-block: .5rem; }
@media (max-width: 600px) { .saved-views-dialog { width: 100%; border-inline-start: 0; border-block-start: 3px solid var(--accent-color); padding: 1rem; } .saved-map-views button { min-height: 44px; } }
</style>
