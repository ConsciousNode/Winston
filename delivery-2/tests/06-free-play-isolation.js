'use strict';
const { readHtml, loadSimCoreFromHtml, sha256, appendResult } = require('./lib.js');

function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);

  const before = W.runTcpTransfer({
    seed: 505, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', includeDraws: true
  });
  const beforeHash = sha256(JSON.stringify(before));

  // Play 5 simulated minutes (18,000 ticks @ 60 Hz) of seeded random Free Flight in the expanded Round 2 world
  const fw = W.createWorld(999, { rainIntensity: 0.5 });
  const fb = W.createBird(fw.loftA, fw.loftB, 'LOFT-B', W.CALIBRATED_PARAMS);
  const rng = W.createRNG(8888, { recordDraws: false });
  for (let t = 0; t < 18000; t++) {
    const inp = {
      left: rng.next('l') < 0.22,
      right: rng.next('r') < 0.22,
      pitchUp: rng.next('u') < 0.28,
      pitchDown: rng.next('d') < 0.22,
      forward: rng.next('fw') < 0.4,
      flap: rng.next('fl') < 0.6,
      land: rng.next('ln') < 0.03,
      peck: rng.next('pk') < 0.05,
      use: rng.next('us') < 0.02,
      coo: rng.next('co') < 0.03
    };
    W.stepFlightSim(fw, fb, inp, W.CALIBRATED_PARAMS, { freeMode: true });
  }

  const after = W.runTcpTransfer({
    seed: 505, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', includeDraws: true
  });
  const afterHash = sha256(JSON.stringify(after));

  const bitIdentical = beforeHash === afterHash;
  let freezeProtected = false;
  try { W.CALIBRATED_PARAMS.windX += 0.5; } catch (e) { freezeProtected = true; }

  const pass = bitIdentical && freezeProtected;
  appendResult({
    test: '06-free-play-isolation',
    pass,
    freePlayTicks: 18000,
    freePlayMinutes: 5,
    beforeLogSha256: beforeHash,
    afterLogSha256: afterHash,
    bitIdentical,
    freezeProtected,
    freePlayTelemetry: {
      dayTimeEnd: Number(fw.dayTime.toFixed(3)),
      pecks: fb.pecks,
      coos: fb.coos,
      discoveries: fb.discoveries.length,
      hungerEnd: Number(fb.hunger.toFixed(3))
    }
  });
  console.log(`[06] Free-play isolation (5 min = 18,000 ticks): ${pass ? 'PASS' : 'FAIL'} (identical=${bitIdentical}, frozen=${freezeProtected})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
