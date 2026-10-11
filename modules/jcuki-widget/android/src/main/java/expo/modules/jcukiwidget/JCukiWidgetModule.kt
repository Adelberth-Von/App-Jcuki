package expo.modules.jcukiwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class JCukiWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("JCukiWidget")

    AsyncFunction("updateAgenda") { payload: Map<String, Any?> ->
      val context = requireNotNull(appContext.reactContext) { "JCuki application context is unavailable" }
      val preferences = context.getSharedPreferences(JCukiAgendaProvider.PREFERENCES, 0)
      val editor = preferences.edit()
      for (key in listOf("title", "dateText", "timeText", "groupName", "emptyLabel")) {
        editor.putString(key, (payload[key] as? String)?.take(240) ?: "")
      }
      editor.putBoolean("dark", payload["dark"] as? Boolean ?: false)
      editor.apply()
      JCukiAgendaProvider.updateAll(context)
      true
    }

    AsyncFunction("requestPin") {
      val context = requireNotNull(appContext.reactContext) { "JCuki application context is unavailable" }
      val manager = AppWidgetManager.getInstance(context)
      if (manager.isRequestPinAppWidgetSupported) {
        manager.requestPinAppWidget(ComponentName(context, JCukiAgendaProvider::class.java), null, null)
      } else false
    }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
  }
}
