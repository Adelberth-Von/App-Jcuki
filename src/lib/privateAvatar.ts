/** Fetch private images ourselves: RN Web/Image cannot reliably attach refreshed auth headers. */
export function avatarURL(value: string, apiBase: string) {
  try {
    const url = new URL(value),
      base = new URL(apiBase);
    return url.origin === base.origin &&
      url.pathname.startsWith(
        base.pathname.replace(/\/$/, "") + "/api/avatars/",
      ) &&
      /^[a-f0-9]{64}$/.test(url.pathname.split("/").at(-1) || "") &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function imageDataURL(bytes: Uint8Array, mime: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2];
    result +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b || 0) >> 4)] +
      (i + 1 < bytes.length
        ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)]
        : "=") +
      (i + 2 < bytes.length ? alphabet[c & 63] : "=");
  }
  return `data:${mime};base64,${result}`;
}
export function createPrivateAvatarLoader({
  read,
  write,
  getToken,
  fetcher = fetch,
}: {
  read: (scope: string, url: string) => Promise<string | null>;
  write: (
    scope: string,
    url: string,
    bytes: Uint8Array,
    mime: string,
  ) => Promise<string>;
  getToken: (scope: string, refresh: boolean) => Promise<string>;
  fetcher?: typeof fetch;
}) {
  const pending = new Map<string, Promise<string>>(),
    memory = new Map<string, string>();
  return {
    load(scope: string, uri: string, apiBase: string): Promise<string> {
      const url = avatarURL(uri, apiBase);
      if (!url) return Promise.reject(new Error("AVATAR_URL_INVALID"));
      const key = scope + ":" + url;
      if (memory.has(key)) return Promise.resolve(memory.get(key)!);
      if (pending.has(key)) return pending.get(key)!;
      const task = (async () => {
        const cached = await read(scope, url).catch(() => null);
        if (cached) return cached;
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 15000);
        try {
          const request = async (refresh: boolean) =>
            fetcher(url, {
              headers: {
                Authorization: "Bearer " + (await getToken(scope, refresh)),
              },
              signal: controller.signal,
            });
          let response = await request(false);
          if (response.status === 401) response = await request(true);
          if (!response.ok) throw new Error("AVATAR_LOAD_FAILED");
          const bytes = new Uint8Array(await response.arrayBuffer());
          const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
          const png =
            bytes[0] === 137 &&
            bytes[1] === 80 &&
            bytes[2] === 78 &&
            bytes[3] === 71;
          if ((!jpeg && !png) || bytes.length > 196608)
            throw new Error("AVATAR_IMAGE_INVALID");
          const mime = jpeg ? "image/jpeg" : "image/png";
          return await write(scope, url, bytes, mime).catch(() =>
            imageDataURL(bytes, mime),
          );
        } finally {
          clearTimeout(timer);
        }
      })();
      pending.set(key, task);
      void task
        .then((value) => {
          if (memory.size >= 64) memory.delete(memory.keys().next().value!);
          memory.set(key, value);
        })
        .catch(() => {})
        .finally(() => pending.delete(key));
      return task;
    },
    clearMemory() {
      memory.clear();
    },
  };
}
