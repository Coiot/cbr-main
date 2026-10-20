export function reactionSignInPosition(anchor, panel, viewport) {
  const gutter = 12, gap = 8;
  const left = viewport.left || 0, top = viewport.top || 0;
  const bottom = top + viewport.height;
  const above = Math.max(0, anchor.top - top - gutter - gap);
  const below = Math.max(0, bottom - anchor.bottom - gutter - gap);
  const placeBelow = below >= panel.height || below >= above;
  const maxHeight = Math.max(0, Math.min(viewport.height - 2 * gutter, placeBelow ? below : above));
  const height = Math.min(panel.height, maxHeight);
  return {
    left: Math.max(left + gutter, Math.min(anchor.left, left + viewport.width - gutter - panel.width)),
    top: Math.max(top + gutter, Math.min(bottom - gutter - height, placeBelow ? anchor.bottom + gap : anchor.top - gap - height)),
    maxHeight,
  };
}
