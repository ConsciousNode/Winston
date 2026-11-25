'use strict';
const { readHtml, extractScript, loadSimCoreFromHtml, sha256, appendResult } = require('./lib.js');

const EXPECTED_R1_PARAMS_HASH = 'a1b2718096e51c1018e33dd83669da756ba14f84bef1acfc0063ed4dba9988b7';

function run() {
  const html = readHtml();
  const coreSrc = extractScript(html, 'winston-sim-core');
  const coreHash = sha256(coreSrc);

  // Strip comments and verify zero banned Math.* calls in sim core
  const stripped = coreSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const bannedMath = stripped.match(/\bMath\.(random|sin|cos|atan2|exp)\b/g) || [];

  // Load cleanly with THREE absent
  const W = loadSimCoreFromHtml(html);
  const r1HashMatches = W.CALIBRATED_PARAMS_HASH === EXPECTED_R1_PARAMS_HASH;
  const xfer = W.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
  const headlessWorks = xfer.success && xfer.hashMatch;

  // Mutant #15: sim core calls into Three.js -> must fail when THREE is absent in headless Node
  const mutatedHtml = html.replace(
    'function createWorld(seed, opts) {',
    'function createWorld(seed, opts) { const _leak = new THREE.Vector3(0,0,0);'
  );
  let mutant15Caught = false;
  let mutant15Err = '';
  try {
    const WM = loadSimCoreFromHtml(mutatedHtml);
    WM.createWorld(101);
  } catch (e) {
    mutant15Caught = /THREE is not defined/i.test(String(e));
    mutant15Err = String(e);
  }

  const pass = bannedMath.length === 0 && r1HashMatches && headlessWorks && mutant15Caught;
  appendResult({
    test: '02-headless-sim-and-no-three',
    pass,
    simCoreSha256: coreHash,
    r1ParamsHash: W.CALIBRATED_PARAMS_HASH,
    r1HashMatches,
    bannedMathCount: bannedMath.length,
    headlessTransferSuccess: headlessWorks,
    headlessTransferTimeS: xfer.completionTimeS,
    mutant15: { id: 15, name: 'Sim core calls into Three.js', caught: mutant15Caught, error: mutant15Err }
  });
  console.log(`[02] Headless sim & no-Three.js: ${pass ? 'PASS' : 'FAIL'} (r1Hash=${r1HashMatches}, M15=${mutant15Caught})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
