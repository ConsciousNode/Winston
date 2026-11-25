# Winston (Round 2) — Measured Verification & Experiment Report

*Generated programmatically from `results.jsonl` by `tests/generate-report.js`. Every numeric value below is measured.*

## 1. Artifact Integrity, Three.js r128 Inlining & Offline Audit

- **Shipped `winston.html` SHA-256:** `64996a47ebf68cd851d6beb5989526cab94abe03ebab3ea2d5562f7407b41837`
- **Sim Core (`#winston-sim-core`) SHA-256:** `26b2c984c9c8ed9d74161393a9c68d7348d6446c92fdfe0b88d9b8097e768372`
- **Inlined Three.js r128 (`#three-r128`) SHA-256:** `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2` (expected `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2`, 603,445 bytes, MIT notice present: **true**)
- **External URLs in HTML:** **0** | **Browser network requests:** **0** | **Browser console SEVERE errors:** **0**
- **Banned `Math.*` executable calls in sim core:** **0** | **Mutant switches in shipped HTML:** **0**
- **Headless Node vs Real Browser bit-identical sim check (seeds 101, 202, 777):** **PASS** (`t101=a6c610dda57b`, `f777=a743cbde9548`, `b1=8ee7fa43db6d`)

**Honesty Line (§1 & Argon-spec Rule 8):**
- TCP (RFC 793, RFC 6298 + Karn, Reno) runs strictly in the host harness, never as TritOS guest code.
- No external TritOS disk images were provided; deterministic synthetic TritOS 2.0.1 disk image representations holding `CARPET/main` (362 trytes) and `ATLAS/farm_log` (5,000 trytes) are used.
- Only V8-based JS engines (Node v18.20.4 and Chromium 156) are installed on this VM; Mutant #7 is verified via trajectory divergence (`detSin` vs native `Math.sin`) and Node-vs-Chromium bit-identity.

## 2. Bergen (2001) Fitter, Identifiability & Side-by-Side Blind Winston (2009) Predictions

- **Fitter reproducibility (fixed seed set `1..2000`):** **PASS**
- **Identifiability verdict:** **14 / 14** speeds in `8..34 m/s` pass every Bergen central-90% check (passing: `8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34`; failing: `none`). Because Bergen is only 5 km, cruise speed is **not identified** by Bergen alone — changes in speed are absorbed by per-leg handling delay. Therefore `speedMeanMps = 16.5 m/s` (~59.4 km/h, homing pigeon cruise literature) is explicitly labeled as a **prior**.

### Side-by-Side Parameter Sets & Blind Winston (2009) Predictions (N = 2,000 seeds each, zero Winston outcomes used)

| Metric | Round 1 Frozen (Unchanged) | Round 2 Bergen Fitter (Prior speed = 16.5 m/s) |
|---|---:|---:|
| Parameter Hash | `a1b2718096e51c10...` | `d53944911d0f3a2e...` |
| Speed Mean (**Prior**) | 16.5 m/s | 16.5 m/s |
| Handling Mean / SD (Fitted) | 2050.0 / 720.0 s | 2030 / 1070 s |
| Base Loss Prob (Fitted) | 0.14 | 0.22 |
| Bergen Objective / All Central-90% Pass | 1.7974 / **true** | 1.0406 / **true** |
| Bergen Completions p5–p50–p95 (obs 4) | 3–5–6 | 3–5–6 |
| Bergen Min RTT p5–p95 (obs 3211 s) | 2498.2–4635.0 s | 1956.2–4897.2 s |
| Bergen Max RTT p5–p95 (obs 6389 s) | 4821.0–7159.3 s | 4543.0–8125.9 s |
| **Blind Winston Flight p5 / p50 / p95** | **4802.7 / 5872.2 / 7528.6 s** | **4791.0 / 5864.5 / 7515.7 s** |
| **Blind Winston Total p5 / p50 / p95** | **6490.2 / 8192.1 / 10299.7 s** | **6267.4 / 8212.7 / 10613.9 s** |
| Blind Winston Arrival Rate | 86.0% | 78.7% |

### Bergen Speed Identifiability Table (8–34 m/s, 1,000 verification seeds per speed)

