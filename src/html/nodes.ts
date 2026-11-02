import type { HtmlNode } from "./types.ts";

/**
 * Extracts, deduplicates, and sorts the CSS classes from an HTML element.
 *
 * The class attribute is split by whitespace. Empty values are discarded,
 * duplicate classes are removed, and the resulting names are sorted
 * lexicographically.
 *
 * If the element has no class attribute or its value is empty, an empty
 * array is returned.
 *
 * @example
 * Input:
 * <div class="card featured card"></div>
 *
 * Output:
 * ["card", "featured"]
 *
 * @param node - The HTML element from which to extract classes.
 * @returns A sorted array of unique CSS class names.
 */
export function getClasses(node: HtmlNode): string[] {
  const value = node.attrs?.find((attr) => attr.name === "class")?.value;
  const classes = value ? value.split(/\s+/).filter(Boolean) : [];

  return [...new Set(classes)].sort((a, b) => a.localeCompare(b));
}

/**
 * Retrieves the direct element children of an HTML node.
 *
 * Filters childNodes to include only HTML elements, excluding text nodes,
 * comments, and other node types. Returns an empty array when childNodes
 * is null or undefined.
 *
 * @example
 * Input:
 * <div>
 *   Text
 *   <span></span>
 *   <!-- Comment -->
 *   <p></p>
 * </div>
 *
 * Output:
 * [HtmlNode representing <span>, HtmlNode representing <p>]
 *
 * @param node - The HTML node whose direct children should be retrieved.
 * @returns An array containing only the node's direct element children.
 */
export function getElementChildren(node: HtmlNode): HtmlNode[] {
  return (node.childNodes ?? []).filter((child) => Boolean(child.tagName));
}
