const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const resources = require('../static/resources.js');
test('Resource IDs, skills, map encounters, and artwork resolve', () => {
  for(const list of Object.values(resources)) {
    assert.equal(new Set(list.map(r => r.id)).size,list.length);
    for(const r of list) {
      if(r.art) assert.ok(fs.existsSync('.' + r.art));
      if(r.skill) assert.ok(resources.skills.some(s => s.id === r.skill));
      if(r.monsters) for(const id of r.monsters) assert.ok(resources.monsters.some(m => m.id === id));
    }
  }
});
