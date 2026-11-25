(() => {
  'use strict';
  const puzzles = JSON.parse(document.getElementById('puzzle-data').textContent);
  const $ = id => document.getElementById(id);
  const KEY = 'sudoku-journey-v1';
  let saved = {}, storageOK = true;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {}; }
  catch { storageOK = false; }
  const requestedView = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(globalThis.location?.search || '').get('view') : null;
  let view = saved.view === 'battle' ? 'battle' : 'challenge';
  const adventure = globalThis.SudokuAdventure;
  let experience = Number.isSafeInteger(saved.experience) && saved.experience >= 0 ? Math.min(saved.experience, 1000000) : 0;
  let soundOn = saved.soundOn === true, audioContext;
  const resources = globalThis.SudokuResources;
  const loadout = {hero:'warden', pet:'fox', map:'forest', gear:'none', ...saved.loadout};
  if(resources) for(const [key, group] of [['hero','heroes'],['pet','pets'],['map','maps'],['gear','equipment']]) { if(!resources[group].some(r => r.id === loadout[key])) loadout[key] = resources[group][0].id; }
  const seen = new Set(Array.isArray(saved.seen) ? saved.seen.filter(p => typeof p === 'string' && /^[0-9]{81}$/.test(p)) : []);
  let level = 0, selected = 0, noteMode = false, history = [], hint = null, stage = 0, busy = false, revision = 0;
  let battle = null, lastTick = performance.now();
  const fresh = p => ({battle: null, battleWon: false, battleVictory: false,profile: p.profile || null, puzzle: p.puzzle, board: [...p.puzzle].map(Number), notes: Array.from({length: 81}, () => []), assisted: false, revealed: false, done: false, best: null});
  const states = puzzles.map(p => {
    const s = saved[p.id], initialPuzzle = p.puzzle;
    // Restore the original fixed puzzle for older saves that omitted the board layout.
    const legacy = JSON.parse(document.getElementById('legacy-puzzles').textContent || '[]').find(item => item.id === p.id);
    if (s && typeof s.puzzle === 'string' && /^[0-9]{81}$/.test(s.puzzle)) p.puzzle = s.puzzle;
    else if (s && legacy) p.puzzle = legacy.puzzle;
    if (s && p.puzzle !== initialPuzzle) p.profile = null;
    const base = fresh(p);
    if (!s || !Array.isArray(s.board) || s.board.length !== 81 || s.board.some((v, i) => !Number.isInteger(v) || v < 0 || v > 9 || (base.board[i] && v !== base.board[i]))) return base;
    // Refresh cached display labels from older saves while keeping puzzle and battle progress.
    const profile = saved.profileLanguage === 'en' ? s.profile || base.profile : base.profile;
    return {...base, battle: s.battle || null, battleWon: s.battleWon === true, battleVictory: s.battleVictory === true, profile, board: s.board, notes: base.notes.map((_, i) => Array.isArray(s.notes?.[i]) ? [...new Set(s.notes[i].filter(v => Number.isInteger(v) && v >= 1 && v <= 9))] : []), assisted: s.assisted === true, revealed: s.revealed === true, done: s.done === true, best: ['solo', 'help'].includes(s.best) ? s.best : null};
  });
  const current = () => states[level];
  const cleared = () => puzzles.filter((p,i) => states[i].battleWon).map(p => p.id);
  const owns = (group,id) => !adventure || adventure.owns(group,id,cleared());
  if(resources) for(const [slot,group] of [['hero','heroes'],['pet','pets'],['gear','equipment']]) { if(!owns(group,loadout[slot])) loadout[slot] = resources[group][0].id; }
  const mission = () => adventure?.stages[level];
  const unlocked = i => i === 0 || (i >= 3 ? states[i - 1].battleWon : Boolean(states[i - 1].best));
  const chapterIndex = () => Math.floor(level / 3);
  const chapter = () => adventure.chapters[chapterIndex()];
  const growth = () => adventure.growth(experience, cleared());
  const rank = () => growth().level;
  const gear = () => resources.equipment.find(g => g.id === loadout.gear) || resources.equipment[0];
  function persist() {
    current().battle = battle?.snapshot() || null;
    try { localStorage.setItem(KEY, JSON.stringify({...Object.fromEntries(puzzles.map((p, i) => [p.id, states[i]])), active: puzzles[level].id, profileLanguage: 'en', view, soundOn, experience, loadout, seen: [...seen]})); }
    catch { storageOK = false; }
    if (!storageOK) $('save-note').textContent = 'Unable to save progress. Closing this page may discard your moves.';
  }
  function message(text, kind = 'info') { $('game-message').textContent = text; $('game-message').className = `feedback ${kind}`; }
  function map() {
    $('levels').replaceChildren();
    puzzles.forEach((p, i) => {
      if(Math.floor(i/3) !== chapterIndex()) return;
      const b = document.createElement('button'); b.className = 'level'; b.disabled = !unlocked(i) || busy;
      b.setAttribute('aria-current', i === level ? 'step' : 'false');
      b.append(`${i % 3 + 1}. ${adventure?.stages[i].name || p.title}`);
      const label = document.createElement('small');
      label.textContent = !unlocked(i) ? 'Locked' : states[i].battleWon ? '✓ Cleared' : states[i].best ? '✓ Cleared · Replay' : states[i].revealed ? 'Solution seen · Retry' : `${p.difficulty} · Ready`;
      b.append(label); b.onclick = () => open(i); $('levels').append(b);
    });
    const count = states.slice(chapterIndex()*3,chapterIndex()*3+3).filter(s => s.battleWon || s.best).length;
    $('progress').textContent = `${count} / 3`;
    $('progress-bar').value = count;
    $('chapter-label').textContent = chapter().label; $('chapter-title').textContent = chapter().name;
    adventure.chapters.forEach((c, i) => {
      const available = i === 0 || states[i * 3 - 1].battleWon;
      $(c.button).setAttribute('aria-pressed', String(chapterIndex() === i));
      $(c.button).disabled = busy || !available;
      $(c.button).textContent = available ? c.label : `${c.label} · Locked`;
    });
    $('next').hidden = !current().best || level === puzzles.length - 1;
  }
  const inputs = [];
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div'); cell.className = 'play-cell';
    const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'none'; input.maxLength = 1; input.autocomplete = 'off';
    input.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}`);
    const notes = document.createElement('div'); notes.className = 'cell-notes'; notes.setAttribute('aria-hidden', 'true');
    input.onfocus = () => { selected = i; draw(); input.select(); };
    input.oninput = () => { const v = input.value; if (/^[1-9]?$/.test(v)) enter(Number(v)); else message('Enter a digit from 1 to 9.', 'error'); draw(); };
    input.onkeydown = e => {
      const row = Math.floor(i / 9), col = i % 9;
      const target = {ArrowUp: row ? i - 9 : i, ArrowDown: row < 8 ? i + 9 : i, ArrowLeft: col ? i - 1 : i, ArrowRight: col < 8 ? i + 1 : i}[e.key];
      if (target !== undefined) { e.preventDefault(); inputs[target].focus(); }
      else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); enter(Number(e.key)); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); enter(0); }
    };
    cell.append(input, notes); $('board').append(cell); inputs.push(input);
  }
  function draw() {
    const s = current();
    inputs.forEach((input, i) => {
      const given = puzzles[level].puzzle[i] !== '0';
      input.value = s.board[i] || ''; input.readOnly = given || s.done || s.revealed || busy || Boolean(!battle || (battle && (battle.status !== 'active' || battle.credited.has(i))));
      input.parentElement.classList.toggle('battle-locked', Boolean(battle?.credited.has(i)));
      input.parentElement.classList.toggle('given', given);
      input.parentElement.classList.toggle('selected', i === selected);
      input.parentElement.classList.toggle('hint-target', hint?.index === i);
      input.setAttribute('aria-description', given ? 'Given clue' : s.notes[i].length && !s.board[i] ? `Notes: ${s.notes[i].join(', ')}` : 'Editable cell');
      const notes = input.nextElementSibling; notes.replaceChildren();
      for (let n = 1; n <= 9; n++) { const span = document.createElement('span'); span.textContent = !s.board[i] && s.notes[i].includes(n) ? n : ''; notes.append(span); }
    });
    renderProfile();
    $('undo').disabled = busy || !history.length || s.done || s.revealed || Boolean(battle) || view === 'battle';
    for (const id of ['hint', 'check', 'answer', 'apply-hint']) $(id).disabled = busy || s.done || s.revealed || Boolean(battle) || view === 'battle';
    for (const id of ['erase', 'notes']) $(id).disabled = busy || s.done || s.revealed || Boolean(!battle || (battle && battle.status !== 'active'));
    $('restart').disabled = busy; $('next').disabled = busy;
    document.querySelectorAll('#keypad button').forEach(b => { b.disabled = busy || s.done || s.revealed || Boolean(!battle || (battle && battle.status !== 'active')); });
    renderView(); renderBattle();
  }
  function renderProfile() {
    const s = current(), profile = s.profile;
    const order = ['Last empty cell', 'Naked single', 'Hidden single'];
    const techniques = profile?.techniques && typeof profile.techniques === 'object' ? Object.entries(profile.techniques).filter(([name, count]) => ['Last empty cell', 'Naked single', 'Hidden single'].includes(name) && Number.isInteger(count) && count > 0).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)) : [];
    $('skill-summary').textContent = profile ? `Puzzle: ${profile.difficulty} · ${techniques.map(([name]) => name).join(', ') || 'No empty cells'}${profile.difficulty !== puzzles[level].difficulty ? ' (saved puzzle; start a new puzzle for the current difficulty)' : ''}` : 'Analyzing puzzle techniques…';
    $('completion-panel').hidden = !s.done;
    if (s.done) {
      $('completion-title').textContent = s.battleVictory ? (mission()?.boss ? `${chapter().label} complete · ${chapter().badge}` : 'Victory') : s.assisted ? 'Cleared with hints' : 'Cleared without hints';
      $('victory-reward').textContent = s.battleVictory ? `${mission()?.reward || ''} · EXP +${battle?.earnedXP || 0} · Guardian Lv. ${rank()}` : 'Win this battle to earn the stage reward.';
      $('result-next').textContent = level === puzzles.length - 1 ? 'Back to map · Play again' : !unlocked(level+1) ? 'Retry to unlock the next stage' : ((level + 1) % 3 === 0 ? `On to ${adventure.chapters[Math.floor((level + 1) / 3)].label} →` : 'Next stage →');
      $('completion-skills').textContent = techniques.map(([name, count]) => `${name}: ${count} ${count === 1 ? 'step' : 'steps'}`).join(' · ') || 'Puzzle complete.';
    }
  }
  async function loadProfile() {
    const data = await api('profile');
    if (data?.profile) { current().profile = data.profile; persist(); renderProfile(); }
    else $('skill-summary').textContent = 'Technique analysis is unavailable. You can keep playing.';
  }
  function clearHint() {
    hint = null; stage = 0; $('hint-text').textContent = ''; $('hint').textContent = 'Hint'; $('apply-hint').hidden = true;
    inputs.forEach(input => { input.parentElement.classList.remove('error'); input.setAttribute('aria-invalid', 'false'); });
  }
  function open(i) {
    if (busy || !unlocked(i)) return;
    if (battle) { battle.pause(); persist(); }
    seen.add(puzzles[i].puzzle);
    level = i; battle = SudokuBattle.restore(current().battle); lastTick = performance.now(); selected = puzzles[i].puzzle.indexOf('0'); history = []; revision++; clearHint();
    $('difficulty').textContent = puzzles[i].difficulty; $('level-title').textContent = adventure?.stages[i].name || puzzles[i].title; $('level-goal').textContent = puzzles[i].goal;
    $('level-number').textContent = `${i + 1} / ${puzzles.length}`; $('answer-panel').hidden = true;
    message(current().revealed ? 'You viewed the solution. Start a new attempt to clear this stage.' : current().done ? 'Stage complete! Continue to the next stage or play again.' : 'Select a cell. Use the arrow keys to move and the number keys to fill it.');
    if(mission()) loadout.map = mission().map;
    map(); draw(); persist();
    if (battle) battleMessage(battle.status === 'paused' ? 'Paused' : battle.status === 'lost' ? 'Defeat' : 'Victory');
    if (!current().profile) loadProfile();
  }
  function snapshot() { history.push({board: [...current().board], notes: current().notes.map(n => [...n])}); if (history.length > 100) history.shift(); }
  function enter(value) {
    const s = current();
    if (busy || s.done || s.revealed || puzzles[level].puzzle[selected] !== '0' || !battle || (battle && (battle.status !== 'active' || battle.credited.has(selected)))) return;
    if (battle && !noteMode && value) { strike(selected, value); return; }
    snapshot();
    if (noteMode && value) { if (s.board[selected]) { history.pop(); return; } const ns = s.notes[selected]; s.notes[selected] = ns.includes(value) ? ns.filter(n => n !== value) : [...ns, value].sort(); }
    else { s.board[selected] = value; s.notes[selected] = []; }
    revision++; clearHint(); persist(); draw(); message('Entry updated.');
    if (s.board.every(Boolean)) check();
  }
  async function api(action, extra = {}) {
    if (busy) return null;
    busy = true; map(); draw(); const rev = revision;
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`/api/play/${puzzles[level].id}/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({board: current().board, puzzle: current().puzzle, ...extra}), signal: controller.signal});
      const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Request failed');
      return rev === revision ? data : null;
    } catch (e) { message(e.name === 'AbortError' ? 'Connection timed out. Your entries are safe. Please try again.' : `Could not finish the request: ${e.message}. Your entries are safe.`, 'error'); return null; }
    finally { clearTimeout(timer); lastTick = performance.now(); busy = false; map(); draw(); }
  }
  function handle(data) {
    if (!data) return false;
    if (data.status === 'errors') {
      for (const i of data.errors) { inputs[i].parentElement.classList.add('error'); inputs[i].setAttribute('aria-invalid', 'true'); }
      message(data.message, 'error'); return false;
    }
    if (data.status === 'complete') {
      const s = current(); s.done = true; if (data.profile) s.profile = data.profile;
      if (!s.revealed) { const result = s.assisted ? 'help' : 'solo'; if (s.best !== 'solo') s.best = result; }
      persist(); map(); draw();
      message(level === puzzles.length - 1 ? `All chapters complete! You earned the ${chapter().badge} badge.` : 'Challenge complete! Next stage unlocked.', 'success'); return false;
    }
    return true;
  }
  async function check() { clearHint(); const data = await api('check'); if (handle(data)) message(data.message, 'success'); }
  for (let n = 1; n <= 9; n++) { const b = document.createElement('button'); b.textContent = n; b.setAttribute('aria-label', `Enter ${n}`); b.onclick = () => enter(n); $('keypad').append(b); }
  $('notes').onclick = () => { noteMode = !noteMode; $('notes').textContent = 'Notes'; $('notes').setAttribute('aria-pressed', String(noteMode)); };
  $('erase').onclick = () => enter(0);
  $('undo').onclick = () => { if (busy || battle || !history.length || current().done || current().revealed) return; Object.assign(current(), history.pop()); revision++; clearHint(); persist(); draw(); message('Last move undone.'); };
  $('check').onclick = async () => { current().assisted = true; persist(); await check(); };
  $('hint').onclick = async () => {
    if (!hint) { const data = await api('hint'); if (!handle(data)) return; if (!data.hint) { message(data.message); return; } hint = data.hint; stage = 0; current().assisted = true; persist(); }
    $('hint-text').textContent = `${hint.technique} · ${hint.stages[stage]}`;
    $('hint').textContent = stage < 2 ? 'Next hint' : 'Full hint'; $('apply-hint').hidden = stage < 2;
    stage = Math.min(2, stage + 1); draw();
  };
  $('apply-hint').onclick = () => { if (!hint) return; selected = hint.index; const value = hint.value; const wasNotes = noteMode; noteMode = false; enter(value); noteMode = wasNotes; };
  $('answer').onclick = async () => {
    if (!window.confirm('Revealing the solution means this attempt will not count as a clear. Reveal it?')) return;
    const data = await api('answer'); if (!data) return;
    current().revealed = true; persist(); clearHint(); $('answer-board').replaceChildren();
    data.answer.forEach((v, i) => { const span = document.createElement('span'); span.textContent = v; span.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}: ${v}`); $('answer-board').append(span); });
    $('answer-panel').hidden = false; message('Solution revealed. Try this stage again when you are ready.'); map(); draw();
  };
  async function newPuzzle(ask = true) {
    if (busy) return;
    if (battle?.status === 'active') pauseBattle();
    if (ask && !window.confirm('Start a new puzzle? Your entries and notes will be cleared. Cleared stages will be kept.')) return false;
    // Keep every previous puzzle and request another if a candidate is a duplicate.
    for (let attempt = 0; attempt < 8; attempt++) {
      const data = await api('new');
      if (!data) return;
      if (!/^[0-9]{81}$/.test(data.puzzle) || seen.has(data.puzzle)) continue;
      const best = current().best, battleWon = current().battleWon;
      battle = null;
      puzzles[level].puzzle = data.puzzle;
      puzzles[level].profile = data.profile || null;
      states[level] = {...fresh(puzzles[level]), best, battleWon};
      open(level); message('Your new puzzle is ready!'); return true;
    }
    message('Could not find a new puzzle. Your entries are safe. Please try again.', 'error');
  }
  $('restart').onclick = () => newPuzzle();

  function renderView() {
    $('app-shell').classList.toggle('mode-battle', view === 'battle');
    $('app-shell').classList.toggle('mode-challenge', view === 'challenge');
    $('preparation').hidden = view !== 'challenge';
    $('game-panel').hidden = view !== 'battle';
    $('nav-challenge').hidden = view === 'challenge';
    $('sound-toggle').textContent = soundOn ? 'Sound on' : 'Sound off';
    $('sound-toggle').setAttribute('aria-pressed',String(soundOn));
    if(resources && mission()) {
      const hero = resources.heroes.find(h => h.id === loadout.hero), pet = resources.pets.find(p => p.id === loadout.pet);
      $('stage-title').textContent = mission().name; $('stage-intro').textContent = mission().intro;
      $('prep-hero').src = hero.art; $('prep-pet').src = pet.art;
      $('party-name').textContent = `${hero.name} Lv.${rank()} · ${pet.name}`;
      $('prep-chapter').textContent = `${chapter().label} · Battle prep`;
      const stats = SudokuBattle.stats({loadout,rank:rank(),seconds:mission().seconds});
      $('party-stats').textContent = `♥ ${stats.maxHP} · ATK ${stats.attack} · DEF ${stats.defense} · ${stats.seconds}s · Knockback ${stats.knockback}%`;
      $('party-stats').title = 'Gear adds to base stats. Each level adds 2 ATK and 1 second (up to 5 extra seconds). Gain 1 DEF every two levels and 1 HP every four.';
      $('party-growth').textContent = `${gear().name} · ${growth().next ? `EXP ${experience} / ${growth().next}` : 'Lv.10 MAX'}`;
      $('stage-reward').textContent = current().battleWon ? '✓ Reward claimed' : mission().reward;
      $('chapter-badge').hidden = !states[chapterIndex()*3+2].battleWon;
      $('chapter-badge').textContent = `✧ ${chapter().badge} · ${chapter().label} complete`;
    }
    $('enter-stage').disabled = busy;
    $('enter-stage').textContent = battle?.status === 'paused' ? 'Return to battle →' : current().done || battle?.status === 'lost' || current().revealed ? 'New challenge →' : 'Enter battle →';
    $('nav-game').setAttribute('aria-pressed','true');
    $('nav-challenge').disabled = busy; $('nav-game').disabled = busy;
    $('view-label').textContent = 'Game';
    $('board-cover').hidden = current().done || view !== 'battle' || Boolean(battle && battle.status !== 'paused');
    $('board-cover').setAttribute('aria-label', battle?.status === 'paused' ? 'Paused. Select Resume to continue.' : 'Select Start battle to enter a digit');
    $('board-cover').querySelector?.('strong')?.replaceChildren(battle?.status === 'paused' ? 'Paused' : 'Ready for battle');
  }
  function setView(next) {
    if (busy) return;
    if (next === 'challenge') battle?.pause();
    view = next; lastTick = performance.now();
    persist(); draw();
  }
  $('nav-challenge').onclick = () => setView('challenge');
  $('nav-game').onclick = () => setView(battle && ['active','paused'].includes(battle.status) ? 'battle' : 'challenge');
  $('enter-stage').onclick = async () => {
    if(busy) return;
    if(current().done || current().revealed || battle?.status === 'lost') { if(!await newPuzzle(false)) return; }
    setView('battle');
  };
  adventure.chapters.forEach((c, i) => {
    $(c.button).onclick = () => { if(!busy && (i === 0 || states[i * 3 - 1].battleWon)) open(i * 3); };
  });
  $('configure-party').onclick = () => $('nav-library').onclick();
  $('sound-toggle').onclick = () => { soundOn = !soundOn; playSound('attack'); persist(); draw(); };
  function playSound(event) {
    if(!soundOn || !window.AudioContext) return;
    try {
      audioContext ||= new window.AudioContext(); audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.type = ['hurt','lost'].includes(event) ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime({attack:660,defeated:880,won:1046,hurt:150,lost:90,advance:220}[event] || 440,now);
      gain.gain.setValueAtTime(.07,now); gain.gain.exponentialRampToValueAtTime(.001,now+.22);
      oscillator.start(now); oscillator.stop(now+.23);
    } catch { /* Play continues if audio is unavailable. */ }
  }
  function battleMessage(text) { $('battle-status').textContent = text; }
  function renderBattle() {
    if(resources) {
      const equipment = battle?.loadout || loadout;
      const hero = resources.heroes.find(r => r.id === equipment.hero) || resources.heroes[0];
      const pet = resources.pets.find(r => r.id === equipment.pet) || resources.pets[0];
      const map = resources.maps.find(r => r.id === (mission()?.map || equipment.map)) || resources.maps[0];
      const enemy = battle?.monster().id ? battle.monster() : resources.monsters.find(r => r.id === (mission()?.monsters[0] || map.monsters[0]));
      $('battle-monster').classList.toggle('boss-monster', Boolean(battle?.bossActive));
      $('battle-arena').classList.toggle('boss-enraged', Boolean(battle?.enraged()));
      $('hero-art').src = hero.art; $('hero-name').textContent = `${hero.name} Lv.${battle?.rank || rank()}`;
      $('monster-art').src = enemy.art; $('monster-name').textContent = enemy.name + (battle?.enraged() ? ' · Enraged' : '');
      $('pet-art').src = pet.art; $('pet-art').alt = pet.name;
      $('stage-zone').style.backgroundImage = `url("${map.art}")`;
      $('world-name').textContent = map.name; $('arena-name').textContent = map.name;
      const skill = resources.skills.find(s => s.id === pet.skill);
      $('pet-skill').textContent = battle?.petCooldown > 0 ? `${skill.name} · ${battle.petCooldown} ${battle.petCooldown === 1 ? 'cell' : 'cells'}` : battle?.skillUsed ? 'Skill used' : skill.name;
      $('pet-skill').hidden = !battle;
      $('pet-skill').disabled = busy || battle?.status !== 'active' || battle?.skillUsed || battle?.petCooldown > 0 || battle?.bossDefeated || (pet.skill === 'heal' && battle?.hp === battle?.maxHP);
    }
    $('hero-skill').title = `Solve 3 cells to charge. Your next hit deals ×${battle?.powerMultiplier?.() || 1.8} damage and you gain one shield.`;
    $('hero-skill').hidden = battle?.rulesVersion !== 2;
    $('hero-skill').textContent = battle?.empowered ? 'Power strike ready' : `Power strike ${battle?.energy || 0}/3`;
    $('hero-skill').disabled = busy || battle?.status !== 'active' || battle?.energy < 3 || battle?.empowered || battle?.bossDefeated;
    $('battle-rpg').textContent = battle?.rulesVersion === 2 ? `ATK ${battle.stats().attack} · DEF ${battle.stats().defense}${battle.shield ? ' · Shield' : ''}` : '';
    $('battle-combo').textContent = battle?.combo >= 2 ? `${battle.combo} COMBO` : '';
    $('battle-start').hidden = Boolean(battle);
    $('battle-start').disabled = busy || current().done || current().revealed;
    $('battle-content').hidden = false;
    $('battle-pause').hidden = !battle || ['won','lost'].includes(battle.status); $('battle-exit').hidden = !battle || ['won','lost'].includes(battle.status);
    $('battle-retry').hidden = battle?.status !== 'lost'; $('battle-retry').disabled = busy;
    $('game-panel').classList.toggle('battle-playing', Boolean(battle));
    $('game-panel').classList.toggle('battle-paused', battle?.status === 'paused');
    const preview = SudokuBattle.stats({loadout,rank:rank(),seconds:mission().seconds});
    const maxHP = battle?.maxHP || preview.maxHP, hp = battle?.hp ?? maxHP;
    $('battle-hearts').textContent = '♥'.repeat(hp) + '♡'.repeat(maxHP - hp);
    $('battle-hearts').setAttribute('aria-label', `Player health: ${hp} of ${maxHP}`);
    $('battle-enemy-hp').textContent = battle?.bossDefeated ? 'Defeated' : battle ? `HP ${battle.enemyHP}${battle.enemyMaxHP ? ` / ${battle.enemyMaxHP}` : ''}` : `HP ${resources?.monsters.find(m => m.id === mission()?.monsters[0])?.vitality || 30}`;
    $('battle-monster').style.left = `${(battle?.bossActive ? 47 : 56) - (battle?.distance || 0) * (battle?.bossActive ? .31 : .4)}%`;
    $('battle-monster').style.opacity = battle?.status === 'won' || battle?.bossDefeated ? '0' : '1';
    $('battle-timer').max = battle?.seconds || preview.seconds;
    $('battle-timer').value = battle?.time ?? $('battle-timer').max;
    $('battle-clock-label').textContent = battle?.bossDefeated ? '—' : `${Math.ceil(battle?.time ?? $('battle-timer').max)}s`;
    $('battle-pause').textContent = battle?.status === 'paused' ? 'Resume' : 'Pause';
    $('battle-pause').disabled = busy || !['active', 'paused'].includes(battle?.status);
    $('battle-exit').disabled = busy;
    $('battle-overlay').hidden = !battle || battle.status === 'active';
    $('battle-overlay').textContent = {paused: 'Pause', lost: 'Defeat', won: 'Victory'}[battle?.status] || '';
    if (!battle) battleMessage(current().done ? 'Cleared · Play a new puzzle' : current().revealed ? 'Retry with a new puzzle' : '');
  }
  function animateBattle(event) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (['attack', 'defeated', 'won', 'boss-arrival', 'boss-defeated'].includes(event)) {
      $('battle-hero').animate?.([{transform: 'translateX(0)'}, {transform: 'translateX(10px)'}, {transform: 'translateX(0)'}], {duration: 320});
      $('battle-bolt').animate?.([{left: '24%', opacity: 0}, {left: '30%', opacity: 1, offset: .2}, {left: `${56 - battle.distance * .4}%`, opacity: 1, offset: .8}, {opacity: 0}], {duration: 440});
      $('battle-monster').animate?.([{filter: 'brightness(1)'}, {filter: 'brightness(2.5)', transform: 'scale(.8)'}, {filter: 'brightness(1)', transform: 'scale(1)'}], {duration: 480});
    } else if (['hurt', 'lost'].includes(event)) {
      $('battle-monster').animate?.([{left: $('battle-monster').style.left}, {left: '16%', offset: .5}, {left: '56%'}], {duration: 900});
      $('battle-hero').animate?.([{opacity: 1, transform: 'translateX(0)'}, {opacity: .2, transform: 'translateX(-8px)'}, {opacity: 1, transform: 'translateX(0)'}], {duration: 450, iterations: 2});
      $('battle-arena').animate?.([{filter: 'none'}, {filter: 'sepia(1) saturate(3)'}, {filter: 'none'}], {duration: 450});
    }
  }
  function battleEvent(event, wrong = false) {
    if (!event) return;
    const text = {attack: `Hit −${battle.lastDamage || 1}`, defeated: 'Enemy defeated!', won: 'Victory', hurt: `Hit taken −${battle.lastHurt || 1} ♥`, lost: 'Defeat', advance: wrong ? 'Monster charging!' : 'Monster approaching…', blocked:'Shield blocked the hit', 'boss-arrival':'Boss incoming!', 'boss-defeated':'Boss defeated · Finish the puzzle', solve:'Keep solving', mistake:'Try another digit'};
    if(battle.rulesVersion === 2 && ['attack','defeated','won','boss-arrival','boss-defeated'].includes(event) && battle.lastDamage) {
      $('damage-number').textContent = `${battle.lastCritical ? 'Critical ' : ''}−${battle.lastDamage}`;
      $('damage-number').classList.toggle('critical',battle.lastCritical);
      if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) $('damage-number').animate?.([{opacity:1,transform:'translateY(0) scale(1.2)'},{opacity:0,transform:'translateY(-45px) scale(1)'}],{duration:1100});
    }
    battleMessage(text[event]); animateBattle(event); playSound(event);
  }
  async function strike(index, value) {
    const s = current(), previous = s.board[index];
    const submitted = [...s.board]; submitted[index] = value;
    const data = await api('strike', {index, board: submitted});
    // Network errors must not cost health, save unverified moves, or advance the enemy.
    if (!data) { s.board[index] = previous; persist(); draw(); return; }
    if (data.correct) {
      s.board[index] = value;
      s.notes[index] = []; revision++; clearHint();
      // Hiding the tab pauses combat. An in-flight answer still resolves exactly once.
      const wasPaused = battle.status === 'paused';
      if (wasPaused) battle.resume();
      const event = battle.correct(index);
      if (wasPaused) battle.pause();
      battleEvent(event);
      if (data.complete && battle.status === 'won') {
        if(!s.battleVictory) experience = Math.min(1000000, experience + (battle.earnedXP || 0));
        s.battleWon = true; s.battleVictory = true;
        handle({status: 'complete', profile: data.profile});
      } else message('Correct! Find the next cell.', 'success');
    } else {
      s.board[index] = previous;
      const wasPaused = battle.status === 'paused';
      if (wasPaused) battle.resume();
      battleEvent(battle.wrong(), true);
      if (wasPaused) battle.pause();
      message('Incorrect digit removed. Try again.', 'error');
    }
    persist(); map(); draw();
  }
  $('battle-start').onclick = async () => {
    if (busy || battle || current().done || current().revealed) return;
    setView('battle');
    current().assisted = true; persist();
    const data = await api('check');
    if (!handle(data)) return;
    const s = current();
    battle = new SudokuBattle({remaining: s.board.filter(v => !v).length, stageId: mission()?.id || null, rank:rank(), loadout: resources ? {...loadout} : null, seconds: mission()?.seconds || [20, 30, 45][level], credited: s.board.flatMap((v, i) => v ? [i] : [])});
    s.assisted = true; history = []; clearHint(); lastTick = performance.now();
    battleMessage('Battle started');
    persist(); draw();
  };
  $('hero-skill').onclick = () => {
    if(busy || !battle?.usePower?.()) return;
    battleMessage(`Charged · Next hit ×${battle.powerMultiplier()} · Shield +1`); persist(); draw();
  };
  $('battle-pause').onclick = () => {
    if (!battle || busy) return;
    if (battle.status === 'active') battle.pause(); else battle.resume();
    lastTick = performance.now(); persist(); draw();
    battleMessage(battle.status === 'paused' ? 'Paused' : '');
  };
  $('battle-exit').onclick = async () => {
    if (!battle || busy) return;
    if(!window.confirm('Retreat? This battle will end and your next attempt will use a new puzzle.')) return;
    battle.pause(); persist(); draw();
    if(await newPuzzle(false)) setView('challenge');
  };
  $('battle-retry').onclick = async () => { if(await newPuzzle(false)) setView('battle'); };
  const pauseBattle = () => {
    if (battle?.status === 'active') { battle.pause(); persist(); draw(); battleMessage('Paused'); }
    lastTick = performance.now();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseBattle(); });
  window.addEventListener('pagehide', pauseBattle);
  setInterval(() => {
    const now = performance.now(), elapsed = (now - lastTick) / 1000; lastTick = now;
    if (!battle || battle.status !== 'active' || busy || document.hidden) return;
    const before = Math.ceil(battle.time), events = battle.tick(elapsed);
    for (const event of events) battleEvent(event);
    if (events.length || before !== Math.ceil(battle.time)) { persist(); renderBattle(); }
    if (battle.status === 'lost') draw();
  }, 250);
  if(resources) {
    $('pet-skill').onclick = () => {
      if(busy || !battle?.useSkill()) return;
      battleMessage('Companion skill activated!');
      $('pet-art').animate?.([{transform:'translateY(0)'},{transform:'translateY(-25px)',filter:'brightness(2)'},{transform:'translateY(0)'}],{duration:600});
      persist(); draw();
    };
    globalThis.mountSudokuLibrary({resources, loadout, owns, rank, cleared, adventure, requirement: adventure.requirement,
      open: () => { if(busy) return false; pauseBattle(); return true; },
      locked: () => Boolean(battle && ['active','paused'].includes(battle.status)),
      save: () => { persist(); draw(); }
    });
  }
  $('next').onclick = async () => {
    if(busy) return;
    if(level < puzzles.length - 1 && !unlocked(level+1)) { if(await newPuzzle(false)) setView('battle'); return; }
    if(level < puzzles.length - 1) open(level+1);
    setView('challenge');
  };
  $('result-next').onclick = () => $('next').onclick();
  const resume = puzzles.findIndex(p => p.id === saved.active);
  open(resume >= 0 && unlocked(resume) ? resume : 0);
  if(!battle || requestedView === 'challenge') setView('challenge');
  if(requestedView === 'library' && resources) $('nav-library').onclick();
})();
