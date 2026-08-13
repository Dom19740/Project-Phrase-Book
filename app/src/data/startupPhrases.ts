export interface StartupPhrase {
  english: string
  category: string
}

/**
 * Curated starter pack offered after adding the first language — the phrases the user had
 * favourited in their Vietnamese phrase book. Translated into whichever language is added
 * automatically after being created.
 */
export const startupPhrases: StartupPhrase[] = [
  { english: 'Can I pay?', category: 'Dining & Ordering' },
  { english: 'Good afternoon.', category: 'Greetings' },
  { english: 'Good evening.', category: 'Greetings' },
  { english: 'Good morning.', category: 'Greetings' },
  { english: 'Goodbye.', category: 'Greetings' },
  { english: 'Goodnight.', category: 'Greetings' },
  { english: 'Great.', category: 'Social Basics' },
  { english: 'Hello (polite).', category: 'Greetings' },
  { english: 'Hello friends.', category: 'Greetings' },
  { english: 'How are you?', category: 'Greetings' },
  { english: 'How much?', category: 'Dining & Ordering' },
  { english: "I don't understand.", category: 'Social Basics' },
  { english: 'My name is...', category: 'Identity' },
  { english: 'Nice to meet you.', category: 'Greetings' },
  { english: 'No.', category: 'Social Basics' },
  { english: 'No problem.', category: 'Social Basics' },
  { english: 'No thank you.', category: 'Social Basics' },
  { english: 'One, Two, Three.', category: 'Dining & Ordering' },
  { english: 'Please.', category: 'Social Basics' },
  { english: 'See you later.', category: 'Greetings' },
  { english: 'Excuse me.', category: 'Social Basics' },
  { english: 'Thank you everyone.', category: 'Social Basics' },
  { english: 'Thank you very much.', category: 'Social Basics' },
  { english: 'Thank you.', category: 'Social Basics' },
  { english: 'Toilet?', category: 'Directions & Facilities' },
  { english: 'Very delicious.', category: 'Dining & Ordering' },
  { english: 'What is your name?', category: 'Identity' },
  { english: 'Yes.', category: 'Social Basics' },
]
