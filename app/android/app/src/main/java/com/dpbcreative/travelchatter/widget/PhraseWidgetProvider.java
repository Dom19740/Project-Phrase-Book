package com.dpbcreative.travelchatter.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.RemoteViews;
import com.dpbcreative.travelchatter.MainActivity;
import com.dpbcreative.travelchatter.R;
import java.util.List;

/**
 * Home-screen widget: shows one language's favorite or not-learnt phrases, with buttons on the
 * widget itself to cycle the language and switch the filter — no need to open the app. State for
 * each placed widget (which language, which filter) lives in PhraseWidgetPrefs, keyed by
 * appWidgetId so multiple widgets can each show something different.
 */
public class PhraseWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_CYCLE_LANGUAGE = "com.dpbcreative.travelchatter.widget.CYCLE_LANGUAGE";
    private static final String ACTION_SET_FILTER = "com.dpbcreative.travelchatter.widget.SET_FILTER";
    private static final String EXTRA_FILTER = "filter";
    private static final String ACCENT_COLOR = "#EC1D8B";

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
        if (!ACTION_CYCLE_LANGUAGE.equals(action) && !ACTION_SET_FILTER.equals(action)) return;

        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        if (ACTION_CYCLE_LANGUAGE.equals(action)) {
            cycleLanguage(context, appWidgetId);
        } else {
            String filter = intent.getStringExtra(EXTRA_FILTER);
            if (filter != null) PhraseWidgetPrefs.setFilter(context, appWidgetId, filter);
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
        List<PhraseWidgetDb.LanguageRow> languages = PhraseWidgetDb.getLanguages(context);

        if (languages.isEmpty()) {
            views.setTextViewText(R.id.language_chip, context.getString(R.string.widget_no_language));
            views.setViewVisibility(R.id.filter_row, View.GONE);
            views.setOnClickPendingIntent(R.id.language_chip, null);
        } else {
            views.setViewVisibility(R.id.filter_row, View.VISIBLE);

            PhraseWidgetDb.LanguageRow activeLanguage = resolveActiveLanguage(context, appWidgetId, languages);
            views.setTextViewText(R.id.language_chip, languageChipText(activeLanguage));
            views.setOnClickPendingIntent(R.id.language_chip, cycleLanguagePendingIntent(context, appWidgetId));

            String filter = PhraseWidgetPrefs.getFilter(context, appWidgetId);
            boolean favoritesActive = PhraseWidgetPrefs.FILTER_FAVORITES.equals(filter);
            applyFilterPillStyle(views, R.id.filter_favorites, favoritesActive);
            applyFilterPillStyle(views, R.id.filter_unlearned, !favoritesActive);
            views.setOnClickPendingIntent(R.id.filter_favorites, filterPendingIntent(context, appWidgetId, PhraseWidgetPrefs.FILTER_FAVORITES));
            views.setOnClickPendingIntent(R.id.filter_unlearned, filterPendingIntent(context, appWidgetId, PhraseWidgetPrefs.FILTER_UNLEARNED));

            Intent listIntent = new Intent(context, PhraseWidgetService.class);
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            // Distinct data URIs per widget so the widget host doesn't reuse one factory/cache for every instance.
            listIntent.setData(Uri.parse("phrasewidget://widget/" + appWidgetId));
            views.setRemoteAdapter(R.id.phrase_list_view, listIntent);
            views.setEmptyView(R.id.phrase_list_view, R.id.empty_view);

            Intent rowIntent = new Intent(context, MainActivity.class);
            PendingIntent rowTemplate = PendingIntent.getActivity(
                    context, appWidgetId, rowIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setPendingIntentTemplate(R.id.phrase_list_view, rowTemplate);
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.open_app_button, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.phrase_list_view);
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

    private static void applyFilterPillStyle(RemoteViews views, int viewId, boolean active) {
        views.setInt(viewId, "setBackgroundResource", active ? R.drawable.widget_pill_selected : R.drawable.widget_pill_unselected);
        views.setTextColor(viewId, active ? Color.WHITE : Color.parseColor(ACCENT_COLOR));
    }

    private static PendingIntent cycleLanguagePendingIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, PhraseWidgetProvider.class);
        intent.setAction(ACTION_CYCLE_LANGUAGE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context, appWidgetId * 10, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent filterPendingIntent(Context context, int appWidgetId, String filter) {
        Intent intent = new Intent(context, PhraseWidgetProvider.class);
        intent.setAction(ACTION_SET_FILTER);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.putExtra(EXTRA_FILTER, filter);
        int requestCode = appWidgetId * 10 + (PhraseWidgetPrefs.FILTER_FAVORITES.equals(filter) ? 1 : 2);
        return PendingIntent.getBroadcast(
                context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static CharSequence languageChipText(PhraseWidgetDb.LanguageRow language) {
        String code = language.code.toUpperCase();
        String label = code + "  " + language.name + "  ›";
        SpannableString spannable = new SpannableString(label);
        spannable.setSpan(new StyleSpan(Typeface.BOLD), 0, code.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        spannable.setSpan(new ForegroundColorSpan(Color.parseColor(ACCENT_COLOR)), 0, code.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return spannable;
    }

    /** Called from WidgetRefreshPlugin whenever the app writes to the database, so every placed widget picks up the change without waiting for its next click or the (disabled) periodic update. */
    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, PhraseWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }
}
