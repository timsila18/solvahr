import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src/components", "src/app"];
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

const PATTERNS = [
  {
    name: "button-without-handler",
    test: (openingTag) =>
      openingTag.startsWith("<button") &&
      !openingTag.includes("type=\"submit\"") &&
      !openingTag.includes("type='submit'") &&
      !openingTag.includes("onClick=") &&
      !openingTag.includes("disabled") &&
      !openingTag.includes("aria-disabled"),
    message: "Button looks clickable but has no onClick, submit behavior, or disabled state.",
  },
  {
    name: "dummy-href",
    test: (openingTag) => /(href=["']#["'])/.test(openingTag),
    message: "Anchor uses href=\"#\" placeholder.",
  },
  {
    name: "noop-click",
    test: (openingTag) =>
      /onClick=\{\s*\(\)\s*=>\s*(\{\s*\}|undefined|null)\s*\}/.test(openingTag),
    message: "onClick handler is effectively a no-op.",
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

async function main() {
  const findings = [];

  for (const target of TARGETS) {
    const fullTarget = join(ROOT, target);
    try {
      const targetStat = await stat(fullTarget);
      if (!targetStat.isDirectory()) continue;
    } catch {
      continue;
    }

    const files = await walk(fullTarget);

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const openingTagRegex = /<(button|a)\b[\s\S]*?>/g;

      for (const match of source.matchAll(openingTagRegex)) {
        const openingTag = match[0];
        const line = getLineNumber(source, match.index ?? 0);

        for (const pattern of PATTERNS) {
          if (pattern.test(openingTag)) {
            findings.push({
              file: relative(ROOT, file),
              line,
              type: pattern.name,
              message: pattern.message,
            });
          }
        }
      }
    }
  }

  if (findings.length === 0) {
    console.log("UI action audit passed with no suspicious clickable controls.");
    process.exit(0);
  }

  console.log("UI action audit found suspicious controls:");
  for (const finding of findings) {
    console.log(`- ${finding.file}:${finding.line} [${finding.type}] ${finding.message}`);
  }

  process.exit(1);
}

await main();
