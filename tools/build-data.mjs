/**
 * Regenerates data/leetcode.json and data/overrides.json.
 *
 *   node tools/build-data.mjs
 *
 * leetcode.json  normalised LeetCode title -> problem slug (public LeetCode API)
 * overrides.json normalised takeUforward title -> { l: lc slug, g: gfg slug }
 *                for titles the automatic matcher cannot reach on its own.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { normalize } = require(path.join(root, 'scripts', 'resolver.js'));

const LEETCODE_API = 'https://leetcode.com/api/problems/all/';

async function buildLeetcode() {
  const res = await fetch(LEETCODE_API, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('LeetCode API returned ' + res.status);
  const pairs = (await res.json()).stat_status_pairs;
  const index = {};
  for (const p of pairs) {
    const key = normalize(p.stat.question__title, false);
    if (key && !(key in index)) index[key] = p.stat.question__title_slug;
  }
  return index;
}

/**
 * GeeksforGeeks has no public problem index, so tools/gfg-verified.json holds
 * slugs confirmed live together with the canonical name GfG renders for them.
 *
 * Only that canonical name is indexed. The file also carries the takeUforward
 * titles that once pointed at each slug, but those came from a third-party list
 * of "close enough" buckets: unrelated titles share one slug, and spot-checking
 * found roughly one in ten sent people to a different problem — "Detect a cycle
 * in an undirected graph" landed on Course Schedule, "Minimum coins" on the
 * count-ways variant. They are kept for reference only. A takeUforward title
 * that needs a slug goes in overrides.source.json, checked by hand.
 */
function readGfg() {
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'gfg-verified.json'), 'utf8'));
  const index = {};
  for (const row of rows) {
    const key = normalize(row.name, false);
    if (key && !(key in index)) index[key] = row.slug;
  }
  // Two problems can share a normalised name, so the slug set is wider than the
  // index. Overrides are validated against the set.
  return { index, slugs: new Set(rows.map((r) => r.slug)) };
}

function buildOverrides(leetcodeIndex, gfgSlugs) {
  const knownLc = new Set(Object.values(leetcodeIndex));
  const manual = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'overrides.source.json'), 'utf8'));
  const out = {};
  const unknown = [];
  for (const [title, value] of Object.entries(manual)) {
    if (title.startsWith('_')) continue;
    const key = normalize(title, false);
    if (!key) continue;
    const entry = {};
    if (value.leetcode) {
      if (knownLc.has(value.leetcode)) entry.l = value.leetcode;
      else unknown.push(`${title} -> leetcode/${value.leetcode}`);
    }
    if (value.gfg) {
      if (gfgSlugs.has(value.gfg)) entry.g = value.gfg;
      else unknown.push(`${title} -> gfg/${value.gfg}`);
    }
    if (Object.keys(entry).length) out[key] = entry;
  }
  if (unknown.length) {
    throw new Error('Override slugs not found on LeetCode:\n  ' + unknown.join('\n  '));
  }
  return out;
}

/** The popup's catalogue, derived from the same fixture the coverage test uses. */
function buildProblems() {
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'tuf-problems.json'), 'utf8'));
  return rows.map((row) => [row.t, row.d]);
}

const leetcode = await buildLeetcode();
const { index: gfg, slugs: gfgSlugs } = readGfg();
const overrides = buildOverrides(leetcode, gfgSlugs);
const problems = buildProblems();

const dataDir = path.join(root, 'data');
fs.writeFileSync(path.join(dataDir, 'leetcode.json'), JSON.stringify(leetcode));
fs.writeFileSync(path.join(dataDir, 'gfg.json'), JSON.stringify(gfg));
fs.writeFileSync(path.join(dataDir, 'overrides.json'), JSON.stringify(overrides, null, 1));
fs.writeFileSync(path.join(dataDir, 'problems.json'), JSON.stringify(problems));

console.log('leetcode.json  %d titles', Object.keys(leetcode).length);
console.log('gfg.json       %d titles', Object.keys(gfg).length);
console.log('overrides.json %d titles', Object.keys(overrides).length);
console.log('problems.json  %d problems', problems.length);
