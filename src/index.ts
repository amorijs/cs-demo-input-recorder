import { parseEvents, parsePlayerInfo, parseTicks } from "@laihoe/demoparser2";
import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { TICKRATE } from "./constants";
import { type ButtonName, extractButtons } from "./utils/demo/buttons";
import { calculateVoiceIndices } from "./utils/demo/voiceIndices";
import { checkDeps } from "./utils/os/checkDeps";
import { cleanupAfterConcat } from "./utils/os/cleanup";
import { concatOverlayClips } from "./utils/video/concat";
import { buildRunsForClip, burnOverlayForClip } from "./utils/video/overlay";

const getPlayerNumbers = (
  demoPath: string
): { steamid: string; team_number: string; number: number }[] => {
  const playerInfo = parsePlayerInfo(demoPath);
  return playerInfo.map((p: any, i: any) => ({ ...p, number: i + 4 }));
};

const getInputData = ({
  demoPath,
  playerId,
}: {
  demoPath: string;
  playerId: string;
}): {
  buttons: ButtonName[];
  name: string;
  steamid: string;
  tick: number;
}[] => {
  const ticks = parseTicks(demoPath, ["buttons"], undefined, [playerId]);

  const output = ticks.map((t: any) => ({
    buttons: t.buttons ? extractButtons(t.buttons) : [],
    name: t.name,
    steamid: t.steamid,
    tick: t.tick,
  }));

  return output;
};

interface EventType {
  event_name:
    | "player_spawn"
    | "player_death"
    | "round_officially_ended"
    | "cs_win_panel_match";
  tick: number;
  user_steamid?: string;
  is_warmup_period?: boolean;
  isLastRound?: boolean;
}

const getSequences = ({
  demoPath,
  playerId,
}: {
  demoPath: string;
  playerId: string;
}) => {
  const events = (
    parseEvents(
      demoPath,
      [
        "player_spawn",
        "player_death",
        "round_officially_ended",
        "cs_win_panel_match",
      ],
      undefined,
      ["is_warmup_period"]
    ) as EventType[]
  )
    .filter((ev) => {
      if (ev.is_warmup_period) return false;

      const isThisPlayer = ev.user_steamid === playerId;
      const isPlayerEvent =
        isThisPlayer &&
        (ev.event_name === "player_spawn" || ev.event_name === "player_death");
      const isRoundEvent =
        ev.event_name === "round_officially_ended" ||
        ev.event_name === "cs_win_panel_match";

      return isPlayerEvent || isRoundEvent;
    })
    .filter((eventA, indexA, arr) => {
      // Remove any duplicate events
      return (
        arr.findIndex(
          (eventB) =>
            eventA.event_name === eventB.event_name &&
            eventA.tick === eventB.tick
        ) === indexA
      );
    })
    .map((ev, arr) => {
      // Subtract one from `round_officially_ended` tick to ensure it comes before next `player_spawn`
      return {
        ...ev,
        tick:
          ev.event_name === "round_officially_ended" ? ev.tick - 1 : ev.tick,
      };
    });

  let roundEndCounter = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const thisEvent = events[i]!;
    if (thisEvent.event_name === "cs_win_panel_match") {
      thisEvent.isLastRound = true;
      continue;
    }

    if (thisEvent.event_name === "round_officially_ended") {
      roundEndCounter += 1;
    }

    thisEvent.isLastRound = roundEndCounter === 0;
  }

  const sequences: [number, number][] = [];
  let spawnTick = -1;
  let finalSequenceAdded = false;

  events.forEach((ev: any, i: number) => {
    if (finalSequenceAdded) {
      console.log("Final sequence already added, skipping event");
      return;
    }

    // Check to see if we should start a sequence
    if (ev.event_name === "player_spawn") {
      console.log("Starting sequence");
      spawnTick = ev.tick + 10 * TICKRATE; // add 10 seconds after spawn
      return;
    }

    // Check to see if we should end a sequence
    if (spawnTick === -1) return; // not in a sequence

    if (ev.isLastRound) {
      console.log("Last round, ending sequence at last event");
      const matchWinEvent = events.find(
        (e) => e.event_name === "cs_win_panel_match"
      );

      if (!matchWinEvent) {
        throw new Error("No match win event found for last round");
      }

      sequences.push([spawnTick, matchWinEvent.tick]);
      spawnTick = -1;
      finalSequenceAdded = true;
      return;
    }

    const endSequence = (reason: string, additionalTicks: number) => {
      console.log("Ending sequence:", reason);
      sequences.push([spawnTick, ev.tick + additionalTicks * TICKRATE]);
      spawnTick = -1;
    };

    if (ev.event_name === "player_death") {
      return endSequence("Player death", 3);
    }

    if (ev.event_name === "round_officially_ended") {
      return endSequence("Round ended", 0);
    }

    console.warn(`Event skipped: ${ev.event_name}`); // should not happen
  });

  return sequences;
};

