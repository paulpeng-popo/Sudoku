"""可重複求解的數獨核心；0 表示空格。"""

from dataclasses import dataclass, field
from enum import IntEnum
from math import isfinite
from time import perf_counter


class SudokuState(IntEnum):
    SOLVED = 1
    UNSOLVABLE = 0  # 題目已有重複數字
    DEAD_END = -1
    MULTIPLE = 2
    TIMEOUT = -2


@dataclass
class SudokuCell:
    index: int
    value: int = 0
    is_given: bool = False
    candidates: list[int] = field(default_factory=list)


class SudokuSolver:
    MAX_INDEX = 81

    def __init__(self):
        self.board = [SudokuCell(i) for i in range(81)]
        self.conflicts: set[int] = set()
        self._givens = [0] * 81
        self.solution_count = 0
        self.nodes = 0

    def load_board(self, board_values: list[int]) -> None:
        if len(board_values) != 81:
            raise ValueError("盤面必須包含 81 格。")
        if any(type(v) is not int or not 0 <= v <= 9 for v in board_values):
            raise ValueError("每格必須是 0～9 的整數，0 表示空格。")
        self._givens = list(board_values)
        self._restore()

    def _restore(self):
        self.conflicts.clear()
        self.solution_count = 0
        self.nodes = 0
        for cell, value in zip(self.board, self._givens):
            cell.value = value
            cell.is_given = value != 0
            cell.candidates = []

    def _get_row(self, row):
        return self.board[row * 9 : (row + 1) * 9]

    def _get_column(self, col):
        return self.board[col::9]

    def _get_block(self, block):
        row, col = block // 3 * 3, block % 3 * 3
        return [
            self.board[r * 9 + c]
            for r in range(row, row + 3)
            for c in range(col, col + 3)
        ]

    def _check_board_validity(self):
        self.conflicts.clear()
        for i in range(9):
            for unit in (self._get_row(i), self._get_column(i), self._get_block(i)):
                seen = {}
                for cell in unit:
                    if cell.value:
                        seen.setdefault(cell.value, []).append(cell.index)
                for indices in seen.values():
                    if len(indices) > 1:
                        self.conflicts.update(indices)
        return not self.conflicts

    def solve(self, timeout_seconds: float = 3.0) -> SudokuState:
        if not isfinite(timeout_seconds) or timeout_seconds <= 0:
            raise ValueError("求解時間上限必須是正有限數。")
        self._restore()
        deadline = perf_counter() + timeout_seconds
        if not self._check_board_validity():
            return SudokuState.UNSOLVABLE
        values = list(self._givens)
        rows, cols, blocks = [0] * 9, [0] * 9, [0] * 9
        for i, value in enumerate(values):
            if value:
                bit = 1 << value
                rows[i // 9] |= bit
                cols[i % 9] |= bit
                blocks[i // 27 * 3 + i % 9 // 3] |= bit
        solutions = []

        def search():
            if perf_counter() >= deadline:
                raise TimeoutError
            self.nodes += 1
            best, mask, size = -1, 0, 10
            for i, value in enumerate(values):
                if value:
                    continue
                r, c, b = i // 9, i % 9, i // 27 * 3 + i % 9 // 3
                options = 0x3FE & ~(rows[r] | cols[c] | blocks[b])
                count = options.bit_count()
                if count == 0:
                    return
                if count < size:
                    best, mask, size = i, options, count
                    if count == 1:
                        break
            if best == -1:
                solutions.append(values.copy())
                return
            r, c, b = best // 9, best % 9, best // 27 * 3 + best % 9 // 3
            while mask:
                bit = mask & -mask
                mask ^= bit
                values[best] = bit.bit_length() - 1
                rows[r] |= bit
                cols[c] |= bit
                blocks[b] |= bit
                search()
                rows[r] ^= bit
                cols[c] ^= bit
                blocks[b] ^= bit
                values[best] = 0
                if len(solutions) >= 2:
                    return

        try:
            search()
        except TimeoutError:
            self.solution_count = len(solutions)
            return SudokuState.TIMEOUT
        self.solution_count = len(solutions)
        if not solutions:
            return SudokuState.DEAD_END
        for cell, value in zip(self.board, solutions[0]):
            cell.value = value
        return SudokuState.MULTIPLE if len(solutions) == 2 else SudokuState.SOLVED

    def get_conflicts(self) -> set[int]:
        return set(self.conflicts)

    def get_solved_board(self) -> list[int]:
        return [cell.value for cell in self.board]

    def reset(self) -> None:
        self.load_board([0] * 81)
