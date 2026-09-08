package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import com.dpbcreative.travelchatter.R;

/**
 * Resolves the widget's colors to match the app's own in-app theme/accent settings — synced from
 * JS into PhraseWidgetThemePrefs (see App.tsx's syncWidgetTheme effect) — falling back to the
 * system light/dark setting and the app's default pink accent before the app has ever synced.
 *
 * App.tsx only ever offers three accent swatches (App.tsx#ACCENT_COLORS), and swaps the lemon one
 * for a darker olive in light theme (App.tsx#LIGHT_MODE_ACCENT_OVERRIDES) — small enough a set that
 * every reachable (theme, accent) combination gets its own pre-baked drawable rather than trying to
 * tint an arbitrary color into a two-tone shape (fill + differently-colored stroke) at runtime.
 */
final class PhraseWidgetTheme {

    private static final int DEFAULT_ACCENT = Color.parseColor("#EC1D8B");
    private static final String TEAL_HEX = "#71E3CA";
    private static final String LEMON_HEX = "#C6FF3D";
    private static final int OLIVE = Color.parseColor("#3D8B40");

    final boolean dark;
    final int surface;
    final int surfaceHover;
    final int hairline;
    final int ink;
    final int muted;
    final int accent;
    final int onAccent;
    final int backgroundRes;
    final int itemBackgroundRes;
    final int languageChipRes;
    final int pillRes;

    private PhraseWidgetTheme(boolean dark, int accent, int backgroundRes, int itemBackgroundRes, int languageChipRes, int pillRes) {
        this.dark = dark;
        this.accent = accent;
        this.onAccent = readableTextOn(accent);
        this.backgroundRes = backgroundRes;
        this.itemBackgroundRes = itemBackgroundRes;
        this.languageChipRes = languageChipRes;
        this.pillRes = pillRes;
        if (dark) {
            surface = Color.parseColor("#1E1E1E");
            surfaceHover = Color.parseColor("#292929");
            hairline = Color.parseColor("#333333");
            ink = Color.parseColor("#D1D5DB");
            muted = Color.parseColor("#9CA3AF");
        } else {
            surface = Color.parseColor("#FFFFFF");
            surfaceHover = Color.parseColor("#ECECEF");
            hairline = Color.parseColor("#E0E0E3");
            ink = Color.parseColor("#18181B");
            muted = Color.parseColor("#6B7280");
        }
    }

    static PhraseWidgetTheme resolve(Context context) {
        boolean dark = resolveDark(context);
        String rawAccentHex = PhraseWidgetThemePrefs.getAccent(context);

        int accent;
        int chipRes;
        int pillRes;
        if (TEAL_HEX.equalsIgnoreCase(rawAccentHex)) {
            accent = Color.parseColor(TEAL_HEX);
            chipRes = dark ? R.drawable.widget_language_chip_dark_teal : R.drawable.widget_language_chip_light_teal;
            pillRes = R.drawable.widget_pill_teal;
        } else if (LEMON_HEX.equalsIgnoreCase(rawAccentHex)) {
            accent = dark ? Color.parseColor(LEMON_HEX) : OLIVE;
            chipRes = dark ? R.drawable.widget_language_chip_dark_lemon : R.drawable.widget_language_chip_light_olive;
            pillRes = dark ? R.drawable.widget_pill_lemon : R.drawable.widget_pill_olive;
        } else {
            accent = DEFAULT_ACCENT;
            chipRes = dark ? R.drawable.widget_language_chip_dark_pink : R.drawable.widget_language_chip_light_pink;
            pillRes = R.drawable.widget_pill_pink;
        }

        int backgroundRes = dark ? R.drawable.widget_background_dark : R.drawable.widget_background_light;
        int itemBackgroundRes = dark ? R.drawable.widget_item_background_dark : R.drawable.widget_item_background_light;

        return new PhraseWidgetTheme(dark, accent, backgroundRes, itemBackgroundRes, chipRes, pillRes);
    }

    private static boolean resolveDark(Context context) {
        String override = PhraseWidgetThemePrefs.getTheme(context);
        if ("dark".equals(override)) return true;
        if ("light".equals(override)) return false;
        int nightMode = context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }

    /** Java port of App.tsx#readableTextOn — keep in sync. */
    private static int readableTextOn(int color) {
        double yiq = (Color.red(color) * 299 + Color.green(color) * 587 + Color.blue(color) * 114) / 1000.0;
        return yiq >= 128 ? Color.BLACK : Color.WHITE;
    }
}
