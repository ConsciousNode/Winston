# Winston, delivery 1: audit (Kehai Interim, 2026-11-25)

**Verdict: accept, with one honest miss in the science and one visual bug.**
- The pigeon-TCP instrument is real. Its numbers reproduce, its parameter hash recomputes, and it loads clean in a
  real browser.
- The blind Winston prediction **misses the flight time** and **hits the total time**. The reason is the
  interesting finding of the whole project: Bergen can't tell you how fast a pigeon flies.
- The ground renders as a flat blue sheet instead of a farm.

Spec: `SPEC.md` rev 4.1, preregistered in Long-Way-Round `4e8bdc1` / `5c901de` before sending. Delivery:
`delivery-1/` (0bfcb48), committed as delivered. The sealed real-world numbers are in `audit/AUDITOR-HELD.md`.
They were written before the build and opened only now.

## The sealed envelope: Winston, 9 September 2009

`audit/winston-placement.js` runs Neon's own `runWinstonBlindScenario`, unchanged, on 20,000 seeds. It then
places the real numbers in that distribution:

| | Real (2009) | Sim 5th / 50th / 95th percentile | Real sits at | Verdict |
|---|---:|---:|---:|:---:|
| Flight, 97 km | **68 min** (4,080 s) | 80.6 / 98.1 / 125.5 min | **0.06th percentile** | **MISS** |
| Total incl. card load and unload | **2 h 6 min 57 s** (7,617 s) | 110 / 137 / 170 min | 27.6th percentile | hit |

**Why the flight misses, and why that's the result:**
- The sim's pigeon cruises at N(16.5, 2.2²) m/s, about 59 km/h. Winston averaged about **23.8 m/s (86 km/h)**.
- That speed didn't come from Bergen, and **couldn't have**. Bergen's hop was 5 km, so each leg's flight was about
  5 minutes, inside round trips of 53–106 minutes. Almost all of a Bergen round trip is people: printing,
  taping, releasing, waiting, scanning.
- I reran the Bergen check with the speed halved, ×1.44 (Winston's real speed) and doubled. **All of them still
  pass** every central-90% test (`audit/winston-placement.out`). So Bergen pins handling time and loss, but
  leaves speed free.
- Neon's value is a prior ("~60 km/h homing pigeon cruise", in a code comment), not a fit.

**Why the total hits, and why that's partly luck.** Real Winston's extra hour was unloading 4 GB from the card.
The sim's extra time is Bergen's *human handling* delay (about 34 min mean) plus a stated 4-minute card
assumption. Different causes landed at similar sizes.

**No sign of tuning toward the answer.**
- The parameter hash recomputes to the committed value (`a1b27180…88b7`).
- A builder who knew "68 minutes" would not have predicted 98.
- The miss is the honest outcome the spec asked to be reported.

## What I checked

1. **Arrival:** zip sha256 `6d6caa4d…aa07`. Four files: `winston.html`, `SPOILERS.md`, `results.jsonl` (10.8 MB),
   `REPORT.md`.
2. **Params hash:** `hashParams(CALIBRATED_PARAMS)` recomputes to the committed `CALIBRATED_PARAMS_HASH`.
3. **Bergen:** the delivered `results.jsonl` calibration line reports 4/9 completions and min and max RTT inside
   the central 90%, and the 9th ping never sent in 2,000 / 2,000 runs. My reruns from the delivered core agree.
4. **Real browser** (Playwright Chromium; `audit/browser-check.py`, `audit/browser-modes.py`):
   - 0 console errors, 0 page errors, 0 network requests (offline ✓).
   - One transfer run from the UI (seed 101, avian, ternary, dry) reproduces the report: 25 birds, 0
     retransmits, 3,875.2 s, tryte hash MATCH.
5. **Spoilers:**
   - The visible text has no control bindings. The UI says only "Free Flight" and "Pause (Esc)" (Esc allowed by
     §2c.5).
   - The key reference is stored base64-encoded in the file. That defeats a plain-text grep, which matches
     the spec's intent: a player reading the page source would still have to decode it to be spoiled.
6. **Sim-core bans:**
   - No executable `Math.random`, `sin`, `cos`, `atan2` or `exp` in the sim core.
   - The one `Math.random` sits behind mutant #12's switch, which ships inside the player file. That's
     harmless, but the mutant switches are in the build.

## Neon's own deviations, reported under rule 8 (accepted as honest)

- **Three.js r128 isn't inlined.** Neon's VM had no copy and no network, so it wrote a small software renderer
  instead. r128 is MIT, so the studio can inline it later.
- **No second JS engine was available.** Cross-runtime determinism was shown against Python's IEEE-754 instead.
  A real SpiderMonkey/JSC check is still open.
- **The TritOS disk images are synthetic stand-ins** holding the exact payloads. No real `.tdisk` was attached;
  that gap is on us.

## Findings

1. **The farm renders as a flat blue sheet** (`audit/browser/winston-open.png`, `winston-freeflight.png`). The
   terrain is drawn under, or replaced by, one blue plane, with green showing only at the bottom edge.
   It's a renderer bug, probably polygon order or the pond plane. Packet Relay still runs and measures
   correctly, but Pigeon Life's world doesn't read as a farm yet.
2. **The "fit" is hand-set constants, not a fitting procedure.** The spec allowed any fit that passes the
   central-90% test, so this is within the rules. But there's no fitter for the audit to rerun. The sensitivity
   run above stands in for it.
3. **The test harnesses weren't delivered as files.** The spec listed only the four deliverables, so every
   number in REPORT.md comes from in-file functions plus Neon's own drivers. The UI rerun and my probes
   reproduce the ones I checked. The rest stand on `results.jsonl`.

## The measured results, briefly (from REPORT.md; spot-checked where noted)

- **Barcodes:** ternary carries 80 bytes per scrap against binary's 50. They cross over at σ\* ≈ 0.110: below
  it ternary wins, and above it the grey level drowns. In a storm, ternary TCP fails and binary delivers.
- **Stock TCP fails** after 15 SYN retries in 663 s, before any bird returns. Avian-tuned TCP delivers in about
  65 minutes (UI rerun ✓).
- **Winston mode:** the microSD bird beats the packet stream 24× on the small file and 108× on the 5,000-tryte
  one. Tanenbaum's station wagon, confirmed on a farm.

— Kehai
