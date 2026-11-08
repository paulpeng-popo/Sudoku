// 戰鬥規則獨立於畫面與計時器，方便測試與調整節奏。
(function (root) {
  'use strict';
  class SudokuBattle {
    constructor({remaining, seconds = 20, credited = [], loadout = null, stageId = null, rank = 1}) {
      this.stageId = stageId;
      this.bossActive = Boolean(this.stage()?.boss && remaining <= 6);
      this.loadout = loadout;
      this.rank = Number.isInteger(rank) ? Math.max(1, Math.min(4, rank)) : 1;
      this.maxHP = 3 + (this.gear().hp || 0);
      this.skillUsed = false;
      this.remaining = remaining;
      this.baseSeconds = seconds;
      this.seconds = seconds + (this.gear().seconds || 0);
      this.time = this.seconds;
      this.hp = this.maxHP;
      this.distance = 0;
      this.defeated = 0;
      this.enemyHP = this.spawnHP(remaining);
      this.status = 'active';
      this.credited = new Set(credited);
    }
    static restore(data) {
      if (!data || !['active', 'paused', 'won', 'lost'].includes(data.status) ||
          !Number.isInteger(data.remaining) || data.remaining < 0 || data.remaining > 81 ||
          !Number.isInteger(data.hp) || data.hp < 0 || data.hp > (data.maxHP || 3) ||
          (data.maxHP !== undefined && ![3,4].includes(data.maxHP)) ||
          (data.rank !== undefined && (!Number.isInteger(data.rank) || data.rank < 1 || data.rank > 4)) ||
          ![20,25,30,35,45,50].includes(data.seconds) || !Number.isFinite(data.time) || data.time < 0 || data.time > data.seconds ||
          !Number.isFinite(data.distance) || data.distance < 0 || data.distance >= 100 ||
          !Number.isInteger(data.enemyHP) || data.enemyHP < 0 || data.enemyHP > 6 ||
          !Number.isInteger(data.defeated) || data.defeated < 0 || data.defeated > 81 ||
          !Array.isArray(data.credited) || data.credited.some(i => !Number.isInteger(i) || i < 0 || i > 80)) return null;
      const battle = new SudokuBattle({...data,seconds:data.baseSeconds || data.seconds});
      Object.assign(battle, data, {credited: new Set(data.credited)});
      if (battle.status === 'active') battle.status = 'paused';
      return battle;
    }
    snapshot() {
      return {rank:this.rank,maxHP:this.maxHP,baseSeconds:this.baseSeconds,remaining: this.remaining, seconds: this.seconds, time: this.time, hp: this.hp, distance: this.distance,
        stageId: this.stageId, bossActive: this.bossActive, loadout: this.loadout, skillUsed: this.skillUsed, enemyHP: this.enemyHP, defeated: this.defeated, status: this.status, credited: [...this.credited]};
    }
    gear() { return root.SudokuResources?.equipment?.find(g => g.id === this.loadout?.gear) || {}; }
    knockback() { return this.hero().knockback + (this.rank - 1) * 2 + (this.gear().knockback || 0); }
    stage() { return root.SudokuAdventure?.stages.find(s => s.id === this.stageId); }
    spawnHP(remaining) {
      return Math.min(this.monster().hp, this.stage()?.boss && !this.bossActive ? Math.max(1, remaining - 6) : remaining);
    }
    enraged() { return this.bossActive && this.enemyHP <= 3; }
    hero() { return root.SudokuResources?.heroes.find(h => h.id === this.loadout?.hero) || {knockback:10}; }
    monster() {
      const resources = root.SudokuResources;
      const map = resources?.maps.find(m => m.id === this.loadout?.map);
      const pool = this.stage()?.monsters || map?.monsters;
      const id = this.bossActive ? this.stage()?.boss : pool?.[this.defeated % pool.length];
      return resources?.monsters.find(m => m.id === id) || {hp:3,step:20};
    }
    useSkill() {
      if(this.status !== 'active' || this.skillUsed) return false;
      const pet = root.SudokuResources?.pets.find(p => p.id === this.loadout?.pet);
      if(pet?.skill === 'heal') { if(this.hp >= this.maxHP) return false; this.hp++; }
      else if(pet?.skill === 'rewind') { this.distance = 0; this.time = this.seconds; }
      else return false;
      this.skillUsed = true; return true;
    }
    pause() { if (this.status === 'active') this.status = 'paused'; }
    resume() { if (this.status === 'paused') this.status = 'active'; }
    advance(amount) {
      this.distance += amount;
      if (this.distance < 100) return 'advance';
      this.distance = 0;
      this.hp--;
      if (this.hp <= 0) { this.status = 'lost'; return 'lost'; }
      return 'hurt';
    }
    tick(elapsed) {
      if (this.status !== 'active' || !Number.isFinite(elapsed) || elapsed <= 0) return [];
      const events = [];
      this.time -= elapsed;
      while (this.time <= 0 && this.status === 'active') {
        this.time += this.seconds;
        events.push(this.advance(this.enraged() ? (this.monster().rageStep || 40) : this.monster().step));
      }
      this.time = Math.max(0, this.time);
      return events;
    }
    wrong() { return this.status === 'active' ? this.advance(Math.max(0, (this.enraged() ? (this.monster().rageWrong || 50) : (this.monster().wrongStep || 40)) - (this.gear().resist || 0))) : null; }
    correct(index) {
      if (this.status !== 'active' || this.credited.has(index) || this.remaining <= 0) return null;
      this.credited.add(index);
      this.remaining--;
      this.enemyHP--;
      this.time = this.seconds;
      this.distance = Math.max(0, this.distance - this.knockback());
      if (this.remaining === 0) { this.defeated++; this.status = 'won'; return 'won'; }
      if (this.enemyHP === 0) {
        this.defeated++;
        if(this.stage()?.boss && this.remaining <= 6) this.bossActive = true;
        this.enemyHP = this.spawnHP(this.remaining);
        this.distance = 0;
        return 'defeated';
      }
      return 'attack';
    }
  }
  root.SudokuBattle = SudokuBattle;
  if (typeof module !== 'undefined') module.exports = SudokuBattle;
})(globalThis);
