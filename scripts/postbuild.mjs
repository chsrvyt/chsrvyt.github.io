import { access, constants } from "node:fs/promises";
import { join } from "node:path";

/**
 * Post-export fixups for GitHub Pages.
 *
 * Asserts the two things that make a Pages deploy silently wrong rather than
 * loudly broken:
 *
 * `.nojekyll`.
 *    `public/.nojekyll` is copied by the export, but this asserts it, because
 *    if it is ever missing Pages runs Jekyll, Jekyll ignores every directory
 *    starting with an underscore, and the entire `_next` bundle vanishes. The
 *    site deploys "successfully" and renders as unstyled HTML.
 */

const OUT = "out";

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(join(OUT, ".nojekyll")))) {
  console.error(
    "postbuild: out/.nojekyll is missing — Pages would run Jekyll and drop /_next",
  );
  process.exit(1);
}

if (!(await exists(join(OUT, "index.html")))) {
  console.error("postbuild: out/index.html is missing — nothing to serve");
  process.exit(1);
}

console.log("postbuild: export verified");
