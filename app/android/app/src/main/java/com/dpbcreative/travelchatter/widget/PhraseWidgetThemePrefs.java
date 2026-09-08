package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app's current in-app theme override and accent choice, pushed from JS (App.tsx) via
 * WidgetRefreshPlugin#syncTheme whenever they change, so the widget's colors track the app's
 * instead of only the OS's light/dark setting and a hardcoded pink.
 */
final class PhraseWidgetThemePrefs {

    private static final String PREFS_NAME = "phrase_widget_theme_prefs";
    private static final String KEY_THEME = "theme";
    private static final String KEY_ACCENT = "accent";

    private PhraseWidgetThemePrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static void set(Context context, String theme, String accentHex) {
        prefs(context).edit().putString(KEY_THEME, theme).putString(KEY_ACCENT, accentHex).apply();
    }

    /** "dark" or "light" — null means nothing has been synced yet, so fall back to the system setting. */
    static String getTheme(Context context) {
        return prefs(context).getString(KEY_THEME, null);
    }

    /** One of App.tsx's ACCENT_COLORS hex strings, pre light-mode-swap — null means fall back to the default pink. */
    static String getAccent(Context context) {
        return prefs(context).getString(KEY_ACCENT, null);
    }
}
