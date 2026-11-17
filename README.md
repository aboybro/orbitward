# Orbitward

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/aboybro/orbitward/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/aboybro/orbitward/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original orbital tower-defense game, entered in
[make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

## The game

Twenty waves spiral in from the dark toward the station's core. Build
towers on the three orbit rings, spend kill gold on upgrades, and do not
let a single hostile touch the core.

- **Towers:** Pulse (rapid bolts), Lance (long piercing beam) and Frost
  (chills and slows the swarm) — each with 3 levels, built on 30 ring
  slots. Click a tower to upgrade it or sell it back.
- **Enemies:** Drifters, Swifts, Bulwarks, Splitters that burst into
  Motes, and a Warden boss every fifth wave. They spiral inward, faster
  and tougher every wave.
- **Campaign:** 20 waves. Clear one for a gold bonus; survive all 20 to
  win. Lose the core and the run ends. Best score is kept in your browser.
- **Feel:** synthesized WebAudio effects and a quiet sequencer, particles,
  screen shake, floating gold text, wave banners, pause, 2× fast-forward
  and mute.

## Controls

- Mouse: click a glowing slot to build, click a tower to upgrade/sell
- `1` / `2` / `3`: pick Pulse / Lance / Frost
- `Space`: start the next wave (or start / play again)
- `P` or `Esc`: pause · `F`: fast-forward · `M`: mute · `U`: upgrade · `X`: sell

## Play it

No build step, no network — just static files under `game/`. Serve them
and open the page:

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static file server and open `index.html`.

## Shots

`screenshots/` holds four renders of the game's own code, taken in
headless Chromium at 1280×720: the title screen, wave 7 in full swing,
the victory screen and the defeat screen. They are staged deterministically
with `?shot=start|play|victory|defeat&seed=7` (see `game/src/shots.js`).

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library
- `game/index.html` — the page; `game/src/` is the game, one job per file:
  `config` (balance), `random` (seeded RNG), `audio` (synth sound),
  `input`, `enemies`, `towers`, `projectiles`, `particles`, `layout`
  (click regions), `game` (state, waves, economy), `render` (all drawing),
  `shots` (deterministic screenshot scenes), `storage` (best run),
  `main` (bootstrap and loop)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `shots.json` — the four screenshot scenes

## License

MIT — see [LICENSE](LICENSE).
