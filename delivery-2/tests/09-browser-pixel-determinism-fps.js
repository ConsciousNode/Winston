'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const { HTML_PATH, readHtml, loadSimCoreFromHtml, appendResult } = require('./lib.js');

function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);

  // Compute Node reference hashes on exact same seeds
  const t101 = W.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
  const f777 = W.runSingle3DFlight(777, 210, 0.3, null);
  const b1 = W.runBergenScenario(1);
  const nodeHashes = {
    t101Hash: W.sha256String(JSON.stringify(t101)),
    f777Hash: W.sha256String(JSON.stringify(f777)),
    b1Hash: W.sha256String(JSON.stringify(b1))
  };

  const pyScript = path.join(__dirname, 'browser_harness.py');
  const raw = execFileSync('python3', [pyScript, HTML_PATH], { maxBuffer: 10 * 1024 * 1024 }).toString().trim();
  const br = JSON.parse(raw);

  const zeroConsoleErrors = br.consoleErrors.length === 0;
  const zeroNetworkRequests = br.networkRequests.length === 0;
  const browserMatchesNode =
    br.browserSimHashes.t101Hash === nodeHashes.t101Hash &&
    br.browserSimHashes.f777Hash === nodeHashes.f777Hash &&
    br.browserSimHashes.b1Hash === nodeHashes.b1Hash;

  const relayPixelPass = br.relayClusters.length >= 3;
  const freePixelPass = br.freeClusters.length >= 3;
  const mutant16Caught = br.flatMutantClusters.length < 3;

  const pass = br.useThree && zeroConsoleErrors && zeroNetworkRequests &&
    browserMatchesNode && relayPixelPass && freePixelPass && mutant16Caught;

  appendResult({
    test: '09-browser-pixel-determinism-fps',
    pass,
    rendererBackend: br.rendererBackend,
    resolution: br.resolution,
    useThree: br.useThree,
    consoleErrorCount: br.consoleErrors.length,
    networkRequestCount: br.networkRequests.length,
    browserMatchesNode,
    nodeHashes,
    browserSimHashes: br.browserSimHashes,
    pixelTest: {
      relayClusterCount: br.relayClusters.length,
      relayClusters: br.relayClusters,
      freeClusterCount: br.freeClusters.length,
      freeClusters: br.freeClusters
    },
    mutant16: {
      id: 16,
      name: 'Renderer paints ground single flat colour',
      caught: mutant16Caught,
      flatClusterCount: br.flatMutantClusters.length,
      flatClusters: br.flatMutantClusters
    },
    frameTimes: br.frameTimes
  });

  console.log(`[09] Real browser pixel, determinism & FPS: ${pass ? 'PASS' : 'FAIL'} (three=${br.useThree}, nodeMatch=${browserMatchesNode}, relayC=${br.relayClusters.length}, freeC=${br.freeClusters.length}, flatC=${br.flatMutantClusters.length}, M16=${mutant16Caught})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
