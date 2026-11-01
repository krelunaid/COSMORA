/** Only use a server-recorded derivative next to its original; never follow paths
 * belonging to a different author, post or directory. Old rows have no preview. */
export function safeThumbnailPath(original: string, candidate: unknown): string | null {
  if (typeof candidate !== 'string' || !candidate || candidate === original) return null;
  const originalParts = original.split('/');
  const candidateParts = candidate.split('/');
  if (originalParts.length !== 3 || candidateParts.length !== 3) return null;
  if (originalParts.some(x => !x || x === '.' || x === '..') || candidateParts.some(x => !x || x === '.' || x === '..')) return null;
  if (originalParts[0] !== candidateParts[0] || originalParts[1] !== candidateParts[1]) return null;
  if (candidateParts[2] !== originalParts[2] + '.thumbnail.jpg') return null;
  return candidate;
}