type RecordedSequence = {
  clipPath: string;
  startTick: number;
  endTick: number;
};

const recordSequences = async ({
  demoPath,
  playerId,
  sequences,
  outputPath,
}: {
  demoPath: string;
  playerId: string;
  sequences: [number, number][];
  outputPath: string;
}): Promise<RecordedSequence[]> => {
  // Create clips directory if it doesn't exist
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
    console.log(`Created clips directory: ${outputPath}`);
  }

  const allPlayerNumbers = getPlayerNumbers(demoPath);
  const thisPlayer = allPlayerNumbers.find((p) => p.steamid === playerId);
  const playersOnThisTeam = allPlayerNumbers
    .filter((p) => p.team_number === thisPlayer?.team_number)
    .map((p) => p.number);
  const voiceIndices = calculateVoiceIndices(playersOnThisTeam);

  const recordedSequences: RecordedSequence[] = [];

  for (let i = 0; i < sequences.length; i++) {
    const [start, end] = sequences[i]!;

    const args = [
      "video",
      demoPath,
      start.toString(),
      end.toString(),

      "--framerate",
      "60",

      "--width",
      "1920",

      "--height",
      "1080",

      "--encoder-software",
      "FFmpeg",

      "--ffmpeg-video-container",
      "mp4",

      "--player-voices",

      "--no-show-only-death-notices",

      "--no-show-x-ray",

      "--focus-player",
      playerId,

      "--output",
      outputPath,

      "--cfg",
      `safezonex "1"; safezoney "1"; tv_listen_voice_indices ${
        voiceIndices ?? -1
      }; tv_listen_voice_indices_h ${voiceIndices ?? -1};`,
    ];

    await $`csdm ${args}`;

    const clipPath = `${outputPath}\\sequence-1-tick-${start}-to-${end}.mp4`;
    console.log(clipPath);

    recordedSequences.push({
      clipPath,
      startTick: start,
      endTick: end,
    });
  }

  return recordedSequences;
};

const execute = async ({
  playerId = "76561198055776914",
  demoPath,
  outputDir,
}: {
  playerId?: string;
  demoPath: string;
  outputDir: string;
}): Promise<string> => {
  await checkDeps();

  const now = Date.now();
  // Confirm demo exists in csdm
  await $`csdm analyze ${demoPath}`;
  console.log(`Processing demo: ${demoPath}`);

  console.log(`Extracting sequences for user: ${playerId}`);
  const sequences = getSequences({
    demoPath,
    playerId,
  });
  console.log(`Found ${sequences.length} sequences`);

  console.log(`Recording sequences to: ${outputDir}`);
  const recordedSequences = await recordSequences({
    demoPath,
    playerId,
    sequences,
    outputPath: outputDir,
  });
  console.log(`Finished recording sequences`);

  console.log(`Getting input data from demo...`);
  const inputs = getInputData({
    demoPath,
    playerId,
  });
  console.log(`Got ${inputs.length} input ticks`);

  console.log(`Burning overlays into clips...`);
  for (let i = 0; i < recordedSequences.length; i++) {
    const seq = recordedSequences[i]!;
    const runs = buildRunsForClip(
      inputs.map((m) => ({ tick: m.tick, buttons: m.buttons })),
      seq.startTick,
      seq.endTick
    );

    const inPath = seq.clipPath;
    const outPath = inPath.replace(/\.mp4$/i, ".overlay.mp4");

    await burnOverlayForClip(inPath, outPath, runs);
  }
  console.log(`Finished burning overlays`);

  console.log(`Concatenating final video...`);
  const outFile = path.join(outputDir, `final.overlay_${Date.now()}.mp4`);
  const filePath = await concatOverlayClips({
    seqs: recordedSequences,
    outFile,
    mode: "copy",
    outputDir,
  });
  console.log(`Finished concatenation, final file: ${outFile}`);

  console.log(`Cleaning up temporary files...`);
  await cleanupAfterConcat({
    dir: outputDir,
    keepFiles: [path.basename(outFile)],
    dryRun: false,
  });
  console.log(`Cleanup complete.`);
  console.log(`All done! Process took ${(Date.now() - now) / 1000}s`);
  return filePath;
};

// Export for CLI usage
export { execute };
