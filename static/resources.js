// Save files refer to resources by ID. Keep existing IDs stable when adding resources.
(function(root) {
  const sprites = new Set(['warden','knight','fox','owl','bramble','wraith','sentinel','elder','dragon','ranger','astrologer','scarab','phoenix']);
  const art = name => sprites.has(name) ? `/static/art/anime/${name}.png` : `/static/art/${name}.svg`;
  root.SudokuResources = {
    heroes: [],
    equipment: [],
    monsters: [],
    pets: [],
    skills: [
      {id:'piercing',art:art('skills/piercing'),name:'Piercing Arrow',description:'Ignores 4 defense. Every fourth hit in a combo is a critical hit.',kind:'Windrunner · Passive'},
      {id:'starlight',art:art('skills/starlight'),name:'Astral Resonance',description:'Adds 6 seconds per move and raises the power strike multiplier to ×2.4.',kind:'Starsand Mage · Passive'},
      {id:'sand-shell',art:art('skills/sand-shell'),name:'Armored Charge',description:'Has 8 defense. Advances 20% on timeout or 50% on a wrong answer.',kind:'Scarab · Passive'},
      {id:'solar-rage',art:art('skills/solar-rage'),name:'Solar Storm',description:'Advances 30% on timeout or 40% on a wrong answer. At half health, these rise to 45% and 60%.',kind:'Phoenix · Passive'},
      {id:'power',art:art('skills/power'),name:'Power Strike',description:'Solve 3 cells to charge. Activate to deal ×1.8 damage on your next hit and gain one shield. Shields do not stack.',kind:'All heroes · Active'},
      {id:'combo',art:art('skills/combo'),name:'Combo Rhythm',description:'Each consecutive hit adds 5% damage, up to 25%. Every fifth hit is a ×1.5 critical hit (every fourth for Windrunner). A mistake or timeout breaks the combo.',kind:'All heroes · Passive'},
      {id:'shell',art:art('skills/shell'),name:'Crystal Charge',description:'Advances 15% on timeout or 60% on a wrong answer.',kind:'Sentinel · Passive'},
      {id:'blizzard',art:art('skills/blizzard'),name:'Everwinter Storm',description:'Advances 30% on timeout or 40% on a wrong answer. At half health, these rise to 45% and 60%.',kind:'Dragon · Passive'},
      {id:'rage',art:art('skills/rage'),name:'Eclipse Fury',description:'Advances 25% on timeout or 40% on a wrong answer. At half health, these rise to 40% and 50%.',kind:'Treant · Passive'},
      {id:'repel',art:art('skills/repel'),name:'Runic Impact', description:'Starts with 10 attack and 2 defense. Adds 3 seconds per move and knocks enemies back 10% on hit.',kind:'Warden · Passive'},
      {id:'force',art:art('skills/force'),name:'Starshield Bash', description:'Starts with 13 attack and 6 defense. Knocks enemies back 20% on hit.',kind:'Knight · Passive'},
      {id:'march',art:art('skills/march'),name:'Heavy Footsteps',description:'Advances 20% on timeout or 40% on a wrong answer.',kind:'Bramble Beast · Passive'},
      {id:'rush',art:art('skills/rush'),name:'Spectral Rush',description:'Advances 30% on timeout or 40% on a wrong answer.',kind:'Wraith · Passive'},
      {id:'heal',art:art('skills/heal'),name:'Healing Spark',description:'Restores 1 HP, or 2 HP from level 5. Solve 8 cells to recharge. Using it at full health does not spend the charge.',kind:'Ember Fox · Active'},
      {id:'rewind',art:art('skills/rewind'),name:'Moonfeather Gust',description:'Sends the monster back to its starting point and resets the timer. Solve 8 cells to recharge.',kind:'Moonfeather Owl · Active'}
    ],
    maps: []
  };
  if(typeof module !== 'undefined') module.exports = root.SudokuResources;
})(globalThis);
