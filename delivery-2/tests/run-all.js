'use strict';
const fs = require('fs');
const { RESULTS_PATH } = require('./lib.js');

const tests = [
  require('./01-threejs-and-offline.js'),
  require('./02-headless-sim-and-no-three.js'),
  require('./03-bergen-fit-and-identifiability.js'),
  require('./04-barcodes-and-independent-decoder.js'),
  require('./05-tcp-rain-bulk-race-pilot.js'),
  require('./06-free-play-isolation.js'),
  require('./07-spoiler-grep-and-no-mutants.js'),
  require('./08-round1-mutants.js'),
  require('./09-browser-pixel-determinism-fps.js')
];

const reportGen = require('./generate-report.js');

console.log('=== WINSTON ROUND 2 TEST SUITE ===');
if (fs.existsSync(RESULTS_PATH)) fs.unlinkSync(RESULTS_PATH);

for (const t of tests) {
  t.run();
}
reportGen.generate();
console.log('=== ALL 9 TEST SUITES + REPORT GENERATION PASSED ===');
