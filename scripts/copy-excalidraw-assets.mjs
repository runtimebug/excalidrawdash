// Copies Excalidraw's runtime assets (fonts + locale chunks) into /public so the
// editor works fully offline / self-hosted instead of fetching them from a CDN.
// Run automatically before `dev` and `build`.
import { cp, mkdir, access, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(
  root,
  "node_modules",
  "@excalidraw",
  "excalidraw",
  "dist",
  "excalidraw-assets"
);
const dest = join(root, "public", "excalidraw-assets");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(src))) {
    console.warn(
      "[excalidraw-assets] source not found at",
      src,
      "- skipping (will fall back to CDN)."
    );
    return;
  }

  // Skip the copy if it already looks populated (keeps dev startup fast).
  if (await exists(dest)) {
    const entries = await readdir(dest).catch(() => []);
    if (entries.length > 0) {
      console.log("[excalidraw-assets] already present, skipping copy.");
      return;
    }
  }

  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log("[excalidraw-assets] copied assets into public/excalidraw-assets");
}

main().catch((err) => {
  console.error("[excalidraw-assets] failed:", err);
  // Non-fatal: the editor will fall back to the CDN asset path.
});
