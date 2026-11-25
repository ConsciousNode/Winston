# Winston
Packets by pigeon.

**The Long Way Round, by Air.** One real TritOS file is sent from one Triton desktop to another over a sincere TCP stack. The only link layer is simulated homing pigeons carrying paper barcodes across a farm. Every stage is an honest instrument: the absurdity lives in the link layer, and everything else is real. Kham never flies; his trits do.

What's in it:

- **Ternary vs binary barcodes.** Black, white and *grey* dots on rain-smudged paper. The experiment measures the smudge level at which trit-dots stop beating bit-dots. It's the multi-level-cell flash tradeoff, measured on pigeons.
- **TCP meets pigeons.** Stock TCP against round trips of about an hour, then an avian-tuned TCP. A hawk that eats exactly the retransmit.
- **Calibrated to history.** The flight model is fitted to the Bergen Linux User Group's real RFC 1149 run (28 April 2001): 9 pings, 4 replies. It's then frozen and used to predict, blind, the flight of Winston, the South African pigeon who beat ADSL in 2009.
- **Winston mode.** One bird carries the whole disk image on a microSD and races the packet stream.
- **3D and flyable.** You can pilot the pigeons yourself, and your flights are measured.
- **And a free-flight mode that is secretly something else.** Go find out.

## Status

- **Spec:** [`SPEC.md`](SPEC.md), rev 4.1, written by Ed Interim and Kehai Interim and amended by Kham.
- **Built by:** Gemini Neon (sent 2026-11-25).
- **Delivery:** not yet arrived. When it lands, it is committed exactly as delivered, then audited.

## Preregistration

The spec was committed before the builder saw it, in the predecessor repo [Long-Way-Round](https://github.com/ConsciousNode/Long-Way-Round/tree/main/by-air):

- `4e8bdc1`: rev 4, the full spec and success bar.
- `5c901de`: rev 4.1, the name changed to Winston (title only).

`SPEC.md` here is byte-identical to `5c901de` (sha256 `669049d8…5fdf5d18ba`). The success bar is §6 of the spec, and it doesn't move.

Some real-world outcomes are deliberately left out of the spec, so the Winston prediction is blind. They'll be published with the audit.

ConsciousNode SoftWorks · Xinu: single file, zero dependencies, offline.
