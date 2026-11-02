import { getClasses, getElementChildren } from "./nodes.ts";
import type { ClassPosition, HtmlNode } from "./types.ts";

/**
 * Collects the classes of each HTML element and maps them to its position
 * in the element tree.
 *
 * The root is represented by "$". Its children are indexed from "0";
 * deeper descendants use dot-separated indexes, such as "1.0".
 * Nodes without a tagName are ignored.
 *
 * @example
 * Input tree:
 * <article class="card">
 *   <img class="card-image">
 *   <div class="card-content">
 *     <h2 class="card-title">Title</h2>
 *   </div>
 * </article>
 *
 * Output:
 * {
 *   "$": ["card"],
 *   "0": ["card-image"],
 *   "1": ["card-content"],
 *   "1.0": ["card-title"]
 * }
 *
 * @param node - The HTML node from which to start collecting classes.
 * @param position - The node's position in the tree; "$" for the root.
 * @param result - The accumulator for classes grouped by position.
 * @returns The accumulated classes mapped to their tree positions.
 */
export function collectClassPositions(
  node: HtmlNode,
  position = "$",
  result: ClassPosition = {},
): ClassPosition {
  if (node.tagName) {
    result[position] = getClasses(node);

    getElementChildren(node).forEach((child, index) => {
      const childPosition =
        position === "$" ? String(index) : `${position}.${index}`;

      collectClassPositions(child, childPosition, result);
    });
  }

  return result;
}

/**
 * Compares two token arrays in lexicographical order.
 *
 * Tokens are compared one by one until a difference is found. If all
 * shared tokens match, the shorter array sorts first.
 *
 * @example
 * Input:
 *   a = ["article", "img", ""]
 *   b = ["article", "div", ""]
 *
 * Output:
 *   A positive number, because "img" sorts after "div".
 *
 * @param a - The first token array.
 * @param b - The second token array.
 * @returns A negative number if a sorts before b, a positive number if
 *          it sorts after b, or 0 if both arrays are equivalent.
 */
export function compareSortTokens(a: string[], b: string[]): number {
  const length = Math.min(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const comparison = a[i].localeCompare(b[i]);

    if (comparison !== 0) return comparison;
  }

  return a.length - b.length;
}

/**
 * Converts an HTML element tree into a token array for sorting.
 *
 * The traversal is depth-first: each element's tag name is added before
 * its children. An empty token is appended after each subtree to mark
 * where that subtree ends. Nodes without a tagName produce no tokens.
 *
 * @example
 * Input tree:
 * <article>
 *   <img>
 *   <div><h2></h2></div>
 * </article>
 *
 * Output:
 * ["article", "img", "", "div", "h2", "", "", ""]
 *
 * @param node - The HTML node to convert into sorting tokens.
 * @returns Tokens representing the element order and subtree boundaries.
 */
export function generateSortTokens(node: HtmlNode): string[] {
  if (!node.tagName) return [];

  const tokens = [node.tagName];

  for (const child of getElementChildren(node)) {
    tokens.push(...generateSortTokens(child));
  }

  tokens.push(""); // * An empty token marks the end of a subtree.

  return tokens;
}

/**
 * Generates a textual signature of an HTML element tree.
 *
 * The signature contains tag names and child order, but excludes text,
 * attributes, and classes. Child signatures are enclosed in brackets
 * and separated by commas. Nodes without a tagName produce an empty string.
 *
 * @example
 * Input tree:
 * <article>
 *   <img>
 *   <div><h2></h2><p></p><a></a></div>
 * </article>
 *
 * Output:
 * "article[img,div[h2,p,a]]"
 *
 * @param node - The HTML node whose structure should be represented.
 * @returns A textual signature of the node and its descendants.
 */
export function generateStructure(node: HtmlNode): string {
  if (!node.tagName) return "";

  const children = getElementChildren(node);
  const structure = children.map(generateStructure).join(",");

  return structure ? `${node.tagName}[${structure}]` : node.tagName;
}
