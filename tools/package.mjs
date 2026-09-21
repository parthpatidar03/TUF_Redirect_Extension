/**
 * Builds the Chrome Web Store upload: dsa-bridge-<version>.zip containing only
 * the files the extension actually runs. Development tooling stays out.
 *
 *   node tools/package.mjs
 *
 * The archive is written here rather than shelled out to Compress-Archive,
 * which stores Windows backslashes in entry names and produces uploads the Web
 * Store can reject.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const INCLUDE = [
  'manifest.json',
  'scripts/resolver.js',
  'scripts/content.js',
  'styles/content.css',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'data/leetcode.json',
  'data/gfg.json',
  'data/overrides.json',
  'data/problems.json',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

const missing = INCLUDE.filter((f) => !fs.existsSync(path.join(root, f)));
if (missing.length) {
  console.error('missing files:\n  ' + missing.join('\n  '));
  process.exit(1);
}

// Everything the manifest names must be in the bundle.
const referenced = [
  ...manifest.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])]),
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon),
  manifest.action.default_popup,
  ...manifest.web_accessible_resources.flatMap((r) => r.resources)
];
const unbundled = referenced.filter((f) => !INCLUDE.includes(f));
if (unbundled.length) {
  console.error('manifest references files that are not bundled:\n  ' + unbundled.join('\n  '));
  process.exit(1);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const locals = [];
const central = [];
let offset = 0;

for (const name of INCLUDE) {
  const raw = fs.readFileSync(path.join(root, name));
  const deflated = zlib.deflateRawSync(raw, { level: 9 });
  // Only compress when it actually helps; otherwise store.
  const useDeflate = deflated.length < raw.length;
  const body = useDeflate ? deflated : raw;
  const method = useDeflate ? 8 : 0;
  const nameBuf = Buffer.from(name, 'utf8'); // forward slashes, as the spec wants
  const crc = crc32(raw);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);       // version needed
  local.writeUInt16LE(0, 6);        // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10);       // mod time
  local.writeUInt16LE(0x21, 12);    // mod date (1996-01-01, fixed for reproducibility)
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);       // extra field length
  locals.push(local, nameBuf, body);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);       // version made by
  entry.writeUInt16LE(20, 6);       // version needed
  entry.writeUInt16LE(0, 8);
  entry.writeUInt16LE(method, 10);
  entry.writeUInt16LE(0, 12);
  entry.writeUInt16LE(0x21, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(body.length, 20);
  entry.writeUInt32LE(raw.length, 24);
  entry.writeUInt16LE(nameBuf.length, 28);
  entry.writeUInt16LE(0, 30);       // extra
  entry.writeUInt16LE(0, 32);       // comment
  entry.writeUInt16LE(0, 34);       // disk number
  entry.writeUInt16LE(0, 36);       // internal attrs
  entry.writeUInt32LE(0, 38);       // external attrs
  entry.writeUInt32LE(offset, 42);
  central.push(entry, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(INCLUDE.length, 8);
end.writeUInt16LE(INCLUDE.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const zip = path.join(root, `dsa-bridge-${manifest.version}.zip`);
fs.writeFileSync(zip, Buffer.concat([...locals, centralBuf, end]));

const kb = (fs.statSync(zip).size / 1024).toFixed(0);
console.log(`${path.basename(zip)}  ${kb} KB  (${INCLUDE.length} files)`);
console.log('Upload at https://chrome.google.com/webstore/devconsole');
