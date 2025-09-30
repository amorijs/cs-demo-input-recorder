// concat.ts (or inline at bottom of index.ts)
import { $ } from "bun";
import { writeFileSync } from "fs";
import path from "path";

type RecordedSequence = {
  clipPath: string;
  startTick: number;
  endTick: number;
};

export async function concatOverlayClips({
  seqs,
  outFile,
  mode = "copy",
  outputDir,
}: {
  seqs: RecordedSequence[];
  outFile: string;
  mode?: "copy" | "reencode";
  outputDir: string;
}) {
  // Build the list from the known sequence order (don’t rely on directory lexicographic order)
  const overlayPaths = seqs.map((s) =>
    s.clipPath.replace(/\.mp4$/i, ".overlay.mp4")
  );

  // FFmpeg concat demuxer list file (absolute Windows paths need -safe 0)
  const listPath = path.join(outputDir, "overlay_list.txt");
  const listBody = overlayPaths
    .map((p) => `file '${p.replace(/\\/g, "/")}'`) // normalize slashes
    .join("\n");
  writeFileSync(listPath, listBody);

  // Fast path (no re-encode) vs. robust path (re-encode everything)
  const args =
    mode === "copy"
      ? [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          listPath,
          "-fflags",
          "+genpts",
          "-c",
          "copy",
          "-movflags",
          "+faststart",
          outFile,
        ]
      : [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          listPath,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "18",
          "-r",
          "60",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-ar",
          "48000",
          "-b:a",
          "160k",
          "-movflags",
          "+faststart",
          outFile,
        ];

  await $`ffmpeg ${args}`;
  return outFile;
}
