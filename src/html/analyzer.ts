import { parse } from "parse5";
import type {
  HtmlNode,
  Ancestor,
  ComponentGroup,
  AnalysisContext,
} from "./types.ts";
import { getClasses, getElementChildren } from "./nodes.ts";
import {
  collectClassPositions,
  generateSortTokens,
  generateStructure,
} from "./structure.ts";

/**
 * Analyzes an HTML document and collects its structural and class information.
 *
 * Parses the provided HTML content with source location tracking enabled,
 * then traverses the resulting DOM tree to:
 * - Register class occurrences in the global inventory.
 * - Group candidate elements by their structural signature.
 * - Record each occurrence's source location, ancestors, and class positions.
 *
 * @param content - The HTML source code to analyze.
 * @param file - The source file path, used to identify occurrences.
 * @param groups - Shared collection of structural groups across HTML files.
 * @param classInventory - Shared counter of HTML class occurrences.
 * @returns Nothing. Results are accumulated in the provided collections.
 */
export default function analyzeHtmlFile(
  content: string,
  file: string,
  groups: Map<string, ComponentGroup>,
  classInventory: Map<string, number>,
): void {
  const document = parse(content, {
    sourceCodeLocationInfo: true,
  }) as unknown as HtmlNode;

  visitNode(document, [], 0, {
    file,
    groups,
    classes: classInventory,
  });
}

/**
 * Increments the occurrence count of each class in the inventory.
 *
 * Each class contributes one occurrence per element in which it appears.
 *
 * @example
 * Input:
 *   classes = ["card", "featured"]
 *   inventory = Map([["card", 2]])
 *
 * Output:
 *   Map([["card", 3], ["featured", 1]])
 *
 * @param classes - Class names found on a single HTML element.
 * @param inventory - Shared class occurrence counter.
 * @returns Nothing. The inventory is updated in place.
 */
function registerClasses(
  classes: string[],
  inventory: Map<string, number>,
): void {
  for (const className of classes) {
    inventory.set(className, (inventory.get(className) ?? 0) + 1);
  }
}

/**
 * Registers an HTML element as an occurrence of a structural component group.
 *
 * Generates the element's structural signature and retrieves its existing
 * group. If no group exists, a new one is created with its sorting tokens,
 * root tag, and depth.
 *
 * The occurrence is then recorded with its source location, ancestor
 * information, and classes mapped to their positions in the subtree.
 *
 * @param node - The candidate HTML element being registered.
 * @param ancestors - Ancestor elements preceding the current node.
 * @param depth - The current element's depth in the document tree.
 * @param context - Shared analysis data, including the source file and groups.
 * @returns Nothing. The corresponding group is created or updated.
 */
function registerComponent(
  node: HtmlNode,
  ancestors: Ancestor[],
  depth: number,
  context: AnalysisContext,
): void {
  const signature = generateStructure(node);

  let group = context.groups.get(signature);

  if (!group) {
    group = {
      signature,
      sortTokens: generateSortTokens(node),
      tag: node.tagName!,
      depth,
      occurrences: [],
    };

    context.groups.set(signature, group);
  }

  const location = node.sourceCodeLocation;

  group.occurrences.push({
    file: context.file,
    line: location?.startLine ?? null,
    column: location?.startCol ?? null,
    ancestors: [...ancestors],
    classes: collectClassPositions(node),
  });
}

/**
 * Recursively traverses the HTML node tree and collects analysis data.
 *
 * For each element, the function:
 * 1. Extracts and registers its classes.
 * 2. Checks whether it qualifies as a structural component candidate.
 * 3. Registers eligible candidates in their corresponding groups.
 * 4. Adds the current element to the ancestor chain before visiting its children.
 *
 * The "html" and "body" elements are excluded from candidate registration.
 * Only elements with at least one direct element child qualify as candidates.
 *
 * @param node - The current HTML node being visited.
 * @param ancestors - Ancestors of the current node.
 * @param depth - Current depth in the document tree.
 * @param context - Shared analysis data used throughout the traversal.
 * @returns Nothing. Analysis results are accumulated in context.
 */
function visitNode(
  node: HtmlNode,
  ancestors: Ancestor[],
  depth: number,
  context: AnalysisContext,
): void {
  if (node.tagName) {
    const classes = getClasses(node);
    registerClasses(classes, context.classes);

    const children = getElementChildren(node);
    const isCandidate =
      children.length > 0 && !["html", "body"].includes(node.tagName);

    if (isCandidate) {
      registerComponent(node, ancestors, depth, context);
    }

    ancestors = [...ancestors, { tag: node.tagName, classes }];

    depth++;
  }

  for (const child of node.childNodes ?? []) {
    visitNode(child, ancestors, depth, context);
  }
}
