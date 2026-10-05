/**
 * Copy of `items` with the element whose id matches replaced by `update(item)`.
 * One scan and one copy, without a callback per element: these run once per
 * email on arrays of thousands of contacts. Unknown id: an unchanged copy.
 */
export function replaceById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  update: (item: T) => T,
): T[] {
  const copy = items.slice();
  for (let index = 0; index < copy.length; index += 1) {
    if (copy[index].id === id) {
      copy[index] = update(copy[index]);
      break;
    }
  }
  return copy;
}
