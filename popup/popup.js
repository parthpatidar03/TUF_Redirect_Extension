/** Popup: search the takeUforward catalogue and jump straight to a judge. */
(function () {
  'use strict';

  const MAX_RESULTS = 40;

  const ICONS = {
    leetcode:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>',
    gfg:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.45 14.315c-.143.28-.334.532-.565.745a3.691 3.691 0 0 1-1.104.695 4.51 4.51 0 0 1-3.116-.016 3.79 3.79 0 0 1-2.135-2.078 3.571 3.571 0 0 1-.13-.353h7.418a4.26 4.26 0 0 1-.368 1.008zm-11.99-.654a3.793 3.793 0 0 1-2.134 2.078 4.51 4.51 0 0 1-3.117.016 3.7 3.7 0 0 1-1.104-.695 2.652 2.652 0 0 1-.564-.745 4.221 4.221 0 0 1-.368-1.006H9.59c-.038.12-.08.238-.13.352zm14.501-1.758a3.849 3.849 0 0 0-.082-.475l-9.634-.008a3.932 3.932 0 0 1 1.143-2.348c.363-.35.79-.625 1.26-.809a3.97 3.97 0 0 1 4.484.957l1.521-1.49a5.7 5.7 0 0 0-1.922-1.357 6.283 6.283 0 0 0-2.544-.49 6.35 6.35 0 0 0-2.405.457 6.007 6.007 0 0 0-1.963 1.276 6.142 6.142 0 0 0-1.325 1.94 5.862 5.862 0 0 0-.466 1.864h-.063a5.857 5.857 0 0 0-.467-1.865 6.13 6.13 0 0 0-1.325-1.939A6 6 0 0 0 8.21 6.34a6.698 6.698 0 0 0-4.949.031A5.708 5.708 0 0 0 1.34 7.73l1.52 1.49a4.166 4.166 0 0 1 4.484-.958c.47.184.898.46 1.26.81.368.36.66.792.859 1.268.146.344.242.708.285 1.08l-9.635.008A4.714 4.714 0 0 0 0 12.457a6.493 6.493 0 0 0 .345 2.127 4.927 4.927 0 0 0 1.08 1.783c.528.56 1.17 1 1.88 1.293a6.454 6.454 0 0 0 2.504.457c.824.005 1.64-.15 2.404-.457a5.986 5.986 0 0 0 1.964-1.277 6.116 6.116 0 0 0 1.686-3.076h.273a6.13 6.13 0 0 0 1.686 3.077 5.99 5.99 0 0 0 1.964 1.276 6.345 6.345 0 0 0 2.405.457 6.45 6.45 0 0 0 2.502-.457 5.42 5.42 0 0 0 1.882-1.293 4.928 4.928 0 0 0 1.08-1.783A6.52 6.52 0 0 0 24 12.457a4.757 4.757 0 0 0-.039-.554z"/></svg>'
  };

  const resultsEl = document.getElementById('results');
  const queryEl = document.getElementById('q');

  let resolver = null;
  let problems = [];

  const loadJson = (p) => fetch(chrome.runtime.getURL(p)).then((r) => r.json());

  function scoreOf(haystack, needle) {
    const at = haystack.indexOf(needle);
    if (at === -1) return -1;
    return at === 0 ? 0 : 1; // prefix matches first
  }

  function search(term) {
    const needle = term.trim().toLowerCase();
    if (!needle) return problems.slice(0, MAX_RESULTS);
    const hits = [];
    for (let i = 0; i < problems.length; i++) {
      const score = scoreOf(problems[i].search, needle);
      if (score !== -1) hits.push({ p: problems[i], score: score, i: i });
    }
    hits.sort((a, b) => a.score - b.score || a.i - b.i);
    return hits.slice(0, MAX_RESULTS).map((h) => h.p);
  }

  function linkEl(kind, label, target) {
    const a = document.createElement('a');
    a.className = 'go go--' + kind + (target.exact ? '' : ' go--search');
    a.href = target.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = (target.exact ? 'Open on ' : 'Search on ') + label;
    a.innerHTML = ICONS[kind] + '<span>' + label + '</span>';
    return a;
  }

  function render(list) {
    resultsEl.textContent = '';
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No problem matches that search.';
      resultsEl.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach(function (p) {
      const match = resolver.resolve(p.title);
      const item = document.createElement('div');
      item.className = 'item';

      const top = document.createElement('div');
      top.className = 'item-top';
      const title = document.createElement('span');
      title.className = 'item-title';
      title.textContent = p.title;
      top.appendChild(title);
      if (p.difficulty) {
        const chip = document.createElement('span');
        chip.className = 'chip chip--' + p.difficulty.toLowerCase();
        chip.textContent = p.difficulty;
        top.appendChild(chip);
      }

      const links = document.createElement('div');
      links.className = 'item-links';
      links.appendChild(linkEl('leetcode', 'LeetCode', match.leetcode));
      links.appendChild(linkEl('gfg', 'GfG', match.gfg));

      item.appendChild(top);
      item.appendChild(links);
      frag.appendChild(item);
    });
    resultsEl.appendChild(frag);
  }

  function wireToggles() {
    const boxes = { showLeetcode: document.getElementById('showLeetcode'), showGfg: document.getElementById('showGfg') };
    chrome.storage.sync.get(['showLeetcode', 'showGfg'], function (stored) {
      Object.keys(boxes).forEach(function (key) {
        if (typeof stored[key] === 'boolean') boxes[key].checked = stored[key];
      });
    });
    Object.keys(boxes).forEach(function (key) {
      boxes[key].addEventListener('change', function () {
        chrome.storage.sync.set({ [key]: boxes[key].checked });
      });
    });
  }

  async function init() {
    const [leetcode, gfg, overrides, catalogue] = await Promise.all([
      loadJson('data/leetcode.json'),
      loadJson('data/gfg.json'),
      loadJson('data/overrides.json'),
      loadJson('data/problems.json')
    ]);

    resolver = new self.TufRedirectResolver.Resolver({ leetcode: leetcode, gfg: gfg, overrides: overrides });
    problems = catalogue.map(function (row) {
      const title = self.TufRedirectResolver.cleanTitle(row[0]);
      return { title: title, difficulty: row[1], search: title.toLowerCase() };
    });

    queryEl.placeholder = 'Search ' + problems.length.toLocaleString() + ' problems…';

    let timer = null;
    queryEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { render(search(queryEl.value)); }, 80);
    });

    render(search(''));
    wireToggles();
  }

  init().catch(function (err) {
    resultsEl.innerHTML = '<p class="empty">Could not load problem data.</p>';
    console.error('[TUF Redirect]', err);
  });
})();
