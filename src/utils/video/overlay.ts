import { $ } from "bun";
import { writeFileSync } from "fs";
import path from "path";
import { TICKRATE } from "../../constants";
import type { ButtonName } from "../demo/buttons";
import { getConfig } from "../../config";

type TickRec = { tick: number; buttons: ButtonName[] };
type Run = { btn: ButtonName; t0: number; t1: number }; // seconds within this clip

const ALL_BTNS: ButtonName[] = [
  "IN_FORWARD",
  "IN_BACK",
  "IN_MOVELEFT",
  "IN_MOVERIGHT",
  "IN_JUMP",
  "IN_DUCK",
  "IN_USE",
  "IN_RELOAD",
  "IN_ATTACK",
  "IN_ATTACK2",
  "IN_SPEED",
];

export function buildRunsForClip(
  ticks: TickRec[],
  startTick: number,
  endTick: number
): Run[] {
  // Only ticks that land in this clip
  const windowed = ticks
    .filter((t) => t.tick >= startTick && t.tick <= endTick)
    .sort((a, b) => a.tick - b.tick);

  const active: Partial<Record<ButtonName, number>> = {}; // btn -> t0 (sec within clip)
  const runs: Run[] = [];
  const tickToLocalSec = (tick: number) => (tick - startTick) / TICKRATE;

  for (const t of windowed) {
    const nowSec = tickToLocalSec(t.tick);
    const pressed = new Set(t.buttons);

    for (const btn of ALL_BTNS) {
      const on = pressed.has(btn);
      const open = active[btn];

      if (on && open == null) {
        active[btn] = nowSec; // open
      } else if (!on && open != null) {
        runs.push({ btn, t0: open, t1: nowSec });
        delete active[btn];
      }
    }
  }

  // close any still open at the end of clip
  const clipEndSec = (endTick - startTick) / TICKRATE;
  for (const [btn, t0] of Object.entries(active)) {
    runs.push({ btn: btn as ButtonName, t0: t0!, t1: clipEndSec });
  }
  return runs;
}

const tiles = {
  // Top row: W E R
  IN_FORWARD: { x: 210, y: 500, w: 80, h: 80, label: "W" },
  IN_USE: { x: 300, y: 500, w: 80, h: 80, label: "E" },
  IN_RELOAD: { x: 390, y: 500, w: 80, h: 80, label: "R" },

  // Middle row: SHIFT A S D
  IN_SPEED: { x: 20, y: 590, w: 90, h: 80, label: "SHIFT" },
  IN_MOVELEFT: { x: 120, y: 590, w: 80, h: 80, label: "A" },
  IN_BACK: { x: 210, y: 590, w: 80, h: 80, label: "S" },
  IN_MOVERIGHT: { x: 300, y: 590, w: 80, h: 80, label: "D" },

  // Bottom row: CTRL (wide)
  IN_DUCK: { x: 20, y: 680, w: 90, h: 80, label: "CTRL" },
  IN_JUMP: { x: 120, y: 680, w: 260, h: 80, label: "SPACE" },

  // Mouse buttons on the right
  IN_ATTACK: { x: 390, y: 590, w: 90, h: 80, label: "M1" },
  IN_ATTACK2: { x: 390, y: 680, w: 90, h: 80, label: "M2" },
} as const;

function staticLayerFilter() {
  // Enhanced styling for better visibility

  // Dark background panels with rounded corners effect
  const backgrounds = Object.values(tiles)
    .map(
      (t) =>
        // Dark semi-transparent background
        `drawbox=x=${t.x - 2}:y=${t.y - 2}:w=${t.w + 4}:h=${
          t.h + 4
        }:color=black@0.3:t=fill`
    )
    .join(",");

  // Subtle outline borders // disabled for cleaner look
  // const outline = Object.values(tiles)
  //   .map((t) =>
  //     `drawbox=x=${t.x}:y=${t.y}:w=${t.w}:h=${t.h}:color=white@0.3:t=2`
  //   )
  //   .join(",");

  // Enhanced labels with shadow effect - better centering
  const labelShadows = Object.values(tiles)
    .map((t) => {
      // Better centering calculation - use text_w and text_h for precise centering
      const centerX = `${t.x} + (${t.w} - text_w) / 2 + 1`;
      const centerY = `${t.y} + (${t.h} - text_h) / 2 + 1`;
      return `drawtext=text='${t.label}':x=${centerX}:y=${centerY}:fontcolor=white@0.9:fontsize=28:box=0`;
    })
    .join(",");

  const labels = Object.values(tiles)
    .map((t) => {
      // Better centering calculation
      const centerX = `${t.x} + (${t.w} - text_w) / 2`;
      const centerY = `${t.y} + (${t.h} - text_h) / 2`;
      return `drawtext=text='${t.label}':x=${centerX}:y=${centerY}:fontcolor=white@0.95:fontsize=28:box=0`;
    })
    .join(",");

  return `${backgrounds},${labelShadows},${labels}`;
}

function runsToFilter(runs: Run[]) {
  // First pass: create the fill effects without extra padding
  const buttonEffects = runs
    .map(({ btn, t0, t1 }) => {
      const t = (tiles as any)[btn];
      if (!t) return null;

      const timeRange = `between(t,${t0.toFixed(3)},${t1.toFixed(3)})`;

      // Single layer effect for pressed buttons - no extra padding
      const effects = [
        // Main button fill with bright color - same size as inactive buttons
        `drawbox=x=${t.x}:y=${t.y}:w=${t.w}:h=${t.h}:color=cyan@0.8:t=fill:enable='${timeRange}'`,
      ];

      return effects.join(",");
    })
    .filter(Boolean)
    .join(",");

  // Second pass: add enhanced text visibility when buttons are active
  const activeLabels = runs
    .map(({ btn, t0, t1 }) => {
      const t = (tiles as any)[btn];
      if (!t) return null;

      const timeRange = `between(t,${t0.toFixed(3)},${t1.toFixed(3)})`;

      // Clean dark text for active buttons - no shadow
      const centerX = `${t.x} + (${t.w} - text_w) / 2`;
      const centerY = `${t.y} + (${t.h} - text_h) / 2`;

      // Just clean dark text that shows well against cyan background
      return `drawtext=text='${t.label}':x=${centerX}:y=${centerY}:fontcolor=white@0.9:fontsize=28:box=0:enable='${timeRange}'`;
    })
    .filter(Boolean)
    .join(",");

  return [buttonEffects, activeLabels].filter(Boolean).join(",");
}

function buildFilterGraphForClip(runs: Run[]) {
  const base = staticLayerFilter();
  const active = runsToFilter(runs);
  const config = getConfig();
  // format to rgba so alpha blending is consistent
  return `[0:v]format=rgba${config.hideInactive ? "" : "," + base}${active ? "," + active : ""}[vout]`;
}

export async function burnOverlayForClip(
  inPath: string,
  outPath: string,
  runs: Run[]
) {
  const filter = buildFilterGraphForClip(runs);
  const outputDir = path.dirname(outPath);
  const filterPath = path.join(outputDir, "filter.txt");
  writeFileSync(filterPath, filter);

  const args = [
    "-y",
    "-i",
    inPath,
    "-filter_complex_script",
    filterPath,
    "-map",
    "[vout]",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-vsync",
    "cfr",
    "-r",
    "60", // <= lock to CFR 60fps
    "-c:a",
    "copy",
    outPath,
  ];

  await $`ffmpeg ${args}`;
}
