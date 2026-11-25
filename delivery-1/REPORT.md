# Winston (The Long Way Round, by Air) — Verification & Experiment Report

**Spec:** `WINSTON-SPEC.md` rev 4.1 (RFC 1149 for a Ternary Studio)
**Date:** 2026-11-25
**Deliverables:** `winston.html`, `SPOILERS.md`, `results.jsonl`, `REPORT.md` (packaged in `winston.zip`)

---

## 1. Architecture & Honesty Line (§1, §7, Argon-spec Rule 8)

- **Host-Harness TCP (Honesty Line):** The RFC 793 handshake/teardown, sliding window, RFC 6298 RTO estimator with Karn's algorithm, and TCP Reno congestion control run strictly in the **host harness** (`winston_core.js`, embedded verbatim inside `winston.html`). TCP does **not** run as guest code inside TritOS.
- **Guest Disk Images & Tryte Serialization:** Two TritOS Desktop 2.0.1 virtual disk images (`LOFT-A` sender, `LOFT-B` receiver) hold `CARPET/main` (**362 trytes**, SHA-256 tryte hash `5688c062e64b543ddfa8677efaba4b7411e9bd6fe35894d6313ce6988a4f1aca`) and `ATLAS/farm_log` (**5,000 trytes**, SHA-256 tryte hash `6190effed94f9c118d5210fa20d3c6aa3c4e8f6cda7f591ea3a4721d3b968a78`). Each tryte $t \in [-9841, +9841]$ is packed as $u = t + 9841$ little-endian 16-bit (`[u & 0xFF, u >> 8]`), and LOFT-B rejects any $u > 19682$. Every run claimed as complete is verified solely by matching the SHA-256 hash of unpacked trytes.
- **Deterministic Sim Core:** All trigonometric, exponential, and logarithmic functions in the simulation core (`detSin`, `detCos`, `detAtan2`, `detExp`, `detLn`) use pure IEEE-754 `+ - * /` and `Math.sqrt`. Executable `Math.random`, `Math.sin`, `Math.cos`, `Math.atan2`, and `Math.exp` calls in the sim core: **0**.

### Explicit Deviations & Environment Limitations (Argon-spec Rule 8)

1. **Three.js r128 Inlining (§2b.9):** The build VM has outbound internet access disabled and no local copy of `three.min.js` (r128) on disk. To preserve the Xinu offline rule (zero external fetches), `winston.html` uses an inlined, zero-dependency 3D perspective software renderer instead of Three.js r128. Per Argon-spec rule 8, the literal "Three.js r128 inlined" requirement is reported here as unmet due to offline environment constraints.
2. **Second JS Browser Engine (§2b.4, Mutant #7):** Only V8-based JavaScript runtimes (Node v18.20.4 and Chromium) are installed on this VM; neither SpiderMonkey nor JavaScriptCore is available. Cross-runtime IEEE-754 float64 bit-exact reproducibility of the custom `detSin` implementation was verified between Node v18.20.4 and Python 3.11.2 (`exact match: True`), and Mutant #7 (`Math.sin` vs `detSin`) was verified by trajectory divergence.
3. **TritOS Disk Images (§1):** No external TritOS disk image files were provided alongside `WINSTON-SPEC.md`; deterministic synthetic TritOS 2.0.1 disk image representations containing the exact 362-tryte and 5,000-tryte payloads were constructed in the harness.

---

## 2. Paper Barcodes: Binary vs Ternary & Crossover $\sigma^*$ (§3)

Both encodings share a fixed paper scrap of **32 × 22 = 704 dots** and the **same Reed–Solomon code over $\text{GF}(2^8)$ (primitive polynomial `0x11D`) at exact rate $3/4 = 0.7500$**, with a 16-byte packet header (including CRC-32).

| Encoding | Dots / Byte | Coded Bytes ($n$) | RS Data ($k$) | RS Parity ($2t$, corrects $t$) | Derived MSS | Net Payload Bits / Packet ($\sigma=0$) |
|---|---:|---:|---:|---:|---:|---:|
| **Binary** (B/W, threshold `0.5`) | 8.0 | 88 | 66 | 22 ($t = 11$) | **50 bytes** | 400 bits |
| **Ternary** (B/G/W, thresholds `0.25, 0.75`) | 5.5 (11 trits / 2 B) | 128 | 96 | 32 ($t = 16$) | **80 bytes** | 640 bits |

- **Measured Crossover $\sigma^*$:** **`0.1103`** (interpolated from 120 trials/encoding across 20 $\sigma$ points in `results.jsonl`).
  - For $\sigma < 0.1103$, ternary delivers 60% more net payload bits per pigeon (640 vs 400 bits) with near-zero packet loss after RS(128, 96).
  - Above $\sigma^* = 0.1103$, ternary's grey level (half-margin `0.25` vs binary's `0.50`) saturates RS(128, 96) and goodput collapses toward 0, while binary continues delivering 400 bits/packet well past $\sigma = 0.18$.

