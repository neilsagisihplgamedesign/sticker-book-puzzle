# Sticker Book Puzzle Network

Plain JavaScript Phaser/Vite playable ad build for Sticker Book Puzzle.

## Brief Description

Sticker Book Puzzle is a portrait playable ad where the player drags numbered sticker items from the blue tray onto matching numbered outlines in a sticker-book scene. After the configured number of stickers is placed, the board fills with the remaining completed stickers and transitions to a full-screen end card with a clickable CTA.

## Controls and Interactions

- Drag a sticker from the blue tray with mouse or touch.
- Drop the sticker onto the matching numbered outline.
- Correct drops place the colored sticker and play feedback.
- Incorrect drops snap the item back to the tray.
- Background music starts after the first user interaction.
- The end card is clickable and routes through the configured ad network CTA flow.

## Requirements

- Node.js 20+ recommended
- npm

## Setup

Install dependencies from this project folder:

```sh
npm install
```

## Local Development

Run the Vite dev server:

```sh
npm run dev
```

Vite will print the local preview URL in the terminal.

## Quality Check

Run ESLint:

```sh
npm run lint
```

## Single HTML Build

Build one self-contained playable HTML:

```sh
npm run build
```

Output:

```txt
dist/index.html
```

The default single HTML build uses the `full` iteration. To build a specific local iteration:

```sh
PLAYABLE_ITERATION=10clk npm run build
PLAYABLE_ITERATION=60sec npm run build
PLAYABLE_ITERATION=full npm run build
```

On Windows PowerShell:

```powershell
$env:PLAYABLE_ITERATION='10clk'; npm run build
```

For `npm run dev`, set `DEFAULT_ITERATION_MODE` in `src/constants.js`, or set the environment variable before starting Vite.

## Network Builds

Build all configured ad network variants:

```sh
npm run build:networks
```

Outputs are written to:

```txt
dist/10clk/<Network>/
dist/60sec/<Network>/
dist/full/<Network>/
```

Iterations:

- `10clk`: end card after 10 correct sticker placements
- `60sec`: end card after 60 seconds from first interaction
- `full`: end card after the full sticker game

Configured networks:

- Applovin: HTML, injects `mraid.js`
- Google: ZIP, injects Google Exit API
- Ironsource: HTML, injects `mraid.js`
- Mintegral: ZIP, adds `body onload="gameReady()"`
- Facebook: HTML
- Unity: HTML, injects `mraid.js`
- Vungle: ZIP, injects `window.__VUNGLE__=true`
- Moloco: HTML

Each generated network HTML starts with a first-line network comment:

```html
<!-- ad-network: Applovin | al -->
```

The build script also strips `type="module"` and `crossorigin` from output scripts for ad network compatibility.

## Known Limitations

- Real-device testing is still required for final mobile audio behavior because browser and ad network autoplay policies vary.
- Network SDK behavior should be validated in each network preview tool, especially MRAID networks and zipped Google/Mintegral/Vungle builds.
- The playable is designed from a portrait composition. Landscape view scales the same composition rather than using a separate landscape layout.

## Main Files

- `src/main.js`: boot, DOM/MRAID readiness, Phaser mount, end-card setup
- `src/game.js`: Phaser gameplay scene
- `src/networks.js`: CTA, MRAID, lifecycle, analytics, pause/mute handling
- `src/constants.js`: tuning values, store URLs, sticker layout
- `scripts/build-all.mjs`: per-network output builder

## Store URLs

Store URLs are configured in `src/constants.js`:

- `IOS_STORE_URL`
- `ANDROID_STORE_URL`
