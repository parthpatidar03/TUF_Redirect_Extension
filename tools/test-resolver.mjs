/**
 * Coverage check for the matching engine.
 *
 *   node tools/test-resolver.mjs [--misses]
 *
 * Fixture: tools/tuf-problems.json, the full takeUforward DSA practice
 * catalogue captured from the live table.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Resolver, cleanTitle } = require(path.join(root, 'scripts', 'resolver.js'));

const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const resolver = new Resolver({
  leetcode: read('data/leetcode.json'),
  gfg: read('data/gfg.json'),
  overrides: read('data/overrides.json')
});

const problems = read('tools/tuf-problems.json');

// Titles that genuinely have no LeetCode counterpart still count as handled:
// the extension falls back to a search link, which is the correct behaviour.
let exactLc = 0;
let exactGfg = 0;
let either = 0;
const misses = [];
for (const p of problems) {
  const r = resolver.resolve(p.t);
  if (r.leetcode.exact) exactLc++;
  if (r.gfg.exact) exactGfg++;
  if (r.leetcode.exact || r.gfg.exact) either++;
  if (!r.leetcode.exact) misses.push(cleanTitle(p.t));
}

const pct = (n) => ((n / problems.length) * 100).toFixed(1) + '%';
console.log('problems                %d', problems.length);
console.log('direct LeetCode link    %d  (%s)', exactLc, pct(exactLc));
console.log('direct GeeksforGeeks    %d  (%s)', exactGfg, pct(exactGfg));
console.log('at least one direct     %d  (%s)', either, pct(either));

// Titles that must resolve to one specific problem.
const expectations = [
  ['3. Reverse a LL', 'reverse-linked-list'],
  ['18. Maximum Depth in BT', 'maximum-depth-of-binary-tree'],
  ['1. Two Sum', 'two-sum'],
  ['17. Grid unique pathsCore', 'unique-paths'],
  ['9. K-th Largest element in an array', 'kth-largest-element-in-an-array'],
  ['27. Median of 2 sorted arrays', 'median-of-two-sorted-arrays'],
  ['24. Jump Game - I', 'jump-game'],
  ['16. Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters']
];

// Titles with no true LeetCode counterpart. A search link is the honest answer;
// a confident-looking direct link to a different problem is the failure mode.
const mustSearch = [
  'Binary Tree to Doubly Linked List',
  'Check if the Array is Sorted I',
  '893. Express Number as Sum of Two Primes'
];

// Floor, not a target: a data refresh that silently loses half the index
// should fail here rather than ship as a quieter extension.
const FLOOR = { leetcode: 780, gfg: 320, either: 900 };

let failed = 0;
if (exactLc < FLOOR.leetcode) { failed++; console.log('FAIL  leetcode coverage %d below floor %d', exactLc, FLOOR.leetcode); }
if (exactGfg < FLOOR.gfg) { failed++; console.log('FAIL  gfg coverage %d below floor %d', exactGfg, FLOOR.gfg); }
if (either < FLOOR.either) { failed++; console.log('FAIL  combined coverage %d below floor %d', either, FLOOR.either); }

for (const [title, slug] of expectations) {
  const got = resolver.resolve(title).leetcode.url;
  if (!got.includes('/problems/' + slug + '/')) {
    failed++;
    console.log('FAIL  %s -> %s (wanted %s)', title, got, slug);
  }
}
for (const title of mustSearch) {
  const hit = resolver.resolve(title).leetcode;
  if (hit.exact) { failed++; console.log('FAIL  %s should not link directly, got %s', title, hit.url); }
}
console.log(failed ? `\n${failed} assertion(s) failed` : '\nall assertions passed');
if (failed) process.exitCode = 1;

if (process.argv.includes('--misses')) {
  fs.writeFileSync(path.join(root, 'tools', 'misses.txt'), misses.join('\n'));
  console.log('wrote tools/misses.txt (%d titles)', misses.length);
}
