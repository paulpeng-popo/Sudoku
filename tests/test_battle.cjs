const {test} = require('node:test');
const assert = require('node:assert/strict');
const Battle = require('../static/battle.js');
test('Timeout advances the enemy and contact costs one heart and resets its position', () => {
  const b = new Battle({remaining: 9});
  assert.deepEqual(b.tick(19), []); assert.equal(b.distance, 0);
  assert.deepEqual(b.tick(1), ['advance']); assert.equal(b.distance, 20);
  assert.deepEqual(b.tick(80), ['advance', 'advance', 'advance', 'hurt']);
  assert.equal(b.hp, 2); assert.equal(b.distance, 0);
});
test('Wrong answers advance the enemy without resetting the timer', () => {
  const b = new Battle({remaining: 9}); b.tick(5);
  b.wrong(); assert.equal(b.distance, 40); assert.equal(b.time, 15);
  b.wrong(); assert.equal(b.distance, 80);
  assert.equal(b.wrong(), 'hurt'); assert.equal(b.hp, 2);
});
test('Hits reset time and knock enemies back, every third hit changes the enemy, and solving wins', () => {
  const b = new Battle({remaining: 4}); b.tick(25);
  assert.equal(b.correct(0), 'attack'); assert.equal(b.distance, 10); assert.equal(b.time, 20);
  assert.equal(b.correct(0), null); assert.equal(b.remaining, 3);
  b.correct(1); assert.equal(b.correct(2), 'defeated');
  assert.equal(b.defeated, 1); assert.equal(b.enemyHP, 1);
  assert.equal(b.correct(3), 'won'); assert.equal(b.defeated, 2);
  b.tick(1000); b.wrong(); assert.equal(b.hp, 3);
});
test('Pausing stops time and reloading preserves health and pause state', () => {
  const b = new Battle({remaining: 9}); b.tick(100); b.pause();
  const before = b.snapshot(); b.tick(500); b.wrong(); b.correct(1);
  assert.deepEqual(b.snapshot(), before);
  const restored = Battle.restore(before); assert.equal(restored.hp, 2);
  restored.resume(); restored.tick(20); assert.equal(restored.distance, 20);
  assert.equal(Battle.restore(restored.snapshot()).status, 'paused');
});
test('Defeat prevents further damage or attacks and elapsed time is capped', () => {
  const b = new Battle({remaining: 9}); b.tick(100000);
  assert.equal(b.status, 'lost'); assert.equal(b.hp, 0);
  assert.equal(b.correct(1), null); b.wrong(); b.tick(100);
  assert.equal(b.hp, 0); assert.equal(b.remaining, 9);
});
test('Corrupt battle saves are rejected', () => {
  assert.equal(Battle.restore({status: 'active', hp: -1}), null);
  const b = new Battle({remaining: 9});
  assert.equal(Battle.restore({...b.snapshot(), time: Infinity}), null);
});
