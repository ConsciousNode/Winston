'use strict';
const { readHtml, loadSimCoreFromHtml, percentiles, appendResult } = require('./lib.js');
const F = require('./bergen_fitter.js');

function runWinstonBlind(W, params) {
  const flightArr = [], totalArr = [];
  let arrived = 0;
  for (let s = 10001; s <= 12000; s++) {
    const r = W.runWinstonBlindScenario(s, params);
    if (r.arrived) {
      arrived++;
      flightArr.push(r.flightTimeS);
      totalArr.push(r.totalTransferS);
    }
  }
  return {
    seeds: 2000,
    paramsHash: W.hashParams(params),
    arrivalRate: arrived / 2000,
    flightTimeS: percentiles(flightArr),
    totalTransferS: percentiles(totalArr)
  };
}

function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);

  // 1. Round 1 frozen parameters evaluation on Bergen (2,000 seeds) + blind Winston (2,000 seeds)
  const r1Bergen = F.evaluateBergenCandidate(W, W.CALIBRATED_PARAMS, 1, 2000);
  const r1Winston = runWinstonBlind(W, W.CALIBRATED_PARAMS);

  // 2. Round 2 real Bergen fitter (prior speed = 16.5 m/s from homing pigeon cruise literature)
  const fitA = F.fitBergen(W, { seedStart: 1, searchSeeds: 200, verifySeeds: 2000, fixedSpeedMps: 16.5 }, 11111);
  const fitB = F.fitBergen(W, { seedStart: 1, searchSeeds: 200, verifySeeds: 2000, fixedSpeedMps: 16.5 }, 99999);
  const fitterReproducible = (fitA.paramsHash === fitB.paramsHash) && (fitA.objective === fitB.objective);
  const r2Winston = runWinstonBlind(W, fitA.params);

  // 3. Mutant #17: fitter peeks at a sealed dummy constant -> mutated fitter must be caught
  function leakyFit(dummy) {
    const base = F.fitBergen(W, { seedStart: 1, searchSeeds: 100, verifySeeds: 200, fixedSpeedMps: 16.5 }, dummy);
    const leaked = Object.freeze({ ...base.params, handlingMeanS: base.params.handlingMeanS + (dummy % 73) });
    return W.hashParams(leaked);
  }
  const cleanInvariant = fitA.paramsHash === fitB.paramsHash;
  const leakyDiverged = leakyFit(11111) !== leakyFit(99999);
  const mutant17Caught = cleanInvariant && leakyDiverged;

  // 4. 14-speed Identifiability table (8, 10, 12, ..., 34 m/s)
  const identTable = F.runIdentifiabilityTable(W, { seedStart: 1, searchSeeds: 150, verifySeeds: 1000 });
  const passingSpeeds = identTable.filter(r => r.allPass).map(r => r.speedMeanMps);
  const failingSpeeds = identTable.filter(r => !r.allPass).map(r => r.speedMeanMps);

  const pass = r1Bergen.allPass && fitA.verified.allPass && fitterReproducible && mutant17Caught && identTable.length === 14;
  appendResult({
    test: '03-bergen-fit-and-identifiability',
    pass,
    round1Frozen: {
      paramsHash: W.CALIBRATED_PARAMS_HASH,
      bergen2000: r1Bergen,
      winstonBlind2000: r1Winston
    },
    round2Fitted: {
      priorNote: 'speedMeanMps=16.5 m/s is an explicit prior (homing pigeon literature ~60 km/h) because Bergen alone does not identify speed',
      paramsHash: fitA.paramsHash,
      fittedValues: fitA.fittedValues,
      objective: fitA.objective,
      bergen2000: fitA.verified,
      winstonBlind2000: r2Winston
    },
    fitterReproducible,
    identifiability: {
      speedsTested: identTable.map(r => r.speedMeanMps),
      passingSpeeds,
      failingSpeeds,
      speedIdentifiedByBergen: failingSpeeds.length > 0,
      rows: identTable
    },
    mutant17: { id: 17, name: 'Fitter peeks at sealed dummy constant', caught: mutant17Caught, cleanInvariant, leakyDiverged }
  });
  console.log(`[03] Bergen fit, identifiability & blind Winston: ${pass ? 'PASS' : 'FAIL'} (R2 hash=${fitA.paramsHash.slice(0, 12)}, passingSpeeds=${passingSpeeds.length}/14, M17=${mutant17Caught})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
