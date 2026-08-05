package com.khalidnawzer.deendaily;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class AzanAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        int id = intent.getIntExtra("id", 0);

        Intent fullScreenIntent = new Intent(context, AzanRingActivity.class);
        fullScreenIntent.putExtra("title", title);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context, id, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String channelId = "azan-alarm-channel";
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = new NotificationChannel(
                channelId, "Azan Alarm", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Prayer time alarm");
            nm.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title != null ? title : "Azan")
            .setContentText("Tap to open")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setAutoCancel(true);

        if (nm != null) nm.notify(id, builder.build());

        // Also try a direct launch — works while the app process is still
        // alive in the background on most OEMs, in addition to the
        // full-screen-intent path above (which covers locked/killed state).
        try {
            context.startActivity(fullScreenIntent);
        } catch (Exception ignored) { }
    }
}
