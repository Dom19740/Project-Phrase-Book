export interface Language {
  id: number
  name: string
  code: string
  sortOrder: number
}

export interface Category {
  id: number
  name: string
}

export interface PhraseConcept {
  id: number
  english: string
  categoryId: number | null
  sortOrder: number
  createdAt: string
}

export interface Translation {
  id: number
  phraseConceptId: number
  languageId: number
  text: string
  learned: boolean
  sortOrder: number
}

/** A translation row joined with its parent concept, for a single language's phrase list. */
export interface PhraseListItem {
  translationId: number
  phraseConceptId: number
  languageId: number
  english: string
  text: string
  learned: boolean
  sortOrder: number
  categoryId: number | null
  categoryName: string | null
}
