# Spotlight

Spotlight selects scene highlights from community reactions. It uses the generated
album metadata and scene index plus the `album_reaction_spotlight` Supabase view.
Public results are cached per season for ten minutes; account favourites remain
in memory and are cleared when the signed-in account changes.

To feature a scene manually, edit `src/.vuepress/data/spotlightPicks.json`:

```json
{
  "s5": { "path": "/albums/s5/Episode34/", "scene": 12 }
}
```

There is one optional pick per season. Remove its entry to return to automatic
selection. Picks are labelled “Editor’s pick”. They respect the episode limit;
in a mood category they appear only if the scene has a matching reaction.
A pick without reactions may appear under All moments. Invalid episode or scene
references fail the site build. Keep this file `{}` to use automatic picks only.

The gallery alternates episodes in rounds, newest first, taking each episode's
highest scoring remaining scene. Matching reactions determine scores, then scene
number breaks ties. The featured scene is removed from the gallery. Favourites
combine a reader's stars and hearts without duplicating scenes.

URL parameters: `season=s5`, `through=34` (or `all`), `mood=all|surprises|facepalms|funny|heartbreak|favourites`,
`view=discover|favourites`. Mood applies to discovery; season and episode limit
apply to both views. Unknown values fall back to the default selection.
