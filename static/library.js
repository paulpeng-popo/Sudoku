(function(root) {
  root.mountSudokuLibrary = ({resources,loadout,open,locked,save,rank = () => 1,cleared = () => [],adventure,owns = () => true,requirement = () => 'Locked'}) => {
    const $ = id => document.getElementById(id);
    const groups = {heroes:'Heroes',monsters:'Monsters',pets:'Companions',skills:'Skills',maps:'Maps',equipment:'Equipment'};
    const slots = {heroes:'hero',pets:'pet',equipment:'gear'};
    let category = 'heroes';
    function close() {
      $('library').hidden = true; $('play-space').hidden = false;
      $('nav-library').setAttribute('aria-pressed','false'); save();
    }
    function render() {
      $('view-label').textContent = 'Guide';
      $('nav-challenge').setAttribute('aria-pressed','false');
      $('nav-game').setAttribute('aria-pressed','false');
      $('library-tabs').replaceChildren();
      for(const [key,label] of Object.entries(groups)) {
        const b = document.createElement('button'); b.textContent = `${label} ${resources[key].length}`;
        b.setAttribute('aria-pressed',String(category === key));
        b.onclick = () => { category = key; render(); $('resource-cards').scrollTop = 0; };
        $('library-tabs').append(b);
      }
      $('resource-cards').replaceChildren();
      const entries = resources[category];
      for(const item of entries) {
        const card = document.createElement('article'); card.className = `resource-card resource-${category}`;
        if(item.art) { const img = document.createElement('img'); img.src = item.art; img.alt = item.name; img.loading = 'lazy'; img.decoding = 'async'; card.append(img); }
        const body = document.createElement('div'); body.className = 'resource-body';
        const title = document.createElement('h3'); title.textContent = item.name;
        const description = document.createElement('p'); description.textContent = item.description;
        const detail = document.createElement('p'); detail.className = 'resource-detail';
        const skill = resources.skills.find(s => s.id === item.skill);
        detail.textContent = skill ? `${skill.name} · ${skill.description}` : item.kind || (item.monsters ? item.monsters.map(id => resources.monsters.find(m => m.id === id).name).join(' / ') : '');
        if(category === 'monsters') detail.textContent = `HP ${item.vitality} · ATK ${item.attack} · DEF ${item.defense} · EXP ${item.xp} · ${detail.textContent}`;
        body.append(title,description,detail);
        if(category === 'heroes') {
          const growth = document.createElement('p'); growth.className = 'resource-growth';
          growth.textContent = `Lv. ${rank()} · ATK ${item.attack+(rank()-1)*2} · DEF ${item.defense+Math.floor((rank()-1)/2)} · Knockback ${item.knockback+(rank()-1)*2}% (before gear)`;
          body.append(growth);
        }
        if(slots[category]) {
          const slot = slots[category], button = document.createElement('button');
          const selected = loadout[slot] === item.id, available = owns(category,item.id);
          button.textContent = !available ? requirement(category,item.id) : selected ? '✓ Selected' : locked() ? 'Locked in battle' : 'Select';
          button.disabled = !available || selected || locked(); button.setAttribute('aria-pressed',String(selected));
          button.onclick = () => { if(locked() || !owns(category,item.id)) return; loadout[slot] = item.id; save(); render(); $('library-message').textContent = `Selected ${item.name}`; };
          body.append(button);
        }
        if(category === 'maps') { const status = document.createElement('p'); status.textContent = owns(category,item.id) ? '✓ Unlocked · Set by the stage' : requirement(category,item.id); body.append(status); }
        card.append(body); $('resource-cards').append(card);
      }
      $('loadout-summary').textContent = [['heroes','hero'],['pets','pet'],['maps','map'],['equipment','gear']].map(([group,key]) => resources[group].find(r => r.id === loadout[key]).name).join(' · ');
      $('library-message').textContent = locked() ? 'Battle paused. Finish the battle to change your loadout.' : '';
    }
    $('nav-library').onclick = () => {
      if(!open()) return;
      $('play-space').hidden = true; $('library').hidden = false;
      $('nav-library').setAttribute('aria-pressed','true'); render();
    };
    $('library-close').onclick = () => { close(); $('nav-game').onclick(); };
    for(const id of ['nav-challenge','nav-game']) { const previous = $(id).onclick; $(id).onclick = () => { close(); previous(); }; }
    document.addEventListener('keydown',e => { if(e.key === 'Escape' && !$('library').hidden) close(); });
  };
})(globalThis);
