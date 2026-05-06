package com.safetywatch.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.app.AppPlugin;
import com.capacitorjs.plugins.browser.BrowserPlugin;
import com.capacitorjs.plugins.camera.CameraPlugin;
import com.capacitorjs.plugins.filesystem.FilesystemPlugin;
import com.capacitorjs.plugins.geolocation.GeolocationPlugin;
import com.capacitorjs.plugins.splashscreen.SplashScreenPlugin;
import com.capacitorjs.plugins.statusbar.StatusBarPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Manual registration as a fallback if auto-registration fails
        registerPlugin(AppPlugin.class);
        registerPlugin(BrowserPlugin.class);
        registerPlugin(CameraPlugin.class);
        registerPlugin(FilesystemPlugin.class);
        registerPlugin(GeolocationPlugin.class);
        registerPlugin(SplashScreenPlugin.class);
        registerPlugin(StatusBarPlugin.class);
    }
}
