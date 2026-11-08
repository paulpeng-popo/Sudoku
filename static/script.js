document.addEventListener("DOMContentLoaded", () => {
  const inputs = [...document.querySelectorAll('.solver-form input')];
  const cells = [...document.querySelectorAll('.sudoku-cell')];
  const feedback = document.getElementById('feedback');
  let selectedDigit = null;
  function notify(message, kind = 'info') {
    feedback.textContent = message;
    feedback.className = `feedback ${kind}`;
  }
  function highlightDigits(digit) {
    cells.forEach(cell => {
      const value = cell.querySelector('input')?.value.trim() ?? cell.textContent.trim();
      cell.classList.toggle('digit-match', Boolean(digit) && value === digit);
    });
  }
  function clearHover() {
    cells.forEach(c => c.classList.remove('hl-row', 'hl-col', 'hl-block'));
  }
  function highlightUnit(cell) {
    clearHover();
    const table = cell.closest('table');
    cells.filter(c => c.closest('table') === table).forEach(c => {
      for (const key of ['row', 'col', 'block']) {
        c.classList.toggle(`hl-${key}`, c.dataset[key] === cell.dataset[key]);
      }
    });
  }
  function edited() {
    document.getElementById('solution-panel')?.remove();
    const placeholder = document.getElementById('solution-placeholder');
    if (placeholder) placeholder.hidden = false;
    cells.forEach(c => c.classList.remove('cell-conflict'));
    inputs.forEach(input => input.setAttribute('aria-invalid', 'false'));
    notify('題目已變更，請按「開始解題」重新檢查。');
    highlightDigits(selectedDigit);
  }
  function importPuzzle(text) {
    const compact = text.replace(/\s/g, '');
    if (!/^[0-9.]{81}$/.test(compact)) {
      notify('請提供剛好 81 個字元，只能包含 1～9、0 或 .；空白與換行會被忽略。', 'error');
      return;
    }
    inputs.forEach((input, i) => { input.value = /[1-9]/.test(compact[i]) ? compact[i] : ''; });
    edited();
    notify('題目已載入，請按「開始解題」。');
    inputs[0].focus();
  }
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', () => highlightUnit(cell));
    cell.addEventListener('mouseleave', clearHover);
    cell.addEventListener('focusin', () => highlightUnit(cell));
    cell.addEventListener('focusout', clearHover);
    cell.addEventListener('click', () => {
      const digit = cell.querySelector('input')?.value.trim() ?? cell.textContent.trim();
      selectedDigit = digit === selectedDigit ? null : digit;
      highlightDigits(selectedDigit);
    });
  });
  inputs.forEach((input, i) => {
    input.addEventListener('input', edited);
    input.addEventListener('keydown', event => {
      const row = Math.floor(i / 9), col = i % 9;
      const next = {ArrowUp: row > 0 ? i - 9 : i, ArrowDown: row < 8 ? i + 9 : i,
        ArrowLeft: col > 0 ? i - 1 : i, ArrowRight: col < 8 ? i + 1 : i}[event.key];
      if (next !== undefined) {
        event.preventDefault(); inputs[next].focus(); inputs[next].select();
      }
    });
    input.addEventListener('paste', event => {
      const text = event.clipboardData.getData('text');
      if (text.trim().length > 1) { event.preventDefault(); importPuzzle(text); }
    });
  });
  document.getElementById('import-btn').addEventListener('click', () => importPuzzle(document.getElementById('puzzle-text').value));
  document.getElementById('example-btn').addEventListener('click', () => importPuzzle('530070000600195000098000060800060003400803001700020006060000280000419005000080079'));
  document.getElementById('reset-btn').addEventListener('click', () => { window.location.href = '/'; });
  document.querySelector('.solver-form').addEventListener('submit', event => {
    const invalid = inputs.filter(input => !/^[1-9]?$/.test(input.value.trim()));
    if (invalid.length) {
      event.preventDefault();
      invalid.forEach(input => { input.setAttribute('aria-invalid', 'true'); input.closest('td').classList.add('cell-conflict'); });
      notify('標示的格子只能輸入 1～9，或留白。', 'error'); invalid[0].focus(); return;
    }
    const button = document.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = '求解中…';
    document.querySelector('.solver-form').setAttribute('aria-busy', 'true');
    notify(`正在求解並檢查唯一性，最多搜尋 ${document.querySelector('.solver-form').dataset.timeout} 秒。`);
  });
  window.addEventListener('pageshow', () => {
    const button = document.querySelector('button[type="submit"]');
    button.disabled = false; button.textContent = '開始解題';
    document.querySelector('.solver-form').removeAttribute('aria-busy');
  });
});
