from typing import List
from flask import Flask, request
from flask import render_template, flash
from sudoku import SudokuSolver, SudokuState

import time

app = Flask(__name__)
app.secret_key = "very-secret-key"


class SudokuError(Exception):
    pass

def get_board_from_form(form) -> List[int]:
    board = []
    for i in range(81):
        cell_value = form.get(f"cell{i}", "").strip()
        if cell_value == "":
            board.append(0)
        else:
            try:
                n = int(cell_value)
                if 1 <= n <= 9:
                    board.append(n)
                else:
                    raise ValueError("Cell value must be between 1 and 9")
            except ValueError:
                raise SudokuError(f"Invalid input for cell {i + 1}: '{cell_value}'")
    return board

def start_solver(solver: SudokuSolver, board: List[int]) -> int:
    solver.reset()
    solver.load_board(board)
    start_time = time.time()
    result = solver.solve()
    elapsed = time.time() - start_time
    solved_board = solver.get_solved_board() if result == 1 else None
    conflicts = solver.get_conflicts()
    return result, solved_board, conflicts, elapsed


@app.route("/", methods=["GET", "POST"])
def index():
    solution = None
    elapsed_time = None
    board: List[int] = [0] * 81
    conflicts = set()
    
    if request.method == "POST":
        try:
            board = get_board_from_form(request.form)
            solver = SudokuSolver()
            result, solved_board, conflicts, elapsed = start_solver(solver, board)
            elapsed_time = elapsed
            
            if result == SudokuState.SOLVED:
                solution = solved_board
            elif result == SudokuState.UNSOLVABLE:
                # given board has conflicts
                flash("The provided Sudoku puzzle is unsolvable due to conflicts.", "error")
            elif result == SudokuState.DEAD_END:
                # no conflicts but cannot solve
                flash("The Sudoku puzzle cannot be solved from the given state.", "error")
            else:
                flash("An unexpected error occurred during solving.", "error")
        except SudokuError as e:
            flash(str(e), "error")
    
    return render_template(
        "index.html",
        board=board, # must
        solution=solution,
        conflicts=conflicts, # must
        elapsed_time=elapsed_time
    )


if __name__ == "__main__":
    ADDRESS = "0.0.0.0"
    PORT = 12345
    app.run(host=ADDRESS, port=PORT, debug=True)
