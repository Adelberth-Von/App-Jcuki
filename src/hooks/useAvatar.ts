import { useEffect, useState } from "react";
import { useAuth } from "../auth/provider";
import { avatarCache } from "../services/avatarCache";

export function useAvatar(
  uri: string | undefined,
  apiUrl: string,
  revision: number,
) {
  const { session } = useAuth(),
    scope = session?.user.id;
  const remote = !!uri && /^https?:/.test(uri);
  const resource = `${scope}:${uri}`;
  const key = `${resource}:${session?.access_token}:${revision}`;
  const [loaded, setLoaded] = useState<{ key: string; uri: string } | null>(
    null,
  );
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!remote || !uri || !scope) return;
    let live = true;
    void avatarCache
      .load(scope, uri, apiUrl)
      .then((value) => {
        if (live) setLoaded({ key: resource, uri: value });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uri, scope, remote, apiUrl, key, resource]);
  const source =
    failed === key
      ? undefined
      : remote
        ? loaded?.key === resource
          ? loaded.uri
          : undefined
        : uri;
  return { source, onError: () => setFailed(key) };
}
