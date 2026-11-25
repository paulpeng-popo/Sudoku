import os
import time

from flask import Flask, jsonify, render_template, request

from campaign import (
    PUZZLES,
    GenerationError,
    analyze_puzzle,
    generate_puzzle,
    next_hint,
)
from sudoku import SudokuSolver, SudokuState

app = Flask(__name__)
app.config.update(MAX_CONTENT_LENGTH=16 * 1024, SOLVE_TIMEOUT_SECONDS=3.0)
# The app does not use sessions or need a secret key.


class SudokuError(ValueError):
    def __init__(self, message, indices):
        super().__init__(message)
        self.indices = indices


def get_board_from_form(form) -> list[int]:
    board, invalid = [], set()
    for i in range(81):
        value = form.get(f"cell{i}", "").strip()
        if value == "":
            board.append(0)
        elif len(value) == 1 and value in "123456789":
            board.append(int(value))
        else:
            board.append(0)
            invalid.add(i)
    if invalid:
        raise SudokuError("Enter a digit from 1 to 9 in each highlighted cell, or leave it blank. Your other entries have been kept.", invalid)
    return board


def start_solver(
    solver: SudokuSolver, board: list[int], timeout_seconds: float = 3.0
) -> tuple[SudokuState, list[int] | None, set[int], float]:
    solver.load_board(board)
    start = time.perf_counter()
    result = solver.solve(timeout_seconds)
    elapsed = time.perf_counter() - start
    solution = (
        solver.get_solved_board()
        if result in (SudokuState.SOLVED, SudokuState.MULTIPLE)
        else None
    )
    return result, solution, solver.get_conflicts(), elapsed


@app.route("/", methods=["GET", "POST"])
def index():
    board = [""] * 81
    solution, elapsed_time, message = None, None, ""
    conflicts, kind = set(), "info"
    if request.method == "POST":
        board = [request.form.get(f"cell{i}", "") for i in range(81)]
        try:
            values = get_board_from_form(request.form)
            solver = SudokuSolver()
            result, solution, conflicts, elapsed_time = start_solver(
                solver, values, app.config["SOLVE_TIMEOUT_SECONDS"]
            )
            board = [str(v) if v else "" for v in values]
            message, kind = {
                SudokuState.SOLVED: ("This puzzle has a unique solution.", "success"),
                SudokuState.MULTIPLE: (
                    "This puzzle has multiple solutions. One is shown below.",
                    "info",
                ),
                SudokuState.UNSOLVABLE: ("This puzzle has duplicate digits. Check the highlighted cells.", "error"),
                SudokuState.DEAD_END: ("This puzzle has no solution. Check the digits you entered.", "error"),
                SudokuState.TIMEOUT: (
                    "Time limit reached. Add more clues and try again to check whether the puzzle has a unique solution.",
                    "error",
                ),
            }[result]
        except SudokuError as error:
            message, conflicts, kind = str(error), error.indices, "error"
    return render_template(
        "index.html",
        board=board,
        solution=solution,
        elapsed_time=elapsed_time,
        conflicts=conflicts,
        message=message,
        message_kind=kind,
        solve_timeout=app.config["SOLVE_TIMEOUT_SECONDS"],
    )


def new_challenge(puzzle_id):
    puzzle = generate_puzzle(puzzle_id)
    return {"puzzle": puzzle, "profile": analyze_puzzle(puzzle)}


@app.errorhandler(GenerationError)
def generation_unavailable(error):
    return jsonify(message="Could not generate a puzzle at this difficulty. Please try again."), 503


@app.post("/api/play/<puzzle_id>/<action>")
def play_action(puzzle_id, action):
    puzzle = next((p for p in PUZZLES if p["id"] == puzzle_id), None)
    if puzzle is None or action not in (
        "check",
        "hint",
        "answer",
        "new",
        "profile",
        "strike",
    ):
        return jsonify(message="Unknown stage or action."), 404
    if action == "new":
        return jsonify(**new_challenge(puzzle_id))
    payload = request.get_json(silent=True)
    board = payload.get("board") if isinstance(payload, dict) else None
    if (
        not isinstance(board, list)
        or len(board) != 81
        or any(type(v) is not int or not 0 <= v <= 9 for v in board)
    ):
        return jsonify(message="The board must contain 81 integers from 0 to 9."), 400
    puzzle_text = payload.get("puzzle", puzzle["puzzle"])
    if (
        not isinstance(puzzle_text, str)
        or len(puzzle_text) != 81
        or any(c not in "0123456789" for c in puzzle_text)
    ):
        return jsonify(message="Invalid puzzle format."), 400
    givens = [int(c) for c in puzzle_text]
    if any(g and board[i] != g for i, g in enumerate(givens)):
        return jsonify(message="The original clues cannot be changed."), 400
    solver = SudokuSolver()
    solver.load_board(givens)
    if solver.solve() != SudokuState.SOLVED:
        return jsonify(message="Could not verify this puzzle. Please try again later."), 503
    if action == "profile":
        return jsonify(profile=analyze_puzzle(givens))
    answer = solver.get_solved_board()
    if action == "answer":
        return jsonify(answer=answer)
    if action == "strike":
        index = payload.get("index")
        if (
            type(index) is not int
            or not 0 <= index < 81
            or givens[index]
            or not board[index]
        ):
            return jsonify(message="Select an empty cell and enter a digit."), 400
        complete = board == answer
        return jsonify(
            correct=board[index] == answer[index],
            complete=complete,
            profile=analyze_puzzle(givens) if complete else None,
        )
    errors = [i for i, v in enumerate(board) if v and v != answer[i]]
    if errors:
        return jsonify(
            status="errors",
            errors=errors,
            message="Check or clear the highlighted entries before continuing.",
        )
    if board == answer:
        return jsonify(
            status="complete", message="Challenge complete!", profile=analyze_puzzle(givens)
        )
    if action == "check":
        return jsonify(status="playing", message="Every entry is correct so far. Keep going!")
    hint = next_hint(board)
    return jsonify(
        status="hint" if hint else "unavailable",
        hint=hint,
        message="The available techniques could not find another move." if not hint else "",
    )


@app.errorhandler(413)
def too_large(error):
    return "Request too large. Submit only the Sudoku puzzle.", 413


if __name__ == "__main__":
    app.run(
        host=os.environ.get("SUDOKU_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "12345")),
        debug=False,
    )
