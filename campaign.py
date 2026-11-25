"""Tutorial stages, random puzzles with unique solutions, and step-by-step hints."""

import random

SOLUTION = (
    "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
)
BASE = (
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
)


def masked(indices):
    return "".join("0" if i in indices else v for i, v in enumerate(SOLUTION))


PUZZLES = [
    {
        "id": "first-step",
        "title": "Find the Missing Digit",
        "difficulty": "Beginner",
        "goal": "Find the missing digit in a row, column, or box with one empty cell.",
        "puzzle": masked(range(0, 81, 10)),
    },
    {
        "id": "cross-check",
        "title": "Cross-check the Clues",
        "difficulty": "Easy",
        "goal": "Use the row, column, and box to rule out possible digits.",
        "puzzle": masked([i for i, c in enumerate(BASE) if c == "0"][:30]),
    },
    {
        "id": "first-challenge",
        "title": "Find the Only Spot",
        "difficulty": "Intermediate",
        "goal": "When each cell has several candidates, look for a digit that fits in only one place.",
        "puzzle": BASE,
    },
]
# Later chapters reuse these logic difficulties. Combat settings live in adventure.js.
for stage_id, title in (
    ("frost-gate", "Frostgate Trial"),
    ("crystal-path", "Crystal Passage"),
    ("winter-crown", "Winter Throne"),
    ("sand-frontier", "Dune Frontier"),
    ("star-temple", "Astral Temple"),
    ("sunspire", "Sunspire"),
):
    PUZZLES.append({**PUZZLES[2], "id": stage_id, "title": title})

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


def next_hint(board):
    for n, unit in enumerate(UNITS):
        empty = [i for i in unit if board[i] == 0]
        if len(empty) == 1:
            options = set(range(1, 10)) - {board[i] for i in unit}
            if len(options) != 1:
                continue
            i, value = empty[0], options.pop()
            label = unit_label(n)
            return {
                "index": i,
                "value": value,
                "technique": "Last empty cell",
                "stages": [
                    f"Look at {label}. Only one cell is empty.",
                    f"Which digit from 1 to 9 is missing from {label}?",
                    f"Only {value} is missing from {label}. Put {value} in row {i // 9 + 1}, column {i % 9 + 1}.",
                ],
            }
    candidates = {}
    for i, value in enumerate(board):
        if not value:
            peers = {j for unit in UNITS if i in unit for j in unit} - {i}
            candidates[i] = set(range(1, 10)) - {board[j] for j in peers}
    for i, options in candidates.items():
        if len(options) == 1:
            value = next(iter(options))
            return {
                "index": i,
                "value": value,
                "technique": "Naked single",
                "stages": [
                    f"Look at the empty cell in row {i // 9 + 1}, column {i % 9 + 1}.",
                    "Rule out the digits already in its row, column, and box. Only one candidate remains.",
                    f"Its row, column, and box already contain {', '.join(str(v) for v in range(1, 10) if v != value)}. Only {value} fits here.",
                ],
            }
    for n, unit in enumerate(UNITS):
        label = unit_label(n)
        for value in range(1, 10):
            positions = [i for i in unit if value in candidates.get(i, set())]
            if len(positions) == 1:
                i = positions[0]
                return {
                    "index": i,
                    "value": value,
                    "technique": "Hidden single",
                    "stages": [
                        f"Look for a place for {value} in {label}.",
                        f"Skip filled cells and empty cells whose row, column, or box already contains {value}.",
                        f"In {label}, {value} can only go in row {i // 9 + 1}, column {i % 9 + 1}.",
                    ],
                }
    return None


def generate_candidate(level_id, rng):
    """Shuffle a solved board and remove only clues that the hint logic can recover."""
    target = {"first-step": 9, "cross-check": 30}.get(level_id, 45)
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


TECHNIQUES = ("Last empty cell", "Naked single", "Hidden single")
DIFFICULTIES = ("Beginner", "Easy", "Intermediate")
LEVEL_RANK = {
    p["id"]: {"first-step": 0, "cross-check": 1}.get(p["id"], 2) for p in PUZZLES
}


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
    rank = max((i for i, name in enumerate(TECHNIQUES) if counts[name]), default=0)
    return {
        "solved": True,
        "rank": rank,
        "difficulty": DIFFICULTIES[rank],
        "techniques": {name: count for name, count in counts.items() if count},
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
