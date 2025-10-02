import { parsePlayerInfo } from "@laihoe/demoparser2";
import { $ } from "bun";
import { existsSync } from "fs";
import path from "path";
import * as readline from "readline";
import { execute } from "./index.ts";
import { checkDeps } from "./utils/os/checkDeps.ts";
import { updateConfig } from "./config.ts";

// Helper function to open files/directories cross-platform
const openPath = async (path: string) => {
  if (process.platform === "win32") {
    // Windows - use cmd /c start which works in any shell
    await $`cmd /c start "" "${path}"`;
  } else if (process.platform === "darwin") {
    // macOS
    await $`open "${path}"`;
  } else {
    // Linux
    await $`xdg-open "${path}"`;
  }
};

// Create a fresh question function that creates its own readline interface
const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

// Auto-detecting file input function with hybrid approach
const getDemoFile = (): Promise<string> => {
  return new Promise((resolve) => {
    console.log("Drop your .dem file here (auto-detects when complete): ");

    let inputBuffer = "";
    let isResolved = false;

    // Create readline interface but don't use question() yet
    const fileRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Listen to raw input for auto-detection
    const dataHandler = (data: Buffer) => {
      if (isResolved) return;

      inputBuffer += data.toString();

      // Clean the input (remove quotes and trim)
      const cleaned = inputBuffer.trim().replace(/['"]/g, "");

      // Check if we have a complete .dem file path (auto-detection)
      if (cleaned.endsWith(".dem") && existsSync(cleaned)) {
        console.log(`✅ Auto-detected: ${cleaned}`);
        isResolved = true;

        // Clean up listeners
        process.stdin.removeListener("data", dataHandler);
        fileRl.close();

        // Small delay to ensure input buffer is clear for next readline interface
        setTimeout(() => resolve(cleaned), 50);
        return;
      }

      // If user pressed Enter, validate the input
      if (inputBuffer.includes("\n")) {
        const path = cleaned.replace(/\n/g, "");
        if (path) {
          if (!path.endsWith(".dem")) {
            console.log("❌ Please provide a .dem file");
            inputBuffer = "";
            process.stdout.write(
              "Drop your .dem file here (auto-detects when complete): "
            );
          } else if (!existsSync(path)) {
            console.log(`❌ File not found: ${path}`);
            inputBuffer = "";
            process.stdout.write(
              "Drop your .dem file here (auto-detects when complete): "
            );
          } else {
            // Valid file entered manually
            console.log(`✅ File loaded: ${path}`);
            isResolved = true;
            process.stdin.removeListener("data", dataHandler);
            fileRl.close();
            setTimeout(() => resolve(path), 50);
          }
        } else {
          inputBuffer = "";
        }
      }
    };

    // Add the data listener for auto-detection
    process.stdin.on("data", dataHandler);
  });
};

async function main() {
  console.log("🎮 Demo Recorder Interactive Setup\n");
  await checkDeps();

  const demoPath = await getDemoFile();
  const csdmAnalyze = $`csdm analyze ${demoPath}`;
  console.log("Working...");
  await csdmAnalyze;

  const playerInfo = parsePlayerInfo(demoPath);

  console.log(`\n✅ Demo loaded: ${demoPath}\n`);

  let selectedPlayerNumber = parseInt(
    await question(
      `Detected players:\n${playerInfo
        .map((p: any, i: number) => `${i + 1}. ${p.name} (ID: ${p.steamid})`)
        .join("\n")}\n\nEnter a number 1-${
        playerInfo.length
      } of the player to record: `
    ),
    10
  );

  while (
    typeof selectedPlayerNumber !== "number" ||
    isNaN(selectedPlayerNumber) ||
    selectedPlayerNumber < 1 ||
    selectedPlayerNumber > playerInfo.length
  ) {
    selectedPlayerNumber = parseInt(
      await question(
        `Invalid selection. Please enter a number 1-${playerInfo.length}: `
      ),
      10
    );
  }

  let rounds = await question(
    `\n\nSpecify the round numbers you want to record separated with commas \n\ne.g. 1,3,6 \n\nLeave it blank if you want to record full game: `
  )

  const player = playerInfo[selectedPlayerNumber - 1]!;
  const playerId = player.steamid;

  const outputDir = path.normalize(`${process.cwd()}\\output`);
  console.log(`Using output directory: ${outputDir}`);
  // Make sure output directory exists
  await $`mkdir -p ${outputDir}`;

  updateConfig({ demoPath, outputDir, userId: playerId, rounds });
  console.log(`\n✅ Configuration:`);
  console.log(`Demo Path: ${demoPath}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Player name: ${player.name} (ID: ${playerId})`);

  console.log("\n🚀 Starting processing...");
  const outputFilePath = path.normalize(
    await execute()
  );

  // console.log("\n✅ Complete! Press any key to exit...");
  // process.stdin.setRawMode(true);
  // process.stdin.resume();
  // process.stdin.on("data", () => process.exit(0));

  console.log("\n✅ Complete!");
  console.log({ outputFilePath, outputDir });
  while (true) {
    const option = await question(
      "\nWhat would you like to do next?\n1. Open the file\n2. Open the directory\n3. Close the program\nEnter a number (1-3): "
    );
    if (option === "1") {
      try {
        await openPath(outputFilePath);
        console.log("File opened!");
      } catch (e) {
        console.error(`Failed to open file: ${e}`);
      }
      continue;
    } else if (option === "2") {
      try {
        await openPath(outputDir);
        console.log("Directory opened!");
      } catch (e) {
        console.error(`Failed to open directory: ${e}`);
      }
      continue;
    } else if (option === "3") {
      console.log("Goodbye!");
      process.exit(0);
    } else {
      console.log("Invalid option. Please enter 1, 2, or 3.");
    }
  }
}

main().catch(console.error);
