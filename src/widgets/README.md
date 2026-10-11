# Native agenda widgets

Android uses the local Expo module in `modules/jcuki-widget` and registers its standard AppWidgetProvider through `plugins/withAgendaWidget.cjs`. Expo Autolinking discovers the module without a dependency entry. Add the config plugin to `expo.plugins`, then run a new native build. The widget shows a persisted snapshot and opens JCuki when tapped. `requestAgendaWidget()` asks the Android launcher to pin it; launchers that do not support pinning require the widget picker.

iOS uses SDK 57 `expo-widgets` plus `@expo/ui`. Add `expo-widgets` to config plugins with widget name `JCukiAgenda` and `ios.supportedFamilies: ["systemSmall", "systemMedium"]`, and set an app bundle identifier. Its config plugin creates the WidgetKit extension and shared app group. Home-screen widgets are added through Apple's widget gallery. A new iOS build with app-group provisioning is required.

Call `syncAgendaWidget({ title, dateText, timeText, groupName, emptyLabel, dark })` after persisted plans, language, or time-zone preferences change. Send `title: ''` when there is no upcoming plan. Values must already be formatted in the user's chosen time zone/language. Data remains local to the device. Android follows the application's dark preference; iOS follows the home-screen widget's system appearance.

These are snapshot widgets, refreshed when JCuki updates the snapshot; they do not claim continuous background synchronization. Native widgets cannot be validated in a browser or Expo Go. Verify an installed Android build (add, update, tap, restart, light/dark, Indonesian), and an iOS device/simulator build (small/medium, snapshot update, VoiceOver, app-group provisioning) before release.

Official references: [Expo Widgets SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/), [Expo SwiftUI modifiers SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/modifiers/), [Local Expo modules](https://docs.expo.dev/modules/get-started/), [Android widget pinning](https://developer.android.com/develop/ui/views/appwidgets/discoverability).
