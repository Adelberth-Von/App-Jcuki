import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_TOKEN_KEY = "jcuki.device-token.v1";
let pendingToken: Promise<string> | null = null;

/** Device identity matches the existing API's 64-character lowercase hex bearer contract. */
export function getOrCreateDeviceToken(): Promise<string> {
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const stored =
      Platform.OS === "web"
        ? await AsyncStorage.getItem(DEVICE_TOKEN_KEY)
        : await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
    if (stored && /^[a-f0-9]{64}$/.test(stored)) return stored;
    const bytes = await Crypto.getRandomBytesAsync(32);
    const token = Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    if (Platform.OS === "web")
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
    else
      await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    return token;
  })();
  pendingToken.catch(() => {
    pendingToken = null;
  });
  return pendingToken;
}

export async function getDeviceUserId(): Promise<string> {
  const token = await getOrCreateDeviceToken();
  // Keep the complete digest: the current mobile API keys profiles/membership by SHA-256 hex.
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    token,
  );
}

/** Call only as part of an explicit account reset; reinstallation also changes Android identity. */
export async function clearDeviceToken(): Promise<void> {
  if (Platform.OS === "web") await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
  else await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
  pendingToken = null;
}
