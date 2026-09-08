package com.dpbcreative.travelchatter;

import com.dpbcreative.travelchatter.widget.PhraseWidgetProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the JS layer nudge the home-screen widget to re-read the database after a write, so it doesn't sit stale until the next time someone taps it — and push its theme/accent so the widget's colors match. */
@CapacitorPlugin(name = "WidgetRefresh")
public class WidgetRefreshPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        PhraseWidgetProvider.updateAllWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void syncTheme(PluginCall call) {
        PhraseWidgetProvider.syncTheme(getContext(), call.getString("theme"), call.getString("accent"));
        call.resolve();
    }
}
