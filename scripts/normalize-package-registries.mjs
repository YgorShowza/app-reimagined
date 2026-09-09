import { readFile, writeFile } from "node:fs/promises";

const files = ["bun.lock", "server/package-lock.json"];
const officialRegistry = "https://registry.npmjs.org/";
const legacyCachePattern = /https:\/\/[a-z0-9-]+-npm\.pkg\.dev\/[^/\s"']+\/sandbox-npm-cache\//gi;

let changed = 0;

for (const file of files) {
  const original = await readFile(file, "utf8");
  legacyCachePattern.lastIndex = 0;
  const normalized = original.replace(legacyCachePattern, officialRegistry);

  legacyCachePattern.lastIndex = 0;
  if (legacyCachePattern.test(normalized)) {
    throw new Error(`Cache de pacote externo ainda presente em ${file}`);
  }
  legacyCachePattern.lastIndex = 0;

  if (normalized !== original) {
    await writeFile(file, normalized, "utf8");
    changed += 1;
  }
}

console.log(`Registro oficial npm aplicado a ${changed} lockfile(s) neste checkout.`);
