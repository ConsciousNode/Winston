'use strict';
/**
 * Real Bergen (2001) Parameter Fitter & Speed Identifiability Analyzer (Part A.2).
 * Fits strictly on Bergen 2001 observed targets:
 *   completions = 4 (of 9, 8 outbound / 6 return), minRtt = 3211 s, maxRtt = 6389 s.
 * Never reads or uses any external/unseen constant (verified by sealed-dummy test).
 */

const OBSERVED_BERGEN = Object.freeze({
  completions: 4,
  minRttS: 3211.0,
  maxRttS: 6389.0,
  ninthSent: false
});

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function evaluateBergenCandidate(W, params, seedStart, seedCount) {
  const comps = [];
  const mins = [];
  const maxs = [];
  let ninthCount = 0;
  for (let i = 0; i < seedCount; i++) {
    const r = W.runBergenScenario(seedStart + i, params);
    comps.push(r.completions);
    if (r.minRtt !== null) mins.push(r.minRtt);
    if (r.maxRtt !== null) maxs.push(r.maxRtt);
    if (r.ninthSent) ninthCount++;
  }
  comps.sort((a, b) => a - b);
  mins.sort((a, b) => a - b);
  maxs.sort((a, b) => a - b);

  const compP5 = pct(comps, 0.05), compP50 = pct(comps, 0.50), compP95 = pct(comps, 0.95);
  const minP5 = mins.length ? pct(mins, 0.05) : 0;
  const minP50 = mins.length ? pct(mins, 0.50) : 0;
  const minP95 = mins.length ? pct(mins, 0.95) : 0;
  const maxP5 = maxs.length ? pct(maxs, 0.05) : 0;
  const maxP50 = maxs.length ? pct(maxs, 0.50) : 0;
  const maxP95 = maxs.length ? pct(maxs, 0.95) : 0;

  const passComp = OBSERVED_BERGEN.completions >= compP5 && OBSERVED_BERGEN.completions <= compP95;
  const passMin = OBSERVED_BERGEN.minRttS >= minP5 && OBSERVED_BERGEN.minRttS <= minP95;
  const passMax = OBSERVED_BERGEN.maxRttS >= maxP5 && OBSERVED_BERGEN.maxRttS <= maxP95;
  const passNinth = ninthCount === 0;
  const allPass = passComp && passMin && passMax && passNinth;

  // Objective: normalized squared distance of medians to observed Bergen targets + penalty if outside central 90%
  const dComp = (compP50 - OBSERVED_BERGEN.completions) / 1.0;
  const dMin = (minP50 - OBSERVED_BERGEN.minRttS) / 600.0;
  const dMax = (maxP50 - OBSERVED_BERGEN.maxRttS) / 800.0;
  let penalty = 0;
  if (!passComp) penalty += 25.0;
  if (!passMin) penalty += 25.0;
  if (!passMax) penalty += 25.0;
  if (!passNinth) penalty += 100.0;
  const objective = dComp * dComp + dMin * dMin + dMax * dMax + penalty;

  return {
    objective,
    allPass,
    withinCentral90: { completions: passComp, minRtt: passMin, maxRtt: passMax, ninthNeverSent: passNinth },
    completions: { p5: compP5, p50: compP50, p95: compP95 },
    minRttS: { p5: minP5, p50: minP50, p95: minP95 },
    maxRttS: { p5: maxP5, p50: maxP50, p95: maxP95 },
    ninthSentCount: ninthCount
  };
}

/**
 * Fits (handlingMeanS, handlingSdS, baseLossProb) — and optionally speedMeanMps — on Bergen only.
 * Parameter `sealedDummy` is explicitly ignored (tested by Mutant #17).
 */
