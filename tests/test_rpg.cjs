const {test} = require('node:test');
const assert = require('node:assert/strict');
const resources = require('../static/resources.js');
const adventure = require('../static/adventure.js');
const Legacy = require('../static/battle.js');
const Battle = require('../static/rpg.js');
const options = {remaining:30,seconds:30,stageId:'first-step',loadout:{hero:'warden',pet:'fox',map:'forest',gear:'none'}};
const make = extra => new Battle({...options,...extra});
test('職業、等級與裝備共同決定攻防、生命、倒數', () => {
  assert.deepEqual(make().stats(),{attack:10,defense:2,maxHP:3,seconds:33,knockback:10});
  const knight = make({rank:5,loadout:{...options.loadout,hero:'knight',gear:'crystal'}});
  assert.deepEqual(knight.stats(),{attack:21,defense:12,maxHP:4,seconds:34,knockback:28});
  const clock = make({rank:10,loadout:{...options.loadout,gear:'hourglass'}});
  assert.equal(clock.seconds,43); assert.equal(clock.maxHP,5);
  const rune = make({loadout:{...options.loadout,gear:'rune'}});
  rune.correct(0); assert.equal(rune.lastDamage,12);
  const plain = make(); plain.correct(0); assert.equal(plain.lastDamage,9);
});
test('連擊、第五擊暴擊、逾時及錯答重置，重複格不生能量', () => {
  const b = make(); b.correct(0); const snapshot = b.snapshot();
  assert.equal(b.correct(0),null); assert.deepEqual(b.snapshot(),snapshot);
  for(let i=1;i<5;i++) b.correct(i);
  assert.equal(b.combo,5); assert.equal(b.lastCritical,true); assert.equal(b.lastDamage,17);
  b.wrong(); assert.equal(b.combo,0);
  b.correct(5); assert.equal(b.lastCritical,false); assert.equal(b.combo,1);
  b.tick(b.seconds); assert.equal(b.combo,0); assert.equal(b.bestCombo,5);
});
test('重擊需蓄力且不能重複施放，護盾擋一次接觸', () => {
  const b = make(); assert.equal(b.usePower(),false);
  for(let i=0;i<3;i++) b.correct(i);
  assert.equal(b.usePower(),true); assert.equal(b.usePower(),false);
  b.correct(3); assert.equal(b.lastDamage,20); assert.equal(b.empowered,false);
  assert.equal(b.advance(100),'blocked'); assert.equal(b.hp,3);
  assert.equal(b.advance(100),'hurt'); assert.equal(b.hp,2);
});
test('怪物攻擊與角色防禦影響接觸傷害，狂怒增加威脅', () => {
  const warden = make({stageId:'winter-crown',remaining:6});
  const knight = make({stageId:'winter-crown',remaining:6,loadout:{...options.loadout,hero:'knight',gear:'crystal'}});
  warden.advance(100); knight.advance(100);
  assert.equal(warden.hp,1); assert.equal(knight.hp,2);
});
test('夥伴冷卻依有效解答推進，暫停／重載不刷新技能', () => {
  const b = make(); assert.equal(b.useSkill(),false);
  b.advance(100); assert.equal(b.useSkill(),true); assert.equal(b.petCooldown,8);
  b.pause(); assert.equal(b.correct(0),null); assert.equal(b.useSkill(),false);
  const restored = Battle.restore(JSON.parse(JSON.stringify(b.snapshot())));
  assert.equal(restored.petCooldown,8); restored.resume();
  for(let i=0;i<8;i++) restored.correct(i);
  restored.advance(100); assert.equal(restored.useSkill(),true); assert.equal(restored.hp,3);
});
test('高攻擊可提前擊敗 Boss，停止威脅但完成盤面才結算', () => {
  const b = make({stageId:'first-challenge',remaining:6,rank:10,loadout:{...options.loadout,hero:'knight',gear:'rune'}});
  b.correct(0); b.correct(1); b.correct(2);
  assert.equal(b.bossDefeated,true); assert.equal(b.status,'active'); assert.equal(b.remaining,3);
  const xp = b.earnedXP, hp = b.hp;
  assert.deepEqual(b.tick(99999),[]); b.wrong(); assert.equal(b.hp,hp);
  const restored = Battle.restore(b.snapshot()); assert.ok(restored); restored.resume();
  restored.correct(3); restored.correct(4); assert.equal(restored.correct(5),'won');
  assert.equal(restored.earnedXP,xp+40); assert.equal(restored.defeated,1);
  assert.equal(restored.correct(5),null); assert.equal(restored.earnedXP,xp+40);
});
test('全關卡與不同配裝、剩餘格數都能通關及復原，最後一格終結存活敵人', () => {
  for(const stage of adventure.stages) for(const rank of [1,5,10]) for(const hero of resources.heroes) for(const count of [1,6,7,20,60]) {
    let b = make({stageId:stage.id,remaining:count,rank,loadout:{...options.loadout,hero:hero.id,map:stage.map}});
    for(let i=0;i<count;i++) {
      b = Battle.restore(JSON.parse(JSON.stringify(b.snapshot()))); assert.ok(b);
      b.resume(); b.correct(i);
    }
    assert.equal(b.status,'won'); assert.equal(b.enemyHP,0);
    if(stage.boss) assert.equal(b.bossDefeated,true);
    assert.ok(Battle.restore(b.snapshot()));
  }
});
test('新存檔拒絕毀損數值及未知版本，舊版保持原戰鬥規則', () => {
  const data = make().snapshot();
  for(const patch of [{rulesVersion:3},{seconds:999},{energy:Infinity},{hp:-1},{remaining:0},{combo:100},{bossDefeated:true},{enemyHP:999},{credited:[1,1]},{loadout:null}]) assert.equal(Battle.restore({...data,...patch}),null);
  const legacy = new Legacy(options); legacy.correct(0);
  const restored = Battle.restore(legacy.snapshot()); assert.ok(restored);
  assert.equal(restored.enemyHP,2); assert.equal(restored.status,'paused');
});
test('經驗升級門檻、上限與既有章節等級相容', () => {
  assert.equal(adventure.growth(119).level,1); assert.equal(adventure.growth(120).level,2);
  assert.equal(adventure.growth(360).level,3); assert.equal(adventure.growth(99999).level,10);
  assert.equal(adventure.growth(99999).next,null);
  assert.equal(adventure.growth(0,adventure.stages.map(s=>s.id)).level,4);
});

test('遊俠穿甲與第四擊暴擊、星芒墜飾可疊加且不產生負護甲', () => {
  const ranger = make({stageId:'sand-frontier',loadout:{...options.loadout,hero:'ranger'}});
  ranger.correct(0); assert.equal(ranger.lastDamage,7);
  for(let i=1;i<4;i++) ranger.correct(i);
  assert.equal(ranger.lastCritical,true);
  const equipped = make({stageId:'sand-frontier',loadout:{...options.loadout,hero:'ranger',gear:'star'}});
  equipped.correct(0); assert.equal(equipped.lastDamage,12);
  const weak = make({loadout:{...options.loadout,hero:'ranger',gear:'star'}});
  weak.correct(0); assert.equal(weak.lastDamage,13);
});
test('術士倒數與重擊倍率在重載後保留', () => {
  const mage = make({loadout:{...options.loadout,hero:'astrologer'}});
  assert.equal(mage.seconds,36); assert.equal(mage.powerMultiplier(),2.4);
  for(let i=0;i<3;i++) mage.correct(i);
  mage.usePower();
  const restored = Battle.restore(JSON.parse(JSON.stringify(mage.snapshot())));
  restored.resume(); restored.correct(3);
  assert.equal(restored.lastDamage,24);
});
