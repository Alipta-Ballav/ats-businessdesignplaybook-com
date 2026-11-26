/** Number the already-filtered display order, never positions in the source queue. */
export function numberSteps<T>(items: readonly T[]) {
  return items.map((item, index) => ({ item, step: index + 1 }));
}