package com.dpbcreative.travelchatter.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

/** Backs the widget's scrollable phrase list — the system binds to this once per placed widget and asks it for a RemoteViewsFactory. */
public class PhraseWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new PhraseRemoteViewsFactory(getApplicationContext(), intent);
    }
}
