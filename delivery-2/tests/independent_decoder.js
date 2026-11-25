/* ============================================================================
 * INDEPENDENT PAPER-SCRAP BARCODE DECODER (Written strictly from §3)
 * Uses table-driven CRC-32 and Sugiyama/Euclid Extended Algorithm over GF(2^8).
 * Intentionally shares zero function/variable identifiers with primary decoder
 * beyond the §3 domain vocabulary.
 * ============================================================================ */
'use strict';

class PaperScrapVerifier {
  constructor() {
    this.antilogTbl = new Uint8Array(512);
    this.logTbl = new Uint8Array(256);
    let elem = 1;
    for (let idx = 0; idx < 255; idx++) {
      this.antilogTbl[idx] = elem;
      this.logTbl[elem] = idx;
      elem = (elem << 1) ^ (elem & 0x80 ? 0x11d : 0);
    }
    for (let idx = 255; idx < 512; idx++) {
      this.antilogTbl[idx] = this.antilogTbl[idx - 255];
    }

    this.crcLookup = new Uint32Array(256);
    for (let slot = 0; slot < 256; slot++) {
      let acc = slot;
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        acc = (acc & 1) ? (0xedb88320 ^ (acc >>> 1)) : (acc >>> 1);
      }
      this.crcLookup[slot] = acc >>> 0;
    }
  }

  mulField(lhs, rhs) {
    if (lhs === 0 || rhs === 0) return 0;
    return this.antilogTbl[this.logTbl[lhs] + this.logTbl[rhs]];
  }

  invField(gfElem) {
    if (gfElem === 0) throw new Error('Zero inverse');
    return this.antilogTbl[255 - this.logTbl[gfElem]];
  }

  evalPolynomial(coeffs, pt) {
    // Low-to-high degree representation: coeffs[0] + coeffs[1]*x + ...
    let total = 0;
    let power = 1;
    for (let deg = 0; deg < coeffs.length; deg++) {
      if (coeffs[deg] !== 0) total ^= this.mulField(coeffs[deg], power);
      power = this.mulField(power, pt);
    }
    return total;
  }

  trimPoly(poly) {
    let top = poly.length - 1;
    while (top > 0 && poly[top] === 0) top--;
    return poly.slice(0, top + 1);
  }

  addPoly(pa, pb) {
    const sz = pa.length > pb.length ? pa.length : pb.length;
    const polySum = new Uint8Array(sz);
    for (let u = 0; u < pa.length; u++) polySum[u] ^= pa[u];
    for (let u = 0; u < pb.length; u++) polySum[u] ^= pb[u];
    return this.trimPoly(polySum);
  }

  mulPoly(pa, pb) {
    const prod = new Uint8Array(pa.length + pb.length - 1);
    for (let u = 0; u < pa.length; u++) {
      if (pa[u] === 0) continue;
      for (let v = 0; v < pb.length; v++) {
        prod[u + v] ^= this.mulField(pa[u], pb[v]);
      }
    }
    return this.trimPoly(prod);
  }

  divPoly(dividend, divisor) {
    let rem = this.trimPoly(new Uint8Array(dividend));
    const dv = this.trimPoly(divisor);
    const dvDeg = dv.length - 1;
    const leadInv = this.invField(dv[dvDeg]);
    if (rem.length - 1 < dvDeg) return { quot: new Uint8Array([0]), rem };
    const quot = new Uint8Array(rem.length - dvDeg);
    while (rem.length - 1 >= dvDeg && !(rem.length === 1 && rem[0] === 0)) {
      const shift = rem.length - 1 - dvDeg;
      const factor = this.mulField(rem[rem.length - 1], leadInv);
      quot[shift] = factor;
      for (let u = 0; u <= dvDeg; u++) {
        rem[u + shift] ^= this.mulField(dv[u], factor);
      }
      rem = this.trimPoly(rem);
    }
    return { quot: this.trimPoly(quot), rem };
  }

  computeCrc32(octets) {
    let reg = 0xffffffff;
    for (let pos = 0; pos < octets.length; pos++) {
      reg = this.crcLookup[(reg ^ octets[pos]) & 0xff] ^ (reg >>> 8);
    }
    return (reg ^ 0xffffffff) >>> 0;
  }

  // Sugiyama Euclidean RS decoder (independent of Berlekamp-Massey)
  correctBlock(blockBytes, parityCount) {
    const blockLen = blockBytes.length;
    const work = new Uint8Array(blockBytes);
    // Reverse into low-to-high polynomial order: work[blockLen - 1] is x^0
    const rev = new Uint8Array(blockLen);
    for (let pos = 0; pos < blockLen; pos++) rev[pos] = work[blockLen - 1 - pos];

    const syndPoly = new Uint8Array(parityCount);
    let anyNonZero = false;
    for (let rootIdx = 0; rootIdx < parityCount; rootIdx++) {
      const sv = this.evalPolynomial(rev, this.antilogTbl[rootIdx]);
      syndPoly[rootIdx] = sv;
      if (sv !== 0) anyNonZero = true;
    }
    if (!anyNonZero) {
      return { valid: true, payload: work.slice(0, blockLen - parityCount), fixes: 0 };
    }

    const halfParity = Math.floor(parityCount / 2);
    const xPow = new Uint8Array(parityCount + 1);
    xPow[parityCount] = 1;

    let rPrev = xPow;
    let rCurr = this.trimPoly(syndPoly);
    let tPrev = new Uint8Array([0]);
    let tCurr = new Uint8Array([1]);

    while (rCurr.length - 1 >= halfParity) {
      const { quot, rem } = this.divPoly(rPrev, rCurr);
      const tNext = this.addPoly(tPrev, this.mulPoly(quot, tCurr));
      rPrev = rCurr;
      rCurr = rem;
      tPrev = tCurr;
      tCurr = tNext;
    }

    if (tCurr[0] === 0) return { valid: false, payload: null, fixes: -1 };
    const normInv = this.invField(tCurr[0]);
    const locator = new Uint8Array(tCurr.length);
    for (let deg = 0; deg < tCurr.length; deg++) locator[deg] = this.mulField(tCurr[deg], normInv);
    const evaluator = new Uint8Array(rCurr.length);
    for (let deg = 0; deg < rCurr.length; deg++) evaluator[deg] = this.mulField(rCurr[deg], normInv);

    const errDegree = locator.length - 1;
    if (errDegree > halfParity || errDegree === 0) {
      return { valid: false, payload: null, fixes: -1 };
    }

    const badIndices = [];
    const badLocs = [];
    for (let expIdx = 0; expIdx < blockLen; expIdx++) {
      const invAlpha = this.antilogTbl[(255 - expIdx) % 255];
      if (this.evalPolynomial(locator, invAlpha) === 0) {
        badIndices.push(blockLen - 1 - expIdx);
        badLocs.push(this.antilogTbl[expIdx % 255]);
      }
    }
    if (badIndices.length !== errDegree) {
      return { valid: false, payload: null, fixes: -1 };
    }

    // Formal derivative of locator (odd powers)
    const deriv = new Uint8Array(locator.length);
    for (let deg = 1; deg < locator.length; deg += 2) deriv[deg - 1] = locator[deg];

    for (let slot = 0; slot < errDegree; slot++) {
      const locVal = badLocs[slot];
      const invLoc = this.invField(locVal);
      const evVal = this.evalPolynomial(evaluator, invLoc);
      const drVal = this.evalPolynomial(deriv, invLoc);
      if (drVal === 0) return { valid: false, payload: null, fixes: -1 };
      const delta = this.mulField(locVal, this.mulField(evVal, this.invField(drVal)));
      work[badIndices[slot]] ^= delta;
    }

    // Final syndrome check
    for (let pos = 0; pos < blockLen; pos++) rev[pos] = work[blockLen - 1 - pos];
    for (let rootIdx = 0; rootIdx < parityCount; rootIdx++) {
      if (this.evalPolynomial(rev, this.antilogTbl[rootIdx]) !== 0) {
        return { valid: false, payload: null, fixes: -1 };
      }
    }
    return { valid: true, payload: work.slice(0, blockLen - parityCount), fixes: errDegree };
  }

  inspectScrap(readings, modeLabel) {
    const isBinaryMode = modeLabel === 'binary';
    const parityLen = isBinaryMode ? 22 : 32;
    const totalCoded = isBinaryMode ? 88 : 128;
    const maxSegment = isBinaryMode ? 50 : 80;
    const rawOctets = new Uint8Array(totalCoded);

    if (isBinaryMode) {
      for (let bytePos = 0; bytePos < totalCoded; bytePos++) {
        let accum = 0;
        for (let offset = 0; offset < 8; offset++) {
          const sampleVal = readings[bytePos * 8 + offset];
          accum = (accum << 1) | (sampleVal >= 0.5 ? 1 : 0);
        }
        rawOctets[bytePos] = accum;
      }
    } else {
      for (let pairPos = 0; pairPos < totalCoded; pairPos += 2) {
        const startDot = (pairPos / 2) * 11;
        let combined = 0;
        let weight = 1;
        for (let tritPos = 0; tritPos < 11; tritPos++) {
          const sampleVal = readings[startDot + tritPos];
          const level = sampleVal < 0.25 ? 0 : (sampleVal < 0.75 ? 1 : 2);
          combined += level * weight;
          weight *= 3;
        }
        if (combined > 65535) {
          rawOctets[pairPos] = 0xff;
          rawOctets[pairPos + 1] = 0xff;
        } else {
          rawOctets[pairPos] = combined & 0xff;
          rawOctets[pairPos + 1] = (combined >>> 8) & 0xff;
        }
      }
    }

    const rsOutcome = this.correctBlock(rawOctets, parityLen);
    if (!rsOutcome.valid) return { accepted: false, status: 'RS_FAIL' };

    const packetBuf = rsOutcome.payload;
    const dv = new DataView(packetBuf.buffer, packetBuf.byteOffset, packetBuf.byteLength);
    const bodyLen = dv.getUint16(10, true);
    const wireCrc = dv.getUint32(12, true);
    if (bodyLen > maxSegment) return { accepted: false, status: 'BAD_LEN' };

    const crcInput = new Uint8Array(12 + bodyLen);
    crcInput.set(packetBuf.subarray(0, 12), 0);
    crcInput.set(packetBuf.subarray(16, 16 + bodyLen), 12);
    if (this.computeCrc32(crcInput) !== wireCrc) {
      return { accepted: false, status: 'CRC_FAIL' };
    }
    return { accepted: true, status: 'OK', fixes: rsOutcome.fixes };
  }
}

module.exports = { PaperScrapVerifier };
