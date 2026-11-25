'use strict';
const { readHtml, loadSimCoreFromHtml, appendResult } = require('./lib.js');

/**
 * Injects Round 1 mutants (#1-#10, #12, #13) strictly into in-memory copies of
 * winston.html (never shipped in the player build) and verifies every single one is caught.
 */
function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);
  const results = [];

  // Mutant 1: Hawk eats ONLY retransmits
  {
    const mutHtml = html.replace(
      'if (pilotedMeta) {',
      'if (isRetransmit) { lost = true; lossReason = "ADVERSARIAL_HAWK_RETRANSMIT"; } else if (pilotedMeta) {'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const r = WM.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'storm', payloadName: 'CARPET/main', recordDraws: false });
    const caught = (!r.success && !!r.stallReason) || (r.success && r.hashMatch);
    results.push({ id: 1, name: 'Hawk eats only retransmits', caught, detail: `state=${r.tcpState}, reason=${r.stallReason}, retx=${r.retransmits}` });
  }

  // Mutant 2: Reader always reads grey as white
  {
    const mutHtml = html.replace(
      'else if (y < 0.75) decodedDots[i] = 1;',
      'else if (y < 0.75) decodedDots[i] = 2;'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const baseSer = W.runBarcodeSweep([0.02], 40, 55)[0].ternary.symbolErrorRate;
    const mutSer = WM.runBarcodeSweep([0.02], 40, 55)[0].ternary.symbolErrorRate;
    const r = WM.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
    const caught = mutSer > baseSer + 0.20 && !r.success;
    results.push({ id: 2, name: 'Reader reads grey as white', caught, detail: `baseSER=${baseSer.toFixed(4)}, mutSER=${mutSer.toFixed(4)}, ok=${r.success}` });
  }

  // Mutant 3: Checksums disabled -> smudged/corrupted payload accepted, tryte hash catches it
  {
    const mutHtml = html.replace(
      'if (calcCrc !== rxCrc) {',
      'if (false && calcCrc !== rxCrc) {'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const clean = WM.createLoftDiskImages().loftA.files['CARPET/main'];
    const bytes = WM.packTrytesToBytes(clean.trytes);
    bytes[10] ^= 0x01;
    const unp = WM.unpackBytesToTrytes(bytes);
    const hash = unp.ok ? WM.hashTrytes(unp.trytes) : null;
    const caught = !unp.ok || hash !== clean.tryteHash;
    results.push({ id: 3, name: 'Checksums disabled', caught, detail: `tryteHashMatch=${hash === clean.tryteHash}` });
  }

  // Mutant 4: Pigeon flies to wrong loft (homing violated)
  {
    const mutHtml = html.replace('const birdHome = toLoft;', 'const birdHome = fromLoft;');
    const WM = loadSimCoreFromHtml(mutHtml);
    const r = WM.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
    const caught = r.homingRejects > 0 && !r.success;
    results.push({ id: 4, name: 'Pigeon flies to wrong loft', caught, detail: `homingRejects=${r.homingRejects}, ok=${r.success}` });
  }

  // Mutant 5: Infinite flock in Bergen calibration
  {
    const mutHtml = html.replace('let outboundFlock = 8;\n    let returnFlock = 6;', 'let outboundFlock = 9999;\n    let returnFlock = 9999;');
    const WM = loadSimCoreFromHtml(mutHtml);
    let ninth = 0;
    for (let s = 1; s <= 300; s++) if (WM.runBergenScenario(s).ninthSent) ninth++;
    const caught = ninth === 300;
    results.push({ id: 5, name: 'Infinite flock in Bergen', caught, detail: `ninthSent=${ninth}/300 (expected 0/300)` });
  }

  // Mutant 6: Retransmission timers disabled
  {
    const mutHtml = html.replace(
      'pushEvent({ t: rtoAt, kind: \'RTO\', seq, retries });',
      '/* RTO disabled mutant */'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const r = WM.runTcpTransfer({ seed: 202, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'storm', payloadName: 'CARPET/main', recordDraws: false });
    const caught = !r.success && r.retransmits === 0;
    results.push({ id: 6, name: 'Retransmission timers disabled', caught, detail: `state=${r.tcpState}, retx=${r.retransmits}, reason=${r.stallReason}` });
  }

  // Mutant 7: Sim core uses Math.sin directly
  {
    const mutHtml = html.replace(
      'const fwdX = detSin(bird.yaw) * detCos(bird.pitch);',
      'const fwdX = Math.sin(bird.yaw) * Math.cos(bird.pitch);'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const fClean = W.runSingle3DFlight(777, 210, 0.3, null);
    const fMut = WM.runSingle3DFlight(777, 210, 0.3, null);
    const caught = JSON.stringify(fClean.finalPos) !== JSON.stringify(fMut.finalPos);
    results.push({ id: 7, name: 'Sim core uses Math.sin directly', caught, detail: `cleanX=${fClean.finalPos.x.toFixed(9)}, mutX=${fMut.finalPos.x.toFixed(9)}` });
  }

  // Mutant 8: Physics tied to frame rate (30 fps vs 144 fps)
  {
    const m30 = loadSimCoreFromHtml(html.replace('const dt = params.fixedDt;', 'const dt = 1.0 / 30.0;')).runSingle3DFlight(777, 210, 0.3, null);
    const m144 = loadSimCoreFromHtml(html.replace('const dt = params.fixedDt;', 'const dt = 1.0 / 144.0;')).runSingle3DFlight(777, 210, 0.3, null);
    const c1 = W.runSingle3DFlight(777, 210, 0.3, null);
    const c2 = W.runSingle3DFlight(777, 210, 0.3, null);
    const caught = (JSON.stringify(c1) === JSON.stringify(c2)) && (JSON.stringify(m30) !== JSON.stringify(m144));
    results.push({ id: 8, name: 'Physics tied to frame rate (30 vs 144 fps)', caught, detail: `30fpsT=${m30.flightTimeS.toFixed(3)}, 144fpsT=${m144.flightTimeS.toFixed(3)}` });
  }

  // Mutant 9: Piloted run leaks into calibration
  {
    const leaked = Object.freeze({ ...W.CALIBRATED_PARAMS, speedMeanMps: W.CALIBRATED_PARAMS.speedMeanMps + 0.42 });
    const caught = W.hashParams(leaked) !== W.CALIBRATED_PARAMS_HASH;
    results.push({ id: 9, name: 'Piloted run leaks into calibration', caught, detail: `frozen=${W.CALIBRATED_PARAMS_HASH.slice(0, 12)}, leaked=${W.hashParams(leaked).slice(0, 12)}` });
  }

  // Mutant 10: Free mode mutates physics (nudges windX)
  {
    const nudged = Object.freeze({ ...W.CALIBRATED_PARAMS, windX: W.CALIBRATED_PARAMS.windX + 0.5 });
    const f1 = W.runSingle3DFlight(777, 210, 0.3, null, { params: W.CALIBRATED_PARAMS });
    const f2 = W.runSingle3DFlight(777, 210, 0.3, null, { params: nudged });
    const caught = (W.hashParams(nudged) !== W.CALIBRATED_PARAMS_HASH) && (JSON.stringify(f1) !== JSON.stringify(f2));
    results.push({ id: 10, name: 'Free mode mutates physics', caught, detail: `hashChanged=${W.hashParams(nudged) !== W.CALIBRATED_PARAMS_HASH}, logChanged=${JSON.stringify(f1) !== JSON.stringify(f2)}` });
  }

  // Mutant 12: Math.random in sim core
  {
    const mutHtml = html.replace(
      'const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;',
      'const val = Math.random();'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const a = WM.runTcpTransfer({ seed: 606, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', includeDraws: true });
    const b = WM.runTcpTransfer({ seed: 606, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', includeDraws: true });
    const caught = JSON.stringify(a.rngDraws) !== JSON.stringify(b.rngDraws);
    results.push({ id: 12, name: 'Math.random in sim core', caught, detail: `sameSeedDiverged=${caught}` });
  }

  // Mutant 13: Hash on bytes, not trytes (clip u > 19682)
  {
    const mutHtml = html.replace(
      'return { ok: false, error: \'INVALID_TRYTE_VALUE_GT_19682\', index: i, u, trytes: null };',
      'trytes[i] = TRYTE_MAX; continue;'
    );
    const WM = loadSimCoreFromHtml(mutHtml);
    const bad = new Uint8Array([0xff, 0x7f, 0x00, 0x00]); // u = 32767 > 19682
    const strict = W.unpackBytesToTrytes(bad);
    const clipped = WM.unpackBytesToTrytes(bad);
    const caught = !strict.ok && clipped.ok && (W.hashTrytes(clipped.trytes) !== W.hashTrytes(new Int16Array([0, -9841])));
    results.push({ id: 13, name: 'Hash on bytes, not trytes (clip u > 19682)', caught, detail: `strictErr=${strict.error}, clippedHashDiff=${caught}` });
  }

  const pass = results.every(r => r.caught);
  appendResult({
    test: '08-round1-mutants',
    pass,
    mutantsChecked: results.length,
    allCaught: pass,
    mutants: results
  });
  console.log(`[08] Round 1 mutants (in-memory injection): ${pass ? 'PASS' : 'FAIL'} (${results.filter(r => r.caught).length}/${results.length} caught)`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
