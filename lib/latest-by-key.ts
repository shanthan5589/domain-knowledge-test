/**
 * Given rows that are already sorted newest-first (e.g. by `completed_at`
 * descending), keep only the first row seen for each key — i.e. each key's
 * most recent row. Later rows for a key that's already been seen are ignored.
 */
export function latestByKey<T, K>(rows: T[], keyFn: (row: T) => K): Map<K, T> {
  const latest = new Map<K, T>()
  for (const row of rows) {
    const key = keyFn(row)
    if (!latest.has(key)) {
      latest.set(key, row)
    }
  }
  return latest
}
