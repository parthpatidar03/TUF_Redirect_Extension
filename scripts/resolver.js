/**
 * Shared matching engine.
 *
 * Turns a problem title as rendered on takeUforward ("3. Reverse a LL") into
 * LeetCode / GeeksforGeeks destinations. Used by the content script, by the
 * popup, and by tools/ under Node.
 *
 * Matching is deliberately conservative: a wrong direct link is worse than a
 * search link, so anything below high confidence falls back to site search.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DsaBridgeResolver = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const LC_PROBLEM = 'https://leetcode.com/problems/';
  const LC_SEARCH = 'https://leetcode.com/problemset/?search=';
  const GFG_PROBLEM = 'https://www.geeksforgeeks.org/problems/';
  const GFG_SEARCH = 'https://www.geeksforgeeks.org/search/?gq=';

  // takeUforward abbreviates aggressively in the practice table. Expanding these
  // is what lets "Maximum Depth in BT" reach "Maximum Depth of Binary Tree".
  const ABBREVIATIONS = {
    ll: 'linked list',
    dll: 'doubly linked list',
    sll: 'singly linked list',
    bt: 'binary tree',
    bts: 'binary trees',
    bst: 'binary search tree',
    lca: 'lowest common ancestor',
    bfs: 'breadth first search',
    dfs: 'depth first search',
    lis: 'longest increasing subsequence',
    lcs: 'longest common subsequence',
    gcd: 'greatest common divisor',
    dsu: 'disjoint set union',
    mst: 'minimum spanning tree'
  };

  const NUMBER_WORDS = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten'
  };

  // Words that carry no matching signal once a title is reduced to a token set.
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'of', 'in', 'to', 'for', 'and', 'or', 'with', 'from',
    'at', 'on', 'is', 'are', 'be', 'using', 'given', 'into', 'its', 'it'
  ]);

  // Badge text that can end up glued to the title when the DOM is read naively.
  const BADGE_WORDS = /\s*(core|basic|pro|potd|easy|medium|hard|solved|unsolved|revision|new)\s*$/i;

  const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };

  /** Own-property lookup. A title normalising to "constructor" must not reach Object.prototype. */
  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
  }

  /** Strip list numbering and badge text from a raw DOM title. */
  function cleanTitle(raw) {
    let t = String(raw || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^\d{1,4}\s*[.)]\s*/, '');
    let prev;
    do {
      prev = t;
      t = t.replace(BADGE_WORDS, '').trim();
    } while (t !== prev && t.length > 0);
    return t;
  }

  /** Reduce a title to a comparable key. */
  function normalize(title, expand) {
    const t = String(title || '')
      .toLowerCase()
      .replace(/[‘’ʼ']/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!t) return '';
    let words = t.split(' ');
    if (expand) {
      words = words.reduce(function (acc, w) {
        const full = own(ABBREVIATIONS, w);
        return acc.concat(full ? full.split(' ') : [w]);
      }, []);
    }
    // "k th" -> "kth", a very common takeUforward spelling.
    const out = [];
    for (let i = 0; i < words.length; i++) {
      if (words[i] === 'k' && words[i + 1] === 'th') { out.push('kth'); i++; continue; }
      out.push(words[i]);
    }
    return out.join(' ');
  }

  /**
   * Ordered, high-confidence rewrites of a normalised title. Each is tried as an
   * exact lookup, so a rewrite only ever costs a miss, never a wrong link.
   */
  function variants(title) {
    const seen = [];
    const push = function (v) { if (v && seen.indexOf(v) === -1) seen.push(v); };

    const plain = normalize(title, false);
    const expanded = normalize(title, true);
    push(plain);
    push(expanded);

    [plain, expanded].forEach(function (base) {
      if (!base) return;
      const words = base.split(' ');

      // "median of 2 sorted arrays" -> "median of two sorted arrays"
      push(words.map(function (w) { return own(NUMBER_WORDS, w) || w; }).join(' '));

      // "3 sum" -> "3sum"
      push(base.replace(/\b(\d+)\s+([a-z])/g, '$1$2'));

      // "jump game i" / "single number i" -> the unsuffixed LeetCode title.
      if (words.length > 1 && words[words.length - 1] === 'i') {
        push(words.slice(0, -1).join(' '));
      }

      // "check if a tree is a bst or not" -> drop the trailing question tail.
      push(base.replace(/\s+or\s+not$/, ''));
    });

    return seen.filter(Boolean);
  }

  /** Token set used for fuzzy comparison: stop words dropped, roman numerals folded. */
  function tokenSet(normalized) {
    const set = new Set();
    String(normalized || '').split(' ').forEach(function (w) {
      if (!w || STOP_WORDS.has(w)) return;
      set.add(own(ROMAN, w) || w);
    });
    return set;
  }

  function tokenKey(normalized) {
    return Array.from(tokenSet(normalized)).sort().join(' ');
  }

  /** Wraps a "normalised title -> slug" map with token and fuzzy lookups. */
  function Index(byName) {
    this.byName = byName || {};
    this.byTokens = new Map();
    const self = this;
    Object.keys(this.byName).forEach(function (norm) {
      const key = tokenKey(norm);
      if (!self.byTokens.has(key)) self.byTokens.set(key, own(self.byName, norm));
    });
  }

  /**
   * Exact lookup over every variant, then an order-insensitive token lookup.
   *
   * There is deliberately no similarity scoring here. A near-miss picks the
   * wrong problem often enough to matter — "Binary Tree to Doubly Linked List"
   * scores 0.8 against LeetCode's "Linked List in Binary Tree" — and a wrong
   * problem link is worse than a search link. Titles that need judgement go in
   * tools/overrides.source.json instead, where each one is checked by hand.
   */
  Index.prototype.find = function (keys) {
    for (let i = 0; i < keys.length; i++) {
      const hit = own(this.byName, keys[i]);
      if (hit) return hit;
    }
    for (let i = 0; i < keys.length; i++) {
      const hit = this.byTokens.get(tokenKey(keys[i]));
      if (hit) return hit;
    }
    return null;
  };

  function Resolver(data) {
    this.leetcode = new Index(data.leetcode);
    this.gfg = new Index(data.gfg);
    this.overrides = data.overrides || {};
    this.cache = new Map();
  }

  /**
   * Resolve a raw title.
   * Returns { title, leetcode: {url, exact}, gfg: {url, exact} }.
   * `exact: false` means the link is a site search rather than the problem page.
   */
  Resolver.prototype.resolve = function (rawTitle) {
    const title = cleanTitle(rawTitle);
    if (!title) return null;
    if (this.cache.has(title)) return this.cache.get(title);

    const keys = variants(title);
    let lcSlug = null;
    let gfgSlug = null;

    for (let i = 0; i < keys.length; i++) {
      const hit = own(this.overrides, keys[i]);
      if (hit) { lcSlug = hit.l || null; gfgSlug = hit.g || null; break; }
    }

    if (!lcSlug) lcSlug = this.leetcode.find(keys);
    if (!gfgSlug) gfgSlug = this.gfg.find(keys);

    // Search on the expanded wording: "Reverse a LL" finds nothing, but
    // "reverse a linked list" does.
    const query = encodeURIComponent(normalize(title, true) || title);
    const result = {
      title: title,
      leetcode: lcSlug
        ? { url: LC_PROBLEM + lcSlug + '/', exact: true }
        : { url: LC_SEARCH + query, exact: false },
      gfg: gfgSlug
        ? { url: GFG_PROBLEM + gfgSlug + '/1', exact: true }
        : { url: GFG_SEARCH + query, exact: false }
    };

    this.cache.set(title, result);
    return result;
  };

  return {
    Resolver: Resolver,
    cleanTitle: cleanTitle,
    normalize: normalize,
    variants: variants,
    tokenKey: tokenKey,
    tokenSet: tokenSet
  };
});
