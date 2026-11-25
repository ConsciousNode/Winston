'use strict';
const { readHtml, extractScript, sha256, appendResult } = require('./lib.js');

const EXPECTED_THREE_SHA256 = '9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2';

function run() {
  const html = readHtml();
  const htmlHash = sha256(html);
  const threeBlock = extractScript(html, 'three-r128');
  const actualSha = sha256(Buffer.from(threeBlock, 'utf8'));
  const hashMatches = actualSha === EXPECTED_THREE_SHA256;
  const hasMitLicense = html.includes('The MIT License') && html.includes('three.js authors');
  const htmlNoThree = html.replace(/<script id="three-r128">[\s\S]*?<\/script>/, "");
  const externalUrls = htmlNoThree.match(/https?:\/\/[^\s"'<>]+/g) || [];
  const offlineClean = externalUrls.length === 0;

  // Mutant #14: alter inlined Three.js by 1 byte in memory -> hash check must catch it
  const mutatedThree = threeBlock.slice(0, -1) + (threeBlock.endsWith(';') ? ' ' : ';');
  const mutatedSha = sha256(Buffer.from(mutatedThree, 'utf8'));
  const mutant14Caught = hashMatches && (mutatedSha !== EXPECTED_THREE_SHA256);

  const pass = hashMatches && hasMitLicense && offlineClean && mutant14Caught;
  appendResult({
    test: '01-threejs-and-offline',
    pass,
    htmlSha256: htmlHash,
    expectedThreeSha256: EXPECTED_THREE_SHA256,
    actualThreeSha256: actualSha,
    threeByteLength: Buffer.byteLength(threeBlock, 'utf8'),
    hasMitLicense,
    externalUrlCount: externalUrls.length,
    mutant14: { id: 14, name: 'Inlined Three.js altered by 1 byte', caught: mutant14Caught, mutatedSha: mutatedSha.slice(0, 12) }
  });
  console.log(`[01] Three.js SHA-256 & offline: ${pass ? 'PASS' : 'FAIL'} (sha=${actualSha.slice(0, 12)}, extUrls=${externalUrls.length}, M14=${mutant14Caught})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
