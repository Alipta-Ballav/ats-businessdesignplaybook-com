/** Private to one mounted editor. Exact inputs only; regeneration bypasses reuse. */
export function createRewriteCache() {
  const results = new Map<string, string>();
  return async (input: { original: string; facts: string }, generate: () => Promise<string>, regenerate = false) => {
    const key = JSON.stringify([input.original, input.facts]);
    const hit = results.get(key);
    if (!regenerate && hit !== undefined) return hit;
    const text = await generate();
    if (results.size >= 30) results.delete(results.keys().next().value ?? "");
    results.set(key, text);
    return text;
  };
}