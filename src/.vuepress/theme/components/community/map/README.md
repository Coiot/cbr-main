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
