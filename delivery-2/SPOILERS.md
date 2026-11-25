# SPOILERS.md — Auditor Reference for Winston Round 2 (Free Flight / Pigeon Life)

> **AUDITOR ONLY.** This document sits outside `winston.html` per Spec §2c.6. None of the control bindings listed below appear in any player-visible text of `winston.html` outside the locked reference that unlocks only after all Packet Relay objectives are complete.

## 1. Control Bindings (Exact Binding Strings for Spoiler Grep)

Every binding string below is checked mechanically against `winston.html` (excluding `#winston-locked-ref`):

| Verb / Action | Exact Binding String | Behaviour |
|---|---|---|
| Steer / Pitch / Strut | `WASD` | `A`/`D` bank and yaw left/right (or turn on ground); `W`/`S` pitch nose down/up in flight (or strut forward on ground). |
| Flap / Take off | `press Space` | In flight: beat wings for forward thrust and lift (plays synthesized wingbeat). On ground or perched: take off. |
| Dive / Tuck | `hold Shift` | Tuck wings for a high-speed dive to evade the hawk or beat autopilot. |
| Land / Perch | `[C] land` | Flare wings to land on terrain, loft roofs, perchable trees, or the park statue. |
| Peck / Forage / Bathe | `[E] peck` | Eat nearby forage piles to restore hunger and stamina, or bathe when standing in a puddle. |
| Use / Carry / Nest | `[F] use` | Pick up or drop a carryable item (brass button, cedar twig, red ribbon, golden straw); dropping at LOFT-A or LOFT-B builds the nest. |
| Coo / Court / Socialize | `[Q] coo` | Synthesized coo that makes nearby people toss crumbs and builds courtship bond with the mate pigeon. |
| Camera View | `[V] view` | Toggle between third-person chase camera and first-person pigeon-eye camera. |
| Pause / Release Mouse | `Esc` | Always discoverable (§2c.5): pauses simulation and releases pointer lock. |

## 2. World Interactables, Life Cycle & Secrets (Round 2)

All positions are deterministic functions of the active world seed:

1. **Forage & Puddles:**
   - 6 seeded forage spots (`grain_barn`, `grain_loftb`, `woods_berries`, `town_crumbs`, `pond_seeds`, `meadow_clover`) plus dynamic tossed crumbs from people.
   - 3 puddles (`pond_edge`, `farm_puddle`, `town_fountain`) where `[E] peck` triggers bathing (`bird.baths++`, restores cleanliness and stamina).
2. **Boids Flock & Homing Sense:**
   - 12 individual boid pigeons (`world.boids`) orbit `world.flockCenter`; flying within 38 m applies gentle attraction and within 14 m marks `bird.flockJoined = true`.
   - Beyond 140 m from LOFT-A in Free Flight, a subtle homing pull nudges the bird homeward.
3. **Courtship, Nest, Egg & Squab:**
   - Mate pigeon (`world.mate`) waits near LOFT-B (`loftB.x - 12, z = 10`). Cooing (`[Q] coo`) within 15 m three times reaches `bird.courtship = 1.0`, sets `bird.hasMate = true`, and makes the mate follow you.
   - Carry at least 2 of the 4 nest items (`shiny_button`, `pinecone`, `ribbon`, `straw`) with `[F] use` to LOFT-A to lay an egg (`world.nest.hasEgg = true`). After 15 s, the egg hatches into a squab (`world.squab.hatched = true`, `world.loftPopulation++`) that grows and follows you in flight.
4. **People (4 NPCs):**
   - `farmer` near LOFT-A, `baker` in town square, `driver` by the shuttle road, and `kid` (Kid with Bread) in town park (`164, -90`). Cooing within 15 m makes each toss crumbs.
5. **Landmarks & Hidden Secrets (recorded in Field Journal, never controls):**
   - `loft_a`, `loft_b`, `windmill` (`-35, -135`), `pond_pier` (`-95, 85`), `bell_tower` (`185, -120`), `ridge_lookout` (`-190, -90`).
   - **Secret — `rfc1149_plaque`:** RFC 1149 Bronze Plaque at the farm gate (`0, 32`).
   - **Secret — `pigeon_museum`:** Tiny Pigeon Museum in town (`158, -134`).
   - **Secret — `park_statue`:** Town Square Statue (`170, -92`).
6. **Time, Weather & Web Audio:**
   - 7-minute day/night cycle (`world.dayTime`) with sun, moon, stars, and dawn/dusk lighting.
   - Web Audio API synthesizer (`Audio: Off/On` button) generates wingbeats, coos, wind, rain, distant town bell, and hawk cry with zero audio files.

## 3. Headless Auditor Entry Points

`window.__WINSTON__` (never exposed in UI):
- `window.__WINSTON__.core` — full simulation core.
- `window.__WINSTON__.getState()` — active mode, quality, `useThree`, objectives, `paramsHash`, bird telemetry.
- `window.__WINSTON__.setMode(mode)` / `window.__WINSTON__.setQuality(q)` / `window.__WINSTON__.getFrameTimes()` / `window.__WINSTON__.stepHeadless(inputs, freeMode)`.
