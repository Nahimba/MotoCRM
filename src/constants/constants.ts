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



export const EXPENSE_CATEGORIES = [
  "fuel",
  "repair",
  "marketing",
  "salary",
  "rent",
  "other",
  "income_category"
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];



export const LESSON_STATUSES = [
  "planned",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
  "late_cancelled"
] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];