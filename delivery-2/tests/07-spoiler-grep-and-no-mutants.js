'use strict';
const fs = require('fs');
const { readHtml, SPOILERS_PATH, appendResult } = require('./lib.js');

function run() {
  const html = readHtml();
  const spoilers = fs.readFileSync(SPOILERS_PATH, 'utf8');

  // Remove only the locked base64 reference script before grepping
  const htmlNoLocked = html.replace(/<script id="winston-locked-ref"[^>]*>[\s\S]*?<\/script>/, '');
  const bindingMatches = [...spoilers.matchAll(/\|\s*`([^`]+)`\s*\|/g)].map(m => m[1]);
  const forbiddenBindings = bindingMatches.filter(b => b !== 'Esc');

  const patternRegexes = [
    /\[[A-Z]\]\s*(peck|use|land|coo|view|flap|dive)/i,
    /press\s+(Space|Shift|W|A|S|D|E|F|Q|C|V)\b/i,
    /hold\s+(Shift|Space)\b/i,
    /\bWASD\b/i,
    /Pigeon Life/i
  ];

  function grepSpoilers(doc) {
    const hits = [];
    for (const b of forbiddenBindings) {
      if (doc.includes(b)) hits.push('exact:' + b);
    }
    for (const rx of patternRegexes) {
      const m = doc.match(rx);
      if (m) hits.push('regex:' + m[0]);
    }
    return hits;
  }

  const cleanHits = grepSpoilers(htmlNoLocked);
  // Mutant #11: inject "[E] peck" into player-visible HTML
  const mutHtml = htmlNoLocked.replace('Free Flight', 'Free Flight [E] peck');
  const mutHits = grepSpoilers(mutHtml);
  const mutant11Caught = cleanHits.length === 0 && mutHits.length > 0;

  // Part A.5 & C.7: grep shipped winston.html for ANY mutant switch
  const mutantSwitchRx = /\b(useMathRandomMutant|greyAsWhiteMutant|disableChecksumMutant|useNativeSinMutant|frameRateCoupledDt|hawkEatsRetransmitsOnly|disableRto|wrongLoft|infiniteFlock|mutantClip|mutants\s*=)\b/g;
  const mutantSwitchHits = html.match(mutantSwitchRx) || [];
  const noMutantSwitches = mutantSwitchHits.length === 0;

  const pass = cleanHits.length === 0 && mutant11Caught && noMutantSwitches;
  appendResult({
    test: '07-spoiler-grep-and-no-mutants',
    pass,
    forbiddenBindingsChecked: forbiddenBindings,
    cleanSpoilerHits: cleanHits,
    mutant11: { id: 11, name: 'Binding string leaks into player build', caught: mutant11Caught, injectedHits: mutHits },
    noMutantSwitchesInShippedHtml: noMutantSwitches,
    mutantSwitchHits
  });
  console.log(`[07] Spoiler grep & zero mutant switches: ${pass ? 'PASS' : 'FAIL'} (spoilers=${cleanHits.length}, mutantSwitches=${mutantSwitchHits.length}, M11=${mutant11Caught})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
