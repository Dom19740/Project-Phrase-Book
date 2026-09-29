package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app's current sort mode (one of PhraseList.tsx's SortMode values), pushed from JS via
 * WidgetRefreshPlugin#syncSortMode whenever the user changes it, so the widget's phrase order
 * tracks the app's instead of always following the "custom" drag order (sort_order column).
 */
final class PhraseWidgetSortPrefs {

    private static final String PREFS_NAME = "phrase_widget_sort_prefs";
    private static final String KEY_SORT_MODE = "sort_mode";

    private PhraseWidgetSortPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static void set(Context context, String sortMode) {
        prefs(context).edit().putString(KEY_SORT_MODE, sortMode).apply();
    }

    /** One of PhraseList.tsx's SortMode values - null means nothing has been synced yet, so fall back to "custom". */
    static String get(Context context) {
        return prefs(context).getString(KEY_SORT_MODE, null);
    }
}
