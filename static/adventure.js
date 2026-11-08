// 章節流程與永久獎勵；獎勵由過關集合推導，不會因重整重複領取。
(function(root) {
  const stages = [
    {id:'first-step',name:'林間巡守',map:'forest',monsters:['bramble'],seconds:30,reward:'月羽鴞加入 · 衝擊符石',intro:'清除林間石獸',boss:null},
    {id:'cross-check',name:'幽影小徑',map:'forest',monsters:['wraith','bramble'],seconds:30,reward:'星鎧騎士加入 · 流砂時計',intro:'穿越幽靈出沒的小徑',boss:null},
    {id:'first-challenge',name:'遺跡之心',map:'ruins',monsters:['wraith','bramble'],seconds:45,reward:'月影守護者徽章 · 生命墜飾 · 第二章',intro:'擊敗最後六格現身的古樹王',boss:'elder'},
    {id:'frost-gate',name:'霜門試煉',map:'frost',monsters:['sentinel'],seconds:45,reward:'逐風遊俠加入 · 寒晶護符',intro:'小心晶甲衛的錯答突進',boss:null},
    {id:'crystal-path',name:'晶脈迴廊',map:'frost',monsters:['wraith','sentinel'],seconds:45,reward:'守衛訓練 +1',intro:'穿越迅捷幽影與堅固晶甲衛',boss:null},
    {id:'winter-crown',name:'永冬王座',map:'frost',monsters:['sentinel','wraith'],seconds:45,reward:'破曉守護者徽章 · 星砂術士加入 · 第三章',intro:'最後六格迎戰永冬巨龍',boss:'dragon'},
    {id:'sand-frontier',name:'砂海邊境',map:'dunes',monsters:['scarab','wraith'],seconds:45,reward:'星芒墜飾',intro:'穿越甲蟲盤踞的砂海',boss:null},
    {id:'star-temple',name:'星盤神殿',map:'dunes',monsters:['scarab','sentinel','wraith'],seconds:45,reward:'開啟曜炎之巔',intro:'突破古老神殿的守衛',boss:null},
    {id:'sunspire',name:'曜炎之巔',map:'dunes',monsters:['scarab','sentinel'],seconds:45,reward:'獲得「星海行者」徽章',intro:'最後六格迎戰曜炎鳳凰',boss:'phoenix'}
  ];
  const chapters = [
    {button:'chapter-one',name:'月影森林',label:'第一章',badge:'月影守護者'},
    {button:'chapter-two',name:'永冬之境',label:'第二章',badge:'破曉守護者'},
    {button:'chapter-three',name:'流沙星海',label:'第三章',badge:'星海行者'}
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
    if(group === 'heroes' && heroUnlock[id]) return `通過${stages.find(s => s.id === heroUnlock[id]).name}解鎖`;
    if(group === 'maps' && id === 'dunes') return '擊敗永冬巨龍解鎖';
    if(group === 'equipment') return `通過${stages.find(s => s.id === equipmentUnlock[id])?.name || '關卡'}解鎖`;
    if(group === 'maps' && id === 'frost') return '擊敗古樹王解鎖';
    return group === 'pets' && id === 'owl' ? '通過林間巡守解鎖' : '通過幽影小徑解鎖';
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