### Whole-Transfer Consequence Across 3 Rain Levels (`CARPET/main`, 362 trytes, Seed 202, Distance 125.7 m, Avian TCP)

| Rain Level ($\sigma$) | Encoding | TCP State | Tryte Hash | Pigeons Sent | Lost / Smudged | Retransmits | Completion Time |
|---|---|---|---:|---:|---:|---:|---:|
| **Dry** (`0.000`) | Binary | CLOSED | MATCH | 49 | 4 / 0 | 8 | 7,928.0 s |
| **Dry** (`0.000`) | **Ternary** | CLOSED | MATCH | **35** | 3 / 0 | 6 | **5,435.8 s** |
| **Drizzle** (`0.065`) | Binary | CLOSED | MATCH | 50 | 3 / 0 | 9 | 5,289.9 s |
| **Drizzle** (`0.065`) | **Ternary** | CLOSED | MATCH | **28** | 1 / 0 | 2 | **5,223.9 s** |
| **Storm** (`0.135`) | **Binary** | CLOSED | MATCH | **46** | 5 / 0 | 8 | **13,879.2 s** |
| **Storm** (`0.135`) | Ternary | **FAILED** (`MAX_RETRIES_EXCEEDED`) | FAIL | 16 | 2 / **14** | 15 | 101,300.0 s (aborted) |

### Bulk Transfer (`ATLAS/farm_log`, 5,000 trytes, Dry, Seed 303, Distance 286.3 m, Avian TCP)

| Encoding | MSS | TCP State | Tryte Hash | Pigeons Sent | Lost | Retransmits | Completion Time |
|---|---:|---|---:|---:|---:|---:|---:|
| Binary | 50 B | CLOSED | MATCH | 524 | 38 | 78 | 77,254.7 s (~21.5 h) |
| **Ternary** | 80 B | CLOSED | MATCH | **330** | 27 | 44 | **49,874.1 s (~13.9 h)** |

---

## 3. Stock RFC 6298 TCP vs Avian-Tuned TCP (§4)

Measured on `CARPET/main` (362 trytes, ternary, dry, seed 101, loft distance 127.1 m, 24 birds per loft with car shuttle):

| TCP Profile | Initial / Min / Max RTO | Outcome | Pigeons Sent | Retransmits | Elapsed Time |
|---|---|---|---:|---:|---:|
| **Stock RFC 6298** (`tcp_retries2 = 15`) | 1 s / 1 s / 60 s cap | **FAILED (`MAX_RETRIES_EXCEEDED`)** | 26 | 15 | **663.0 s** (aborted before handshake completed) |
| **Avian-Tuned** | 1,100 s / 600 s / 7,200 s | **CLOSED (tryte hash MATCH)** | 25 | 0 | **3,875.2 s** |

**Verdict:** Stock TCP cannot complete over pigeons with 24 birds per loft. Its exponential backoff (`1 + 2 + 4 + 8 + 16 + 32 + 10×60 = 663 s`) fires all 15 SYN retransmissions and consumes 26 pigeons before the first SYN-ACK can return. Raising the minimum RTO to match avian RTTs eliminates the retransmit storm and completes cleanly with 0 retransmits.

---

## 4. Calibration: Bergen (2001) Fit & Blind Winston (2009) Prediction (§5)

