export { default as analyzeHtmlFile } from "./analyzer.ts";
export { getClasses, getElementChildren } from "./nodes.ts";
export {
  collectClassPositions,
  compareSortTokens,
  generateSortTokens,
  generateStructure,
} from "./structure.ts";
export type { Ancestor, ComponentGroup, Occurrence } from "./types.ts";
