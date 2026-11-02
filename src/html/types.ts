/**
 * Represents an HTML node parsed by parse5.
 *
 * Contains the element name, optional attributes, child nodes,
 * and source location information when available.
 */
export type HtmlNode = {
  /** The node's name, including non-element nodes. */
  nodeName: string;

  /** The element's tag name, available only for HTML elements. */
  tagName?: string;

  /** The element's attributes, represented as name-value pairs. */
  attrs?: Array<{ name: string; value: string }>;

  /** The node's child nodes, including elements and non-element nodes. */
  childNodes?: HtmlNode[];

  /** Source location information provided by parse5. */
  sourceCodeLocation?: {
    /** The line where the node starts, using one-based indexing. */
    startLine?: number;

    /** The column where the node starts, using one-based indexing. */
    startCol?: number;
  };
};

/**
 * Represents an ancestor element of a candidate HTML structure.
 *
 * Stores the ancestor's tag name and CSS classes to provide
 * context about where a structure appears in the document.
 *
 * @example
 * {
 *   tag: "section",
 *   classes: ["catalog", "featured"]
 * }
 */
export type Ancestor = {
  /** The ancestor element's tag name. */
  tag: string;

  /** The CSS classes assigned to the ancestor element. */
  classes: string[];
};

/**
 * Maps element positions within an HTML structure to their CSS classes.
 *
 * Positions use "$" for the root element and dot-separated indexes
 * for descendants.
 *
 * @example
 * {
 *   "$": ["card"],
 *   "0": ["card-image"],
 *   "1": ["card-content"],
 *   "1.0": ["card-title"]
 * }
 */
export type ClassPosition = Record<string, string[]>;

/**
 * Represents a single occurrence of a structural component candidate.
 *
 * Records its source location, ancestor context, and CSS classes
 * associated with each position in its HTML subtree.
 */
export type Occurrence = {
  /** Path of the HTML file containing this occurrence. */
  file: string;

  /** Starting line number, or null if unavailable. */
  line: number | null;

  /** Starting column number, or null if unavailable. */
  column: number | null;

  /** Ancestor elements surrounding the candidate. */
  ancestors: Ancestor[];

  /** CSS classes mapped to positions within the candidate's subtree. */
  classes: ClassPosition;
};

/**
 * Groups occurrences that share the same HTML structural signature.
 *
 * Stores the signature used for grouping, sorting tokens, root tag,
 * tree depth, and all recorded occurrences.
 */
export type ComponentGroup = {
  /** Structural signature shared by all occurrences in this group. */
  signature: string;

  /** Tokens used to sort groups by their structural representation. */
  sortTokens: string[];

  /** Root element's tag name. */
  tag: string;

  /** Root element's depth within the HTML document tree. */
  depth: number;

  /** All occurrences matching this structural signature. */
  occurrences: Occurrence[];
};

/**
 * Holds shared state used during the analysis of an HTML file.
 *
 * Provides the current file path, structural component groups,
 * and the global HTML class occurrence inventory.
 */
export type AnalysisContext = {
  /** Path of the HTML file currently being analyzed. */
  file: string;

  /** Structural groups shared across analyzed HTML files. */
  groups: Map<string, ComponentGroup>;

  /** Number of HTML elements containing each CSS class. */
  classes: Map<string, number>;
};
