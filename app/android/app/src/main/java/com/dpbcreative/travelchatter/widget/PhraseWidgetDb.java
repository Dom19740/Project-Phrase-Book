package com.dpbcreative.travelchatter.widget;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.util.ArrayList;
import java.util.List;

/**
 * Read-only access to the same on-device SQLite file the web/JS layer writes through
 * @capacitor-community/sqlite (see app/src/db/client.ts — DB_NAME "phrasebook" becomes
 * "phrasebookSQLite.db" under the app's standard databases directory). The widget runs in the
 * app's own process, so it reads this file directly rather than round-tripping through the
 * WebView/JS bridge, which isn't available while the widget's host process is idle.
 */
final class PhraseWidgetDb {

    private static final String DB_FILE_NAME = "phrasebookSQLite.db";

    private PhraseWidgetDb() {}

    static final class LanguageRow {
        final int id;
        final String name;
        final String code;

        LanguageRow(int id, String name, String code) {
            this.id = id;
            this.name = name;
            this.code = code;
        }
    }

    static final class PhraseRow {
        final long id;
        final String english;
        final String text;
        final boolean favorite;
        final boolean learned;

        PhraseRow(long id, String english, String text, boolean favorite, boolean learned) {
            this.id = id;
            this.english = english;
            this.text = text;
            this.favorite = favorite;
            this.learned = learned;
        }
    }

    private static SQLiteDatabase openReadOnly(Context context) {
        String path = context.getDatabasePath(DB_FILE_NAME).getPath();
        return SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READONLY);
    }

    static List<LanguageRow> getLanguages(Context context) {
        List<LanguageRow> result = new ArrayList<>();
        try (SQLiteDatabase db = openReadOnly(context);
             Cursor c = db.rawQuery("SELECT id, name, code FROM languages ORDER BY sort_order, id", null)) {
            while (c.moveToNext()) {
                result.add(new LanguageRow(c.getInt(0), c.getString(1), c.getString(2)));
            }
        } catch (Exception e) {
            // No languages added yet, or the app is mid-write and briefly holds the file lock —
            // either way the widget just falls back to its empty state rather than crashing.
        }
        return result;
    }

    static List<PhraseRow> getPhrases(Context context, int languageId, String filter) {
        List<PhraseRow> result = new ArrayList<>();
        String condition = "favorites".equals(filter) ? "t.favorite = 1" : "t.learned = 0";
        String sql = "SELECT t.id, pc.english, t.text, t.favorite, t.learned FROM translations t "
                + "JOIN phrase_concepts pc ON pc.id = t.phrase_concept_id "
                + "WHERE t.language_id = ? AND " + condition + " "
                + "ORDER BY t.sort_order, t.id";
        try (SQLiteDatabase db = openReadOnly(context);
             Cursor c = db.rawQuery(sql, new String[] { String.valueOf(languageId) })) {
            while (c.moveToNext()) {
                result.add(new PhraseRow(c.getLong(0), c.getString(1), c.getString(2), c.getInt(3) != 0, c.getInt(4) != 0));
            }
        } catch (Exception e) {
            // Same fallback as above.
        }
        return result;
    }
}
