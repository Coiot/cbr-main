# Community map behavior

`CommunityTileMapGrid.vue` owns the template, styles, reactive state, watchers,
and lifecycle hooks. It explicitly combines the exported method and computed
objects from this directory. These functions execute with the component instance
as `this`; they are not independent state stores or Vue mixins.

- `mapAccess`: authentication and edit permissions.
- `mapEditing`: tile fields, comboboxes, brushes, and undo.
- `mapPersistence`: overrides, queued writes, retries, and subscriptions.
- `mapSnapshots`: snapshot selection, comparison, cache, and publication.
- `mapLoading`: map parsing and initial hydration.
- `mapNavigation`: route requests, city/tile search, and focus.
- `mapView`: shareable views, fullscreen, and keyboard tile selection.
- `mapViewport`: zoom, pan, pinch, and viewport sizing.
- `mapInteraction`: pointer events, tooltips, and edit feedback.
- `mapRendering`: canvas/SVG drawing, geometry computed values, and labels.
- `mapOverlays`: civilization, population, and religion metrics.
- `mapContrast`: local and cloud display preferences.
- `mapPins`: saved pins, their labels, and drawing.
- `mapModel`: pure map data, entity, color, and geometry functions.
- `mapSettings`: shared constants and error formatting.

Keep lifecycle setup/teardown visible in the component, and keep method names
unique across the exported objects. Browser-facing Supabase settings come from
`src/shared/publicConfig.json`; never put server credentials in that file.

Run `npm run test:site` for offline behavior regressions. VuePress's production
build also checks the component imports and server rendering.

Initial map loading requests base and state JSON concurrently. Mobile Safari's
explicit deferred-state mode still renders the base map before requesting state.
Missing base JSON retains the binary map fallback; missing state remains optional.

The cached map paints before live snapshot and override requests begin. Readers
can navigate during synchronization; editing stays disabled until it succeeds.
Failures retain the cached map with a retry action. Snapshot embeds skip this
live refresh, and historical views are never replaced by a pending live response.

Canvas hover and selection use a separate SVG outline layer. Zoomed SVG views
look up visible grid rows and columns directly. The minimap caches its terrain
image until map data or dimensions change, drawing only the viewport box on pan.
Realtime overrides coalesce by tile once per animation frame, buffering during
initial synchronization. Ownership changes rebuild borders only for affected
tiles and their immediate neighbors. Teardown cancels pending frames and frees
the minimap cache.

Recent edit highlights use a small SVG overlay with CSS animation. Only changed
tiles enter the expiry queue; no terrain redraw or full tile scan runs during a
pulse. Reduced-motion preferences show a static outline until expiry.

Snapshot comparisons fetch both payloads concurrently. The in-memory payload
cache retains up to three snapshots, evicting the least recently used while
protecting the current view, comparison, and live base. The existing persistent
cache remains bounded separately.

“Copy view link” stores the world-space center and zoom in `view=x,y,zoom`, plus
an optional tile, snapshot, comparison, overlay owner, and contrast settings.
Links preserve the center across different screen sizes and validate/clamp
numeric input. Clipboard failures reveal a selectable URL. These links share
public map views; local edits are stored only in the reader's browser.

Fullscreen uses the browser API with an expanded-page fallback, Escape/exit
controls, focus restoration, and cleanup on navigation. Focus the map and use
Shift + arrows to select neighboring tiles; Enter opens details. Ordinary arrows
still pan, +/− zoom, F fits, and ? toggles the shortcut guide.

Initial border geometry is calculated on plain tile objects before reactive
assignment. Run `node scripts/profile-map.mjs` to compare this with construction
through Vue proxies using the checked-in 16,920-tile map. The local ten-sample
median was about 3 ms versus 15 ms for this stage; JSON parsing was about 4 ms
and tile construction about 7 ms. These are CPU microbenchmarks, not browser
load or frame-rate measurements.
