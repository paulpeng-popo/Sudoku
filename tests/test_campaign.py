import random
import unittest

from campaign import (
    LEVEL_RANK,
    PUZZLES,
    UNITS,
    analyze_puzzle,
    generate_puzzle,
    next_hint,
)
from sudoku import SudokuSolver, SudokuState


class CampaignTests(unittest.TestCase):


    def test_catalog_unique_and_teachable(self):
        for puzzle in PUZZLES:
            with self.subTest(puzzle=puzzle["id"]):
                board = list(map(int, puzzle["puzzle"]))
                solver = SudokuSolver()
                solver.load_board(board)
                self.assertEqual(solver.solve(), SudokuState.SOLVED)
                answer = solver.get_solved_board()
                while 0 in board:
                    hint = next_hint(board)
                    self.assertIsNotNone(hint)
                    self.assertEqual(board[hint["index"]], 0)
                    self.assertEqual(hint["value"], answer[hint["index"]])
                    board[hint["index"]] = hint["value"]
                self.assertEqual(board, answer)
                self.assertIsNone(next_hint(board))

    def test_hidden_single(self):
        board = list(
            map(
                int,
                "000000010400000000020000000000050407008000300001090000300470200050100000000806000",
            )
        )
        hint = next_hint(board)
        self.assertEqual(hint["technique"], "Hidden single")
        i, value = hint["index"], hint["value"]
        solver = SudokuSolver()
        solver.load_board(board)
        self.assertEqual(solver.solve(), SudokuState.SOLVED)
        self.assertEqual(solver.get_solved_board()[i], value)
        self.assertTrue(any(i in unit for unit in UNITS))


    def test_generated_puzzles_are_unique_and_teachable(self):
        seen = set()
        for level in PUZZLES:
            for seed in range(8):
                puzzle = generate_puzzle(
                    level["id"], random.Random(f"{level['id']}:{seed}")
                )
                self.assertNotIn(puzzle, seen)
                seen.add(puzzle)
                self.assertEqual(
                    analyze_puzzle(puzzle)["rank"], LEVEL_RANK[level["id"]]
                )
                board = list(map(int, puzzle))
                solver = SudokuSolver()
                solver.load_board(board)
                self.assertEqual(solver.solve(), SudokuState.SOLVED)
                while 0 in board:
                    hint = next_hint(board)
                    self.assertIsNotNone(hint)
                    board[hint["index"]] = hint["value"]
                self.assertEqual(board, solver.get_solved_board())


    def test_grade_not_based_on_empty_count(self):
        easy = analyze_puzzle(PUZZLES[0]["puzzle"])
        self.assertEqual(easy["techniques"], {"Last empty cell": 9})
        self.assertEqual(easy["difficulty"], "Beginner")
        self.assertFalse(analyze_puzzle("0" * 81)["solved"])
        self.assertIsNone(analyze_puzzle("0" * 81)["rank"])


if __name__ == "__main__":
    unittest.main()
