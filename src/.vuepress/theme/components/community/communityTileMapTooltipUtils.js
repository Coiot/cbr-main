function computeTooltipCoords({
  viewportWidth,
  viewportHeight,
  tooltipWidth,
  tooltipHeight,
  position,
  padding = 12,
  offset = 16,
}) {
  if (!viewportWidth || !viewportHeight || !position) {
    return null;
  }
  const width = tooltipWidth || 240;
  const height = tooltipHeight || 200;
  let left = position.x + offset;
  let top = position.y + offset;
  left = Math.min(
    Math.max(left, padding),
    Math.max(padding, viewportWidth - width - padding)
  );
  top = Math.min(
    Math.max(top, padding),
    Math.max(padding, viewportHeight - height - padding)
  );
  return { left, top };
}

function computeTooltipBridgeRect({
  position,
  tooltipCoords,
  bridgePadding = 10,
}) {
  if (!position || !tooltipCoords) {
    return null;
  }
  const startX = position.x;
  const startY = position.y;
  const endX = tooltipCoords.left;
  const endY = tooltipCoords.top;
  const minX = Math.min(startX, endX) - bridgePadding;
  const minY = Math.min(startY, endY) - bridgePadding;
  const width = Math.max(12, Math.abs(endX - startX) + bridgePadding * 2);
  const height = Math.max(12, Math.abs(endY - startY) + bridgePadding * 2);
  return {
    left: minX,
    top: minY,
    width,
    height,
  };
}

export { computeTooltipCoords, computeTooltipBridgeRect };
