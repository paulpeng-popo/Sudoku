# Developer guide

## Launch

Install Python 3.10 or later and Poetry. The recommended Python version is 3.12.13.
From the repository root, run

```bash
poetry install
poetry run python app.py
```

Open the address Flask prints in the terminal. It opens **Solver**. Select **Game** in the sidebar to play.

## Add a stage or chapter

[The campaign catalog](campaign.json) defines the order of chapters and stages for both Flask and the map. To add a stage, copy an entry into the chapter's `stages` list at the position where it should unlock.

- Give the stage a unique `id` and a player-facing `name`. Saved progress uses the stage ID, so keep existing IDs stable.
- Set `difficulty` to `Beginner`, `Easy`, or `Intermediate` and `seconds` to the base time per move. The optional `puzzleTitle` overrides the stage name on the puzzle.
- Choose a `map`, a nonempty list of `monsters`, and a `boss` (or `null`) using IDs from [the resource catalog](static/resources.js).
- Write the `intro` and `reward` shown to the player. To grant an item or companion on battle victory, add an entry such as `"unlocks": {"pets": ["owl"]}`. Assign each resource to at most one stage. The existing `first-step` stage shows how the reward text and grants fit together.

To add a chapter, append an object with a unique `button` ID, a `name`, a display `label`, a `badge`, an `advanceOn` rule, and at least one stage. Within a chapter, `"completion"` unlocks the next stage when the previous puzzle is completed and `"victory"` requires a battle win. Crossing into the next chapter always requires a battle win on the previous chapter's final stage. The map and chapter buttons follow the catalog order.

## Add a companion skill

1. In [the resource catalog](static/resources.js), add a `skills` entry with a unique ID, name, description, kind, and artwork. Set the companion's `skill` field in `pets` to that ID. A new companion can also reuse an existing skill ID.
2. For a new effect, add the same ID to `companionEffects` in [the battle rules](static/battle.js). Implement `available(battle)` to check whether the effect can be used and `apply(battle)` to change the battle state. For example, `heal` checks for missing health before restoring HP.
3. Leave charge handling to the battle mode. Legacy battles spend one use per battle. [RPG battles](static/rpg.js) recharge after eight newly solved cells. Test the effect and its unavailable state in [the battle tests](tests/test_battle.cjs) and check recharge behavior in [the RPG tests](tests/test_rpg.cjs).

## Add a hint technique

1. In [the campaign logic](campaign.py), write a function that takes a `HintBoard`. Read `board.values` for the 81 cells and `board.candidates` when the technique needs possible digits. Return `None` when the technique cannot place a digit.
2. Follow `naked_single` for the return format. Provide `index` (0–80, row by row), `value` (1–9), and `stages` (three hints that progress from a clue to the placement).
3. Add the display name and its `(difficulty, function)` pair to `TECHNIQUES` in priority order. The first technique that finds a move supplies the hint. The hardest technique used to finish a board determines its difficulty grade, which the puzzle generator also uses.
4. In [the campaign tests](tests/test_campaign.py), use a board that exercises the new technique and check its placement, priority, and difficulty grade.

## Run the tests

From the repository root, run the Python and Node.js suites. CI uses Node.js 24.

```bash
poetry run python -m unittest discover -s tests
node --test tests/*.cjs
```
