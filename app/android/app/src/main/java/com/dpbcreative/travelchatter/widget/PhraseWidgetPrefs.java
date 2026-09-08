package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.content.SharedPreferences;

/** Per-widget-instance state (which language and filter each home-screen widget is showing), keyed by appWidgetId so multiple widgets can each track their own selection independently. */
final class PhraseWidgetPrefs {

    private static final String PREFS_NAME = "phrase_widget_prefs";
    static final String FILTER_FAVORITES = "favorites";
    static final String FILTER_UNLEARNED = "unlearned";

    private PhraseWidgetPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static int getLanguageId(Context context, int appWidgetId, int fallback) {
        return prefs(context).getInt("lang_" + appWidgetId, fallback);
    }

    static void setLanguageId(Context context, int appWidgetId, int languageId) {
        prefs(context).edit().putInt("lang_" + appWidgetId, languageId).apply();
    }

    static String getFilter(Context context, int appWidgetId) {
        return prefs(context).getString("filter_" + appWidgetId, FILTER_FAVORITES);
    }

    static void setFilter(Context context, int appWidgetId, String filter) {
        prefs(context).edit().putString("filter_" + appWidgetId, filter).apply();
    }

    static void clear(Context context, int appWidgetId) {
        prefs(context).edit().remove("lang_" + appWidgetId).remove("filter_" + appWidgetId).apply();
    }
}