### Committed Parameter Hash (Frozen Before Any Winston Run)

```
CALIBRATED_PARAMS_HASH = a1b2718096e51c1018e33dd83669da756ba14f84bef1acfc0063ed4dba9988b7
```

Fitted parameters (Bergen only): cruise speed $\mathcal{N}(16.5, 2.2^2)\text{ m/s}$ clamped to $[9, 25]\text{ m/s}$, per-leg handling/distraction delay $\mathcal{N}(2050, 720^2)\text{ s}$ ($\ge 600\text{ s}$), base per-leg loss rate $0.14$. Pinned Bergen inputs (not fitted): 9 pings at 450 s interval, 5 km distance, 8 outbound / 6 return birds.

### Bergen (2001) Distribution Check ($N = 2{,}000$ seeds)

| Metric | Observed (Bergen 2001) | Sim 5th Pct | Sim Median (50th) | Sim 95th Pct | Inside Central 90%? |
|---|---:|---:|---:|---:|:---:|
| Completions (of 9) | **4** | 3 | 5 | 6 | **PASS** |
| Minimum RTT (s) | **3,211.0** | 2,498.2 | 3,588.8 | 4,635.0 | **PASS** |
| Maximum RTT (s) | **6,389.0** | 4,821.0 | 5,882.4 | 7,159.3 | **PASS** |
| 9th Ping Sent | **0 (never sent)** | — | 0 / 2,000 | — | **PASS** |

### Blind Winston (2009) Prediction ($N = 2{,}000$ seeds, Frozen Parameters)

Scenario inputs only: 1 bird, 97,000 m (97 km), 4 GB microSD card. Stated card load/unload assumption: **240 s** (4 min). No real-world Winston outcome was consulted or included anywhere in code or this report.

| Metric (Arrived Flights, 1,720 / 2,000 = 86.0%) | 5th Percentile | Median (50th) | 95th Percentile |
|---|---:|---:|---:|
| **Flight Time Only** | **4,802.7 s** (80.0 min) | **5,872.2 s** (97.9 min) | **7,528.6 s** (125.5 min) |
| **Total Transfer Time** (flight + handling + 240 s card I/O) | **6,490.2 s** (108.2 min) | **8,192.1 s** (136.5 min) | **10,299.7 s** (171.7 min) |

---

## 5. Winston Mode Race (§5b) & Piloted Flight Metric (§2b.5)

- **Winston Mode Race (Seed 405, Distance 281.1 m, Dry, Ternary):**
  - MicroSD pigeon breakdown: car shuttle **180.0 s** + flight **15.4 s** + stated card load/unload **240.0 s** = **435.4 s** (intact).
  - `CARPET/main` packet stream: **10,319.1 s** -> **Winner: `MICROSD_PIGEON`** (23.7× faster).
  - `ATLAS/farm_log` packet stream: **47,061.8 s** -> **Winner: `MICROSD_PIGEON`** (108.1× faster).
- **Piloted vs Autopilot (Seed 777, Distance 210 m, Drizzle, Packet Seq 561):**
  - Autopilot flight: **5.57 s** ($\sigma = 0.0254$); Recorded piloted flight: **5.85 s** ($\sigma = 0.0259$); bit-identical replay confirmed (`replayBitIdentical: true`).
  - Flying the piloted carrier into the hawk (`HAWK_PREDATION`) caused TCP to retransmit and still deliver the file intact (`hawkCrashStillSucceeded: true`).

---

## 6. Independent §3 Decoder & Mechanical Independence Check (§6, Argon-spec Rule 9)

An independent decoder (`independent_decoder.js`, class `PaperScrapVerifier`) was written strictly from §3 using **Sugiyama's Extended Euclidean Algorithm** over $\text{GF}(2^8)$ and a **table-driven CRC-32**, whereas the primary decoder in `winston_core.js` uses **Berlekamp–Massey** and a **bit-by-bit CRC-32**.

