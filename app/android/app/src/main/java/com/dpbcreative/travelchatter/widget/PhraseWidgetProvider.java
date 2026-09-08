package com.dpbcreative.travelchatter.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import com.dpbcreative.travelchatter.MainActivity;
import com.dpbcreative.travelchatter.R;
import java.util.List;

/**
 * Home-screen widget: shows one language's favorite or not-learnt phrases, with buttons on the
 * widget itself to cycle the language, flip the favorites/not-learnt filter, and speak a phrase
 * aloud — no need to open the app. State for each placed widget (which language, which filter)
 * lives in PhraseWidgetPrefs, keyed by appWidgetId so multiple widgets can each show something
 * different.
 */
public class PhraseWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_CYCLE_LANGUAGE = "com.dpbcreative.travelchatter.widget.CYCLE_LANGUAGE";
    private static final String ACTION_TOGGLE_FILTER = "com.dpbcreative.travelchatter.widget.TOGGLE_FILTER";
    static final String ACTION_SPEAK_PHRASE = "com.dpbcreative.travelchatter.widget.SPEAK_PHRASE";
    static final String EXTRA_TRANSLATION_ID = "translation_id";
    static final String EXTRA_TEXT = "text";
    static final String EXTRA_LANGUAGE_CODE = "language_code";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            PhraseWidgetPrefs.clear(context, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        if (ACTION_SPEAK_PHRASE.equals(action)) {
            long translationId = intent.getLongExtra(EXTRA_TRANSLATION_ID, -1);
            String text = intent.getStringExtra(EXTRA_TEXT);
            String languageCode = intent.getStringExtra(EXTRA_LANGUAGE_CODE);
            if (translationId != -1 && text != null) {
                PhraseWidgetTts.get(context).speak(translationId, text, languageCode, appWidgetId);
            }
            return;
        }

        if (!ACTION_CYCLE_LANGUAGE.equals(action) && !ACTION_TOGGLE_FILTER.equals(action)) return;

        if (ACTION_CYCLE_LANGUAGE.equals(action)) {
            cycleLanguage(context, appWidgetId);
        } else {
            PhraseWidgetPrefs.toggleFilter(context, appWidgetId);
        }
        updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId);
    }

    private static void cycleLanguage(Context context, int appWidgetId) {
        List<PhraseWidgetDb.LanguageRow> languages = PhraseWidgetDb.getLanguages(context);
        if (languages.isEmpty()) return;

        int currentId = PhraseWidgetPrefs.getLanguageId(context, appWidgetId, languages.get(0).id);
        int currentIndex = 0;
        for (int i = 0; i < languages.size(); i++) {
            if (languages.get(i).id == currentId) {
                currentIndex = i;
                break;
            }
        }
        int nextIndex = (currentIndex + 1) % languages.size();
        PhraseWidgetPrefs.setLanguageId(context, appWidgetId, languages.get(nextIndex).id);
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_phrase_review);
        PhraseWidgetTheme theme = PhraseWidgetTheme.resolve(context);
        applyTheme(views, theme);

        List<PhraseWidgetDb.LanguageRow> languages = PhraseWidgetDb.getLanguages(context);

        if (languages.isEmpty()) {
            views.setTextViewText(R.id.language_chip, context.getString(R.string.widget_no_language));
            views.setViewVisibility(R.id.filter_pill, View.GONE);
            views.setOnClickPendingIntent(R.id.language_chip, null);
        } else {
            views.setViewVisibility(R.id.filter_pill, View.VISIBLE);

            PhraseWidgetDb.LanguageRow activeLanguage = resolveActiveLanguage(context, appWidgetId, languages);
            views.setTextViewText(R.id.language_chip, PhraseWidgetFlags.getLanguageFlag(activeLanguage.code));
            views.setOnClickPendingIntent(R.id.language_chip, cycleLanguagePendingIntent(context, appWidgetId));

            String filter = PhraseWidgetPrefs.getFilter(context, appWidgetId);
            boolean favoritesActive = PhraseWidgetPrefs.FILTER_FAVORITES.equals(filter);
            views.setTextViewText(R.id.filter_pill, context.getString(favoritesActive ? R.string.widget_filter_favorites : R.string.widget_filter_unlearned));
            views.setOnClickPendingIntent(R.id.filter_pill, togglePendingIntent(context, appWidgetId));

            Intent listIntent = new Intent(context, PhraseWidgetService.class);
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            // Distinct data URIs per widget so the widget host doesn't reuse one factory/cache for every
            // instance — but it's still constant across language switches for a given widget, which is
            // why PhraseRemoteViewsFactory re-resolves the language itself in onDataSetChanged rather
            // than trusting an extra on this intent (the system won't redeliver it on reuse).
            listIntent.setData(Uri.parse("phrasewidget://widget/" + appWidgetId));
            views.setRemoteAdapter(R.id.phrase_list_view, listIntent);
            views.setEmptyView(R.id.phrase_list_view, R.id.empty_view);
            views.setPendingIntentTemplate(R.id.phrase_list_view, speakPendingIntentTemplate(context, appWidgetId));
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.open_app_button, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.phrase_list_view);
    }

    private static void applyTheme(RemoteViews views, PhraseWidgetTheme theme) {
        views.setInt(R.id.widget_root, "setBackgroundResource", theme.backgroundRes);
        views.setInt(R.id.language_chip, "setBackgroundResource", theme.languageChipRes);
        views.setInt(R.id.filter_pill, "setBackgroundResource", theme.pillRes);
        views.setTextColor(R.id.filter_pill, theme.onAccent);
        views.setTextColor(R.id.empty_view, theme.muted);
    }

    private static PhraseWidgetDb.LanguageRow resolveActiveLanguage(Context context, int appWidgetId, List<PhraseWidgetDb.LanguageRow> languages) {
        int languageId = PhraseWidgetPrefs.getLanguageId(context, appWidgetId, languages.get(0).id);
        for (PhraseWidgetDb.LanguageRow language : languages) {
            if (language.id == languageId) return language;
        }
        // The remembered language was deleted since — fall back to the first one and remember that instead.
        PhraseWidgetDb.LanguageRow fallback = languages.get(0);
        PhraseWidgetPrefs.setLanguageId(context, appWidgetId, fallback.id);
        return fallback;
    }

    private static PendingIntent cycleLanguagePendingIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, PhraseWidgetProvider.class);
        intent.setAction(ACTION_CYCLE_LANGUAGE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context, appWidgetId * 10, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent togglePendingIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, PhraseWidgetProvider.class);
        intent.setAction(ACTION_TOGGLE_FILTER);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context, appWidgetId * 10 + 1, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Template for the phrase list's row clicks — each row supplies the phrase-specific extras via its fillInIntent. */
    private static PendingIntent speakPendingIntentTemplate(Context context, int appWidgetId) {
        Intent intent = new Intent(context, PhraseWidgetProvider.class);
        intent.setAction(ACTION_SPEAK_PHRASE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context, appWidgetId * 10 + 2, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
    }

    /** Called from WidgetRefreshPlugin whenever the app writes to the database (or its theme/accent changes), so every placed widget picks up the change right away. */
    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, PhraseWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    /** Bridges WidgetRefreshPlugin#syncTheme (JS can't see PhraseWidgetThemePrefs directly since it's package-private). */
    public static void syncTheme(Context context, String theme, String accentHex) {
        PhraseWidgetThemePrefs.set(context, theme, accentHex);
        updateAllWidgets(context);
    }
}
