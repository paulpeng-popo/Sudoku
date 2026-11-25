// Save files refer to resources by ID. Keep existing IDs stable when adding resources.
(function(root) {
  const sprites = new Set(['warden','knight','fox','owl','bramble','wraith','sentinel','elder','dragon','ranger','astrologer','scarab','phoenix']);
  const art = name => sprites.has(name) ? `/static/art/anime/${name}.png` : `/static/art/${name}.svg`;
  root.SudokuResources = {
    heroes: [
      {id:'warden', name:'Grove Warden', art:art('warden'), skill:'repel', description:'An adventurer who guards the forest with an emerald staff.', knockback:10,attack:10,defense:2,timeBonus:3},
      {id:'knight', name:'Starshield Knight', art:art('knight'), skill:'force', description:'A silver-armored knight who carries a shield studded with stars.', knockback:20,attack:13,defense:6},
      {id:'ranger',name:'Windrunner',art:art('ranger'),skill:'piercing',description:'A ranger whose arrows ride the wind and pierce armor.',knockback:14,attack:11,defense:2,pierce:4,criticalEvery:4},
      {id:'astrologer',name:'Starsand Mage',art:art('astrologer'),skill:'starlight',description:'A mage who reads the stars and turns drifting sand into starlight.',knockback:8,attack:9,defense:3,timeBonus:6,powerMultiplier:2.4}
    ],
    equipment: [
      {id:'none',name:'No charm',art:art('gear/none'),description:'Leave the charm slot empty.'},
      {id:'rune',name:'Impact Rune',art:art('gear/rune'),description:'+3 attack and +8% knockback.',knockback:8,attack:3},
      {id:'hourglass',name:'Sandglass',art:art('gear/hourglass'),description:'Adds 5 seconds to each move.',seconds:5},
      {id:'heart',name:'Life Charm',art:art('gear/heart'),description:'Adds 1 maximum health.',hp:1},
      {id:'crystal',name:'Frost Charm',art:art('gear/crystal'),description:'+4 defense. Reduces the charge distance after a wrong answer by 15%.',resist:15,defense:4},
      {id:'star',name:'Starlight Pendant',art:art('gear/star'),description:'+2 attack. Ignores 3 points of enemy defense.',attack:2,pierce:3}
    ],
    monsters: [
      {id:'scarab',name:'Ironclad Scarab',art:art('scarab'),skill:'sand-shell',description:'An ancient armored guardian that patrols the dunes.',hp:5,vitality:58,defense:8,attack:15,xp:24,step:20,wrongStep:50},
      {id:'phoenix',name:'Sunfire Phoenix',art:art('phoenix'),skill:'solar-rage',description:'An undying firebird guarding the far edge of the Starlit Dunes.',hp:6,vitality:125,defense:7,attack:20,xp:120,step:30,rageStep:45,rageWrong:60},
      {id:'sentinel',name:'Frost Sentinel',art:art('sentinel'),skill:'shell',description:'A heavily armored golem guarding the frozen gate.',hp:4,vitality:42,defense:5,attack:14,xp:16,step:15,wrongStep:60},
      {id:'dragon',name:'Everwinter Dragon',art:art('dragon'),skill:'blizzard',description:'A dragon of living ice that froze the Winter Throne.',hp:6,vitality:90,defense:6,attack:18,xp:80,step:30,rageStep:45,rageWrong:60},
      {id:'bramble', name:'Bramble Beast', art:art('bramble'), skill:'march', description:'An ancient stone beast covered in moss.', hp:3,vitality:30,defense:1,attack:10,xp:10, step:20},
      {id:'elder', name:'Eclipse Treant', art:art('elder'), skill:'rage', description:'A guardian rooted deep in the Heart of the Ruins.', hp:6,vitality:70,defense:3,attack:15,xp:60, step:25},
      {id:'wraith', name:'Twilight Wraith', art:art('wraith'), skill:'rush', description:'A swift spirit haunting the ruins.', hp:2,vitality:22,defense:0,attack:8,xp:12, step:30}
    ],
    pets: [
      {id:'fox', name:'Ember Fox', art:art('fox'), skill:'heal', description:'A healing spark glows at the tip of its tail.'},
      {id:'owl', name:'Moonfeather Owl', art:art('owl'), skill:'rewind', description:'A beat of its wings sends approaching enemies back.'}
    ],
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
    maps: [
      {id:'forest',name:'Moonshadow Forest',art:art('forest'),description:'Bramble beasts and wraiths appear in turn.',monsters:['bramble','wraith']},
      {id:'ruins',name:'Starfall Ruins',art:art('ruins'),description:'Wraiths and bramble beasts appear in turn.',monsters:['wraith','bramble']},
      {id:'frost',name:'Everwinter',art:art('frost'),description:'Frost sentinels guard the path to the dragon and its frozen throne.',monsters:['sentinel','wraith']},
      {id:'dunes',name:'Starlit Dunes',art:art('dunes'),description:'Cross the dunes and the Astral Temple to face the Sunfire Phoenix.',monsters:['scarab','wraith']}
    ]
  };
  if(typeof module !== 'undefined') module.exports = root.SudokuResources;
})(globalThis);
