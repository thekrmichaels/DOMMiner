import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  analyzeHtmlFile,
  compareSortTokens,
  type ComponentGroup,
} from "./html/index.ts";
import { analyzeCssFile, type CssInventory } from "./css/index.ts";
import buildComponentReport from "./report/index.ts";

/**
 * Runs the DOM Miner analysis pipeline.
 *
 * Retrieves the input directory, discovers HTML and CSS files, analyzes
 * their contents, generates component and class reports, writes the
 * resulting JSON file, and prints an execution summary.
 *
 * @returns A promise that resolves when the analysis is complete.
 */
export async function main(directory: string): Promise<void> {
  if (!directory) {
    console.error("Usage: dom-miner <directory>");
    process.exitCode = 1;

    return;
  }

  const { htmlFiles, cssFiles } = await getFiles(directory);

  const htmlGroups = new Map<string, ComponentGroup>();
  const htmlInventory = new Map<string, number>();
  const cssInventory: CssInventory = new Map();

  await analyzeHtmlFiles(htmlFiles, htmlGroups, htmlInventory);
  await analyzeCssFiles(cssFiles, cssInventory);

  const components = generateComponents(htmlGroups, cssInventory);

  const report = generateReport(
    htmlFiles,
    cssFiles,
    components,
    htmlInventory,
    cssInventory,
  );

  const output = await writeReport(report);

  printSummary(
    htmlFiles,
    cssFiles,
    components,
    htmlInventory,
    cssInventory,
    output,
  );
}

// --------------------------------------------------
// Constants
// --------------------------------------------------

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build"]);

// --------------------------------------------------
// Directory Walker
// --------------------------------------------------

/**
 * Checks whether a directory should be excluded from traversal.
 *
 * @param name - Directory name to check.
 * @returns `true` if the directory is in the ignore list.
 */
function isIgnoredDirectory(name: string): boolean {
  return IGNORED_DIRECTORIES.has(name);
}

/**
 * Classifies a directory entry and adds its path to the corresponding list.
 *
 * Ignored directories are skipped. Regular files are collected for later
 * processing.
 *
 * @param entry - Directory entry returned by `readdir`.
 * @param directory - Parent directory containing the entry.
 * @param files - File paths collected during traversal.
 * @param directories - Non-ignored directory paths to traverse later.
 *
 * @returns Nothing. Updates the provided arrays in place.
 */
function collectEntry(
  entry: import("node:fs").Dirent,
  directory: string,
  files: string[],
  directories: string[],
): void {
  const fullPath = path.join(directory, entry.name);

  if (entry.isDirectory()) {
    if (!isIgnoredDirectory(entry.name)) {
      directories.push(fullPath);
    }
  } else if (entry.isFile()) {
    files.push(fullPath);
  }
}

/**
 * Recursively collects regular files from a directory tree.
 *
 * Directories in the ignore list are excluded from traversal.
 *
 * @param directory - Root directory to scan.
 *
 * @returns Absolute or resolved file paths collected from the directory
 * tree, depending on the path supplied by the caller.
 */
async function walkDirectory(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  const directories: string[] = [];

  entries.forEach((entry) =>
    collectEntry(entry, directory, files, directories),
  );

  const nestedFiles = await Promise.all(directories.map(walkDirectory));

  return files.concat(...nestedFiles);
}

// --------------------------------------------------
// Main Execution
// --------------------------------------------------

/**
 * Retrieves and validates the input directory from the CLI arguments.
 *
 * If no directory is provided, prints the command usage, sets the process
 * exit code to 1, and returns `null`.
 *
 * @returns The resolved input directory, or `null` if no input was provided.
 */
function getInputDirectory(): string | null {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: npm run analyze -- <directory>");
    process.exitCode = 1;
    return null;
  }

  return path.resolve(input);
}

/**
 * Collects HTML and CSS files from the input directory.
 *
 * @param directory - Root directory to scan.
 *
 * @returns Separate lists of HTML and CSS file paths.
 */
async function getFiles(directory: string) {
  const files = await walkDirectory(directory);

  return {
    htmlFiles: files.filter((file) => /\.html?$/i.test(file)),
    cssFiles: files.filter((file) => /\.css$/i.test(file)),
  };
}

/**
 * Reads and analyzes all HTML files.
 *
 * Files are read concurrently, then analyzed using shared structural
 * groups and class inventory collections.
 *
 * @param files - HTML file paths to analyze.
 * @param groups - Shared collection of structural component groups.
 * @param inventory - Shared HTML class occurrence inventory.
 *
 * @returns A promise that resolves when all files have been analyzed.
 * Updates both collections in place.
 */
async function analyzeHtmlFiles(
  files: string[],
  groups: Map<string, ComponentGroup>,
  inventory: Map<string, number>,
): Promise<void> {
  const contents = await Promise.all(
    files.map((file) => readFile(file, "utf8")),
  );

  files.forEach((file, index) => {
    analyzeHtmlFile(contents[index], file, groups, inventory);
  });
}

/**
 * Reads and analyzes all CSS files.
 *
 * Files are read concurrently. Individual CSS parsing errors are caught
 * and reported as warnings so that the remaining files can be processed.
 *
 * @param files - CSS file paths to analyze.
 * @param inventory - Shared CSS class definition inventory.
 *
 * @returns A promise that resolves when all files have been processed.
 * Updates the inventory in place.
 */
