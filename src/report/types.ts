/**
 * Summarizes the classes found at a specific position across component occurrences.
 */
export type ClassSummary = {
  /** Classes present in every occurrence at this position. */
  common: string[];

  /** Classes present in some, but not all, occurrences at this position. */
  variable: string[];

  /** All unique classes found at this position. */
  all: string[];
};
