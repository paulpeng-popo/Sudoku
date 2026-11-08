// 以最小 DOM 替身驗證遊戲狀態；不取代真實瀏覽器的版面驗收。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');
const puzzles = JSON.parse(execFileSync('.venv/bin/python', ['-c', 'import json; from campaign import PUZZLES, analyze_puzzle; print(json.dumps([{**p, "profile": analyze_puzzle(p["puzzle"])} for p in PUZZLES]))'], {encoding: 'utf8'}));
const answer = [...'534678912672195348198342567859761423426853791713924856961537284287419635345286179'].map(Number);
class Element {
  constructor() {
    this.children = []; this.attrs = {}; this.hidden = false; this.style = {};
    const classes = new Set();
    this.classList = {add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, yes) => yes ? classes.add(c) : classes.delete(c)};
  }
  append(...children) { for (const child of children) { if (typeof child === 'object') { child.parentElement = this; const prev = this.children.at(-1); if (prev && typeof prev === 'object') prev.nextElementSibling = child; } this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(k, v) { this.attrs[k] = v; }
  select() {}
  focus() { this.onfocus?.(); }
}
function setup(initial = '{}', failingStorage = false) {
  const ids = {};
  const get = id => ids[id] ||= new Element();
  get('puzzle-data').textContent = JSON.stringify(puzzles);
  if (initial === '{}') initial = JSON.stringify({view: 'challenge'});
  let stored = initial, newRequests = 0, now = 0, timer, failRequest = false, delayNext = null;
  const listeners = {};
  const document = {getElementById: get, createElement: () => new Element(), querySelectorAll: () => get('keypad').children, addEventListener: (name, fn) => { listeners[name] = fn; }};
  const sandbox = { performance: {now: () => now}, setInterval: fn => { timer = fn; }, document, window: {confirm: () => true, addEventListener() {}}, localStorage: {getItem: () => stored, setItem: (_, value) => { if (failingStorage) throw new Error('storage blocked'); stored = value; }}, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      if (delayNext) { const delay = delayNext; delayNext = null; await delay; }
      if (failRequest) { failRequest = false; throw new Error('offline'); }
      const {board, index} = JSON.parse(options.body), action = url.split('/').at(-1);
      let data;
      if (action === 'strike') data = {correct: board[index] === answer[index], complete: board.every((v, i) => v === answer[i]), profile: puzzles[0].profile};
      else if (action === 'profile') data = {profile: puzzles[0].profile};
      else if (action === 'new') { newRequests++; data = {profile: puzzles[0].profile, puzzle: newRequests === 1 ? puzzles[0].puzzle : '50' + puzzles[0].puzzle.slice(2)}; }
      else if (action === 'answer') data = {answer};
      else if (board.every((v, i) => v === answer[i])) data = {status: 'complete', profile: puzzles[0].profile};
      else if (board.some((v, i) => v && v !== answer[i])) data = {status: 'errors', errors: board.flatMap((v, i) => v && v !== answer[i] ? [i] : []), message: '作答錯誤'};
      else if (action === 'hint') { const i = board.indexOf(0); data = {status: 'hint', hint: {index: i, value: answer[i], technique: '唯一候選數', stages: ['方向', '推理', '答案']}}; }
      else data = {status: 'playing', message: '繼續加油'};
      return {ok: true, json: async () => data};
    }};
  vm.createContext(sandbox);
  for(const file of ['resources','adventure','battle','rpg','library','play']) vm.runInContext(fs.readFileSync(`static/${file}.js`, 'utf8'), sandbox);
  return {get, holdNext: () => { let release; delayNext = new Promise(resolve => { release = resolve; }); return release; }, advance: ms => { now += ms; timer(); }, hide: () => { document.hidden = true; listeners.visibilitychange(); }, failNext: () => { failRequest = true; }, newRequests: () => newRequests, stored: () => stored, state: () => JSON.parse(stored), input: i => get('board').children[i].children[0]};
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function fill(ui, i, n) { ui.input(i).focus(); ui.input(i).onkeydown({key: String(n), preventDefault() {}}); }
async function start(ui) { await ui.get('enter-stage').onclick(); await ui.get('battle-start').onclick(); }
async function win(ui) { for(let i=0;i<81;i++) if(!ui.state()[ui.state().active].board[i]) { fill(ui,i,answer[i]); await settle(); } }
test('遊戲從章節地圖開始，配置與進場前不可填答', async () => {
 const ui=setup(); assert.equal(ui.state().view,'challenge'); assert.equal(ui.get('preparation').hidden,false);
 fill(ui,0,5); assert.equal(ui.state()['first-step'].board[0],0);
 assert.equal(ui.get('levels').children[1].disabled,true);
 await ui.get('enter-stage').onclick(); assert.equal(ui.state().view,'battle');
 fill(ui,0,5); assert.equal(ui.state()['first-step'].board[0],0);
 await ui.get('battle-start').onclick(); fill(ui,0,5); await settle();
 assert.equal(ui.state()['first-step'].board[0],5);
});
test('正確傷害、重複格不刷傷害、錯誤突進與暫停',async()=>{
 const ui=setup(); await start(ui); fill(ui,0,5); await settle();
 assert.equal(ui.state()['first-step'].battle.enemyHP,21);
 fill(ui,0,5); await settle(); assert.equal(ui.state()['first-step'].battle.enemyHP,21);
 fill(ui,10,1); await settle(); assert.equal(ui.state()['first-step'].battle.distance,40);
 ui.get('battle-pause').onclick(); ui.advance(100000); assert.equal(ui.state()['first-step'].battle.hp,3);
 ui.get('battle-pause').onclick(); ui.advance(33000); assert.equal(ui.state()['first-step'].battle.distance,60);
});
test('筆記保存但不造成攻擊，切回一般填答可攻擊',async()=>{
 const ui=setup(); await start(ui); ui.get('notes').onclick(); fill(ui,0,5);
 assert.deepEqual(ui.state()['first-step'].notes[0],[5]); assert.equal(ui.state()['first-step'].battle.enemyHP,30);
 ui.get('notes').onclick(); fill(ui,0,5); await settle(); assert.equal(ui.state()['first-step'].battle.enemyHP,21);
});
test('通關結算解鎖下一關及夥伴，重載不重複獎勵',async()=>{
 const ui=setup(); await start(ui); await win(ui);
 assert.equal(ui.state()['first-step'].battleWon,true); assert.equal(ui.get('levels').children[1].disabled,false);
 assert.match(ui.get('victory-reward').textContent,/月羽鴞/);
 const xp=ui.state().experience; assert.ok(xp>0);
 const restored=setup(ui.stored()); assert.equal(restored.state().experience,xp); assert.equal(restored.state()['first-step'].battleWon,true);
 restored.get('result-next').onclick(); assert.equal(restored.state().active,'cross-check'); assert.equal(restored.state().view,'challenge');
});
test('失敗不解鎖，重試取得新題、滿血且保留歷史',async()=>{
 const ui=setup(); await start(ui); ui.advance(500000);
 assert.equal(ui.state()['first-step'].battle.status,'lost'); assert.equal(ui.get('battle-retry').hidden,false);
 assert.equal(ui.get('levels').children[1].disabled,true);
 await ui.get('battle-retry').onclick(); assert.equal(ui.newRequests(),2); assert.equal(ui.state()['first-step'].battle,null);
 assert.equal(ui.state().seen.length,2); assert.equal(ui.state().view,'battle');
 await ui.get('battle-start').onclick(); assert.equal(ui.state()['first-step'].battle.hp,3);
});
test('地圖與圖鑑會暫停戰鬥，返回不會偷偷恢復計時',async()=>{
 const ui=setup(); await start(ui); ui.get('nav-challenge').onclick(); ui.advance(90000);
 assert.equal(ui.state()['first-step'].battle.status,'paused'); assert.equal(ui.state()['first-step'].battle.hp,3);
 await ui.get('enter-stage').onclick(); assert.equal(ui.state()['first-step'].battle.status,'paused');
 ui.get('battle-pause').onclick(); ui.get('nav-library').onclick(); ui.advance(90000);
 assert.equal(ui.state()['first-step'].battle.hp,3); assert.equal(ui.get('library').hidden,false);
 ui.get('library-close').onclick(); assert.equal(ui.state().view,'battle'); assert.equal(ui.state()['first-step'].battle.status,'paused');
});
test('撤退後返回地圖並換新題，不沿用作答刷獎勵',async()=>{
 const ui=setup(); await start(ui); fill(ui,0,5); await settle();
 await ui.get('battle-exit').onclick(); assert.equal(ui.state().view,'challenge'); assert.equal(ui.state()['first-step'].battle,null);
 assert.equal(ui.state()['first-step'].battleWon,false); assert.equal(ui.newRequests(),2);
});
test('換題失敗保留戰鬥與盤面，可再嘗試',async()=>{
 const ui=setup(); await start(ui); fill(ui,0,5); await settle(); ui.failNext();
 await ui.get('battle-exit').onclick(); assert.equal(ui.state()['first-step'].battle.status,'paused'); assert.equal(ui.state()['first-step'].board[0],5);
 assert.match(ui.get('game-message').textContent,/無法完成/);
});
test('圖鑑鎖定未取得角色，過關後可選並保存',async()=>{
 const ui=setup(); ui.get('nav-library').onclick();
 assert.equal(ui.get('resource-cards').children[1].children[1].children.at(-1).disabled,true);
 ui.get('library-close').onclick(); await start(ui); await win(ui); ui.get('nav-library').onclick();
 ui.get('library-tabs').children[2].onclick();
 const owl=ui.get('resource-cards').children[1].children[1].children.at(-1);
 assert.equal(owl.disabled,false); owl.onclick(); assert.equal(ui.state().loadout.pet,'owl');
 assert.equal(setup(ui.stored()).state().loadout.pet,'owl');
});
test('背景暫停與重新載入，網路失敗不扣血或保存答案',async()=>{
 const ui=setup(); await start(ui); ui.failNext(); fill(ui,0,5); await settle();
 assert.equal(ui.state()['first-step'].board[0],0); assert.equal(ui.state()['first-step'].battle.hp,3);
 ui.hide(); assert.equal(ui.state()['first-step'].battle.status,'paused');
 const restored=setup(ui.stored()); assert.equal(restored.state()['first-step'].battle.status,'paused');
});
test('攻擊回應遇到背景暫停仍只結算一次',async()=>{
 const ui=setup(); await start(ui); const release=ui.holdNext(); fill(ui,0,5); ui.hide();
 assert.equal(ui.state()['first-step'].board[0],0); release(); await settle();
 assert.equal(ui.state()['first-step'].board[0],5); assert.equal(ui.state()['first-step'].battle.enemyHP,21); assert.equal(ui.state()['first-step'].battle.status,'paused');
});
test('毀損存檔與無法儲存仍可進入遊戲',()=>{
 const ui=setup('invalid JSON',true); assert.match(ui.get('save-note').textContent,/無法儲存/); assert.equal(ui.input(0).value,'');
});

test('第一章連續三關，Boss 結算、隊伍獎勵與徽章保存',async()=>{
 const ui=setup();
 for(let stage=0;stage<3;stage++) {
  await start(ui); await win(ui);
  assert.equal(ui.state()[puzzles[stage].id].battleWon,true);
  if(stage<2) ui.get('result-next').onclick();
 }
 assert.match(ui.get('completion-title').textContent,/第一章完成/);
 assert.equal(ui.state()['first-challenge'].battle.bossActive,true);
 assert.equal(ui.get('chapter-badge').hidden,false);
 ui.get('result-next').onclick(); assert.equal(ui.state().active,'frost-gate');
 ui.get('chapter-one').onclick();
 const restored=setup(ui.stored()); assert.equal(restored.get('chapter-badge').hidden,false);
 restored.get('nav-library').onclick();
 assert.equal(restored.get('resource-cards').children[1].children[1].children.at(-1).disabled,false);
});

test('第二章通關、階級成長、裝備選用與存檔接續',async()=>{
 const ui=setup(); assert.equal(ui.get('chapter-two').disabled,true);
 for(let stage=0;stage<6;stage++) {
  await start(ui); await win(ui);
  assert.equal(ui.state()[puzzles[stage].id].battleWon,true);
  if(stage<5) ui.get('result-next').onclick();
 }
 assert.match(ui.get('completion-title').textContent,/第二章完成/);
 assert.match(ui.get('victory-reward').textContent,/Lv\.\d+/);
 assert.equal(ui.state()['winter-crown'].battle.bossActive,true);
 assert.match(ui.get('chapter-badge').textContent,/破曉守護者/);
 ui.get('result-next').onclick(); assert.equal(ui.state().active,'sand-frontier');
 assert.equal(ui.get('chapter-three').disabled,false);
 ui.get('nav-library').onclick(); ui.get('library-tabs').children[5].onclick();
 const heart=ui.get('resource-cards').children[3].children[1].children.at(-1);
 assert.equal(heart.disabled,false); heart.onclick(); assert.equal(ui.state().loadout.gear,'heart');
 const restored=setup(ui.stored()); assert.equal(restored.state().loadout.gear,'heart');
 assert.match(restored.get('party-stats').textContent,/♥ [4-6]/);
});
test('未通關不能穿戴獎勵裝備，舊存檔預設不裝備',()=>{
 const ui=setup(); assert.equal(ui.state().loadout.gear,'none');
 ui.get('nav-library').onclick(); ui.get('library-tabs').children[5].onclick();
 const heart=ui.get('resource-cards').children[3].children[1].children.at(-1);
 assert.equal(heart.disabled,true); heart.onclick(); assert.equal(ui.state().loadout.gear,'none');
});

test('九關連續通關解鎖新角色、第三章裝備與徽章，重載不重複領取經驗',async()=>{
 const ui=setup(); assert.equal(ui.get('chapter-three').disabled,true);
 for(let stage=0;stage<9;stage++) {
  await start(ui); await win(ui);
  assert.equal(ui.state()[puzzles[stage].id].battleWon,true);
  if(stage<8) ui.get('result-next').onclick();
 }
 assert.match(ui.get('completion-title').textContent,/第三章完成/);
 assert.match(ui.get('chapter-badge').textContent,/星海行者/);
 assert.equal(ui.state().sunspire.battle.bossActive,true);
 const xp=ui.state().experience;
 ui.get('nav-library').onclick();
 const heroes=ui.get('resource-cards').children;
 assert.equal(heroes[2].children[1].children.at(-1).disabled,false);
 const mage=heroes[3].children[1].children.at(-1);
 assert.equal(mage.disabled,false); mage.onclick();
 assert.equal(ui.state().loadout.hero,'astrologer');
 ui.get('library-tabs').children[5].onclick();
 const star=ui.get('resource-cards').children.at(-1).children[1].children.at(-1);
 assert.equal(star.disabled,false); star.onclick();
 const restored=setup(ui.stored());
 assert.equal(restored.state().experience,xp);
 assert.equal(restored.state().loadout.hero,'astrologer');
 assert.equal(restored.state().loadout.gear,'star');
});
