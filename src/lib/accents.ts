// The accent colours a subject may use in its subject.json ("accent": "teal").
// Each name has matching light and dark values in src/styles/tokens.css.
export const ACCENTS = ['teal', 'blue', 'violet', 'orange', 'green', 'rose'] as const;
export type Accent = (typeof ACCENTS)[number];
