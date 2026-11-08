// 舊戰鬥保留原規則；新戰鬥使用有版本的 RPG 存檔。
(function(root) {
  'use strict';
  const LegacyBattle = root.SudokuBattle;
  class RPGBattle extends LegacyBattle {
    static stats({loadout, rank = 1, seconds = 30}) {
      const hero = root.SudokuResources.heroes.find(h => h.id === loadout?.hero) || root.SudokuResources.heroes[0];
      const gear = root.SudokuResources.equipment.find(g => g.id === loadout?.gear) || {};
      return {attack:hero.attack + (rank - 1)*2 + (gear.attack || 0),
        defense:hero.defense + Math.floor((rank - 1)/2) + (gear.defense || 0),
        maxHP:3 + Math.floor((rank - 1)/4) + (gear.hp || 0),
        seconds:seconds + (hero.timeBonus || 0) + Math.min(5, rank - 1) + (gear.seconds || 0),
        knockback:hero.knockback + (rank - 1)*2 + (gear.knockback || 0)};
    }
    constructor(options) {
      super(options);
      this.rulesVersion = 2;
      this.rank = Math.max(1, Math.min(10, Math.trunc(options.rank || 1)));
      const stats = RPGBattle.stats({...options, rank:this.rank, seconds:this.baseSeconds});
      this.maxHP = stats.maxHP; this.hp = stats.maxHP;
      this.seconds = stats.seconds; this.time = this.seconds;
      this.combo = 0; this.bestCombo = 0; this.energy = 0; this.empowered = false;
      this.petCooldown = 0; this.shield = 0; this.bossDefeated = false;
      this.earnedXP = 0; this.lastDamage = 0; this.lastCritical = false; this.lastHurt = 0;
      this.enemyMaxHP = this.spawnHP(); this.enemyHP = this.enemyMaxHP;
    }
    stats() { return RPGBattle.stats({loadout:this.loadout, rank:this.rank, seconds:this.baseSeconds}); }
    spawnHP() { return this.monster().vitality || 30; }
    enraged() { return this.bossActive && !this.bossDefeated && this.enemyHP <= this.enemyMaxHP / 2; }
    powerMultiplier() { return this.hero().powerMultiplier || 1.8; }
    usePower() {
      if(this.status !== 'active' || this.energy < 3 || this.empowered || this.bossDefeated) return false;
      this.energy = 0; this.empowered = true; this.shield = 1; return true;
    }
    useSkill() {
      if(this.status !== 'active' || this.petCooldown > 0 || this.bossDefeated) return false;
      const pet = root.SudokuResources.pets.find(p => p.id === this.loadout?.pet);
      if(pet?.skill === 'heal') {
        if(this.hp >= this.maxHP) return false;
        this.hp = Math.min(this.maxHP, this.hp + (this.rank >= 5 ? 2 : 1));
      } else if(pet?.skill === 'rewind') { this.distance = 0; this.time = this.seconds; }
      else return false;
      this.petCooldown = 8; return true;
    }
    advance(amount) {
      if(this.bossDefeated) return null;
      this.distance += amount;
      if(this.distance < 100) return 'advance';
      this.distance = 0;
      if(this.shield) { this.shield = 0; this.lastHurt = 0; return 'blocked'; }
      this.lastHurt = Math.max(1, Math.ceil(((this.monster().attack || 10) + (this.enraged() ? 4 : 0) - this.stats().defense)/10));
      this.hp = Math.max(0, this.hp - this.lastHurt);
      if(!this.hp) { this.status = 'lost'; return 'lost'; }
      return 'hurt';
    }
    tick(elapsed) {
      if(this.bossDefeated) return [];
      const events = super.tick(elapsed);
      if(events.length) this.combo = 0;
      return events;
    }
    wrong() {
      if(this.status !== 'active') return null;
      this.combo = 0;
      return this.bossDefeated ? 'mistake' : super.wrong();
    }
    rewardKill() {
      this.defeated++;
      this.earnedXP += this.monster().xp || 10;
      if(this.bossActive) this.bossDefeated = true;
    }
    spawn() { this.enemyMaxHP = this.spawnHP(); this.enemyHP = this.enemyMaxHP; this.distance = 0; }
    correct(index) {
      if(this.status !== 'active' || !Number.isInteger(index) || index < 0 || index > 80 || this.credited.has(index) || this.remaining <= 0) return null;
      this.credited.add(index); this.remaining--;
      this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.petCooldown = Math.max(0, this.petCooldown - 1);
      this.energy = Math.min(3, this.energy + 1);
      this.time = this.seconds;
      this.lastCritical = this.combo % (this.hero().criticalEvery || 5) === 0;
      const multiplier = (1 + Math.min(5, this.combo - 1)*.05) * (this.lastCritical ? 1.5 : 1) * (this.empowered ? this.powerMultiplier() : 1);
      this.lastDamage = this.bossDefeated ? 0 : Math.max(1, Math.round(this.stats().attack * multiplier) - Math.max(0, (this.monster().defense || 0) - (this.hero().pierce || 0) - (this.gear().pierce || 0)));
      this.empowered = false;
      // 最後一格終結仍存活的敵人，不讓盤面完成後卡在戰鬥。
      if(!this.remaining && !this.bossDefeated) this.lastDamage = Math.max(this.lastDamage, this.enemyHP);
      this.enemyHP = Math.max(0, this.enemyHP - this.lastDamage);
      this.distance = Math.max(0, this.distance - this.knockback());
      let event = this.bossDefeated ? 'solve' : 'attack';
      if(!this.enemyHP && !this.bossDefeated) { this.rewardKill(); event = this.bossDefeated ? 'boss-defeated' : 'defeated'; }
      if(!this.remaining) { this.earnedXP += 40; this.status = 'won'; return 'won'; }
      if(this.stage()?.boss && !this.bossActive && this.remaining <= 6) { this.bossActive = true; this.spawn(); return 'boss-arrival'; }
      if(!this.enemyHP && !this.bossDefeated) this.spawn();
      return event;
    }
    snapshot() {
      const data = super.snapshot();
      for(const key of ['rulesVersion','combo','bestCombo','energy','empowered','petCooldown','shield','bossDefeated','earnedXP','enemyMaxHP','lastDamage','lastCritical','lastHurt']) data[key] = this[key];
      return data;
    }
    static restore(data) {
      if(!data || data.rulesVersion === undefined) return LegacyBattle.restore(data);
      if(data.rulesVersion !== 2) return null;
      const integer = (key, min, max) => Number.isInteger(data[key]) && data[key] >= min && data[key] <= max;
      if(!['active','paused','won','lost'].includes(data.status) || !integer('rank',1,10) || !integer('remaining',0,81) ||
        !integer('hp',0,6) || !integer('defeated',0,81) || !integer('enemyHP',0,1000) || !integer('enemyMaxHP',1,1000) ||
        !integer('combo',0,81) || !integer('bestCombo',data.combo,81) || !integer('energy',0,3) ||
        !integer('petCooldown',0,8) || !integer('shield',0,1) || !integer('earnedXP',0,10000) ||
        !integer('lastDamage',0,1000) || !integer('lastHurt',0,10) ||
        !['empowered','bossDefeated','bossActive','lastCritical'].every(k => typeof data[k] === 'boolean') ||
        ![20,30,45].includes(data.baseSeconds) || !Number.isFinite(data.time) || data.time < 0 ||
        !Number.isFinite(data.distance) || data.distance < 0 || data.distance >= 100 ||
        !Array.isArray(data.credited) || data.credited.some(i => !Number.isInteger(i) || i < 0 || i > 80) ||
        new Set(data.credited).size !== data.credited.length || data.credited.length + data.remaining > 81) return null;
      const resources = root.SudokuResources;
      if(!data.loadout || ![['hero','heroes'],['pet','pets'],['map','maps'],['gear','equipment']].every(([key,group]) => resources[group].some(r => r.id === data.loadout[key])) ||
        !root.SudokuAdventure.stages.some(s => s.id === data.stageId)) return null;
      const battle = new RPGBattle({...data, seconds:data.baseSeconds});
      if(data.maxHP !== battle.maxHP || data.hp > battle.maxHP || data.seconds !== battle.seconds || data.time > data.seconds ||
        data.enemyHP > data.enemyMaxHP || (data.bossDefeated && (!data.bossActive || data.enemyHP !== 0)) ||
        (data.status === 'won' && (data.remaining !== 0 || data.hp === 0)) ||
        (data.status === 'lost' && data.hp !== 0) ||
        (['active','paused'].includes(data.status) && (!data.remaining || !data.hp || (!data.enemyHP && !data.bossDefeated)))) return null;
      // 僅載入已知欄位，避免任意存檔屬性覆蓋方法。
      for(const key of Object.keys(battle.snapshot())) if(key !== 'credited') battle[key] = data[key];
      battle.credited = new Set(data.credited);
      if(battle.status === 'active') battle.pause();
      return battle;
    }
  }
  root.SudokuBattle = RPGBattle;
  if(typeof module !== 'undefined') module.exports = RPGBattle;
})(globalThis);
