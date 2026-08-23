// Word-bank categories the host can theme a game around. Keys must match the
// server's CATEGORY_WORDS in server.js. Labels/emoji are UI-only.
export interface Category {
  key: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { key: 'mixed',   label: 'Mixed',               emoji: '🎲' },
  { key: 'crypto',  label: 'Crypto & Blockchain', emoji: '🪙' },
  { key: 'science', label: 'Science',             emoji: '🔬' },
  { key: 'animals', label: 'Animals',             emoji: '🐾' },
  { key: 'places',  label: 'Places & Countries',  emoji: '🌍' },
  { key: 'people',  label: 'Famous People',       emoji: '👑' },
  { key: 'food',    label: 'Food & Drink',        emoji: '🍜' },
  { key: 'nature',  label: 'Nature',              emoji: '🌋' },
  { key: 'fantasy', label: 'Myth & Fantasy',      emoji: '🐉' },
];
