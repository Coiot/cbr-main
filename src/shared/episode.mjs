// Episode labels also support decimal installments such as 12.5.
export const normalizeEpisodeNumber = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const raw = String(value).trim();
  if (!raw) {
    return "";
  }
  if (raw.includes(".")) {
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? String(numeric) : raw;
  }
  const numeric = Number.parseInt(raw, 10);
  return Number.isFinite(numeric) ? String(numeric) : raw;
};

