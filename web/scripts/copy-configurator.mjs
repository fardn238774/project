import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The kaido 3D configurator lives at the repo root (it is the user's own file
 * and the prototype iframes it from there). Next can only serve static files
 * from public/, but the file is ~44MB of base64-embedded GLB models — copying
 * it into the repo would commit a second 44MB blob.
 *
 * So: keep one source of truth at the root, and copy it into public/ at
 * dev/build time. public/kaido-multicar-garage.html is gitignored.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "kaido-multicar-garage.html");
const target = join(here, "..", "public", "kaido-multicar-garage.html");

const mtime = async (p) => {
  try {
    return (await stat(p)).mtimeMs;
  } catch {
    return null;
  }
};

const sourceTime = await mtime(source);
if (sourceTime === null) {
  console.warn(
    "[configurator] kaido-multicar-garage.html not found at the repo root — the Modification Studio's 3D tab will 404.",
  );
} else {
  const targetTime = await mtime(target);
  if (targetTime !== null && targetTime >= sourceTime) {
    console.log("[configurator] public copy is current.");
  } else {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    console.log("[configurator] copied to public/.");
  }
}
