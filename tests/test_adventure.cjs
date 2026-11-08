const test = require('node:test');
const assert = require('node:assert/strict');
const resources = require('../static/resources.js');
const adventure = require('../static/adventure.js');
const Battle = require('../static/battle.js');
test('雙章資源可解析且獎勵逐關解鎖',()=>{
 for(const stage of adventure.stages) {
  assert.ok(resources.maps.some(m=>m.id===stage.map));
  for(const id of [...stage.monsters,...(stage.boss?[stage.boss]:[])]) assert.ok(resources.monsters.some(m=>m.id===id));
 }
 assert.equal(adventure.owns('pets','owl',[]),false);
 assert.equal(adventure.owns('pets','owl',['first-step']),true);
 assert.equal(adventure.owns('heroes','knight',['first-step']),false);
 assert.equal(adventure.owns('heroes','knight',['first-step','cross-check']),true);
});
test('最後六格一定由 Boss 接手，半血狂怒，解完才獲勝',()=>{
 const b=new Battle({remaining:13,stageId:'first-challenge',loadout:{hero:'warden',pet:'fox',map:'ruins'}});
 for(let i=0;i<7;i++) assert.notEqual(b.correct(i),'won');
 assert.equal(b.remaining,6); assert.equal(b.bossActive,true); assert.equal(b.monster().id,'elder'); assert.equal(b.enemyHP,6);
 b.tick(20); assert.equal(b.distance,25);
 for(let i=7;i<10;i++) b.correct(i);
 assert.equal(b.enraged(),true); b.tick(20); assert.equal(b.distance,40);
 b.wrong(); assert.equal(b.distance,90);
 const restored=Battle.restore(JSON.parse(JSON.stringify(b.snapshot()))); assert.equal(restored.bossActive,true); assert.equal(restored.enemyHP,3); restored.resume();
 restored.correct(10); restored.correct(11); assert.equal(restored.status,'active'); assert.equal(restored.correct(12),'won');
});
test('每關所有可能剩餘格數都可完整結算，不會跳過 Boss 或卡死',()=>{
 for(const stage of adventure.stages) for(let count=1;count<=60;count++) {
  const b=new Battle({remaining:count,stageId:stage.id,loadout:{hero:'warden',pet:'fox',map:stage.map}});
  let sawBoss=b.bossActive;
  for(let i=0;i<count;i++) { assert.ok(b.enemyHP>0); b.correct(i); sawBoss ||= b.bossActive; }
  assert.equal(b.status,'won'); if(stage.boss) assert.equal(sawBoss,true);
 }
});

test('成長只計首次通關，重複或未知關卡不增加等級',()=>{
 assert.equal(adventure.rank([]),1);
 assert.equal(adventure.rank(['first-step','first-step','fake']),1);
 assert.equal(adventure.rank(['first-step','cross-check']),2);
 assert.equal(adventure.rank(adventure.stages.map(s=>s.id)),4);
 assert.equal(adventure.owns('equipment','heart',[]),false);
 assert.equal(adventure.owns('equipment','heart',['first-challenge']),true);
});
test('裝備與等級效果進入戰鬥並保持在存檔中',()=>{
 const loadout={hero:'warden',pet:'fox',map:'forest',gear:'heart'};
 const heart=new Battle({remaining:9,stageId:'first-step',seconds:30,rank:2,loadout});
 assert.equal(heart.hp,4); assert.equal(heart.knockback(),12);
 heart.wrong();heart.wrong();heart.wrong(); assert.equal(heart.hp,3); heart.useSkill(); assert.equal(heart.hp,4);
 assert.equal(Battle.restore(heart.snapshot()).hp,4);
 const time=new Battle({remaining:9,seconds:45,rank:3,loadout:{...loadout,gear:'hourglass'}});
 assert.equal(time.seconds,50); time.tick(8);
 const restored=Battle.restore(time.snapshot()); assert.equal(restored.time,42); assert.equal(restored.seconds,50); assert.equal(restored.baseSeconds,45);
 const rune=new Battle({remaining:9,rank:4,loadout:{...loadout,gear:'rune'}});
 assert.equal(rune.knockback(),24);
 const crystal=new Battle({remaining:9,stageId:'frost-gate',loadout:{...loadout,gear:'crystal'}});
 crystal.wrong(); assert.equal(crystal.distance,45);
});
test('永冬巨龍與普通晶甲衛具有各自的突進規則',()=>{
 const sentinel=new Battle({remaining:9,stageId:'frost-gate'});
 assert.equal(sentinel.enemyHP,4); sentinel.tick(20); assert.equal(sentinel.distance,15); sentinel.wrong(); assert.equal(sentinel.distance,75);
 const dragon=new Battle({remaining:6,stageId:'winter-crown'});
 assert.equal(dragon.monster().id,'dragon');
 dragon.correct(0);dragon.correct(1);dragon.correct(2); assert.equal(dragon.enraged(),true);
 dragon.tick(20); assert.equal(dragon.distance,45); dragon.wrong(); assert.equal(dragon.hp,2);
});
