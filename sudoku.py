from typing import List, Set


class SudokuState:
    SOLVED = 1
    UNSOLVABLE = 0
    DEAD_END = -1
    
    
class SudokuCell:
    def __init__(self, index: int):
        self.index: int = index
        self.value: int = 0
        self.is_given: bool = False
        self.candidates: List[int] = []
        
    def __repr__(self):
        return f"SudokuCell(index={self.index}, value={self.value}, is_given={self.is_given}, candidates={self.candidates})"


class SudokuSolver:
    # 9x9 Sudoku Solver
    MAX_INDEX = 81
    
    def __init__(self):
        self.board: List[SudokuCell] = [SudokuCell(i) for i in range(self.MAX_INDEX)]
        self.conflicts: Set[int] = set()
    
    def load_board(self, board_values: List[int]):
        for i in range(self.MAX_INDEX):
            self.board[i].value = board_values[i]
            self.board[i].is_given = (board_values[i] != 0)
            
    def _check_board_validity(self) -> bool:
        self.conflicts.clear()
        # Check rows, columns, and 3x3 blocks for duplicates
        for i in range(9):
            self._collect_unit_conflicts(self._get_row(i))
            self._collect_unit_conflicts(self._get_column(i))
            self._collect_unit_conflicts(self._get_block(i))
        return len(self.conflicts) == 0
    
    def _collect_unit_conflicts(self, unit: List[SudokuCell]) -> None:
        value_to_indices = {}
        for cell in unit:
            if cell.value == 0:
                continue
            # value occurs at which indices
            value_to_indices.setdefault(cell.value, []).append(cell.index)

        # if any value occurs more than once, mark all those indices as conflicts
        for indices in value_to_indices.values():
            if len(indices) > 1:
                self.conflicts.update(indices)
    
    def _get_row(self, row: int) -> List[SudokuCell]:
        return [self.board[row * 9 + c] for c in range(9)]
    
    def _get_column(self, col: int) -> List[SudokuCell]:
        return [self.board[r * 9 + col] for r in range(9)]
    
    def _get_block(self, block_index: int) -> List[SudokuCell]:
        br = (block_index // 3) * 3
        bc = (block_index % 3) * 3
        return [self.board[r * 9 + c] for r in range(br, br + 3) for c in range(bc, bc + 3)]
    
    def solve(self) -> int:
        if not self._check_board_validity():
            return SudokuState.UNSOLVABLE
        
        result = self._backtrack(0)
        return result
    
    def _backtrack(self, index: int) -> int:
        if index == self.MAX_INDEX:
            return SudokuState.SOLVED
        
        cell = self.board[index]
        
        if cell.is_given:
            return self._backtrack(index + 1)
        
        candidates = self._get_cell_candidates(index)
        
        for num in candidates:
            cell.value = num
            if self._backtrack(index + 1) == SudokuState.SOLVED:
                return SudokuState.SOLVED
        
        cell.value = 0
        return SudokuState.DEAD_END
    
    def _get_cell_candidates(self, index: int) -> List[int]:
        if self.board[index].value != 0:
            return []
        
        row = index // 9
        col = index % 9
        
        used_numbers: Set[int] = set()
        
        # Check row
        for cell in self._get_row(row):
            if cell.value != 0:
                used_numbers.add(cell.value)
        
        # Check column
        for cell in self._get_column(col):
            if cell.value != 0:
                used_numbers.add(cell.value)
        
        # Check block
        block_index = (row // 3) * 3 + (col // 3)
        for cell in self._get_block(block_index):
            if cell.value != 0:
                used_numbers.add(cell.value)
        
        candidates = [num for num in range(1, 10) if num not in used_numbers]
        return candidates
    
    def get_conflicts(self) -> Set[int]:
        return self.conflicts
    
    def get_solved_board(self) -> List[int]:
        return [cell.value for cell in self.board]
    
    def reset(self):
        for cell in self.board:
            cell.value = 0
            cell.is_given = False
            cell.candidates = []
        self.conflicts.clear()
