# Building JCuki for Android and iPhone

## GitHub Actions Android preview

Every push to `main` runs TypeScript checking, lint, and behavior tests, then generates the native Android project and builds `:app:assembleRelease`. It uploads only `JCuki-Android13-preview.apk` under the run's **Artifacts** section. The APK has minimum SDK 33 (Android 13), embeds the JavaScript bundle, and can run without Metro or Expo Go.

The automated APK is an **internal preview**. Expo SDK 57's generated release build uses its template debug signing key unless production signing is configured. CI verifies that configuration so a future template change cannot silently alter it. This key is intentionally unsuitable for Google Play production distribution. To publish, use your private production keystore or the EAS `production` profile with managed credentials.

The job uses Ubuntu 24.04, Node 24, Java 17, Android SDK/build tools 36, the React Native 0.86 default NDK 27.1.12297006, and CMake 3.22.1. Configure repository variable `EXPO_PUBLIC_API_URL` with a deployed HTTPS JCuki backend if you want to embed a default endpoint; it is public application configuration. Users can also connect to the backend from the app. An APK built without an endpoint still supports the explicitly labelled local demonstration.

The workflow creates native projects from Expo configuration; generated `android/` and `ios/` projects are not maintained by hand. It uploads no keys, credentials, source maps, release publication, or backend deployment.

## Optional iOS compile check

In **Actions → JCuki mobile build → Run workflow**, enable `build_ios`. That job uses the official `macos-26` ARM runner and selects `/Applications/Xcode_26.4.1.app/Contents/Developer`, meeting SDK 57's Xcode 26.4+ requirement. It generates the iOS project and WidgetKit extension, installs CocoaPods, and compiles the app for a generic iOS Simulator with signing disabled.

This is a compilation check, not an IPA or device test. The job is disabled on normal pushes. If GitHub removes that Xcode installation, the version check fails explicitly; update the runner/Xcode path together after checking the official runner inventory. Installing on a physical iPhone requires Apple device signing and provisioning, including the app group's widget extension. JCuki targets iOS 16.4 or later.

## EAS builds

An Expo account is required for EAS Build. First authenticate and link the application to your Expo account:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Then use the included profiles:

```sh
# Installable standalone Android APK with managed signing credentials
npx eas-cli@latest build --platform android --profile preview

# iOS Simulator build; no physical-device provisioning
npx eas-cli@latest build --platform ios --profile simulator

# Internal physical-iPhone build; requires Apple Developer credentials/device registration
npx eas-cli@latest build --platform ios --profile preview

# Android AAB or signed iOS production archive, ready for a separate submission step
npx eas-cli@latest build --platform all --profile production
```

EAS creates the project ID and manages signing through the authenticated account. Never put an Expo token, Apple credentials, or private keystore into the repository. These commands create builds; they do not submit anything to an app store.

## Native feature checks before release

An installed native build is needed to test custom notification audio, system gallery selection, Android uninstall confirmation, and home-screen widgets. Check notification permission on Android 13+, iOS notification settings, weekly scheduling across Berlin daylight-saving changes, profile persistence after restart, Indonesian/English formatting, text scaling, VoiceOver/TalkBack, and widget snapshots. The web preview validates shared UI only.

## Official references

- [Expo SDK 57 platform requirements](https://docs.expo.dev/versions/v57.0.0/)
- [Expo APK build profiles](https://docs.expo.dev/build-reference/apk/)
- [Expo local production builds](https://docs.expo.dev/guides/local-app-production/)
- [GitHub macOS 26 ARM runner inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)
- [GitHub Ubuntu 24.04 runner inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
