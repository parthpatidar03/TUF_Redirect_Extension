# TUF External Link Redirect

Puts LeetCode and GeeksforGeeks links back next to every problem on
[takeUforward](https://takeuforward.org)'s DSA practice sheets.

takeUforward's redesign removed the external judge links its sheets used to
carry. TUF Redirect adds them back as small badges under each problem title,
styled with takeUforward's own design tokens so they look like part of the page.

**Install from the Chrome Web Store — no setup, no cloning.**

## What it does

- A **LeetCode** and a **GfG** badge under every problem title in the practice
  table, and on individual problem pages.
- A **popup search** over all 1,369 practice problems, so you can jump to a
  judge without opening takeUforward at all.
- Badges can be turned off individually from the popup.
- Adapts to takeUforward's light and dark themes, because the CSS reads their
  variables rather than hard-coding colours.

A solid badge is a direct link to that exact problem. A dashed badge is a site
search for the title, used when the problem has no counterpart on that judge.

## Coverage

Measured against all 1,369 problems in the practice catalogue:

| Destination | Direct links |
| --- | --- |
| LeetCode | 791 (58%) |
| GeeksforGeeks | 117 (9%) |
| At least one | 838 (61%) |

GeeksforGeeks is lower because it publishes no problem index. Only slugs whose
page title actually matches, plus a hand-checked list, are linked directly; the
rest get a GeeksforGeeks search.

Coverage is highest where it matters most — the A2Z core:

| Slice | LeetCode | At least one |
| --- | --- | --- |
| First 100 problems | 98% | 98% |
| First 250 problems | 78% | 90% |
| First 500 problems | 86% | 93% |

The remainder are takeUforward or GeeksforGeeks originals with no LeetCode
equivalent, where a search link is the correct answer.

## How matching works

Titles are read from the DOM, stripped of list numbering and difficulty chips,
then resolved in this order:

1. **Curated overrides** — `tools/overrides.source.json`, for titles that need
   human judgement ("Kadane's Algorithm" is LeetCode's "Maximum Subarray").
2. **Exact match** against a full index of LeetCode titles, after a set of
   conservative rewrites: abbreviation expansion (`LL` to `linked list`, `BT` to
   `binary tree`), number words, `Subsets I` to `Subsets`.
3. **Token match**, ignoring word order and filler words.
4. **Site search**, when nothing above is confident.

There is no similarity scoring. Near-misses pick the wrong problem often enough
to matter, and a confident link to the wrong problem is worse than a search
link, so anything ambiguous is curated by hand instead.

## Privacy

No tracking, no analytics, no accounts, no network calls. Every lookup runs
against JSON files bundled in the extension. The only stored state is your two
badge toggles, in `chrome.storage.sync`. See [PRIVACY.md](PRIVACY.md).

## Development

```bash
npm run build:data   # refresh data/ from the LeetCode API and the curated sources
npm test             # coverage report plus matching assertions
```

Load it unpacked for local work: `chrome://extensions` → Developer mode → Load
unpacked → pick this folder.

To try the content script without installing anything:

```bash
node tools/dev-server.mjs
```

Then open `http://localhost:8787/tools/fixture.html` for a copy of
takeUforward's table markup, or `http://localhost:8787/popup/popup.html` for the
popup.

### Layout

| Path | Purpose |
| --- | --- |
| `scripts/resolver.js` | Matching engine, shared by the content script, the popup and the tools |
| `scripts/content.js` | Finds problem rows and injects badges |
| `styles/content.css` | Badge styling, built on takeUforward's CSS variables |
| `popup/` | Search popup |
| `data/` | Generated indexes — do not edit by hand |
| `tools/overrides.source.json` | Curated title mappings |
| `tools/gfg-verified.json` | GeeksforGeeks slugs confirmed live, with canonical names |
| `tools/tuf-problems.json` | Catalogue fixture the coverage test runs against |

`tools/build-data.mjs` fails the build if a curated LeetCode slug does not exist
in the live index, so a typo cannot ship as a broken link.

## Licence

MIT. Not affiliated with takeUforward, LeetCode or GeeksforGeeks.
