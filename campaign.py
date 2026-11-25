"""Tutorial stages, random puzzles with unique solutions, and step-by-step hints."""

import json
import random
from functools import cached_property
from pathlib import Path
from typing import NamedTuple

SOLUTION = (
    "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
)
BASE = (
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
)


def masked(indices):
    return "".join("0" if i in indices else v for i, v in enumerate(SOLUTION))


DIFFICULTIES = ("Beginner", "Easy", "Intermediate")


class PuzzleSettings(NamedTuple):
    target_blanks: int
    legacy_board: str
    goal: str


PUZZLE_SETTINGS = {
    "Beginner": PuzzleSettings(
        9, masked(range(0, 81, 10)),
        "Find the missing digit in a row, column, or box with one empty cell.",
    ),
    "Easy": PuzzleSettings(
        30, masked([i for i, digit in enumerate(BASE) if digit == "0"][:30]),
        "Use the row, column, and box to rule out possible digits.",
    ),
    "Intermediate": PuzzleSettings(
        45, BASE,
        "When each cell has several candidates, look for a digit that fits in only one place.",
    ),
}

CHAPTERS = json.loads(Path(__file__).with_name("campaign.json").read_text(encoding="utf-8"))


def build_puzzles(chapters):
    puzzles = []
    for chapter in chapters:
        for stage in chapter["stages"]:
            difficulty = stage["difficulty"]
            settings = PUZZLE_SETTINGS[difficulty]
            puzzles.append({
                "id": stage["id"],
                "title": stage.get("puzzleTitle", stage["name"]),
                "difficulty": difficulty,
                "goal": settings.goal,
                "puzzle": settings.legacy_board,
            })
    return puzzles


PUZZLES = build_puzzles(CHAPTERS)
PUZZLE_BY_ID = {p["id"]: p for p in PUZZLES}
LEVEL_RANK = {p["id"]: DIFFICULTIES.index(p["difficulty"]) for p in PUZZLES}

UNITS = (
    [[r * 9 + c for c in range(9)] for r in range(9)]
    + [[r * 9 + c for r in range(9)] for c in range(9)]
    + [
        [r * 9 + c for r in range(br, br + 3) for c in range(bc, bc + 3)]
        for br in (0, 3, 6)
        for bc in (0, 3, 6)
    ]
)


def unit_label(n):
    return (
        f"row {n + 1}"
        if n < 9
        else f"column {n - 8}"
        if n < 18
        else f"box {n - 17} (counting from left to right, then top to bottom)"
    )


PEERS = [
    {cell for unit in UNITS if index in unit for cell in unit if cell != index}
    for index in range(81)
]


class HintBoard:
    def __init__(self, values):
        self.values = values

    @cached_property
    def candidates(self):
        return {
            index: set(range(1, 10)) - {self.values[peer] for peer in PEERS[index]}
            for index, value in enumerate(self.values) if not value
        }


def last_empty_cell(board):
    values = board.values
    for n, unit in enumerate(UNITS):
        empty = [i for i in unit if values[i] == 0]
        if len(empty) == 1:
            options = set(range(1, 10)) - {values[i] for i in unit}
            if len(options) != 1:
                continue
            i, value = empty[0], options.pop()
            label = unit_label(n)
            return {
                "index": i,
                "value": value,
                "stages": [
                    f"Look at {label}. Only one cell is empty.",
                    f"Which digit from 1 to 9 is missing from {label}?",
                    f"Only {value} is missing from {label}. Put {value} in row {i // 9 + 1}, column {i % 9 + 1}.",
                ],
            }


def naked_single(board):
    for i, options in board.candidates.items():
        if len(options) == 1:
            value = next(iter(options))
            return {
                "index": i,
                "value": value,
                "stages": [
                    f"Look at the empty cell in row {i // 9 + 1}, column {i % 9 + 1}.",
                    "Rule out the digits already in its row, column, and box. Only one candidate remains.",
                    f"Its row, column, and box already contain {', '.join(str(v) for v in range(1, 10) if v != value)}. Only {value} fits here.",
                ],
            }


def hidden_single(board):
    candidates = board.candidates
    for n, unit in enumerate(UNITS):
        label = unit_label(n)
        for value in range(1, 10):
            positions = [i for i in unit if value in candidates.get(i, set())]
            if len(positions) == 1:
                i = positions[0]
                return {
                    "index": i,
                    "value": value,
                    "stages": [
                        f"Look for a place for {value} in {label}.",
                        f"Skip filled cells and empty cells whose row, column, or box already contains {value}.",
                        f"In {label}, {value} can only go in row {i // 9 + 1}, column {i % 9 + 1}.",
                    ],
                }
    return None


# Insertion order is hint priority. Multiple techniques may share a difficulty.
TECHNIQUES = {
    "Last empty cell": ("Beginner", last_empty_cell),
    "Naked single": ("Easy", naked_single),
    "Hidden single": ("Intermediate", hidden_single),
}


def next_hint(board):
    context = HintBoard(board)
    for name, (_, find_hint) in TECHNIQUES.items():
        hint = find_hint(context)
        if hint is not None:
            return {**hint, "technique": name}
    return None


def generate_candidate(level_id, rng):
    """Shuffle a solved board and remove only clues that the hint logic can recover."""
    target = PUZZLE_SETTINGS[PUZZLE_BY_ID[level_id]["difficulty"]].target_blanks
    digits = rng.sample(range(1, 10), 9)
    rows = [
        band * 3 + row
        for band in rng.sample(range(3), 3)
        for row in rng.sample(range(3), 3)
    ]
    cols = [
        band * 3 + col
        for band in rng.sample(range(3), 3)
        for col in rng.sample(range(3), 3)
    ]
    board = [digits[int(SOLUTION[r * 9 + c]) - 1] for r in rows for c in cols]
    if rng.choice((True, False)):
        board = [board[c * 9 + r] for r in range(9) for c in range(9)]
    target_rank = LEVEL_RANK[level_id]
    removed = 0
    for index in rng.sample(range(81), 81):
        value = board[index]
        board[index] = 0
        profile = analyze_puzzle(board)
        if not profile["solved"] or profile["rank"] > target_rank:
            board[index] = value
        else:
            removed += 1
            if removed >= target and profile["rank"] == target_rank:
                return "".join(map(str, board))
    return None


def analyze_puzzle(board):
    """Apply techniques in a fixed order and report the hardest one required."""
    probe = list(map(int, board))
    counts = dict.fromkeys(TECHNIQUES, 0)
    while 0 in probe:
        hint = next_hint(probe)
        if hint is None:
            return {
                "solved": False,
                "rank": None,
                "difficulty": "Beyond supported techniques",
                "techniques": counts,
            }
        counts[hint["technique"]] += 1
        probe[hint["index"]] = hint["value"]
    used = {name: count for name, count in counts.items() if count}
    rank = max((DIFFICULTIES.index(TECHNIQUES[name][0]) for name in used), default=0)
    return {
        "solved": True,
        "rank": rank,
        "difficulty": DIFFICULTIES[rank],
        "techniques": used,
    }


class GenerationError(RuntimeError):
    pass


def generate_puzzle(level_id, rng=None):
    rng = rng or random.SystemRandom()
    for _ in range(12):
        candidate = generate_candidate(level_id, rng)
        if candidate is not None:
            return candidate
    raise GenerationError("Could not generate a puzzle at this difficulty. Please try again.")
