package it.kreluna.cosmora;

import android.app.Application;
import android.util.Log;

import com.facebook.FacebookSdk;

/**
 * Starts Meta App Events for install attribution.
 *
 * <p>The manifest enables automatic logging ({@code fb_mobile_activate_app} and the install
 * event). {@code FacebookInitProvider} calls {@code sdkInitialize} when the client token resource
 * is present. This class sets the COSMORA app id explicitly and initializes again if the provider
 * did not, which happens when the token is still empty. {@code setAutoLogAppEventsEnabled(true)}
 * is not called after a successful init because that starts lifecycle tracking a second time.
 */
public final class MetaAppEvents {
    public static final String APP_ID = "1609311830149459";
    private static final String TAG = "MetaAppEvents";

    private MetaAppEvents() {}

    public static void start(Application application) {
        String token = application.getString(R.string.facebook_client_token);
        if (!isConfigured(token)) {
            Log.i(TAG, "Meta App Events skipped: client token is not configured.");
            return;
        }
        try {
            FacebookSdk.setApplicationId(APP_ID);
            FacebookSdk.setClientToken(token.trim());
            FacebookSdk.setAdvertiserIDCollectionEnabled(true);
            initialize(application);
            FacebookSdk.fullyInitialize();
            Log.i(TAG, "Meta App Events started for app " + APP_ID);
        } catch (RuntimeException error) {
            Log.e(TAG, "Meta App Events failed to start", error);
        }
    }

    @SuppressWarnings("deprecation")
    private static void initialize(Application application) {
        FacebookSdk.sdkInitialize(application);
    }

    static boolean isConfigured(String token) {
        if (token == null) {
            return false;
        }
        String value = token.trim();
        if (value.length() < 16
                || value.startsWith("REPLACE")
                || value.startsWith("YOUR_")
                || value.startsWith("$(")) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean ok = (c >= 'A' && c <= 'Z')
                    || (c >= 'a' && c <= 'z')
                    || (c >= '0' && c <= '9')
                    || c == '_'
                    || c == '-';
            if (!ok) {
                return false;
            }
        }
        return true;
    }
}
