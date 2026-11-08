import random
import unittest
from unittest.mock import patch

from app import app
from campaign import (
    LEVEL_RANK,
    PUZZLES,
    UNITS,
    GenerationError,
    analyze_puzzle,
    generate_puzzle,
    next_hint,
)
from sudoku import SudokuSolver, SudokuState


class CampaignTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_page(self):
        response = self.client.get("/play")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("九宮守衛", html)
        self.assertIn('id="nav-challenge"', html)
        self.assertIn('id="nav-game"', html)
        self.assertNotIn("<span>闖關</span>", html)
        self.assertIn('id="preparation"', html)
        for removed in (
            "每天前進一小步",
            "數獨旅程",
            "從第一個數字，到自己解開整個盤面。",
            "viewport.js",
        ):
            self.assertNotIn(removed, html)

    def test_generated_chapter_can_be_completed_via_strikes(self):
        for level in PUZZLES:
            with self.subTest(level=level["id"]):
                base = "/api/play/" + level["id"] + "/"
                generated = self.client.post(base + "new").get_json()
                puzzle = generated["puzzle"]
                board = list(map(int, puzzle))
                solver = SudokuSolver()
                solver.load_board(board)
                self.assertEqual(solver.solve(), SudokuState.SOLVED)
                answer = solver.get_solved_board()
                blanks = [i for i, value in enumerate(board) if not value]
                for turn, index in enumerate(blanks):
                    board[index] = answer[index]
                    result = self.client.post(
                        base + "strike",
                        json={"puzzle": puzzle, "board": board, "index": index},
                    )
                    self.assertEqual(result.status_code, 200)
                    data = result.get_json()
                    self.assertTrue(data["correct"])
                    self.assertEqual(data["complete"], turn == len(blanks) - 1)

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
        self.assertEqual(hint["technique"], "唯一位置")
        i, value = hint["index"], hint["value"]
        solver = SudokuSolver()
        solver.load_board(board)
        self.assertEqual(solver.solve(), SudokuState.SOLVED)
        self.assertEqual(solver.get_solved_board()[i], value)
        self.assertTrue(any(i in unit for unit in UNITS))

    def test_api_contract_and_errors(self):
        puzzle = PUZZLES[0]
        url = "/api/play/" + puzzle["id"] + "/"
        board = list(map(int, puzzle["puzzle"]))
        result = self.client.post(url + "hint", json={"board": board}).get_json()
        self.assertEqual(result["status"], "hint")
        answer = self.client.post(url + "answer", json={"board": board}).get_json()[
            "answer"
        ]
        self.assertEqual(
            self.client.post(url + "check", json={"board": answer}).get_json()[
                "status"
            ],
            "complete",
        )
        self.assertEqual(
            self.client.post(url + "check", json={"board": board}).get_json()["status"],
            "playing",
        )
        empty = board.index(0)
        board[empty] = answer[empty] % 9 + 1
        result = self.client.post(url + "hint", json={"board": board}).get_json()
        self.assertEqual(result["status"], "errors")
        self.assertIn(empty, result["errors"])
        self.assertNotIn("hint", result)

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

    def test_generated_puzzle_api(self):
        url = "/api/play/first-step/"
        puzzle = self.client.post(url + "new").get_json()["puzzle"]
        board = list(map(int, puzzle))
        payload = {"puzzle": puzzle, "board": board}
        self.assertEqual(
            self.client.post(url + "hint", json=payload).get_json()["status"], "hint"
        )
        answer = self.client.post(url + "answer", json=payload).get_json()["answer"]
        payload["board"] = answer
        self.assertEqual(
            self.client.post(url + "check", json=payload).get_json()["status"],
            "complete",
        )
        given = next(i for i, v in enumerate(board) if v)
        payload["board"] = board.copy()
        payload["board"][given] = 0
        self.assertEqual(self.client.post(url + "check", json=payload).status_code, 400)
        for invalid in (None, "0" * 80, "x" * 81, "１" * 81):
            payload = {"puzzle": invalid, "board": board}
            self.assertEqual(
                self.client.post(url + "hint", json=payload).status_code, 400
            )

    def test_profile_and_completion_summary(self):
        puzzle = generate_puzzle("first-challenge", random.Random(42))
        url = "/api/play/first-challenge/"
        payload = {"puzzle": puzzle, "board": list(map(int, puzzle))}
        profile = self.client.post(url + "profile", json=payload).get_json()["profile"]
        self.assertEqual(profile["difficulty"], "中級")
        self.assertGreater(profile["techniques"]["唯一位置"], 0)
        answer = self.client.post(url + "answer", json=payload).get_json()["answer"]
        result = self.client.post(
            url + "check", json={**payload, "board": answer}
        ).get_json()
        self.assertEqual(result["profile"], profile)
        self.assertEqual(sum(profile["techniques"].values()), puzzle.count("0"))

    def test_grade_not_based_on_empty_count(self):
        easy = analyze_puzzle(PUZZLES[0]["puzzle"])
        self.assertEqual(easy["techniques"], {"最後一格": 9})
        self.assertEqual(easy["difficulty"], "入門")
        self.assertFalse(analyze_puzzle("0" * 81)["solved"])
        self.assertIsNone(analyze_puzzle("0" * 81)["rank"])

    def test_generator_failure_is_recoverable(self):
        with patch("app.generate_puzzle", side_effect=GenerationError()):
            response = self.client.post("/api/play/first-step/new")
            self.assertEqual(response.status_code, 503)
            self.assertIn("再試一次", response.get_json()["message"])

    def test_battle_strike_validates_only_submitted_cell(self):
        puzzle = PUZZLES[0]["puzzle"]
        board = list(map(int, puzzle))
        url = "/api/play/first-step/strike"
        board[0] = 5
        payload = {"puzzle": puzzle, "board": board, "index": 0}
        result = self.client.post(url, json=payload).get_json()
        self.assertTrue(result["correct"])
        self.assertFalse(result["complete"])
        self.assertNotIn("answer", result)
        board[0] = 1
        self.assertFalse(self.client.post(url, json=payload).get_json()["correct"])
        for index in (True, -1, 81, "0", 1, 10):
            self.assertEqual(
                self.client.post(url, json={**payload, "index": index}).status_code, 400
            )
        solver = SudokuSolver()
        solver.load_board(list(map(int, puzzle)))
        solver.solve()
        payload["board"] = solver.get_solved_board()
        result = self.client.post(url, json=payload).get_json()
        self.assertTrue(result["complete"])
        self.assertIn("profile", result)

    def test_bad_requests(self):
        p = PUZZLES[0]
        url = "/api/play/" + p["id"] + "/hint"
        for payload in (
            None,
            [],
            {},
            {"board": [0] * 80},
            {"board": [True] * 81},
            {"board": [0] * 81},
        ):
            self.assertEqual(self.client.post(url, json=payload).status_code, 400)
        self.assertEqual(
            self.client.post("/api/play/missing/hint", json={}).status_code, 404
        )
        self.assertEqual(
            self.client.post("/api/play/first-step/missing", json={}).status_code, 404
        )


if __name__ == "__main__":
    unittest.main()
