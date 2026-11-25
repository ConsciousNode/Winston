'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT_DIR, 'winston.html');
const SPOILERS_PATH = path.join(ROOT_DIR, 'SPOILERS.md');
const RESULTS_PATH = path.join(ROOT_DIR, 'results.jsonl');

function sha256(strOrBuf) {
  return crypto.createHash('sha256').update(strOrBuf).digest('hex');
}

function readHtml() {
  return fs.readFileSync(HTML_PATH, 'utf8');
}

function extractScript(html, id) {
  const rx = new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)</script>`);
  const m = html.match(rx);
  if (!m) throw new Error(`Script #${id} not found in winston.html`);
  return m[1];
}

/**
 * Loads the simulation core from an HTML string inside a fresh Node vm.Context
 * with NO Three.js (`THREE` is undefined), guaranteeing renderer independence.
 */
function loadSimCoreFromHtml(html) {
  const coreSrc = extractScript(html, 'winston-sim-core');
  const sandbox = {
    console,
    Math,
    Uint8Array, Uint32Array, Int16Array, Float64Array, DataView, ArrayBuffer,
    Map, Set, Object, Array, JSON, Error, Number, String, Boolean, Infinity, NaN, isNaN,
    globalThis: {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(coreSrc, sandbox, { filename: 'winston-sim-core.js' });
  if (!sandbox.__WINSTON_CORE__) throw new Error('Failed to load __WINSTON_CORE__');
  return sandbox.__WINSTON_CORE__;
}

function appendResult(record) {
  const enriched = {
    ts: new Date().toISOString(),
    ...record
  };
  fs.appendFileSync(RESULTS_PATH, JSON.stringify(enriched) + '\n', 'utf8');
  return enriched;
}

function percentiles(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const at = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return {
    n: s.length,
    min: s[0],
    p5: at(0.05),
    p25: at(0.25),
    p50: at(0.50),
    p75: at(0.75),
    p95: at(0.95),
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length
  };
}

module.exports = {
  ROOT_DIR,
  HTML_PATH,
  SPOILERS_PATH,
  RESULTS_PATH,
  sha256,
  readHtml,
  extractScript,
  loadSimCoreFromHtml,
  appendResult,
  percentiles
};
