function resolveBrushOwnerId(editOwnerName, resolveOwnerInput) {
  const ownerId = resolveOwnerInput(editOwnerName);
  if (!Number.isFinite(ownerId) || ownerId < 0) {
    return null;
  }
  return Math.round(ownerId);
}

function getBrushOwnerChange({ tileOwner, tileCustomOwner, ownerId, mode }) {
  if (mode === "clear") {
    if (!tileOwner && !tileCustomOwner) {
      return null;
    }
    return { owner: null, customOwner: false };
  }
  if (!Number.isFinite(ownerId)) {
    return null;
  }
  if (tileOwner === ownerId && tileCustomOwner) {
    return null;
  }
  return { owner: ownerId, customOwner: true };
}

function getBrushOverlayStyle({ mode, ownerId, ownerColors }) {
  const isClear = mode === "clear";
  const color = isClear
    ? "rgba(255, 255, 255, 0.25)"
    : ownerColors[ownerId] || "#ffffff";
  return {
    color,
    fillAlpha: 0.35,
    strokeAlpha: isClear ? 0.9 : 0.75,
  };
}

export { resolveBrushOwnerId, getBrushOwnerChange, getBrushOverlayStyle };
