import postcss, { type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";
import type { CssInventory } from "./types.ts";

/**
 * Parses a CSS file and registers every class selector in the inventory.
 *
 * Each CSS rule is inspected independently. Rules containing multiple
 * classes are registered under every class found in their selectors.
 *
 * @param content - CSS source code to analyze.
 * @param file - Path to the CSS file being analyzed.
 * @param inventory - Shared inventory to populate with class definitions.
 *
 * @returns Nothing. Updates the inventory in place.
 */
export default function analyzeCssFile(
  content: string,
  file: string,
  inventory: CssInventory,
): void {
  const root = postcss.parse(content, { from: file });

  root.walkRules((rule) => {
    registerRule(rule, file, inventory);
  });
}

/**
 * Extracts unique class names from a CSS selector.
 *
 * Uses a selector AST to identify class nodes, including those inside
 * compound or complex selectors. Invalid selectors are ignored and
 * reported as warnings.
 *
 * @param selector - CSS selector to inspect.
 * @param file - Source file used to identify the selector in warnings.
 *
 * @returns A set of unique class names found in the selector.
 *
 * @example
 * ```ts
 * getRuleClasses(".card.featured > .card-title", "styles.css");
 * // Set { "card", "featured", "card-title" }
 * ```
 */
function getRuleClasses(selector: string, file: string): Set<string> {
  const classes = new Set<string>();

  try {
    const ast = selectorParser().astSync(selector);

    ast.walkClasses((classNode) => {
      classes.add(classNode.value);
    });
  } catch {
    console.warn(`Ignored selector in ${file}: ${selector}`);
  }

  return classes;
}

/**
 * Registers a CSS rule under every class found in its selector.
 *
 * The rule's file, starting line, and complete selector are stored
 * as a definition. A selector containing multiple classes is associated
 * with each of those classes.
 *
 * @param rule - PostCSS rule to register.
 * @param file - Path to the CSS file containing the rule.
 * @param inventory - Shared inventory to update.
 *
 * @returns Nothing. Updates the inventory in place.
 *
 * @example
 * For the selector `.card.featured`, the same definition is registered
 * under both `card` and `featured`.
 */
function registerRule(rule: Rule, file: string, inventory: CssInventory): void {
  const classes = getRuleClasses(rule.selector, file);
  const definition = {
    file,
    line: rule.source?.start?.line ?? null,
    selector: rule.selector,
  };

  for (const className of classes) {
    const definitions = inventory.get(className) ?? [];

    definitions.push(definition);
    inventory.set(className, definitions);
  }
}
