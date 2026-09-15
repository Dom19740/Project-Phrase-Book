export interface StartupPhrase {
  english: string
  category: string
}

/**
 * Curated starter pack offered after adding the first language - the phrases the user had
 * favourited in their Vietnamese phrase book. Translated into whichever language is added
 * automatically after being created.
 */
export const startupPhrases: StartupPhrase[] = [


// Greetings
{ english: 'Hello (polite).', category: 'Greetings' },
{ english: 'Hi (casual).', category: 'Greetings' },
{ english: 'Good morning.', category: 'Greetings' },
{ english: 'Good afternoon.', category: 'Greetings' },
{ english: 'Good evening.', category: 'Greetings' },
{ english: 'Goodnight.', category: 'Greetings' },
{ english: 'Goodbye.', category: 'Greetings' },
{ english: 'See you later.', category: 'Greetings' },
{ english: 'How are you?', category: 'Greetings' },
{ english: 'Nice to meet you.', category: 'Greetings' },

// Social Basics
{ english: 'Yes.', category: 'Social Basics' },
{ english: 'No.', category: 'Social Basics' },
{ english: 'Please.', category: 'Social Basics' },
{ english: 'Thank you.', category: 'Social Basics' },
{ english: 'Thank you very much.', category: 'Social Basics' },
{ english: 'No problem.', category: 'Social Basics' },
{ english: 'Sorry (apology).', category: 'Social Basics' },
{ english: 'Excuse me (to get attention).', category: 'Social Basics' },
{ english: "I don't understand.", category: 'Social Basics' },
{ english: 'What is this called?', category: 'Social Basics' },

// Identity
{ english: 'My name is...', category: 'Identity' },
{ english: 'What is your name?', category: 'Identity' },
{ english: 'I am from...', category: 'Identity' },
{ english: 'I am learning your language.', category: 'Identity' },

]
