import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { accountAccessToken } from "../auth/client";
import { createPrivateAvatarLoader, imageDataURL } from "../lib/privateAvatar";

const digest = (url: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url);
function directory(scope: string) {
  if (!/^[a-f0-9-]{36}$/.test(scope)) throw new Error("AUTH_REQUIRED");
  return new Directory(Paths.document, "jcuki-avatar-cache", scope);
}
export const avatarCache = createPrivateAvatarLoader({
  async getToken(scope, refresh) {
    return accountAccessToken(refresh, scope);
  },
  async read(scope, url) {
    const key = await digest(url);
    if (Platform.OS === "web")
      return AsyncStorage.getItem(`@jcuki/avatar/${scope}/${key}`);
    const file = new File(directory(scope), key + ".image");
    return file.exists && file.size > 0 ? file.uri : null;
  },
  async write(scope, url, bytes, mime) {
    const key = await digest(url);
    if (Platform.OS === "web") {
      const value = imageDataURL(bytes, mime);
      await AsyncStorage.setItem(`@jcuki/avatar/${scope}/${key}`, value);
      return value;
    }
    const dir = directory(scope);
    dir.create({ intermediates: true, idempotent: true });
    const staged = new File(dir, key + ".pending");
    staged.create({ overwrite: true });
    staged.write(bytes);
    const target = new File(dir, key + ".image");
    await staged.move(target, { overwrite: true });
    try {
      const files = dir
        .list()
        .filter(
          (file): file is File =>
            file instanceof File && file.uri.endsWith(".image"),
        );
      files.sort(
        (a, b) => (b.modificationTime || 0) - (a.modificationTime || 0),
      );
      for (const old of files.slice(48))
        if (old.uri !== target.uri) old.delete();
    } catch {
      /* Cache cleanup must not interrupt a loaded photo. */
    }
    return target.uri;
  },
});
