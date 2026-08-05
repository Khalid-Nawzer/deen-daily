package com.khalidnawzer.deendaily;

import android.app.KeyguardManager;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

// Plays the azan on AudioAttributes.USAGE_ALARM, which is the audio stream
// Android exempts from ringer/silent mode (the same mechanism real alarm
// clock apps use) — a notification "sound" field can never do this, only
// an app explicitly playing on this stream can.
public class AzanRingActivity extends AppCompatActivity {
    private MediaPlayer player;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String title = getIntent().getStringExtra("title");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        int pad = (int) (32 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView tv = new TextView(this);
        tv.setText(title != null ? title : "Azan");
        tv.setTextSize(26);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(0, 0, 0, pad);
        root.addView(tv);

        Button stopBtn = new Button(this);
        stopBtn.setText("Stop");
        stopBtn.setOnClickListener(v -> { stopSound(); finish(); });
        root.addView(stopBtn);

        setContentView(root);

        playAlarmSound();
        vibrate();
    }

    private void playAlarmSound() {
        try {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.azan);
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception ignored) { }
    }

    private void vibrate() {
        try {
            vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            long[] pattern = {0, 400, 300, 400};
            if (vibrator != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            }
        } catch (Exception ignored) { }
    }

    private void stopSound() {
        if (player != null) {
            try { player.stop(); player.release(); } catch (Exception ignored) { }
            player = null;
        }
        if (vibrator != null) {
            try { vibrator.cancel(); } catch (Exception ignored) { }
        }
    }

    @Override
    protected void onDestroy() {
        stopSound();
        super.onDestroy();
    }
}
