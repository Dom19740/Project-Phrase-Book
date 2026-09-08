package com.dpbcreative.travelchatter.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import com.dpbcreative.travelchatter.R;
import java.util.ArrayList;
import java.util.List;

/** Supplies each row of one widget instance's phrase list, re-querying the database whenever the host calls onDataSetChanged (after a language/filter switch, a tap-to-speak, or an explicit widget refresh). */
final class PhraseRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final int appWidgetId;
    private List<PhraseWidgetDb.PhraseRow> phrases = new ArrayList<>();
    private String filter = PhraseWidgetPrefs.FILTER_FAVORITES;
    private String languageCode;
    private PhraseWidgetTheme theme;

    PhraseRemoteViewsFactory(Context context, Intent intent) {
        this.context = context;
        this.appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        theme = PhraseWidgetTheme.resolve(context);
        List<PhraseWidgetDb.LanguageRow> languages = PhraseWidgetDb.getLanguages(context);
        if (languages.isEmpty()) {
            phrases = new ArrayList<>();
            return;
        }
        // The RemoteViewsService intent this factory was constructed with carries the language code
        // as an extra, but Android keys that service binding by Intent.filterEquals() — which ignores
        // extras and only compares the (constant, per-widget) data URI — so the system reuses this
        // same factory instance across language switches and never re-delivers a fresh intent. Reading
        // the language fresh here (same lookup the phrase query below already needs) is what keeps
        // tap-to-speak using the language that's actually on screen instead of whatever was first bound.
        int languageId = PhraseWidgetPrefs.getLanguageId(context, appWidgetId, languages.get(0).id);
        languageCode = languages.get(0).code;
        for (PhraseWidgetDb.LanguageRow language : languages) {
            if (language.id == languageId) {
                languageCode = language.code;
                break;
            }
        }
        filter = PhraseWidgetPrefs.getFilter(context, appWidgetId);
        phrases = PhraseWidgetDb.getPhrases(context, languageId, filter);
    }

    @Override
    public void onDestroy() {
        phrases = new ArrayList<>();
    }

    @Override
    public int getCount() {
        return phrases.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews item = new RemoteViews(context.getPackageName(), R.layout.widget_phrase_item);
        PhraseWidgetDb.PhraseRow phrase = phrases.get(position);
        item.setInt(R.id.item_root, "setBackgroundResource", theme.itemBackgroundRes);
        item.setTextViewText(R.id.english_text, phrase.english);
        item.setTextColor(R.id.english_text, theme.muted);
        item.setTextViewText(R.id.translation_text, phrase.text == null || phrase.text.isEmpty() ? context.getString(R.string.widget_needs_translation) : phrase.text);
        item.setTextColor(R.id.translation_text, theme.ink);

        // Favorites view already implies favorite=true for every row, so the only useful status
        // to surface there is whether it's been learnt; the not-learnt view is the mirror image.
        boolean favoritesFilter = PhraseWidgetPrefs.FILTER_FAVORITES.equals(filter);
        if (favoritesFilter && phrase.learned) {
            item.setViewVisibility(R.id.status_icon, View.VISIBLE);
            item.setImageViewResource(R.id.status_icon, R.drawable.ic_widget_check);
            item.setInt(R.id.status_icon, "setColorFilter", theme.accent);
        } else if (!favoritesFilter && phrase.favorite) {
            item.setViewVisibility(R.id.status_icon, View.VISIBLE);
            item.setImageViewResource(R.id.status_icon, R.drawable.ic_widget_star);
            item.setInt(R.id.status_icon, "setColorFilter", theme.accent);
        } else {
            item.setViewVisibility(R.id.status_icon, View.GONE);
        }

        boolean speakingThisRow = phrase.id == PhraseWidgetTts.getSpeakingTranslationId() && appWidgetId == PhraseWidgetTts.getSpeakingWidgetId();
        item.setViewVisibility(R.id.speaking_icon, speakingThisRow ? View.VISIBLE : View.GONE);
        item.setInt(R.id.speaking_icon, "setColorFilter", theme.accent);

        Intent fillInIntent = new Intent();
        fillInIntent.putExtra(PhraseWidgetProvider.EXTRA_TRANSLATION_ID, phrase.id);
        fillInIntent.putExtra(PhraseWidgetProvider.EXTRA_TEXT, phrase.text);
        fillInIntent.putExtra(PhraseWidgetProvider.EXTRA_LANGUAGE_CODE, languageCode);
        item.setOnClickFillInIntent(R.id.item_root, fillInIntent);
        return item;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }
}
