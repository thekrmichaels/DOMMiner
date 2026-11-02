import type { ComponentGroup, Occurrence } from "../html/types.ts";
import type { CssInventory } from "../css/types.ts";
import type { ClassSummary } from "./types.ts";

/**
 * Builds a report for a structural component group, including class
 * variations and the CSS definitions associated with component and
 * ancestor classes.
 *
 * Component classes are collected from every occurrence's subtree.
 * Ancestor classes are collected from the elements surrounding those
 * occurrences. Both sets are resolved against the CSS inventory.
 *
 * @param group - Structural component group to report.
 * @param cssInventory - CSS definitions indexed by class name.
 *
 * @returns A report containing the component's structure, occurrences,
 * class summary, and related CSS definitions.
 */
export default function buildComponentReport(
  group: ComponentGroup,
  cssInventory: CssInventory,
) {
  const classSummary = summarizeClasses(group.occurrences);

  const componentClasses = new Set(
    Object.values(classSummary).flatMap((position) => position.all),
  );
  const ancestorClasses = new Set(
    group.occurrences.flatMap((occurrence) =>
      occurrence.ancestors.flatMap((ancestor) => ancestor.classes),
    ),
  );

  return {
    signature: group.signature,
    tag: group.tag,
    depth: group.depth,
    occurrences: group.occurrences,
    classSummary,
    css: {
      componentClasses: getCssDefinitions(componentClasses, cssInventory),
      ancestorClasses: getCssDefinitions(ancestorClasses, cssInventory),
    },
  };
}

/**
 * Resolves a set of class names against the CSS inventory.
 *
 * Class names are sorted alphabetically. Each entry includes all CSS
 * definitions found for that class, or an empty array if none exist.
 *
 * @param names - Unique class names to resolve.
 * @param cssInventory - CSS definitions indexed by class name.
 *
 * @returns Sorted class entries with their corresponding CSS definitions.
 *
 * @example
 * Given `names = new Set(["featured", "card"])`, the result is ordered
 * alphabetically:
 * ```ts
 * [
 *     { name: "card", definitions: [...] },
 *     { name: "featured", definitions: [...] },
 * ]
 * ```
 */
function getCssDefinitions(names: Set<string>, cssInventory: CssInventory) {
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      definitions: cssInventory.get(name) ?? [],
    }));
}

/**
 * Summarizes classes across all occurrences, grouped by tree position.
 *
 * Collects every position found in the occurrences and generates a
 * class summary for each one.
 *
 * @param occurrences - Component occurrences to compare.
 *
 * @returns A map-like object keyed by tree position, with common,
 * variable, and complete class lists for each position.
 *
 * @example
 * For two occurrences:
 * ```ts
 * [
 *     { classes: { "$": ["card", "featured"] } },
 *     { classes: { "$": ["card"] } },
 * ]
 * ```
 * The root position summary is:
 * ```ts
 * {
 *     "$": {
 *         common: ["card"],
 *         variable: ["featured"],
 *         all: ["card", "featured"],
 *     },
 * }
 * ```
 */
function summarizeClasses(
  occurrences: Occurrence[],
): Record<string, ClassSummary> {
  const summary: Record<string, ClassSummary> = {};
  const positions = new Set(
    occurrences.flatMap(({ classes }) => Object.keys(classes)),
  );

  for (const position of positions) {
    summary[position] = summarizePosition(occurrences, position);
  }

  return summary;
}

/**
 * Summarizes the classes found at one tree position across occurrences.
 *
 * A class is considered common when it appears in every occurrence.
 * Otherwise, it is classified as variable.
 *
 * @param occurrences - Component occurrences to compare.
 * @param position - Tree position whose classes should be summarized.
 *
 * @returns Sorted common, variable, and complete class lists.
 */
function summarizePosition(
  occurrences: Occurrence[],
  position: string,
): ClassSummary {
  const counts = countClassesByPosition(occurrences, position);
  const all = [...counts.keys()];
  const { common, variable } = partitionClasses(
    all,
    counts,
    occurrences.length,
  );

  return {
    common: common.toSorted((a, b) => a.localeCompare(b)),
    variable: variable.toSorted((a, b) => a.localeCompare(b)),
    all: all.toSorted((a, b) => a.localeCompare(b)),
  };
}

/**
 * Counts how many occurrences contain each class at a given position.
 *
 * Duplicate class names within one occurrence are counted only once.
 * Occurrences without classes at the requested position contribute
 * no counts.
 *
 * @param occurrences - Component occurrences to inspect.
 * @param position - Tree position whose classes should be counted.
 *
 * @returns A map of class names to the number of occurrences containing them.
 *
 * @example
 * For two occurrences:
 * ```ts
 * [
 *     { classes: { "$": ["card", "featured"] } },
 *     { classes: { "$": ["card"] } },
 * ]
 * ```
 * The result is:
 * ```ts
 * new Map([
 *     ["card", 2],
 *     ["featured", 1],
 * ])
 * ```
 */
function countClassesByPosition(
  occurrences: Occurrence[],
  position: string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const { classes } of occurrences) {
    for (const className of new Set(classes[position] ?? [])) {
      counts.set(className, (counts.get(className) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Divides classes into common and variable groups based on their counts.
 *
 * A class is common if its count matches the total number of occurrences.
 * Classes with lower counts are classified as variable.
 *
 * @param all - Unique class names to classify.
 * @param counts - Number of occurrences containing each class.
 * @param totalOccurrences - Total number of occurrences being compared.
 *
 * @returns Arrays containing common and variable class names.
 */
function partitionClasses(
  all: string[],
  counts: Map<string, number>,
  totalOccurrences: number,
): { common: string[]; variable: string[] } {
  const common: string[] = [];
  const variable: string[] = [];

  for (const className of all) {
    const count = counts.get(className) ?? 0;

    if (count === totalOccurrences) {
      common.push(className);
    } else {
      variable.push(className);
    }
  }

  return { common, variable };
}