| Speed Mean (m/s) | Fitted Handling Mean (s) | Fitted Handling SD (s) | Fitted Loss | Objective | Comp p5–p95 | Min RTT p5–p95 (s) | Max RTT p5–p95 (s) | Central-90% Pass? |
|---:|---:|---:|---:|---:|---:|---:|---:|:---:|
| 8 | 1595 | 1170 | 0.24 | 0.0425 | 2–6 | 2328.7–4874.8 | 4488.7–8281.9 | **PASS** |
| 10 | 1780 | 1150 | 0.23 | 0.0234 | 3–6 | 2155.1–4864.8 | 4480.6–8306.2 | **PASS** |
| 12 | 1870 | 1130 | 0.22 | 1.0192 | 3–6 | 2040.4–4862.2 | 4508.8–8208.6 | **PASS** |
| 14 | 1950 | 1130 | 0.26 | 0.0491 | 2–6 | 1947.9–4993.9 | 4382.6–8242.1 | **PASS** |
| 16 | 2005 | 1110 | 0.22 | 1.0154 | 3–6 | 1888.3–4851.3 | 4569.6–8198.8 | **PASS** |
| 18 | 2055 | 1110 | 0.22 | 1.0118 | 3–6 | 1811.8–4873.9 | 4593.7–8216.9 | **PASS** |
| 20 | 2095 | 1090 | 0.22 | 1.0171 | 3–6 | 1807.2–4871.1 | 4611.2–8169.4 | **PASS** |
| 22 | 2145 | 1090 | 0.22 | 1.0239 | 3–6 | 1810.7–4930.4 | 4648.2–8222.1 | **PASS** |
| 24 | 2145 | 1110 | 0.24 | 0.0157 | 2–6 | 1750.7–4980.8 | 4595–8248 | **PASS** |
| 26 | 2175 | 1070 | 0.22 | 1.0256 | 3–6 | 1818.9–4920.3 | 4635–8149.4 | **PASS** |
| 28 | 2200 | 1090 | 0.22 | 1.0179 | 3–6 | 1789.6–4950.2 | 4654.3–8237 | **PASS** |
| 30 | 2200 | 1070 | 0.22 | 1.0233 | 3–6 | 1793.8–4911.1 | 4630.8–8150.2 | **PASS** |
| 32 | 2200 | 1070 | 0.22 | 1.0211 | 3–6 | 1774.8–4886.1 | 4608.5–8130.1 | **PASS** |
| 34 | 2225 | 1070 | 0.23 | 0.0260 | 3–6 | 1783.1–4906 | 4631.7–8162.4 | **PASS** |

## 3. Paper Barcodes, Crossover σ*, TCP, Rain Matrix & Winston Race

- **Derived MSS (704-dot scrap, RS rate 0.75 over GF(2⁸)):** Binary **50 bytes**, Ternary **80 bytes**.
- **Measured Crossover σ\*:** **`0.1101`**
- **Independent §3 Decoder (`tests/independent_decoder.js`):** **24/24** packet verdicts agreed, **0** shared non-vocabulary identifiers, AST node counts **1410** vs **1640**, AST trigram Jaccard **0.5654**.
- **Stock vs Avian TCP (`CARPET/main`, seed 101):** Stock **FAILED** (`MAX_RETRIES_EXCEEDED`, 26 pigeons, 15 retx, 663 s) vs Avian **CLOSED** (tryte hash match: **true**, 25 pigeons, 0 retx, 3875.2 s).
- **Winston Mode Race (seed 405, 240 s card I/O assumption):** `CARPET/main` winner **MICROSD_PIGEON** (435.4 s vs 10319.1 s); `ATLAS/farm_log` winner **MICROSD_PIGEON** (435.4 s vs 47061.8 s).
- **Piloted vs Autopilot (seed 777, 210 m):** Autopilot **5.567 s** (σ=0.0254) vs Piloted **5.85 s** (σ=0.0259), bit-identical replay: **true**.

### Whole-Transfer Matrix (`CARPET/main` across 3 rain levels + `ATLAS/farm_log` 5,000 trytes)

| File | Rain (σ) | Encoding | State | Hash Match | Pigeons | Lost / Smudged | Retx | Time (s) |
|---|---|---|---|---|---:|---:|---:|---:|
| CARPET/main | dry (0) | binary | CLOSED | true | 49 | 4 / 0 | 8 | 7928 |
| CARPET/main | dry (0) | ternary | CLOSED | true | 35 | 3 / 0 | 6 | 5435.8 |
| CARPET/main | drizzle (0.065) | binary | CLOSED | true | 50 | 3 / 0 | 9 | 5289.9 |
| CARPET/main | drizzle (0.065) | ternary | CLOSED | true | 28 | 1 / 0 | 2 | 5223.9 |
| CARPET/main | storm (0.135) | binary | CLOSED | true | 46 | 5 / 0 | 8 | 13879.2 |
| CARPET/main | storm (0.135) | ternary | FAILED | false | 16 | 2 / 14 | 15 | 101300 |
| ATLAS/farm_log | dry (0) | binary | CLOSED | true | 524 | 38 / 0 | 78 | 77254.7 |
| ATLAS/farm_log | dry (0) | ternary | CLOSED | true | 330 | 27 / 0 | 44 | 49874.1 |

## 4. Real-Browser Pixel Test, Free-Play Isolation & Performance Benchmarks

