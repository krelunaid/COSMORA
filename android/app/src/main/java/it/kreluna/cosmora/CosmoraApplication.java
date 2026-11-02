package it.kreluna.cosmora;

import android.app.Application;

public class CosmoraApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        MetaAppEvents.start(this);
    }
}
