// Derive permanent rewards from cleared stages so reloading cannot award them twice.
(function(root) {
  const stages = [
    {id:'first-step',name:'Forest Patrol',map:'forest',monsters:['bramble'],seconds:30,reward:'Moonfeather Owl joins · Impact Rune',intro:'Drive the stone beasts out of the forest.',boss:null},
    {id:'cross-check',name:'Shade Trail',map:'forest',monsters:['wraith','bramble'],seconds:30,reward:'Starshield Knight joins · Sandglass',intro:'Cross the trail haunted by wraiths.',boss:null},
    {id:'first-challenge',name:'Heart of the Ruins',map:'ruins',monsters:['wraith','bramble'],seconds:45,reward:'Moonshadow Guardian badge · Life Charm · Chapter 2',intro:'Defeat the Eclipse Treant when six cells remain.',boss:'elder'},
    {id:'frost-gate',name:'Frostgate Trial',map:'frost',monsters:['sentinel'],seconds:45,reward:'Windrunner joins · Frost Charm',intro:'Watch out for the sentinel: a wrong answer makes it charge.',boss:null},
    {id:'crystal-path',name:'Crystal Passage',map:'frost',monsters:['wraith','sentinel'],seconds:45,reward:'Guardian training +1',intro:'Fight your way past swift wraiths and armored sentinels.',boss:null},
    {id:'winter-crown',name:'Winter Throne',map:'frost',monsters:['sentinel','wraith'],seconds:45,reward:'Dawn Guardian badge · Starsand Mage joins · Chapter 3',intro:'Face the Everwinter Dragon when six cells remain.',boss:'dragon'},
    {id:'sand-frontier',name:'Dune Frontier',map:'dunes',monsters:['scarab','wraith'],seconds:45,reward:'Starlight Pendant',intro:'Cross the scarab-infested dunes.',boss:null},
    {id:'star-temple',name:'Astral Temple',map:'dunes',monsters:['scarab','sentinel','wraith'],seconds:45,reward:'Unlock Sunspire',intro:'Break through the temple guards.',boss:null},
    {id:'sunspire',name:'Sunspire',map:'dunes',monsters:['scarab','sentinel'],seconds:45,reward:'Earn the Starfarer badge',intro:'Face the Sunfire Phoenix when six cells remain.',boss:'phoenix'}
  ];
  const chapters = [
    {button:'chapter-one',name:'Moonshadow Forest',label:'Chapter 1',badge:'Moonshadow Guardian'},
    {button:'chapter-two',name:'Everwinter',label:'Chapter 2',badge:'Dawn Guardian'},
    {button:'chapter-three',name:'Starlit Dunes',label:'Chapter 3',badge:'Starfarer'}
  ];
  function rank(cleared) { return Math.min(4, 1 + Math.floor(new Set(cleared.filter(id => stages.some(s => s.id === id))).size / 2)); }
  const equipmentUnlock = {rune:'first-step',hourglass:'cross-check',heart:'first-challenge',crystal:'frost-gate',star:'sand-frontier'};
  const heroUnlock = {knight:'cross-check',ranger:'frost-gate',astrologer:'winter-crown'};
  function owns(group,id,cleared) {
    if(group === 'heroes' && heroUnlock[id]) return cleared.includes(heroUnlock[id]);
    if(group === 'maps' && id === 'dunes') return cleared.includes('winter-crown');
    if(group === 'equipment') return !equipmentUnlock[id] || cleared.includes(equipmentUnlock[id]);
    if(group === 'maps' && id === 'frost') return cleared.includes('first-challenge');
    if(group === 'pets' && id === 'owl') return cleared.includes(stages[0].id);
    if(group === 'maps' && id === 'ruins') return cleared.includes(stages[1].id);
    return true;
  }
  function requirement(group,id) {
    if(group === 'heroes' && heroUnlock[id]) return `Clear ${stages.find(s => s.id === heroUnlock[id]).name} to unlock`;
    if(group === 'maps' && id === 'dunes') return 'Defeat the Everwinter Dragon to unlock';
    if(group === 'equipment') return `Clear ${stages.find(s => s.id === equipmentUnlock[id])?.name || 'the stage'} to unlock`;
    if(group === 'maps' && id === 'frost') return 'Defeat the Eclipse Treant to unlock';
    return group === 'pets' && id === 'owl' ? 'Clear Forest Patrol to unlock' : 'Clear Shade Trail to unlock';
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
