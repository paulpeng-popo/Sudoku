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
# 本應用不使用 session；不需要寫死 secret key。


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
        raise SudokuError("標示的格子只能輸入 1～9，或留白。其他輸入已保留。", invalid)
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
                SudokuState.SOLVED: ("這道題目有唯一解。", "success"),
                SudokuState.MULTIPLE: (
                    "這道題目有多組解答，以下顯示其中一組。",
                    "info",
                ),
                SudokuState.UNSOLVABLE: ("題目有重複數字，請修正標示的格子。", "error"),
                SudokuState.DEAD_END: ("這道題目沒有解答，請檢查已填數字。", "error"),
                SudokuState.TIMEOUT: (
                    "已達求解時間上限，尚無法確認解答與唯一性，請補充線索後重試。",
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
    return jsonify(message="暫時無法產生符合技巧難度的新題，請再試一次。"), 503


@app.get("/play")
def play():
    return render_template(
        "play.html",
        puzzles=[{**p, **new_challenge(p["id"])} for p in PUZZLES],
        legacy_puzzles=PUZZLES,
    )


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
        return jsonify(message="找不到關卡或操作。"), 404
    if action == "new":
        return jsonify(**new_challenge(puzzle_id))
    payload = request.get_json(silent=True)
    board = payload.get("board") if isinstance(payload, dict) else None
    if (
        not isinstance(board, list)
        or len(board) != 81
        or any(type(v) is not int or not 0 <= v <= 9 for v in board)
    ):
        return jsonify(message="盤面必須包含 81 個 0～9 整數。"), 400
    puzzle_text = payload.get("puzzle", puzzle["puzzle"])
    if (
        not isinstance(puzzle_text, str)
        or len(puzzle_text) != 81
        or any(c not in "0123456789" for c in puzzle_text)
    ):
        return jsonify(message="題目格式不正確。"), 400
    givens = [int(c) for c in puzzle_text]
    if any(g and board[i] != g for i, g in enumerate(givens)):
        return jsonify(message="原始題目數字不能修改。"), 400
    solver = SudokuSolver()
    solver.load_board(givens)
    if solver.solve() != SudokuState.SOLVED:
        return jsonify(message="暫時無法驗證題目，請稍後再試。"), 503
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
            return jsonify(message="請選擇空白作答格並填入數字。"), 400
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
            message="標示的作答與正確解答不符，請先修正或清除，再繼續推理。",
        )
    if board == answer:
        return jsonify(
            status="complete", message="完成挑戰！", profile=analyze_puzzle(givens)
        )
    if action == "check":
        return jsonify(status="playing", message="目前填入的數字都正確，繼續加油！")
    hint = next_hint(board)
    return jsonify(
        status="hint" if hint else "unavailable",
        hint=hint,
        message="目前支援的技巧找不到下一步。" if not hint else "",
    )


@app.errorhandler(413)
def too_large(error):
    return "提交內容過大，請只提交數獨題目。", 413


if __name__ == "__main__":
    app.run(
        host=os.environ.get("SUDOKU_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "12345")),
        debug=False,
    )