function fitBergen(W, opts, _sealedDummy) {
  const o = opts || {};
  const seedStart = o.seedStart || 1;
  const searchSeeds = o.searchSeeds || 250; // fast deterministic search grid
  const verifySeeds = o.verifySeeds || 1000; // full verification on >= 1000 seeds
  const fixedSpeed = o.fixedSpeedMps !== undefined ? o.fixedSpeedMps : null;

  // Coarse grid over stated domain
  const speedGrid = fixedSpeed !== null ? [fixedSpeed] : [12.0, 16.5, 21.0, 26.0];
  const handlingMeanGrid = [1700, 1950, 2200, 2450];
  const handlingSdGrid = [550, 750, 950];
  const lossGrid = [0.16, 0.22, 0.28];

  let best = null;

  function makeParams(spd, hMean, hSd, loss) {
    return Object.freeze({
      ...W.CALIBRATED_PARAMS,
      speedMeanMps: spd,
      speedMinMps: Math.min(W.CALIBRATED_PARAMS.speedMinMps, spd * 0.55),
      speedMaxMps: Math.max(W.CALIBRATED_PARAMS.speedMaxMps, spd * 1.45),
      handlingMeanS: hMean,
      handlingSdS: hSd,
      baseLossProb: loss
    });
  }

  for (const spd of speedGrid) {
    for (const hMean of handlingMeanGrid) {
      for (const hSd of handlingSdGrid) {
        for (const loss of lossGrid) {
          const cand = makeParams(spd, hMean, hSd, loss);
          const ev = evaluateBergenCandidate(W, cand, seedStart, searchSeeds);
          if (!best || ev.objective < best.ev.objective) {
            best = { spd, hMean, hSd, loss, cand, ev };
          }
        }
      }
    }
  }

  // Coordinate-descent local refinement around best coarse point
  const steps = [
    { hMean: 80, hSd: 60, loss: 0.02, spd: fixedSpeed !== null ? 0 : 1.0 },
    { hMean: 25, hSd: 20, loss: 0.01, spd: fixedSpeed !== null ? 0 : 0.5 }
  ];
  for (const st of steps) {
    let improved = true;
    while (improved) {
      improved = false;
      const deltas = [
        [0, st.hMean, 0, 0], [0, -st.hMean, 0, 0],
        [0, 0, st.hSd, 0], [0, 0, -st.hSd, 0],
        [0, 0, 0, st.loss], [0, 0, 0, -st.loss]
      ];
      if (st.spd > 0) deltas.push([st.spd, 0, 0, 0], [-st.spd, 0, 0, 0]);
      for (const [ds, dm, dsd, dl] of deltas) {
        const ns = Math.max(6, Math.min(36, best.spd + ds));
        const nm = Math.max(900, Math.min(3200, best.hMean + dm));
        const nsd = Math.max(250, Math.min(1400, best.hSd + dsd));
        const nl = Math.max(0.05, Math.min(0.45, Number((best.loss + dl).toFixed(4))));
        const cand = makeParams(ns, nm, nsd, nl);
        const ev = evaluateBergenCandidate(W, cand, seedStart, searchSeeds);
        if (ev.objective + 1e-6 < best.ev.objective) {
          best = { spd: ns, hMean: nm, hSd: nsd, loss: nl, cand, ev };
          improved = true;
        }
      }
    }
  }

  // Final evaluation on full >=1000-seed set
  const verified = evaluateBergenCandidate(W, best.cand, seedStart, verifySeeds);
  return {
    params: best.cand,
    paramsHash: W.hashParams(best.cand),
    fittedValues: {
      speedMeanMps: best.spd,
      handlingMeanS: best.hMean,
      handlingSdS: best.hSd,
      baseLossProb: best.loss
    },
    objective: Number(verified.objective.toFixed(6)),
    verifySeeds,
    verified
  };
}

function runIdentifiabilityTable(W, opts) {
  const o = opts || {};
  const speeds = [];
  for (let s = 8; s <= 34; s += 2) speeds.push(s);
  const rows = [];
  for (const spd of speeds) {
    const res = fitBergen(W, {
      seedStart: o.seedStart || 1,
      searchSeeds: o.searchSeeds || 200,
      verifySeeds: o.verifySeeds || 1000,
      fixedSpeedMps: spd
    });
    rows.push({
      speedMeanMps: spd,
      handlingMeanS: res.fittedValues.handlingMeanS,
      handlingSdS: res.fittedValues.handlingSdS,
      baseLossProb: res.fittedValues.baseLossProb,
      objective: res.objective,
      allPass: res.verified.allPass,
      comp_p5_p50_p95: [res.verified.completions.p5, res.verified.completions.p50, res.verified.completions.p95],
      minRtt_p5_p95: [Number(res.verified.minRttS.p5.toFixed(1)), Number(res.verified.minRttS.p95.toFixed(1))],
      maxRtt_p5_p95: [Number(res.verified.maxRttS.p5.toFixed(1)), Number(res.verified.maxRttS.p95.toFixed(1))],
      paramsHash: res.paramsHash
    });
  }
  return rows;
}

module.exports = {
  OBSERVED_BERGEN,
  evaluateBergenCandidate,
  fitBergen,
  runIdentifiabilityTable
};
