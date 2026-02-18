export const LEAD_SOURCES = [
  "instagram",
  "website",
  "word_of_mouth",
  "google",
  "other"
] as const;

// Цей рядок дозволяє TypeScript розуміти, що source може бути 
// тільки одним із значень вище, а не будь-яким рядком
export type LeadSource = (typeof LEAD_SOURCES)[number];