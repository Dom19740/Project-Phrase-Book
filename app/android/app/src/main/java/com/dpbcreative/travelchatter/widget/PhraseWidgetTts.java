package com.dpbcreative.travelchatter.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import com.dpbcreative.travelchatter.R;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;

/**
 * Native counterpart to app/src/lib/tts.ts + useSpeakRate.ts for the widget, which has no access
 * to the WebView/JS layer. Same repeat-within-5s-plays-slower rule, same per-language locale
 * overrides — keep both in sync.
 */
final class PhraseWidgetTts {

    private static final String TAG = "PhraseWidgetTts";
    private static final long REPEAT_WINDOW_MS = 5000;
    private static final float SLOW_RATE = 0.3f;
    private static final float NORMAL_RATE = 1.0f;

    private static final Map<String, String> LOCALE_MAP = new HashMap<>();
    static {
        LOCALE_MAP.put("en", "en-US");
        LOCALE_MAP.put("vi", "vi-VN");
        LOCALE_MAP.put("id", "id-ID");
    }

    private static PhraseWidgetTts instance;

    static synchronized PhraseWidgetTts get(Context context) {
        if (instance == null) instance = new PhraseWidgetTts(context.getApplicationContext());
        return instance;
    }

    static long getSpeakingTranslationId() {
        return instance != null ? instance.speakingTranslationId : -1;
    }

    static int getSpeakingWidgetId() {
        return instance != null ? instance.speakingWidgetId : AppWidgetManager.INVALID_APPWIDGET_ID;
    }

    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Map<Long, Long> lastSpokenAt = new HashMap<>();
    private final Queue<Runnable> pendingUntilReady = new ArrayDeque<>();

    private TextToSpeech tts;
    private boolean ready = false;

    private volatile long speakingTranslationId = -1;
    private volatile int speakingWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    private PhraseWidgetTts(Context appContext) {
        this.appContext = appContext;
    }

    void speak(long translationId, String text, String languageCode, int appWidgetId) {
        if (text == null || text.isEmpty()) return;

        long now = System.currentTimeMillis();
        Long lastAt = lastSpokenAt.get(translationId);
        float rate = (lastAt != null && now - lastAt < REPEAT_WINDOW_MS) ? SLOW_RATE : NORMAL_RATE;
        lastSpokenAt.put(translationId, now);

        runWhenReady(() -> speakNow(translationId, text, languageCode, appWidgetId, rate));
    }

    private void runWhenReady(Runnable action) {
        if (ready) {
            action.run();
            return;
        }
        pendingUntilReady.add(action);
        if (tts != null) return;

        tts = new TextToSpeech(appContext, status -> {
            ready = status == TextToSpeech.SUCCESS;
            if (ready) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        onSpeechStart(utteranceId);
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        onSpeechEnd(utteranceId);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        onSpeechEnd(utteranceId);
                    }
                });
                Runnable next;
                while ((next = pendingUntilReady.poll()) != null) next.run();
            } else {
                Log.w(TAG, "TextToSpeech init failed, status=" + status);
                pendingUntilReady.clear();
            }
        });
    }

    private void speakNow(long translationId, String text, String languageCode, int appWidgetId, float rate) {
        String localeTag = LOCALE_MAP.containsKey(languageCode) ? LOCALE_MAP.get(languageCode) : languageCode;
        // Matches @capacitor-community/text-to-speech's Android side exactly (same Locale.forLanguageTag
        // + unconditional setLanguage) so the widget reads phrases in the same dialect as the app. The
        // previous isLanguageAvailable() gate silently skipped setLanguage for anything below
        // LANG_AVAILABLE, leaving whatever locale a prior utterance had set — which is what made the
        // widget mispronounce phrases or read them in the wrong dialect.
        Locale locale = localeTag != null ? Locale.forLanguageTag(localeTag) : Locale.getDefault();
        tts.setLanguage(locale);
        tts.setSpeechRate(rate);
        tts.setPitch(1.0f);
        String utteranceId = appWidgetId + ":" + translationId;
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
    }

    private void onSpeechStart(String utteranceId) {
        Utterance parsed = Utterance.parse(utteranceId);
        if (parsed == null) return;
        speakingWidgetId = parsed.appWidgetId;
        speakingTranslationId = parsed.translationId;
        mainHandler.post(() -> notifyRowChanged(parsed.appWidgetId));
    }

    private void onSpeechEnd(String utteranceId) {
        Utterance parsed = Utterance.parse(utteranceId);
        if (parsed == null) return;
        speakingTranslationId = -1;
        speakingWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
        mainHandler.post(() -> notifyRowChanged(parsed.appWidgetId));
    }

    private void notifyRowChanged(int appWidgetId) {
        AppWidgetManager.getInstance(appContext).notifyAppWidgetViewDataChanged(appWidgetId, R.id.phrase_list_view);
    }

    private static final class Utterance {
        final int appWidgetId;
        final long translationId;

        private Utterance(int appWidgetId, long translationId) {
            this.appWidgetId = appWidgetId;
            this.translationId = translationId;
        }

        static Utterance parse(String utteranceId) {
            if (utteranceId == null) return null;
            int sep = utteranceId.indexOf(':');
            if (sep < 0) return null;
            try {
                return new Utterance(Integer.parseInt(utteranceId.substring(0, sep)), Long.parseLong(utteranceId.substring(sep + 1)));
            } catch (NumberFormatException e) {
                return null;
            }
        }
    }
}
