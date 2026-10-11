package expo.modules.jcukiwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class JCukiAgendaProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, buildViews(context))
  }

  companion object {
    const val PREFERENCES = "jcuki_agenda_widget"

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, JCukiAgendaProvider::class.java))
      for (id in ids) manager.updateAppWidget(id, buildViews(context))
    }

    private fun buildViews(context: Context): RemoteViews {
      val prefs = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
      val dark = prefs.getBoolean("dark", false)
      val title = prefs.getString("title", "").orEmpty()
      val hasPlan = title.isNotBlank()
      val empty = prefs.getString("emptyLabel", context.getString(R.string.jcuki_widget_empty)).orEmpty()
      val dateText = prefs.getString("dateText", "").orEmpty()
      val timeText = prefs.getString("timeText", "").orEmpty()
      val groupName = prefs.getString("groupName", "").orEmpty()
      val textColor = Color.parseColor(if (dark) "#F1F6F0" else "#182C25")
      val mutedColor = Color.parseColor(if (dark) "#ADBCB2" else "#617068")
      val accentColor = Color.parseColor(if (dark) "#8FDAB5" else "#185F50")
      val views = RemoteViews(context.packageName, R.layout.jcuki_agenda_widget)
      views.setInt(R.id.jcuki_widget_root, "setBackgroundResource", if (dark) R.drawable.jcuki_widget_dark else R.drawable.jcuki_widget_light)
      views.setTextViewText(R.id.jcuki_widget_brand, "JCuki")
      views.setTextColor(R.id.jcuki_widget_brand, accentColor)
      views.setTextViewText(R.id.jcuki_widget_title, if (hasPlan) title else empty)
      views.setTextColor(R.id.jcuki_widget_title, textColor)
      views.setTextViewText(R.id.jcuki_widget_date, dateText)
      views.setTextViewText(R.id.jcuki_widget_time, timeText)
      views.setTextViewText(R.id.jcuki_widget_group, groupName)
      for (id in listOf(R.id.jcuki_widget_date, R.id.jcuki_widget_time, R.id.jcuki_widget_group)) {
        views.setTextColor(id, mutedColor)
        views.setViewVisibility(id, if (hasPlan) View.VISIBLE else View.GONE)
      }
      views.setContentDescription(R.id.jcuki_widget_root, listOf("JCuki", if (hasPlan) title else empty, dateText, timeText, groupName).filter { it.isNotBlank() }.joinToString(", "))
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launchIntent ->
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        val pending = PendingIntent.getActivity(context, 3201, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.jcuki_widget_root, pending)
      }
      return views
    }
  }
}
