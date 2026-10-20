import { getSavedView } from './savedViewsApi.mjs';
import { SAVED_VIEW_ID, normalizeMapViewSettings } from './savedViewSettings.mjs';
import { getSupabaseClient } from '../../../supabaseClient';
import { SUPABASE_MAP_ID } from './mapSettings.js';

export const mapSavedViewsMethods = {
  async applySavedMapViewFromRoute(requestId) {
    const id = this.$route?.query?.saved_view;
    const userId = this.authUser?.id;
    const isCurrent = () => !this._mapDisposed && requestId === this._routeViewRequestId && this.$route?.query?.saved_view === id && this.authUser?.id === userId;
    this.savedViewError = '';
    if (this.activeSavedView?.id !== id) this.activeSavedView = null;
    if (!SAVED_VIEW_ID.test(String(id || '')) || Array.isArray(id)) {
      this.activeSavedView = null;
      this.savedViewLoading = false;
      this.savedViewError = 'This saved-view link is not valid.';
      return;
    }
    this.savedViewLoading = true;
    try {
      const key = `${userId || 'guest'}:${id}`;
      if (this._savedViewFetchKey !== key) {
        this._savedViewFetchKey = key;
        this._savedViewFetch = getSavedView(this.supabase || getSupabaseClient(), id);
      }
      const row = await this._savedViewFetch;
      if (!isCurrent()) return;
      const settings = normalizeMapViewSettings(row?.settings);
      if (!row || row.map_id !== SUPABASE_MAP_ID || row.is_hidden || !settings) throw new Error('This view is unavailable. It may be private or have been removed.');
      // Loading map data will call the route handler again once tiles are ready.
      if (!this.tiles.length || !this.gridWidth || !this.gridHeight) return;
      if (settings.snapshot || settings.compare) {
        await this.loadSnapshots();
        if (!isCurrent()) return;
        for (const source of [settings.snapshot, settings.compare].filter(value => value && value !== '__live__')) {
          const known = this.snapshots.find(snapshot => snapshot.id === source);
          if ((!known && !this.staticSnapshotPathFromId(source)) || known?.is_published === false || !Array.isArray(await this.getSnapshotPayloadById(source))) {
            throw new Error('The episode or comparison snapshot for this view is unavailable.');
          }
          if (!isCurrent()) return;
        }
      }
      if (!isCurrent()) return;
      if (this.localEditsEnabled) this.setLocalEdits(false);
      await this.ensureSnapshotSelection(settings.snapshot);
      if (!isCurrent()) return;
      if (settings.snapshot) await this.applySnapshotView();
      if (!isCurrent()) return;
      this.activeSavedView = row;
      this.applyMapViewSettings(settings, isCurrent);
    } catch (error) {
      if (!isCurrent()) return;
      this.activeSavedView = null;
      this._savedViewFetchKey = null;
      this.savedViewError = error.message || 'This view could not be loaded. Please try again.';
    } finally {
      if (isCurrent()) this.savedViewLoading = false;
    }
  },
  openSavedMapView(row) {
    this._routeViewRequestId = (this._routeViewRequestId || 0) + 1;
    this._savedViewFetchKey = null;
    if (this.$route.query.saved_view === row.id) this.applyRequestedTileFromRoute();
    else this.$router.push({ path: this.$route.path, query: { saved_view: row.id } });
  },
  retrySavedMapView() {
    this._savedViewFetchKey = null;
    this.applyRequestedTileFromRoute();
  },
  closeSavedMapView() {
    this._routeViewRequestId = (this._routeViewRequestId || 0) + 1;
    this.savedViewLoading = false;
    this.activeSavedView = null;
    this.savedViewError = '';
    this._savedViewFetchKey = null;
    const query = Object.fromEntries(new URL(this.buildMapViewUrl()).searchParams);
    this.$router.replace({ path: this.$route.path, query });
  },
  handleSavedViewChanged(row) {
    this._savedViewFetchKey = null;
    if (row?.id !== this.activeSavedView?.id) return;
    if (row.deleted || row.is_hidden) this.closeSavedMapView();
    else this.activeSavedView = { ...this.activeSavedView, ...row };
  },
};
