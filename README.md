# DOM Miner

DOM Miner is a command-line tool for identifying repeated HTML structures and comparing HTML class usage against CSS selectors in legacy projects.

It helps surface potential refactoring opportunities during manual modernization. It does not rewrite HTML or CSS, or decide which structures should become components.

## What It Does

- Finds repeated HTML structures by comparing their element hierarchy and order.
- Reports where each occurrence appears in the source files.
- Lists the classes used at each element position in the repeated structure.
- Extracts class selectors from CSS and their source locations.
- Compares HTML class usage with CSS definitions, including classes defined in CSS but not found in the analyzed HTML.

## Usage

Run DOM Miner against the directory containing the HTML and CSS files you want to inspect:

```powershell
.\exec\dom-miner.exe .\path\to\project
