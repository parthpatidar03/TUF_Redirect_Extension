/**
 * Popup: the on/off switch and a short reminder of where the links appear.
 *
 * It holds no problem data. Everything the reader needs is on takeUforward's
 * own page, which is the point of the extension.
 */
(function () {
  'use strict';

  const KEYS = ['enabled', 'showLeetcode', 'showGfg'];
  const boxes = {};
  KEYS.forEach(function (key) { boxes[key] = document.getElementById(key); });

  const stateLabel = document.getElementById('stateLabel');

  function paint() {
    const on = boxes.enabled.checked;
    stateLabel.textContent = on ? 'On' : 'Off';
    document.body.classList.toggle('off', !on);
  }

  chrome.storage.sync.get(KEYS, function (stored) {
    KEYS.forEach(function (key) {
      if (typeof stored[key] === 'boolean') boxes[key].checked = stored[key];
    });
    paint();
  });

  KEYS.forEach(function (key) {
    boxes[key].addEventListener('change', function () {
      chrome.storage.sync.set({ [key]: boxes[key].checked });
      paint();
    });
  });
})();
