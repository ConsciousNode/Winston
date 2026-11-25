// Kehai's audit probe: rerun Neon's Bergen check and blind Winston scenario from the delivered core, unchanged,
// then place the real (auditor-held) Winston numbers in the predicted distributions.
// Usage: node winston-placement.js <winston.html>
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const sb = { console, Math, JSON, Object, Array, Number, String, Uint8Array, Uint32Array, Int32Array, Float64Array, DataView, ArrayBuffer, TextEncoder, Map, Set, Error, BigInt };
sb.window = sb; sb.globalThis = sb; sb.self = sb;
vm.createContext(sb);
vm.runInContext(scripts.find(s => s.includes('runWinstonBlindScenario')), sb);
const W = sb.__WINSTON_CORE__ || sb.WinstonCore;
const P = W.CALIBRATED_PARAMS;
console.log('params hash (delivered constant):', W.CALIBRATED_PARAMS_HASH);
console.log('params hash (recomputed):        ', W.hashParams(P));
// Blind Winston: same seeds Neon used? Unknown; run 2000 seeds 1..2000 and also report Neon's own percentiles.
const fl = [], tot = []; let arrived = 0;
for (let s = 1; s <= 20000; s++) { const r = W.runWinstonBlindScenario(s, P); if (r.arrived) { arrived++; fl.push(r.flightTimeS); tot.push(r.totalTransferS); } }
const pct = (a, x) => a.filter(v => v <= x).length / a.length * 100;
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p / 100 * (b.length - 1))]; };
const REAL_FLIGHT = 68 * 60, REAL_TOTAL = 2 * 3600 + 6 * 60 + 57; // auditor-held: PhysOrg/Register/TimesLive/ITWeb, Sept 2009
console.log(`20,000 seeds, ${arrived} arrived; flight p5/p50/p95 = ${q(fl,5).toFixed(0)}/${q(fl,50).toFixed(0)}/${q(fl,95).toFixed(0)} s; total p5/p50/p95 = ${q(tot,5).toFixed(0)}/${q(tot,50).toFixed(0)}/${q(tot,95).toFixed(0)} s`);
console.log(`real flight 68 min (${REAL_FLIGHT} s) sits at percentile ${pct(fl, REAL_FLIGHT).toFixed(3)} of predicted flight time`);
console.log(`real total 2 h 6 min 57 s (${REAL_TOTAL} s) sits at percentile ${pct(tot, REAL_TOTAL).toFixed(1)} of predicted total transfer`);
console.log(`implied real speed ${(97000 / REAL_FLIGHT).toFixed(2)} m/s vs predicted speed N(${P.speedMeanMps}, ${P.speedSdMps}) clamped [${P.speedMinMps}, ${P.speedMaxMps}]`);
// Bergen sensitivity: does the Bergen check constrain speed at all? Rerun with speed doubled and halved.
function bergen(params, n = 1000) {
  let ok = { c: 0, mn: 0, mx: 0 }; const comps = [], mins = [], maxs = [];
  for (let s = 1; s <= n; s++) { const r = W.runBergenScenario(s, params); comps.push(r.completions); if (r.rtts && r.rtts.length) { mins.push(Math.min(...r.rtts)); maxs.push(Math.max(...r.rtts)); } }
  const inside = (a, x) => q(a, 5) <= x && x <= q(a, 95);
  return { comp: inside(comps, 4), min: inside(mins, 3211), max: inside(maxs, 6389), minP50: q(mins, 50)?.toFixed(0), maxP50: q(maxs, 50)?.toFixed(0) };
}
const keys = Object.keys(W.runBergenScenario(1, P)); console.log('bergen result keys:', keys.join(','));
for (const f of [0.5, 1, 1.44, 2]) {
  const p2 = Object.assign({}, P, { speedMeanMps: P.speedMeanMps * f, speedMaxMps: Math.max(P.speedMaxMps, P.speedMeanMps * f * 1.5) });
  console.log(`speed x${f}: Bergen inside central 90% ->`, JSON.stringify(bergen(p2)));
}
