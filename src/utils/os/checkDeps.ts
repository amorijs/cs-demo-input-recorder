import { execSync } from "child_process";

let hasChecked = false;

export const checkDeps = async () => {
  if (hasChecked) return;

  console.log("Checking dependencies...\n");
  try {
    execSync("csdm --version", { stdio: "pipe" });
    console.log("✅ CS Demo Manager (csdm) - Found");
  } catch (error) {
    console.log("❌ CS Demo Manager (csdm) - Not found");
    console.log(
      "   Install from: https://cs-demo-manager.com/docs/installation"
    );
    process.exit(1);
  }

  // Check FFmpeg
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
    console.log("✅ FFmpeg - Found");
  } catch (error) {
    console.log("❌ FFmpeg - Not found");
    console.log("   Install from: https://ffmpeg.org/");
    process.exit(1);
  }

  console.log("\n🎉 All dependencies are installed!\n")
  hasChecked = true;
};
