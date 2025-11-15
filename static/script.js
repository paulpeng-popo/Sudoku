document.addEventListener("DOMContentLoaded", function () {
  const cells = Array.from(document.querySelectorAll(".sudoku-cell"));
  let selectedDigit = null;

  function clearHoverHighlight() {
    cells.forEach((cell) => {
      cell.classList.remove("hl-row", "hl-col", "hl-block");
    });
  }

  function clearDigitHighlight() {
    cells.forEach((cell) => {
      cell.classList.remove("digit-match");
    });
  }

  function applyDigitHighlight(digit) {
    clearDigitHighlight();
    if (!digit) return;
    cells.forEach((cell) => {
      let value = "";
      const input = cell.querySelector("input");
      if (input) {
        value = input.value.trim();
      } else {
        value = cell.textContent.trim();
      }
      if (value === digit) {
        cell.classList.add("digit-match");
      }
    });
  }

  // hover: highlight the row / col / block
  cells.forEach((cell) => {
    cell.addEventListener("mouseenter", function () {
      const row = cell.dataset.row;
      const col = cell.dataset.col;
      const block = cell.dataset.block;

      clearHoverHighlight();

      cells.forEach((c) => {
        if (c.dataset.row === row) c.classList.add("hl-row");
        if (c.dataset.col === col) c.classList.add("hl-col");
        if (c.dataset.block === block) c.classList.add("hl-block");
      });
    });

    cell.addEventListener("mouseleave", function () {
      clearHoverHighlight();
    });

    // click: highlight all matching digits, click the same digit again to cancel
    cell.addEventListener("click", function () {
      let digit = "";
      const input = cell.querySelector("input");
      if (input) {
        digit = input.value.trim();
      } else {
        digit = cell.textContent.trim();
      }

      if (!digit) {
        selectedDigit = null;
        clearDigitHighlight();
        return;
      }

      if (selectedDigit === digit) {
        selectedDigit = null;
        clearDigitHighlight();
      } else {
        selectedDigit = digit;
        applyDigitHighlight(digit);
      }
    });
  });

  // Reset: reload / return to initial empty board
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      window.location.href = "/";
    });
  }
});