async function analyzeCssFiles(
  files: string[],
  inventory: CssInventory,
): Promise<void> {
  const contents = await Promise.all(
    files.map((file) => readFile(file, "utf8")),
  );

  files.forEach((file, index) => {
    try {
      analyzeCssFile(contents[index], file, inventory);
    } catch (error) {
      console.warn(`Ignored CSS: ${file}`, error);
    }
  });
}

function isRepeatedStructure(group: ComponentGroup): boolean {
  return group.occurrences.length > 1;
}

/**
 * Compares component groups by their structural sorting tokens.
 *
 * Uses the component signature as a secondary comparison when their
 * sorting tokens are equivalent.
 *
 * @param a - First component group.
 * @param b - Second component group.
 *
 * @returns A negative number, positive number, or zero according
 * to their sorting order.
 */
function compareComponents(a: ComponentGroup, b: ComponentGroup): number {
  return (
    compareSortTokens(a.sortTokens, b.sortTokens) ||
    a.signature.localeCompare(b.signature)
  );
}

/**
 * Builds reports for all repeated structural groups.
 *
 * Groups are filtered to exclude structures with only one occurrence,
 * sorted by their structural tokens, and converted into component reports.
 *
 * @param groups - Structural groups collected during HTML analysis.
 * @param inventory - CSS definitions used to resolve component classes.
 *
 * @returns Sorted component reports for repeated structures.
 */
function generateComponents(
  groups: Map<string, ComponentGroup>,
  inventory: CssInventory,
) {
  return [...groups.values()]
    .filter(isRepeatedStructure)
    .sort(compareComponents)
    .map((group) => buildComponentReport(group, inventory));
}

/**
 * Sorts class names alphabetically.
 *
 * @param names - Class names to sort.
 * @returns The same array, sorted in place.
 */
function sortNames(names: string[]): string[] {
  return names.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the names present in the source set but absent from the target set.
 *
 * @param source - Set of class names to inspect.
 * @param target - Set of class names to exclude.
 *
 * @returns Alphabetically sorted class names missing from the target set.
 */
function getNamesMissingFrom(
  source: Set<string>,
  target: Set<string>,
): string[] {
  return sortNames([...source].filter((name) => !target.has(name)));
}

/**
 * Builds the HTML/CSS class cross-reference.
 *
 * Includes the HTML class inventory with occurrence counts and matching
 * CSS definitions, as well as classes defined only in CSS or used only
 * in HTML.
 *
 * @param htmlInventory - HTML class names and their occurrence counts.
 * @param cssInventory - CSS class names and their definitions.
 *
 * @returns Class usage information and lists of unmatched class names.
 */
function generateClassInventory(
  htmlInventory: Map<string, number>,
  cssInventory: CssInventory,
) {
  const htmlClassNames = new Set(htmlInventory.keys());
  const cssClassNames = new Set(cssInventory.keys());

  const usedInHtml = [...htmlInventory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, occurrences]) => ({
      name,
      occurrences,
      cssDefinitions: cssInventory.get(name) ?? [],
    }));

  return {
    usedInHtml,
    definedButNotFoundInHtml: getNamesMissingFrom(
      cssClassNames,
      htmlClassNames,
    ),
    usedInHtmlWithoutCss: getNamesMissingFrom(htmlClassNames, cssClassNames),
  };
}

/**
 * Assembles the complete analysis report.
 *
 * @param htmlFiles - HTML files included in the analysis.
 * @param cssFiles - CSS files included in the analysis.
 * @param components - Reports for repeated structural groups.
 * @param htmlInventory - HTML class occurrence inventory.
 * @param cssInventory - CSS class definition inventory.
 *
 * @returns The report summary, component reports, and class cross-reference.
 */
function generateReport(
  htmlFiles: string[],
  cssFiles: string[],
  components: ReturnType<typeof generateComponents>,
  htmlInventory: Map<string, number>,
  cssInventory: CssInventory,
) {
  return {
    summary: {
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      repeatedStructures: components.length,
      htmlClasses: htmlInventory.size,
      cssClasses: cssInventory.size,
    },
    components,
    classInventory: generateClassInventory(htmlInventory, cssInventory),
  };
}

/**
 * Writes the analysis report as formatted JSON.
 *
 * @param report - Complete report to serialize.
 *
 * @returns A promise resolving to the output file path.
 */
async function writeReport(
  report: ReturnType<typeof generateReport>,
): Promise<string> {
  const output = path.resolve("dom-miner-report.json");

  await writeFile(output, JSON.stringify(report, null, 2), "utf8");

  return output;
}

/**
 * Prints a summary of the completed analysis to the console.
 *
 * @param htmlFiles - HTML files processed.
 * @param cssFiles - CSS files processed.
 * @param components - Repeated component reports generated.
 * @param htmlInventory - HTML class occurrence inventory.
 * @param cssInventory - CSS class definition inventory.
 * @param output - Path to the generated report.
 *
 * @returns Nothing. Writes the summary to standard output.
 */
function printSummary(
  htmlFiles: string[],
  cssFiles: string[],
  components: ReturnType<typeof generateComponents>,
  htmlInventory: Map<string, number>,
  cssInventory: CssInventory,
  output: string,
): void {
  console.log("Analysis completed.");
  console.log(`HTML Files: ${htmlFiles.length}`);
  console.log(`CSS Files: ${cssFiles.length}`);
  console.log(`Repeated Structures: ${components.length}`);
  console.log(`HTML Classes: ${htmlInventory.size}`);
  console.log(`CSS Classes: ${cssInventory.size}`);
  console.log(`Report: ${output}`);
}
