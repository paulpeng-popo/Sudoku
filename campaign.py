"""教學關卡、隨機唯一解題目與可解釋提示。"""

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
        "title": "找回缺少的數字",
        "difficulty": "入門",
        "goal": "從只剩一格空白的行、列或宮，找回缺少的數字。",
        "puzzle": masked(range(0, 81, 10)),
    },
    {
        "id": "cross-check",
        "title": "交叉觀察",
        "difficulty": "初級",
        "goal": "綜合行、列與宮的限制，逐步排除候選數。",
        "puzzle": masked([i for i, c in enumerate(BASE) if c == "0"][:30]),
    },
    {
        "id": "first-challenge",
        "title": "尋找唯一位置",
        "difficulty": "中級",
        "goal": "當每格都有多個候選數，改找一個數字唯一能放的位置。",
        "puzzle": BASE,
    },
]
# 後續章節沿用已驗證的推理難度，戰鬥配置由 adventure.js 定義。
for stage_id, title in (
    ("frost-gate", "霜門試煉"),
    ("crystal-path", "晶脈迴廊"),
    ("winter-crown", "永冬王座"),
    ("sand-frontier", "砂海邊境"),
    ("star-temple", "星盤神殿"),
    ("sunspire", "曜炎之巔"),
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
        f"第 {n + 1} 列"
        if n < 9
        else f"第 {n - 8} 欄"
        if n < 18
        else f"第 {n - 17} 宮（由左至右、由上至下）"
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
                "technique": "最後一格",
                "stages": [
                    f"看看{label}，只剩一格還沒填。",
                    f"{label}需要包含 1～9，找出還沒出現的數字。",
                    f"{label}只缺 {value}，所以第 {i // 9 + 1} 列、第 {i % 9 + 1} 欄填 {value}。",
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
                "technique": "唯一候選數",
                "stages": [
                    f"觀察第 {i // 9 + 1} 列、第 {i % 9 + 1} 欄的空格。",
                    "查看這格所在的行、列與宮，排除已經出現的數字；只會剩下一個候選數。",
                    f"同行、同列或同宮已包含 {'、'.join(str(v) for v in range(1, 10) if v != value)}，所以這格只能填 {value}。",
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
                    "technique": "唯一位置",
                    "stages": [
                        f"觀察{label}，試著找出數字 {value} 可以放的位置。",
                        f"排除已有數字的格子，再排除同行、同列或同宮已有 {value} 的空格。",
                        f"{label}只有第 {i // 9 + 1} 列、第 {i % 9 + 1} 欄能放 {value}。",
                    ],
                }
    return None


def generate_candidate(level_id, rng):
    """隨機排列完整盤面，再只移除能以提示邏輯補回的線索。"""
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


TECHNIQUES = ("最後一格", "唯一候選數", "唯一位置")
DIFFICULTIES = ("入門", "初級", "中級")
LEVEL_RANK = {
    p["id"]: {"first-step": 0, "cross-check": 1}.get(p["id"], 2) for p in PUZZLES
}


def analyze_puzzle(board):
    """依固定優先序推理，回報所需的最高技巧；不是玩家實際操作紀錄。"""
    probe = list(map(int, board))
    counts = dict.fromkeys(TECHNIQUES, 0)
    while 0 in probe:
        hint = next_hint(probe)
        if hint is None:
            return {
                "solved": False,
                "rank": None,
                "difficulty": "超出目前技巧",
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
    raise GenerationError("暫時無法產生符合技巧難度的新題，請再試一次。")