- **Browser & Method:** Chromium 156 + ANGLE SwiftShader WebGL at **1280x720**, loaded offline via CDP `Page.setDocumentContent`, WebGL Three.js active: **true**.
- **Pixel Color-Cluster Check (lower half, >= 3 distinct clusters required):** Packet Relay **5** clusters, Free Flight **4** clusters; under flat-ground mutant (#16): **1** clusters (**CAUGHT**).
- **Free-Play Isolation (5 simulated minutes = 18,000 ticks):** Before/after packet logs bit-identical: **true** (`d32aa2da10ae`), `Object.freeze` enforced: **true**.

### Measured Frame Times by Quality Preset (`1280×720`, Chromium SwiftShader Software WebGL)

| Quality Preset | Measured Frames | Mean Frame Time (ms) | Median p50 (ms) | p95 (ms) | Est. FPS (SwiftShader CPU) |
|---|---:|---:|---:|---:|---:|
| **LOW** | 51 | 40.2 | 33.4 | 66.7 | 24.9 |
| **MEDIUM** | 37 | 53.6 | 50 | 83.3 | 18.7 |
| **HIGH** | 29 | 62.07 | 66.6 | 83.4 | 16.1 |

*Note: Frame times above were measured on headless CPU software WebGL (SwiftShader); hardware-accelerated integrated GPUs render substantially faster at the same draw call count.*

## 5. Complete Mutant Detection Matrix (All 17 Mutants — Injected In-Memory)

| # | Mutant | Caught? | Measured Verification |
|---:|---|:---:|---|
| 1 | Hawk eats only retransmits | **YES** | state=FAILED, reason=MAX_RETRIES_EXCEEDED, retx=15 |
| 2 | Reader reads grey as white | **YES** | baseSER=0.0000, mutSER=0.2801, ok=false |
| 3 | Checksums disabled | **YES** | tryteHashMatch=false |
| 4 | Pigeon flies to wrong loft | **YES** | homingRejects=16, ok=false |
| 5 | Infinite flock in Bergen | **YES** | ninthSent=300/300 (expected 0/300) |
| 6 | Retransmission timers disabled | **YES** | state=FAILED, retx=0, reason=MAX_SIM_TIME_EXCEEDED |
| 7 | Sim core uses Math.sin directly | **YES** | cleanX=-29.238598987, mutX=-29.238599014 |
| 8 | Physics tied to frame rate (30 vs 144 fps) | **YES** | 30fpsT=5.533, 144fpsT=5.576 |
| 9 | Piloted run leaks into calibration | **YES** | frozen=a1b2718096e5, leaked=48f07c3af3b7 |
| 10 | Free mode mutates physics | **YES** | hashChanged=true, logChanged=true |
| 11 | Binding string leaks into player build | **YES** | injectedHits=2 |
| 12 | Math.random in sim core | **YES** | sameSeedDiverged=true |
| 13 | Hash on bytes, not trytes (clip u > 19682) | **YES** | strictErr=INVALID_TRYTE_VALUE_GT_19682, clippedHashDiff=true |
| 14 | Inlined Three.js altered by 1 byte | **YES** | mutatedSha=54a51066471a |
| 15 | Sim core calls into Three.js | **YES** | ReferenceError: THREE is not defined |
| 16 | Renderer paints ground single flat colour | **YES** | flatClusters=1 |
| 17 | Fitter peeks at sealed dummy constant | **YES** | cleanInv=true, leakyDiv=true |

## 6. Pigeon Life (Free Flight) Inventory — What Exists & What Doesn't

- **What exists and is exercised:**
  - Three.js r128 seeded 3D world: vertex-colored rolling heightfield terrain (patchwork fields, plowed earth, gravel road, cobblestone town, woods floor, pond basin), reflective pond + wooden pier, instanced farm fence posts, ~120 instanced perchable trees, LOFT-A & LOFT-B, spinning Old Windmill, small town (cottages, Bell Tower, telegraph poles & wires), moving red shuttle car, day/night sun/moon/stars & dynamic sky/fog, and visible 3D rain squalls + raindrops sharing weather state with Packet Relay.
  - Pigeon behaviours: hunger & stamina, perching on terrain/trees/roofs, pecking/foraging, bathing in puddles, strutting on ground, 12-boid neighbour's flock, patrolling/swooping hawk, gentle homing sense pull, courtship with a mate pigeon, nest building at LOFT-A from carried items, egg laying and hatching into a following squab.
  - People & Secrets: Farmer, Baker, Shuttle Driver, Kid with Bread; hidden RFC 1149 Bronze Plaque, Tiny Pigeon Museum, and Town Square Park Statue; in-world Field Journal recording discoveries only (never controls).
  - Web Audio API synthesizer (zero audio files, toggleable): wingbeats, coos, wind, rain, distant town bell, hawk cry.
  - Hidden controls: zero spoilers outside the locked base64 reference (spoiler grep hits: **0**); `Esc` always pauses and releases pointer.
- **What does not exist (honest scope):**
  - No multi-season snow/autumn texture swaps, no real-time dynamic shadow maps (omitted to keep SwiftShader/iGPU performance crisp), and no full multi-generation flock genealogy beyond the first mate + hatched squab.
