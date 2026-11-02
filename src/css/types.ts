/**
 * Represents a CSS class selector definition found in a stylesheet.
 */
export type CssDefinition = {
  /** Path to the CSS file containing the definition. */
  file: string;

  /** Line where the CSS rule starts, or `null` if unavailable. */
  line: number | null;

  /** Complete selector associated with the definition. */
  selector: string;
};

/**
 * Maps each CSS class name to the rules in which it is defined.
 *
 * A selector containing multiple classes contributes the same rule
 * definition to each corresponding class entry.
 *
 * @example
 * ```ts
 * const inventory: CssInventory = new Map([
 *     ["card", [
 *         { file: "styles.css", line: 10, selector: ".card.featured" },
 *     ]],
 *     ["featured", [
 *         { file: "styles.css", line: 10, selector: ".card.featured" },
 *     ]],
 * ]);
 * ```
 */
export type CssInventory = Map<string, CssDefinition[]>;
