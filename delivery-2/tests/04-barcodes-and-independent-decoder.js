'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readHtml, extractScript, loadSimCoreFromHtml, appendResult } = require('./lib.js');
const { PaperScrapVerifier } = require('./independent_decoder.js');

const BUILTINS_AND_SPEC_VOCAB = new Set([
  'Uint8Array', 'Uint32Array', 'Float64Array', 'DataView', 'Math', 'Error', 'Object', 'Array', 'module', 'exports',
  'length', 'slice', 'push', 'subarray', 'set', 'buffer', 'byteOffset', 'byteLength', 'getUint16', 'getUint32', 'floor',
  'binary', 'ternary', 'dots', 'bytes', 'sigma', 'trits', 'payload', 'RS_FAIL', 'BAD_LEN', 'CRC_FAIL', 'OK'
]);

function walkAst(node, idSet, typeHist, shapeList) {
  if (!node || typeof node !== 'object') return;
  if (node.type) {
    typeHist[node.type] = (typeHist[node.type] || 0) + 1;
    shapeList.push(node.type);
  }
  if (node.type === 'Identifier' && node.name && !BUILTINS_AND_SPEC_VOCAB.has(node.name)) {
    idSet.add(node.name);
  }
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'raw') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(ch => walkAst(ch, idSet, typeHist, shapeList));
    else if (v && typeof v === 'object') walkAst(v, idSet, typeHist, shapeList);
  }
}

function run() {
  const html = readHtml();
  const W = loadSimCoreFromHtml(html);

  // 1. Barcode sigma sweep & crossover sigma*
  const sigmas = [0, 0.02, 0.04, 0.06, 0.07, 0.08, 0.09, 0.095, 0.10, 0.105, 0.11, 0.12, 0.14, 0.16, 0.18, 0.20, 0.24];
  const sweep = W.runBarcodeSweep(sigmas, 100, 0x516AA01);
  let crossoverSigma = null;
  for (let i = 1; i < sweep.length; i++) {
    const prevDiff = sweep[i - 1].ternary.netGoodputBitsPerPacket - sweep[i - 1].binary.netGoodputBitsPerPacket;
    const currDiff = sweep[i].ternary.netGoodputBitsPerPacket - sweep[i].binary.netGoodputBitsPerPacket;
    if (prevDiff >= 0 && currDiff < 0) {
      const frac = prevDiff / (prevDiff - currDiff);
      crossoverSigma = sweep[i - 1].sigma + frac * (sweep[i].sigma - sweep[i - 1].sigma);
      break;
    }
  }

  // 2. Full transfer decoder samples checked against independent §3 decoder
  const xfer = W.runTcpTransfer({
    seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main',
    recordDraws: false, captureDecoderSamples: true
  });
  const verifier = new PaperScrapVerifier();
  const samples = xfer.decoderSamples || [];
  let agreeCount = 0;
  for (const smp of samples) {
    const ind = verifier.inspectScrap(smp.intensities, smp.encoding);
    if (ind.accepted === smp.verdict && ind.status === smp.reason) agreeCount++;
  }
  const allAgreed = samples.length > 0 && agreeCount === samples.length;

  // 3. Mechanical AST & identifier independence check via acorn
  const coreSrc = extractScript(html, 'winston-sim-core');
  const decStart = coreSrc.indexOf('function rsDecode(');
  const decEnd = coreSrc.indexOf('function encodeSegmentToScrap(');
  const primaryDecoderSrc = coreSrc.slice(decStart, decEnd);
  const indepSrc = fs.readFileSync(path.join(__dirname, 'independent_decoder.js'), 'utf8');

  fs.writeFileSync('/tmp/r2_primary_dec.js', primaryDecoderSrc);
  fs.writeFileSync('/tmp/r2_indep_dec.js', indepSrc);
  const astP = JSON.parse(execSync('acorn --ecma2020 /tmp/r2_primary_dec.js', { maxBuffer: 10 * 1024 * 1024 }).toString());
  const astI = JSON.parse(execSync('acorn --ecma2020 /tmp/r2_indep_dec.js', { maxBuffer: 10 * 1024 * 1024 }).toString());

  const pIds = new Set(), iIds = new Set();
  const pHist = {}, iHist = {};
  const pShape = [], iShape = [];
  walkAst(astP, pIds, pHist, pShape);
  walkAst(astI, iIds, iHist, iShape);

  const sharedIds = [...pIds].filter(x => iIds.has(x));
  const trigrams = (arr) => {
    const s = new Set();
    for (let i = 0; i < arr.length - 2; i++) s.add(arr[i] + '>' + arr[i + 1] + '>' + arr[i + 2]);
    return s;
  };
  const pTri = trigrams(pShape), iTri = trigrams(iShape);
  const inter = [...pTri].filter(x => iTri.has(x)).length;
  const union = new Set([...pTri, ...iTri]).size;
  const astTrigramJaccard = Number((inter / union).toFixed(4));

  const pass = crossoverSigma !== null && allAgreed && sharedIds.length === 0 && astTrigramJaccard < 0.75;
  appendResult({
    test: '04-barcodes-and-independent-decoder',
    pass,
    mssBytes: { binary: W.SCRAP_SPEC.binary.mssBytes, ternary: W.SCRAP_SPEC.ternary.mssBytes },
    crossoverSigma: Number(crossoverSigma.toFixed(4)),
    sweep,
    independentDecoder: {
      samplesChecked: samples.length,
      verdictsAgreed: agreeCount,
      allAgreed,
      primaryIdentifierCount: pIds.size,
      independentIdentifierCount: iIds.size,
      sharedNonVocabIdentifiers: sharedIds,
      astNodeCountPrimary: pShape.length,
      astNodeCountIndependent: iShape.length,
      astTrigramJaccard
    }
  });
  console.log(`[04] Barcodes & independent decoder: ${pass ? 'PASS' : 'FAIL'} (sigma*=${crossoverSigma.toFixed(4)}, agree=${agreeCount}/${samples.length}, sharedIds=${sharedIds.length}, jaccard=${astTrigramJaccard})`);
  if (!pass) process.exit(1);
}

if (require.main === module) run();
module.exports = { run };
