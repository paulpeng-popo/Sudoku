// 遊戲資源表：ID 是存檔介面，新增資源請保留既有 ID。
(function(root) {
  const sprites = new Set(['warden','knight','fox','owl','bramble','wraith','sentinel','elder','dragon','ranger','astrologer','scarab','phoenix']);
  const art = name => sprites.has(name) ? `/static/art/anime/${name}.png` : `/static/art/${name}.svg`;
  root.SudokuResources = {
    heroes: [
      {id:'warden', name:'翠林守衛', art:art('warden'), skill:'repel', description:'持翡翠法杖、守護森林的冒險家。', knockback:10,attack:10,defense:2,timeBonus:3},
      {id:'knight', name:'星鎧騎士', art:art('knight'), skill:'force', description:'身披銀鎧、持星盾迎戰的騎士。', knockback:20,attack:13,defense:6},
      {id:'ranger',name:'逐風遊俠',art:art('ranger'),skill:'piercing',description:'循風而行，以精準箭矢洞穿護甲。',knockback:14,attack:11,defense:2,pierce:4,criticalEvery:4},
      {id:'astrologer',name:'星砂術士',art:art('astrologer'),skill:'starlight',description:'讀取星軌，將流沙凝成星芒。',knockback:8,attack:9,defense:3,timeBonus:6,powerMultiplier:2.4}
    ],
    equipment: [
      {id:'none',name:'不裝備',art:art('gear/none'),description:'不使用護符。'},
      {id:'rune',name:'衝擊符石',art:art('gear/rune'),description:'攻擊 +3、擊退 +8%。',knockback:8,attack:3},
      {id:'hourglass',name:'流砂時計',art:art('gear/hourglass'),description:'每次作答倒數增加 5 秒。',seconds:5},
      {id:'heart',name:'生命墜飾',art:art('gear/heart'),description:'生命上限增加 1 格。',hp:1},
      {id:'crystal',name:'寒晶護符',art:art('gear/crystal'),description:'防禦 +4，填錯突進距離 −15%。',resist:15,defense:4},
      {id:'star',name:'星芒墜飾',art:art('gear/star'),description:'攻擊 +2，無視敵人 3 點防禦。',attack:2,pierce:3}
    ],
    monsters: [
      {id:'scarab',name:'玄甲砂蟲',art:art('scarab'),skill:'sand-shell',description:'披覆古代甲殼、巡行砂海的守衛。',hp:5,vitality:58,defense:8,attack:15,xp:24,step:20,wrongStep:50},
      {id:'phoenix',name:'曜炎鳳凰',art:art('phoenix'),skill:'solar-rage',description:'守護星海盡頭的不滅炎翼。',hp:6,vitality:125,defense:7,attack:20,xp:120,step:30,rageStep:45,rageWrong:60},
      {id:'sentinel',name:'霜晶甲衛',art:art('sentinel'),skill:'shell',description:'守住冰霜入口的厚甲魔像。',hp:4,vitality:42,defense:5,attack:14,xp:16,step:15,wrongStep:60},
      {id:'dragon',name:'永冬巨龍',art:art('dragon'),skill:'blizzard',description:'凍結王座的冰晶巨龍。',hp:6,vitality:90,defense:6,attack:18,xp:80,step:30,rageStep:45,rageWrong:60},
      {id:'bramble', name:'荊棘石獸', art:art('bramble'), skill:'march', description:'苔蘚覆蓋的遠古石獸。', hp:3,vitality:30,defense:1,attack:10,xp:10, step:20},
      {id:'elder', name:'蝕月古樹王', art:art('elder'), skill:'rage', description:'盤踞遺跡之心的月蝕守護者。', hp:6,vitality:70,defense:3,attack:15,xp:60, step:25},
      {id:'wraith', name:'暮光幽靈', art:art('wraith'), skill:'rush', description:'徘徊在遺跡的迅捷幽靈。', hp:2,vitality:22,defense:0,attack:8,xp:12, step:30}
    ],
    pets: [
      {id:'fox', name:'燈火狐', art:art('fox'), skill:'heal', description:'尾巴藏著溫暖的治癒星火。'},
      {id:'owl', name:'月羽鴞', art:art('owl'), skill:'rewind', description:'能讓逼近的危險退回遠方。'}
    ],
    skills: [
      {id:'piercing',art:art('skills/piercing'),name:'穿風箭',description:'無視 4 點防禦，每第 4 次連擊必定暴擊。',kind:'遊俠 · 被動'},
      {id:'starlight',art:art('skills/starlight'),name:'星軌共鳴',description:'作答倒數 +6 秒，蓄力重擊倍率提升至 ×2.4。',kind:'術士 · 被動'},
      {id:'sand-shell',art:art('skills/sand-shell'),name:'玄甲突進',description:'防禦 8；逾時前進 20%，填錯前進 50%。',kind:'砂蟲 · 被動'},
      {id:'solar-rage',art:art('skills/solar-rage'),name:'曜炎風暴',description:'半血後逾時前進 45%，填錯前進 60%；平時分別為 30% 與 40%。',kind:'鳳凰 · 被動'},
      {id:'power',art:art('skills/power'),name:'蓄力重擊',description:'解開 3 格蓄滿能量。施放後下次傷害 ×1.8，並獲得一次護盾；護盾不疊加。',kind:'全角色 · 主動'},
      {id:'combo',art:art('skills/combo'),name:'連擊節奏',description:'連續命中每格增傷 5%，最高 25%；通常每第 5 擊暴擊 ×1.5；遊俠為第 4 擊。錯答或逾時中斷連擊。',kind:'全角色 · 被動'},
      {id:'shell',art:art('skills/shell'),name:'晶甲衝鋒',description:'逾時前進 15%；填錯會突進 60%。',kind:'晶甲衛 · 被動'},
      {id:'blizzard',art:art('skills/blizzard'),name:'永冬風暴',description:'半血後逾時前進 45%，填錯前進 60%；平時分別為 30% 與 40%。',kind:'巨龍 · 被動'},
      {id:'rage',art:art('skills/rage'),name:'月蝕狂怒',description:'半血後逾時前進 40%，填錯前進 50%；平時分別為 25% 與 40%。',kind:'古樹王 · 被動'},
      {id:'repel',art:art('skills/repel'),name:'符文衝擊', description:'基礎攻擊 10、防禦 2、倒數 +3 秒，命中擊退 10%。',kind:'守衛 · 被動'},
      {id:'force',art:art('skills/force'),name:'星盾重擊', description:'基礎攻擊 13、防禦 6，命中擊退 20%。',kind:'騎士 · 被動'},
      {id:'march',art:art('skills/march'),name:'沉重腳步',description:'每次逾時前進 20%；填錯前進 40%。',kind:'石獸 · 被動'},
      {id:'rush',art:art('skills/rush'),name:'幽影疾行',description:'每次逾時前進 30%；填錯前進 40%。',kind:'幽靈 · 被動'},
      {id:'heal',art:art('skills/heal'),name:'星火治癒',description:'恢復 1 格生命，Lv.5 起恢復 2 格；解開 8 格後可再次使用。滿血不消耗。',kind:'燈火狐 · 主動'},
      {id:'rewind',art:art('skills/rewind'),name:'月羽逆風',description:'怪物退回起點並重置倒數；解開 8 格後可再次使用。',kind:'月羽鴞 · 主動'}
    ],
    maps: [
      {id:'forest',name:'月影森林',art:art('forest'),description:'石獸與幽靈交替出現。',monsters:['bramble','wraith']},
      {id:'ruins',name:'星落遺跡',art:art('ruins'),description:'幽靈與石獸交替出現。',monsters:['wraith','bramble']},
      {id:'frost',name:'永冬之境',art:art('frost'),description:'晶甲衛守著通往巨龍的冰霜王座。',monsters:['sentinel','wraith']},
      {id:'dunes',name:'流沙星海',art:art('dunes'),description:'穿越砂海與星盤神殿，迎戰曜炎鳳凰。',monsters:['scarab','wraith']}
    ]
  };
  if(typeof module !== 'undefined') module.exports = root.SudokuResources;
})(globalThis);
