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

/** Supplies each row of one widget instance's phrase list, re-querying the database whenever the host calls onDataSetChanged (after a language/filter switch or an explicit widget refresh). */
final class PhraseRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final int appWidgetId;
    private List<PhraseWidgetDb.PhraseRow> phrases = new ArrayList<>();

    PhraseRemoteViewsFactory(Context context, Intent intent) {
        this.context = context;
        this.appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        List<PhraseWidgetDb.LanguageRow> languages = PhraseWidgetDb.getLanguages(context);
        if (languages.isEmpty()) {
            phrases = new ArrayList<>();
            return;
        }
        int languageId = PhraseWidgetPrefs.getLanguageId(context, appWidgetId, languages.get(0).id);
        String filter = PhraseWidgetPrefs.getFilter(context, appWidgetId);
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
        item.setTextViewText(R.id.english_text, phrase.english);
        item.setTextViewText(R.id.translation_text, phrase.text == null || phrase.text.isEmpty() ? context.getString(R.string.widget_needs_translation) : phrase.text);
        item.setViewVisibility(R.id.favorite_icon, phrase.favorite ? View.VISIBLE : View.GONE);
        // Empty fill-in — the row's only job is to open the app via the ListView's shared PendingIntentTemplate.
        item.setOnClickFillInIntent(R.id.item_root, new Intent());
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
