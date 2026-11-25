const test = require('node:test');
const assert = require('node:assert/strict');
const resources = require('../static/resources.js');
const adventure = require('../static/adventure.js');
const Battle = require('../static/battle.js');
test('Chapter resources resolve and rewards unlock stage by stage',()=>{
 for(const stage of adventure.stages) {
  assert.ok(resources.maps.some(m=>m.id===stage.map));
  for(const id of [...stage.monsters,...(stage.boss?[stage.boss]:[])]) assert.ok(resources.monsters.some(m=>m.id===id));
 }
 assert.equal(adventure.owns('pets','owl',[]),false);
 assert.equal(adventure.owns('pets','owl',['first-step']),true);
 assert.equal(adventure.owns('heroes','knight',['first-step']),false);
 assert.equal(adventure.owns('heroes','knight',['first-step','cross-check']),true);
});
test('Campaign chapters, stages, and unlocks have unique, resolvable IDs', () => {
  const {chapters, stages} = adventure;
  assert.equal(new Set(chapters.map(chapter => chapter.button)).size, chapters.length);
  assert.equal(new Set(stages.map(stage => stage.id)).size, stages.length);
  const grants = new Set();
  for (const chapter of chapters) {
    assert.ok(chapter.stages.length);
    assert.ok(['completion', 'victory'].includes(chapter.advanceOn));
    for (const stage of chapter.stages) {
      for (const [group, ids] of Object.entries(stage.unlocks || {})) {
        for (const id of ids) {
          assert.ok(resources[group].some(item => item.id === id));
          const key = group + '/' + id;
          assert.ok(!grants.has(key), key);
          grants.add(key);
          assert.equal(adventure.owns(group, id, []), false);
          assert.equal(adventure.owns(group, id, [stage.id]), true);
        }
      }
    }
  }
});
test('The boss appears with six cells left, enrages at half health, and victory requires solving the board',()=>{
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
test('Every remaining cell count resolves each stage without skipping the boss',()=>{
 for(const stage of adventure.stages) for(let count=1;count<=60;count++) {
  const b=new Battle({remaining:count,stageId:stage.id,loadout:{hero:'warden',pet:'fox',map:stage.map}});
  let sawBoss=b.bossActive;
  for(let i=0;i<count;i++) { assert.ok(b.enemyHP>0); b.correct(i); sawBoss ||= b.bossActive; }
  assert.equal(b.status,'won'); if(stage.boss) assert.equal(sawBoss,true);
 }
});

test('Only first clears grant growth and unknown stages do not raise the level',()=>{
 assert.equal(adventure.rank([]),1);
 assert.equal(adventure.rank(['first-step','first-step','fake']),1);
 assert.equal(adventure.rank(['first-step','cross-check']),2);
 assert.equal(adventure.rank(adventure.stages.map(s=>s.id)),4);
 assert.equal(adventure.owns('equipment','heart',[]),false);
 assert.equal(adventure.owns('equipment','heart',['first-challenge']),true);
});
test('Equipment and level effects persist in battle saves',()=>{
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
test('The Everwinter Dragon and Frost Sentinel have distinct charge rules',()=>{
 const sentinel=new Battle({remaining:9,stageId:'frost-gate'});
 assert.equal(sentinel.enemyHP,4); sentinel.tick(20); assert.equal(sentinel.distance,15); sentinel.wrong(); assert.equal(sentinel.distance,75);
 const dragon=new Battle({remaining:6,stageId:'winter-crown'});
 assert.equal(dragon.monster().id,'dragon');
 dragon.correct(0);dragon.correct(1);dragon.correct(2); assert.equal(dragon.enraged(),true);
 dragon.tick(20); assert.equal(dragon.distance,45); dragon.wrong(); assert.equal(dragon.hp,2);
});
