# Winston, delivery 2 (round 2): audit (Kehai Interim, 2026-11-25)

**Verdict: accept.** Every round 1 finding is fixed. The world is real now, and the instrument is intact.

Spec: `SPEC-2.md` (df253f4, preregistered before sending). Delivery: `delivery-2/` (7c8757e, committed as delivered).

## Round 1 findings, rechecked

| Round 1 finding | Round 2 |
|---|---|
| The ground was one flat blue sheet | **Fixed.** Three.js world with a patchwork farm, fences, a road, woods, a pond, wires, a town and a bell tower (`audit/round2/winston-open.png`, `winston-freeflight.png`). The flat-ground mutant is caught by a pixel-cluster test. |
| Three.js not inlined | **Fixed.** I re-extracted `<script id="three-r128">` myself: 603,445 bytes, sha256 `9274bbce…1ce2`, byte-identical to the attachment, with its MIT notice. |
| The fit was hand-set constants | **Fixed.** A real grid fitter (`tests/bergen_fitter.js`), Bergen only, at a fixed seed set, reproducible. |
| No harness delivered | **Fixed.** `tests/` with 9 numbered suites, plus a script that generates REPORT.md. |
| Mutant switches in the player build | **Fixed.** 0 switches in the shipped file. All 17 mutants are injected in memory by the tests. |

## What I checked, and how
1. **Arrival:** zip sha256 `6822d1e4…e2eb`.
2. **Reruns** (scratch copy; logs in `audit/round2/reruns/`): tests 01–08 all pass.
   - Test 09 drives Chromium through Selenium, which this workspace doesn't have, so I did my own browser pass
     (item 4).
   - The fitter reproduces round 2's parameter hash, `d5394491…`.
3. **The sealed Winston prediction is untouched.**
   - Round 1's `CALIBRATED_PARAMS` still hash to `a1b27180…88b7`.
   - My placement probe, rerun on the round 2 build, reproduces round 1's predicted distribution exactly
     (`audit/round2/winston-placement.out`).
   - The real flight still sits at the 0.06th percentile.
4. **Real browser** (Playwright Chromium, SwiftShader WebGL):
   - 0 console errors, 0 page errors, 0 network requests.
   - Visible text contains no control bindings; the UI now adds a quality selector, an audio toggle and a
     discovery journal.
   - One UI transfer (seed 101, avian, ternary, dry) reproduces the report: 25 birds, 0 retransmits, 3,875.2 s,
     hash MATCH.
   - Free Flight renders the world at about 25 fps on software WebGL. The journal found its first discovery
     within seconds.
5. **Identifiability matches my own round 1 sensitivity run.** Neon's fitter finds every speed from 8 to 34 m/s
   passes Bergen, and now labels 16.5 m/s as a **prior** throughout. It found, without being told, the reason its
   own round 1 Winston flight prediction missed.

## Notes (none blocks acceptance)
- **The fitter's objective has an integer floor.** Bergen's 4 completions against a simulated median of 5 adds
  exactly 1.0, which is why most objective values sit near 1.02. It's harmless, since selection still requires
  passing every central-90% check, but a fractional completion target would rank candidates more finely.
- **Round 2's blind Winston prediction also misses the flight time.** Its p5 is 4,791 s against the real 4,080 s,
  for the same reason: speed is a prior. That's expected and honest. Bergen can't do better, and only a
  longer-distance calibration flight could.
- **There's still no second JS engine** (V8 only, reported under rule 8).
- **Frame rates were measured on software WebGL**, so the potato's real GPU numbers are still to be seen. Kham
  can just open the Pages link.

— Kehai
