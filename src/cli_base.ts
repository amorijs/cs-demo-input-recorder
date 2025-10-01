import { parseArgs } from "util";
import { execute } from "./index.ts";

const { values } = parseArgs({
  args: Bun.argv.slice(2), // Skip 'bun' and script name
  options: {
    demoPath: {
      type: "string",
    },
    outputDir: {
      type: "string",
    },
    userId: { type: "string" },
    selfRun: { type: "boolean", default: true },
  },
  strict: true,
  allowPositionals: false,
});

if (
  values.selfRun &&
  (!values.demoPath || !values.outputDir || !values.userId)
) {
  console.error(
    "Usage: bun run src/index.ts -- --demoPath <path> --outputDir <dir> --userId <steamid>"
  );
  process.stdout.write("Press enter to exit");
  for await (const _ of console) {
    process.exit(1);
  }
  process.exit(1);
}

await execute({
  demoPath: values.demoPath!,
  outputDir: values.outputDir!,
  playerId: values.userId!,
});
