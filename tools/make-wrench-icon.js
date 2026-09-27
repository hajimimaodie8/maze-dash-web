/*
 * Generate the wrench icon for the new "custom levels" tab.
 *
 *   node tools/make-wrench-icon.js [--out file.png] [--size 128] [--color '#7C6BF2']
 *
 * The game's tab icons (shop / skin / Home / task / set) are flat coloured PNGs
 * shown at 70x70, so this draws a matching flat wrench and writes a PNG. The
 * built-in icon is also emitted as a base64 data URI, ready to paste into
 * web/custom-tab.js.
 *
 * Pure Node: the rasteriser is a few signed-distance functions and the PNG is
 * written with zlib, so there is no image-library dependency.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const SIZE = Number(flag('size', 128));
const OUT = flag('out', path.resolve(__dirname, '..', 'dist', 'tab-wrench.png'));
const COLOR = flag('color', '#7C6BF2');
const OUTLINE = flag('outline', '#4B3BC4');   // same dark indigo the game's icons use
const OUTLINE_W = Number(flag('outline-width', 5));
const SS = 3;                       // supersampling factor

function hex(c) {
    const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
    if (!m) { throw new Error('bad colour: ' + c); }
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function shade(rgb, f) {
    return rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
}

/* ---------- signed distance helpers (positive = outside) ---------- */
const len = (x, y) => Math.hypot(x, y);

function sdCircle(px, py, cx, cy, r) {
    return len(px - cx, py - cy) - r;
}
function sdSegment(px, py, ax, ay, bx, by, r) {
    const pax = px - ax, pay = py - ay;
    const bax = bx - ax, bay = by - ay;
    const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
    return len(pax - bax * h, pay - bay * h) - r;
}
/* tapered capsule: radius interpolates from ra (at a) to rb (at b) */
function sdTapered(px, py, ax, ay, bx, by, ra, rb) {
    const pax = px - ax, pay = py - ay;
    const bax = bx - ax, bay = by - ay;
    const denom = bax * bax + bay * bay;
    const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / denom));
    const cx = ax + bax * h, cy = ay + bay * h;
    const r = ra + (rb - ra) * h;
    return len(px - cx, py - cy) - r;
}
function sdRing(px, py, cx, cy, outer, inner) {
    const d = len(px - cx, py - cy);
    return Math.max(d - outer, inner - d);
}
/* angular wedge test, angle in degrees, 0 = +x, growing clockwise on screen */
function inWedge(px, py, cx, cy, deg, halfWidth) {
    const a = Math.atan2(py - cy, px - cx) * 180 / Math.PI;
    let diff = ((a - deg) % 360 + 540) % 360 - 180;
    return Math.abs(diff) <= halfWidth;
}

/* ---------- the wrench, in a 128x128 design space ---------- */
/* bold, flat and outlined to match the game's other tab icons */
const HEAD = { x: 44, y: 44, outer: 29, inner: 15.5 };
const HANDLE = { ax: 58, ay: 58, bx: 99, by: 99, ra: 14.5, rb: 11.5 };
const TAIL = { x: 102, y: 102, outer: 15.5, inner: 9 };
const JAW_DEG = 225;      // up-left
const JAW_HALF = 38;

function wrenchSDF(px, py) {
    const head = sdRing(px, py, HEAD.x, HEAD.y, HEAD.outer, HEAD.inner);
    // cut the jaw open
    const jawCut = inWedge(px, py, HEAD.x, HEAD.y, JAW_DEG, JAW_HALF)
        ? -1e9
        : sdCircle(px, py, HEAD.x, HEAD.y, HEAD.outer + 6);
    const headShape = Math.max(head, jawCut);

    const handle = sdTapered(px, py, HANDLE.ax, HANDLE.ay, HANDLE.bx, HANDLE.by, HANDLE.ra, HANDLE.rb);
    const tail = sdRing(px, py, TAIL.x, TAIL.y, TAIL.outer, TAIL.inner);
    return Math.min(headShape, handle, tail);
}

function render() {
    const base = hex(COLOR);
    const dark = shade(base, 0.74);
    const light = shade(base, 1.18);
    const line = hex(OUTLINE);
    const px = new Uint8Array(SIZE * SIZE * 4);
    const S = SIZE / 128;                     // design -> pixels

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            let outer = 0, fill = 0, rim = 0, hi = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const dx = (x + (sx + 0.5) / SS) / S;
                    const dy = (y + (sy + 0.5) / SS) / S;
                    const d = wrenchSDF(dx, dy);
                    if (d <= OUTLINE_W) { outer++; }
                    if (d <= 0) {
                        fill++;
                        if (d > -3.0) { rim++; }                    // darker edge band
                        // lighter highlight along the upper-left of the shape
                        if (wrenchSDF(dx - 3.6, dy - 3.6) <= -1.4) { hi++; }
                    }
                }
            }
            const n = SS * SS;
            if (!outer) { continue; }
            const a = outer / n;
            let c = line;
            if (fill / n > 0.5) {
                c = base;
                if (rim / n > 0.45) { c = dark; }
                else if (hi / n > 0.55) { c = light; }
            }
            const o = (y * SIZE + x) * 4;
            px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
            px[o + 3] = Math.round(a * 255);
        }
    }
    return px;
}

/* ---------- minimal PNG writer (RGBA8, filter 0) ---------- */
function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xff;
        for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td), 0);
    return Buffer.concat([len, td, crc]);
}
function writePNG(pixels, size) {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y++) {
        raw[y * (size * 4 + 1)] = 0;
        Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const png = writePNG(render(), SIZE);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);

const b64 = png.toString('base64');
const dataUri = 'data:image/png;base64,' + b64;
console.log(`wrote ${OUT}  (${SIZE}x${SIZE}, ${png.length} bytes, colour ${COLOR})`);
console.log(`base64 length: ${b64.length}`);

/* --inject <file>: rewrite the icon constant between the marker comments, so the
   tab module always carries a freshly generated icon. */
const INJECT = flag('inject', '');
if (INJECT) {
    const target = path.resolve(INJECT);
    const START = '/* @generated-icon-start */';
    const END = '/* @generated-icon-end */';
    const src = fs.readFileSync(target, 'utf8');
    const a = src.indexOf(START);
    const b = src.indexOf(END);
    if (a < 0 || b < 0 || b < a) {
        throw new Error(`markers not found in ${target}`);
    }
    const block = `${START}\n    var WRENCH_DATA_URI = '${dataUri}';\n    ${END}`;
    fs.writeFileSync(target, src.slice(0, a) + block + src.slice(b + END.length), 'utf8');
    console.log(`injected the icon into ${target}`);
}

if (args.includes('--print-datauri')) {
    console.log(dataUri);
}
