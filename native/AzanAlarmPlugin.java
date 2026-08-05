package com.khalidnawzer.deendaily;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;
import org.json.JSONObject;

// Bridges JS -> Android AlarmManager. Unlike @capacitor/local-notifications,
// alarms scheduled here fire through AzanAlarmReceiver, which plays the azan
// on the ALARM audio stream (same stream real alarm-clock apps use) so it
// rings even when the phone is on silent/vibrate.
@CapacitorPlugin(name = "AzanAlarm")
public class AzanAlarmPlugin extends Plugin {

    @PluginMethod
    public void scheduleBatch(PluginCall call) {
        JSArray items = call.getArray("items");
        if (items == null) { call.resolve(); return; }
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        try {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                int id = item.getInt("id");
                long at = item.getLong("at");
                String title = item.optString("title", "Azan");

                Intent intent = new Intent(getContext(), AzanAlarmReceiver.class);
                intent.putExtra("title", title);
                intent.putExtra("id", id);
                PendingIntent pi = PendingIntent.getBroadcast(
                    getContext(), id, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } else {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                }
            }
            call.resolve();
        } catch (JSONException e) {
            call.reject("bad items payload", e);
        }
    }

    @PluginMethod
    public void cancelBatch(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null) { call.resolve(); return; }
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        try {
            for (int i = 0; i < ids.length(); i++) {
                int id = ids.getInt(i);
                Intent intent = new Intent(getContext(), AzanAlarmReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(
                    getContext(), id, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.cancel(pi);
            }
        } catch (JSONException ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("value", ignoring);
        call.resolve(ret);
    }

    // Shows the system's own "allow this app to run in background / ignore
    // battery optimization" dialog — standard Android API, works on every
    // device, no manufacturer-specific hacks needed.
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            String pkg = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            Intent intent;
            if (pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + pkg));
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + pkg));
            }
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("could not open battery settings", e);
        }
    }

    // OEM "auto-start manager" screens have no standard Android API — every
    // manufacturer built their own. These component names are the commonly
    // known ones; if a device/ROM version doesn't match, we fall back to the
    // plain app-info settings page so the user still lands somewhere useful.
    @PluginMethod
    public void openAutoStartSettings(PluginCall call) {
        String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        Intent intent = new Intent();
        try {
            switch (manufacturer) {
                case "xiaomi":
                    intent.setComponent(new ComponentName("com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                    break;
                case "oppo":
                    intent.setComponent(new ComponentName("com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
                    break;
                case "vivo":
                    intent.setComponent(new ComponentName("com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"));
                    break;
                case "huawei":
                    intent.setComponent(new ComponentName("com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"));
                    break;
                case "honor":
                    intent.setComponent(new ComponentName("com.hihonor.systemmanager",
                        "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"));
                    break;
                case "letv":
                    intent.setComponent(new ComponentName("com.letv.android.letvsafe",
                        "com.letv.android.letvsafe.AutobootManageActivity"));
                    break;
                default:
                    intent = null;
            }
            if (intent != null) {
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } else {
                openAppInfoFallback();
            }
        } catch (Exception e) {
            try { openAppInfoFallback(); } catch (Exception ignored) { }
        }
        call.resolve();
    }

    private void openAppInfoFallback() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
