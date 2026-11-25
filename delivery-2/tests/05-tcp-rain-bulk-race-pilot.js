'use strict';
const { readHtml, loadSimCoreFromHtml, appendResult } = require('./lib.js');

function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);

  // 1. Stock vs Avian TCP on CARPET/main (seed 101)
  const stock = W.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'stock', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
  const avian = W.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });

  // 2. Binary vs Ternary across 3 rain levels (seed 202)
  const rainMatrix = [];
  for (const rainLevel of ['dry', 'drizzle', 'storm']) {
    for (const encoding of ['binary', 'ternary']) {
      const r = W.runTcpTransfer({ seed: 202, encoding, tcpMode: 'avian', rainLevel, payloadName: 'CARPET/main', recordDraws: false });
      rainMatrix.push({
        rainLevel, encoding, mssBytes: r.mssBytes, sigma: r.sigma, distanceM: Number(r.distanceM.toFixed(1)),
        tcpState: r.tcpState, success: r.success, hashMatch: r.hashMatch, stallReason: r.stallReason,
        pigeonsDispatched: r.pigeonsDispatched, pigeonsLost: r.pigeonsLost, smudgeDrops: r.smudgeDrops,
        retransmits: r.retransmits, completionTimeS: Number(r.completionTimeS.toFixed(1))
      });
    }
  }

  // 3. 5,000-tryte file (ATLAS/farm_log, dry, seed 303)
  const bulkRuns = [];
  for (const encoding of ['binary', 'ternary']) {
    const r = W.runTcpTransfer({ seed: 303, encoding, tcpMode: 'avian', rainLevel: 'dry', payloadName: 'ATLAS/farm_log', recordDraws: false });
    bulkRuns.push({
      encoding, mssBytes: r.mssBytes, distanceM: Number(r.distanceM.toFixed(1)),
      tcpState: r.tcpState, success: r.success, hashMatch: r.hashMatch,
      pigeonsDispatched: r.pigeonsDispatched, pigeonsLost: r.pigeonsLost, retransmits: r.retransmits,
      completionTimeS: Number(r.completionTimeS.toFixed(1)), tryteHash: r.sentTryteHash
    });
  }

  // 4. Winston Mode race (seed 405)
  const raceCarpet = W.runWinstonRace(405, { payloadName: 'CARPET/main', encoding: 'ternary', rainLevel: 'dry' });
  const raceBulk = W.runWinstonRace(405, { payloadName: 'ATLAS/farm_log', encoding: 'ternary', rainLevel: 'dry' });

  // 5. Piloted vs Autopilot + bit-identical replay (seed 777)
  const pw = W.createWorld(777, { distanceM: 210, rainIntensity: 0.3 });
  const pb = W.createBird(pw.loftA, pw.loftB, 'LOFT-B', W.CALIBRATED_PARAMS);
  const recorded = [];
  for (let tick = 0; tick < 2000 && pb.alive && !pb.arrived; tick++) {
    const base = W.autopilotInput(pb, pw);
    const inp = { ...base, flap: true, dive: tick > 60 && tick < 220 && pb.y > 4 };
    recorded.push(inp);
    W.stepFlightSim(pw, pb, inp, W.CALIBRATED_PARAMS);
  }
  const autoF = W.runSingle3DFlight(777, 210, 0.3, null);
  const pilotF = W.runSingle3DFlight(777, 210, 0.3, recorded);
  const replayF = W.runSingle3DFlight(777, 210, 0.3, recorded);
  const replayBitIdentical = JSON.stringify(pilotF) === JSON.stringify(replayF);

  const pass = !stock.success && avian.success && avian.hashMatch &&
    bulkRuns.every(b => b.success && b.hashMatch) && replayBitIdentical;

  appendResult({
    test: '05-tcp-rain-bulk-race-pilot',
    pass,
    stockVsAvian: {
      stock: { tcpState: stock.tcpState, success: stock.success, stallReason: stock.stallReason, pigeons: stock.pigeonsDispatched, retransmits: stock.retransmits, timeS: Number(stock.completionTimeS.toFixed(1)) },
      avian: { tcpState: avian.tcpState, success: avian.success, hashMatch: avian.hashMatch, pigeons: avian.pigeonsDispatched, retransmits: avian.retransmits, timeS: Number(avian.completionTimeS.toFixed(1)), tryteHash: avian.sentTryteHash }
    },
    rainMatrix,
    bulkRuns,
    winstonRace: { carpet: raceCarpet, bulk: raceBulk },
    piloted: {
      seed: 777, distanceM: 210,
      autopilotFlightS: Number(autoF.flightTimeS.toFixed(3)),
      pilotedFlightS: Number(pilotF.flightTimeS.toFixed(3)),
      autopilotSmudgeSigma: Number(autoF.smudgeSigma.toFixed(4)),
      pilotedSmudgeSigma: Number(pilotF.smudgeSigma.toFixed(4)),
      replayBitIdentical
    }
  });
  console.log(`[05] TCP, rain matrix, 5k bulk, race & pilot: ${pass ? 'PASS' : 'FAIL'} (stock=${stock.tcpState}, avian=${avian.tcpState}, replay=${replayBitIdentical})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
