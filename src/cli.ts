#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { main } from "./index.ts";
import packageJson from "../package.json" with { type: "json" };

const args = process.argv.slice(2);
const { version } = packageJson;

await mainHandler();

async function mainHandler(): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) return displayHelp();
  if (args.includes("--version") || args.includes("-v"))
    return console.log(version);

  const directory = args[0];

  if (!(await validateDirectory(directory))) {
    process.exitCode = 1;
    return;
  }

  await main(directory);
}

function displayHelp(): void {
  console.log(`
  Usage: dom-miner <directory>

  Arguments:
    directory    Directory to analyze

  Options:
    -v, --version    Output version
    -h, --help       Display help
`);
}

async function validateDirectory(
  directory: string | undefined,
): Promise<boolean> {
  if (!directory || directory.startsWith("-")) {
    console.error("Error: directory is required.");
    console.error("Usage: dom-miner <directory>");
    return false;
  }

  try {
    const isDirectory = (await stat(directory)).isDirectory();

    if (!isDirectory) console.error(`Error: ${directory} is not a directory.`);

    return isDirectory;
  } catch {
    console.error(`Error: cannot access directory ${directory}.`);
    return false;
  }
}
