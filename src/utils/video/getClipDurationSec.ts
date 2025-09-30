import { $ } from "bun";

export async function getClipDurationSec(file: string) {
  try {
    const out = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`.text();
    const secs = parseFloat(out.trim());
    // round up to the next frame
    return Math.ceil(secs * 60) / 60;
  } catch {
    return null;
  }
}