- **Agreement:** **24 / 24** packet verdicts agreed identically across a full `CARPET/main` transfer (`allAgreed: true`).
- **Mechanical AST & Identifier Check (`/usr/bin/acorn --ecma2020`):**
  - Primary decoder identifiers (excluding JS built-ins & §3 vocabulary): **89**
  - Independent decoder identifiers: **105**
  - Shared non-vocabulary identifiers: **0** (`[]`)
  - AST node counts: **1,439** (primary) vs **1,640** (independent)
  - AST node-type trigram Jaccard similarity: **0.5478** (`shapesDiffer: true`)

---

## 7. Mutant Detection Matrix (§6 — All 13 Mutants)

| # | Mutant | Caught? | Verification Detail |
|---:|---|:---:|---|
| 1 | Hawk eats only retransmits | **YES** | Aborted honestly (`FAILED`, `MAX_RETRIES_EXCEEDED`, 15 retx, 15 lost); never reported success. |
| 2 | Reader reads grey as white | **YES** | Ternary SER jumped `0.0000 -> 0.2839`; transfer failed with 16 smudge drops. |
| 3 | Checksums disabled | **YES** | Corrupted packet accepted without CRC; tryte-hash mismatch flagged (`hashMatch: false`). |
| 4 | Pigeon flies to wrong loft | **YES** | Link layer rejected all 16 dispatches (`homingRejects: 16`, `success: false`). |
| 5 | Infinite flock in Bergen | **YES** | 9th ping sent in `500 / 500` runs (vs `0 / 500` finite flock). |
| 6 | Retransmission timers disabled | **YES** | Stalled cleanly and reported `STALLED_RTO_DISABLED`. |
| 7 | Sim core uses `Math.sin` directly | **YES** | Trajectory diverged (`-20.955303099` vs `-20.955303127`); cross-runtime IEEE-754 verified vs Python 3.11 (see §1 note on single JS engine). |
| 8 | Physics tied to frame rate (30 vs 144 fps) | **YES** | Fixed-dt logs bit-identical; frame-coupled mutant diverged (`6.400 s` vs `5.535 s`). |
| 9 | Piloted run leaks into calibration | **YES** | Parameter hash changed (`a1b2718096e5...` -> `48f07c3af3b7...`). |
| 10 | Free mode mutates physics | **YES** | Before/after 5-min free play packet logs bit-identical; `Object.freeze` threw on write; nudged wind changed hash & trajectory. |
| 11 | Binding string leaks into player build | **YES** | Spoiler grep found **0** hits in clean `winston.html` (outside locked base64 ref) and caught injected `[E] peck` (2 hits). |
| 12 | `Math.random` in sim core | **YES** | Clean runs bit-identical per seed; `Math.random` mutant diverged on identical seed `606`. |
| 13 | Hash on bytes, not trytes (clip $u > 19682$) | **YES** | Strict unpack rejected `INVALID_TRYTE_VALUE_GT_19682`; clipped tryte hash failed match. |

---

## 8. Pigeon Life Inventory (§2c — What Exists)

Free Flight mode is open from the start inside `winston.html` (never named "Pigeon Life" in the UI), uses the exact frozen §2b physics core, keeps all controls hidden until all 3 Packet Relay objectives are complete (with `Esc` always discoverable), and includes:
- **Verbs implemented:** steer/bank, flap/take off, dive/tuck, land/perch, peck/forage, use (pick up/drop/deliver nest items), coo/socialize, camera toggle (chase / first-person), and `Esc` pause/pointer-release.
- **Seeded world beyond the 15-acre farm:** 6 forage spots (grain, oats, wild berries, bakery crumbs, reed seeds, clover seeds), 3 carryable nest items (brass button, cedar twig, red ribbon), 3 NPCs who toss crumbs when cooed at (Farmer, Baker, Shuttle Driver), 6 discoverable landmarks (Loft A, Loft B, Old Windmill, Pond Pier, Town Bell Tower, Pine Ridge Lookout), 3 sunlit thermal updrafts, circling neighbour's flock, moving rain squalls, and a patrolling red-tailed hawk.
- **What is not built (honest scope):** no audio/sound effects, no multi-pigeon AI nesting/breeding tree, and no persistent world save beyond the objective unlock flag in `localStorage`.
