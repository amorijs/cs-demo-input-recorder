# Demo Recorder

CS2 demo to video tool that automatically extracts gameplay sequences and overlays input visualization for enhanced analysis and content creation.

![ezgif-4536771f1fc70e](https://github.com/user-attachments/assets/2436df1f-de4a-48f2-a990-e8b44e418403)

## Features

- 🎮 **Automatic sequence detection** - Intelligently identifies and extracts meaningful gameplay segments
- 🎯 **Player-focused recording** - Records from any player's perspective with team voice communication
- ⌨️ **Movement overlay visualization** - Real-time WASD, mouse, and key input display
- 🔄 **Interactive CLI** - User-friendly drag-and-drop interface for easy operation
- 🎬 **High-quality output** - 60fps H.264 video with audio preservation
- 🧹 **Automatic cleanup** - Cleans up temporary files after processing

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation and Usage](#installation-and-usage)
  - [Command Line Mode](#command-line-mode)
- [How It Works](#how-it-works)
- [Output](#output)
- [Overlay Visualization](#overlay-visualization)
- [Configuration](#configuration)
- [Example Output](#example-output)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Performance Tips](#performance-tips)
- [Known Bugs](#known-bugs)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Available Scripts](#available-scripts)
- [Credits](#credits)
- [Support](#support)

## Prerequisites

Before using this tool, you need to install the following dependencies:

### Required Dependencies

1. **PostgreSQL + CS Demo Manager (CSDM)**

   - Download and install from: https://cs-demo-manager.com/docs/installation
   - CSDM handles demo parsing and initial video recording
   - Requires PostgreSQL database for demo analysis

2. **FFmpeg**
   - Download from: https://ffmpeg.org/
   - Used for video processing and overlay rendering
   - Make sure `ffmpeg` is available in your system PATH

### Verification

The tool will automatically check for these dependencies when you run it. You should see:

```
🎮 Demo Recorder Interactive Setup

Checking dependencies...

✅ CS Demo Manager (csdm) - Found
✅ FFmpeg - Found

🎉 All dependencies are installed!
```

## Installation and Usage

1. **Download the latest build** from the [releases page](../../releases)

   - Always scan `.exe` files you download

2. **Extract the executable** to a directory of your choice

   - Recommended: create a new blank directory as the program will save files in the same location

3. **Run the program**: Double-click `cs_demo_input_recorder.exe` and follow the instructions - it should be self-explanatory

4. **Output location**: A new directory called "output" will be automatically created in the same directory after running the program. This is where temporary files and your final video will be saved

### Command Line Mode

For scripting or advanced usage (requires Bun or Deno):

```bash
bun run src/cli_base.ts -- --demoPath "path/to/demo.dem" --outputDir "output" --userId "76561198055776914"
```

## How It Works

1. **Demo Analysis**: Uses CSDM to analyze the demo file and extract player information
2. **Sequence Detection**: Automatically identifies gameplay sequences based on:
   - Player spawn events
   - Player death events
   - Round end events
   - Match end events
3. **Video Recording**: Records sequences using CSDM with:
   - Player-focused camera
   - Team voice communication
   - 60fps @ 1920x1080 resolution
4. **Input Overlay**: Extracts player input data and generates visual overlays showing:
   - Movement keys (WASD)
   - Action keys (Space, Ctrl, E, R, Shift)
   - Mouse buttons (M1, M2)
5. **Final Processing**: Concatenates all sequences into a single video file

## Output

The tool generates:

- Individual sequence videos (temporary)
- Overlay-enhanced versions of each sequence (temporary)
- Final concatenated video: `final.overlay_[timestamp].mp4`
- Automatic cleanup of temporary files

## Overlay Visualization

The movement overlay displays a keyboard layout showing:

```
    W   E   R
SHIFT A S D   M1
 CTRL  SPACE  M2
```

- **Active keys** are highlighted in cyan
- **Inactive keys** are shown with subtle backgrounds
- **Real-time feedback** synced to player input

## Configuration

Coming soon... feel free to raise requests in issues section.

## Example Output

```
🎮 Demo Recorder Interactive Setup

Checking dependencies...
✅ CS Demo Manager (csdm) - Found
✅ FFmpeg - Found
🎉 All dependencies are installed!

Drop your .dem file here (auto-detects when complete):
C:\path\to\demo.dem ✅ Auto-detected: C:\path\to\demo.dem

✅ Demo loaded: C:\path\to\demo.dem

Detected players:
1. Player1 (ID: 76561198...)
2. Player2 (ID: 76561198...)
...

Enter a number 1-10 of the player to record: 4

✅ Configuration:
Demo Path: C:\path\to\demo.dem
Output Directory: C:\path\to\output
Player name: SelectedPlayer (ID: 76561198...)

🚀 Starting processing...
Found 2 sequences
Recording sequences...
Burning overlays into clips...
Concatenating final video...
Cleaning up temporary files...

✅ Complete!
Final video: C:\path\to\output\final.overlay_1234567890.mp4
```

## Troubleshooting

### Common Issues

**"csdm command not found"**

- Ensure CS Demo Manager is properly installed and in your PATH
- Try restarting your terminal after installation

From the [csdm CLI page](https://cs-demo-manager.com/docs/cli):

If you have a message csdm not found, it means that the folder where the CLI executable csdm.exe is located is not in your PATH environment variable.
The default path is C:\Users\Username\AppData\Programs\CS Demo Manager and you can follow this guide to add it to your PATH variable.

**"ffmpeg command not found"**

- Install FFmpeg and ensure it's in your system PATH
- On Windows, you may need to add the FFmpeg bin directory to your PATH environment variable

**"Demo not found in database"**

- The tool automatically runs `csdm analyze` to import demos
- Large demos may take time to analyze on first run

**Fontconfig errors (Windows)**

- These are warnings from FFmpeg and don't affect functionality
- The errors don't impact video generation quality

### Performance Tips

- Use SSD storage for faster video processing
- Close unnecessary applications during processing
- Longer demos will take more time to process
- Consider processing only the last few sequences for quicker results

## Known Bugs

- **Jump detection issue**: Space (jump) isn't always registered correctly. Currently investigating if this is a CS2 demo parsing limitation or an issue with the input detection logic.

## Development

### Project Structure

```
src/
├── index.ts              # Main processing logic
├── cli_interactive.ts    # Interactive CLI interface
├── cli_base.ts          # Command-line interface
├── constants.ts         # Configuration constants
└── utils/
    ├── demo/
    │   ├── buttons.ts   # Input button mapping
    │   └── voiceIndices.ts # Voice channel calculation
    ├── os/
    │   ├── checkDeps.ts # Dependency verification
    │   └── cleanup.ts   # File cleanup utilities
    └── video/
        ├── concat.ts    # Video concatenation
        ├── overlay.ts   # Overlay generation
        └── getClipDurationSec.ts # Duration utilities
```

### Available Scripts

```bash
bun run dev          # Run in development mode
bun run build        # Build for production
bun run compile      # Create standalone executable
```

## Credits

- Built with [Bun](https://bun.sh/) runtime
- Uses [@laihoe/demoparser](https://github.com/laihoe/demoparser) for demo parsing
- Powered by [CS Demo Manager](https://cs-demo-manager.com/) for video recording
- Video processing with [FFmpeg](https://ffmpeg.org/)

## Support

If you find this tool useful and would like to support its development, consider buying me a coffee! ☕

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/chrisamori)
