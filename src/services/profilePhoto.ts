import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

const PHOTO_STORAGE_KEY = "@jcuki/profile-photo/v1";
const photoKey = (scope: string) => scope === "device" ? PHOTO_STORAGE_KEY : PHOTO_STORAGE_KEY + "/" + scope;
const MAX_PHOTO_BASE64_LENGTH = 262144; // Backend decoded limit: 192 KiB.
const profileDirectory = () => new Directory(Paths.document, "jcuki-profile");
const profileDirectoryPrefix = () =>
  profileDirectory().uri.replace(/\/+$/, "") + "/";

export async function getProfilePhoto(scope = "device"): Promise<string | null> {
  const uri = await AsyncStorage.getItem(photoKey(scope));
  if (!uri || Platform.OS === "web") return uri;
  if (new File(uri).exists) return uri;
  await AsyncStorage.removeItem(photoKey(scope));
  return null;
}

/** Opens the system photo picker. Selecting one photo does not need broad gallery access. */
export async function pickProfilePhoto(
  options: { persist?: boolean; scope?: string } = {},
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
    base64: Platform.OS === "web",
    allowsMultipleSelection: false,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  const side = Math.min(asset.width, asset.height);
  context.crop({
    originX: Math.floor((asset.width - side) / 2),
    originY: Math.floor((asset.height - side) / 2),
    width: side,
    height: side,
  });
  context.resize({ width: 512, height: 512 });
  const rendered = await context.renderAsync();
  let photo = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
    base64: Platform.OS === "web",
  });
  const bytes =
    Platform.OS === "web"
      ? ((photo.base64?.length ?? 0) * 3) / 4
      : new File(photo.uri).size;
  if (bytes > 192 * 1024) {
    context.resize({ width: 384, height: 384 });
    const smaller = await context.renderAsync();
    photo = await smaller.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.62,
      base64: Platform.OS === "web",
    });
  }
  let uri = photo.uri;
  if (Platform.OS === "web") {
    // Blob URLs expire after refresh; a data URL keeps the browser preview usable.
    if (photo.base64) uri = `data:image/jpeg;base64,${photo.base64}`;
  } else {
    const directory = profileDirectory();
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, `avatar-${Date.now()}.jpg`);
    // ImagePicker files live in cache; copying prevents the avatar disappearing after cache cleanup.
    await new File(photo.uri).copy(destination);
    uri = destination.uri;
  }
  if (options.persist !== false) await commitProfilePhoto(uri, options.scope);
  return uri;
}

/** Commit after upload succeeds so a rejected upload leaves the earlier avatar intact. */
export async function commitProfilePhoto(uri: string, scope = "device"): Promise<void> {
  const previousUri = await AsyncStorage.getItem(photoKey(scope));
  await AsyncStorage.setItem(photoKey(scope), uri);
  if (
    previousUri &&
    previousUri !== uri &&
    Platform.OS !== "web" &&
    previousUri.startsWith(profileDirectoryPrefix())
  ) {
    try {
      const previous = new File(previousUri);
      if (previous.exists) previous.delete();
    } catch {
      /* stale avatar cleanup is best effort */
    }
  }
}

/** Delete an abandoned staged photo, while preserving any currently committed avatar. */
export async function discardProfilePhoto(uri: string, scope = "device"): Promise<void> {
  const currentUri = await AsyncStorage.getItem(photoKey(scope));
  if (
    uri === currentUri ||
    Platform.OS === "web" ||
    !uri.startsWith(profileDirectoryPrefix())
  )
    return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function removeProfilePhoto(scope = "device"): Promise<void> {
  const uri = await AsyncStorage.getItem(photoKey(scope));
  await AsyncStorage.removeItem(photoKey(scope));
  if (
    uri &&
    Platform.OS !== "web" &&
    uri.startsWith(profileDirectoryPrefix())
  ) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}

/** Only the selected, resized avatar is uploaded; no other gallery files are read. */
export async function getProfilePhotoUpload(
  uri: string,
): Promise<{ base64: string; mime: "image/jpeg" | "image/png" }> {
  if (Platform.OS === "web") {
    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(
      uri,
    );
    if (!match) throw new Error("PROFILE_PHOTO_INVALID");
    if (match[2].length > MAX_PHOTO_BASE64_LENGTH)
      throw new Error("PROFILE_PHOTO_TOO_LARGE");
    return { base64: match[2], mime: match[1] as "image/jpeg" | "image/png" };
  }
  if (!uri.startsWith(profileDirectoryPrefix()))
    throw new Error("PROFILE_PHOTO_INVALID");
  const file = new File(uri);
  if (!file.exists) throw new Error("PROFILE_PHOTO_MISSING");
  const base64 = await file.base64();
  if (base64.length > MAX_PHOTO_BASE64_LENGTH)
    throw new Error("PROFILE_PHOTO_TOO_LARGE");
  return { base64, mime: "image/jpeg" };
}
