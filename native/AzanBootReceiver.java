package com.khalidnawzer.deendaily;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

// Android wipes every AlarmManager alarm on reboot. This receiver listens
// for BOOT_COMPLETED and re-arms whatever azan alarms were last scheduled
// (persisted by AzanAlarmPlugin.scheduleBatch), so prayer alarms survive a
// restart without needing the app to be opened first.
public class AzanBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (!action.equals(Intent.ACTION_BOOT_COMPLETED)
            && !action.equals("android.intent.action.QUICKBOOT_POWERON")) return;

        try {
            SharedPreferences prefs = context.getSharedPreferences(
                AzanAlarmPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String stored = prefs.getString(AzanAlarmPlugin.PREFS_KEY, "[]");
            JSONArray items = new JSONArray(stored);
            if (items.length() == 0) return;

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            long now = System.currentTimeMillis();

            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                long at = item.getLong("at");
                if (at <= now) continue; // don't fire a stale prayer time hours late

                int id = item.getInt("id");
                String title = item.optString("title", "Azan");

                Intent alarmIntent = new Intent(context, AzanAlarmReceiver.class);
                alarmIntent.putExtra("title", title);
                alarmIntent.putExtra("id", id);
                PendingIntent pi = PendingIntent.getBroadcast(
                    context, id, alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S
                    && !am.canScheduleExactAlarms()) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } else {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                }
            }
        } catch (Exception ignored) {
            // Best-effort restore — the app will also re-sync the full
            // schedule the next time it's opened regardless.
        }
    }
}
