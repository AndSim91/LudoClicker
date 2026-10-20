/**
 * Where each id was last found. Ids are unique (makeGameId plus the checks where
 * people are created) and an element keeps its place when an array is copied with
 * one change or something is appended, so the next copy usually has it in the same
 * spot: one check instead of a scan of thousands of contacts (20/10/2026). The
 * hint is always verified; when it misses, the plain scan runs as before.
 */
const lastIndexById = new Map<string, number>();
// ponytail: a hint map that only grows; cleared past this size instead of tracking removals.
const MAX_HINTS = 100_000;

export function indexById<T extends { id: string }>(items: readonly T[], id: string): number {
  const hint = lastIndexById.get(id);
  if (hint !== undefined && items[hint]?.id === id) return hint;
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].id === id) {
      if (lastIndexById.size >= MAX_HINTS) lastIndexById.clear();
      lastIndexById.set(id, index);
      return index;
    }
  }
  return -1;
}

/**
 * How an array was made from another one (20/10/2026): one element changed at
 * `changed`, or elements appended from `appendedFrom` on. Indexes that count or
 * look for something (runtimeIndexes) update their answer from the parent's instead
 * of scanning thousands of contacts again. Arrays and their elements are never
 * changed in place, so the parent's answer stays true.
 */
export interface Lineage {
  parent: readonly object[];
  changed?: number;
  appendedFrom?: number;
}

const lineages = new WeakMap<readonly object[], Lineage>();

export function getLineage(items: readonly object[]): Lineage | undefined {
  return lineages.get(items);
}

/** `items` followed by `more`, remembering where the new part starts. */
export function appendItems<T extends object>(items: readonly T[], more: readonly T[]): T[] {
  const result = items.concat(more);
  lineages.set(result, { parent: items, appendedFrom: items.length });
  return result;
}

/**
 * Copy of `items` with the element whose id matches replaced by `update(item)`.
 * One lookup and one copy, without a callback per element: these run once per
 * email on arrays of thousands of contacts. Unknown id: an unchanged copy.
 */
export function replaceById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  update: (item: T) => T,
): T[] {
  const copy = items.slice();
  const index = indexById(copy, id);
  if (index >= 0) copy[index] = update(copy[index]);
  lineages.set(copy, index >= 0 ? { parent: items, changed: index } : { parent: items });
  return copy;
}
