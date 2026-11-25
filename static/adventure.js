// Derive permanent rewards from cleared stages so reloading cannot award them twice.
(function(root) {
  const chapters = typeof module !== 'undefined'
    ? require('../campaign.json')
    : JSON.parse(document.getElementById('campaign-data').textContent);
  const stages = chapters.flatMap(chapter => chapter.stages);
  const stageIds = new Set(stages.map(stage => stage.id));
  const unlocks = new Map();
  for (const stage of stages) {
    for (const [group, ids] of Object.entries(stage.unlocks || {})) {
      for (const id of ids) unlocks.set(group + '/' + id, stage);
    }
  }

  function rank(cleared) {
    const wins = new Set(cleared.filter(id => stageIds.has(id)));
    return Math.min(4, 1 + Math.floor(wins.size / 2));
  }

  function owns(group, id, cleared) {
    const stage = unlocks.get(group + '/' + id);
    return !stage || cleared.includes(stage.id);
  }

  function requirement(group, id) {
    const stage = unlocks.get(group + '/' + id);
    if (!stage) return '';
    if (group === 'maps' && stage.boss) {
      const boss = root.SudokuResources.monsters.find(monster => monster.id === stage.boss);
      return `Defeat the ${boss.name} to unlock`;
    }
    return `Clear ${stage.name} to unlock`;
  }

  const xpFor = level => 60 * (level - 1) * level;
  function growth(xp, cleared = []) {
    let level = rank(cleared);
    while(level < 10 && xp >= xpFor(level + 1)) level++;
    return {level, next: level < 10 ? xpFor(level + 1) : null};
  }
  root.SudokuAdventure = {stages,chapters,rank,owns,requirement,growth,xpFor};
  if(typeof module !== 'undefined') module.exports = root.SudokuAdventure;
})(globalThis);
