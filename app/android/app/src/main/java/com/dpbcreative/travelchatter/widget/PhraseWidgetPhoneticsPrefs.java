package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app's "show phonetics" toggle (PhraseList.tsx's "phrasebook-show-phonetics" persisted
 * state), pushed from JS via WidgetRefreshPlugin#syncShowPhonetics whenever the user flips it, so
 * the widget shows the same phonetic-vs-native text as the app for languages with phonetics
 * enabled.
 */
final class PhraseWidgetPhoneticsPrefs {

    private static final String PREFS_NAME = "phrase_widget_phonetics_prefs";
    private static final String KEY_SHOW_PHONETICS = "show_phonetics";

    private PhraseWidgetPhoneticsPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static void set(Context context, boolean showPhonetics) {
        prefs(context).edit().putBoolean(KEY_SHOW_PHONETICS, showPhonetics).apply();
    }

    /** Nothing synced yet means the app hasn't pushed its toggle - default to native script, same as the app's own default. */
    static boolean get(Context context) {
        return prefs(context).getBoolean(KEY_SHOW_PHONETICS, false);
    }
}
