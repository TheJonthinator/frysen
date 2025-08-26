package com.frysen.aodbubble;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import androidx.core.app.NotificationCompat;

public class AodBubbleService extends Service {
    private static final String CHANNEL_ID = "AodBubbleChannel";
    private static final int NOTIFICATION_ID = 1;
    
    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams params;
    private boolean isBubbleVisible = false;
    
    private int initialX, initialY;
    private float initialTouchX, initialTouchY;
    private boolean isDragging = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "SHOW_BUBBLE".equals(intent.getAction())) {
            showBubble();
        }
        
        // Start foreground service with correct type for Android API 34+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, createNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, createNotification());
        }
        
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public void showBubble() {
        if (isBubbleVisible) return;
        
        // Create bubble view
        bubbleView = LayoutInflater.from(this).inflate(R.layout.aod_bubble, null);
        
        // Set up window parameters
        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        
        // Position at bottom right
        params.gravity = Gravity.BOTTOM | Gravity.END;
        params.x = 50;
        params.y = 100;
        
        // Set up touch listener for dragging
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isDragging = false;
                        return true;
                        
                    case MotionEvent.ACTION_MOVE:
                        float deltaX = event.getRawX() - initialTouchX;
                        float deltaY = event.getRawY() - initialTouchY;
                        
                        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                            isDragging = true;
                            params.x = initialX + (int) deltaX;
                            params.y = initialY + (int) deltaY;
                            
                            // Keep bubble within screen bounds
                            int maxX = windowManager.getDefaultDisplay().getWidth() - bubbleView.getWidth();
                            int maxY = windowManager.getDefaultDisplay().getHeight() - bubbleView.getHeight();
                            
                            params.x = Math.max(0, Math.min(params.x, maxX));
                            params.y = Math.max(0, Math.min(params.y, maxY));
                            
                            windowManager.updateViewLayout(bubbleView, params);
                        }
                        return true;
                        
                    case MotionEvent.ACTION_UP:
                        if (!isDragging) {
                            // Single tap - open the app
                            openFrysenApp();
                        }
                        return true;
                }
                return false;
            }
        });
        
        // Add bubble to window
        windowManager.addView(bubbleView, params);
        isBubbleVisible = true;
    }

    public void hideBubble() {
        if (!isBubbleVisible || bubbleView == null) return;
        
        windowManager.removeView(bubbleView);
        bubbleView = null;
        isBubbleVisible = false;
    }

    public void setBubblePosition(int x, int y) {
        if (params != null) {
            params.x = x;
            params.y = y;
            if (bubbleView != null) {
                windowManager.updateViewLayout(bubbleView, params);
            }
        }
    }

    public int[] getBubblePosition() {
        if (params != null) {
            return new int[]{params.x, params.y};
        }
        return new int[]{0, 0};
    }

    private void openFrysenApp() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "AOD Bubble Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the AOD bubble visible");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Frysen AOD Bubble")
            .setContentText("Tap the bubble to open Frysen")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        hideBubble();
    }
} 