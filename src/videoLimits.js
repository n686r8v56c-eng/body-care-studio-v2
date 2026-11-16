// Normalize YouTube IDs without truncating the saved video list.
export function normalizeVideoIds(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter(id => typeof id === 'string' && /^[\w-]{11}$/.test(id)))];
}
