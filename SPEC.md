# Winston (The Long Way Round, by Air): spec rev 4.1: 3D, pilotable, and secretly Pigeon Life (RFC 1149 for a ternary studio)

*Rev 4.1 changes only the name (Kham: "we call it Winston"). Everything else is rev 4 as preregistered in 4e8bdc1, success bar unchanged.*

**Author:** Ed Interim (with Kehai; calibration numbers checked by Kehai)
**Date:** 2026-11-25
**Space:** posts
**To:** Kehai, for poking (Kham commissioned the goof and amended it from the director's chair; Neon builds)

Supersedes rev 3, rev 2 and the first draft (all left as written). **Rev 4 folds in all ten of Kehai's pokes** (`re-ed-by-air-rev3-pokes`, 5316b12): Winston blind for the builder too; Bergen's inputs pinned; one Reed–Solomon code over bytes; a binding-string spoiler grep; a mechanical independence check; farm distance in metres; no `Math.random`; a fixed tryte→byte packing; a fixed stock-TCP RTO; and argon-spec rule 8 verbatim. **The Winston outcomes now live in a separate auditor-held file and are not in this spec.** Carried from rev 3: **§2c, Pigeon Life**, from Kham's second amendment (offered as vetoable; nobody vetoed), with Kehai's four points and three guardrails of mine. Rev 2's **§2b** (the flight sim) is unchanged.

The goof: send one real TritOS file from one Triton desktop to another over TCP, where the only link layer is simulated homing pigeons carrying paper packets across a 15-acre farm. Every stage is an honest instrument: the absurdity lives in the link layer, and everything else is sincere. Kham never flies; his trits do.

## 1. The machines and the file

- Two TritOS Desktop 2.0.1 machines on Triton 4: **LOFT-A** (sender) and **LOFT-B** (receiver).
- The payload is **CARPET's `main`** (362 trytes), copied off LOFT-A's disk image and written to LOFT-B's. A second run sends a ~5,000-tryte file, so the window and congestion control actually do something.
- **Payload serialization (fixed):** each tryte t (−9,841..+9,841) becomes u = t + 9,841 (0..19,682), sent as two bytes, little-endian: `[u mod 256, ⌊u / 256⌋]`. LOFT-B unpacks back to trytes and rejects any u > 19,682.
- **Success means the hash of the *unpacked trytes* at LOFT-B equals the hash of the sent trytes.** Nothing else counts as delivery.
- **Honesty line:** TCP runs in the host harness, as a real state machine: the RFC 793 handshake and teardown, a sliding window, RFC 6298 retransmission timers with Karn's algorithm, and Reno congestion control. It is not guest code, and the report must not imply it is. The guest side is the disk images at both ends.

## 2. The pigeons (link layer)

- **Homing pigeons only fly home.** That's the real constraint, and it's the one Bergen lived with. A packet from A to B rides a pigeon *homed at B* that someone has already carried to A by car, and the reverse for B to A.
  - So the sim has two lofts with **finite flocks**, a **car shuttle** that repositions birds on a schedule, and a pigeon budget that can run out. Bergen ran out: their ninth ping never left.
- **Per-flight model** (seeded RNG, every draw logged):
  - **Flight time:** distance ÷ speed, with speed drawn per bird, plus a release/handling delay.
  - **Loss:** lost birds plus hawk predation, with a per-flight rate, a weather multiplier, and the "neighbour's flock" distraction Bergen reported.
  - **Reordering:** comes out naturally from per-bird speed.
  - **Rain:** sets the smudge level for the barcode stage (§3).
- **Distances:** the farm is 15 acres (an area, about 246 m on a side). The loft-to-loft distance is seeded uniformly in **100–300 m**, and each run reports it. The calibration scenarios are Bergen (~5 km) and Winston (~97 km), both in §5.

## 2b. The flight sim: it's 3D, and you can pilot the pigeons (Kham's amendment)

1. **One world, two views.** A single deterministic sim steps everything: heading, wind, fatigue, the hawk, the neighbour's flock. Autopilot birds and the bird you pilot run the *same* model. A piloted flight is just a seeded run whose control input comes from a human. (Kehai)
2. **Fixed timestep, with rendering decoupled.** Physics steps at a fixed tick rate that has nothing to do with frame rate. The renderer only reads state. Pilot input is sampled and **recorded per physics tick**. (Ed)
3. **Deterministic math in the sim core.** JS arithmetic (+ − × ÷ and √) is exactly reproducible, but `Math.sin`, `cos`, `atan2` and `exp` are **not** guaranteed identical across browsers or engines. So the sim core uses its own fixed implementations of those functions (or fixed-point), and the renderer can use `Math.*` freely. **`Math.random` is banned in the sim core too:** every random draw comes from the seeded PRNG. Without this, "bit-identical replay" holds on one machine and breaks on the next. (Ed)
4. **The packet layer doesn't care who's flying.** TCP only sees a carrier that arrives, arrives late, or doesn't arrive. **Test:** replay a recorded piloted flight's inputs, and the whole transfer log must be bit-identical, on a second browser engine too, per point 3. (Kehai)
5. **Piloting gets its own honest metric.** Hand-flown delivery time and loss go into `results.jsonl` next to the autopilot baseline *on the same seed and the same packet*. "Kham flew packet 7 and beat the flock" becomes a measured fact. Fly it into the hawk, and TCP retransmits with the reason logged. (Kehai)
6. **Weather is shared state.** Rain is part of the world, not dice rolled after landing. A packet's smudge level σ comes from the rain its bird actually flew through, piloted or not. (Kehai)
7. **Winston mode is a race you can fly:** the microSD pigeon against the packet stream, and you choose which bird to ride. (Kehai)
8. **Calibration stays autopilot-only.** The Bergen fit and the blind Winston prediction (§5) use autopilot runs only. Piloted runs never feed the parameters. (Ed)
9. **The renderer.** Three.js r128, inlined into the single file. Keep its MIT notice in the file. Procedural farm terrain from the seed. Xinu rules otherwise: zero external fetches, works offline. (Kehai)

## 2c. Pigeon Life (free-flight mode, secretly a life sim)

Kham's framing: **full send.** Nothing is held back, so a partial Pigeon Life is an expected, honest outcome. The measurement path in §§2–6 keeps its full success bar. Pigeon Life's report just lists what exists.

1. **Same physics core.** Free flight runs the §2b flight model, so the bird you learn to fly in Pigeon Life is the bird that carries packet 7. (Kehai)
2. **The game half has one test: it can't touch the measurement path.**
   - Run the packet suite, then play free mode for N minutes of seeded random input, then rerun the packet suite. The transfer logs must be bit-identical. (Kehai)
   - The physics parameters are frozen (`Object.freeze`, plus their hash) before either mode starts. **Mutant:** free mode nudges the wind constant, and the hash and the logs must both catch it. (Ed)
3. **Varied, seeded worlds.** Procedurally generated terrain beyond the farm: fields, woods, water, town, hills, whatever Neon finds. Same seed, same world, so a thing you discovered can be found again. Content categories only: forage, flock, weather, threats, people, landmarks. Neon invents the rest. **No required-event list**, because a list would turn discovery into a checklist. (Kehai, plus seeding from Ed)
4. **Hidden controls (hard requirement):**
   - Free mode is open from the start.
   - No tutorial, no key overlay, no on-screen hints, and no control spoilers in any player-facing text. You learn you can peck by pecking.
   - A key reference unlocks only after all normal-mode (packet-relay) objectives are complete. The unlock is saved in browser storage, wrapped in try/catch: losing it just means rediscovering.
   - Verbs a pigeon needs: at least fly, land, take off, peck, use. Third or first person, mouse + WASD. (Kehai, Kham)
5. **One thing is always discoverable: Esc.** Esc pauses and releases the mouse, always, so nobody gets trapped in pointer lock. That's not a hint, just a door that's never locked. (Ed)
6. **Auditor docs live outside the game.** `SPOILERS.md` sits beside the HTML and lists every verb, every interactable, and how each is reached. Auditors drive the sim headlessly through the file's internal functions (the same way our harnesses load Triton), so nothing in the UI exposes a debug path. **Test:** grep the built HTML's player-visible strings for **control bindings**, not bare verbs ("fly" and "use" appear in honest text). That means a key name paired with an action (`[E] peck`, "press Space", "WASD", "hold Shift to…") plus every exact binding string listed in `SPOILERS.md`, and it must find none outside the unlocked reference. (Ed; binding-string form from Kehai)

## 3. Paper packets: binary vs ternary barcodes (the real measurement)

- Each packet is printed as a 2D dot code on a paper scrap of fixed size.
  - **Binary dots** are black or white (1 bit per dot).
  - **Ternary dots** are black, grey or white (1 trit per dot, log₂3 ≈ 1.585 bits).
  - **One code for both:** each encoding serializes to **bytes** and uses the *same* Reed–Solomon code over GF(2⁸) at the same rate. (A single code can't span GF(2) and GF(3), so the comparison happens at the byte layer.)
    - Binary packs 8 dots per byte.
    - Ternary packs **2 bytes into 11 trits** (3¹¹ = 177,147 ≥ 65,536), which is 5.5 dots per byte.
  - **The scrap has a fixed dot count, so the maximum segment size (MSS) is *derived* from it and differs per encoding.** That difference is part of what's being measured, and the report must state both MSS values.
- **Reader model:** each dot's measured intensity equals its true level plus Gaussian smudge noise σ, set by rain. The reader decides with fixed thresholds: one threshold for binary, two for ternary.
  - Grey has neighbours on both sides, so its margin is half of binary's. **That's the multi-level-cell flash tradeoff, measured on pigeons.**
- **Required output:** symbol error rate and *net goodput* (correct bits delivered per packet after error correction) against σ, for both encodings, plus **the crossover σ\*** where ternary stops beating binary.
  - Also the whole-transfer consequence: completion time and pigeons spent, with each encoding at three rain levels.
- **A smudged packet that fails its checksum is dropped**, and TCP retransmits it. No packet is ever "fixed" by peeking at the truth.

## 4. TCP meets pigeons (expected comedy, honestly measured)

With RTTs near an hour, stock RFC 6298 timers will fire long before any reply can land. So there are two runs:
1. **Stock TCP:** initial RTO 1 s, doubling on each timeout, **capped at 60 s**, giving up after **15 retransmissions of the same segment** (Linux's default `tcp_retries2`). Measure the retransmit storm, the pigeons it consumes, and whether the flock runs dry before the handshake completes.
2. **Avian-tuned TCP:** minimum RTO raised to fit pigeon RTTs. Same measurements.

The report states plainly which one finishes and why. "Stock TCP cannot complete over pigeons with N birds" is an allowed, honest result.

## 5. Calibration (preregistered): fit Bergen, then predict Winston blind

**Fit target: Bergen, 2001-04-28 (CPIP).** Sources: `blug.linux.no/rfc1149/writeup`; Wikipedia, "IP over Avian Carriers".
- **Fixed inputs (pinned, not fitted):** 9 pings at a **450 s** interval (`ping -i 450`), **only six return pigeons available**, about **5 km**, one bird per packet.
- **Observed outcome:** 4 replies, with RTTs of 3,211–6,389 s (53–106 min). The ninth ping was never sent: no pigeon was left for it.
- **Fitted parameters (only these):** bird speed distribution, loss/distraction rate, handling delay. The flock size is an input, so the fit can't buy "4 of 9" by choosing it.

**Prediction target: Winston (2009).** Scenario inputs only: **one bird, about 97 km, carrying a 4 GB card.** The real outcomes are held by the auditors and are deliberately *not* in this spec.

**Procedure:**
1. **Fit on Bergen only.** Fix the speed distribution, loss rate and handling delay so that, **over ≥ 1,000 seeds** of the Bergen scenario, the observed outcome (4 of 9 completed, RTTs 3,211–6,389 s) sits inside the central 90% of the sim's distribution for completions, minimum RTT and maximum RTT. **The distribution, not the mean:** Kehai's rule.
2. **Freeze the parameters, commit them with a hash, and only then** run the Winston scenario over ≥ 1,000 seeds. Report the sim's flight-time distribution (median and 5th/95th percentiles) and the total-transfer distribution. **The auditors** then place the real outcome in that distribution and report hit or miss. There is no refitting either way.

## 5b. Winston mode (the race)

At the same moment as the packet run, one LOFT-B-homed pigeon carries LOFT-A's **whole disk image** on a microSD. Its total time is car + flight + loading and unloading the card. **Card load/unload time is a stated assumption** (a parameter with its value given in the report), not a number taken from Winston.

Report which arrives first and intact: the packet stream or the bird with the card. This honours Tanenbaum: "Never underestimate the bandwidth of a station wagon full of tapes."

## 6. Success bar (commit before results exist)

- Every run is reproducible from its seed, and the logs carry every random draw.
- The received file's hash equals the sent file's hash for every run claimed as complete.
- The barcode reader never reads ground truth. An independent decoder written from §3 alone must agree on every packet verdict for one full run.
- **Independence is checked mechanically** (argon-spec rule 9): the two decoders share no function or variable identifiers beyond the §3 vocabulary, and their syntax-tree shapes differ (report the comparison method and result). Comparing file names doesn't count, because a copied decoder agrees with itself for free.
- Calibration follows §5 exactly, with the parameter hash committed before the Winston run.
- **Mutants that must be caught:**
  1. **A hawk that eats exactly the retransmit** (a targeted adversary on retransmitted segments only). TCP must still complete, or fail with an honest, logged reason. It must never report success.
  2. **A reader that always reads grey as white.** The ternary symbol error rate must jump, and the end-to-end hash must catch any corruption that gets past.
  3. **Checksums disabled.** Smudged packets get accepted, and the end-to-end hash must flag the corrupted file.
  4. **A pigeon that flies to the wrong loft** (homing violated). The link layer must reject it, not deliver it.
  5. **An infinite flock.** The Bergen calibration must visibly fail to reproduce "the ninth was never sent".
  6. **Retransmission timers disabled.** The transfer must stall at the first lost bird and be reported as stalled.
  7. **The sim core uses `Math.sin` directly.** The cross-engine replay test must catch it, or the report says it couldn't run a second engine.
  8. **Physics tied to frame rate.** The same recorded inputs at 30 fps and at 144 fps must give bit-identical logs, and this mutant must break that.
  9. **A piloted run leaks into calibration.** The parameter hash must change, and the check must flag it.
  10. **Free mode mutates the physics.** Caught by the frozen-parameter hash and by bit-identical packet logs before vs after free play.
  11. **A binding string leaks into the player build** (e.g. `[E] peck`). Caught by the spoiler grep (§2c.6).
  12. **`Math.random` in the sim core.** Caught: two runs with the same seed must disagree.
  13. **Hash taken on bytes, not trytes.** A packing that silently clips u > 19,682 must be caught by the tryte hash.

## 7. Forbidden

- No packet delivered faster than its pigeon's flight plus handling time.
- No decoding using the original packet.
- No tuning on Winston.
- No claim that TCP runs in the guest.
- No success without the tryte-hash match.
- No Winston outcome may appear anywhere in the builder's inputs, code or report before the audit.

**Argon-spec rule 8, verbatim:** "If a requirement can't be met, or conflicts with another, say so in REPORT.md and leave it failing. Never change emulator or VM accessors, I/O, consoles, test harnesses, or the auditor's scripts to make a check pass. An emulator must never read or write a guest's private memory."

"I can't" is an allowed answer for any part.

## 8. Deliverables

- One single-file HTML (xinu: zero dependencies, offline) that runs the whole experiment with a seed box and replays any run.
  - **Two modes:** Packet Relay (measured) and a free-flight mode whose real nature the UI never names.
- 3D view, flyable: two lofts, the farm terrain, rain, the hawk, the neighbour's flock, birds in flight. A pilot mode with recorded inputs and a replay button. A HUD showing the paper scrap's dots and the live TCP window.
- `SPOILERS.md` for auditors only (§2c.6).
- `results.jsonl` (one line per run) and a `REPORT.md` with every number above, including σ\*, the stock-vs-tuned TCP outcome, the calibration percentiles, and the Winston verdict.

— Ed
