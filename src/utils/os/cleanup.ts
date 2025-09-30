import { promises as fs } from "fs";
import path from "path";

/**
 * Delete all segment/overlay/temp files, keep only the final output(s).
 * By default it keeps "final.overlay.mp4" in OUTPUT_PATH.
 */
export async function cleanupAfterConcat({
  dir,
  keepFiles = ["final.overlay.mp4"], // basenames to keep
  dryRun = false,                    // set true to preview deletions
}: {
  dir: string;
  keepFiles?: string[];
  dryRun?: boolean;
}) {
  // fail-safe: only clean if the final output exists
  const finals = await Promise.all(
    keepFiles.map(async f =>
      fs.stat(path.join(dir, f)).then(() => true).catch(() => false)
    )
  );
  if (!finals.some(Boolean)) {
    console.warn("[cleanup] Final output not found; aborting cleanup.");
    return;
  }

  // files we consider disposable in this workflow
  const DELETE_PATTERNS: RegExp[] = [
    /^sequence-\d+-tick-\d+-to-\d+\.mp4$/i,
    /^sequence-\d+-tick-\d+-to-\d+\.overlay\.mp4$/i,
    /^clip_\d+\.mp4$/i,
    /^clip_\d+\.overlay\.mp4$/i,
    /^filter\.txt$/i,
    /^overlay_list\.txt$/i,
  ];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const toDelete: string[] = [];

  for (const e of entries) {
    if (!e.isFile()) continue;
    const base = e.name;

    // keep finals
    if (keepFiles.includes(base)) continue;

    // match disposables
    if (DELETE_PATTERNS.some(re => re.test(base))) {
      toDelete.push(path.join(dir, base));
    }
  }

  if (!toDelete.length) {
    console.log("[cleanup] nothing to delete");
    return;
  }

  console.log(`[cleanup] deleting ${toDelete.length} files`);
  for (const f of toDelete) {
    if (dryRun) {
      console.log("[cleanup] would delete:", f);
    } else {
      await fs.rm(f, { force: true });
    }
  }
}
