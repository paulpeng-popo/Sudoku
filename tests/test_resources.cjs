const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const resources = require('../static/resources.js');
const Battle = require('../static/battle.js');
test('資源 ID、技能、地圖怪池與美術均可解析', () => {
  for(const list of Object.values(resources)) {
    assert.equal(new Set(list.map(r => r.id)).size,list.length);
    for(const r of list) {
      if(r.art) assert.ok(fs.existsSync('.' + r.art));
      if(r.skill) assert.ok(resources.skills.some(s => s.id === r.skill));
      if(r.monsters) for(const id of r.monsters) assert.ok(resources.monsters.some(m => m.id === id));
    }
  }
});
test('地圖輪替不同怪獸、騎士擊退與夥伴使用次數存檔', () => {
  const b = new Battle({remaining:8,loadout:{hero:'knight',pet:'owl',map:'ruins'}});
  assert.equal(b.enemyHP,2);
  b.tick(20); assert.equal(b.distance,30);
  b.correct(0); assert.equal(b.distance,10);
  b.correct(1); assert.equal(b.monster().id,'bramble'); assert.equal(b.enemyHP,3);
  b.wrong(); assert.equal(b.distance,40);
  assert.equal(b.useSkill(),true); assert.equal(b.distance,0);
  assert.equal(b.useSkill(),false);
  const restored = Battle.restore(JSON.parse(JSON.stringify(b.snapshot())));
  assert.equal(restored.status,'paused'); restored.resume();
  assert.equal(restored.useSkill(),false); assert.equal(restored.monster().id,'bramble');
});
test('治癒不浪費在滿血、暫停不能施放、每場限一次', () => {
  const b = new Battle({remaining:8,loadout:{hero:'warden',pet:'fox',map:'forest'}});
  assert.equal(b.useSkill(),false); assert.equal(b.skillUsed,false);
  b.wrong(); b.wrong(); b.wrong(); assert.equal(b.hp,2);
  b.pause(); assert.equal(b.useSkill(),false);
  b.resume(); assert.equal(b.useSkill(),true); assert.equal(b.hp,3);
  b.wrong(); b.wrong(); b.wrong(); assert.equal(b.useSkill(),false);
});
