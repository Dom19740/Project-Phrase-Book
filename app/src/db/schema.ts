export const SCHEMA_VERSION = 1

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS languages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#207781',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS phrase_concepts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  english      TEXT NOT NULL,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS translations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_concept_id   INTEGER NOT NULL REFERENCES phrase_concepts(id) ON DELETE CASCADE,
  language_id         INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  text                TEXT NOT NULL,
  learned             INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (phrase_concept_id, language_id)
);

CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_id);
CREATE INDEX IF NOT EXISTS idx_translations_concept ON translations(phrase_concept_id);
CREATE INDEX IF NOT EXISTS idx_phrase_concepts_category ON phrase_concepts(category_id);
`
