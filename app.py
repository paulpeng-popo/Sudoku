import os
import time

from flask import Flask, render_template, request

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


@app.errorhandler(413)
def too_large(error):
    return "Request too large. Submit only the Sudoku puzzle.", 413


if __name__ == "__main__":
    app.run(
        host=os.environ.get("SUDOKU_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "12345")),
        debug=False,
    )
