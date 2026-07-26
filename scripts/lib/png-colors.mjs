/**
 * Minimal PNG reader: the set of opaque colours a file uses.
 *
 * The character sheet manifest names exact hex values from the vendored art,
 * so the smoke test has to be able to read those PNGs. Pulling in an image
 * library for one set-of-colours query would be the only Node dependency in
 * the repo, and the sheets are all 8-bit truecolour, so the handful of chunk
 * and filter cases they use are decoded here instead.
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Bytes per pixel for the colour types this reader supports. */
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function chunks(buf) {
  const out = [];
  let i = SIGNATURE.length;
  while (i + 8 <= buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    out.push({ type, data: buf.subarray(i + 8, i + 8 + length) });
    i += 12 + length;
    if (type === "IEND") break;
  }
  return out;
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/** Undo the per-scanline filters, returning raw samples. */
function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const dst = y * stride;
    const up = dst - stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? out[dst + x - bpp] : 0;
      const above = y > 0 ? out[up + x] : 0;
      const corner = y > 0 && x >= bpp ? out[up + x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += above;
      else if (filter === 3) value += (left + above) >> 1;
      else if (filter === 4) value += paeth(left, above, corner);
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      out[dst + x] = value & 0xff;
    }
  }
  return out;
}

/**
 * @param {string} file
 * @returns {string[]} lowercase `#rrggbb` for every colour with a visible pixel
 */
export function pngColors(file) {
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${file} is not a PNG`);

  const parts = chunks(buf);
  const ihdr = parts.find((c) => c.type === "IHDR");
  if (!ihdr) throw new Error(`${file} has no header`);
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const depth = ihdr.data.readUInt8(8);
  const colorType = ihdr.data.readUInt8(9);
  const interlace = ihdr.data.readUInt8(12);

  const channels = CHANNELS[colorType];
  if (depth !== 8 || !channels || interlace !== 0) {
    throw new Error(`${file}: only 8-bit non-interlaced truecolour/grey PNGs are supported`);
  }

  const idat = Buffer.concat(parts.filter((c) => c.type === "IDAT").map((c) => c.data));
  const pixels = unfilter(inflateSync(idat), width, height, channels);

  const hex = (n) => n.toString(16).padStart(2, "0");
  const seen = new Set();
  for (let i = 0; i < pixels.length; i += channels) {
    let r;
    let g;
    let b;
    let a = 255;
    if (colorType === 0) {
      r = pixels[i]; g = r; b = r;
    } else if (colorType === 4) {
      r = pixels[i]; g = r; b = r; a = pixels[i + 1];
    } else {
      r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2];
      if (colorType === 6) a = pixels[i + 3];
    }
    if (a === 0) continue;
    seen.add(`#${hex(r)}${hex(g)}${hex(b)}`);
  }
  return [...seen];
}
