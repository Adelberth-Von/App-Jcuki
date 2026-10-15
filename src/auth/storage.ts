/** SecureStore has small per-value limits on some OS versions. Commit chunks atomically. */
export function secureSessionStorage(store: {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}) {
  let queue = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const task = queue.catch(() => {}).then(work);
    queue = task.then(
      () => {},
      () => {},
    );
    return task;
  };
  const base = (key: string) =>
    "jcuki.auth." + key.replace(/[^a-zA-Z0-9._-]/g, "_");
  async function manifest(
    key: string,
  ): Promise<{ id: string; count: number } | null> {
    try {
      const raw = await store.getItemAsync(base(key));
      if (!raw) return null;
      const value = JSON.parse(raw);
      return typeof value.id === "string" &&
        /^[a-z0-9]+$/.test(value.id) &&
        Number.isInteger(value.count) &&
        value.count > 0 &&
        value.count <= 128
        ? value
        : null;
    } catch {
      return null;
    }
  }
  async function clear(
    key: string,
    record: { id: string; count: number } | null,
  ) {
    if (record)
      await Promise.all(
        Array.from({ length: record.count }, (_, i) =>
          store.deleteItemAsync(`${base(key)}.${record.id}.${i}`),
        ),
      );
  }
  return {
    getItem: (key: string) =>
      serial(async () => {
        const record = await manifest(key);
        if (!record) return null;
        const chunks = await Promise.all(
          Array.from({ length: record.count }, (_, i) =>
            store.getItemAsync(`${base(key)}.${record.id}.${i}`),
          ),
        );
        return chunks.every((value) => value !== null) ? chunks.join("") : null;
      }),
    setItem: (key: string, value: string) =>
      serial(async () => {
        const old = await manifest(key),
          id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        // Whole Unicode code points: at most 1600 UTF-8 bytes per chunk.
        const points = Array.from(value),
          chunks: string[] = [];
        for (let i = 0; i < points.length; i += 400)
          chunks.push(points.slice(i, i + 400).join(""));
        const count = chunks.length;
        if (count < 1 || count > 128) throw new Error("AUTH_STORAGE_LIMIT");
        const record = { id, count };
        try {
          for (let i = 0; i < count; i++)
            await store.setItemAsync(`${base(key)}.${id}.${i}`, chunks[i]);
          await store.setItemAsync(base(key), JSON.stringify(record));
        } catch (error) {
          await clear(key, record).catch(() => {});
          throw error;
        }
        await clear(key, old).catch(() => {});
      }),
    removeItem: (key: string) =>
      serial(async () => {
        const old = await manifest(key);
        await store.deleteItemAsync(base(key));
        await clear(key, old);
      }),
  };
}
