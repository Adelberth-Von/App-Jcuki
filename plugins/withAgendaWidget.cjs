const { withAndroidManifest } = require("expo/config-plugins");

/** Register the local Expo module's widget receiver during Continuous Native Generation. */
module.exports = function withAgendaWidget(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application)
      throw new Error("JCuki widget requires an Android application manifest.");
    application.receiver ??= [];
    const receiverName = "expo.modules.jcukiwidget.JCukiAgendaProvider";
    const receiver = {
      $: {
        "android:name": receiverName,
        "android:exported": "false",
        "android:label": "JCuki",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/jcuki_agenda_info",
          },
        },
      ],
    };
    application.receiver = application.receiver.filter(
      (entry) => entry.$?.["android:name"] !== receiverName,
    );
    application.receiver.push(receiver);
    return mod;
  });
};
