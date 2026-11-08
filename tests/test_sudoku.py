import unittest
from unittest.mock import patch

from app import app
from sudoku import SudokuSolver, SudokuState

PUZZLE = [
    int(c)
    for c in "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
]
ANSWER = [
    int(c)
    for c in "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
]


class SolverTests(unittest.TestCase):
    def setUp(self):
        self.s = SudokuSolver()

    def test_unique_and_repeat(self):
        self.s.load_board(PUZZLE)
        for _ in range(2):
            self.assertEqual(self.s.solve(), SudokuState.SOLVED)
            self.assertEqual(self.s.get_solved_board(), ANSWER)
        self.assertEqual(PUZZLE[2], 0)

    def test_completed(self):
        self.s.load_board(ANSWER)
        self.assertEqual(self.s.solve(), SudokuState.SOLVED)
        self.assertEqual(self.s.get_solved_board(), ANSWER)

    def test_multiple_is_valid(self):
        self.s.load_board([0] * 81)
        self.assertEqual(self.s.solve(), SudokuState.MULTIPLE)
        self.assertEqual(self.s.solution_count, 2)
        for i in range(9):
            for unit in (
                self.s._get_row(i),
                self.s._get_column(i),
                self.s._get_block(i),
            ):
                self.assertEqual({c.value for c in unit}, set(range(1, 10)))

    def test_conflicts(self):
        for positions in ((0, 1), (0, 9), (0, 10)):
            board = [0] * 81
            for i in positions:
                board[i] = 1
            self.s.load_board(board)
            self.assertEqual(self.s.solve(), SudokuState.UNSOLVABLE)
            self.assertEqual(self.s.get_conflicts(), set(positions))

    def test_impossible(self):
        board = [1, 2, 3, 4, 5, 6, 7, 8, 0] + [0] * 8 + [9] + [0] * 63
        self.s.load_board(board)
        self.assertEqual(self.s.solve(), SudokuState.DEAD_END)
        self.assertEqual(self.s.get_solved_board(), board)

    def test_validation(self):
        for board in (
            [0] * 80,
            [0] * 82,
            list(range(1, 82)),
            [-1] + [0] * 80,
            [True] + [0] * 80,
            ["1"] + [0] * 80,
            [1.0] + [0] * 80,
        ):
            with self.subTest(board=board[:2]), self.assertRaises(ValueError):
                self.s.load_board(board)

    def test_timeout_and_recovery(self):
        self.s.load_board(PUZZLE)
        with patch("sudoku.perf_counter", side_effect=[0, 4]):
            self.assertEqual(self.s.solve(3), SudokuState.TIMEOUT)
        self.assertEqual(self.s.get_solved_board(), PUZZLE)
        self.assertEqual(self.s.solve(), SudokuState.SOLVED)

    def test_timeout_after_first_solution_does_not_claim_unique(self):
        self.s.load_board([0] * 81)

        def clock():
            return 4 if self.s.nodes >= 82 else 0

        with patch("sudoku.perf_counter", side_effect=clock):
            self.assertEqual(self.s.solve(3), SudokuState.TIMEOUT)
        self.assertEqual(self.s.get_solved_board(), [0] * 81)

    def test_bad_timeout(self):
        for limit in (0, -1, float("inf"), float("nan")):
            with self.assertRaises(ValueError):
                self.s.solve(limit)

    def test_reset(self):
        self.s.load_board(PUZZLE)
        self.s.solve()
        self.s.reset()
        self.assertEqual(self.s.get_solved_board(), [0] * 81)
        self.assertEqual(self.s.solve(), SudokuState.MULTIPLE)


class WebTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_home(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_data(as_text=True).count('name="cell'), 81)

    def test_unique(self):
        response = self.client.post(
            "/", data={f"cell{i}": str(v) if v else "" for i, v in enumerate(PUZZLE)}
        )
        self.assertIn("這道題目有唯一解", response.get_data(as_text=True))
        self.assertIn('id="solution-panel"', response.get_data(as_text=True))

    def test_invalid_preserved_and_escaped(self):
        html = self.client.post(
            "/", data={"cell0": "5", "cell1": "<script>", "cell80": "9"}
        ).get_data(as_text=True)
        self.assertIn('value="5"', html)
        self.assertIn('value="9"', html)
        self.assertIn('value="&lt;script&gt;"', html)
        self.assertIn('aria-invalid="true"', html)
        self.assertNotIn('id="solution-panel"', html)

    def test_multiple(self):
        html = self.client.post("/", data={}).get_data(as_text=True)
        self.assertIn("多組解答", html)

    def test_conflict(self):
        html = self.client.post("/", data={"cell0": "1", "cell1": "1"}).get_data(
            as_text=True
        )
        self.assertIn("題目有重複數字", html)
        self.assertNotIn('id="solution-panel"', html)

    def test_timeout(self):
        with patch("sudoku.perf_counter", side_effect=[0, 4]):
            html = self.client.post("/", data={}).get_data(as_text=True)
        self.assertIn("已達求解時間上限", html)
        self.assertNotIn('id="solution-panel"', html)

    def test_payload_limit(self):
        self.assertEqual(
            self.client.post("/", data={"cell0": "x" * 17000}).status_code, 413
        )

    def test_development_defaults(self):
        self.assertFalse(app.debug)
        self.assertIsNone(app.secret_key)


if __name__ == "__main__":
    unittest.main()
