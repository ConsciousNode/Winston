# SPOILERS.md — Auditor Reference for Winston (Free Flight / Pigeon Life)

> **AUDITOR ONLY.** This document sits outside `winston.html` per Spec §2c.6. None of the control bindings listed below appear in any player-visible text of `winston.html` outside the locked reference that unlocks only after all Packet Relay objectives are complete.

## 1. Control Bindings (Exact Binding Strings for Spoiler Grep)

Every binding string below is checked mechanically against `winston.html` (excluding the locked reference payload):

| Verb / Action | Exact Binding String | Behaviour |
|---|---|---|
| Steer / Bank | `WASD` | `A`/`D` bank and yaw left/right (or waddle turn on ground); `W`/`S` pitch down/up in flight (or waddle forward on ground). |
| Flap / Take off | `press Space` | In flight: beat wings for forward thrust and lift (consumes stamina/fatigue). On ground: take off into flight. |
| Dive / Tuck | `hold Shift` | Tuck wings for a high-speed dive (useful for outrunning the hawk or beating autopilot). |
| Land / Perch | `[C] land` | Flare wings and descend to land/perch when close to terrain or a landmark roof. |
| Peck / Forage | `[E] peck` | Peck at the ground or nearby forage piles (grain, wild berries, bakery crumbs, reed/clover seeds) to eat and recover stamina. |
| Use / Carry / Drop | `[F] use` | Pick up a nearby carryable item (brass button, cedar twig, red ribbon) in your beak, or drop it; dropping near LOFT-A or LOFT-B decorates the nest. |
| Coo / Socialize | `[Q] coo` | Coo to nearby people (Farmer, Baker, Shuttle Driver) so they toss crumbs, or greet the neighbour's flock. |
| Camera View | `[V] view` | Toggle between third-person chase camera and first-person pigeon-eye camera. |
| Pause / Release Mouse | `Esc` | Always discoverable (§2c.5): pauses simulation and releases pointer lock. |

## 2. World Interactables by Category (§2c.3)

All positions are deterministic functions of the active world seed:

1. **Forage** (6 seeded spots + dynamic tossed crumbs):
   - `grain_barn` — Spilled grain near LOFT-A (`loftA.x + 18, z = 22`). Reachable by landing and pecking (`[E] peck`).
   - `grain_loftb` — Oats tray near LOFT-B (`loftB.x - 16, z = -18`).
   - `woods_berries` — Wild berries in the western woods (`x = -130, z = -75`).
   - `town_crumbs` — Bakery crumbs in the eastern town square (`x = 172, z = -102`).
   - `pond_seeds` — Reed seeds by the southern pond (`x = -72, z = 96`).
   - `meadow_clover` — Clover seeds in the south meadow (`x = 45, z = 115`).
2. **Flock**:
   - Neighbour's circling flock (`world.flockCenter`) orbits near the farm perimeter; flying within 38 m applies a gentle attraction pull, and flying within 14 m marks `bird.flockJoined = true`.
3. **Weather**:
   - Shared rain squalls (`world.squalls`) drift with wind `(windX, windZ)` and continuously accumulate `bird.rainExposure`, which directly sets the paper barcode smudge level `sigma`.
   - Three sunlit thermal updrafts (`world.thermals`) over the hills/meadow provide `+5.0` to `+5.5 m/s^2` vertical lift when soaring inside their radius.
4. **Threats**:
   - Territorial red-tailed hawk (`world.hawk`) patrols above the farm and pursues airborne pigeons within 42 m (`hawkAggroRadius`). In Packet Relay mode, contact within 3.2 m causes `HAWK_PREDATION` (triggering TCP retransmission). In Free Flight mode, the hawk chases without killing the bird, and can be evaded by diving (`hold Shift`), banking, or landing (`[C] land`).
5. **People** (3 NPCs):
   - `farmer` near LOFT-A (`loftA.x + 14, z = 16`)
   - `baker` in town square (`x = 176, z = -105`)
   - `driver` by the shuttle car (`x = 0, z = -28`)
   - Flying or landing within 15 m and cooing (`[Q] coo`) makes the person toss fresh crumbs (`tossed_<id>`) onto the ground.
6. **Landmarks** (6 perchable/discoverable sites):
   - `loft_a` (Loft A Roof), `loft_b` (Loft B Roof), `windmill` (Old Windmill at `-35, -135`), `pond_pier` (Pond Pier at `-95, 85`), `bell_tower` (Town Bell Tower at `185, -120`), `ridge_lookout` (Pine Ridge Lookout at `-190, -90`). Flying within 12 m registers discovery.
7. **Carryable Nest Items** (3 items, interacted via `[F] use`):
   - `shiny_button` (brass button in town), `pinecone` (cedar twig in woods), `ribbon` (red ribbon in farm yard). Delivering any item to LOFT-A or LOFT-B increments `bird.nestItems`.

## 3. Unlockable Reference Condition

The in-game Key Reference button unlocks automatically when all three Packet Relay objectives are completed:
1. Complete a Packet Relay transfer with a verified tryte-hash match.
2. Complete a Piloted Packet flight and replay it.
3. Complete a Winston Mode race.

Unlock state is persisted in `localStorage` under key `winston_relay_objectives_v1` inside a `try/catch` block.

## 4. Headless Auditor Entry Points

`winston.html` exposes `window.__WINSTON__` (no UI button or debug menu exposes it):
- `window.__WINSTON__.core` — full simulation core (`runTcpTransfer`, `runSingle3DFlight`, `runBergenScenario`, `runWinstonBlindScenario`, `runWinstonRace`, `runBarcodeSweep`, `CALIBRATED_PARAMS`, `CALIBRATED_PARAMS_HASH`, `stepFlightSim`, `createWorld`, `createBird`).
- `window.__WINSTON__.getState()` — inspect current UI/sim state, active bird telemetry, and objective progress.
- `window.__WINSTON__.setMode(mode)` — switch between `'relay'` and `'free'`.
- `window.__WINSTON__.stepHeadless(inputsArray)` — drive the active 3D sim tick-by-tick headlessly.
